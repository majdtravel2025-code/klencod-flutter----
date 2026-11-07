import crypto from 'node:crypto';
import { config } from './config.js';
import * as store from './lib/store.js';
import { hashPassword, verifyPassword, sign, verify } from './lib/auth.js';
import { readJson, send, httpError } from './lib/http.js';
import * as sse from './lib/sse.js';

const STATUSES = ['new', 'preparing', 'ready', 'ontheway', 'done', 'cancelled'];
const TYPES = ['dine', 'pickup', 'delivery'];

const clean = (s, max) => String(s ?? '').trim().slice(0, max);
const digits = (s) => String(s ?? '').replace(/[^\d]/g, '');
const rid = (p) => p + crypto.randomBytes(5).toString('hex');
const publicUser = (u) => ({ id: u.id, name: u.name, login: u.login, role: u.role });
const newToken = (u) => sign({ uid: u.id }, store.get().secret, config.tokenDays);

// ---- حماية بسيطة ضد تخمين كلمات المرور
const fails = new Map();
function checkLimit(key) {
  const e = fails.get(key);
  if (e && e.n >= 8 && Date.now() - e.first < 10 * 60 * 1000) {
    throw httpError(429, 'rate', 'محاولات كثيرة، حاول بعد عشر دقائق');
  }
}
function addFail(key) {
  const e = fails.get(key);
  if (!e || Date.now() - e.first > 10 * 60 * 1000) fails.set(key, { n: 1, first: Date.now() });
  else e.n++;
}

function authUser(req, url, role) {
  const h = req.headers.authorization || '';
  const token = h.startsWith('Bearer ') ? h.slice(7) : url.searchParams.get('t');
  const payload = verify(token, store.get().secret);
  const user = payload && store.get().users.find((u) => u.id === payload.uid);
  if (!user) throw httpError(401, 'auth', 'سجّل الدخول للمتابعة');
  if (role && user.role !== role) throw httpError(403, 'forbidden', 'لا تملك صلاحية لهذا الإجراء');
  return user;
}

function menuPayload() {
  const d = store.get();
  return {
    settings: { name: d.settings.restaurantName, phone: d.settings.phone, acceptingOrders: d.settings.acceptingOrders },
    categories: d.menu.categories,
    items: d.menu.items
  };
}

function readItem(b, d, existing) {
  const name = clean(b.name, 80);
  const price = Math.round(Number(b.price));
  if (name.length < 2) throw httpError(400, 'name', 'اكتب اسم الصنف');
  if (!Number.isFinite(price) || price < 0 || price > 10_000_000) throw httpError(400, 'price', 'السعر غير صحيح');
  const cat = String(b.cat || '');
  if (!d.menu.categories.some((c) => c.id === cat)) throw httpError(400, 'cat', 'اختر القسم');
  return {
    id: existing ? existing.id : rid('i'),
    cat,
    name,
    desc: clean(b.desc, 200),
    price,
    available: b.available !== false,
    pop: !!b.pop
  };
}

// ---- جدول المسارات
const routes = [];
const route = (method, pattern, handler) =>
  routes.push({ method, parts: pattern.split('/').filter(Boolean), handler });

function match(method, pathname) {
  const seg = pathname.split('/').filter(Boolean);
  for (const rt of routes) {
    if (rt.method !== method || rt.parts.length !== seg.length) continue;
    const params = {};
    let ok = true;
    rt.parts.forEach((p, i) => {
      if (p[0] === ':') params[p.slice(1)] = decodeURIComponent(seg[i]);
      else if (p !== seg[i]) ok = false;
    });
    if (ok) return { rt, params };
  }
  return null;
}

export async function handleApi(req, res, url) {
  const m = match(req.method, url.pathname);
  if (!m) throw httpError(404, 'not_found', 'المسار غير موجود');
  await m.rt.handler({ req, res, url, params: m.params });
}

route('GET', 'api/health', ({ res }) => send(res, 200, { ok: true, mode: 'live' }));
route('GET', 'api/menu', ({ res }) => send(res, 200, menuPayload()));

// ---- الحسابات
route('POST', 'api/auth/register', async ({ req, res }) => {
  const b = await readJson(req);
  const name = clean(b.name, 60);
  const phone = digits(b.phone);
  const password = String(b.password || '');
  if (name.length < 2) throw httpError(400, 'name', 'اكتب اسمك (حرفان على الأقل)');
  if (phone.length < 7 || phone.length > 15) throw httpError(400, 'phone', 'رقم الجوال غير صحيح');
  if (password.length < 6) throw httpError(400, 'password', 'كلمة المرور 6 أحرف على الأقل');
  const d = store.get();
  if (d.users.some((u) => u.login === phone)) throw httpError(409, 'exists', 'هذا الرقم مسجّل من قبل، سجّل الدخول');
  const user = { id: rid('u'), role: 'customer', name, login: phone, pass: hashPassword(password), createdAt: Date.now() };
  d.users.push(user);
  store.save();
  send(res, 201, { token: newToken(user), user: publicUser(user) });
});

route('POST', 'api/auth/login', async ({ req, res }) => {
  const b = await readJson(req);
  const raw = String(b.login || '').trim().toLowerCase();
  const login = /^\+?[\d\s-]+$/.test(raw) ? digits(raw) : raw;
  const key = req.socket.remoteAddress + '|' + login;
  checkLimit(key);
  const user = store.get().users.find((u) => u.login === login);
  if (!user || !verifyPassword(String(b.password || ''), user.pass)) {
    addFail(key);
    throw httpError(401, 'bad_login', 'بيانات الدخول غير صحيحة');
  }
  fails.delete(key);
  send(res, 200, { token: newToken(user), user: publicUser(user) });
});

route('GET', 'api/me', ({ req, res, url }) => send(res, 200, { user: publicUser(authUser(req, url)) }));

// ---- طلبات الزبون
route('POST', 'api/orders', async ({ req, res, url }) => {
  const user = authUser(req, url);
  const b = await readJson(req);
  const d = store.get();
  if (!d.settings.acceptingOrders) throw httpError(403, 'closed', 'المطعم لا يستقبل الطلبات حالياً');
  if (!TYPES.includes(b.type)) throw httpError(400, 'type', 'اختر نوع الطلب');
  const address = clean(b.address, 200);
  if (b.type === 'delivery' && address.length < 4) throw httpError(400, 'address', 'اكتب عنوان التوصيل');

  const lines = [];
  const seen = new Set();
  for (const it of Array.isArray(b.items) ? b.items.slice(0, 60) : []) {
    const mi = d.menu.items.find((x) => x.id === it.id);
    const qty = Math.floor(Number(it.qty));
    if (!mi || !(qty >= 1) || qty > 50 || seen.has(mi.id)) continue;
    if (!mi.available) throw httpError(409, 'unavailable', `«${mi.name}» غير متوفر الآن`);
    seen.add(mi.id);
    lines.push({ id: mi.id, name: mi.name, price: mi.price, qty });
  }
  if (!lines.length) throw httpError(400, 'empty', 'السلة فارغة');

  const order = {
    id: ++d.seq.order,
    createdAt: Date.now(),
    userId: user.id,
    customer: { name: user.name, phone: user.login },
    type: b.type,
    address: b.type === 'delivery' ? address : '',
    notes: clean(b.notes, 300),
    items: lines,
    total: lines.reduce((s, l) => s + l.price * l.qty, 0),
    status: 'new',
    history: [{ status: 'new', at: Date.now() }]
  };
  d.orders.push(order);
  store.save();
  sse.broadcast('order', { id: order.id });
  send(res, 201, order);
});

route('GET', 'api/orders/mine', ({ req, res, url }) => {
  const user = authUser(req, url);
  const list = store.get().orders.filter((o) => o.userId === user.id).slice(-50).reverse();
  send(res, 200, { orders: list });
});

route('POST', 'api/orders/:id/cancel', ({ req, res, url, params }) => {
  const user = authUser(req, url);
  const order = store.get().orders.find((o) => o.id === Number(params.id) && o.userId === user.id);
  if (!order) throw httpError(404, 'not_found', 'الطلب غير موجود');
  if (order.status !== 'new') throw httpError(409, 'locked', 'لا يمكن إلغاء الطلب بعد بدء تحضيره، اتصل بالمطعم');
  order.status = 'cancelled';
  order.history.push({ status: 'cancelled', at: Date.now() });
  store.save();
  sse.broadcast('order', { id: order.id });
  send(res, 200, order);
});

// ---- لوحة المدير
route('GET', 'api/manager/orders', ({ req, res, url }) => {
  authUser(req, url, 'manager');
  send(res, 200, { orders: store.get().orders.slice(-300).reverse() });
});

route('POST', 'api/manager/orders/:id/status', async ({ req, res, url, params }) => {
  authUser(req, url, 'manager');
  const b = await readJson(req);
  if (!STATUSES.includes(b.status)) throw httpError(400, 'status', 'حالة غير صحيحة');
  const order = store.get().orders.find((o) => o.id === Number(params.id));
  if (!order) throw httpError(404, 'not_found', 'الطلب غير موجود');
  order.status = b.status;
  order.history.push({ status: b.status, at: Date.now() });
  store.save();
  sse.broadcast('order', { id: order.id });
  send(res, 200, order);
});

route('GET', 'api/manager/stream', ({ req, res, url }) => {
  authUser(req, url, 'manager');
  sse.add(res);
});

route('POST', 'api/manager/items', async ({ req, res, url }) => {
  authUser(req, url, 'manager');
  const d = store.get();
  const item = readItem(await readJson(req), d);
  d.menu.items.push(item);
  store.save();
  send(res, 201, item);
});

route('PUT', 'api/manager/items/:id', async ({ req, res, url, params }) => {
  authUser(req, url, 'manager');
  const d = store.get();
  const idx = d.menu.items.findIndex((i) => i.id === params.id);
  if (idx < 0) throw httpError(404, 'not_found', 'الصنف غير موجود');
  d.menu.items[idx] = readItem(await readJson(req), d, d.menu.items[idx]);
  store.save();
  send(res, 200, d.menu.items[idx]);
});

route('DELETE', 'api/manager/items/:id', ({ req, res, url, params }) => {
  authUser(req, url, 'manager');
  const d = store.get();
  d.menu.items = d.menu.items.filter((i) => i.id !== params.id);
  store.save();
  send(res, 200, { ok: true });
});

route('POST', 'api/manager/categories', async ({ req, res, url }) => {
  authUser(req, url, 'manager');
  const name = clean((await readJson(req)).name, 50);
  if (name.length < 2) throw httpError(400, 'name', 'اكتب اسم القسم');
  const cat = { id: rid('c'), name };
  store.get().menu.categories.push(cat);
  store.save();
  send(res, 201, cat);
});

route('PUT', 'api/manager/categories/:id', async ({ req, res, url, params }) => {
  authUser(req, url, 'manager');
  const cat = store.get().menu.categories.find((c) => c.id === params.id);
  if (!cat) throw httpError(404, 'not_found', 'القسم غير موجود');
  const name = clean((await readJson(req)).name, 50);
  if (name.length < 2) throw httpError(400, 'name', 'اكتب اسم القسم');
  cat.name = name;
  store.save();
  send(res, 200, cat);
});

route('DELETE', 'api/manager/categories/:id', ({ req, res, url, params }) => {
  authUser(req, url, 'manager');
  const d = store.get();
  if (d.menu.items.some((i) => i.cat === params.id)) throw httpError(409, 'not_empty', 'انقل أصناف هذا القسم أو احذفها أولاً');
  d.menu.categories = d.menu.categories.filter((c) => c.id !== params.id);
  store.save();
  send(res, 200, { ok: true });
});

route('PUT', 'api/manager/settings', async ({ req, res, url }) => {
  authUser(req, url, 'manager');
  const b = await readJson(req);
  const s = store.get().settings;
  if (b.name !== undefined) s.restaurantName = clean(b.name, 60) || s.restaurantName;
  if (b.phone !== undefined) s.phone = clean(b.phone, 30);
  if (b.acceptingOrders !== undefined) s.acceptingOrders = !!b.acceptingOrders;
  store.save();
  send(res, 200, menuPayload().settings);
});

route('POST', 'api/manager/password', async ({ req, res, url }) => {
  const user = authUser(req, url, 'manager');
  const b = await readJson(req);
  if (!verifyPassword(String(b.current || ''), user.pass)) throw httpError(401, 'bad_login', 'كلمة المرور الحالية غير صحيحة');
  if (String(b.next || '').length < 8) throw httpError(400, 'password', 'كلمة المرور الجديدة 8 أحرف على الأقل');
  user.pass = hashPassword(String(b.next));
  store.save();
  send(res, 200, { ok: true });
});
