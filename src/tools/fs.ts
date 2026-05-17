import { readFile as fsReadFile, readdir, stat } from 'fs/promises';
import { resolve, relative, join } from 'path';
import { audit } from '../audit/audit';

const REPO_ROOT = process.env.PULSO_REPO_PATH!;

function safePath(rel: string): string {
  const abs = resolve(REPO_ROOT, rel);
  const r = relative(REPO_ROOT, abs);
  if (r.startsWith('..') || r.startsWith('/')) {
    throw new Error(`path fora do repo: ${rel}`);
  }
  return abs;
}

export const readFileSchema = {
  type: 'object',
  properties: { path: { type: 'string', description: 'Caminho relativo ao repo' } },
  required: ['path'],
};

export async function readFile(args: { path: string }) {
  const abs = safePath(args.path);
  const content = await fsReadFile(abs, 'utf8');
  await audit({
    ts: '', tool: 'read_file', level: 'green', ok: true,
    args_summary: { path: args.path }, result_summary: { bytes: content.length }
  });
  return { path: args.path, content };
}

export const listDirSchema = {
  type: 'object',
  properties: { path: { type: 'string', description: 'Caminho relativo (default: raiz)' } },
};

export async function listDir(args: { path?: string }) {
  const rel = args.path || '.';
  const abs = safePath(rel);
  const entries = await readdir(abs, { withFileTypes: true });
  const items = await Promise.all(entries.map(async e => {
    const full = join(abs, e.name);
    const st = await stat(full).catch(() => null);
    return {
      name: e.name,
      type: e.isDirectory() ? 'dir' : 'file',
      size: st?.size ?? null,
    };
  }));
  await audit({
    ts: '', tool: 'list_dir', level: 'green', ok: true,
    args_summary: { path: rel }, result_summary: { count: items.length }
  });
  return { path: rel, items };
}
