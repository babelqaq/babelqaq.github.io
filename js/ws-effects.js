/* =========================================================
 * 兀孀的个人博客 · 少女风互动特效  ws-effects.js
 * 1) 鼠标点击 -> 猫爪粒子爆开（Canvas 手绘肉垫+四趾）
 * 2) 樱花飘落背景（仅背景层，不遮挡文章卡片与正文）
 * 性能：移动端降级 / prefers-reduced-motion 关闭 / 标签页隐藏时暂停
 * ========================================================= */
(function () {
  'use strict';

  var reduceMotion = window.matchMedia &&
    window.matchMedia('(prefers-reduced-motion: reduce)').matches;
  if (reduceMotion) return;

  var isMobile = window.innerWidth < 768;
  var DPR = Math.min(window.devicePixelRatio || 1, 2);

  /* 猫爪专用：只用深浅不一的粉色（深→浅） */
  var PAW_PALETTE = ['#D96A96', '#E47DA4', '#ED93B1', '#F3A2BE', '#FFB7CF', '#FFCADD', '#FFDCE9'];

  function rand(a, b) { return a + Math.random() * (b - a); }
  function pick(arr) { return arr[(Math.random() * arr.length) | 0]; }

  /* ---------- 通用：创建全屏 canvas ---------- */
  function makeCanvas(id, zIndex) {
    var c = document.createElement('canvas');
    c.id = id;
    c.style.cssText =
      'position:fixed;top:0;left:0;width:100%;height:100%;' +
      'pointer-events:none;z-index:' + zIndex + ';';
    document.body.appendChild(c);
    return c;
  }

  function fitCanvas(canvas, ctx) {
    var w = window.innerWidth, h = window.innerHeight;
    canvas.width = w * DPR;
    canvas.height = h * DPR;
    ctx.setTransform(DPR, 0, 0, DPR, 0, 0);
    return { w: w, h: h };
  }

  /* =========================================================
   * 一、猫爪点击粒子
   * ========================================================= */
  var pawCanvas = makeCanvas('ws-paw-canvas', 9998);
  var pawCtx = pawCanvas.getContext('2d');
  var pawSize = fitCanvas(pawCanvas, pawCtx);
  var paws = [];
  var pawRAF = null;

  /* 手绘猫爪：大肉垫 + 4 个趾垫 */
  function drawPaw(ctx, x, y, size, rot, color, alpha) {
    ctx.save();
    ctx.translate(x, y);
    ctx.rotate(rot);
    ctx.scale(size, size);
    ctx.globalAlpha = alpha;
    ctx.fillStyle = color;

    // 主肉垫（心形偏圆的椭圆）
    ctx.beginPath();
    ctx.moveTo(0, 0.62);
    ctx.bezierCurveTo(-0.78, 0.62, -0.72, -0.22, -0.30, -0.18);
    ctx.bezierCurveTo(-0.10, -0.14, 0.10, -0.14, 0.30, -0.18);
    ctx.bezierCurveTo(0.72, -0.22, 0.78, 0.62, 0, 0.62);
    ctx.closePath();
    ctx.fill();

    // 四个趾垫
    var toes = [
      [-0.62, -0.44, 0.20, 0.26],
      [-0.24, -0.74, 0.19, 0.25],
      [ 0.24, -0.74, 0.19, 0.25],
      [ 0.62, -0.44, 0.20, 0.26]
    ];
    for (var i = 0; i < toes.length; i++) {
      var t = toes[i];
      ctx.beginPath();
      ctx.ellipse(t[0], t[1], t[2], t[3], 0, 0, Math.PI * 2);
      ctx.fill();
    }
    ctx.restore();
  }

  function spawnPaws(x, y) {
    var n = isMobile ? 5 : 7;
    for (var i = 0; i < n; i++) {
      var ang = (Math.PI * 2 * i) / n + rand(-0.35, 0.35);
      var sp = rand(1.1, 2.4);                     // 爆开速度放慢（原 2.6-5.6）
      paws.push({
        x: x, y: y,
        vx: Math.cos(ang) * sp,
        vy: Math.sin(ang) * sp - rand(0.5, 1.2),   // 向上初速也更柔和
        size: rand(9, 17),
        rot: rand(0, Math.PI * 2),
        vr: rand(-0.08, 0.08),                     // 自旋随速度同步放慢
        color: pick(PAW_PALETTE),
        life: 1
      });
    }
    if (!pawRAF) pawRAF = requestAnimationFrame(pawLoop);
  }

  function pawLoop() {
    pawCtx.clearRect(0, 0, pawSize.w, pawSize.h);
    for (var i = paws.length - 1; i >= 0; i--) {
      var p = paws[i];
      p.vy += 0.055;         // 重力减弱 -> 下落更慢（原 0.20）
      p.vx *= 0.985;         // 阻尼
      p.x += p.vx;
      p.y += p.vy;
      p.rot += p.vr;
      p.life -= 0.010;       // 寿命拉长，配合慢速漂落（原 0.016）
      if (p.life <= 0 || p.y > pawSize.h + 40) {
        paws.splice(i, 1);
        continue;
      }
      drawPaw(pawCtx, p.x, p.y, p.size, p.rot, p.color,
        Math.max(0, Math.min(1, p.life)));
    }
    if (paws.length) {
      pawRAF = requestAnimationFrame(pawLoop);
    } else {
      pawCtx.clearRect(0, 0, pawSize.w, pawSize.h);
      pawRAF = null;
    }
  }

  document.addEventListener('click', function (e) {
    // 忽略非主键与合成事件
    if (e.button !== 0) return;
    spawnPaws(e.clientX, e.clientY);
  }, { passive: true });

  /* =========================================================
   * 二、樱花飘落背景（z-index:0，位于所有内容之下）
   * ========================================================= */
  var skCanvas = makeCanvas('ws-sakura-canvas', -1);
  var skCtx = skCanvas.getContext('2d');
  var skSize = fitCanvas(skCanvas, skCtx);

  var PETAL_COUNT = isMobile ? 12 : 26;
  var petals = [];

  function makePetal(initial) {
    return {
      x: rand(0, skSize.w),
      y: initial ? rand(-skSize.h, skSize.h) : rand(-120, -20),
      r: rand(6, 13),
      vy: rand(0.45, 1.25),
      sway: rand(0.4, 1.3),
      swayPhase: rand(0, Math.PI * 2),
      swaySpeed: rand(0.008, 0.022),
      rot: rand(0, Math.PI * 2),
      vr: rand(-0.012, 0.012),
      flip: rand(0.55, 1),
      flipSpeed: rand(0.006, 0.016),
      flipPhase: rand(0, Math.PI * 2),
      color: pick(['#FFD3E2', '#FFC2D8', '#FBB6CE', '#FFE2EC', '#F6D9F0']),
      alpha: rand(0.35, 0.72)
    };
  }

  for (var i = 0; i < PETAL_COUNT; i++) petals.push(makePetal(true));

  /* 单片花瓣形状：一端尖、一端带小缺口 */
  function drawPetal(ctx, p) {
    ctx.save();
    ctx.translate(p.x, p.y);
    ctx.rotate(p.rot);
    ctx.scale(Math.cos(p.flipPhase) * p.flip || 0.08, 1); // 翻转产生立体感
    ctx.globalAlpha = p.alpha;
    ctx.fillStyle = p.color;

    var r = p.r;
    ctx.beginPath();
    ctx.moveTo(0, -r);
    ctx.bezierCurveTo(r * 0.72, -r * 0.62, r * 0.62, r * 0.55, 0, r);
    ctx.bezierCurveTo(-r * 0.62, r * 0.55, -r * 0.72, -r * 0.62, 0, -r);
    ctx.closePath();
    ctx.fill();

    // 花瓣尖端小缺口
    ctx.globalAlpha = p.alpha * 0.55;
    ctx.beginPath();
    ctx.moveTo(0, r);
    ctx.quadraticCurveTo(r * 0.12, r * 0.7, 0, r * 0.62);
    ctx.quadraticCurveTo(-r * 0.12, r * 0.7, 0, r);
    ctx.fill();

    ctx.restore();
  }

  var skRAF = null;
  var running = true;

  function sakuraLoop() {
    skCtx.clearRect(0, 0, skSize.w, skSize.h);
    for (var i = 0; i < petals.length; i++) {
      var p = petals[i];
      p.swayPhase += p.swaySpeed;
      p.flipPhase += p.flipSpeed;
      p.x += Math.sin(p.swayPhase) * p.sway;
      p.y += p.vy;
      p.rot += p.vr;

      if (p.y > skSize.h + 30 || p.x < -60 || p.x > skSize.w + 60) {
        petals[i] = makePetal(false);
        continue;
      }
      drawPetal(skCtx, p);
    }
    if (running) skRAF = requestAnimationFrame(sakuraLoop);
  }
  skRAF = requestAnimationFrame(sakuraLoop);

  /* ---------- 窗口/可见性 ---------- */
  var resizeTimer = null;
  window.addEventListener('resize', function () {
    clearTimeout(resizeTimer);
    resizeTimer = setTimeout(function () {
      pawSize = fitCanvas(pawCanvas, pawCtx);
      skSize = fitCanvas(skCanvas, skCtx);
    }, 180);
  });

  document.addEventListener('visibilitychange', function () {
    if (document.hidden) {
      running = false;
      if (skRAF) { cancelAnimationFrame(skRAF); skRAF = null; }
    } else if (!running) {
      running = true;
      skRAF = requestAnimationFrame(sakuraLoop);
    }
  });
})();
