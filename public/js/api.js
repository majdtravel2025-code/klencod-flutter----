// طبقة الاتصال: تتحدث مع الخادم الحقيقي (/api) أو تنتقل للنسخة التجريبية.
(function (A) {
  var C = A.config;
  var mode = null;

  function token() { return A.storage.get(C.tokenKey); }

  async function call(method, path, body) {
    var headers = { 'content-type': 'application/json' };
    var t = token();
    if (t) headers.authorization = 'Bearer ' + t;
    var r;
    try {
      r = await fetch(C.apiBase + path, { method: method, headers: headers, body: body ? JSON.stringify(body) : undefined });
    } catch (e) {
      var ne = new Error('تعذّر الاتصال بالخادم، تحقق من الإنترنت');
      ne.code = 'network';
      throw ne;
    }
    var data = await r.json().catch(function () { return {}; });
    if (!r.ok) {
      if (r.status === 401 && t && path !== '/auth/login') A.storage.del(C.tokenKey);
      var e = new Error(data.message || 'حدث خطأ');
      e.code = data.code; e.status = r.status;
      throw e;
    }
    return data;
  }

  var live = {
    menu: function () { return call('GET', '/menu'); },
    register: async function (b) { var d = await call('POST', '/auth/register', b); A.storage.set(C.tokenKey, d.token); return d.user; },
    login: async function (b) { var d = await call('POST', '/auth/login', b); A.storage.set(C.tokenKey, d.token); return d.user; },
    me: async function () {
      if (!token()) return null;
      try { return (await call('GET', '/me')).user; } catch (e) { if (e.status === 401) return null; throw e; }
    },
    logout: async function () { A.storage.del(C.tokenKey); },
    createOrder: function (b) { return call('POST', '/orders', b); },
    myOrders: async function () { return (await call('GET', '/orders/mine')).orders; },
    cancelOrder: function (id) { return call('POST', '/orders/' + id + '/cancel'); },
    managerOrders: async function () { return (await call('GET', '/manager/orders')).orders; },
    setStatus: function (id, status) { return call('POST', '/manager/orders/' + id + '/status', { status: status }); },
    saveItem: function (it) { return it.id ? call('PUT', '/manager/items/' + it.id, it) : call('POST', '/manager/items', it); },
    deleteItem: function (id) { return call('DELETE', '/manager/items/' + id); },
    saveCategory: function (c) { return c.id ? call('PUT', '/manager/categories/' + c.id, c) : call('POST', '/manager/categories', c); },
    deleteCategory: function (id) { return call('DELETE', '/manager/categories/' + id); },
    saveSettings: function (s) { return call('PUT', '/manager/settings', s); },
    changePassword: function (cur, next) { return call('POST', '/manager/password', { current: cur, next: next }); },
    subscribe: function (handler) {
      var es = null;
      var poll = setInterval(handler, 20000);
      try {
        es = new EventSource(C.apiBase + '/manager/stream?t=' + encodeURIComponent(token()));
        es.addEventListener('order', function () { handler(); });
      } catch (e) {}
      return function () { clearInterval(poll); if (es) es.close(); };
    }
  };

  var api = (A.api = {});
  api.init = async function () {
    if (C.mode === 'demo') { mode = 'demo'; return mode; }
    try {
      var r = await fetch(C.apiBase + '/health', { cache: 'no-store' });
      var ct = r.headers.get('content-type') || '';
      if (r.ok && ct.indexOf('json') > -1) { mode = 'live'; return mode; }
    } catch (e) {}
    mode = C.mode === 'live' ? 'live' : 'demo';
    return mode;
  };
  api.isDemo = function () { return mode === 'demo'; };

  var impl = function () { return mode === 'demo' ? A.demo : live; };
  ['menu', 'register', 'login', 'me', 'logout', 'createOrder', 'myOrders', 'cancelOrder', 'managerOrders',
   'setStatus', 'saveItem', 'deleteItem', 'saveCategory', 'deleteCategory', 'saveSettings', 'changePassword', 'subscribe']
    .forEach(function (m) { api[m] = function () { var i = impl(); return i[m].apply(i, arguments); }; });
})(window.App);
