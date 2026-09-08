import { createApp } from '../app';
import { configFromEnv, databasePool } from '../config';
import { mysqlRepository } from '../mysqlRepository';
// Disposable API process for real-MySQL restart verification, not a production entry point.
if (!process.send) throw new Error('Run through the MySQL HTTP integration test.');
try {
  const config = configFromEnv();
  const pool = databasePool();
  await pool.query('SELECT 1');
  const server = createApp(mysqlRepository(pool),config).listen(0,'127.0.0.1',()=>{
    const address = server.address();
    if (address && typeof address !== 'string') process.send?.({port:address.port});
  });
  process.on('message', message => {
    if(message === 'stop') server.close(()=>{void pool.end().then(()=>process.exit(0));});
  });
} catch { process.send?.({error:'Database/API initialization failed.'}); process.exitCode=1; }
