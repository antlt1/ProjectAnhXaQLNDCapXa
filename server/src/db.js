import sql from 'mssql';
import { config } from './config.js';

let poolPromise = null;

async function createPool() {
  const { db } = config;

  const options = {
    encrypt: db.encrypt,
    trustServerCertificate: db.trustServerCertificate,
    enableArithAbort: true,
    ...(db.instanceName ? { instanceName: db.instanceName } : {}),
  };

  let pool;

  if (db.trusted) {
    try {
      await import('msnodesqlv8');
    } catch {
      throw new Error(
        'DB_TRUSTED=true cần gói msnodesqlv8. Chạy: npm install --workspace server msnodesqlv8',
      );
    }

    pool = new sql.ConnectionPool({
      driver: 'msnodesqlv8',
      server: db.server,
      database: db.database,
      options: { ...options, trustedConnection: true },
    });
  } else {
    pool = new sql.ConnectionPool({
      server: db.server,
      port: db.port,
      database: db.database,
      user: db.user,
      password: db.password,
      options,
      requestTimeout: 120000,
      connectionTimeout: 20000,
      pool: {
        max: db.poolMax,
        min: 0,
        idleTimeoutMillis: 30000,
      },
    });
  }

  pool.on('error', (error) => {
    console.error('[db] Pool error:', error.message);
  });

  await pool.connect();
  return pool;
}

export async function getPool() {
  if (!poolPromise) {
    poolPromise = createPool().catch((error) => {
      poolPromise = null;
      throw error;
    });
  }
  return poolPromise;
}

/**
 * Chạy câu lệnh với tham số an toàn.
 * params: { name: value } hoặc { name: [sql.Type, value] }
 */
export async function runQuery(text, params = {}) {
  const pool = await getPool();
  const request = pool.request();

  for (const [name, spec] of Object.entries(params)) {
    if (Array.isArray(spec)) {
      request.input(name, spec[0], spec[1]);
    } else {
      request.input(name, spec);
    }
  }

  const result = await request.query(text);
  return result.recordset ?? [];
}

export async function closePool() {
  if (!poolPromise) return;
  const pool = await poolPromise.catch(() => null);
  poolPromise = null;
  if (pool) await pool.close();
}

export { sql };
