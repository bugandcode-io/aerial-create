import { readFile } from 'node:fs/promises';
import { databasePool } from './config';
const pool = databasePool();
try {
  const sql = await readFile(new URL('./migrations/001_initial.sql', import.meta.url), 'utf8');
  for (const statement of sql.split(';').filter(part => part.trim())) await pool.query(statement);
  console.log('Database initialized (001_initial is idempotent).');
} catch (error) {
  const code = error && typeof error === 'object' && 'code' in error ? String(error.code) : 'MIGRATION_ERROR';
  console.error(`Migration failed (${code}). Check database privileges, including REFERENCES for foreign keys. Completed CREATE TABLE steps are safe to rerun.`);
  process.exitCode = 1;
} finally { await pool.end(); }
