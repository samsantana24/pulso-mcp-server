import Database from 'better-sqlite3';
import { sanitizeSql } from '../permissions/permissions';
import { audit } from '../audit/audit';

const APP_DB_PATH = process.env.PULSO_DB_PATH!;

export const dbQuerySchema = {
  type: 'object',
  properties: {
    sql: { type: 'string', description: 'SELECT statement' },
    params: { type: 'array', items: {}, description: 'Bind parameters (opcional)' },
  },
  required: ['sql'],
};

export async function dbQuery(args: { sql: string; params?: any[] }) {
  const { sql, params = [] } = args;
  const sane = sanitizeSql(sql);
  if (!sane.ok) throw new Error(sane.reason!);
  if (!/^\s*(SELECT|PRAGMA|EXPLAIN|WITH)\b/i.test(sql)) {
    throw new Error('db_query aceita apenas SELECT/PRAGMA/EXPLAIN/WITH. Para escrita use db_exec.');
  }
  const db = new Database(APP_DB_PATH, { readonly: true });
  try {
    const rows = db.prepare(sql).all(...params);
    await audit({
      ts: '', tool: 'db_query', level: 'green', ok: true,
      args_summary: { sql: sql.slice(0, 200), params_count: params.length },
      result_summary: { rows: rows.length }
    });
    return { rows, count: rows.length };
  } finally { db.close(); }
}
