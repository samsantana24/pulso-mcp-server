import { appendFile, mkdir } from 'fs/promises';
import { existsSync } from 'fs';
import { dirname } from 'path';

const AUDIT_PATH = process.env.MCP_AUDIT_LOG || '/var/log/pulso-mcp/audit.log';

export interface AuditEntry {
  ts: string;
  tool: string;
  level: 'green' | 'yellow' | 'red';
  ok: boolean;
  args_summary?: any;
  result_summary?: any;
  error?: string;
  caller?: string;
}

export async function audit(entry: AuditEntry) {
  if (!existsSync(dirname(AUDIT_PATH))) {
    await mkdir(dirname(AUDIT_PATH), { recursive: true });
  }
  const line = JSON.stringify({ ...entry, ts: new Date().toISOString() }) + '\n';
  await appendFile(AUDIT_PATH, line, 'utf8');
}
