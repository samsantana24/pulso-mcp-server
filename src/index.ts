import express from 'express';
import { dbQuery } from './tools/dbQuery';
import { TOOLS_MANIFEST } from './tools/index';
import { audit } from './audit/audit';

const PORT = parseInt(process.env.MCP_PORT || '3001');
const BIND = process.env.MCP_BIND || '127.0.0.1';
const TOKEN = process.env.MCP_TOKEN;

if (!TOKEN) {
  console.error('FATAL: MCP_TOKEN não configurado no .env');
  process.exit(1);
}

const app = express();
app.use(express.json({ limit: '1mb' }));

// Middleware de autenticação por token
app.use((req, res, next) => {
  const auth = req.headers['authorization'];
  if (auth !== `Bearer ${TOKEN}`) {
    return res.status(401).json({ error: 'unauthorized' });
  }
  next();
});

app.get('/health', (_, res) => res.json({ ok: true, version: '0.1.0' }));

app.get('/tools', (_, res) => res.json({ tools: TOOLS_MANIFEST }));

app.post('/tools/db_query', async (req, res) => {
  try {
    const result = await dbQuery(req.body);
    res.json({ ok: true, result });
  } catch (err: any) {
    res.status(400).json({ ok: false, error: err.message });
  }
});

// TODO: implementar demais endpoints (read_file, pm2_logs, etc) na próxima iteração

app.listen(PORT, BIND, () => {
  console.log(`[pulso-mcp] listening on ${BIND}:${PORT}`);
  audit({ ts: '', tool: 'server_start', level: 'green', ok: true });
});
