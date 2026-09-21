/* ===========================================================
   那西索亚故事集 · 档案馆交互
   数据 / 文件夹组件 / 目录渲染 / 动画状态 分离
   状态机：idle → selected → opening → opened
   =========================================================== */
(function () {
  'use strict';

  var PAGE_SIZE = 6; // 每页 A4 容纳的档案条数

  // 分类展示元数据与顺序固定；文件清单在构建期由 scripts/scan-archive.js
  // 扫描 source/archive/content/<分类>/*.md 自动生成 manifest.json，这里运行时拉取。
  // 叠放顺序：从后到前（ABOUT 最底层，PERSONS 最前）
  var STACK_ORDER = ['about', 'other', 'mona', 'places', 'persons'];
  // 右侧标签纵列顺序：从上到下（与指南第 7 节一致）
  var LABEL_ORDER = { persons: 0, places: 1, mona: 2, other: 3, about: 4 };
  // white 保留为 beige 的别名，避免旧 manifest（color:'white'）拿到未定义变量
  var COLORVAR = {
    red: '--folder-red', green: '--folder-green', black: '--folder-black',
    blue: '--folder-blue', beige: '--folder-beige', white: '--folder-beige'
  };

  var stack = document.getElementById('archiveStack');
  var stage = document.getElementById('archiveStage');
  var reader = document.getElementById('archiveReader');
  var book = document.getElementById('archiveBook');
  var coverEl = document.getElementById('archiveCover');
  var leftEl = document.getElementById('archiveLeft');
  var rightEl = document.getElementById('archiveRight');
  var footEl = document.getElementById('archiveFoot');
  var backBtn = document.getElementById('archiveBack');
  var prevBtn = document.getElementById('archivePrev');
  var nextBtn = document.getElementById('archiveNext');
  var pageNum = document.getElementById('archivePageNum');

  var state = { cat: null, spreads: [], page: 0, busy: false, dx: 0, dy: 0, byDoc: null };
  var reduce = window.matchMedia('(prefers-reduced-motion: reduce)').matches;

  function esc(s) {
    return String(s).replace(/[&<>"]/g, function (c) {
      return { '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;' }[c];
    });
  }
  function pad2(n) { return String(n).padStart(2, '0'); }
  function chunk(arr, n) { var o = []; for (var i = 0; i < arr.length; i += n) o.push(arr.slice(i, i + n)); return o; }

  // 目录排序规则：编号从左往右逐字符比较，0-9 阿拉伯数字排在最前，其次 A-Z 字母。
  // 例：001<002，009<00A，A01<B01（数字类始终优先于字母类，同类内再按字符序）。
  function codeRank(ch) {
    if (ch >= '0' && ch <= '9') return 0;
    if (ch >= 'A' && ch <= 'Z') return 1;
    if (ch >= 'a' && ch <= 'z') return 1; // 字母统一参与，大小写无关
    return 2; // 连字符等非字母数字符号排最后
  }
  function sortById(a, b) {
    var x = String(a.id), y = String(b.id);
    var n = Math.min(x.length, y.length);
    for (var i = 0; i < n; i++) {
      var rx = codeRank(x[i]), ry = codeRank(y[i]);
      if (rx !== ry) return rx - ry;                 // 数字类优先于字母类
      if (x[i] !== y[i]) return x[i] < y[i] ? -1 : 1; // 同类内按字符序
    }
    return x.length - y.length;                       // 前缀相同则短者在前
  }

  function rowHtml(f) {
    var cur = state.byDoc && f.id === state.byDoc ? ' archive-row--current' : '';
    var body = '<span class="archive-row__id">' + esc(f.id) + '</span>'
      + '<span class="archive-row__body"><span class="archive-row__title">' + esc(f.title) + '</span>'
      + '<span class="archive-row__sub">' + (f.ready ? 'READY — 可翻阅' : 'SAMPLE DOSSIER') + '</span></span>';
    // 已有正文的档案可点击进入正文档案阅读器
    if (f.ready) {
      return '<a class="archive-row archive-row--link' + cur + '" href="/archive/read/?id=' + encodeURIComponent(f.id) + '">'
        + body + '</a>';
    }
    return '<div class="archive-row' + cur + '">' + body + '</div>';
  }

  function indexHtml(cat, files, sub) {
    // 中文在上、英文在下（首跨「档案索引 / ARCHIVE INDEX」，续跨「档案索引（续）/ CONTINUED」）
    var subCn = sub === 'ARCHIVE INDEX' ? '档案索引' : '档案索引（续）';
    // ID 列宽按"整个分类"最长 ID 计算（ch = 等宽字体的单字宽），
    // 使各跨页的列宽一致、翻页时人名左端不跳动
    var maxLen = (cat.files || files).reduce(function (m, f) { return Math.max(m, String(f.id).length); }, 0);
    var head = '<div class="archive-index__sub-cn">' + esc(subCn) + '</div>'
      + '<div class="archive-index__sub">' + esc(sub || 'ARCHIVE INDEX') + '</div>';
    return '<div class="archive-index" style="--id-w:' + (maxLen + 1) + 'ch">' + head
      + '<div class="archive-index__rule"></div>'
      + '<div class="archive-index__list">' + files.map(rowHtml).join('') + '</div>'
      + '</div>';
  }

  function interiorHtml(cat) {
    // 摊开后左页 = 档案夹内侧：满幅纯色，无文字、无内嵌封面
    return '';
  }

  // 双页模型：第 0 跨左=文件夹内侧，右=索引首页；后续跨左=空白米白背面，右=索引续页
  function buildSpreads(cat) {
    var files = cat.files.slice().sort(sortById); // 按编号排序：数字在前、字母在后，从左到右逐字符
    var chunks = chunk(files, PAGE_SIZE);
    var spreads = [];
    for (var i = 0; i < chunks.length; i++) {
      if (i === 0) spreads.push({ left: 'interior', right: chunks[i] });
      else spreads.push({ left: 'blank', right: chunks[i] });
    }
    return spreads;
  }

  function renderSpread() {
    var sp = state.spreads[state.page];
    var cat = state.cat;
    // 翻过首页后，封面翻板的背面变为米白纸背（否则红色翻板背面会盖住空白左页）
    book.classList.toggle('is-past-cover', state.page > 0);
    if (sp.left === 'interior') {
      leftEl.className = 'archive-page archive-page--left archive-page--cover';
      leftEl.style.setProperty('--folder-color', 'var(' + COLORVAR[cat.color] + ')');
      leftEl.innerHTML = interiorHtml(cat);
    } else {
      // 非首跨：左页 = 空白的米白纸背面（与正文用纸同色），可点击回上一跨
      leftEl.className = 'archive-page archive-page--left archive-page--blank';
      leftEl.style.removeProperty('--folder-color');
      leftEl.innerHTML = '';
    }
    rightEl.className = 'archive-page archive-page--right';
    rightEl.innerHTML = indexHtml(cat, sp.right, state.page === 0 ? 'ARCHIVE INDEX' : 'CONTINUED');
    footEl.textContent = '档案馆 / ' + cat.cn;
    prevBtn.disabled = state.page === 0;
    nextBtn.disabled = state.page === state.spreads.length - 1;
    pageNum.textContent = '跨页 ' + pad2(state.page + 1) + ' / ' + pad2(state.spreads.length);
    // 可翻页方向给指针反馈（左页=上一跨，右页=下一跨）
    leftEl.style.cursor = state.page > 0 ? 'pointer' : 'default';
    rightEl.style.cursor = state.page < state.spreads.length - 1 ? 'pointer' : 'default';
  }

  // 把书体平移到与点击的档案夹重合：阅读动画的"第一帧"必须等于封面当前所在位置
  function alignToFolder(folderEl) {
    book.style.transition = 'none';
    book.style.transform = 'none';
    void book.offsetWidth; // 强制回流，先量到无位移的基准位置
    var fr = folderEl.getBoundingClientRect();
    var cr = coverEl.getBoundingClientRect();
    state.dx = Math.round(fr.left - cr.left);
    state.dy = Math.round(fr.top - cr.top);
    book.style.transform = 'translate(' + state.dx + 'px, ' + state.dy + 'px)';
    void book.offsetWidth;
  }

  function showReader(folderEl) {
    renderSpread();
    reader.classList.add('is-active');
    reader.setAttribute('aria-hidden', 'false');
    stage.classList.add('is-reading');

    if (reduce || !folderEl) {
      book.classList.add('is-open');
      // 从正文页返回（folderEl 为 null）：瞬间呈现，不播放翻开 / 淡入动画
      if (!reduce && !folderEl) {
        book.classList.add('is-instant');
        reader.classList.add('is-instant');
        void book.offsetWidth;              // 强制回流，确保无过渡的终态先落地
        requestAnimationFrame(function () {
          book.classList.remove('is-instant');
          reader.classList.remove('is-instant');
        });
      }
      return;
    }

    // 第一帧：书体不透明地出现在档案夹原位（与档案夹完全重合，出现即无感）
    alignToFolder(folderEl);
    book.style.transition = 'opacity .12s ease'; // 仅淡入，禁止 transform 过渡
    requestAnimationFrame(function () {
      book.classList.add('is-open');
      // 停留片刻（等首页淡出、档案夹隐去），再滑向中央 → 翻开
      setTimeout(function () {
        book.style.transition = ''; // 恢复 CSS 过渡（含 transform）
        book.style.transform = 'translate(0px, 0px)';
      }, 200);
    });
  }

  function resetFolders() {
    var fs = stack.querySelectorAll('.archive-folder');
    for (var i = 0; i < fs.length; i++) fs[i].classList.remove('is-extract', 'is-recede');
    state.cat = null; state.spreads = []; state.page = 0; state.busy = false; state.byDoc = null;
  }

  function openCat(cat, folderEl) {
    if (state.busy) return;
    state.busy = true;
    state.cat = cat;
    state.spreads = buildSpreads(cat);
    state.page = 0;

    // 封面翻板：颜色与文案跟随当前档案
    coverEl.style.setProperty('--folder-color', 'var(' + COLORVAR[cat.color] + ')');
    coverEl.setAttribute('data-color', cat.color);   // 浅色分类（白）需要深色文字
    coverEl.querySelector('.archive-cover__en').textContent = cat.en;
    coverEl.querySelector('.archive-cover__files').textContent = pad2(cat.files.length) + ' FILES';

    if (reduce || !folderEl) { showReader(folderEl); state.busy = false; return; }

    // Phase 1：抽出
    folderEl.classList.add('is-extract');
    var others = stack.querySelectorAll('.archive-folder');
    for (var i = 0; i < others.length; i++) {
      if (others[i] !== folderEl) others[i].classList.add('is-recede');
    }
    // Phase 2：翻开 → 双页
    setTimeout(function () {
      showReader(folderEl);
      setTimeout(function () { state.busy = false; }, 1600);
    }, 230);
  }

  function closeReader() {
    if (!reader.classList.contains('is-active')) return;
    book.classList.remove('is-open');
    if (!reduce) {
      // 沿原路滑回档案夹位置，收拢后再复位
      book.style.transform = 'translate(' + state.dx + 'px, ' + state.dy + 'px)';
    }
    reader.classList.remove('is-active');
    reader.setAttribute('aria-hidden', 'true');
    stage.classList.remove('is-reading');
    if (reduce) { resetFolders(); return; }
    setTimeout(function () {
      book.style.transition = 'none';
      book.style.transform = '';
      void book.offsetWidth;
      book.style.transition = '';
      resetFolders();
    }, 520);
  }

  function bumpEl(el) {
    el.style.animation = 'archive-fade .4s ease';
    setTimeout(function () { el.style.animation = ''; }, 420);
  }
  function bumpRight() { bumpEl(rightEl); }

  function go(delta) {
    var next = state.page + delta;
    if (next < 0 || next >= state.spreads.length) return;
    state.page = next;
    renderSpread();
    bumpEl(delta < 0 ? leftEl : rightEl);
  }

  prevBtn.addEventListener('click', function () { go(-1); });
  nextBtn.addEventListener('click', function () { go(1); });

  // 点击页面本身翻页：左页→上一跨，右页→下一跨（点在条目链接上时不触发）
  leftEl.addEventListener('click', function (e) {
    if (e.target.closest('a, button')) return;
    go(-1);
  });
  rightEl.addEventListener('click', function (e) {
    if (e.target.closest('a, button')) return;
    go(1);
  });
  backBtn.addEventListener('click', closeReader);
  document.addEventListener('keydown', function (e) {
    if (e.key === 'Escape' && reader.classList.contains('is-active')) closeReader();
  });

  // 右侧标签纵列自适应：n 个标签必须完整落在档案夹高度内，
  // 否则第 5 个及以后的标签会溢出档案堆、压到下方提示文字。
  // 约束：n × 标签高 + (n-1) × 间距 ≤ 档案夹高（--fh）
  var labelCount = 0;
  function fitLabels() {
    if (!labelCount) return;
    var cs = getComputedStyle(document.documentElement);
    var fh = parseFloat(cs.getPropertyValue('--fh')) || 480;
    var gap = parseFloat(cs.getPropertyValue('--label-gap')) || 14;
    var base = parseFloat(cs.getPropertyValue('--label-h')) || 92;
    var h = Math.min(base, Math.floor((fh - (labelCount - 1) * gap) / labelCount));
    // 整列顶端对齐：第一个标签贴近档案夹顶缘，只留极小起始留白，避免上方空一大块。
    // 空间不足时（手机端整列恰好占满）留白自动收缩为 0，保证不向底部溢出。
    var total = labelCount * h + (labelCount - 1) * gap;
    var offset = Math.max(0, Math.min(8, Math.floor(fh - total)));
    stack.style.setProperty('--label-h', Math.max(40, h) + 'px');
    stack.style.setProperty('--label-offset', offset + 'px');
    // 标签变矮时同步收字号，避免竖排文字（如 MONÂ）纵向溢出
    // 分级：标签越矮字号越小（15px 时 MONÂ 需 ≥76px 才不贴边）
    if (h < 70) stack.style.setProperty('--label-fs', '11px');
    else if (h < 84) stack.style.setProperty('--label-fs', '13px');
    else stack.style.removeProperty('--label-fs');
  }
  window.addEventListener('resize', fitLabels);

  // 注入文件夹（数据驱动，分类与文件清单来自 manifest.json，运行时拉取）
  function injectFolders(cats) {
    var seen = {};
    var order = STACK_ORDER.slice();
    // 把 manifest 中不在 STACK_ORDER 的新分类补到末尾
    cats.forEach(function (c) { if (order.indexOf(c.id) < 0) order.push(c.id); });

    // 先筛出真正会显示的分类（无档案文件的分类不渲染），据此计算标签尺寸
    var list = [];
    order.forEach(function (id, i) {
      var cat = null;
      for (var k = 0; k < cats.length; k++) if (cats[k].id === id) cat = cats[k];
      if (!cat) return;                 // 该分类当前无档案文件 → 不显示抽屉
      if (seen[cat.id]) return;
      seen[cat.id] = true;
      list.push({ cat: cat, i: i });
    });
    labelCount = list.length;
    fitLabels();

    var li = 0;
    list.forEach(function (entry) {
      var cat = entry.cat, i = entry.i;

      var btn = document.createElement('button');
      btn.type = 'button';
      btn.className = 'archive-folder archive-folder--' + cat.color;
      btn.style.setProperty('--i', i);
      btn.style.setProperty('--li', LABEL_ORDER[cat.id] != null ? LABEL_ORDER[cat.id] : li);
      btn.style.setProperty('--folder-color', 'var(' + COLORVAR[cat.color] + ')');
      btn.setAttribute('role', 'listitem');
      btn.setAttribute('aria-label', '打开' + cat.cn + '档案目录');
      btn.dataset.id = cat.id;
      var count = pad2(cat.files.length);
      btn.innerHTML =
        '<span class="archive-folder__face">'
          + '<span class="archive-folder__en">' + esc(cat.en) + '</span>'
          + '<span class="archive-folder__files">' + count + ' FILES</span>'
        + '</span>'
        + '<span class="archive-folder__tab" aria-hidden="true">'
          + '<span class="archive-folder__tab-cn">' + esc(cat.cn) + '</span>'
        + '</span>';
      btn.addEventListener('click', function () { openCat(cat, btn); });
      stack.appendChild(btn);
      li++;
    });
  }

  // 启动：拉取自动生成的目录清单，再注入文件夹
  fetch('/archive/content/manifest.json')
    .then(function (r) { return r.json(); })
    .then(function (mf) {
      var cats = mf.categories || [];
      if (!cats.length) {
        console.warn('[archive] manifest 中无分类，目录为空');
        return;
      }
      injectFolders(cats);

      // 从正文档案页返回（?cat=分类&doc=档案ID）：直接打开该分类目录，
      // 并落在该档案所在的跨页、轻微标记该条目，作为"回到原处"的落点
      var q = new URLSearchParams(location.search);
      var wantCat = q.get('cat'), wantDoc = q.get('doc');
      if (wantCat) {
        var catObj = null, btn = null;
        for (var c = 0; c < cats.length; c++) if (cats[c].id === wantCat) catObj = cats[c];
        var fbs = stack.querySelectorAll('.archive-folder');
        for (var b = 0; b < fbs.length; b++) if (fbs[b].dataset.id === wantCat) btn = fbs[b];
        if (catObj) {
          state.byDoc = wantDoc || null;
          openCat(catObj, null);                       // 无 folderEl → 不做抽出动画，直接摊开
          if (wantDoc) {
            var sorted = catObj.files.slice().sort(sortById);
            for (var i2 = 0; i2 < sorted.length; i2++) {
              if (sorted[i2].id === wantDoc) { state.page = Math.floor(i2 / PAGE_SIZE); break; }
            }
            renderSpread();
          }
          if (btn) btn.classList.add('is-extract');
        }
      }
    })
    .catch(function (e) {
      console.warn('[archive] 目录清单加载失败：' + e.message);
    });
})();
