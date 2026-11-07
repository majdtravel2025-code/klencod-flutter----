(function (A) {
  var ui = A.ui;
  var mode = 'login';

  A.views.login = {
    mount: function (root, ctx) {
      var demo = A.api.isDemo();
      root.innerHTML =
        '<div class="auth">' +
          '<div class="logo"><img src="assets/logo.png" alt="شعار مطاعم مدينتي"></div>' +
          '<h2 style="text-align:center">' + (ctx.next === 'cart' ? 'سجّل دخولك لإتمام الطلب' : 'مرحباً بك') + '</h2>' +
          '<div class="tabs" role="group" aria-label="نوع الدخول">' +
            '<button type="button" data-m="login" aria-pressed="false">تسجيل الدخول</button>' +
            '<button type="button" data-m="register" aria-pressed="false">حساب جديد</button>' +
          '</div>' +
          '<form class="card form" id="af" novalidate>' +
            '<div class="field" id="nm-f"><label for="nm">الاسم</label><input id="nm" autocomplete="name"></div>' +
            '<div class="field"><label for="ph">رقم الجوال</label><input id="ph" type="tel" inputmode="tel" autocomplete="tel" dir="ltr" style="text-align:right" placeholder="7xxxxxxxx"></div>' +
            '<div class="field"><label for="pw">كلمة المرور</label><input id="pw" type="password" autocomplete="current-password"></div>' +
            '<div class="err" id="err" hidden></div>' +
            '<button class="btn block" id="go">دخول</button>' +
          '</form>' +
          (demo ? '<div class="note">نسخة تجريبية: الحسابات محفوظة في هذا المتصفح فقط. أنشئ حساباً بأي رقم لتجرّب.</div>' : '') +
        '</div>';

      var form = ui.$('#af', root);
      function paint() {
        ui.$$('.tabs button', root).forEach(function (b) { b.setAttribute('aria-pressed', String(b.getAttribute('data-m') === mode)); });
        ui.$('#nm-f', root).hidden = mode !== 'register';
        ui.$('#go', root).textContent = mode === 'register' ? 'إنشاء الحساب' : 'دخول';
        ui.$('#pw', root).setAttribute('autocomplete', mode === 'register' ? 'new-password' : 'current-password');
        ui.$('#err', root).hidden = true;
      }
      paint();
      ui.$$('.tabs button', root).forEach(function (b) {
        b.addEventListener('click', function () { mode = b.getAttribute('data-m'); paint(); });
      });

      form.addEventListener('submit', async function (e) {
        e.preventDefault();
        var err = ui.$('#err', root), btn = ui.$('#go', root);
        err.hidden = true; btn.disabled = true;
        try {
          var user = mode === 'register'
            ? await A.api.register({ name: ui.$('#nm', root).value, phone: ui.$('#ph', root).value, password: ui.$('#pw', root).value })
            : await A.api.login({ login: ui.$('#ph', root).value, password: ui.$('#pw', root).value });
          if (user.role === 'manager') {
            await A.api.logout();
            throw new Error('هذا حساب المدير. استخدم صفحة لوحة المدير للدخول.');
          }
          ctx.setUser(user);
          var next = ctx.next || 'home';
          ctx.next = null;
          ctx.go(next);
        } catch (ex) {
          err.textContent = ex.message; err.hidden = false; btn.disabled = false;
        }
      });
    }
  };
})(window.App);
