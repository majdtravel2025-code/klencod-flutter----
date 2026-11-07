// تبويب الطلبات: استلام لحظي مع تنبيه صوتي، وتغيير حالة الطلب.
(function (A) {
  var ui = A.ui;
  A.mgr = A.mgr || {};

  var ac = null;
  function enableSound() {
    try { ac = ac || new (window.AudioContext || window.webkitAudioContext)(); ac.resume(); } catch (e) {}
    return !!ac;
  }
  function beep() {
    if (!ac) return;
    try {
      var o = ac.createOscillator(), g = ac.createGain();
      o.frequency.value = 880; g.gain.value = 0.18;
      o.connect(g); g.connect(ac.destination); o.start();
      setTimeout(function () { o.frequency.value = 1175; }, 180);
      setTimeout(function () { o.stop(); }, 460);
    } catch (e) {}
  }

  function actions(o) {
    switch (o.status) {
      case 'new': return [['preparing', 'قبول وبدء التحضير', ''], ['cancelled', 'رفض', 'ghost']];
      case 'preparing': return [['ready', 'الطلب جاهز', ''], ['cancelled', 'إلغاء', 'ghost']];
      case 'ready': return o.type === 'delivery' ? [['ontheway', 'خرج للتوصيل', '']] : [['done', 'تم التسليم', '']];
      case 'ontheway': return [['done', 'تم التسليم', '']];
      default: return [];
    }
  }

  function card(o, fresh) {
    var acts = actions(o).map(function (a) {
      return '<button class="btn sm ' + a[2] + '" data-id="' + o.id + '" data-st="' + a[0] + '">' + a[1] + '</button>';
    }).join('');
    return '<article class="ord' + (fresh ? ' fresh' : '') + '">' +
      '<header><b>#' + o.id + '</b><span class="pill ' + o.status + '">' + A.STATUS[o.status] + '</span></header>' +
      '<div class="muted" style="font-size:13px">' + ui.when(o.createdAt) + ' · <b>' + A.TYPES[o.type] + '</b></div>' +
      '<div class="who">' + ui.esc(o.customer.name) + ' · <a href="tel:' + ui.esc(o.customer.phone) + '">' + ui.esc(o.customer.phone) + '</a></div>' +
      (o.address ? '<div class="who">' + ui.icon('pin') + ' ' + ui.esc(o.address) + '</div>' : '') +
      '<ul>' + o.items.map(function (l) { return '<li><span>' + l.qty + ' × ' + ui.esc(l.name) + '</span><span>' + ui.fmt(l.qty * l.price) + '</span></li>'; }).join('') + '</ul>' +
      (o.notes ? '<div class="note">ملاحظة: ' + ui.esc(o.notes) + '</div>' : '') +
      '<div class="total" style="margin:0;font-size:17px;padding-top:6px"><span>الإجمالي</span>' + ui.money(o.total) + '</div>' +
      (acts ? '<div class="acts">' + acts + '</div>' : '') +
      '</article>';
  }

  A.mgr.orders = {
    mount: function (panel, ctx) {
      var orders = [], filter = 'active', known = null, freshIds = {}, alive = true, soundOn = false;

      panel.innerHTML =
        '<div class="stats" id="stats"></div>' +
        '<div class="toolbar"><div class="chips" role="group" aria-label="تصفية">' +
          '<button class="chip" data-f="active" aria-pressed="true">النشطة</button>' +
          '<button class="chip" data-f="all" aria-pressed="false">كل الطلبات</button></div>' +
          '<button class="btn sm ghost" id="snd">' + ui.icon('bell') + ' تفعيل التنبيه الصوتي</button></div>' +
        '<div class="orders" id="grid"></div>';

      var grid = ui.$('#grid', panel), stats = ui.$('#stats', panel);

      function paint() {
        var n = { 'new': 0, preparing: 0, ready: 0, today: 0, sum: 0 };
        var todayStr = new Date().toDateString();
        orders.forEach(function (o) {
          if (o.status === 'new') n['new']++;
          if (o.status === 'preparing') n.preparing++;
          if (o.status === 'ready' || o.status === 'ontheway') n.ready++;
          if (new Date(o.createdAt).toDateString() === todayStr && o.status !== 'cancelled') { n.today++; n.sum += o.total; }
        });
        stats.innerHTML =
          '<div class="stat' + (n['new'] ? ' hot' : '') + '"><span>جديدة</span><b>' + n['new'] + '</b></div>' +
          '<div class="stat"><span>قيد التحضير</span><b>' + n.preparing + '</b></div>' +
          '<div class="stat"><span>جاهزة</span><b>' + n.ready + '</b></div>' +
          '<div class="stat"><span>طلبات اليوم</span><b>' + n.today + '</b></div>' +
          '<div class="stat"><span>مبيعات اليوم (' + A.config.currency + ')</span><b>' + ui.fmt(n.sum) + '</b></div>';
        var list = orders.filter(function (o) { return filter === 'all' || ['new', 'preparing', 'ready', 'ontheway'].indexOf(o.status) > -1; });
        // الأقدم أولاً في النشطة ليُخدم بالترتيب
        if (filter === 'active') list = list.slice().reverse();
        grid.innerHTML = list.length ? list.map(function (o) { return card(o, freshIds[o.id]); }).join('') :
          '<div class="card muted" style="grid-column:1/-1;text-align:center">لا توجد طلبات ' + (filter === 'active' ? 'نشطة' : '') + ' الآن.</div>';
        ctx.setBadge(n['new']);
      }

      async function load() {
        try {
          var list = await A.api.managerOrders();
          if (!alive) return;
          var ids = {};
          list.forEach(function (o) { ids[o.id] = true; });
          if (known) {
            var added = list.filter(function (o) { return !known[o.id]; });
            if (added.length) {
              added.forEach(function (o) { freshIds[o.id] = true; });
              beep();
              ui.toast('وصل طلب جديد #' + added[0].id);
            }
          }
          known = ids;
          orders = list;
          paint();
        } catch (ex) {
          if (ex.status === 401) { ctx.logout(); }
        }
      }

      ui.$$('.chip', panel).forEach(function (b) {
        b.addEventListener('click', function () {
          filter = b.getAttribute('data-f');
          ui.$$('.chip', panel).forEach(function (x) { x.setAttribute('aria-pressed', String(x === b)); });
          paint();
        });
      });
      ui.$('#snd', panel).addEventListener('click', function (e) {
        soundOn = enableSound();
        e.currentTarget.innerHTML = ui.icon('bell') + (soundOn ? ' التنبيه الصوتي مفعّل' : ' المتصفح لا يدعم الصوت');
        if (soundOn) beep();
      });
      grid.addEventListener('click', async function (e) {
        var b = e.target.closest('[data-st]');
        if (!b) return;
        b.disabled = true;
        try {
          await A.api.setStatus(b.getAttribute('data-id'), b.getAttribute('data-st'));
          delete freshIds[b.getAttribute('data-id')];
        } catch (ex) { ui.toast(ex.message); }
        load();
      });

      load();
      var unsub = A.api.subscribe(load);
      return function () { alive = false; unsub(); };
    }
  };
})(window.App);
