/* ===========================================================
   那西索亚故事集 · 正文档案阅读器（第二阶段）
   Markdown → 文档模型 → 双页阅读器
   分层：解析(parser) / 渲染(renderer) / 交互(controller)
   =========================================================== */
(function () {
  'use strict';

  /* ---------- 常量 ---------- */
  var FOLDER_VAR = { persons: '--ar-folder-red', places: '--ar-folder-green', mona: '--ar-folder-black', other: '--ar-folder-blue' };
  var CAT_CN = { persons: '人物', places: '地点', mona: 'MONÂ', other: '其他' };
  var DEBUG = /[?&]debug=1/.test(location.search);
  var REDUCE = window.matchMedia('(prefers-reduced-motion: reduce)').matches;

  var els = {};
  var state = { doc: null, pages: [], page: 0, defs: {}, fnOrder: {}, fnCount: 0, figs: {}, figCount: 0 };

  /* ---------- 工具 ---------- */
  function esc(s) {
    return String(s == null ? '' : s).replace(/[&<>"]/g, function (c) {
      return { '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;' }[c];
    });
  }
  function pad2(n) { return String(n).padStart(2, '0'); }
  function isMobile() { return window.matchMedia('(max-width: 760px)').matches; }

  // 兼容 Markdown 图片语法：photo/src 写成 ![alt](url) 也能识别
  function imgVal(v) {
    var m = String(v == null ? '' : v).match(/!\[([^\]]*)\]\(([^)\s]+)[^)]*\)/);
    return m ? { url: m[2], alt: m[1] } : null;
  }

  /* =========================================================
     1. PARSER：Markdown → 文档模型
     ========================================================= */

  function parseFront(text) {
    var meta = {};
    var m = text.match(/^---\s*\r?\n([\s\S]*?)\r?\n---\s*\r?\n?/);
    if (m) {
      m[1].split(/\r?\n/).forEach(function (line) {
        var kv = line.match(/^\s*([\w-]+)\s*:\s*(.*)\s*$/);
        if (kv) meta[kv[1]] = kv[2].replace(/^["']|["']$/g, '');
      });
    }
    return { meta: meta, body: m ? text.slice(m[0].length) : text };
  }

  // 逐行分词：:::page 为页面边界，:::xxx 为组件（§17 / §19）
  function tokenize(body) {
    var lines = body.replace(/\r\n/g, '\n').split('\n');
    var pages = [], cur = null, comp = null, buf = [];
    function flush() {
      if (!buf.length) return;
      cur.blocks.push({ type: 'text', raw: buf.join('\n') });
      buf = [];
    }
    function ensurePage() {
      if (!cur) { cur = { blocks: [] }; pages.push(cur); }
    }
    for (var i = 0; i < lines.length; i++) {
      var line = lines[i];
      var open = line.match(/^:::([a-zA-Z]+)\s*$/);
      if (open) {
        if (open[1] === 'page') { flush(); cur = { blocks: [] }; pages.push(cur); comp = null; continue; }
        flush(); ensurePage();
        comp = { type: open[1], lines: [] };
        continue;
      }
      if (/^:::\s*$/.test(line)) {
        if (comp) { cur.blocks.push({ type: comp.type, raw: comp.lines.join('\n') }); comp = null; }
        continue;
      }
      if (comp) { comp.lines.push(line); continue; }
      if (line.indexOf('---') === 0 && /^\s*$/.test(lines[i + 1] || '')) continue;
      ensurePage();
      if (!line.trim()) { flush(); continue; }
      buf.push(line);
    }
    flush();
    return pages;
  }

  function kv(raw) {
    var o = {};
    raw.split(/\r?\n/).forEach(function (l) {
      var m = l.match(/^\s*([\w-]+)\s*:\s*(.+?)\s*$/);
      if (m) o[m[1]] = m[2];
    });
    return o;
  }

  // 浮动标签卡调色板（固定指令：color: yellow|red|blue|green|beige，均为低饱和色）
  var CARD_COLORS = { yellow: 1, red: 1, blue: 1, green: 1, beige: 1 };
  function normalizeColor(c) {
    c = String(c == null ? '' : c).toLowerCase().replace(/^["']|["']$/g, '');
    return CARD_COLORS[c] ? c : 'beige';
  }
  // 组件字段解析：仅白名单字段视为配置（color/position/...），其余非空行作为卡片正文（markdown）
  var DOC_CONFIG_KEYS = { color: 1, position: 1, rotation: 1, size: 1, src: 1, alt: 1, caption: 1, title: 1, date: 1, source: 1, description: 1, x: 1, y: 1 };
  function parseFields(raw) {
    var fields = {}, body = [];
    raw.split(/\r?\n/).forEach(function (l) {
      var m = l.match(/^\s*([\w-]+)\s*:\s*(.+?)\s*$/);
      if (m && DOC_CONFIG_KEYS[m[1].toLowerCase()]) fields[m[1].toLowerCase()] = m[2];
      else if (l.trim()) body.push(l);
    });
    return { fields: fields, body: body.join('\n') };
  }

  // 脚注定义预扫描：[^1]: 文本
  function collectDefs(pages) {
    var defs = {};
    pages.forEach(function (p) {
      p.blocks.forEach(function (b) {
        if (b.type !== 'text') return;
        b.raw.split(/\r?\n/).forEach(function (l) {
          var m = l.match(/^\[\^(\d+)\]:\s*(.+)$/);
          if (m) defs[m[1]] = m[2];
        });
      });
    });
    return defs;
  }

  // 编号：按首次引用顺序生成（§39）
  function fnNum(key) {
    if (!state.fnOrder[key]) state.fnOrder[key] = ++state.fnCount;
    return state.fnOrder[key];
  }

  // 极简行内 Markdown（作者不写 HTML）
  function inline(s) {
    var out = esc(s);
    out = out.replace(/\[\^(\d+)\]/g, function (m, k) {
      var n = fnNum(k);
      return '<sup class="ar-fn" title="' + esc(state.defs[k] || '') + '">' + n + '</sup>';
    });
    out = out.replace(/\[([^\]]+)\]\(([^)"]+)\)/g, function (m, t, h) {
      return '<a href="' + h + '" target="_blank" rel="noopener">' + t + '</a>';
    });
    out = out.replace(/\*\*([^*]+)\*\*/g, '<strong>$1</strong>');
    out = out.replace(/(^|[^*])\*([^*]+)\*/g, '$1<em>$2</em>');
    return out;
  }

  /* =========================================================
     2. 组件渲染（作者只写内容，样式由阅读器决定）
     ========================================================= */

  // 图片编号：照片 / 文件 / 肖像共用一套 FIG 序列
  function figNo(kind, src) {
    var key = kind + ':' + src;
    if (!state.figs[key]) state.figs[key] = ++state.figCount;
    return state.figs[key];
  }

  /* identity：人物信息侧边栏（§20，参照 mosbyfiles）
     photo: 肖像独占左栏，姓名/生卒/编号在右栏。
     肖像属于页面文字流而非图片图层 → 不可拖动、不跨页、不可点击放大，
     无白边无阴影，视觉上像直接贴在纸上。 */
  function identityHtml(raw) {
    var lines = raw.split(/\r?\n/).map(function (l) { return l.trim(); }).filter(Boolean);
    var o = {}, name = '', rest = [];
    lines.forEach(function (l) {
      var kv = l.match(/^(photo|src|alt)\s*:\s*(.+?)\s*$/);
      if (kv) { o[kv[1] === 'src' ? 'photo' : kv[1]] = kv[2]; return; }
      var m = l.match(/^#+\s*(.*)$/);
      if (m && !name) name = m[1];
      else if (l) rest.push(l);
    });

    var meta = rest.map(function (l) {
      var cls = /^archive/i.test(l) ? 'ar-identity__no' : 'ar-identity__meta';
      return '<div class="' + cls + '">' + esc(l) + '</div>';
    }).join('');

    var photoVal = imgVal(o.photo);
    var photoUrl = photoVal ? photoVal.url : o.photo;
    if (photoVal && !o.alt && photoVal.alt) o.alt = photoVal.alt;

    var photoHtml = photoUrl
      ? '<figure class="ar-identity__photo"><img src="' + esc(photoUrl) + '" alt="' + esc(o.alt || name || '') + '" draggable="false"></figure>'
      : '';

    return '<aside class="ar-identity' + (o.photo ? ' has-photo' : '') + '">' + photoHtml
      + '<div class="ar-identity__body">'
      + '<div class="ar-identity__name">' + esc(name) + '</div>' + meta
      + '</div></aside>';
  }

  function factsHtml(raw) {
    var rows = raw.split(/\r?\n/).map(function (r) { return r.trim(); })
      .filter(function (r) { return r && !/^\|?[\s:|-]+\|[\s:|-]*$/.test(r); });
    var html = '<table class="ar-facts">';
    rows.forEach(function (r, i) {
      var cells = r.replace(/^\||\|$/g, '').split('|').map(function (c) { return c.trim(); });
      var head = i === 0;
      html += '<tr>' + cells.map(function (c, j) {
        var useTh = head || j === 0;
        return useTh ? '<th scope="row">' + esc(c) + '</th>' : '<td>' + esc(c) + '</td>';
      }).join('') + '</tr>';
    });
    return html + '</table>';
  }

  function quoteHtml(raw) {
    var lines = raw.split(/\r?\n/).map(function (l) { return l.trim(); }).filter(Boolean);
    var cite = '';
    if (lines.length && /^[-—–]/.test(lines[lines.length - 1])) {
      cite = lines.pop().replace(/^[-—–]\s*/, '');
    }
    return '<blockquote class="ar-quote">'
      + lines.map(function (l) { return '<p>' + inline(l) + '</p>'; }).join('')
      + (cite ? '<cite>— ' + esc(cite) + '</cite>' : '')
      + '</blockquote>';
  }

  function noteHtml(raw) {
    return '<aside class="ar-note">' + raw.split(/\r?\n\n/).map(function (p) {
      return '<p>' + inline(p.trim()) + '</p>';
    }).join('') + '</aside>';
  }

  // 文本块：年份 / 标题 / 参考文献 / 脚注定义 / 普通段落
  function textHtml(raw, page) {
    var out = '', para = [], defsHere = [];
    function flushPara() {
      if (!para.length) return;
      out += '<p>' + inline(para.join('\n')) + '</p>';
      para = [];
    }
    raw.split(/\r?\n/).forEach(function (line) {
      var l = line.trim();
      var fn = l.match(/^\[\^(\d+)\]:\s*(.+)$/);
      if (fn) { flushPara(); defsHere.push(fn[1]); return; }          // 脚注定义不进正文
      if (/^\|/.test(l)) { flushPara(); return; }                      // 表格残留行
      if (!l) { flushPara(); return; }
      var h = l.match(/^#+\s*(.*)$/);
      if (h) { flushPara(); out += '<h2 class="ar-h">' + esc(h[1]) + '</h2>'; return; }
      if (/^\[\d+\]/.test(l)) { flushPara(); out += '<p class="ar-ref">' + inline(l) + '</p>'; return; }
      para.push(l);
    });
    flushPara();
    page.defsHere = defsHere;
    return out;
  }

  /* =========================================================
     3. 图片图层（§24–§35）
     ========================================================= */

  // 尺寸解析：仅用 size 字段，取值 0–2 的倍率
  //   1 = 原图大小（占满页宽 100%），<1 按比例缩小，>1 放大（最大 200%）
  //   不再支持 small / medium / large 预设名
  function sizePct(v) {
    var s = String(v == null ? '' : v).trim();
    if (!s) return NaN;
    var n = parseFloat(s);
    if (isNaN(n)) return NaN;
    return Math.min(Math.max(n * 100, 4), 200);   // 倍率 ×100% 页宽；安全区间 4%–200%
  }

  /* 照片定位：中心点百分比 (A, B)
     A = 中心点位于整张跨页画布高度的百分之多少（0–1）
     B = 中心点位于整张跨页画布宽度的百分之多少（0–1）
     参考框 = arLayer（左+右两页合一）；照片可浮到左页。
     旧式 position 关键词（upper-right 等）不再识别；未写则默认画面正中。 */
  function parseCenter(pos) {
    var m = String(pos == null ? '' : pos).match(/\(([-0-9.]+)\s*,\s*([-0-9.]+)\)/);
    if (!m) return null;
    var a = parseFloat(m[1]), b = parseFloat(m[2]);
    if (isNaN(a) || isNaN(b)) return null;
    return {
      cy: Math.min(Math.max(a, 0), 1),   // 数值A：中心高度百分比
      cx: Math.min(Math.max(b, 0), 1)    // 数值B：中心宽度百分比
    };
  }
  function defaultGeom(o) {
    var c = parseCenter(o.position);
    if (!c) c = { cy: 0.5, cx: 0.5 };
    var w = sizePct(o.size);
    if (isNaN(w)) w = 100;   // 未指定 size 时默认原图大小（占满单页页宽 100%）
    return { cx: c.cx, cy: c.cy, w: w };
  }

  function buildItems(page) {
    return page.blocks.filter(function (b) { return b.type === 'photo' || b.type === 'document'; })
      .map(function (b) {
        var p = parseFields(b.raw);
        var o = p.fields;
        if (b.type === 'document') {
          return {
            kind: 'document',
            color: normalizeColor(o.color),
            text: p.body,
            rotation: parseFloat(o.rotation) || 0,
            geom: defaultGeom(o),
            fig: 0
          };
        }
        var sv = imgVal(o.src);
        var it = {
          kind: 'photo', src: sv ? sv.url : (o.src || ''),
          caption: o.caption || o.title || '', date: o.date || '',
          source: o.source || '', description: o.description || '', title: o.title || '',
          rotation: parseFloat(o.rotation) || 0, geom: null
        };
        it.geom = defaultGeom(o);
        it.fig = figNo('photo', it.src);
        return it;
      })
      .filter(function (it) { return it.kind === 'document' ? it.text.trim() : it.src; });
  }

  // 中心点 (cx, cy) + 尺寸 w → 整张跨页画布上的像素位置，并做边界钳制
  function place(item, el) {
    var L = els.layer.clientWidth, H = els.layer.clientHeight;
    var P = isMobile() ? L : L / 2;                 // 单页宽度，size 语义仍按“占满单页页宽 100%”
    var w, h;
    if (item.kind === 'document') {
      // 卡片：宽度自适应内容（CSS fit-content + max-width 上限），高度随文字量；同步即可测得
      w = el.offsetWidth; h = el.offsetHeight;
    } else {
      w = item.geom.w / 100 * P;                     // 照片宽度（px）
      el.style.width = w + 'px';                     // 先定宽：img 为 width:100%，宽定了才能反推真实高度
      // 高度用图片“真实宽高比”反推，而非 el.offsetHeight —— 后者在图片尚未布局/解码时
      // 返回 0 或陈旧值，会导致垂直居中失效、照片落点错乱（§24 已确认）。
      var img = el.querySelector('img');
      h = 0;
      if (img && img.naturalWidth) h = w * img.naturalHeight / img.naturalWidth;
      else h = el.offsetHeight || 0;
    }
    // 中心点在整张跨页画布上的像素坐标
    var cx = item.geom.cx * L;
    var cy = item.geom.cy * H;
    // 边界钳制：任一边超出画布，则推到能放下的最靠边位置（越界即贴边）
    var halfW = w / 2, halfH = h / 2;
    var minX = halfW, maxX = L - halfW;
    var minY = halfH, maxY = H - halfH;
    cx = (maxX < minX) ? L / 2 : Math.min(Math.max(cx, minX), maxX);
    cy = (maxY < minY) ? H / 2 : Math.min(Math.max(cy, minY), maxY);
    el.style.left = (cx - halfW) + 'px';
    el.style.top = (cy - halfH) + 'px';
    el.style.transform = 'rotate(' + item.rotation + 'deg)';
  }

  /* 照片与身份区（:::identity）分属两个独立图层，互不干涉、互不避让。
     定位完全由 Markdown 的 (A, B) 中心点决定，越界时由 place() 钳制到画布内。 */
  function pxToGeom(item, el) {
    var L = els.layer.clientWidth, H = els.layer.clientHeight;
    var P = isMobile() ? L : L / 2;
    var w = el.offsetWidth, h = el.offsetHeight;
    var cx = parseFloat(el.style.left) + w / 2;
    var cy = parseFloat(el.style.top) + h / 2;
    item.geom.cx = cx / L;
    item.geom.cy = cy / H;
    item.geom.w = w / P * 100;
  }

  function photoEl(item) {
    var el = document.createElement('figure');
    el.className = 'ar-photo' + (item.kind === 'document' ? ' ar-photo--doc' : '');
    el.innerHTML = '<img src="' + esc(item.src) + '" alt="' + esc(item.caption || item.title || '') + '" draggable="false">'
      + '<figcaption>' + esc(item.caption || item.title || '') + (item.date ? ' · ' + esc(item.date) : '') + '</figcaption>';
    bindPhoto(el, item);
    return el;
  }

  // 浮动标签卡（§35，参照 mosbyfiles 低饱和色块）：圆角、自适应文字量、可拖动、不放大
  function cardText(t) {
    return t.split(/\r?\n/).map(function (l) { return inline(l.trim()); }).join('<br>');
  }
  function cardEl(item) {
    var el = document.createElement('figure');
    el.className = 'ar-card ar-card--' + item.color;
    el.innerHTML = cardText(item.text);
    bindPhoto(el, item);   // 复用拖动逻辑；点击不放大（bindPhoto 内按 kind 跳过 lightbox）
    return el;
  }

  /* -------- 孤行防护（§61）：末行绝不只剩 1–2 个字 --------
     CSS 的 text-wrap: pretty 依赖浏览器且只是"尽量"，这里再补一层确定性保障：
     把每个文本块末尾 3 个字符用 WORD JOINER（U+2060，零宽、不可见）两两绑定，
     使其成为一个"不可断行整体"。若末行原只有 1–2 字，说明上一行尾部已放不下，
     这个 3 字整体必然被整段挤到下一行，于是末行至少 3 字；
     若末行本就有 3 字以上，整体本就在末行，绑定不改变任何排版。
     零宽字符不改变字距 / 行宽 / 视觉，且不依赖浏览器支持与否。 */
  var WJ = '\u2060';
  var ORPHAN_MIN = 3;                 // 末行最少"实字"数（汉字/字母/数字；标点与脚注标记不计）
  var ORPHAN_MAX = 12;                // 逐级加固上限（实字口径下一次绑定的单元数上限）
  // "实字"：对孤行感知有意义的字符。标点（。、""——！？……）与上标脚号视觉上不占"字"，
  // 上一版按排版单元计数时「琴⁴。」= 3 个单元被误判达标，实际观感就是 1 字孤行。
  var REAL = /[0-9A-Za-z\u00C0-\u024F\u0370-\u04FF\u0400-\u04FF\u3040-\u30FF\u3400-\u4DBF\u4E00-\u9FFF\uAC00-\uD7AF\uF900-\uFAFF]/;
  // 覆盖全部会换行的文字块：正文 / 参考文献 / 脚注 / 引文 / 旁注 / 身份栏各行 / 年份 / 小标题 / 标签卡
  var ORPHAN_SEL = [
    '.ar-flow > p:not(.ar-ref)', '.ar-ref', '.ar-fnlist p',
    '.ar-quote p', '.ar-note p',
    '.ar-identity__name', '.ar-identity__meta', '.ar-identity__no',
    '.ar-year', '.ar-h',
    '.ar-card'
  ].join(',');

  // 排版单元（文档顺序）：逐字统计，**递归下钻内联元素**（em/strong/span 可能跨行，
  // 若整块当一个单元会被算在首行、导致末行误判）；仅 <sup>/<sub> 脚注标记整体算 1 个；
  // 遇 <br> 视为作者硬换行，只保留其后的一段（卡片按 <br> 手动分行，不跨行绑定）。
  function collectUnits(node, units) {
    Array.prototype.forEach.call(node.childNodes, function (n) {
      if (n.nodeType === 1) {
        if (n.tagName === 'BR') { units.length = 0; return; }
        if (n.tagName === 'SUP' || n.tagName === 'SUB') { units.push({ node: null, el: n }); return; }
        collectUnits(n, units);
      } else if (n.nodeType === 3) {
        var t = n.nodeValue;
        for (var j = 0; j < t.length; j++) {
          if (/\s/.test(t[j]) || t[j] === WJ) continue;   // 空白与已有 WJ 不算字
          units.push({ node: n, idx: j });
        }
      }
    });
  }
  function tailUnits(el) { var u = []; collectUnits(el, u); return u; }
  // 在"后一个单元"紧前面插入 WJ：字符 → 拼进该文本节点；元素 → 插入 WJ 文本节点
  function insertWJBefore(u) {
    if (u.node) {
      var t = u.node.nodeValue;
      if (t[u.idx - 1] === WJ) return;             // 该断点已有 WJ，不重复插入
      u.node.nodeValue = t.slice(0, u.idx) + WJ + t.slice(u.idx);
    } else {
      var prev = u.el.previousSibling;
      if (prev && prev.nodeType === 3 && prev.nodeValue.slice(-1) === WJ) return;
      u.el.parentNode.insertBefore(document.createTextNode(WJ), u.el);
    }
  }
  // 把末尾 k 个单元绑定为不可断整体（在其内部 k-1 个断点插 WJ，从右往左插，低下标不受影响）
  function bindTail(el, k) {
    var units = tailUnits(el);
    if (units.length <= k) return false;           // 整段不够长，无从绑定
    for (var i = units.length - 1; i > units.length - k; i--) insertWJBefore(units[i]);
    return true;
  }

  // 末行排版单元数。取"最下面一行"时用行高容差聚类，
  // 否则 <sup> 脚注上标会把 rect 顶部抬高几个像素、被误判到上一行。
  function lastLineCount(el) {
    var us = tailUnits(el);
    if (!us.length) return -1;
    var r0 = document.createRange(); r0.selectNodeContents(el);
    var rects = r0.getClientRects();
    if (rects.length <= 1) return -2;              // 单行：不存在孤行
    var lh = parseFloat(getComputedStyle(el).lineHeight) || 24;
    var tol = lh * 0.35, range = document.createRange(), tops = [];
    for (var i = 0; i < us.length; i++) {
      var u = us[i], rc;
      if (u.node) { range.setStart(u.node, u.idx); range.setEnd(u.node, u.idx + 1); rc = range.getBoundingClientRect(); }
      else { rc = u.el.getBoundingClientRect(); }
      tops.push(rc.top);
    }
    var maxTop = Math.max.apply(null, tops), w = 0;
    for (var j = 0; j < tops.length; j++) if (tops[j] >= maxTop - tol) w += unitWeight(us[j]);
    return w;                                      // 末行"实字"数
  }

  // 单元的实字权重：字符单元按 REAL 判定；sup/sub 脚注标记为 0
  function unitWeight(u) {
    if (u.node) return REAL.test(u.node.nodeValue[u.idx]) ? 1 : 0;
    return 0;
  }

  // 基础绑定（不需要布局，可在插入 DOM 前调用）：
  // 从末尾往前累计实字，够 ORPHAN_MIN 个为止，把这一组单元绑成不可断整体。
  // 「琴⁴。」这类末行：。和⁴权重 0，会继续往前吃「键」「羽」，整组下移后末行 ≥3 实字。
  function guardOrphanEl(el) {
    if (el.textContent.indexOf(WJ) > -1) return;   // 幂等：已绑过不再处理
    var units = tailUnits(el), total = 0, k = 0, i;
    for (i = units.length - 1; i >= 0; i--) {
      total += unitWeight(units[i]); k++;
      if (total >= ORPHAN_MIN) break;
    }
    if (total < ORPHAN_MIN || k >= units.length) return;  // 全段实字不足 / 会绑住整段（无意义且可能溢出）
    for (i = units.length - 1; i > units.length - k; i--) insertWJBefore(units[i]);
  }
  function guardOrphans(root) {
    if (!root) return;
    Array.prototype.forEach.call(root.querySelectorAll(ORPHAN_SEL), guardOrphanEl);
  }
  // 加固：插入 DOM 后实测末行实字数，仍不足则逐级多绑一个单元（3 → 4 → … → ORPHAN_MAX）
  function enforceOrphans(root) {
    if (!root) return;
    Array.prototype.forEach.call(root.querySelectorAll(ORPHAN_SEL), function (el) {
      for (var k = ORPHAN_MIN; k < ORPHAN_MAX; k++) {
        var w = lastLineCount(el);
        if (w < 0 || w >= ORPHAN_MIN) return;      // 单行 / 太短 / 已达标
        if (!bindTail(el, k + 1)) return;          // 整段不够长，放弃
      }
    });
  }

  /* =========================================================
     4. RENDERER
     ========================================================= */

  function renderSpread(dir) {
    var page = state.pages[state.page];
    var cat = state.doc.category || 'other';

    // 分类色 → CSS 变量（§48：颜色由 category 决定）
    els.spread.style.setProperty('--ar-folder-color', 'var(' + (FOLDER_VAR[cat] || FOLDER_VAR.other) + ')');

    // ---- 左页（§4）----
    if (state.page === 0) {
      els.left.className = 'ar-page ar-page--left is-interior';
      els.left.innerHTML = '';
    } else {
      els.left.className = 'ar-page ar-page--left';
      els.left.innerHTML = '';
    }

    // ---- 右页：当前页（§3）----
    var flow = '';
    page.blocks.forEach(function (b) {
      if (b.type === 'text') flow += textHtml(b.raw, page);
      else if (b.type === 'identity') flow += identityHtml(b.raw);
      else if (b.type === 'facts') flow += factsHtml(b.raw);
      else if (b.type === 'quote') flow += quoteHtml(b.raw);
      else if (b.type === 'note') flow += noteHtml(b.raw);
      else if (b.type === 'year') flow += '<div class="ar-year">' + esc(b.raw.trim()) + '</div>';
      // photo / document 交给图片图层，不进文字流（§24）
    });
    if (page.defsHere && page.defsHere.length) {
      flow += '<div class="ar-fnlist">' + page.defsHere.map(function (k) {
        return '<p>' + fnNum(k) + '. ' + esc(state.defs[k] || '') + '</p>';
      }).join('') + '</div>';
    }
    els.right.innerHTML = '<div class="ar-flow">' + flow + '</div>';
    guardOrphans(els.right);   // 孤行防护：正文 / 引文 / 旁注

    // ---- 图片 / 卡片图层（与文字流独立，互不干涉） ----
    var items = buildItems(page);
    els.layer.innerHTML = '';
    var placed = [];
    items.forEach(function (it) {
      var el = it.kind === 'document' ? cardEl(it) : photoEl(it);
      if (it.kind === 'document') guardOrphanEl(el);   // 先绑末字再测量落位，避免重排后宽度变化导致偏移
      els.layer.appendChild(el);
      place(it, el);
      placed.push({ it: it, el: el });
      if (it.kind === 'photo') {
        // 图片异步加载后真实尺寸才确定：加载完成（或已缓存）再按中心点 + 边界钳制落位一次。
        // 用 naturalWidth 判定“已就绪”，保证缓存命中时也重新精确落位，不卡在 0 高度的错误位置。
        var img = el.querySelector('img');
        function relayout() { place(it, el); checkOverflow(); }
        if (img) {
          if (img.complete && img.naturalWidth) relayout();
          else { img.addEventListener('load', relayout, { once: true }); img.addEventListener('error', relayout, { once: true }); }
        }
      }
    });

    // ---- 孤行加固（需在 DOM 中实测末行；可能因重排改变卡片宽度，故随后重新落位）----
    enforceOrphans(els.right);
    enforceOrphans(els.layer);
    placed.forEach(function (p) { place(p.it, p.el); });

    // ---- 页码 / 印记 ----
    els.pageNum.textContent = 'PAGE ' + pad2(state.page + 1);
    els.stamp.textContent = (state.doc.id || '') + ' / ' + (CAT_CN[cat] || cat);

    // ---- 翻页动画（§42 / §43）----
    if (dir && !REDUCE) {
      var cls = dir > 0 ? 'ar-anim-next' : 'ar-anim-prev';
      [els.right, els.layer].forEach(function (el) {
        el.classList.remove('ar-anim-next', 'ar-anim-prev');
        void el.offsetWidth;
        el.classList.add(cls);
      });
      els.left.classList.remove('ar-anim-fade');
      void els.left.offsetWidth;
      els.left.classList.add('ar-anim-fade');
    }

    // ---- 溢出检测（§53 / §54）----
    checkOverflow();
  }

  function checkOverflow() {
    var flow = els.right.querySelector('.ar-flow');
    if (!flow) return;
    var over = flow.scrollHeight > flow.clientHeight + 2;
    if (over) {
      console.warn('[archive] PAGE ' + pad2(state.page + 1) + ' CONTENT OVERFLOW：请拆分 :::page 或减少内容');
    }
    if (!els.debug) return;
    var msgs = [];
    if (over) msgs.push('PAGE ' + pad2(state.page + 1) + ' CONTENT OVERFLOW');
    els.layer.querySelectorAll('.ar-photo, .ar-card').forEach(function (el) {
      var a = el.getBoundingClientRect(), b = els.layer.getBoundingClientRect();
      if (a.left < b.left - 1 || a.right > b.right + 1 || a.top < b.top - 1 || a.bottom > b.bottom + 1) {
        msgs.push('PHOTO OUT OF BOUNDS');
      }
    });
    if (msgs.length && DEBUG) {
      els.debug.hidden = false;
      els.debug.textContent = msgs.join(' · ');
    } else {
      els.debug.hidden = true;
    }
  }

  /* =========================================================
     5. CONTROLLER：翻页 / 拖动 / 放大 / 键盘 / 滑动
     ========================================================= */

  function go(delta) {
    var n = state.page + delta;
    if (n < 0 || n >= state.pages.length) return;   // §46 / §47：不循环
    state.page = n;
    renderSpread(delta);
  }

  function bindPhoto(el, item) {
    var drag = null, lastMoved = false;

    // 拖动结束后浏览器会补发 click：若刚发生过拖动，吞掉该 click 以免误触翻页（§58）
    el.addEventListener('click', function (e) {
      if (lastMoved) { e.stopPropagation(); e.preventDefault(); lastMoved = false; }
    });

    el.addEventListener('pointerdown', function (e) {
      if (e.pointerType === 'mouse' && e.button !== 0) return;
      drag = {
        id: e.pointerId, sx: e.clientX, sy: e.clientY,
        ox: parseFloat(el.style.left) || 0, oy: parseFloat(el.style.top) || 0,
        moved: false
      };
      el.setPointerCapture(e.pointerId);
      el.classList.add('is-dragging');
      e.preventDefault();
    });

    el.addEventListener('pointermove', function (e) {
      if (!drag || e.pointerId !== drag.id) return;
      var dx = e.clientX - drag.sx, dy = e.clientY - drag.sy;
      if (Math.abs(dx) + Math.abs(dy) > 3) drag.moved = true;
      var L = els.layer.clientWidth, H = els.layer.clientHeight;
      var left = Math.min(Math.max(drag.ox + dx, 0), Math.max(0, L - el.offsetWidth));
      var top = Math.min(Math.max(drag.oy + dy, 0), Math.max(0, H - el.offsetHeight));
      el.style.left = left + 'px';
      el.style.top = top + 'px';
      pxToGeom(item, el);      // 仅当前浏览状态，不写回 Markdown（§31）
    });

    function end(e) {
      if (!drag || e.pointerId !== drag.id) return;
      el.classList.remove('is-dragging');
      lastMoved = drag.moved;
      drag = null;
      if (!lastMoved && item.kind !== 'document') openLightbox(item);   // 卡片点击不放大；点击照片 = 放大查看（§34）
    }
    el.addEventListener('pointerup', end);
    el.addEventListener('pointercancel', end);
  }

  function openLightbox(item) {
    els.lbImg.src = item.src;
    els.lbImg.alt = item.caption || item.title || '';
    els.lbNo.textContent = 'FIG. ' + pad2(item.fig);
    els.lbCaption.textContent = [item.caption || item.title || '', item.date].filter(Boolean).join(' · ');
    els.lbDesc.textContent = item.description || '';
    els.lbSrc.textContent = item.source ? 'SOURCE — ' + item.source : '';
    els.lightbox.hidden = false;
  }
  function closeLightbox() { els.lightbox.hidden = true; }

  function bindUI() {
    // 点击左右半区翻页（§8），避开照片 / 标签卡 / 链接 / 按钮
    els.spread.addEventListener('click', function (e) {
      if (e.target.closest('.ar-photo, .ar-card, a, button')) return;   // 照片与标签卡都不触发翻页（卡片拖动/点击不翻页）
      var r = els.spread.getBoundingClientRect();
      go((e.clientX - r.left) < r.width / 2 ? -1 : 1);
    });

    // 键盘（§74）
    document.addEventListener('keydown', function (e) {
      if (!els.lightbox.hidden) {
        if (e.key === 'Escape') closeLightbox();
        return;
      }
      if (e.key === 'ArrowRight') { go(1); }
      else if (e.key === 'ArrowLeft') { go(-1); }
      else if (e.key === 'Escape') { location.href = '/archive/'; }
    });

    els.lightbox.addEventListener('click', function (e) {
      if (e.target === els.lightbox || e.target === els.lbClose) closeLightbox();
    });
    els.lbClose.addEventListener('click', closeLightbox);

    // 移动端滑动翻页（§57）
    var sx = 0, sy = 0, tracking = false;
    els.spread.addEventListener('pointerdown', function (e) {
      if (e.target.closest('.ar-photo, .ar-card')) return;   // 拖动照片 / 卡片时不触发滑动翻页
      tracking = true; sx = e.clientX; sy = e.clientY;
    });
    els.spread.addEventListener('pointerup', function (e) {
      if (!tracking) return;
      tracking = false;
      var dx = e.clientX - sx, dy = e.clientY - sy;
      if (Math.abs(dx) > 45 && Math.abs(dx) > Math.abs(dy)) go(dx < 0 ? 1 : -1);
    });

    // 视口变化：重新按比例落位（拖动位置按比例保留）
    var t = null;
    window.addEventListener('resize', function () {
      clearTimeout(t);
      t = setTimeout(function () { renderSpread(0); }, 120);
    });
  }

  /* =========================================================
     6. 载入
     ========================================================= */

  function fail(msg) {
    els.loading.textContent = msg;
    els.loading.style.display = 'flex';
  }

  function boot() {
    els = {
      stage: document.getElementById('arStage'), spread: document.getElementById('arSpread'),
      left: document.getElementById('arLeft'), right: document.getElementById('arRight'),
      layer: document.getElementById('arLayer'), pageNum: document.getElementById('arPageNum'),
      stamp: document.getElementById('arStamp'), debug: document.getElementById('arDebug'),
      loading: document.getElementById('arLoading'),
      lightbox: document.getElementById('arLightbox'), lbImg: document.getElementById('arLightboxImg'),
      lbNo: document.getElementById('arLightboxNo'), lbCaption: document.getElementById('arLightboxCaption'),
      lbDesc: document.getElementById('arLightboxDesc'), lbSrc: document.getElementById('arLightboxSrc'),
      lbClose: document.getElementById('arLightboxClose')
    };

    var id = new URLSearchParams(location.search).get('id') || 'PH-671B';

    fetch('/archive/content/manifest.json')
      .then(function (r) { return r.json(); })
      .then(function (mf) {
        var doc = (mf.docs || []).filter(function (d) { return d.id === id; })[0];
        if (!doc) throw new Error('未找到档案 ' + id);
        state.doc = doc;
        // 返回 → 对应分类的目录页（并定位到本档案所在跨页），而非档案馆主页
        var backEl = document.getElementById('arBack');
        if (backEl) {
          backEl.setAttribute('href', '/archive/?cat=' + encodeURIComponent(doc.category || 'other')
            + '&doc=' + encodeURIComponent(doc.id));
        }
        return fetch(doc.file);
      })
      .then(function (r) { if (!r.ok) throw new Error('档案读取失败'); return r.text(); })
      .then(function (text) {
        var parsed = parseFront(text);
        Object.keys(parsed.meta).forEach(function (k) {
          if (parsed.meta[k] && !state.doc[k]) state.doc[k] = parsed.meta[k];
        });
        state.pages = tokenize(parsed.body).map(function (p) {
          p.blocks = p.blocks.filter(function (b) {
            return b.raw.trim() || b.type === 'photo' || b.type === 'document';
          });
          return p;
        });
        if (!state.pages.length) throw new Error('档案没有 :::page');
        state.defs = collectDefs(state.pages);
        window.__archiveReader = state;   // 开发期调试入口（§54）
        document.title = (state.doc.id || '') + ' · ' + (state.doc.title || '') + ' · 那西索亚故事集';
        els.loading.style.display = 'none';
        renderSpread(0);
        bindUI();
      })
      .catch(function (e) { fail('档案无法打开：' + e.message); });
  }

  if (document.readyState === 'loading') document.addEventListener('DOMContentLoaded', boot);
  else boot();
})();
