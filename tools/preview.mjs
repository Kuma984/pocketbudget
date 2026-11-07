// Optional frontend-only server. PHP is never served as source or executed here.
import http from 'node:http';
import fs from 'node:fs/promises';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
const root = fileURLToPath(new URL('../public/', import.meta.url));
const mime = { '.html':'text/html; charset=utf-8', '.js':'text/javascript; charset=utf-8', '.css':'text/css; charset=utf-8', '.svg':'image/svg+xml', '.png':'image/png', '.webmanifest':'application/manifest+json' };
const port = Number(process.env.POCKETBUDGET_PORT || 8000);
http.createServer(async (req, res) => {
  try {
    const url = new URL(req.url, 'http://localhost');
    const name = decodeURIComponent(url.pathname);
    if (name.startsWith('/api/') || name.endsWith('.php')) {
      res.writeHead(503, { 'Content-Type':'application/json; charset=utf-8', 'Cache-Control':'no-store' });
      res.end(JSON.stringify({ ok:false, error:{ code:'FRONTEND_PREVIEW_ONLY', message:'Server này chỉ xem frontend. Chạy PHP để kiểm tra API.' } })); return;
    }
    const file = path.resolve(root, '.' + (name === '/' ? '/index.html' : name));
    if (!file.startsWith(root)) { res.writeHead(403); res.end('Forbidden'); return; }
    const body = await fs.readFile(file);
    res.writeHead(200, { 'Content-Type':mime[path.extname(file)] || 'application/octet-stream', 'Cache-Control':'no-cache' }); res.end(body);
  } catch { res.writeHead(404); res.end('Not found'); }
}).listen(port, '127.0.0.1', () => console.log(`Frontend preview: http://localhost:${port} — no PHP/API execution`));
