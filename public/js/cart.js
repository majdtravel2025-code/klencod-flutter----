// سلة الزبون: تُحفظ في المتصفح حتى لو أغلق الصفحة.
(function (A) {
  var KEY = 'madinati.cart.v1';
  var state = { items: {}, type: 'pickup', address: '', notes: '' };
  var subs = [];

  try {
    var saved = JSON.parse(A.storage.get(KEY) || 'null');
    if (saved && saved.items) state = { items: saved.items, type: saved.type || 'pickup', address: saved.address || '', notes: saved.notes || '' };
  } catch (e) {}

  function persist() {
    A.storage.set(KEY, JSON.stringify(state));
    subs.forEach(function (f) { f(); });
  }

  A.cart = {
    state: function () { return state; },
    qty: function (id) { return state.items[id] || 0; },
    add: function (id) { state.items[id] = (state.items[id] || 0) + 1; persist(); },
    dec: function (id) {
      state.items[id] = (state.items[id] || 0) - 1;
      if (state.items[id] <= 0) delete state.items[id];
      persist();
    },
    clear: function () { state.items = {}; state.notes = ''; persist(); },
    set: function (patch) { for (var k in patch) state[k] = patch[k]; persist(); },
    count: function () { var n = 0; for (var k in state.items) n += state.items[k]; return n; },
    ids: function () { return Object.keys(state.items); },
    total: function (items) {
      var t = 0;
      items.forEach(function (i) { t += (state.items[i.id] || 0) * i.price; });
      return t;
    },
    // احذف من السلة أي صنف لم يعد في القائمة
    prune: function (items) {
      var ok = {};
      items.forEach(function (i) { ok[i.id] = true; });
      var changed = false;
      for (var k in state.items) if (!ok[k]) { delete state.items[k]; changed = true; }
      if (changed) persist();
    },
    subscribe: function (fn) { subs.push(fn); }
  };
})(window.App);
