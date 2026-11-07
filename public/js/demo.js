// نسخة تجريبية تعمل داخل المتصفح بدون خادم (للمعاينة فقط). نفس واجهة api.js.
// تحذير: كلمات المرور هنا غير مشفّرة والبيانات محلية، لذلك لا تُستخدم في الإنتاج.
(function (A) {
  var KEY = 'madinati.demo.v1';
  var mem = null;

  function read() { try { var s = localStorage.getItem(KEY); if (s) return JSON.parse(s); } catch (e) {} return null; }
  function write(d) { mem = d; try { localStorage.setItem(KEY, JSON.stringify(d)); } catch (e) {} }
  function fail(status, code, msg) { var e = new Error(msg); e.status = status; e.code = code; return e; }
  function pub(u) { return { id: u.id, name: u.name, login: u.login, role: u.role }; }
  function digits(s) { return String(s || '').replace(/[^\d]/g, ''); }

  async function db() {
    var d = read() || mem;
    if (d) { mem = d; return d; }
    var r = await fetch('data/menu.json');
    var menu = await r.json();
    d = {
      users: [{ id: 'u0', role: 'manager', name: 'المدير', login: 'manager', pass: 'manager123' }],
      orders: [],
      menu: menu,
      settings: { restaurantName: A.config.name, phone: '', acceptingOrders: true },
      seq: 1000
    };
    write(d);
    return d;
  }
  function me(d) {
    var t = A.storage.get(A.config.tokenKey);
    return (t && d.users.filter(function (u) { return u.id === t; })[0]) || null;
  }
  function need(d, role) {
    var u = me(d);
    if (!u) throw fail(401, 'auth', 'سجّل الدخول للمتابعة');
    if (role && u.role !== role) throw fail(403, 'forbidden', 'لا تملك صلاحية لهذا الإجراء');
    return u;
  }
  function settingsOut(d) { return { name: d.settings.restaurantName, phone: d.settings.phone, acceptingOrders: d.settings.acceptingOrders }; }
  function rid(p) { return p + Math.random().toString(36).slice(2, 9); }

  A.demo = {
    menu: async function () { var d = await db(); return { settings: settingsOut(d), categories: d.menu.categories, items: d.menu.items }; },

    register: async function (b) {
      var d = await db();
      var name = String(b.name || '').trim(), phone = digits(b.phone), pw = String(b.password || '');
      if (name.length < 2) throw fail(400, 'name', 'اكتب اسمك (حرفان على الأقل)');
      if (phone.length < 7 || phone.length > 15) throw fail(400, 'phone', 'رقم الجوال غير صحيح');
      if (pw.length < 6) throw fail(400, 'password', 'كلمة المرور 6 أحرف على الأقل');
      if (d.users.some(function (u) { return u.login === phone; })) throw fail(409, 'exists', 'هذا الرقم مسجّل من قبل، سجّل الدخول');
      var u = { id: rid('u'), role: 'customer', name: name, login: phone, pass: pw };
      d.users.push(u); write(d);
      A.storage.set(A.config.tokenKey, u.id);
      return pub(u);
    },
    login: async function (b) {
      var d = await db();
      var raw = String(b.login || '').trim().toLowerCase();
      var login = /^\+?[\d\s-]+$/.test(raw) ? digits(raw) : raw;
      var u = d.users.filter(function (x) { return x.login === login && x.pass === String(b.password || ''); })[0];
      if (!u) throw fail(401, 'bad_login', 'بيانات الدخول غير صحيحة');
      A.storage.set(A.config.tokenKey, u.id);
      return pub(u);
    },
    me: async function () { var d = await db(); var u = me(d); return u ? pub(u) : null; },
    logout: async function () { A.storage.del(A.config.tokenKey); },

    createOrder: async function (b) {
      var d = await db(), u = need(d);
      if (!d.settings.acceptingOrders) throw fail(403, 'closed', 'المطعم لا يستقبل الطلبات حالياً');
      if (!A.TYPES[b.type]) throw fail(400, 'type', 'اختر نوع الطلب');
      var address = String(b.address || '').trim();
      if (b.type === 'delivery' && address.length < 4) throw fail(400, 'address', 'اكتب عنوان التوصيل');
      var lines = [];
      (b.items || []).forEach(function (it) {
        var mi = d.menu.items.filter(function (x) { return x.id === it.id; })[0];
        var qty = Math.floor(Number(it.qty));
        if (!mi || !(qty >= 1) || qty > 50) return;
        if (!mi.available) throw fail(409, 'unavailable', '«' + mi.name + '» غير متوفر الآن');
        lines.push({ id: mi.id, name: mi.name, price: mi.price, qty: qty });
      });
      if (!lines.length) throw fail(400, 'empty', 'السلة فارغة');
      var o = {
        id: ++d.seq, createdAt: Date.now(), userId: u.id, customer: { name: u.name, phone: u.login },
        type: b.type, address: b.type === 'delivery' ? address : '', notes: String(b.notes || '').slice(0, 300),
        items: lines, total: lines.reduce(function (s, l) { return s + l.price * l.qty; }, 0),
        status: 'new', history: [{ status: 'new', at: Date.now() }]
      };
      d.orders.push(o); write(d);
      return o;
    },
    myOrders: async function () {
      var d = await db(), u = need(d);
      return d.orders.filter(function (o) { return o.userId === u.id; }).slice(-50).reverse();
    },
    cancelOrder: async function (id) {
      var d = await db(), u = need(d);
      var o = d.orders.filter(function (x) { return x.id === Number(id) && x.userId === u.id; })[0];
      if (!o) throw fail(404, 'not_found', 'الطلب غير موجود');
      if (o.status !== 'new') throw fail(409, 'locked', 'لا يمكن إلغاء الطلب بعد بدء تحضيره، اتصل بالمطعم');
      o.status = 'cancelled'; o.history.push({ status: 'cancelled', at: Date.now() }); write(d);
      return o;
    },

    managerOrders: async function () { var d = await db(); need(d, 'manager'); return d.orders.slice(-300).reverse(); },
    setStatus: async function (id, status) {
      var d = await db(); need(d, 'manager');
      var o = d.orders.filter(function (x) { return x.id === Number(id); })[0];
      if (!o) throw fail(404, 'not_found', 'الطلب غير موجود');
      o.status = status; o.history.push({ status: status, at: Date.now() }); write(d);
      return o;
    },
    saveItem: async function (it) {
      var d = await db(); need(d, 'manager');
      var name = String(it.name || '').trim(), price = Math.round(Number(it.price));
      if (name.length < 2) throw fail(400, 'name', 'اكتب اسم الصنف');
      if (!isFinite(price) || price < 0) throw fail(400, 'price', 'السعر غير صحيح');
      if (!d.menu.categories.some(function (c) { return c.id === it.cat; })) throw fail(400, 'cat', 'اختر القسم');
      var rec = { id: it.id || rid('i'), cat: it.cat, name: name, desc: String(it.desc || '').slice(0, 200), price: price, available: it.available !== false, pop: !!it.pop };
      var i = d.menu.items.map(function (x) { return x.id; }).indexOf(rec.id);
      if (i < 0) d.menu.items.push(rec); else d.menu.items[i] = rec;
      write(d); return rec;
    },
    deleteItem: async function (id) {
      var d = await db(); need(d, 'manager');
      d.menu.items = d.menu.items.filter(function (i) { return i.id !== id; }); write(d);
      return { ok: true };
    },
    saveCategory: async function (c) {
      var d = await db(); need(d, 'manager');
      var name = String(c.name || '').trim();
      if (name.length < 2) throw fail(400, 'name', 'اكتب اسم القسم');
      if (c.id) { d.menu.categories.forEach(function (x) { if (x.id === c.id) x.name = name; }); write(d); return c; }
      var rec = { id: rid('c'), name: name }; d.menu.categories.push(rec); write(d); return rec;
    },
    deleteCategory: async function (id) {
      var d = await db(); need(d, 'manager');
      if (d.menu.items.some(function (i) { return i.cat === id; })) throw fail(409, 'not_empty', 'انقل أصناف هذا القسم أو احذفها أولاً');
      d.menu.categories = d.menu.categories.filter(function (c) { return c.id !== id; }); write(d);
      return { ok: true };
    },
    saveSettings: async function (s) {
      var d = await db(); need(d, 'manager');
      if (s.name !== undefined && String(s.name).trim()) d.settings.restaurantName = String(s.name).trim();
      if (s.phone !== undefined) d.settings.phone = String(s.phone).trim();
      if (s.acceptingOrders !== undefined) d.settings.acceptingOrders = !!s.acceptingOrders;
      write(d); return settingsOut(d);
    },
    changePassword: async function (cur, next) {
      var d = await db(), u = need(d, 'manager');
      if (u.pass !== cur) throw fail(401, 'bad_login', 'كلمة المرور الحالية غير صحيحة');
      if (String(next || '').length < 8) throw fail(400, 'password', 'كلمة المرور الجديدة 8 أحرف على الأقل');
      u.pass = next; write(d); return { ok: true };
    },
    subscribe: function (handler) {
      var t = setInterval(handler, 3000);
      return function () { clearInterval(t); };
    }
  };
})(window.App);
