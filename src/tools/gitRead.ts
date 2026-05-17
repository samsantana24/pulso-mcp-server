import simpleGit from 'simple-git';
import { audit } from '../audit/audit';

const REPO = process.env.PULSO_REPO_PATH!;
const git = () => simpleGit(REPO);

export const gitStatusSchema = { type: 'object', properties: {} };

export async function gitStatus(_args: {}) {
  const s = await git().status();
  await audit({ ts: '', tool: 'git_status', level: 'green', ok: true });
  return s;
}

export const gitLogSchema = {
  type: 'object',
  properties: { n: { type: 'number', description: 'quantidade de commits (default 20)' } }
};

export async function gitLog(args: { n?: number }) {
  const n = args.n ?? 20;
  const log = await git().log({ maxCount: n });
  await audit({ ts: '', tool: 'git_log', level: 'green', ok: true, args_summary: { n } });
  return { count: log.total, entries: log.all };
}

export const gitDiffSchema = {
  type: 'object',
  properties: {
    path: { type: 'string', description: 'restringir a um caminho específico' },
    staged: { type: 'boolean', description: 'diff de staged (default false)' }
  }
};

export async function gitDiff(args: { path?: string; staged?: boolean }) {
  const opts: string[] = [];
  if (args.staged) opts.push('--cached');
  if (args.path) opts.push('--', args.path);
  const diff = await git().diff(opts);
  await audit({ ts: '', tool: 'git_diff', level: 'green', ok: true, args_summary: args });
  return { diff: diff.slice(0, 100_000) };
}
