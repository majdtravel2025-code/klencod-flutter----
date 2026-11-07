(function (A) {
  var ui = A.ui;
  var placed = null; // آخر طلب أُرسل، لعرض شاشة التأكيد

  A.views.cart = {
    mount: function (root, ctx) {
      if (placed) { return showPlaced(root, ctx); }

      var items = ctx.menu.items.filter(function (i) { return A.cart.qty(i.id) > 0; });
      if (!items.length) {
        root.innerHTML = '<h2>السلة</h2><div class="card empty">' + ui.icon('cart') + '<p class="muted">سلتك فارغة. أضف أصنافاً من القائمة لتبدأ.</p><a class="btn" href="#menu">اذهب إلى القائمة</a></div>';
        return;
      }
      var s = A.cart.state(), open = ctx.menu.settings.acceptingOrders;
      var lines = items.map(function (i) {
        return '<div class="line"><div><h3>' + ui.esc(i.name) + '</h3>' + ui.money(i.price * A.cart.qty(i.id)) + '</div><span>' + A.shared.ctl(i) + '</span></div>';
      }).join('');

      root.innerHTML =
        '<h2>السلة</h2>' +
        '<div class="card">' + lines + '<div class="total"><span>الإجمالي</span>' + ui.money(A.cart.total(items)) + '</div></div>' +
        '<form class="card form" id="co" novalidate>' +
          '<h3>تفاصيل الطلب</h3>' +
          '<p class="muted" style="font-size:13.5px">الطلب باسم ' + ui.esc(ctx.user.name) + '، جوال ' + '<span dir="ltr">' + ui.esc(ctx.user.login) + '</span></p>' +
          A.shared.seg(s.type) +
          '<div class="field" id="addr-f" ' + (s.type === 'delivery' ? '' : 'hidden') + '><label for="addr">عنوان التوصيل</label><input id="addr" value="' + ui.esc(s.address) + '" placeholder="الحي، الشارع، أقرب معلم"></div>' +
          '<div class="field"><label for="notes">ملاحظات (اختياري)</label><textarea id="notes" rows="2" placeholder="مثال: بدون بصل">' + ui.esc(s.notes) + '</textarea></div>' +
          '<div class="err" id="err" hidden></div>' +
          (open ? '' : '<div class="err">المطعم لا يستقبل الطلبات حالياً.</div>') +
          '<button class="btn gold block" id="send" ' + (open ? '' : 'disabled') + '>إرسال الطلب</button>' +
        '</form>';

      var addrF = ui.$('#addr-f', root);
      A.shared.bindSeg(root, function () { addrF.hidden = A.cart.state().type !== 'delivery'; });
      ui.$('#addr', root).addEventListener('input', function (e) { A.cart.set({ address: e.target.value }); });
      ui.$('#notes', root).addEventListener('input', function (e) { A.cart.set({ notes: e.target.value }); });

      ui.$('#co', root).addEventListener('submit', async function (e) {
        e.preventDefault();
        var err = ui.$('#err', root), btn = ui.$('#send', root), st = A.cart.state();
        err.hidden = true;
        btn.disabled = true; btn.textContent = 'جارٍ الإرسال...';
        try {
          var order = await A.api.createOrder({
            type: st.type, address: st.address, notes: st.notes,
            items: A.cart.ids().map(function (id) { return { id: id, qty: A.cart.qty(id) }; })
          });
          placed = order;
          A.cart.clear();
          ctx.rerender();
        } catch (ex) {
          if (ex.status === 401) { ctx.user = null; ctx.next = 'cart'; ctx.go('login'); return; }
          err.textContent = ex.message; err.hidden = false;
          btn.disabled = false; btn.textContent = 'إرسال الطلب';
        }
      });
    }
  };

  function showPlaced(root, ctx) {
    var o = placed;
    root.innerHTML = '<div class="card done-box">' + ui.icon('check') +
      '<h2>تم إرسال طلبك</h2><div class="big">#' + o.id + '</div>' +
      '<p class="muted">وصل الطلب إلى المطعم. تابع حالته من صفحة «طلباتي».</p>' +
      '<p>الإجمالي ' + ui.money(o.total) + '</p>' +
      '<button class="btn block" id="go-orders">تابع طلباتي</button>' +
      '<a class="btn ghost block" href="#menu" id="more">اطلب المزيد</a></div>';
    ui.$('#go-orders', root).addEventListener('click', function () { placed = null; ctx.go('orders'); });
    ui.$('#more', root).addEventListener('click', function () { placed = null; });
  }
})(window.App);
