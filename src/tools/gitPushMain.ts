import simpleGit from 'simple-git';
import { audit } from '../audit/audit';

const REPO = process.env.PULSO_REPO_PATH!;

export const gitPushMainSchema = {
  type: 'object',
  properties: {
    remote: { type: 'string', description: 'default: origin' },
    confirmation_phrase: { type: 'string', description: 'AUTORIZO PUSH MAIN' },
  },
  required: ['confirmation_phrase'],
};

export async function gitPushMain(args: { remote?: string; confirmation_phrase: string }) {
  const remote = args.remote || 'origin';
  const g = simpleGit(REPO);
  const s = await g.status();
  if (s.current !== 'main' && s.current !== 'master') {
    throw new Error(`branch atual é "${s.current}", não main. Use git_push_branch.`);
  }
  await g.push(remote, s.current);
  await audit({
    ts: '', tool: 'git_push_main', level: 'red', ok: true,
    args_summary: { remote, branch: s.current }
  });
  return { remote, branch: s.current, pushed: true };
}
