import express from 'express';
import { Server } from '@modelcontextprotocol/sdk/server/index.js';
import { SSEServerTransport } from '@modelcontextprotocol/sdk/server/sse.js';
import {
  CallToolRequestSchema,
  ListToolsRequestSchema,
} from '@modelcontextprotocol/sdk/types.js';
import { registerTools, dispatchTool, getToolsManifest } from './tools/registry';
import { audit } from './audit/audit';

const PORT = parseInt(process.env.MCP_PORT || '3002');
const BIND = process.env.MCP_BIND || '127.0.0.1';
const TOKEN = process.env.MCP_TOKEN;

if (!TOKEN) {
  console.error('FATAL: MCP_TOKEN não configurado no .env');
  process.exit(1);
}

const app = express();
app.use(express.json({ limit: '1mb' }));

app.get('/health', (_req, res) => {
  res.json({ ok: true, version: '0.2.0', protocol: 'mcp-over-sse' });
});

function authMcp(req: express.Request, res: express.Response, next: express.NextFunction) {
  const auth = req.headers['authorization'];
  if (auth !== `Bearer ${TOKEN}`) {
    return res.status(401).json({ error: 'unauthorized' });
  }
  next();
}

const transports = new Map<string, SSEServerTransport>();

const mcpServer = new Server(
  { name: 'pulso-mcp-server', version: '0.2.0' },
  { capabilities: { tools: {} } }
);

mcpServer.setRequestHandler(ListToolsRequestSchema, async () => {
  return { tools: getToolsManifest() };
});

mcpServer.setRequestHandler(CallToolRequestSchema, async (request) => {
  const { name, arguments: args } = request.params;
  try {
    const result = await dispatchTool(name, args ?? {});
    return {
      content: [{ type: 'text', text: JSON.stringify(result, null, 2) }]
    };
  } catch (err: any) {
    await audit({
      ts: '', tool: name, level: 'green', ok: false, error: err.message
    });
    return {
      content: [{ type: 'text', text: `ERROR: ${err.message}` }],
      isError: true
    };
  }
});

app.get('/sse', authMcp, async (_req, res) => {
  const transport = new SSEServerTransport('/messages', res);
  transports.set(transport.sessionId, transport);
  res.on('close', () => transports.delete(transport.sessionId));
  await mcpServer.connect(transport);
});

app.post('/messages', authMcp, async (req, res) => {
  const sessionId = req.query.sessionId as string;
  const transport = transports.get(sessionId);
  if (!transport) return res.status(404).json({ error: 'session not found' });
  await transport.handlePostMessage(req, res);
});

app.listen(PORT, BIND, () => {
  console.log(`[pulso-mcp v0.2.0] MCP-over-SSE listening on ${BIND}:${PORT}`);
  registerTools();
  audit({ ts: '', tool: 'server_start', level: 'green', ok: true });
});
