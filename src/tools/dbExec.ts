import Database from 'better-sqlite3';
import { sanitizeSql } from '../permissions/permissions';
import { audit } from '../audit/audit';

const APP_DB_PATH = process.env.PULSO_DB_PATH!;

export const dbExecSchema = {
  type: 'object',
  properties: {
    sql: { type: 'string', description: 'INSERT/UPDATE statement (UPDATE exige WHERE)' },
    params: { type: 'array', items: {} },
    confirmation_phrase: { type: 'string', description: 'AUTORIZO DB EXEC' },
  },
  required: ['sql', 'confirmation_phrase'],
};

export async function dbExec(args: { sql: string; params?: any[]; confirmation_phrase: string }) {
  const { sql, params = [] } = args;
  const sane = sanitizeSql(sql);
  if (!sane.ok) throw new Error(sane.reason!);

  const trimmed = sql.trim().toUpperCase();
  const isInsert = trimmed.startsWith('INSERT');
  const isUpdate = trimmed.startsWith('UPDATE');
  if (!isInsert && !isUpdate) {
    throw new Error('db_exec aceita apenas INSERT ou UPDATE. SELECT use db_query. DROP/DELETE são proibidos.');
  }
  if (isUpdate && !/\bWHERE\b/i.test(sql)) {
    throw new Error('UPDATE sem WHERE bloqueado por segurança.');
  }

  const db = new Database(APP_DB_PATH);
  try {
    const info = db.prepare(sql).run(...params);
    await audit({
      ts: '', tool: 'db_exec', level: 'red', ok: true,
      args_summary: { sql: sql.slice(0, 300), params_count: params.length },
      result_summary: { changes: info.changes, lastInsertRowid: Number(info.lastInsertRowid) }
    });
    return { changes: info.changes, lastInsertRowid: Number(info.lastInsertRowid) };
  } finally { db.close(); }
}
