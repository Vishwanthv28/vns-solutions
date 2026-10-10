import http from 'node:http';
import { createServer } from 'vite';
import consultant from '../api/consultant.js';
import contact from '../api/contact.js';
import lead from '../api/consultant-lead.js';
const vite = await createServer({ server: { middlewareMode: true }, appType: 'spa' });
const server = http.createServer(async (req, res) => {
  const route = req.url?.split('?')[0];
  const handler = route === '/api/consultant' ? consultant : route === '/api/contact' ? contact : route === '/api/consultant-lead' ? lead : null;
  if (!handler) {
    if (route?.startsWith('/api/')) { res.writeHead(404, { 'Content-Type': 'application/json' }); res.end(JSON.stringify({ message: 'API endpoint not found.' })); return; }
    return vite.middlewares(req, res);
  }
  let bytes = 0; const chunks = [];
  try {
    for await (const chunk of req) {
      bytes += chunk.length;
      if (bytes > (route === '/api/consultant-lead' ? 65000 : 20000)) { res.writeHead(413, { 'Content-Type': 'application/json' }); res.end(JSON.stringify({ message: 'Request is too large.' })); return; }
      chunks.push(chunk);
    }
    req.body = Buffer.concat(chunks).toString('utf8');
    res.status = code => { res.statusCode = code; return res; };
    res.json = data => { res.setHeader('Content-Type', 'application/json'); res.end(JSON.stringify(data)); };
    await handler(req, res);
  } catch { if (!res.headersSent) res.writeHead(500, { 'Content-Type': 'application/json' }); res.end(JSON.stringify({ message: 'Request failed.' })); }
});
server.listen(5173, '127.0.0.1', () => console.log('VNS frontend + API: http://localhost:5173'));
