/* =========================================================
 * 兀孀的个人博客 · 互动主页脚本  ws-home.js
 * 只在主页（存在 #ws-home）执行，其它页面直接退出。
 * 模块：打字机 / 站点统计 / 分类入口 / 随机传送门 / 今日塔罗
 *      / 创作月历（年份 / 月份可切换）/ 许愿池（localStorage）/ 最新文章
 * 数据来源：/home-data.json（由 scripts/ws-home-data.js 构建时生成）
 * ========================================================= */
(function () {
  'use strict';

  var root = document.getElementById('ws-home');
  if (!root) return;

  /* 给外层 post-block 打标记：CSS 里的 :has() 是兜底，这个 class 才是主力，
     避免个别浏览器不支持 :has() 时露出 NexT 默认的页面标题与卡片外壳 */
  (function markShell() {
    var el = root.parentNode;
    while (el && el !== document.body) {
      if (el.classList && el.classList.contains('post-block')) {
        el.classList.add('ws-home-block');
        break;
      }
      el = el.parentNode;
    }
    document.body.classList.add('ws-is-home');
  })();

  var $ = function (id) { return document.getElementById(id); };
  var reduceMotion = window.matchMedia &&
    window.matchMedia('(prefers-reduced-motion: reduce)').matches;

  function esc(s) {
    return String(s).replace(/[&<>"']/g, function (c) {
      return { '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' }[c];
    });
  }

  /* =======================================================
   * 一、打字机副标题
   * ======================================================= */
  (function typing() {
    var el = $('ws-typing');
    if (!el) return;
    var lines = [
      '关于一些无聊小说以及物理，还有乱七八糟',
      '一生写几百万字，不过是为了说好两三句话',
      '二十一世纪对我来说，是爱，死亡，和机器人'
    ];
    if (reduceMotion) { el.textContent = lines[0]; return; }

    var li = 0, ci = 0, deleting = false;
    function tick() {
      var full = lines[li];
      if (!deleting) {
        ci++;
        el.textContent = full.slice(0, ci);
        if (ci >= full.length) { deleting = true; return setTimeout(tick, 2200); }
        return setTimeout(tick, 110);
      }
      ci--;
      el.textContent = full.slice(0, ci);
      if (ci <= 0) { deleting = false; li = (li + 1) % lines.length; return setTimeout(tick, 420); }
      setTimeout(tick, 42);
    }
    setTimeout(tick, 600);
  })();

  /* =======================================================
   * 二、今日塔罗（大阿卡纳 22 + 小阿卡纳 56，正/逆位）
   *     数据来自 window.WS_TAROT（scripts 加载 ws-tarot-data.js）
   *     首抽按日期取（当天固定），可"再抽一张"随机抽
   * ======================================================= */
  (function tarot() {
    var card = $('ws-tarot-card');
    var textEl = $('ws-tarot-text');
    var nameEl = $('ws-tarot-name');
    var posEl = $('ws-tarot-pos');
    var redraw = $('ws-tarot-redraw');
    if (!card || !textEl || !nameEl || !posEl || !window.WS_TAROT) return;

    var DECK = window.WS_TAROT.deck;

    function hashDate() {
      var t = new Date();
      var key = t.getFullYear() + '-' + (t.getMonth() + 1) + '-' + t.getDate();
      var h = 0;
      for (var i = 0; i < key.length; i++) h = (h * 31 + key.charCodeAt(i)) % 100000;
      return h;
    }
    function dailyPick() {
      var h = hashDate();
      var idx = h % DECK.length;
      var reversed = (((h / DECK.length) | 0) % 2) === 1;
      return { c: DECK[idx], reversed: reversed };
    }
    function randomPick() {
      var idx = (Math.random() * DECK.length) | 0;
      return { c: DECK[idx], reversed: Math.random() < 0.5 };
    }

    var drawn = false;
    function reveal(pick) {
      var c = pick.c, rev = pick.reversed;
      nameEl.textContent = c.grp + ' · ' + c.name + (c.en ? '（' + c.en + '）' : '');
      posEl.textContent = rev ? '逆位' : '正位';
      posEl.className = 'ws-tarot-pos ' + (rev ? 'rev' : 'up');
      textEl.textContent = rev ? c.reversed : c.upright;
      card.classList.add('ws-tarot-done');
      if (redraw) redraw.hidden = false;
    }
    function flipThen(fn) {
      card.classList.add('ws-flip');
      setTimeout(function () { fn(); }, 220);
      setTimeout(function () { card.classList.remove('ws-flip'); }, 620);
    }
    function drawDaily() {
      if (drawn) {
        textEl.textContent = '今天的牌已经抽过啦，点"再抽一张"换一张随机的 ~';
        card.classList.add('ws-shake');
        setTimeout(function () { card.classList.remove('ws-shake'); }, 450);
        if (redraw) redraw.hidden = false;
        return;
      }
      drawn = true;
      flipThen(function () { reveal(dailyPick()); });
    }

    card.addEventListener('click', drawDaily);
    card.addEventListener('keydown', function (e) {
      if (e.key === 'Enter' || e.key === ' ') { e.preventDefault(); drawDaily(); }
    });
    if (redraw) {
      redraw.addEventListener('click', function (e) {
        e.stopPropagation();
        flipThen(function () { reveal(randomPick()); });
      });
    }
  })();

  /* =======================================================
   * 三、备忘录（localStorage）
   * ======================================================= */
  (function wishes() {
    var wall = $('ws-wish-wall');
    var input = $('ws-wish-input');
    var addBtn = $('ws-wish-add');
    if (!wall || !input || !addBtn) return;

    var KEY = 'ws-wishes-v2';
    var COLORS = ['#FFE1EC', '#FFF0D6', '#E4F5EC', '#EBE7FB', '#FFE7DB', '#E3F0FB'];
    var SEED = [
      { text: '你是从哪里来的？欢迎你来。认识你我很高兴！', seeded: true },
      { text: '真正的程序员都该喜欢粉色，别问我为什么', seeded: true },
      { text: '阳光，沙滩，和你的故事', seeded: true }
    ];

    function load() {
      try {
        var raw = localStorage.getItem(KEY);
        if (!raw) return null;
        var arr = JSON.parse(raw);
        return Array.isArray(arr) ? arr : null;
      } catch (e) { return null; }
    }
    function save(arr) {
      try { localStorage.setItem(KEY, JSON.stringify(arr)); } catch (e) { /* 隐私模式忽略 */ }
    }

    var list = load();
    if (!list) {
      list = SEED.map(function (s, i) {
        return {
          text: s.text, seeded: true, ts: Date.now() - (3 - i) * 86400000,
          color: COLORS[i % COLORS.length], rot: (i % 2 ? 1 : -1) * (1 + i * 0.6)
        };
      });
      save(list);
    }

    function fmt(ts) {
      var d = new Date(ts);
      return (d.getMonth() + 1) + '月' + d.getDate() + '日';
    }

    function render() {
      if (!list.length) {
        wall.innerHTML = '<p class="ws-wish-empty">这里还空着，来记第一条吧 ~</p>';
        return;
      }
      wall.innerHTML = list.map(function (w, i) {
        return '<div class="ws-wish-note" style="background:' + w.color +
          ';transform:rotate(' + w.rot + 'deg)">' +
          '<button class="ws-wish-del" data-i="' + i + '" title="撕掉这张">×</button>' +
          '<p class="ws-wish-text">' + esc(w.text) + '</p>' +
          '<span class="ws-wish-date">' + (w.seeded ? '兀孀' : '你') + ' · ' + fmt(w.ts) + '</span>' +
          '</div>';
      }).join('');
    }

    function add() {
      var v = input.value.trim();
      if (!v) {
        input.classList.add('ws-shake');
        setTimeout(function () { input.classList.remove('ws-shake'); }, 500);
        return;
      }
      list.unshift({
        text: v, seeded: false, ts: Date.now(),
        color: COLORS[(Math.random() * COLORS.length) | 0],
        rot: (Math.random() * 4 - 2)
      });
      if (list.length > 40) list = list.slice(0, 40);
      save(list);
      input.value = '';
      render();
      var first = wall.querySelector('.ws-wish-note');
      if (first) {
        first.classList.add('ws-pop');
        setTimeout(function () { first.classList.remove('ws-pop'); }, 520);
      }
    }

    addBtn.addEventListener('click', add);
    input.addEventListener('keydown', function (e) {
      if (e.key === 'Enter') { e.preventDefault(); add(); }
    });
    wall.addEventListener('click', function (e) {
      var btn = e.target.closest ? e.target.closest('.ws-wish-del') : null;
      if (!btn) return;
      var i = parseInt(btn.getAttribute('data-i'), 10);
      if (isNaN(i)) return;
      list.splice(i, 1);
      save(list);
      render();
    });

    render();
  })();

  /* =======================================================
   * 四、拉取构建期数据，渲染其余模块
   * ======================================================= */
  fetch('/home-data.json', { cache: 'no-cache' })
    .then(function (r) { return r.json(); })
    .then(function (data) {
      renderStats(data.stats);
      renderCats(data.categories);
      renderLatest(data.latest);
      initRandom(data.allPosts);
      initCalendar(data);
    })
    .catch(function () {
      var g = $('ws-latest');
      if (g) g.innerHTML = '<p class="ws-wish-empty">文章数据加载失败，去 <a href="/archives/">归档页</a> 看看吧。</p>';
    });

  /* ---------- 站点统计（数字滚动） ---------- */
  function renderStats(s) {
    var box = $('ws-stats');
    if (!box || !s) return;
    var items = [
      { n: s.posts, label: '篇文章' },
      { n: s.categories, label: '个分类' },
      { n: s.activeDays, label: '天在写' },
      { n: s.tags, label: '个标签' }
    ];
    box.innerHTML = items.map(function (it) {
      return '<div class="ws-stat"><b data-to="' + it.n + '">0</b><span>' + it.label + '</span></div>';
    }).join('');

    if (reduceMotion) {
      box.querySelectorAll('b').forEach(function (b) { b.textContent = b.getAttribute('data-to'); });
      return;
    }
    box.querySelectorAll('b').forEach(function (b) {
      var to = parseInt(b.getAttribute('data-to'), 10) || 0;
      var start = null, dur = 900;
      function step(t) {
        if (start === null) start = t;
        var p = Math.min(1, (t - start) / dur);
        var eased = 1 - Math.pow(1 - p, 3);
        b.textContent = Math.round(to * eased);
        if (p < 1) requestAnimationFrame(step);
      }
      requestAnimationFrame(step);
    });
  }

  /* ---------- 分类快捷入口 ---------- */
  function renderCats(cats) {
    var box = $('ws-cats');
    if (!box) return;
    if (!cats || !cats.length) { box.parentNode.style.display = 'none'; return; }
    var ICONS = ['✎', '❀', '✦', '☾', '✿', '✧', '❁', '☘'];
    box.innerHTML = cats.map(function (c, i) {
      return '<a class="ws-cat-chip" href="' + esc(c.path) + '">' +
        '<span class="ws-cat-icon">' + ICONS[i % ICONS.length] + '</span>' +
        '<span class="ws-cat-name">' + esc(c.name) + '</span>' +
        '<span class="ws-cat-count">' + c.count + '</span></a>';
    }).join('');
  }

  /* ---------- 最新文章卡片 ---------- */
  function renderLatest(list) {
    var box = $('ws-latest');
    if (!box) return;
    if (!list || !list.length) { box.innerHTML = '<p class="ws-wish-empty">还没有文章。</p>'; return; }
    box.innerHTML = list.map(function (p) {
      var cat = p.categories && p.categories.length ? p.categories[0] : '随笔';
      return '<a class="ws-post-card" href="' + esc(p.path) + '">' +
        '<span class="ws-post-cat">' + esc(cat) + '</span>' +
        '<h3 class="ws-post-title">' + esc(p.title) + '</h3>' +
        '<p class="ws-post-excerpt">' + esc(p.excerpt || '') + '</p>' +
        '<span class="ws-post-date">' + esc(p.date) + '</span></a>';
    }).join('');
  }

  /* ---------- 随机传送门 ---------- */
  function initRandom(all) {
    var card = $('ws-random-card');
    var hint = $('ws-random-hint');
    if (!card || !all || !all.length) return;
    var busy = false;

    function go() {
      if (busy) return;
      busy = true;
      card.classList.add('ws-spin');
      var ticks = 0;
      var timer = setInterval(function () {
        var t = all[(Math.random() * all.length) | 0];
        if (hint) hint.textContent = t.title;
        if (++ticks >= 10) {
          clearInterval(timer);
          var target = all[(Math.random() * all.length) | 0];
          if (hint) hint.textContent = '出发 → ' + target.title;
          setTimeout(function () { window.location.href = target.path; }, 420);
        }
      }, 80);
    }

    card.addEventListener('click', go);
    card.addEventListener('keydown', function (e) {
      if (e.key === 'Enter' || e.key === ' ') { e.preventDefault(); go(); }
    });
  }

  /* =======================================================
   * 五、创作月历（年份 / 月份可切换）
   *     顶部下拉切换年 / 月，格子显示"几号"，底色按当日发文量分档
   * ======================================================= */
  function initCalendar(data) {
    var yearSel = $('ws-cal-year');
    var monthSel = $('ws-cal-month');
    var prev = $('ws-cal-prev');
    var next = $('ws-cal-next');
    var grid = $('ws-cal-grid');
    var summary = $('ws-cal-summary');
    if (!grid) return;

    var daily = data.daily || {};

    /* 年份范围：data.years(有文的年) + 当年，升序。
       allYears 再补齐成连续区间（含无文章的年份，如 2025），
       否则下拉缺年、用箭头切过去会出现 NaN 年月。 */
    var years = (data.years && data.years.length) ? data.years.slice() : [new Date().getFullYear()];
    var thisYear = new Date().getFullYear();
    if (years.indexOf(thisYear) === -1) years.push(thisYear);
    years.sort(function (a, b) { return a - b; });
    var minY = years[0], maxY = years[years.length - 1];
    var allYears = [];
    for (var yy = minY; yy <= maxY; yy++) allYears.push(yy);

    function level(c) {
      if (!c) return 0;
      if (c === 1) return 1;
      if (c === 2) return 2;
      if (c <= 4) return 3;
      return 4;
    }
    function keyOf(y, m, d) {
      return y + '-' + String(m).padStart(2, '0') + '-' + String(d).padStart(2, '0');
    }
    /* 某年某月的总发文量 */
    function monthTotal(y, m) {
      var n = 0;
      Object.keys(daily).forEach(function (k) {
        if (+k.slice(0, 4) === y && +k.slice(5, 7) === m) n += daily[k];
      });
      return n;
    }

    /* 默认：发文最多的那一年；该年发文最多的那个月 */
    var bestYear = years[0], bestCount = -1;
    years.forEach(function (y) {
      var n = 0;
      Object.keys(daily).forEach(function (k) { if (+k.slice(0, 4) === y) n += daily[k]; });
      if (n > bestCount) { bestCount = n; bestYear = y; }
    });
    var bestMonth = 1, bestM = -1;
    for (var m = 1; m <= 12; m++) {
      var nm = monthTotal(bestYear, m);
      if (nm > bestM) { bestM = nm; bestMonth = m; }
    }

    yearSel.innerHTML = allYears.map(function (y) {
      return '<option value="' + y + '"' + (y === bestYear ? ' selected' : '') + '>' + y + ' 年</option>';
    }).join('');
    monthSel.innerHTML = [1, 2, 3, 4, 5, 6, 7, 8, 9, 10, 11, 12].map(function (m) {
      return '<option value="' + m + '"' + (m === bestMonth ? ' selected' : '') + '>' + m + ' 月</option>';
    }).join('');

    function draw(y, m) {
      var first = new Date(y, m - 1, 1);
      /* 周一为一周起点：getDay()(0=周日) 换算成 0=周一 */
      var lead = (first.getDay() + 6) % 7;
      var days = new Date(y, m, 0).getDate();
      var t = new Date();
      var todayD = (t.getFullYear() === y && t.getMonth() === m - 1) ? t.getDate() : -1;

      var cells = [];
      for (var i = 0; i < lead; i++) cells.push(null);
      for (var d = 1; d <= days; d++) cells.push(d);
      while (cells.length % 7 !== 0) cells.push(null);

      var total = 0, active = 0, best = { c: 0, d: 0 };
      grid.innerHTML = cells.map(function (d) {
        if (d === null) return '<div class="ws-cal-cell empty"></div>';
        var k = keyOf(y, m, d);
        var c = daily[k] || 0;
        if (c > 0) { total += c; active++; if (c > best.c) best = { c: c, d: d }; }
        var cls = 'ws-cal-cell lv' + level(c) + (d === todayD ? ' today' : '');
        var tip = c ? (k + ' · ' + c + ' 篇') : (k + ' · 没有更新');
        return '<div class="' + cls + '" title="' + tip + '"><span class="ws-cal-d">' + d + '</span></div>';
      }).join('');

      if (summary) {
        summary.textContent = total
          ? y + ' 年 ' + m + ' 月写了 ' + total + ' 篇，分布在 ' + active + ' 天' +
            (best.c > 1 ? '，最勤快的一天是 ' + best.d + ' 号（' + best.c + ' 篇）' : '')
          : y + ' 年 ' + m + ' 月这里一片空白 ~';
      }

      /* 边界禁用箭头 */
      prev.disabled = (y <= allYears[0] && m <= 1);
      next.disabled = (y >= allYears[allYears.length - 1] && m >= 12);
    }

    function readDraw() {
      var y = parseInt(yearSel.value, 10), m = parseInt(monthSel.value, 10);
      if (isNaN(y) || isNaN(m)) return;   /* 兜底：下拉值缺失时不渲染 NaN */
      draw(y, m);
    }

    yearSel.addEventListener('change', readDraw);
    monthSel.addEventListener('change', readDraw);
    prev.addEventListener('click', function () {
      var y = parseInt(yearSel.value, 10), m = parseInt(monthSel.value, 10);
      m--; if (m < 1) { m = 12; y--; }
      if (y < allYears[0]) return;
      yearSel.value = y; monthSel.value = m; readDraw();
    });
    next.addEventListener('click', function () {
      var y = parseInt(yearSel.value, 10), m = parseInt(monthSel.value, 10);
      m++; if (m > 12) { m = 1; y++; }
      if (y > allYears[allYears.length - 1]) return;
      yearSel.value = y; monthSel.value = m; readDraw();
    });

    draw(bestYear, bestMonth);
  }
})();
