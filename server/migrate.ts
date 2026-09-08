import { readFile } from 'node:fs/promises';
import { databasePool } from './config';
const pool = databasePool();
try {
  const sql = await readFile(new URL('./migrations/001_initial.sql', import.meta.url), 'utf8');
  for (const statement of sql.split(';').filter(part => part.trim())) await pool.query(statement);
  console.log('Database initialized (001_initial is idempotent).');
} finally { await pool.end(); }
