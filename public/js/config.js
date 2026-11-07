// إعدادات الواجهة. mode: 'auto' يجرّب الخادم الحقيقي أولاً ثم ينتقل للنسخة التجريبية إن لم يجده.
// 'live' = الخادم فقط، 'demo' = نسخة تجريبية تعمل داخل المتصفح بدون خادم.
window.App = window.App || {};
App.config = {
  mode: 'auto',
  apiBase: 'api',
  currency: 'ر.ي',
  name: 'مطاعم مدينتي',
  mapsUrl: 'https://maps.app.goo.gl/9BPDW8GanTAxmeVu9',
  tokenKey: App.role === 'manager' ? 'madinati.mtoken' : 'madinati.token'
};
