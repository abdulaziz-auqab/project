/* حركة الصفحة: التمرير يقود كل شيء، والصفحة تعمل كاملة بلا حركة لمن طلب تقليلها */
(function () {
  'use strict';
  var RM = matchMedia('(prefers-reduced-motion: reduce)').matches;
  var MOB = matchMedia('(max-width: 760px)').matches;
  var NS = 'http://www.w3.org/2000/svg';
  var G = window.gsap, ST = window.ScrollTrigger;
  var $ = function (q, r) { return (r || document).querySelector(q); };
  var $$ = function (q, r) { return [].slice.call((r || document).querySelectorAll(q)); };
  var fmt = function (n, d) { return n.toLocaleString('en-US', { minimumFractionDigits: d || 0, maximumFractionDigits: d || 0 }); };
  var clamp = function (x, a, b) { return Math.max(a, Math.min(b, x)); };
  var smooth = function (t) { return t * t * (3 - 2 * t); };
  function el(tag, a, parent) { var e = document.createElementNS(NS, tag); for (var k in a) e.setAttribute(k, a[k]); if (parent) parent.appendChild(e); return e; }
  var MOTION = !!G && !!ST && !RM;
  if (MOTION) G.registerPlugin(ST);

  /* ---------- تمرير ناعم ---------- */
  if (MOTION && window.Lenis && !MOB) {
    var lenis = new Lenis({ lerp: 0.085, wheelMultiplier: 0.9 });
    lenis.on('scroll', ST.update);
    G.ticker.add(function (t) { lenis.raf(t * 1000); });
    G.ticker.lagSmoothing(0);
    $$('a[href^="#"]').forEach(function (a) {
      a.addEventListener('click', function (e) {
        var t = $(a.getAttribute('href')); if (!t) return;
        e.preventDefault(); lenis.scrollTo(t, { offset: 0, duration: 1.6 });
      });
    });
  }

  /* ---------- الشريط العلوي: يختفي نزولا ويظهر صعودا، ويعرف المشروع الحالي ---------- */
  var nav = $('#nav'), navBar = $('#navBar'), lastY = 0;
  addEventListener('scroll', function () {
    var y = scrollY;
    nav.classList.toggle('up', y > lastY + 4 && y > 400);
    if (y < lastY - 4) nav.classList.remove('up');
    lastY = y;
  }, { passive: true });
  $$('[data-ch]').forEach(function (sec) {
    if (!sec.id) return;
    var link = $('.nav-links a[data-ch="' + sec.id + '"]');
    var ac = getComputedStyle(sec).getPropertyValue('--ac').trim();
    var set = function (on) { if (link) link.classList.toggle('on', on); if (on) nav.style.setProperty('--nav-ac', ac); };
    if (ST) ST.create({ trigger: sec, start: 'top 55%', end: 'bottom 55%', onToggle: function (s) { set(s.isActive); }, onUpdate: function (s) { navBar.style.transform = 'scaleX(' + s.progress.toFixed(3) + ')'; } });
  });

  /* ---------- البداية ---------- */
  if (MOTION) {
    G.from('.hero-t .ln > span', { yPercent: 105, duration: 1.2, ease: 'power4.out', stagger: 0.12, delay: 0.15 });
    G.from(['.hero-who', '.hero-sub', '.hero-foot'], { opacity: 0, y: 18, duration: 1, ease: 'power3.out', stagger: 0.1, delay: 0.45 });
    G.from('.hero-media img', { scale: 1.12, duration: 2.4, ease: 'power2.out' });
    G.timeline({ scrollTrigger: { trigger: '.hero', start: 'top top', end: 'bottom top', scrub: true } })
      .to('.hero-media img', { yPercent: 12, scale: 1.08, ease: 'none' }, 0)
      .to(['.hero-copy', '.hero-foot'], { opacity: 0, y: -60, ease: 'none' }, 0);
  }

  /* ---------- الأرض: الكاميرا تقترب من الفضاء إلى المملكة مع التمرير ---------- */
  (function earth() {
    var host = $('#globe'), stage = $('#earthStage');
    var cnt = {}; DEP.forEach(function (d) { cnt[d[0]] = d[2]; });
    // موضع الاسم من النقطة حيث تتزاحم المدن: يسار أو يمين أو فوق، والباقي تحتها
    var SIDE = { 'Jeddah': 'l', 'Makkah': 'b', 'Taif': 'r', 'Eastern': 'u', 'Al-Ahsa': 'b', 'Northern Borders': 'u', 'Al-Jouf': 'l', 'Tabuk': 'l', 'Madinah': 'l', 'Jazan': 'l', 'Najran': 'r', 'Asir': 'l', 'Al-Baha': 'l' };
    var dots = DEPTS.map(function (d) { var n = cnt[d[0]] || 0; return { lat: d[3], lon: d[2], label: d[0], s: SIDE[d[0]] || 'b', r: (4 + Math.sqrt(n / 6747) * 9).toFixed(1) }; });
    var K = [
      [0, { lat: 8, lon: 34, aimLat: 15, aimLon: 30, bearing: 172, tilt: 4, dist: 3.6, fov: 30 }],
      [0.38, { lat: 17, lon: 44, aimLat: 24, aimLon: 45, bearing: 175, tilt: 28, dist: 1.7, fov: 28 }],
      [0.68, { lat: 23, lon: 46, aimLat: 28.5, aimLon: 46.2, bearing: 175, tilt: 50, dist: 1.15, fov: 28 }],
      [1, { lat: 19.6, lon: 44.6, aimLat: 24.4, aimLon: 44.8, bearing: 172, tilt: 44, dist: 0.66, fov: 30 }],
    ];
    function poseAt(p) {
      for (var i = 1; i < K.length; i++) if (p <= K[i][0] || i === K.length - 1) break;
      var a = K[i - 1], b = K[i], t = smooth(clamp((p - a[0]) / (b[0] - a[0]), 0, 1)), o = {};
      for (var k in a[1]) o[k] = a[1][k] + (b[1][k] - a[1][k]) * t;
      return o;
    }
    var art = window.EarthArt && EarthArt.create(host, { assets: window.EARTH_ASSETS || 'earth/', view: Object.assign({}, K[2][1]), dots: dots, exposure: 0.74, sun: { az: 238, el: 30 }, maxDpr: MOB ? 1.5 : 2, parallax: !MOB });
    if (!art || !art.ok) {
      document.documentElement.classList.add('no-gl');
      $('#fbKsa').setAttribute('d', KSA);
    }
    var steps = $$('.es', stage), count = $('#leadersCount'), prog = $('#earthProg');
    function apply(p) {
      if (art && art.ok) { art.pose(poseAt(p)); art.dots(p > 0.6); host.classList.toggle('ea-lbl', p > 0.8 && !MOB || p > 0.86); }
      steps.forEach(function (s) {
        var a = +s.dataset.from, b = +s.dataset.to, f = 0.05;
        var o = clamp(Math.min(a <= 0 ? 1 : (p - a) / f, (b - p) / f), 0, 1);
        s.style.opacity = o; s.style.translate = '0 ' + ((1 - o) * 24).toFixed(1) + 'px'; s.classList.toggle('on', o > 0);
      });
      var q = smooth(clamp((p - 0.34) / 0.22, 0, 1)); count.textContent = fmt(Math.round(300 * q) * 100) + (q >= 0.999 ? '+' : '');
      prog.style.transform = 'scaleX(' + p.toFixed(3) + ')';
    }
    if (art && art.ok) art.pose(poseAt(MOTION ? 0 : 1), true);
    if (MOTION) {
      ST.create({ trigger: stage, start: 'top top', end: '+=' + (MOB ? 260 : 340) + '%', pin: true, scrub: true, onUpdate: function (s) { apply(s.progress); } });
      apply(0);
    } else {
      apply(1); steps.forEach(function (s) { s.style.opacity = 1; s.classList.add('on'); });
      steps[0].style.display = 'none';
    }
  })();

  /* ---------- غلاف كل مشروع: بطاقة صغيرة تكبر حتى تملأ الشاشة، ثم يصعد العنوان ---------- */
  if (MOTION) $$('.cover').forEach(function (c) {
    var media = $('.cover-media', c), img = $('img', media), lines = $$('.mega .ln > span', c);
    var ins = MOB ? '14% 6% 30% 6%' : '16% 20% 22% 20%';
    G.set(media, { clipPath: 'inset(' + ins + ' round 32px)' });
    G.set(lines, { yPercent: 110 });
    G.set([$('.eyebrow', c), $('.cover-sub', c)], { opacity: 0, y: 20 });
    G.set($('.cover-shade', c), { opacity: 0 });
    G.timeline({ scrollTrigger: { trigger: c, start: 'top top', end: '+=' + (MOB ? 110 : 150) + '%', pin: true, scrub: 0.6 } })
      .fromTo(media, { clipPath: 'inset(' + ins + ' round 32px)' }, { clipPath: 'inset(0% 0% 0% 0% round 0px)', ease: 'power1.inOut', duration: 1 }, 0)
      .fromTo(img, { scale: 1.35 }, { scale: 1, ease: 'power1.out', duration: 1.4 }, 0)
      .to($('.cover-shade', c), { opacity: 1, duration: 0.5 }, 0.55)
      .to($('.eyebrow', c), { opacity: 1, y: 0, duration: 0.3 }, 0.7)
      .to(lines, { yPercent: 0, duration: 0.45, ease: 'power3.out', stagger: 0.08 }, 0.75)
      .to($('.cover-sub', c), { opacity: 1, y: 0, duration: 0.35 }, 1.05);
    // قبل التثبيت: البطاقة تقترب من الأسفل، فتبدو الصورة قادمة من الصفحة التالية
    G.fromTo(media, { yPercent: 18 }, { yPercent: 0, ease: 'none', scrollTrigger: { trigger: c, start: 'top bottom', end: 'top top', scrub: true } });
  });

  /* ---------- الفقرة الرئيسة: تضيء كلمة كلمة مع التمرير ---------- */
  $$('.reveal-words').forEach(function (p) {
    var words = p.textContent.trim().split(/\s+/);
    p.innerHTML = words.map(function (w) { return '<span class="w">' + w.replace(/[&<>]/g, '') + '</span>'; }).join(' ');
    var ws = $$('.w', p);
    if (!MOTION) { ws.forEach(function (w) { w.classList.add('lit'); }); return; }
    ST.create({ trigger: p, start: 'top 82%', end: 'bottom 45%', scrub: true, onUpdate: function (s) {
      var n = Math.round(s.progress * ws.length);
      ws.forEach(function (w, i) { w.classList.toggle('lit', i < n); });
    } });
  });

  /* ---------- الأرقام: تعد مرة واحدة حين تظهر ---------- */
  $$('[data-count]').forEach(function (b) {
    var to = +b.dataset.count, dec = +(b.dataset.dec || 0), suf = (b.dataset.pct ? '%' : '') + (b.dataset.plus ? '+' : '');
    var show = function (v) { b.textContent = fmt(v, dec) + suf; };
    if (!MOTION || to === 0) { show(to); return; }
    var o = { v: 0 }; show(0);
    ST.create({ trigger: b, start: 'top 88%', once: true, onEnter: function () {
      G.to(o, { v: to, duration: to > 1000 ? 1.8 : 1.3, ease: 'power3.out', onUpdate: function () { show(dec ? o.v : Math.round(o.v)); } });
    } });
  });
  function grow(targets, trigger, opts) {
    if (!MOTION) return;
    G.from(targets, Object.assign({ scaleX: 0, transformOrigin: '100% 50%', duration: 1.1, ease: 'power3.out', stagger: 0.05, scrollTrigger: { trigger: trigger, start: 'top 80%', once: true } }, opts || {}));
  }
  $$('.hbars').forEach(function (h) { grow($$('.tr i', h), h, { stagger: 0.25, duration: 1.4 }); });
  if (MOTION) $$('.tile, .panel, .honor > *').forEach(function (t) {
    G.from(t, { opacity: 0, y: 40, duration: 0.9, ease: 'power3.out', scrollTrigger: { trigger: t, start: 'top 90%', once: true } });
  });

  /* ---------- الإدارات ---------- */
  (function deps() {
    var DMAX = 7000;
    $('#deps').innerHTML = DEP.map(function (d) {
      return '<div class="dep"><span class="nm">' + d[0] + '</span><div class="tr"><i class="base" style="width:' + (d[2] / DMAX * 100).toFixed(2) + '%"></i><i class="plc" style="width:' + (d[3] / DMAX * 100).toFixed(2) + '%"></i></div><span class="v"><b>' + '~' + fmt(Math.round(d[3]/100)*100) + '</b> / ~' + fmt(Math.round(d[2]/100)*100) + '</span></div>';
    }).join('');
    grow($$('#deps .tr i'), '#deps', { stagger: 0.03 });
  })();

  /* ---------- ADKAR: لقطات المنتج وقاعدة التعثر ---------- */
  $$('.shot-tabs button').forEach(function (b) {
    b.addEventListener('click', function () {
      $$('.shot-tabs button').forEach(function (x) { x.setAttribute('aria-selected', x === b); });
      $$('.shot').forEach(function (s) { s.classList.toggle('on', s.dataset.shot === b.dataset.shot); });
    });
  });
  if (MOTION) G.fromTo('.browser', { rotateX: 18, scale: 0.88, opacity: 0.4, transformPerspective: 1600, transformOrigin: '50% 100%' }, { rotateX: 0, scale: 1, opacity: 1, ease: 'none', scrollTrigger: { trigger: '.browser', start: 'top 95%', end: 'top 35%', scrub: true } });
  (function adkar() {
    var NAMES = ['Awareness', 'Desire', 'Knowledge', 'Ability', 'Reinforcement'], sc = [4, 3, 2, 3, 1], box = $('#adk'), out = $('#adkOut');
    box.innerHTML = NAMES.map(function (n, i) {
      return '<div class="stg" data-i="' + i + '"><h4>' + n + '</h4><div class="sc"><button type="button" data-d="1" aria-label="Raise ' + n + '">+</button><b></b><button type="button" data-d="-1" aria-label="Lower ' + n + '">−</button></div><span class="tg"></span></div>';
    }).join('');
    function paint() {
      var stuck = sc.findIndex(function (v) { return v < 3; });
      $$('.stg', box).forEach(function (s, i) {
        $('b', s).textContent = sc[i];
        $('[data-d="1"]', s).disabled = sc[i] >= 5; $('[data-d="-1"]', s).disabled = sc[i] <= 1;
        s.classList.toggle('stuck', i === stuck); s.classList.toggle('wait', stuck >= 0 && i > stuck);
        $('.tg', s).textContent = i === stuck ? 'Blocking point' : stuck >= 0 && i > stuck ? 'Waiting' : 'Passed';
      });
      out.textContent = stuck < 0 ? 'No blocker: every stage is at 3 or above, so the directorate moves to follow-up.' : 'This directorate is now working on "' + NAMES[stuck] + '"; later stages wait until it is resolved.';
    }
    box.addEventListener('click', function (e) {
      var b = e.target.closest('button'); if (!b) return;
      var i = +b.closest('.stg').dataset.i; sc[i] = clamp(sc[i] + +b.dataset.d, 1, 5); paint();
    });
    paint();
  })();

  /* ---------- الانتداب: الأسابيع والمسارات ---------- */
  (function weeks() {
    var svg = $('#weeks'), W0 = 30, W1 = 890, H0 = 230, MAXV = 30, bw = (W1 - W0) / WEEKS.length, bars = [];
    var xAt = function (i) { return W0 + i * bw; };
    el('line', { x1: W0, x2: W1, y1: H0, y2: H0, class: 'ax' }, svg);
    WEEKS.forEach(function (v, i) {
      var x = xAt(i) + bw * 0.18, h = Math.max(v / MAXV * 170, v ? 2 : 0), peak = i === 5 || i === 6;
      bars.push(el('rect', { x: x, y: H0 - h, width: bw * 0.64, height: h, rx: 5, class: peak ? 'barp' : 'bar' }, svg));
      el('text', { x: x + bw * 0.32, y: H0 - h - 8, 'text-anchor': 'middle', class: 'v' }, svg).textContent = v;
      el('text', { x: x + bw * 0.32, y: H0 + 22, 'text-anchor': 'middle' }, svg).textContent = i + 1;
    });
    [[0, 4, 'Oct'], [5, 9, 'Nov'], [10, 13, 'Dec']].forEach(function (m) {
      el('text', { x: (xAt(m[0]) + bw + xAt(m[1])) / 2, y: H0 + 50, 'text-anchor': 'middle' }, svg).textContent = m[2];
    });
    var a = xAt(6) + bw * 0.1, b = xAt(5) + bw * 0.9, by = H0 - 28 / MAXV * 170 - 34;
    var br = el('path', { d: 'M' + a + ',' + (by + 8) + ' V' + by + ' H' + b + ' V' + (by + 8), class: 'br' }, svg);
    var note = el('text', { x: (a + b) / 2, y: by - 10, 'text-anchor': 'middle', class: 'note' }, svg); note.textContent = 'Weeks 6–7: about 55 missions (over 40%)';
    if (MOTION) {
      G.from(bars, { scaleY: 0, transformOrigin: '50% 100%', duration: 0.9, ease: 'power3.out', stagger: 0.05, scrollTrigger: { trigger: svg, start: 'top 80%', once: true } });
      G.from([br, note], { opacity: 0, y: 10, duration: 0.6, delay: 0.9, scrollTrigger: { trigger: svg, start: 'top 80%', once: true } });
    }
  })();
  function curve(p, q, bend) {
    var mx = (p[0] + q[0]) / 2, my = (p[1] + q[1]) / 2, dx = q[0] - p[0], dy = q[1] - p[1];
    return 'M' + p[0].toFixed(1) + ',' + p[1].toFixed(1) + ' Q' + (mx - dy * bend).toFixed(1) + ',' + (my + dx * bend).toFixed(1) + ' ' + q[0].toFixed(1) + ',' + q[1].toFixed(1);
  }
  function drawOn(paths, trigger) {
    paths.forEach(function (p) { var L = p.getTotalLength(); p.style.strokeDasharray = L; p.style.strokeDashoffset = MOTION ? L : 0; });
    if (MOTION) G.to(paths, { strokeDashoffset: 0, ease: 'none', stagger: 0.02, scrollTrigger: { trigger: trigger, start: 'top 75%', end: 'bottom 55%', scrub: 0.5 } });
  }
  (function routes() {
    var svg = $('#routes'); el('path', { d: KSA, class: 'ksa' }, svg);
    var rg = el('g', {}, svg), cg = el('g', {}, svg), seen = {}, lines = [];
    ROUTES.forEach(function (r, i) {
      var a = P.apply(null, CITY[r[0]]), b = P.apply(null, CITY[r[1]]);
      lines.push(el('path', { d: curve(a, b, i % 2 ? 0.22 : -0.22), class: 'rt', 'stroke-width': (1 + r[2] * 0.5).toFixed(2) }, rg));
      [[r[1], b, 'hall', 5]].concat([[r[0], a, 'cty', 3.2]]).forEach(function (c) { var k = c[0] + c[2]; if (seen[k]) return; seen[k] = 1; el('circle', { cx: c[1][0], cy: c[1][1], r: c[3], class: c[2] }, cg); });
    });
    drawOn(lines, svg);
  })();

  /* ---------- القيادات: الشبكة والمصفوفة ---------- */
  (function net() {
    var svg = $('#net'), HUB = P(46.72, 24.71); el('path', { d: KSA, class: 'ksa' }, svg);
    var g1 = el('g', {}, svg), g2 = el('g', {}, svg), g3 = el('g', {}, svg), links = [], nodes = [];
    var LBL = { 'Jeddah': [-12, -4, 'start'], 'Makkah': [0, 24, 'middle'], 'Taif': [10, -10, 'end'], 'Najran': [12, 5, 'end'], 'Al-Baha': [12, 5, 'end'], 'Asir': [12, 5, 'end'], 'Jazan': [-12, 5, 'start'], 'Al-Ahsa': [-12, 5, 'start'], 'Eastern': [12, 5, 'end'] };
    DEPTS.forEach(function (d, i) {
      if (!i) return;
      var p = P(d[2], d[3]), o = LBL[d[0]] || [0, -12, 'middle'];
      links.push(el('path', { d: curve(HUB, p, 0.18), class: 'link' }, g1));
      nodes.push(el('circle', { cx: p[0], cy: p[1], r: 6, class: 'node' }, g2));
      el('text', { x: p[0] + o[0], y: p[1] + o[1], 'text-anchor': o[2] }, g3).textContent = d[0];
    });
    el('circle', { cx: HUB[0], cy: HUB[1], r: 11, class: 'hub' }, g2);
    el('text', { x: HUB[0], y: HUB[1] + 32, 'text-anchor': 'middle', class: 'h' }, g3).textContent = 'HQ · Riyadh';
    drawOn(links, svg);
    if (MOTION) G.from(nodes, { scale: 0, transformOrigin: '50% 50%', duration: 0.5, stagger: 0.04, ease: 'back.out(2)', scrollTrigger: { trigger: svg, start: 'top 60%', once: true } });

    var mx = $('#mx'), h = '<span></span>' + ROLES.map(function (r) { return '<span class="h">' + r[1] + '</span>'; }).join('');
    DEPTS.forEach(function (d) { h += '<span class="rn">' + d[0] + '</span>'; for (var j = 0; j < 7; j++) h += '<i class="c"></i>'; });
    mx.innerHTML = h;
    var cells = $$('.c', mx);
    if (!MOTION) cells.forEach(function (c) { c.classList.add('on'); });
    else ST.create({ trigger: mx, start: 'top 75%', end: 'bottom 60%', scrub: true, onUpdate: function (s) {
      var n = Math.round(s.progress * cells.length);
      cells.forEach(function (c, i) { var r = Math.floor(i / 7), k = (i % 7) * 16 + r; c.classList.toggle('on', k < n); });
    } });
  })();

  /* ---------- جسور: القاعة تمتلئ مع التمرير ---------- */
  (function hall() {
    var svg = $('#hall'), seats = [];
    el('rect', { x: 300, y: 14, width: 300, height: 46, rx: 10, class: 'stage' }, svg);
    el('text', { x: 450, y: 43, 'text-anchor': 'middle', class: 'stage-t' }, svg).textContent = 'Stage';
    for (var r = 0; r < 9; r++) for (var s = 0; s < 18; s++) {
      if (s === 8 || s === 9) continue;   // الممر
      var x = 75 + s * 42 + (s > 9 ? -6 : s < 8 ? 6 : 0), y = 100 + r * 36;
      var zone = r < 2 ? 1 : r < 5 ? 2 : 3, filled = !(r === 8 && (s < 3 || s > 14)) && !(r === 7 && s > 15);
      seats.push({ e: el('rect', { x: x, y: y, width: 30, height: 24, rx: 6, class: 'seat' }, svg), z: zone, f: filled });
    }
    var stepsEl = $$('#hallSteps li');
    function at(p) {
      var st = Math.min(4, Math.floor(p * 5.2));
      stepsEl.forEach(function (li, i) { li.classList.toggle('on', i <= st); });
      var vis = clamp((p - 0.2) / 0.25, 0, 1), fill = clamp((p - 0.5) / 0.35, 0, 1), n = Math.round(fill * seats.length);
      seats.forEach(function (o, i) { o.e.style.opacity = i < vis * seats.length ? 1 : 0.15; o.e.setAttribute('class', 'seat' + (o.f && i < n ? ' z' + o.z : '')); });
    }
    if (!MOTION) { at(1); return; }
    at(0);
    ST.create({ trigger: svg, start: 'top 85%', end: 'bottom 45%', scrub: true, onUpdate: function (s) { at(s.progress); } });
  })();

  /* ---------- البريد ---------- */
  $('#copyMail').addEventListener('click', function () {
    var b = this; navigator.clipboard && navigator.clipboard.writeText('abdulaziz.au.alharbi@gmail.com').then(function () { b.textContent = 'Copied'; setTimeout(function () { b.textContent = 'Copy email'; }, 2000); });
  });

  /* ---------- مصادر الصور ---------- */
  if (window.CREDITS && CREDITS.length) {
    var cr = $('#credits'); cr.append('Photos: ');
    CREDITS.forEach(function (c, i) {
      var a = document.createElement('a'); a.href = c.url; a.target = '_blank'; a.rel = 'noopener'; a.textContent = c.author;
      cr.append(a, ' (' + c.license + ')' + (i < CREDITS.length - 1 ? ', ' : '.'));
    });
  }

  if (ST) addEventListener('load', function () { ST.refresh(); });
})();
