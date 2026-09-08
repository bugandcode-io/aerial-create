import { readFileSync } from 'node:fs';
import type { RowDataPacket } from 'mysql2/promise';
import mysql from 'mysql2/promise';
import { configFromEnv } from './config';
try {
  const config = configFromEnv();
  if (!process.env.MYSQL_SSL_CA_FILE) throw new Error('CA_NOT_CONFIGURED');
  readFileSync(process.env.MYSQL_SSL_CA_FILE);
  console.log('CA file readable.');
  if (config.database.port !== 25060 || !config.database.ssl?.rejectUnauthorized || !config.database.ssl.verifyIdentity)
    throw new Error('Verified TLS on port 25060 is required for this check.');
  const pool = mysql.createPool({...config.database,database:undefined});
  try {
    const [rows] = await pool.query<RowDataPacket[]>("SHOW SESSION STATUS LIKE 'Ssl_cipher'");
    if (!rows[0]?.Value) throw new Error('TLS_NOT_ACTIVE');
    console.log('MySQL connected on port 25060 with verified TLS.');
    const connection = await pool.getConnection();
    try { await connection.changeUser({database:config.database.database}); console.log('Configured database access verified.'); }
    finally { connection.release(); }
  } finally { await pool.end(); }
} catch (error) {
  const code = error && typeof error === 'object' && 'code' in error ? String(error.code) : 'CONFIG_OR_TLS_ERROR';
  console.error(`Connection check failed (${code}). No credentials displayed.`);
  process.exitCode = 1;
}
