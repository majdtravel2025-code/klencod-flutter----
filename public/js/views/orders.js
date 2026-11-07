(function (A) {
  var ui = A.ui;

  function card(o) {
    var trail = o.history.map(function (h) { return A.STATUS[h.status] + ' ' + ui.when(h.at).replace('اليوم ', ''); }).join(' ‹ ');
    return '<article class="card order">' +
      '<header><h3>طلب #' + o.id + '</h3><span class="pill ' + o.status + '">' + A.STATUS[o.status] + '</span></header>' +
      '<div class="muted" style="font-size:13px">' + ui.when(o.createdAt) + ' · ' + A.TYPES[o.type] + (o.address ? ' · ' + ui.esc(o.address) : '') + '</div>' +
      '<ul>' + o.items.map(function (l) { return '<li><span>' + l.qty + ' × ' + ui.esc(l.name) + '</span><span>' + ui.fmt(l.qty * l.price) + '</span></li>'; }).join('') + '</ul>' +
      '<div class="total" style="margin:0;font-size:17px"><span>الإجمالي</span>' + ui.money(o.total) + '</div>' +
      '<div class="trail">' + ui.esc(trail) + '</div>' +
      (o.status === 'new' ? '<button class="btn ghost sm" data-cancel="' + o.id + '">إلغاء الطلب</button>' : '') +
      '</article>';
  }

  A.views.orders = {
    mount: function (root, ctx) {
      root.innerHTML = '<h2>طلباتي</h2><div class="list" id="ol"><div class="card empty muted">جارٍ التحميل...</div></div>';
      var list = ui.$('#ol', root), alive = true;

      async function load() {
        try {
          var orders = await A.api.myOrders();
          if (!alive) return;
          list.innerHTML = orders.length ? orders.map(card).join('') :
            '<div class="card empty">' + ui.icon('receipt') + '<p class="muted">لا توجد طلبات بعد.</p><a class="btn" href="#menu">اطلب الآن</a></div>';
        } catch (ex) {
          if (!alive) return;
          if (ex.status === 401) { ctx.user = null; ctx.next = 'orders'; ctx.go('login'); return; }
          list.innerHTML = '<div class="err">' + ui.esc(ex.message) + '</div>';
        }
      }
      load();
      var timer = setInterval(load, 15000);

      list.addEventListener('click', async function (e) {
        var b = e.target.closest('[data-cancel]');
        if (!b) return;
        b.disabled = true;
        try { await A.api.cancelOrder(b.getAttribute('data-cancel')); ui.toast('تم إلغاء الطلب'); }
        catch (ex) { ui.toast(ex.message); }
        load();
      });

      return function () { alive = false; clearInterval(timer); };
    }
  };
})(window.App);
