# pulso-mcp-server

MCP server que dá ao Claude (chat) acesso operacional à VPS do Pulso
com sistema de permissões 🟢🟡🔴 e audit log completo.

## Filosofia
- 🟢 VERDE: leitura — sem aprovação
- 🟡 AMARELO: escrita controlada (branch feature/*) — sem aprovação
- 🔴 VERMELHO: ações irreversíveis — exige frase de autorização explícita
- ⛔ PROIBIDO: jamais exposto (DROP, rm data.db, etc)

## Status
v0.2.0 — MCP-over-SSE nativo (`@modelcontextprotocol/sdk`) + 15 tools (8🟢 / 4🟡 / 3🔴)

## Endpoints
- `GET  /health` — público (sem auth)
- `GET  /sse` — stream SSE MCP (Bearer obrigatório)
- `POST /messages?sessionId=...` — JSON-RPC do cliente MCP (Bearer obrigatório)

## Tools
- 🟢 `db_query`, `read_file`, `list_dir`, `pm2_logs`, `pm2_status`, `git_status`, `git_log`, `git_diff`
- 🟡 `write_file`, `git_commit`, `git_checkout_branch`, `git_push_branch`
- 🔴 `pm2_restart` (AUTORIZO RESTART), `git_push_main` (AUTORIZO PUSH MAIN), `db_exec` (AUTORIZO DB EXEC)
