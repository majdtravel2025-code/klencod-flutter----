// تشغيل تطبيق الزبون: التوجيه، شريط التنقل، وحماية السلة بتسجيل الدخول.
(function (A) {
  var ui = A.ui;
  var ROUTES = ['home', 'menu', 'cart', 'login', 'orders', 'account'];
  var NAV = [['home', 'الرئيسية', 'home'], ['menu', 'القائمة', 'menu'], ['cart', 'السلة', 'cart'], ['orders', 'طلباتي', 'receipt'], ['account', 'حسابي', 'user']];

  var view = document.getElementById('view');
  var ctx = {
    menu: null, user: null, next: null,
    go: function (r) { if (location.hash === '#' + r) render(); else location.hash = '#' + r; },
    setUser: function (u) { ctx.user = u; },
    rerender: function () { render(); }
  };
  var cleanup = null, current = null, seq = 0;

  function route() {
    var h = location.hash.replace('#', '');
    return ROUTES.indexOf(h) > -1 ? h : 'home';
  }

  async function render() {
    var my = ++seq;
    var r = route();
    // السلة وطلباتي تتطلبان تسجيل الدخول
    if ((r === 'cart' || r === 'orders') && !ctx.user) {
      ctx.next = r;
      if (location.hash !== '#login') { location.hash = '#login'; return; }
      r = 'login';
    }
    if (r === 'login' && ctx.user) { r = 'account'; }
    if (r === 'home' || r === 'menu' || r === 'cart') {
      try { ctx.menu = await A.api.menu(); A.cart.prune(ctx.menu.items); } catch (e) { if (!ctx.menu) return fatal(e); }
      if (my !== seq) return;
    }
    if (cleanup) { cleanup(); cleanup = null; }
    current = r;
    cleanup = A.views[r].mount(view, ctx) || null;
    chrome();
    window.scrollTo(0, 0);
  }

  function chrome() {
    var n = A.cart.count();
    document.getElementById('nav').innerHTML = NAV.map(function (x) {
      var active = current === x[0] || (current === 'login' && x[0] === 'account');
      return '<a href="#' + x[0] + '"' + (active ? ' aria-current="page"' : '') + '>' + ui.icon(x[2]) + '<span>' + x[1] + '</span>' +
        (x[0] === 'cart' && n ? '<em class="badge">' + n + '</em>' : '') + '</a>';
    }).join('');

    var bar = document.getElementById('cartbar');
    if (n && (current === 'home' || current === 'menu') && ctx.menu) {
      bar.hidden = false;
      bar.innerHTML = '<a href="#cart"><span>' + ui.icon('cart') + ' عرض السلة (' + n + ')</span>' +
        '<span>' + ui.fmt(A.cart.total(ctx.menu.items)) + ' ' + A.config.currency + '</span></a>';
    } else {
      bar.hidden = true;
    }
  }

  function fatal(e) {
    view.innerHTML = '<div class="card empty"><p class="muted">' + ui.esc(e.message || 'تعذّر تحميل القائمة') + '</p><button class="btn" onclick="location.reload()">إعادة المحاولة</button></div>';
  }

  // أزرار الكمية (إضافة/إنقاص) في كل الشاشات
  document.addEventListener('click', function (e) {
    var b = e.target.closest('[data-act]');
    if (!b) return;
    var id = b.getAttribute('data-id'), act = b.getAttribute('data-act');
    if (act === 'inc') A.cart.add(id); else if (act === 'dec') A.cart.dec(id);
    if (current === 'cart') render();
    else if (ctx.menu) A.shared.refresh(view, ctx.menu.items);
  });
  A.cart.subscribe(chrome);
  window.addEventListener('hashchange', render);

  (async function boot() {
    await A.api.init();
    if (A.api.isDemo()) document.getElementById('demo-note').hidden = false;
    try { ctx.user = await A.api.me(); } catch (e) {}
    if (ctx.user && ctx.user.role === 'manager') { await A.api.logout(); ctx.user = null; }
    render();
    if ('serviceWorker' in navigator && !A.api.isDemo()) navigator.serviceWorker.register('sw.js').catch(function () {});
  })();
})(window.App);
