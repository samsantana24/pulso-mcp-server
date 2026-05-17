import { exec } from 'child_process';
import { promisify } from 'util';
import { audit } from '../audit/audit';

const execp = promisify(exec);

const ALLOWED_PM2_APPS = ['usepulso', 'usepulso-proposta'];

export const pm2LogsSchema = {
  type: 'object',
  properties: {
    app: { type: 'string', description: 'nome do app PM2 (usepulso | usepulso-proposta)' },
    lines: { type: 'number', description: 'qtd de linhas (default 100, máx 500)' },
  },
  required: ['app'],
};

export async function pm2Logs(args: { app: string; lines?: number }) {
  if (!ALLOWED_PM2_APPS.includes(args.app)) {
    throw new Error(`app não permitido: ${args.app}. Permitidos: ${ALLOWED_PM2_APPS.join(', ')}`);
  }
  const n = Math.min(args.lines ?? 100, 500);
  const { stdout, stderr } = await execp(`pm2 logs ${args.app} --lines ${n} --nostream`, { maxBuffer: 5_000_000 });
  await audit({
    ts: '', tool: 'pm2_logs', level: 'green', ok: true,
    args_summary: { app: args.app, lines: n }, result_summary: { bytes: stdout.length }
  });
  return { app: args.app, lines: n, stdout: stdout.slice(-50000), stderr: stderr.slice(-10000) };
}

export const pm2StatusSchema = { type: 'object', properties: {} };

export async function pm2Status(_args: {}) {
  const { stdout } = await execp('pm2 jlist', { maxBuffer: 2_000_000 });
  const arr = JSON.parse(stdout);
  const summary = arr.map((p: any) => ({
    name: p.name,
    status: p.pm2_env?.status,
    pid: p.pid,
    uptime: p.pm2_env?.pm_uptime,
    restarts: p.pm2_env?.restart_time,
    cpu: p.monit?.cpu,
    mem: p.monit?.memory,
  }));
  await audit({ ts: '', tool: 'pm2_status', level: 'green', ok: true });
  return summary;
}

export const pm2RestartSchema = {
  type: 'object',
  properties: {
    app: { type: 'string' },
    confirmation_phrase: { type: 'string', description: 'AUTORIZO RESTART' },
  },
  required: ['app', 'confirmation_phrase'],
};

export async function pm2Restart(args: { app: string; confirmation_phrase: string }) {
  if (!ALLOWED_PM2_APPS.includes(args.app)) {
    throw new Error(`app não permitido: ${args.app}. Permitidos: ${ALLOWED_PM2_APPS.join(', ')}`);
  }
  const { stdout } = await execp(`pm2 restart ${args.app}`);
  await audit({
    ts: '', tool: 'pm2_restart', level: 'red', ok: true,
    args_summary: { app: args.app }, result_summary: { stdout: stdout.slice(0, 500) }
  });
  return { app: args.app, restarted: true, output: stdout };
}
