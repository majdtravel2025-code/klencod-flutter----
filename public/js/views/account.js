(function (A) {
  var ui = A.ui;
  A.views.account = {
    mount: function (root, ctx) {
      var u = ctx.user;
      root.innerHTML =
        '<h2>حسابي</h2>' +
        '<div class="card kv">' +
          '<div><span>الاسم</span><b>' + ui.esc(u.name) + '</b></div>' +
          '<div><span>رقم الجوال</span><b dir="ltr" style="text-align:right">' + ui.esc(u.login) + '</b></div>' +
          '<button class="btn ghost block" id="out">' + ui.icon('logout') + ' تسجيل الخروج</button>' +
        '</div>' +
        '<div class="card kv">' +
          '<div><span>المطعم</span><b>' + ui.esc(ctx.menu.settings.name || A.config.name) + '</b></div>' +
          (ctx.menu.settings.phone ? '<div><span>للتواصل</span><b dir="ltr" style="text-align:right">' + ui.esc(ctx.menu.settings.phone) + '</b></div>' : '') +
          '<a class="btn ghost block" href="' + A.config.mapsUrl + '" target="_blank" rel="noopener">' + ui.icon('pin') + ' الموقع على الخريطة</a>' +
        '</div>';
      ui.$('#out', root).addEventListener('click', async function () {
        await A.api.logout();
        ctx.setUser(null);
        ctx.go('home');
      });
    }
  };
})(window.App);
