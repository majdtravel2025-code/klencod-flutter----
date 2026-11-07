// أدوات مشتركة: تخزين آمن، تنسيق، تنبيهات.
(function (A) {
  var mem = {};
  A.storage = {
    get: function (k) {
      try { var v = localStorage.getItem(k); if (v !== null) return v; } catch (e) {}
      return mem[k] === undefined ? null : mem[k];
    },
    set: function (k, v) { mem[k] = v; try { localStorage.setItem(k, v); } catch (e) {} },
    del: function (k) { delete mem[k]; try { localStorage.removeItem(k); } catch (e) {} }
  };

  A.TYPES = { dine: 'داخل المطعم', pickup: 'استلام', delivery: 'توصيل' };
  A.STATUS = { 'new': 'جديد', preparing: 'قيد التحضير', ready: 'جاهز', ontheway: 'في الطريق', done: 'مكتمل', cancelled: 'ملغي' };

  var ui = (A.ui = {});
  ui.fmt = function (n) { return Number(n || 0).toLocaleString('en-US'); };
  ui.esc = function (s) {
    return String(s == null ? '' : s).replace(/[&<>"']/g, function (c) {
      return { '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' }[c];
    });
  };
  ui.icon = function (name) { return '<svg class="ic" aria-hidden="true"><use href="#i-' + name + '"/></svg>'; };
  ui.money = function (n) { return '<span class="price">' + ui.fmt(n) + '<small>' + A.config.currency + '</small></span>'; };
  ui.when = function (ts) {
    var d = new Date(ts);
    var t = d.toLocaleTimeString('en-GB', { hour: '2-digit', minute: '2-digit' });
    return new Date().toDateString() === d.toDateString() ? 'اليوم ' + t : d.toLocaleDateString('en-GB') + ' ' + t;
  };
  ui.$ = function (sel, root) { return (root || document).querySelector(sel); };
  ui.$$ = function (sel, root) { return Array.prototype.slice.call((root || document).querySelectorAll(sel)); };

  var toastTimer;
  ui.toast = function (msg) {
    var el = document.getElementById('toast');
    if (!el) return;
    el.textContent = msg;
    el.hidden = false;
    clearTimeout(toastTimer);
    toastTimer = setTimeout(function () { el.hidden = true; }, 2400);
  };

  // نسخ نص مع بديل عند رفض الحافظة
  ui.copy = function (text, fallbackEl) {
    var done = function () { ui.toast('تم النسخ'); };
    var fb = function () { if (fallbackEl) { fallbackEl.focus(); fallbackEl.select(); } ui.toast('حدّد النص وانسخه'); };
    try { navigator.clipboard.writeText(text).then(done, fb); } catch (e) { fb(); }
  };
})(window.App);
