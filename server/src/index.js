import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import express from 'express';
import { config } from './config.js';
import { asBool, asEnum, asInt, asString, parsePaging } from './http.js';
import { createRepository } from './repository/index.js';
import { ReconcileService } from './reconcile/service.js';

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const repo = createRepository();
const reconcile = new ReconcileService(repo);
const app = express();

const CCCD_FILTERS = ['all', 'has', 'none', 'partial', 'unmapped'];
const RECONCILE_ISSUES = [
  'all',
  'ok',
  'name',
  'sex',
  'dob',
  'address',
  'cccd-diff',
  'not-inserted',
  'not-found',
  'confirmed',
  'unconfirmed',
  'duplicates',
];

app.disable('x-powered-by');
app.use(express.json({ limit: '100kb' }));

app.use('/api', (req, res, next) => {
  res.setHeader('Access-Control-Allow-Origin', process.env.CORS_ORIGIN || '*');
  res.setHeader('Access-Control-Allow-Methods', 'GET,POST,OPTIONS');
  res.setHeader('Access-Control-Allow-Headers', 'Content-Type');
  if (req.method === 'OPTIONS') return res.sendStatus(204);
  next();
});

app.use((req, res, next) => {
  const startedAt = Date.now();
  res.on('finish', () => {
    const ms = Date.now() - startedAt;
    console.log(`[api] ${req.method} ${req.originalUrl} -> ${res.statusCode} (${ms}ms)`);
  });
  next();
});

const asyncRoute = (handler) => (req, res, next) =>
  Promise.resolve(handler(req, res, next)).catch(next);

app.get(
  '/api/health',
  asyncRoute(async (req, res) => {
    try {
      const info = await repo.health();
      res.json({
        ok: true,
        demoMode: config.demoMode,
        ...info,
        serverTime: new Date().toISOString(),
      });
    } catch (error) {
      res.status(503).json({
        ok: false,
        demoMode: config.demoMode,
        error: { message: error.message },
      });
    }
  }),
);

app.get(
  '/api/stats',
  asyncRoute(async (req, res) => {
    const includeInactive = asBool(req.query.includeInactive);
    const stats = await repo.stats(includeInactive);
    res.json(stats);
  }),
);

app.get(
  '/api/households',
  asyncRoute(async (req, res) => {
    const includeInactive = asBool(req.query.includeInactive);
    const { page, pageSize } = parsePaging(req.query);
    const q = asString(req.query.q, 100);
    const cccd = asEnum(req.query.cccd, CCCD_FILTERS, 'all');

    const result = await repo.listHouseholds({
      q,
      cccd,
      includeInactive,
      page,
      pageSize,
    });

    res.json({ ...result, page, pageSize, q, cccd, includeInactive });
  }),
);

app.get(
  '/api/households/:id',
  asyncRoute(async (req, res) => {
    const houseHoldId = asInt(req.params.id);
    if (!houseHoldId || houseHoldId <= 0) {
      return res.status(400).json({ error: { message: 'HouseHold_ID không hợp lệ' } });
    }

    const includeInactive = asBool(req.query.includeInactive);
    const household = await repo.getHousehold(houseHoldId, includeInactive);
    if (!household) {
      return res.status(404).json({ error: { message: 'Không tìm thấy hộ gia đình' } });
    }

    res.json(household);
  }),
);

app.get(
  '/api/personal/:id/logs',
  asyncRoute(async (req, res) => {
    const personalId = asInt(req.params.id);
    if (!personalId || personalId <= 0) {
      return res.status(400).json({ error: { message: 'Personal_ID không hợp lệ' } });
    }

    const { page, pageSize } = parsePaging(req.query);
    const result = await repo.getPersonalLogs(personalId, { page, pageSize });
    if (!result) {
      return res.status(404).json({ error: { message: 'Không tìm thấy nhân khẩu' } });
    }

    res.json({ ...result, page, pageSize });
  }),
);

app.get(
  '/api/logs',
  asyncRoute(async (req, res) => {
    const { page, pageSize } = parsePaging(req.query);
    const q = asString(req.query.q, 100);

    const result = await repo.listLogs({ q, page, pageSize });
    res.json({ ...result, page, pageSize, q });
  }),
);

app.get(
  '/api/reconcile',
  asyncRoute(async (req, res) => {
    if (config.demoMode) {
      return res.status(409).json({
        error: {
          message:
            'Chế độ DEMO không có dữ liệu SQL Server để đối chiếu file Excel. Hãy chạy server với DB thật.',
        },
      });
    }

    const { page, pageSize } = parsePaging(req.query);
    const q = asString(req.query.q, 100);
    const issue = asEnum(req.query.issue, RECONCILE_ISSUES, 'all');
    const refresh = asBool(req.query.refresh);

    const result = await reconcile.list({ q, issue, page, pageSize, refresh });
    res.json(result);
  }),
);

app.post(
  '/api/reconcile/confirm',
  asyncRoute(async (req, res) => {
    if (config.demoMode) {
      return res.status(409).json({
        error: { message: 'Chế độ DEMO không hỗ trợ lưu xác nhận rà soát.' },
      });
    }

    const body = req.body ?? {};
    const stt = asInt(body.stt);

    if (!stt || stt <= 0) {
      return res.status(400).json({ error: { message: 'STT không hợp lệ' } });
    }

    const record = await reconcile.confirm({
      stt,
      cccd: asString(body.cccd, 32),
      confirmed: asBool(body.confirmed),
      acceptDobDiff: asBool(body.acceptDobDiff),
      acceptAddressDiff: asBool(body.acceptAddressDiff),
      sources: body.sources,
      personalId: asInt(body.personalId),
      note: asString(body.note, 500),
    });

    res.json({ ok: true, record });
  }),
);

app.use('/api', (req, res) => {
  res.status(404).json({ error: { message: 'Không tìm thấy API' } });
});

const distDir = path.resolve(__dirname, '../../web/dist');
if (fs.existsSync(path.join(distDir, 'index.html'))) {
  app.use(express.static(distDir));
  app.get('*', (req, res) => {
    res.sendFile(path.join(distDir, 'index.html'));
  });
}

app.use((error, req, res, next) => {
  if (res.headersSent) return next(error);
  console.error('[api] Lỗi:', error);
  res.status(error.status || 500).json({
    error: { message: error.message || 'Lỗi máy chủ' },
  });
});

const server = app.listen(config.port, () => {
  const target = config.demoMode
    ? 'chế độ DEMO (dữ liệu mẫu)'
    : `SQL Server ${config.db.server}/${config.db.database}`;
  console.log(`[api] http://localhost:${config.port} - ${target}`);
});

repo
  .init()
  .then(() => {
    if (!config.demoMode) console.log('[db] Kết nối SQL Server thành công');
  })
  .catch((error) => {
    console.error('[db] Không kết nối được SQL Server:', error.message);
    console.error('[db] Kiểm tra server/.env hoặc chạy DEMO_MODE=true để xem UI.');
  });

let shuttingDown = false;
async function shutdown(signal) {
  if (shuttingDown) return;
  shuttingDown = true;
  console.log(`[api] Nhận ${signal}, đang dừng...`);

  const forceExit = setTimeout(() => process.exit(1), 5000);
  forceExit.unref();

  server.close(async () => {
    try {
      await repo.close();
    } finally {
      clearTimeout(forceExit);
      process.exit(0);
    }
  });
}

process.on('SIGINT', () => shutdown('SIGINT'));
process.on('SIGTERM', () => shutdown('SIGTERM'));
