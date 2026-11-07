import http from 'node:http';
import fs from 'node:fs';
import path from 'node:path';
import crypto from 'node:crypto';
import { config } from './config.js';
import * as store from './lib/store.js';
import { hashPassword } from './lib/auth.js';
import { serveStatic, send } from './lib/http.js';
import { handleApi } from './routes.js';

const seed = JSON.parse(fs.readFileSync(path.join(config.publicDir, 'data', 'menu.json'), 'utf8'));
store.init(seed);
ensureManager();

function ensureManager() {
  const d = store.get();
  if (d.users.some((u) => u.role === 'manager')) return;
  const generated = !config.managerPass;
  const pass = config.managerPass || crypto.randomBytes(6).toString('base64url');
  d.users.push({
    id: 'u' + crypto.randomBytes(5).toString('hex'),
    role: 'manager',
    name: 'المدير',
    login: config.managerUser,
    pass: hashPassword(pass),
    createdAt: Date.now()
  });
  store.flush();
  console.log('\n==============================================');
  console.log(' تم إنشاء حساب المدير');
  console.log('   اسم الدخول : ' + config.managerUser);
  console.log('   كلمة المرور: ' + (generated ? pass + '   (احفظها الآن وغيّرها من لوحة المدير)' : '(من المتغير MANAGER_PASS)'));
  console.log('==============================================\n');
}

const server = http.createServer(async (req, res) => {
  try {
    const url = new URL(req.url, 'http://localhost');
    res.setHeader('x-frame-options', 'DENY');
    res.setHeader('referrer-policy', 'same-origin');
    if (url.pathname.startsWith('/api/')) {
      await handleApi(req, res, url);
    } else if (req.method === 'GET' || req.method === 'HEAD') {
      serveStatic(req, res, config.publicDir, url.pathname);
    } else {
      send(res, 405, { code: 'method', message: 'طريقة غير مدعومة' });
    }
  } catch (e) {
    if (res.headersSent) return res.end();
    if (!e.status) console.error(e);
    send(res, e.status || 500, { code: e.code || 'server', message: e.status ? e.message : 'حدث خطأ في الخادم' });
  }
});

server.listen(config.port, () => {
  console.log(`تطبيق مدينتي يعمل على  http://localhost:${config.port}`);
  console.log(`لوحة المدير              http://localhost:${config.port}/manager`);
});
