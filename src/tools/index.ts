// Mapa de ferramentas que o servidor MCP expõe.
// Cada uma com seu nível de permissão.

export const TOOLS_MANIFEST = {
  // 🟢 VERDE — leitura
  db_query: { level: 'green', description: 'SELECT no data.db (read-only)' },
  read_file: { level: 'green', description: 'Ler arquivo do repo' },
  list_dir: { level: 'green', description: 'Listar diretório do repo' },
  pm2_logs: { level: 'green', description: 'Tail dos logs do PM2' },
  pm2_status: { level: 'green', description: 'pm2 list' },
  git_status: { level: 'green', description: 'git status do repo Pulso' },
  git_log: { level: 'green', description: 'git log do repo Pulso' },
  git_diff: { level: 'green', description: 'git diff do repo Pulso' },

  // 🟡 AMARELO — edição sem push em main
  write_file: { level: 'yellow', description: 'Escrever arquivo no repo (não em main)' },
  git_commit: { level: 'yellow', description: 'Commit em branch feature/* (não main)' },
  git_checkout_branch: { level: 'yellow', description: 'Trocar/criar branch (não main)' },
  git_push_branch: { level: 'yellow', description: 'Push em branch feature/* (não main)' },

  // 🔴 VERMELHO — exige AUTORIZO ...
  pm2_restart: { level: 'red', description: 'pm2 restart (requer AUTORIZO RESTART)' },
  git_push_main: { level: 'red', description: 'Push em main (requer AUTORIZO PUSH MAIN)' },
  db_exec: { level: 'red', description: 'INSERT/UPDATE no data.db (requer AUTORIZO DB EXEC)' },
};
