/* ===========================================================
   兀孀的个人博客 · 独立搜索页 /search/
   1) 全站：把页头「搜索」按钮重定向到 /search/（替换原弹窗）
   2) 仅 /search/：用 search.xml 自建客户端检索，粉色主题
   不修改主题 JS；触发逻辑通过捕获阶段拦截主题原弹窗
   =========================================================== */
(function () {
  'use strict';

  var PAGE = '/search/';

  /* ---------- 1. 全站：重定向搜索按钮 ---------- */
  function redirect(e) {
    if (location.pathname.indexOf(PAGE) === 0) return; // 已在搜索页，不重复跳
    e.preventDefault();
    e.stopImmediatePropagation(); // 捕获阶段阻断主题原弹窗
    window.location.href = PAGE;
  }
  document.querySelectorAll('.popup-trigger').forEach(function (el) {
    el.addEventListener('click', redirect, true);
  });

  /* ---------- 2. 仅搜索页：构建 UI + 检索 ---------- */
  var root = document.getElementById('ws-search-page');
  if (!root) return;

  root.innerHTML =
    '<div class="ws-sp-hero">' +
      '<h1 class="ws-sp-title"><svg class="ws-sp-paw" viewBox="0 0 512 512" width="32" height="32" aria-hidden="true">' +
        '<ellipse cx="256" cy="332" rx="124" ry="99"/>' +
        '<ellipse cx="142" cy="208" rx="43" ry="57"/>' +
        '<ellipse cx="226" cy="152" rx="43" ry="57"/>' +
        '<ellipse cx="314" cy="152" rx="43" ry="57"/>' +
        '<ellipse cx="398" cy="208" rx="43" ry="57"/>' +
      '</svg>搜索</h1>' +
      '<p class="ws-sp-sub">在全站文章里找点什么吧～</p>' +
      '<form class="ws-sp-form" id="ws-sp-form">' +
        '<input type="search" id="ws-sp-input" class="ws-sp-input" placeholder="输入关键词，回车搜索…" autocomplete="off" aria-label="搜索关键词">' +
        '<button type="submit" class="ws-sp-btn">搜索</button>' +
      '</form>' +
      '<div class="ws-sp-count" id="ws-sp-count"></div>' +
    '</div>' +
    '<ul class="ws-sp-results" id="ws-sp-results"></ul>' +
    '<div class="ws-sp-hint" id="ws-sp-hint">输入关键词开始搜索喵～</div>' +
    '<div class="ws-sp-empty" id="ws-sp-empty" hidden>' +
      '<div class="ws-sp-cat">🐱</div>' +
      '<p>什么都没找到喵~ 换个词试试？</p>' +
    '</div>';

  var form = document.getElementById('ws-sp-form');
  var input = document.getElementById('ws-sp-input');
  var countEl = document.getElementById('ws-sp-count');
  var resultsEl = document.getElementById('ws-sp-results');
  var hintEl = document.getElementById('ws-sp-hint');
  var emptyEl = document.getElementById('ws-sp-empty');

  var INDEX = null; // 加载后的文章数组

  function escapeHtml(s) {
    return s.replace(/[&<>"']/g, function (c) {
      return { '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' }[c];
    });
  }
  function escapeReg(s) {
    return s.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
  }
  function snippet(text, q) {
    var i = text.toLowerCase().indexOf(q.toLowerCase());
    if (i < 0) return text.slice(0, 120);
    var start = Math.max(0, i - 50);
    var end = Math.min(text.length, i + q.length + 70);
    var pre = start > 0 ? '…' : '';
    var post = end < text.length ? '…' : '';
    return pre + text.slice(start, end) + post;
  }
  function highlight(text, q) {
    var safe = escapeHtml(text);
    if (!q) return safe;
    var re = new RegExp('(' + escapeReg(escapeHtml(q)) + ')', 'ig');
    return safe.replace(re, '<mark class="ws-sp-kw">$1</mark>');
  }

  function render(q) {
    if (!INDEX) return; // 索引未就绪
    q = (q || '').trim();
    if (!q) {
      resultsEl.innerHTML = '';
      countEl.textContent = '';
      hintEl.hidden = false;
      emptyEl.hidden = true;
      return;
    }
    hintEl.hidden = true;
    var ql = q.toLowerCase();
    var matches = [];
    for (var i = 0; i < INDEX.length; i++) {
      var e = INDEX[i];
      var inTitle = e.title.toLowerCase().indexOf(ql) >= 0;
      var inText = e.text.toLowerCase().indexOf(ql) >= 0;
      if (inTitle || inText) matches.push({ e: e, score: inTitle ? 0 : 1 });
    }
    matches.sort(function (a, b) { return a.score - b.score; });
    var top = matches.slice(0, 30);

    if (top.length === 0) {
      resultsEl.innerHTML = '';
      countEl.textContent = '';
      emptyEl.hidden = false;
      return;
    }
    emptyEl.hidden = true;
    countEl.textContent = '找到 ' + matches.length + ' 个结果' +
      (matches.length > 30 ? '（仅显示前 30 个）' : '');
    resultsEl.innerHTML = top.map(function (m) {
      var e = m.e;
      var snip = snippet(e.text, q);
      var cats = (e.cats || []).map(function (c) {
        return '<span class="ws-sp-cat-pill">' + escapeHtml(c) + '</span>';
      }).join('');
      return '<li class="ws-sp-item"><a class="ws-sp-link" href="' + e.url + '">' +
        '<div class="ws-sp-item-head"><span class="ws-sp-item-title">' + highlight(e.title, q) + '</span>' + cats + '</div>' +
        '<p class="ws-sp-item-snip">' + highlight(snip, q) + '</p>' +
        '</a></li>';
    }).join('');
  }

  var timer;
  function onInput() {
    clearTimeout(timer);
    var v = input.value;
    timer = setTimeout(function () { render(v); }, 160);
  }

  form.addEventListener('submit', function (e) { e.preventDefault(); render(input.value); });
  input.addEventListener('input', onInput);

  function buildIndex(xmlText) {
    var doc = new DOMParser().parseFromString(xmlText, 'text/xml');
    var entries = doc.getElementsByTagName('entry');
    var arr = [];
    for (var i = 0; i < entries.length; i++) {
      var en = entries[i];
      var title = ((en.getElementsByTagName('title')[0] || {}).textContent) || '';
      var url = ((en.getElementsByTagName('url')[0] || {}).textContent) || '';
      var text = '';
      var contentEl = en.getElementsByTagName('content')[0];
      if (contentEl) {
        var tmp = document.createElement('div');
        tmp.innerHTML = contentEl.textContent; // CDATA 内是 HTML，取纯文本
        text = (tmp.textContent || '').replace(/\s+/g, ' ').trim();
      }
      var cats = [];
      var catNodes = en.getElementsByTagName('category');
      for (var j = 0; j < catNodes.length; j++) cats.push(catNodes[j].textContent);
      arr.push({ title: title, url: url, text: text, cats: cats });
    }
    return arr;
  }

  fetch('/search.xml')
    .then(function (r) { if (!r.ok) throw new Error('load fail'); return r.text(); })
    .then(function (txt) {
      INDEX = buildIndex(txt);
      var q = new URLSearchParams(location.search).get('q'); // 支持 ?q= 预搜索
      if (q) { input.value = q; render(q); }
    })
    .catch(function () {
      hintEl.hidden = true;
      emptyEl.hidden = false;
      emptyEl.querySelector('p').textContent = '搜索索引加载失败喵~ 请刷新重试';
    });

  input.focus();
})();
