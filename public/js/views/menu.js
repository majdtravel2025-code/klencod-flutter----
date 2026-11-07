(function (A) {
  var ui = A.ui;
  var st = { cat: null, q: '' };

  A.views.menu = {
    mount: function (root, ctx) {
      var m = ctx.menu;
      var cats = m.categories.filter(function (c) { return m.items.some(function (i) { return i.cat === c.id; }); });
      if (!cats.some(function (c) { return c.id === st.cat; })) st.cat = cats[0] && cats[0].id;
      var sample = m.items.some(function (i) { return i.sample; });

      root.innerHTML =
        '<h2>القائمة</h2>' +
        (sample ? '<div class="note">الأصناف والأسعار المعروضة أمثلة، وسيُدخل المطعم قائمته الفعلية من لوحة المدير.</div>' : '') +
        '<div class="catbar"><input class="search" id="q" type="search" placeholder="ابحث عن صنف" aria-label="بحث في القائمة" value="' + ui.esc(st.q) + '">' +
        '<div class="chips" id="chips" style="margin-top:8px" role="group" aria-label="الأقسام">' +
        cats.map(function (c) { return '<button class="chip" data-cat="' + c.id + '" aria-pressed="false">' + ui.esc(c.name) + '</button>'; }).join('') +
        '</div></div><div class="list" id="mlist"></div>';

      var list = ui.$('#mlist', root);
      function paint() {
        var q = st.q.trim();
        var items = m.items.filter(function (i) {
          return q ? (i.name.indexOf(q) > -1 || (i.desc || '').indexOf(q) > -1) : i.cat === st.cat;
        });
        list.innerHTML = items.length ? items.map(A.shared.card).join('') : '<div class="card empty muted">لا توجد أصناف مطابقة.</div>';
        ui.$$('.chip', root).forEach(function (b) { b.setAttribute('aria-pressed', String(!q && b.getAttribute('data-cat') === st.cat)); });
      }
      paint();

      ui.$$('.chip', root).forEach(function (b) {
        b.addEventListener('click', function () { st.cat = b.getAttribute('data-cat'); st.q = ''; ui.$('#q', root).value = ''; paint(); });
      });
      ui.$('#q', root).addEventListener('input', function (e) { st.q = e.target.value; paint(); });
    }
  };
})(window.App);
