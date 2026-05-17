import Database from 'better-sqlite3';
import { sanitizeSql } from '../permissions/permissions';
import { audit } from '../audit/audit';

const APP_DB_PATH = process.env.PULSO_DB_PATH || '/path/to/pulso/data.db';

export async function dbQuery(args: { sql: string; params?: any[] }) {
  const { sql, params = [] } = args;

  // 1. Bloqueio de destrutivo
  const sane = sanitizeSql(sql);
  if (!sane.ok) {
    await audit({
      ts: '', tool: 'db_query', level: 'green', ok: false,
      args_summary: { sql: sql.slice(0, 200) }, error: sane.reason
    });
    throw new Error(sane.reason);
  }

  // 2. Só SELECT pra ferramenta verde
  if (!/^\s*SELECT\b/i.test(sql)) {
    throw new Error('db_query aceita apenas SELECT. Para INSERT/UPDATE use db_exec (red).');
  }

  // 3. Abrir banco READ-ONLY pra ter certeza absoluta
  const db = new Database(APP_DB_PATH, { readonly: true });
  try {
    const stmt = db.prepare(sql);
    const rows = stmt.all(...params);
    await audit({
      ts: '', tool: 'db_query', level: 'green', ok: true,
      args_summary: { sql: sql.slice(0, 200), params_count: params.length },
      result_summary: { rows: rows.length }
    });
    return { rows, count: rows.length };
  } finally {
    db.close();
  }
}
