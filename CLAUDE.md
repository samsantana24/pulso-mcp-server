# Regras invioláveis deste projeto

1. NUNCA expor nova ferramenta sem passar pela camada de permission + audit.
2. SQL destrutivo é bloqueado em src/permissions/permissions.ts.
3. Frases de autorização 🔴 jamais relaxadas.
4. Audit log nunca desabilitado.
5. Mudanças neste repo passam por code review do Sâmeque antes de deploy.
