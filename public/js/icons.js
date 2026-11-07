// أيقونات الواجهة كـ SVG sprite واحد يُحقن في الصفحة.
(function (A) {
  var s = function (id, body) { return '<symbol id="i-' + id + '" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round">' + body + '</symbol>'; };
  var sprite =
    '<svg width="0" height="0" style="position:absolute" aria-hidden="true"><defs>' +
    s('home', '<path d="M4 11l8-7 8 7"/><path d="M6 10v10h12V10"/><path d="M10 20v-5h4v5"/>') +
    s('menu', '<path d="M7 3v7a2 2 0 0 0 4 0V3M9 10v11"/><path d="M17 3c-2 2-3 5-3 8h3v10"/>') +
    s('cart', '<path d="M3 4h2l2.5 11h10L20 7H6.5"/><circle cx="9" cy="19.5" r="1.4"/><circle cx="17" cy="19.5" r="1.4"/>') +
    s('receipt', '<path d="M6 3h12v18l-3-2-3 2-3-2-3 2z"/><path d="M9 8h6M9 12h6"/>') +
    s('user', '<circle cx="12" cy="8" r="4"/><path d="M4 21c0-4 4-6 8-6s8 2 8 6"/>') +
    s('plus', '<path d="M12 5v14M5 12h14"/>') +
    s('minus', '<path d="M5 12h14"/>') +
    s('trash', '<path d="M4 7h16M9 7V4h6v3M6 7l1 13h10l1-13"/>') +
    s('pin', '<path d="M12 21s7-6 7-11a7 7 0 0 0-14 0c0 5 7 11 7 11z"/><circle cx="12" cy="10" r="2.5"/>') +
    s('phone', '<path d="M5 4h4l2 5-2.5 1.5a11 11 0 0 0 5 5L15 13l5 2v4a2 2 0 0 1-2 2A15 15 0 0 1 3 6a2 2 0 0 1 2-2z"/>') +
    s('check', '<path d="M5 12l5 5 9-10"/>') +
    s('bell', '<path d="M6 16v-5a6 6 0 0 1 12 0v5l2 2H4z"/><path d="M10 21h4"/>') +
    s('edit', '<path d="M4 20h4L19 9l-4-4L4 16z"/>') +
    s('logout', '<path d="M10 4H5v16h5"/><path d="M15 8l4 4-4 4M19 12H9"/>') +
    s('clock', '<circle cx="12" cy="12" r="9"/><path d="M12 7v5l3 2"/>') +
    s('lock', '<rect x="5" y="11" width="14" height="9" rx="2"/><path d="M8 11V8a4 4 0 0 1 8 0v3"/>') +
    s('dish', '<path d="M3 17h18"/><path d="M5 17a7 7 0 0 0 14 0"/><path d="M7 13a5 5 0 0 1 10 0"/><path d="M10 6c-1-1 1-2 0-3M14 6c-1-1 1-2 0-3"/>') +
    '</defs></svg>';
  document.body.insertAdjacentHTML('afterbegin', sprite);
})(window.App);
