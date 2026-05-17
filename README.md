# pulso-mcp-server

MCP server que dá ao Claude (chat) acesso operacional à VPS do Pulso
com sistema de permissões 🟢🟡🔴 e audit log completo.

## Filosofia
- 🟢 VERDE: leitura — sem aprovação
- 🟡 AMARELO: escrita controlada (branch feature/*) — sem aprovação
- 🔴 VERMELHO: ações irreversíveis — exige frase de autorização explícita
- ⛔ PROIBIDO: jamais exposto (DROP, rm data.db, etc)

## Status
v0.1.0 — esqueleto + db_query funcionando
