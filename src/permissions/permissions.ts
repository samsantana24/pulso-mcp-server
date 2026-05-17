export type PermissionLevel = 'green' | 'yellow' | 'red' | 'forbidden';

export interface PermissionDecision {
  allowed: boolean;
  level: PermissionLevel;
  reason: string;
  requiresConfirmation?: string;  // frase exata exigida pra red
}

// Ferramentas vermelhas: lista das frases de autorização exigidas
export const RED_CONFIRMATIONS: Record<string, string> = {
  'pm2_restart': 'AUTORIZO RESTART',
  'git_push_main': 'AUTORIZO PUSH MAIN',
  'db_exec': 'AUTORIZO DB EXEC',
};

// Padrões SQL absolutamente proibidos (NUNCA expostos)
export const FORBIDDEN_SQL_PATTERNS = [
  /\bDROP\s+(TABLE|DATABASE|INDEX|VIEW|TRIGGER)\b/i,
  /\bTRUNCATE\b/i,
  /\bDELETE\s+FROM\s+\w+\s*;?\s*$/i,      // DELETE sem WHERE
  /\bDELETE\s+FROM\s+\w+\s+(?!WHERE)/i,    // DELETE sem WHERE
  /\bUPDATE\s+\w+\s+SET\s+[^;]+;?\s*$/i,   // UPDATE sem WHERE
  /\bATTACH\s+DATABASE\b/i,
  /\bDETACH\s+DATABASE\b/i,
  /\bVACUUM\b/i,
  /\bPRAGMA\s+writable_schema\b/i,
];

// Comandos shell absolutamente proibidos (caso alguma ferramenta exponha shell)
export const FORBIDDEN_SHELL_PATTERNS = [
  /\brm\s+-rf?\s+\//i,
  /\brm\s+.*data\.db/i,
  /\bmkfs\b/i,
  /\bdd\s+if=.*of=\/dev/i,
  />\s*data\.db/i,
];

export function sanitizeSql(sql: string): { ok: boolean; reason?: string } {
  for (const pattern of FORBIDDEN_SQL_PATTERNS) {
    if (pattern.test(sql)) {
      return { ok: false, reason: `SQL bloqueado por regra de segurança: ${pattern}` };
    }
  }
  return { ok: true };
}
