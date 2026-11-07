// قاعدة بيانات بسيطة في ملف JSON واحد، تُكتب بشكل آمن (ملف مؤقت ثم إعادة تسمية).
import fs from 'node:fs';
import path from 'node:path';
import crypto from 'node:crypto';
import { config } from '../config.js';

const file = path.join(config.dataDir, 'db.json');

let db = {
  users: [],
  orders: [],
  menu: null,
  settings: { restaurantName: 'مطاعم مدينتي', phone: '', acceptingOrders: true },
  seq: { order: 1000 },
  secret: ''
};

let timer = null;

export function init(seedMenu) {
  fs.mkdirSync(config.dataDir, { recursive: true });
  if (fs.existsSync(file)) {
    const saved = JSON.parse(fs.readFileSync(file, 'utf8'));
    db = { ...db, ...saved, settings: { ...db.settings, ...(saved.settings || {}) } };
  }
  if (!db.menu && seedMenu) db.menu = seedMenu;
  if (!db.secret) db.secret = config.secret || crypto.randomBytes(32).toString('hex');
  if (config.secret) db.secret = config.secret;
  flush();
}

export function save() {
  clearTimeout(timer);
  timer = setTimeout(flush, 60);
}

export function flush() {
  clearTimeout(timer);
  const tmp = file + '.tmp';
  fs.writeFileSync(tmp, JSON.stringify(db, null, 2));
  fs.renameSync(tmp, file);
}

export const get = () => db;

process.on('exit', () => { try { flush(); } catch {} });
for (const sig of ['SIGINT', 'SIGTERM']) process.on(sig, () => process.exit(0));
