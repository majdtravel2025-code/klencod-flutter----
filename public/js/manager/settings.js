// تبويب الإعدادات: بيانات المطعم، فتح/إغلاق استقبال الطلبات، وتغيير كلمة مرور المدير.
(function (A) {
  var ui = A.ui;
  A.mgr = A.mgr || {};

  A.mgr.settings = {
    mount: function (panel) {
      var alive = true;
      A.api.menu().then(function (m) {
        if (!alive) return;
        var s = m.settings;
        panel.innerHTML =
          '<h2>الإعدادات</h2>' +
          '<form class="card form" id="sf" novalidate>' +
            '<div class="field"><label for="s-name">اسم المطعم</label><input id="s-name" value="' + ui.esc(s.name) + '"></div>' +
            '<div class="field"><label for="s-phone">رقم التواصل (يظهر للزبائن)</label><input id="s-phone" dir="ltr" style="text-align:right" value="' + ui.esc(s.phone) + '"></div>' +
            '<label class="row-actions" style="align-items:center;gap:12px"><span class="switch"><input type="checkbox" id="s-open"' + (s.acceptingOrders ? ' checked' : '') + '></span><b>استقبال الطلبات مفتوح</b></label>' +
            '<div class="muted" style="font-size:13px">عند الإغلاق يرى الزبون رسالة أن المطعم لا يستقبل الطلبات ولا يستطيع الإرسال.</div>' +
            '<div class="err" id="s-err" hidden></div>' +
            '<button class="btn">حفظ الإعدادات</button>' +
          '</form>' +
          '<form class="card form" id="pf" novalidate>' +
            '<h3>تغيير كلمة مرور المدير</h3>' +
            '<div class="field"><label for="p-cur">كلمة المرور الحالية</label><input id="p-cur" type="password" autocomplete="current-password"></div>' +
            '<div class="field"><label for="p-new">كلمة المرور الجديدة (8 أحرف على الأقل)</label><input id="p-new" type="password" autocomplete="new-password"></div>' +
            '<div class="err" id="p-err" hidden></div><div class="okmsg" id="p-ok" hidden>تم تغيير كلمة المرور.</div>' +
            '<button class="btn">تغيير كلمة المرور</button>' +
          '</form>' +
          '<a class="btn ghost" href="index.html" target="_blank" rel="noopener">افتح تطبيق الزبون</a>';

        ui.$('#sf', panel).addEventListener('submit', async function (e) {
          e.preventDefault();
          var err = ui.$('#s-err', panel); err.hidden = true;
          try {
            await A.api.saveSettings({ name: ui.$('#s-name', panel).value, phone: ui.$('#s-phone', panel).value, acceptingOrders: ui.$('#s-open', panel).checked });
            ui.toast('تم حفظ الإعدادات');
          } catch (ex) { err.textContent = ex.message; err.hidden = false; }
        });
        ui.$('#pf', panel).addEventListener('submit', async function (e) {
          e.preventDefault();
          var err = ui.$('#p-err', panel), ok = ui.$('#p-ok', panel); err.hidden = true; ok.hidden = true;
          try {
            await A.api.changePassword(ui.$('#p-cur', panel).value, ui.$('#p-new', panel).value);
            ok.hidden = false; ui.$('#p-cur', panel).value = ''; ui.$('#p-new', panel).value = '';
          } catch (ex) { err.textContent = ex.message; err.hidden = false; }
        });
      }).catch(function (ex) { panel.innerHTML = '<div class="err">' + ui.esc(ex.message) + '</div>'; });
      return function () { alive = false; };
    }
  };
})(window.App);
