import path from 'node:path';
import { fileURLToPath } from 'node:url';
import dotenv from 'dotenv';

const __dirname = path.dirname(fileURLToPath(import.meta.url));
dotenv.config({ path: path.resolve(__dirname, '../.env') });

function toBool(value, fallback = false) {
  if (value === undefined || value === null || value === '') return fallback;
  return ['1', 'true', 'yes', 'on'].includes(String(value).trim().toLowerCase());
}

function toInt(value, fallback) {
  const parsed = Number.parseInt(value, 10);
  return Number.isFinite(parsed) ? parsed : fallback;
}

const demoFromArgv = process.argv.includes('--demo');
const projectRoot = path.resolve(__dirname, '../..');

function resolveProjectPath(value, fallback) {
  const raw = String(value ?? '').trim();
  return path.resolve(projectRoot, raw || fallback);
}

export const config = {
  port: toInt(process.env.PORT, 3001),
  nodeEnv: process.env.NODE_ENV || 'development',
  demoMode: demoFromArgv || toBool(process.env.DEMO_MODE),
  db: {
    server: process.env.DB_SERVER || 'localhost',
    port: toInt(process.env.DB_PORT, 1433),
    database: process.env.DB_NAME || 'NHONAI',
    instanceName: process.env.DB_INSTANCE || undefined,
    user: process.env.DB_USER || '',
    password: process.env.DB_PASSWORD || '',
    trusted: toBool(process.env.DB_TRUSTED),
    encrypt: toBool(process.env.DB_ENCRYPT),
    trustServerCertificate: toBool(process.env.DB_TRUST_SERVER_CERT, true),
    poolMax: Math.max(1, toInt(process.env.DB_POOL_MAX, 10)),
  },
  reconcile: {
    file: resolveProjectPath(process.env.RECONCILE_FILE, 'Xã Nhơn Ái DS.xlsx'),
    sheet: process.env.RECONCILE_SHEET || '',
    regionId: process.env.RECONCILE_REGION_ID || '9203831315',
    dataDir: resolveProjectPath(process.env.RECONCILE_DATA_DIR, 'server/data'),
    dbCacheTtlMs: Math.max(10_000, toInt(process.env.RECONCILE_DB_CACHE_MS, 300_000)),
  },
};
