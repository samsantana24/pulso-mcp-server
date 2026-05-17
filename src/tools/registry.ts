import { audit } from '../audit/audit';
import { RED_CONFIRMATIONS } from '../permissions/permissions';

import { dbQuery, dbQuerySchema } from './dbQuery';
import { dbExec, dbExecSchema } from './dbExec';
import { readFile, readFileSchema, listDir, listDirSchema } from './fs';
import { pm2Logs, pm2LogsSchema, pm2Status, pm2StatusSchema, pm2Restart, pm2RestartSchema } from './pm2';
import { gitStatus, gitStatusSchema, gitLog, gitLogSchema, gitDiff, gitDiffSchema } from './gitRead';
import {
  writeFile, writeFileSchema,
  gitCommit, gitCommitSchema,
  gitCheckoutBranch, gitCheckoutBranchSchema,
  gitPushBranch, gitPushBranchSchema,
} from './gitWrite';
import { gitPushMain, gitPushMainSchema } from './gitPushMain';

type ToolDef = {
  name: string;
  level: 'green' | 'yellow' | 'red';
  description: string;
  inputSchema: any;
  handler: (args: any) => Promise<any>;
};

const tools: ToolDef[] = [];

export function registerTools() {
  tools.length = 0;

  tools.push({ name: 'db_query', level: 'green', description: 'SELECT no data.db (read-only) do usepulso-proposta', inputSchema: dbQuerySchema, handler: dbQuery });
  tools.push({ name: 'read_file', level: 'green', description: 'Lê arquivo do repo usepulso-proposta', inputSchema: readFileSchema, handler: readFile });
  tools.push({ name: 'list_dir', level: 'green', description: 'Lista diretório do repo usepulso-proposta', inputSchema: listDirSchema, handler: listDir });
  tools.push({ name: 'pm2_logs', level: 'green', description: 'Tail dos logs PM2', inputSchema: pm2LogsSchema, handler: pm2Logs });
  tools.push({ name: 'pm2_status', level: 'green', description: 'pm2 list', inputSchema: pm2StatusSchema, handler: pm2Status });
  tools.push({ name: 'git_status', level: 'green', description: 'git status do repo Pulso', inputSchema: gitStatusSchema, handler: gitStatus });
  tools.push({ name: 'git_log', level: 'green', description: 'git log do repo Pulso', inputSchema: gitLogSchema, handler: gitLog });
  tools.push({ name: 'git_diff', level: 'green', description: 'git diff do repo Pulso', inputSchema: gitDiffSchema, handler: gitDiff });

  tools.push({ name: 'write_file', level: 'yellow', description: 'Escreve arquivo no repo (branch atual NÃO pode ser main)', inputSchema: writeFileSchema, handler: writeFile });
  tools.push({ name: 'git_commit', level: 'yellow', description: 'Commit em branch atual (não main)', inputSchema: gitCommitSchema, handler: gitCommit });
  tools.push({ name: 'git_checkout_branch', level: 'yellow', description: 'Trocar/criar branch (não main)', inputSchema: gitCheckoutBranchSchema, handler: gitCheckoutBranch });
  tools.push({ name: 'git_push_branch', level: 'yellow', description: 'Push em branch feature/* (não main)', inputSchema: gitPushBranchSchema, handler: gitPushBranch });

  tools.push({ name: 'pm2_restart', level: 'red', description: 'pm2 restart (requer AUTORIZO RESTART)', inputSchema: pm2RestartSchema, handler: pm2Restart });
  tools.push({ name: 'git_push_main', level: 'red', description: 'git push origin main (requer AUTORIZO PUSH MAIN)', inputSchema: gitPushMainSchema, handler: gitPushMain });
  tools.push({ name: 'db_exec', level: 'red', description: 'INSERT/UPDATE no data.db com WHERE obrigatório (requer AUTORIZO DB EXEC)', inputSchema: dbExecSchema, handler: dbExec });
}

export function getToolsManifest() {
  return tools.map(t => ({
    name: t.name,
    description: `[${t.level.toUpperCase()}] ${t.description}`,
    inputSchema: t.inputSchema,
  }));
}

export async function dispatchTool(name: string, args: any) {
  const tool = tools.find(t => t.name === name);
  if (!tool) throw new Error(`tool não encontrada: ${name}`);

  if (tool.level === 'red') {
    const required = RED_CONFIRMATIONS[name];
    if (!required) throw new Error(`tool 🔴 ${name} sem confirmation_phrase configurada`);
    if (args.confirmation_phrase !== required) {
      await audit({
        ts: '', tool: name, level: 'red', ok: false,
        error: `confirmation_phrase ausente ou incorreta (esperado: "${required}")`
      });
      throw new Error(`Ação 🔴 bloqueada. Para autorizar, inclua confirmation_phrase: "${required}" nos args.`);
    }
  }

  return await tool.handler(args);
}
