(function (A) {
  var ui = A.ui;
  A.views.home = {
    mount: function (root, ctx) {
      var m = ctx.menu, s = m.settings;
      var pops = m.items.filter(function (i) { return i.pop && i.available; }).map(function (i) {
        return '<div class="pop"><div class="tile">' + ui.icon('dish') + '</div><h3>' + ui.esc(i.name) + '</h3>' +
          '<div class="row">' + ui.money(i.price) + '<span data-ctl="' + i.id + '">' + A.shared.ctl(i) + '</span></div></div>';
      }).join('');

      root.innerHTML =
        (s.acceptingOrders ? '' : '<div class="closed">المطعم لا يستقبل الطلبات حالياً</div>') +
        '<section class="hero">' +
          '<div class="logo-card"><img src="assets/logo.png" alt="شعار مطاعم مدينتي"></div>' +
          '<h1>من مدينتنا إلى مائدتك</h1>' +
          '<p>اختر وجبتك، وسجّل طلبك، ونحن نجهّزه لك.</p>' +
          A.shared.seg(A.cart.state().type) +
          '<a class="btn" href="#menu">تصفّح القائمة</a>' +
        '</section>' +
        (pops ? '<div class="sec-head"><h2>الأكثر طلباً</h2><a href="#menu">كل الأصناف</a></div><div class="scroller">' + pops + '</div>' : '') +
        '<div class="card kv">' +
          '<div><span>المطعم</span><b>' + ui.esc(s.name || A.config.name) + '</b></div>' +
          (s.phone ? '<div><span>للتواصل</span><b dir="ltr" style="text-align:right">' + ui.esc(s.phone) + '</b></div>' : '') +
          '<a class="btn ghost block" href="' + A.config.mapsUrl + '" target="_blank" rel="noopener">' + ui.icon('pin') + ' الموقع على الخريطة</a>' +
        '</div>';

      A.shared.bindSeg(root);
    }
  };
})(window.App);
