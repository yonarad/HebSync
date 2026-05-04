import { neon } from '@neondatabase/serverless';

let sql;

export function getSql() {
  if (!process.env.DATABASE_URL) {
    throw new Error('Missing DATABASE_URL');
  }

  if (!sql) {
    sql = neon(process.env.DATABASE_URL);
  }

  return sql;
}
