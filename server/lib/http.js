import fs from 'node:fs';
import path from 'node:path';

export const httpError = (status, code, message) => Object.assign(new Error(message || code), { status, code });

export async function readJson(req, limit = 200_000) {
  let size = 0;
  const chunks = [];
  for await (const chunk of req) {
    size += chunk.length;
    if (size > limit) throw httpError(413, 'too_large', 'الطلب كبير جداً');
    chunks.push(chunk);
  }
  if (!chunks.length) return {};
  try {
    return JSON.parse(Buffer.concat(chunks).toString('utf8'));
  } catch {
    throw httpError(400, 'bad_json', 'بيانات غير صالحة');
  }
}

export function send(res, status, obj) {
  res.writeHead(status, { 'content-type': 'application/json; charset=utf-8', 'cache-control': 'no-store' });
  res.end(JSON.stringify(obj));
}

const MIME = {
  '.html': 'text/html; charset=utf-8',
  '.css': 'text/css; charset=utf-8',
  '.js': 'text/javascript; charset=utf-8',
  '.json': 'application/json; charset=utf-8',
  '.png': 'image/png',
  '.svg': 'image/svg+xml',
  '.ico': 'image/x-icon',
  '.webmanifest': 'application/manifest+json'
};

export function serveStatic(req, res, publicDir, pathname) {
  let p;
  try { p = decodeURIComponent(pathname); } catch { res.writeHead(400); return res.end(); }
  if (p === '/' || p === '') p = '/index.html';
  if (p === '/manager') p = '/manager.html';
  const full = path.normalize(path.join(publicDir, p));
  if (!full.startsWith(publicDir + path.sep)) { res.writeHead(403); return res.end(); }
  fs.stat(full, (err, st) => {
    if (err || !st.isFile()) {
      res.writeHead(404, { 'content-type': 'text/plain; charset=utf-8' });
      return res.end('الصفحة غير موجودة');
    }
    const ext = path.extname(full);
    const fresh = ext === '.html' || p === '/sw.js' || ext === '.json';
    res.writeHead(200, {
      'content-type': MIME[ext] || 'application/octet-stream',
      'cache-control': fresh ? 'no-cache' : 'public, max-age=300',
      'x-content-type-options': 'nosniff'
    });
    if (req.method === 'HEAD') return res.end();
    fs.createReadStream(full).pipe(res);
  });
}
