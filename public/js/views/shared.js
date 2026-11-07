// عناصر مشتركة بين الشاشات: بطاقة الصنف وأزرار الكمية.
(function (A) {
  var ui = A.ui;
  A.views = A.views || {};

  function ctl(i) {
    if (!i.available) return '<span class="soldout">غير متوفر</span>';
    var q = A.cart.qty(i.id);
    if (!q) return '<button class="add" data-act="inc" data-id="' + i.id + '" aria-label="أضف ' + ui.esc(i.name) + '">إضافة</button>';
    return '<div class="step"><button data-act="dec" data-id="' + i.id + '" aria-label="إنقاص">' + ui.icon('minus') + '</button>' +
      '<span>' + q + '</span><button data-act="inc" data-id="' + i.id + '" aria-label="زيادة">' + ui.icon('plus') + '</button></div>';
  }

  A.shared = {
    ctl: ctl,
    card: function (i) {
      return '<article class="item' + (i.available ? '' : ' off') + '"><div class="tile">' + ui.icon('dish') + '</div>' +
        '<div class="info"><h3>' + ui.esc(i.name) + '</h3>' + (i.desc ? '<p>' + ui.esc(i.desc) + '</p>' : '') +
        '<div class="row">' + ui.money(i.price) + '<span data-ctl="' + i.id + '">' + ctl(i) + '</span></div></div></article>';
    },
    refresh: function (root, items) {
      var byId = {};
      items.forEach(function (i) { byId[i.id] = i; });
      ui.$$('[data-ctl]', root).forEach(function (el) {
        var i = byId[el.getAttribute('data-ctl')];
        if (i) el.innerHTML = ctl(i);
      });
    },
    seg: function (type) {
      return '<div class="seg" role="group" aria-label="نوع الطلب">' + Object.keys(A.TYPES).map(function (k) {
        return '<button type="button" data-type="' + k + '" aria-pressed="' + (type === k) + '">' + A.TYPES[k] + '</button>';
      }).join('') + '</div>';
    },
    bindSeg: function (root, onChange) {
      ui.$$('.seg button', root).forEach(function (b) {
        b.addEventListener('click', function () {
          A.cart.set({ type: b.getAttribute('data-type') });
          ui.$$('.seg button', root).forEach(function (x) { x.setAttribute('aria-pressed', String(x === b)); });
          if (onChange) onChange();
        });
      });
    }
  };
})(window.App);
