import fs from 'node:fs/promises';
import path from 'node:path';

const FILE_NAME = 'reconcile-confirmations.json';

function normalizeRecord(input) {
  const stt = Number(input?.stt);
  if (!Number.isInteger(stt) || stt <= 0) {
    const error = new Error('STT không hợp lệ');
    error.status = 400;
    throw error;
  }

  const cccd = String(input?.cccd ?? '').trim().slice(0, 32);
  const note = String(input?.note ?? '').trim().slice(0, 500);
  const personalIdRaw = Number(input?.personalId);
  const personalId = Number.isInteger(personalIdRaw) && personalIdRaw > 0 ? personalIdRaw : null;

  return {
    stt,
    cccd,
    confirmed: Boolean(input?.confirmed),
    acceptDobDiff: Boolean(input?.acceptDobDiff),
    acceptAddressDiff: Boolean(input?.acceptAddressDiff),
    personalId,
    note,
    updatedAt: new Date().toISOString(),
  };
}

export class ConfirmationStore {
  constructor(dataDir) {
    this.dataDir = dataDir;
    this.filePath = path.join(dataDir, FILE_NAME);
    this.cache = null;
    this.cacheMtimeMs = 0;
    this.writeChain = Promise.resolve();
  }

  async readFile() {
    try {
      const stat = await fs.stat(this.filePath);
      if (this.cache && this.cacheMtimeMs === stat.mtimeMs) return this.cache;

      const raw = await fs.readFile(this.filePath, 'utf8');
      const parsed = JSON.parse(raw);
      const records = parsed && typeof parsed.records === 'object' && parsed.records
        ? parsed.records
        : {};

      this.cache = records;
      this.cacheMtimeMs = stat.mtimeMs;
      return records;
    } catch (error) {
      if (error.code === 'ENOENT') {
        this.cache = {};
        this.cacheMtimeMs = 0;
        return this.cache;
      }
      if (error instanceof SyntaxError) {
        // File hỏng: không làm sập API, coi như chưa có xác nhận.
        console.error('[reconcile] File xác nhận không hợp lệ:', error.message);
        return {};
      }
      throw error;
    }
  }

  async get(stt) {
    const records = await this.readFile();
    return records[String(stt)] ?? null;
  }

  async save(input) {
    const record = normalizeRecord(input);

    const operation = async () => {
      const records = await this.readFile();
      const key = String(record.stt);
      const empty =
        !record.confirmed &&
        !record.acceptDobDiff &&
        !record.acceptAddressDiff &&
        !record.note &&
        !record.personalId;

      if (empty) delete records[key];
      else records[key] = record;

      await fs.mkdir(this.dataDir, { recursive: true });
      const tmpPath = `${this.filePath}.${process.pid}.tmp`;
      const payload = {
        version: 1,
        updatedAt: new Date().toISOString(),
        records,
      };
      await fs.writeFile(tmpPath, JSON.stringify(payload, null, 2), 'utf8');
      await fs.rename(tmpPath, this.filePath);

      const stat = await fs.stat(this.filePath);
      this.cache = records;
      this.cacheMtimeMs = stat.mtimeMs;

      return empty ? null : record;
    };

    this.writeChain = this.writeChain.then(operation, operation);
    return this.writeChain;
  }
}
