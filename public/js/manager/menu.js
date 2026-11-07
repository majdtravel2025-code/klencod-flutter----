// تبويب القائمة: إضافة وتعديل الأصناف والأقسام والأسعار، وإيقاف صنف مؤقتاً.
(function (A) {
  var ui = A.ui;
  A.mgr = A.mgr || {};

  A.mgr.menu = {
    mount: function (panel) {
      var data = null, edit = null, armed = null, alive = true;

      async function load() {
        data = await A.api.menu();
        if (alive) paint();
      }

      function itemForm(it) {
        var cats = data.categories.map(function (c) {
          return '<option value="' + c.id + '"' + (c.id === it.cat ? ' selected' : '') + '>' + ui.esc(c.name) + '</option>';
        }).join('');
        return '<form class="card form editor" id="ef" novalidate>' +
          '<h3>' + (it.id ? 'تعديل صنف' : 'صنف جديد') + '</h3>' +
          '<div class="field"><label for="e-name">الاسم</label><input id="e-name" value="' + ui.esc(it.name) + '"></div>' +
          '<div class="two"><div class="field"><label for="e-price">السعر (' + A.config.currency + ')</label><input id="e-price" type="number" min="0" step="50" inputmode="numeric" value="' + (it.price || '') + '"></div>' +
          '<div class="field"><label for="e-cat">القسم</label><select id="e-cat">' + cats + '</select></div></div>' +
          '<div class="field"><label for="e-desc">الوصف</label><input id="e-desc" value="' + ui.esc(it.desc) + '"></div>' +
          '<div class="checks"><label><input type="checkbox" id="e-av"' + (it.available !== false ? ' checked' : '') + '> متوفر</label>' +
          '<label><input type="checkbox" id="e-pop"' + (it.pop ? ' checked' : '') + '> يظهر في «الأكثر طلباً»</label></div>' +
          '<div class="err" id="e-err" hidden></div>' +
          '<div class="row-actions"><button class="btn">حفظ</button><button type="button" class="btn ghost" id="e-cancel">إلغاء</button></div></form>';
      }

      function catForm(c) {
        return '<form class="card form editor" id="cf" novalidate><h3>' + (c.id ? 'تعديل القسم' : 'قسم جديد') + '</h3>' +
          '<div class="field"><label for="c-name">اسم القسم</label><input id="c-name" value="' + ui.esc(c.name || '') + '"></div>' +
          '<div class="err" id="c-err" hidden></div>' +
          '<div class="row-actions"><button class="btn">حفظ</button><button type="button" class="btn ghost" id="c-cancel">إلغاء</button></div></form>';
      }

      function del(label, key) {
        return '<button class="btn sm ' + (armed === key ? 'danger' : 'ghost') + '" data-del="' + key + '">' + (armed === key ? 'تأكيد الحذف؟' : label) + '</button>';
      }

      function paint() {
        var html = '<div class="toolbar"><h2>القائمة</h2><div class="row-actions">' +
          '<button class="btn sm" id="add-item">' + ui.icon('plus') + ' صنف جديد</button>' +
          '<button class="btn sm ghost" id="add-cat">قسم جديد</button></div></div>';
        if (edit && edit.type === 'item') html += itemForm(edit.item);
        if (edit && edit.type === 'cat') html += catForm(edit.cat);

        html += '<div class="mlist">';
        data.categories.forEach(function (c) {
          var items = data.items.filter(function (i) { return i.cat === c.id; });
          html += '<div class="mcat"><h3>' + ui.esc(c.name) + '</h3><div class="row-actions">' +
            '<button class="btn sm gold" data-ecat="' + c.id + '">تعديل</button>' +
            (items.length ? '' : del('حذف', 'cat:' + c.id)) + '</div></div>';
          items.forEach(function (i) {
            html += '<div class="mrow' + (i.available ? '' : ' off') + '">' +
              '<label class="switch" title="متوفر"><input type="checkbox" data-av="' + i.id + '"' + (i.available ? ' checked' : '') + ' aria-label="متوفر: ' + ui.esc(i.name) + '"></label>' +
              '<div class="t"><b>' + ui.esc(i.name) + '</b>' + (i.desc ? '<small>' + ui.esc(i.desc) + '</small>' : '') + '</div>' +
              ui.money(i.price) +
              '<button class="btn sm ghost" data-eitem="' + i.id + '" aria-label="تعديل ' + ui.esc(i.name) + '">' + ui.icon('edit') + '</button>' +
              del('حذف', 'item:' + i.id) + '</div>';
          });
          if (!items.length) html += '<div class="muted" style="padding:4px 12px;font-size:13px">لا توجد أصناف في هذا القسم.</div>';
        });
        html += '</div>';
        panel.innerHTML = html;
        bind();
      }

      function bind() {
        var $ = function (s) { return ui.$(s, panel); };
        $('#add-item').addEventListener('click', function () {
          edit = { type: 'item', item: { name: '', price: '', desc: '', cat: data.categories[0] && data.categories[0].id, available: true, pop: false } };
          paint(); window.scrollTo(0, 0);
        });
        $('#add-cat').addEventListener('click', function () { edit = { type: 'cat', cat: {} }; paint(); window.scrollTo(0, 0); });

        var ef = $('#ef');
        if (ef) {
          $('#e-cancel').addEventListener('click', function () { edit = null; paint(); });
          ef.addEventListener('submit', async function (e) {
            e.preventDefault();
            var err = $('#e-err'); err.hidden = true;
            try {
              await A.api.saveItem({
                id: edit.item.id, name: $('#e-name').value, price: $('#e-price').value, cat: $('#e-cat').value,
                desc: $('#e-desc').value, available: $('#e-av').checked, pop: $('#e-pop').checked
              });
              edit = null; ui.toast('تم حفظ الصنف'); load();
            } catch (ex) { err.textContent = ex.message; err.hidden = false; }
          });
        }
        var cf = $('#cf');
        if (cf) {
          $('#c-cancel').addEventListener('click', function () { edit = null; paint(); });
          cf.addEventListener('submit', async function (e) {
            e.preventDefault();
            var err = $('#c-err'); err.hidden = true;
            try {
              await A.api.saveCategory({ id: edit.cat.id, name: $('#c-name').value });
              edit = null; ui.toast('تم حفظ القسم'); load();
            } catch (ex) { err.textContent = ex.message; err.hidden = false; }
          });
        }

        ui.$$('[data-eitem]', panel).forEach(function (b) {
          b.addEventListener('click', function () {
            var it = data.items.filter(function (x) { return x.id === b.getAttribute('data-eitem'); })[0];
            edit = { type: 'item', item: it }; paint(); window.scrollTo(0, 0);
          });
        });
        ui.$$('[data-ecat]', panel).forEach(function (b) {
          b.addEventListener('click', function () {
            var c = data.categories.filter(function (x) { return x.id === b.getAttribute('data-ecat'); })[0];
            edit = { type: 'cat', cat: c }; paint(); window.scrollTo(0, 0);
          });
        });
        ui.$$('[data-av]', panel).forEach(function (cb) {
          cb.addEventListener('change', async function () {
            var it = data.items.filter(function (x) { return x.id === cb.getAttribute('data-av'); })[0];
            try { await A.api.saveItem(Object.assign({}, it, { available: cb.checked })); ui.toast(cb.checked ? 'الصنف متوفر' : 'تم إيقاف الصنف'); }
            catch (ex) { ui.toast(ex.message); }
            load();
          });
        });
        ui.$$('[data-del]', panel).forEach(function (b) {
          b.addEventListener('click', async function () {
            var key = b.getAttribute('data-del');
            if (armed !== key) { armed = key; paint(); setTimeout(function () { if (armed === key) { armed = null; if (alive) paint(); } }, 4000); return; }
            armed = null;
            try {
              var parts = key.split(':');
              if (parts[0] === 'item') await A.api.deleteItem(parts[1]); else await A.api.deleteCategory(parts[1]);
              ui.toast('تم الحذف');
            } catch (ex) { ui.toast(ex.message); }
            load();
          });
        });
      }

      load().catch(function (ex) { panel.innerHTML = '<div class="err">' + ui.esc(ex.message) + '</div>'; });
      return function () { alive = false; };
    }
  };
})(window.App);
