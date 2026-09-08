import mysql from 'mysql2/promise';
export function configFromEnv() {
  const required = (key: string) => { const value = process.env[key]; if (!value) throw new Error(`Missing ${key}`); return value; };
  const secret = required('SESSION_SECRET');
  if (secret.length < 32) throw new Error('SESSION_SECRET must contain at least 32 characters.');
  const origin = new URL(required('FRONTEND_ORIGIN')).origin;
  const production = process.env.NODE_ENV === 'production';
  if (production && !origin.startsWith('https://')) throw new Error('Production requires an HTTPS FRONTEND_ORIGIN.');
  return { secret, origin, production, port: Number(process.env.API_PORT ?? 3001),
    database: {host:required('MYSQL_HOST'), port:Number(process.env.MYSQL_PORT ?? 3306), database:required('MYSQL_DATABASE'),
      user:required('MYSQL_USER'), password:required('MYSQL_PASSWORD'), timezone:'Z', charset:'utf8mb4', connectionLimit:10} };
}
export function databasePool() { return mysql.createPool(configFromEnv().database); }
