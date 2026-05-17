import { writeFile as fsWriteFile, mkdir } from 'fs/promises';
import { resolve, relative, dirname } from 'path';
import simpleGit from 'simple-git';
import { audit } from '../audit/audit';

const REPO = process.env.PULSO_REPO_PATH!;
const git = () => simpleGit(REPO);

function safePath(rel: string): string {
  const abs = resolve(REPO, rel);
  const r = relative(REPO, abs);
  if (r.startsWith('..') || r.startsWith('/')) throw new Error(`path fora do repo: ${rel}`);
  return abs;
}

async function ensureNotMain() {
  const s = await git().status();
  if (s.current === 'main' || s.current === 'master') {
    throw new Error(`branch atual é "${s.current}". Ferramentas 🟡 não operam em main/master. Use git_checkout_branch primeiro.`);
  }
  return s.current!;
}

export const writeFileSchema = {
  type: 'object',
  properties: { path: { type: 'string' }, content: { type: 'string' } },
  required: ['path', 'content'],
};

export async function writeFile(args: { path: string; content: string }) {
  await ensureNotMain();
  const abs = safePath(args.path);
  await mkdir(dirname(abs), { recursive: true });
  await fsWriteFile(abs, args.content, 'utf8');
  await audit({
    ts: '', tool: 'write_file', level: 'yellow', ok: true,
    args_summary: { path: args.path, bytes: args.content.length }
  });
  return { path: args.path, bytes: args.content.length };
}

export const gitCommitSchema = {
  type: 'object',
  properties: {
    message: { type: 'string' },
    paths: { type: 'array', items: { type: 'string' }, description: 'arquivos a adicionar (default: tudo)' }
  },
  required: ['message'],
};

export async function gitCommit(args: { message: string; paths?: string[] }) {
  await ensureNotMain();
  const g = git();
  if (args.paths && args.paths.length) {
    await g.add(args.paths);
  } else {
    await g.add('.');
  }
  const r = await g.commit(args.message);
  await audit({
    ts: '', tool: 'git_commit', level: 'yellow', ok: true,
    args_summary: { message: args.message.slice(0, 200) }, result_summary: r
  });
  return r;
}

export const gitCheckoutBranchSchema = {
  type: 'object',
  properties: { branch: { type: 'string' }, create: { type: 'boolean' } },
  required: ['branch'],
};

export async function gitCheckoutBranch(args: { branch: string; create?: boolean }) {
  if (args.branch === 'main' || args.branch === 'master') {
    throw new Error('Não vou trocar pra main/master. Faça manualmente se intencional.');
  }
  const g = git();
  if (args.create) {
    await g.checkoutLocalBranch(args.branch);
  } else {
    await g.checkout(args.branch);
  }
  await audit({ ts: '', tool: 'git_checkout_branch', level: 'yellow', ok: true, args_summary: args });
  return { branch: args.branch, created: !!args.create };
}

export const gitPushBranchSchema = {
  type: 'object',
  properties: { remote: { type: 'string', description: 'default: origin' } }
};

export async function gitPushBranch(args: { remote?: string }) {
  const branch = await ensureNotMain();
  const remote = args.remote || 'origin';
  await git().push(remote, branch, ['--set-upstream']);
  await audit({
    ts: '', tool: 'git_push_branch', level: 'yellow', ok: true,
    args_summary: { remote, branch }
  });
  return { remote, branch, pushed: true };
}
