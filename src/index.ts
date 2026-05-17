import express from 'express';
import { randomUUID } from 'crypto';
import { Server } from '@modelcontextprotocol/sdk/server/index.js';
import { StreamableHTTPServerTransport } from '@modelcontextprotocol/sdk/server/streamableHttp.js';
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
app.use(express.json({ limit: '4mb' }));

app.get('/health', (_req, res) => {
  res.json({ ok: true, version: '0.3.0', protocols: ['streamable-http', 'sse-legacy'] });
});

function authMcp(req: express.Request, res: express.Response, next: express.NextFunction) {
  const auth = req.headers['authorization'];
  if (auth !== `Bearer ${TOKEN}`) {
    return res.status(401).json({
      jsonrpc: '2.0',
      error: { code: -32001, message: 'Unauthorized' },
      id: null,
    });
  }
  next();
}

function buildMcpServer(): Server {
  const server = new Server(
    { name: 'pulso-mcp-server', version: '0.3.0' },
    { capabilities: { tools: {} } }
  );

  server.setRequestHandler(ListToolsRequestSchema, async () => {
    return { tools: getToolsManifest() };
  });

  server.setRequestHandler(CallToolRequestSchema, async (request) => {
    const { name, arguments: args } = request.params;
    try {
      const result = await dispatchTool(name, args ?? {});
      return { content: [{ type: 'text', text: JSON.stringify(result, null, 2) }] };
    } catch (err: any) {
      await audit({ ts: '', tool: name, level: 'green', ok: false, error: err.message });
      return {
        content: [{ type: 'text', text: `ERROR: ${err.message}` }],
        isError: true,
      };
    }
  });

  return server;
}

const httpTransports = new Map<string, StreamableHTTPServerTransport>();

app.all('/mcp', authMcp, async (req, res) => {
  const sessionId = req.headers['mcp-session-id'] as string | undefined;
  let transport: StreamableHTTPServerTransport | undefined;

  if (sessionId && httpTransports.has(sessionId)) {
    transport = httpTransports.get(sessionId);
  } else if (req.method === 'POST' && !sessionId) {
    transport = new StreamableHTTPServerTransport({
      sessionIdGenerator: () => randomUUID(),
      onsessioninitialized: (id) => {
        httpTransports.set(id, transport!);
      },
    });
    transport.onclose = () => {
      if (transport!.sessionId) httpTransports.delete(transport!.sessionId);
    };
    const mcp = buildMcpServer();
    await mcp.connect(transport);
  }

  if (!transport) {
    return res.status(400).json({
      jsonrpc: '2.0',
      error: { code: -32000, message: 'Bad Request: invalid session' },
      id: null,
    });
  }

  await transport.handleRequest(req, res, req.body);
});

const sseTransports = new Map<string, SSEServerTransport>();

app.get('/sse', authMcp, async (_req, res) => {
  const transport = new SSEServerTransport('/messages', res);
  sseTransports.set(transport.sessionId, transport);
  res.on('close', () => sseTransports.delete(transport.sessionId));
  const mcp = buildMcpServer();
  await mcp.connect(transport);
});

app.post('/messages', authMcp, async (req, res) => {
  const sessionId = req.query.sessionId as string;
  const transport = sseTransports.get(sessionId);
  if (!transport) return res.status(404).json({ error: 'session not found' });
  await transport.handlePostMessage(req, res, req.body);
});

app.listen(PORT, BIND, () => {
  console.log(`[pulso-mcp v0.3.0] listening on ${BIND}:${PORT}`);
  console.log('  - Streamable HTTP: /mcp');
  console.log('  - SSE legacy:      /sse + /messages');
  registerTools();
  audit({ ts: '', tool: 'server_start', level: 'green', ok: true });
});
