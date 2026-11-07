// تشغيل لوحة المدير: تسجيل الدخول ثم التبويبات.
(function (A) {
  var ui = A.ui;
  var root = document.getElementById('root');
  var actions = document.getElementById('top-actions');
  var TABS = [['orders', 'الطلبات'], ['menu', 'القائمة'], ['settings', 'الإعدادات']];
  var tab = 'orders', cleanup = null, badge = 0;
  var baseTitle = 'لوحة مدينتي';

  function showLogin(demo) {
    actions.innerHTML = '';
    root.innerHTML =
      '<div class="login-box">' +
        '<div class="logo"><img src="assets/logo.png" alt="شعار مطاعم مدينتي"></div>' +
        '<h2 style="text-align:center">دخول المدير</h2>' +
        '<form class="card form" id="lf" novalidate>' +
          '<div class="field"><label for="u">اسم المستخدم</label><input id="u" autocomplete="username" dir="ltr" style="text-align:right"></div>' +
          '<div class="field"><label for="p">كلمة المرور</label><input id="p" type="password" autocomplete="current-password"></div>' +
          '<div class="err" id="err" hidden></div>' +
          '<button class="btn block" id="go">' + ui.icon('lock') + ' دخول</button>' +
        '</form>' +
        (demo ? '<div class="note">نسخة تجريبية: اسم المستخدم <b dir="ltr">manager</b> وكلمة المرور <b dir="ltr">manager123</b>. تظهر هنا الطلبات التي تُرسل من تطبيق الزبون التجريبي في نفس المتصفح.</div>' : '') +
      '</div>';
    ui.$('#lf', root).addEventListener('submit', async function (e) {
      e.preventDefault();
      var err = ui.$('#err', root), btn = ui.$('#go', root);
      err.hidden = true; btn.disabled = true;
      try {
        var u = await A.api.login({ login: ui.$('#u', root).value, password: ui.$('#p', root).value });
        if (u.role !== 'manager') { await A.api.logout(); throw new Error('هذا الحساب ليس حساب مدير.'); }
        showApp(u);
      } catch (ex) { err.textContent = ex.message; err.hidden = false; btn.disabled = false; }
    });
  }

  function logout() {
    if (cleanup) { cleanup(); cleanup = null; }
    document.title = baseTitle;
    A.api.logout().then(function () { showLogin(A.api.isDemo()); });
  }

  function setBadge(n) {
    badge = n;
    var el = ui.$('#tab-orders em');
    if (el) { el.textContent = n; el.hidden = !n; }
    document.title = (n ? '(' + n + ') ' : '') + baseTitle;
  }

  function showApp(user) {
    actions.innerHTML = '<button class="btn sm" id="lo">' + ui.icon('logout') + ' خروج</button>';
    ui.$('#lo').addEventListener('click', logout);
    root.innerHTML =
      '<div class="mtabs" role="group" aria-label="الأقسام">' +
        TABS.map(function (t) {
          return '<button data-tab="' + t[0] + '" id="tab-' + t[0] + '" aria-pressed="' + (tab === t[0]) + '">' + t[1] + (t[0] === 'orders' ? '<em hidden>0</em>' : '') + '</button>';
        }).join('') +
      '</div><section id="panel" style="display:flex;flex-direction:column;gap:16px"></section>';

    var ctx = { setBadge: setBadge, logout: logout };
    function open(name) {
      tab = name;
      if (cleanup) { cleanup(); cleanup = null; }
      ui.$$('.mtabs button', root).forEach(function (b) { b.setAttribute('aria-pressed', String(b.getAttribute('data-tab') === name)); });
      cleanup = A.mgr[name].mount(ui.$('#panel', root), ctx) || null;
    }
    ui.$$('.mtabs button', root).forEach(function (b) {
      b.addEventListener('click', function () { open(b.getAttribute('data-tab')); });
    });
    open(tab);
  }

  (async function boot() {
    await A.api.init();
    var u = null;
    try { u = await A.api.me(); } catch (e) {}
    if (u && u.role === 'manager') showApp(u); else showLogin(A.api.isDemo());
  })();
})(window.App);
