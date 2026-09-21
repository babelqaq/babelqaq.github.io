/* ============================================================
   全站猫主题 · 动态注入脚本
   仅在 NexT 主题页生效（互动主页由 ws-home.js 单独处理）
   功能：
     1) 页脚注入趴睡猫 + 守护文案
     2) 文章页各 h2 小节前插入爪印分隔线
   ============================================================ */
(function () {
  'use strict';
  function $(s, r) { return (r || document).querySelector(s); }
  function $all(s, r) { return [].slice.call((r || document).querySelectorAll(s)); }

  /* 1) 页脚感谢语（每页都加，含互动主页） */
  var footerInner = $('.footer-inner');
  if (footerInner && !$('.ws-cat-footer')) {
    var f = document.createElement('div');
    f.className = 'ws-cat-footer';
    f.innerHTML = '<span>谢谢你来我的博客喵~ <img class="ws-cat-paw-inline" src="/images/ws-cat/cat-paw.svg" alt="猫爪印"></span>';
    footerInner.insertBefore(f, footerInner.firstChild);
  }

  /* 2) 文章页：每个 h2 小节前插一条爪印分隔线 */
  var body = $('.post-body');
  if (body) {
    $all('h2', body).forEach(function (h, i) {
      if (i === 0) return;            /* 第一个小节前不需要 */
      var d = document.createElement('div');
      d.className = 'ws-paw-divider';
      d.innerHTML = '<i></i>';
      h.parentNode.insertBefore(d, h);
    });
  }
})();
