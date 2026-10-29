/*!
 * earth-art.js: المملكة من المدار بكاميرا حقيقية، لصفحات الواجهة (الدخول وما يشبهها).
 * مرور واحد لكل بكسل: شعاع من الكاميرا يقابل الكرة، ثم الإضاءة بالفيزياء التقريبية:
 *   ألوان الأرض بالخطي، وتضاريس من الارتفاع (ميل كل نقطة يغير زاوية الشمس عليها)،
 *   وبريق الشمس على الماء، والغلاف الجوي على الأفق وفوق الأرض، ثم ضغط ألوان سينمائي.
 * بلا مكتبات، ويرسم عند الحاجة فقط.
 *
 *   EarthArt.create(element, { assets: '/_eld/', dots: [{ lat, lon, label }] })
 */
(function (root) {
  'use strict';
  const RAD = Math.PI / 180;

  const FS = `#version 300 es
precision highp float;
out vec4 o;
uniform vec2 uRes;uniform vec3 uC;uniform mat3 uCam;uniform float uTan;
uniform sampler2D uDay,uDayK,uRel,uRelK,uSdf,uDayM,uRelM;
uniform vec4 uWin,uWinM;uniform vec3 uMix;uniform vec2 uMixM;   // المملكة: صورتها وتضاريسها وحدودها، وما حولها: صورته وتضاريسه
uniform vec3 uL;uniform float uExag,uExp,uSdfK,uSpace;
const float PI=3.14159265;
vec3 aces(vec3 x){return clamp((x*(2.51*x+.03))/(x*(2.43*x+.59)+.14),0.,1.);}
float hash(vec2 p){vec3 q=fract(vec3(p.xyx)*.1031);q+=dot(q,q.yzx+33.33);return fract((q.x+q.y)*q.z);}
void main(){
  vec2 q=gl_FragCoord.xy/uRes*2.-1.;
  vec3 d=normalize(uCam*vec3(q.x*uTan*uRes.x/uRes.y,q.y*uTan,1.));
  float b=dot(uC,d),c=dot(uC,uC)-1.,h=b*b-c;
  float tc=max(-b,0.);vec3 pc=uC+tc*d;float dm=length(pc);
  // الفضاء: كحلي شبه أسود ونجوم خافتة
  vec3 space=vec3(.0035,.008,.02)*uSpace;
  vec2 cell=floor(gl_FragCoord.xy/2.);float s=hash(cell);
  if(s>.9992){float v=hash(cell+7.1);space+=vec3(.25+.6*v*v)*.6;}
  // الغلاف الجوي خارج الكرة: أقربه إلى الأرض أكثفه، وجهة الشمس أضوأ
  vec3 sunDir=uL;float sunSide=max(dot(normalize(pc),sunDir),0.);
  float glow=exp(-max(dm-1.,0.)/.016);
  vec3 atm=vec3(.25,.5,1.)*glow*(.12+1.6*sunSide)+vec3(.55,.75,1.)*exp(-max(dm-1.,0.)/.0035)*(.2+1.2*sunSide);
  vec3 col=space+atm;
  if(h>0.){
    float t=-b-sqrt(h);vec3 n=uC+t*d;
    float lat=asin(clamp(n.z,-1.,1.)),lon=atan(n.y,n.x);vec2 ll=vec2(lon,lat)/PI*180.;
    vec2 uv=vec2(lon/(2.*PI)+.5,.5-lat/PI);vec2 gx=dFdx(uv),gy=dFdy(uv);gx.x-=floor(gx.x+.5);gy.x-=floor(gy.x+.5);
    vec3 alb=textureGrad(uDay,uv,gx,gy).rgb;vec3 rel=textureGrad(uRel,uv,gx,gy).rgb;
    vec2 um=vec2((ll.x-uWinM.x)/(uWinM.y-uWinM.x),(uWinM.w-ll.y)/(uWinM.w-uWinM.z));
    vec2 mm=min(um,1.-um)*vec2(uWinM.y-uWinM.x,uWinM.w-uWinM.z);float km=smoothstep(0.,1.5,min(mm.x,mm.y));
    vec2 mx=dFdx(um),my=dFdy(um);
    vec3 albM=textureGrad(uDayM,um,mx,my).rgb,relM=textureGrad(uRelM,um,mx,my).rgb;
    alb=mix(alb,albM,km*uMixM.x);rel=mix(rel,relM,km*uMixM.y);
    vec2 uk=vec2((ll.x-uWin.x)/(uWin.y-uWin.x),(uWin.w-ll.y)/(uWin.w-uWin.z));
    vec2 mk=min(uk,1.-uk)*vec2(uWin.y-uWin.x,uWin.w-uWin.z);float k=smoothstep(0.,.8,min(mk.x,mk.y));
    vec2 kx=dFdx(uk),ky=dFdy(uk);
    vec3 relK=textureGrad(uRelK,uk,kx,ky).rgb;vec3 albK=textureGrad(uDayK,uk,kx,ky).rgb;
    alb=mix(alb,albK,k*uMix.x);rel=mix(rel,relK,k*uMix.y);
    alb=pow(alb,vec3(2.2));
    // التضاريس: الميل شرقا وشمالا من خريطة الارتفاع يحرف العمودي فتتغير زاوية الشمس
    vec3 E=normalize(vec3(-n.y,n.x,0.)),Nn=cross(n,E);
    vec2 sl=(rel.rg-.5)*2.;
    vec3 N=normalize(n-uExag*(sl.x*E+sl.y*Nn));
    float water=smoothstep(.3,.7,rel.b);
    float mu=max(dot(n,-d),0.),ndl0=dot(n,uL),ndl=dot(N,uL);
    float day=smoothstep(-.06,.16,ndl0);
    vec3 sun=vec3(1.,.95,.86)*2.6,sky=vec3(.05,.07,.11);
    float dif=max(ndl,0.)*.85+max(ndl0,0.)*.15;   // التضاريس تظلل ولا تسود: بعض الضوء يصل من السماء
    vec3 lit=alb*(sun*dif*day+sky*(.4+.6*max(ndl0,0.)));
    // بريق الشمس على الماء، يقوى بزاوية النظر المائلة
    vec3 H=normalize(uL-d);float fr=.02+.98*pow(1.-mu,5.);
    lit+=vec3(1.,.88,.7)*pow(max(dot(n,H),0.),260.)*water*day*(1.4+5.*fr);
    lit+=vec3(.35,.55,.8)*water*fr*.08*day;
    // الهواء فوق الأرض: يزرق ما بعد ويخفف تباينه، ودفء عند خط الغروب
    float haze=pow(1.-mu,2.2);
    lit=mix(lit,vec3(.18,.36,.8)*(.1+.7*max(ndl0,0.)),haze*.26);
    lit+=vec3(1.,.42,.12)*.09*exp(-pow(ndl0/.09,2.))*(.3+haze);
    // حدود المملكة خيط دقيق، وما خارجها أهدأ قليلا
    // المشتقات تحسب لكل البكسلات خارج أي شرط، وإلا خرجت قيما عشوائية عند حد الشرط فرسمت خطا متقطعا
    float sd=(textureGrad(uSdf,uk,kx,ky).r-.5)*uSdfK,fw=max(fwidth(sd),1e-6);
    float bw=smoothstep(.9,1.,k)*uMix.z;
    float inK=smoothstep(-fw,fw,sd),line=1.-smoothstep(.55,1.5,abs(sd)/fw);
    lit*=mix(1.,mix(.8,1.07,inK),bw);
    lit=mix(lit,vec3(1.,.95,.84)*1.5,line*.38*bw);
    // حافة الكرة بلا تسنن: التغطية من بعد الشعاع عن المركز
    float cov=clamp((1.-dm)/max(fwidth(dm),1e-6)+.5,0.,1.);
    col=mix(col,lit+atm*.35*pow(1.-mu,3.),cov);   // الغلاف الجوي فوق الأرض عند الأفق وحده، فلا يغطي جهة الشمس بضباب
  }
  col=mix(vec3(dot(col,vec3(.2126,.7152,.0722))),col,1.12);   // تشبع خفيف قبل الضغط، فلا تبهت الصحراء
  col=aces(col*uExp);
  o=vec4(pow(col,vec3(1./2.2)),1.);
}`;
  const VS = `#version 300 es
in vec2 p;void main(){gl_Position=vec4(p,0,1);}`;

  const CSS = `
.ea{position:relative;overflow:hidden;contain:layout paint}
.ea canvas{position:absolute;inset:0;width:100%;height:100%;display:block;opacity:0;transition:opacity 1.2s cubic-bezier(.2,0,0,1)}
.ea.ea-on canvas{opacity:1}
.ea-dots{position:absolute;inset:0;pointer-events:none}
.ea-dot{position:absolute;left:0;top:0;width:0;height:0;will-change:transform;opacity:0;transition:opacity .5s cubic-bezier(.2,0,0,1) calc(var(--i)*35ms)}
.ea.ea-on.ea-lit .ea-dot[data-on]{opacity:1}
.ea-dot i{position:absolute;width:5px;height:5px;margin:-2.5px 0 0 -2.5px;border-radius:50%;background:var(--ea-dot,#fff6e0);
  box-shadow:0 0 4px 1px var(--ea-glow,rgba(255,214,140,.9)),0 0 14px 4px var(--ea-glow2,rgba(255,190,90,.35))}
@media (prefers-reduced-motion:reduce){.ea canvas,.ea-dot{transition:none}}
`;

  function basisAt(lat, lon) {
    const la = lat * RAD, lo = lon * RAD;
    const n = [Math.cos(la) * Math.cos(lo), Math.cos(la) * Math.sin(lo), Math.sin(la)];
    const e = [-Math.sin(lo), Math.cos(lo), 0];
    const nn = [-Math.sin(la) * Math.cos(lo), -Math.sin(la) * Math.sin(lo), Math.cos(la)];
    return { n, e, nn };
  }
  const add = (a, b, k = 1) => [a[0] + b[0] * k, a[1] + b[1] * k, a[2] + b[2] * k];
  const mul = (a, k) => [a[0] * k, a[1] * k, a[2] * k];
  const dot = (a, b) => a[0] * b[0] + a[1] * b[1] + a[2] * b[2];
  const cross = (a, b) => [a[1] * b[2] - a[2] * b[1], a[2] * b[0] - a[0] * b[2], a[0] * b[1] - a[1] * b[0]];
  const norm = (a) => mul(a, 1 / Math.hypot(a[0], a[1], a[2]));

  /** الكاميرا: تنظر إلى aim من موقع على اتجاه bearing من target، بميل tilt عن العمودي وبعد dist (نصف قطر الأرض = 1) */
  function camera(v) {
    const T = basisAt(v.lat, v.lon), A = basisAt(v.aimLat, v.aimLon);
    const hdir = add(mul(T.nn, Math.cos(v.bearing * RAD)), T.e, Math.sin(v.bearing * RAD));
    const C = add(T.n, add(mul(T.n, Math.cos(v.tilt * RAD)), hdir, Math.sin(v.tilt * RAD)), v.dist);
    const f = norm(add(A.n, C, -1));
    const r = norm(cross(f, T.n));
    const u = cross(r, f);
    return { C, f, r, u, tan: Math.tan(v.fov * RAD / 2) };
  }
  function sunAt(lat, lon, az, el) {
    // الشمس من الاتجاه az (درجات من الشمال) وعلى ارتفاع el فوق أفق النقطة
    const B = basisAt(lat, lon), h = add(mul(B.nn, Math.cos(az * RAD)), B.e, Math.sin(az * RAD));
    return norm(add(mul(B.n, Math.sin(el * RAD)), h, Math.cos(el * RAD)));
  }

  function create(host, opts) {
    opts = Object.assign({
      assets: '/_eld/',
      // المشهد: الكاميرا جنوب المملكة تنظر إلى الشمال، والأفق في الثلث الأعلى
      view: { lat: 23, lon: 46, aimLat: 28.5, aimLon: 46.2, bearing: 175, tilt: 50, dist: 1.15, fov: 28 },
      sun: { az: 248, el: 22 },   // شمس العصر من الغرب الجنوبي: تضيء سفوح السروات الغربية وتظلل ما خلفها
      exaggeration: 6,
      exposure: 0.86,
      border: 0.85,
      dots: [],
      parallax: true,
      maxDpr: 2,
    }, opts || {});
    const reduced = matchMedia('(prefers-reduced-motion: reduce)').matches;
    if (!document.getElementById('earth-art-css')) {
      const s = document.createElement('style'); s.id = 'earth-art-css'; s.textContent = CSS; document.head.appendChild(s);
    }
    host.classList.add('ea');
    const canvas = document.createElement('canvas');
    canvas.setAttribute('aria-hidden', 'true');
    const dotsEl = document.createElement('div');
    dotsEl.className = 'ea-dots';
    host.append(canvas, dotsEl);
    const gl = canvas.getContext('webgl2', { antialias: false, alpha: false, powerPreference: 'high-performance' });
    if (!gl) { canvas.remove(); dotsEl.remove(); return { ok: false, destroy() {} }; }

    // ----- البرنامج: ترجمة بلا انتظار -----
    const pc = gl.getExtension('KHR_parallel_shader_compile');
    const prog = gl.createProgram();
    for (const [t, src] of [[gl.VERTEX_SHADER, VS], [gl.FRAGMENT_SHADER, FS]]) {
      const x = gl.createShader(t); gl.shaderSource(x, src); gl.compileShader(x); gl.attachShader(prog, x);
    }
    gl.bindAttribLocation(prog, 0, 'p'); gl.linkProgram(prog);
    let U = null;
    const linked = () => {
      if (U) return true;
      if (pc && !gl.getProgramParameter(prog, pc.COMPLETION_STATUS_KHR)) return false;
      if (!gl.getProgramParameter(prog, gl.LINK_STATUS)) throw new Error('earth-art: ' + gl.getProgramInfoLog(prog));
      U = {}; const n = gl.getProgramParameter(prog, gl.ACTIVE_UNIFORMS);
      for (let i = 0; i < n; i++) { const nm = gl.getActiveUniform(prog, i).name; U[nm] = gl.getUniformLocation(prog, nm); }
      return true;
    };
    const vao = gl.createVertexArray(); gl.bindVertexArray(vao);
    const buf = gl.createBuffer(); gl.bindBuffer(gl.ARRAY_BUFFER, buf);
    gl.bufferData(gl.ARRAY_BUFFER, new Float32Array([-1, -1, 1, -1, -1, 1, 1, 1]), gl.STATIC_DRAW);
    gl.enableVertexAttribArray(0); gl.vertexAttribPointer(0, 2, gl.FLOAT, false, 0, 0);
    const aniso = gl.getExtension('EXT_texture_filter_anisotropic');

    // ----- الصور: تفك خارج الصفحة وترفع على شرائح -----
    const BMP = { premultiplyAlpha: 'none', colorSpaceConversion: 'none', imageOrientation: 'none' };
    const blank = (v) => { const t = gl.createTexture(); gl.bindTexture(gl.TEXTURE_2D, t); gl.texImage2D(gl.TEXTURE_2D, 0, gl.RGBA, 1, 1, 0, gl.RGBA, gl.UNSIGNED_BYTE, new Uint8Array(v)); return t; };
    const tex = { day: blank([0, 0, 0, 255]), dayK: blank([0, 0, 0, 255]), rel: blank([128, 128, 0, 255]), relK: blank([128, 128, 0, 255]), sdf: blank([0, 0, 0, 255]),
      dayM: blank([0, 0, 0, 255]), relM: blank([128, 128, 0, 255]) };
    const mix = [0, 0, 0, 0, 0], mixTo = [0, 0, 0, 0, 0];   // المملكة صورة وتضاريس وحدود، ثم ما حولها صورة وتضاريس
    let ready = false, alive = true, raf = 0, meta = null;
    const url = (f) => (typeof opts.assets === 'string' ? opts.assets.replace(/\/?$/, '/') + f : opts.assets[f]);
    const later = () => new Promise((r) => (root.requestIdleCallback ? requestIdleCallback(r, { timeout: 120 }) : setTimeout(r, 16)));
    async function load(file, mip) {
      const r = await fetch(url(file)); if (!r.ok) throw new Error(file);
      const bmp = await createImageBitmap(await r.blob(), BMP);
      const w = bmp.width, h = bmp.height, t = gl.createTexture();
      gl.bindTexture(gl.TEXTURE_2D, t);
      gl.texStorage2D(gl.TEXTURE_2D, mip ? Math.floor(Math.log2(Math.max(w, h))) + 1 : 1, gl.RGB8, w, h);
      const rows = Math.max(64, Math.floor(2e6 / w));
      for (let y = 0; y < h; y += rows) {
        const n = Math.min(rows, h - y), s = await createImageBitmap(bmp, 0, y, w, n, BMP);
        await later(); if (!alive) { s.close(); return null; }
        gl.bindTexture(gl.TEXTURE_2D, t); gl.texSubImage2D(gl.TEXTURE_2D, 0, 0, y, w, n, gl.RGB, gl.UNSIGNED_BYTE, s); s.close();
      }
      bmp.close();
      gl.bindTexture(gl.TEXTURE_2D, t);
      gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_WRAP_T, gl.CLAMP_TO_EDGE);
      if (mip) {
        gl.generateMipmap(gl.TEXTURE_2D);
        gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_MIN_FILTER, gl.LINEAR_MIPMAP_LINEAR);
        if (aniso) gl.texParameterf(gl.TEXTURE_2D, aniso.TEXTURE_MAX_ANISOTROPY_EXT, Math.min(16, gl.getParameter(aniso.MAX_TEXTURE_MAX_ANISOTROPY_EXT)));
      } else {
        gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_MIN_FILTER, gl.LINEAR);
        gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_WRAP_S, gl.CLAMP_TO_EDGE);
      }
      return t;
    }
    const put = (slot, mi) => (t) => { if (!t) return; tex[slot] = t; if (mi != null) mixTo[mi] = 1; request(); };
    // الترتيب: ما يراه أولا أولا. الأرض كلها، ثم المملكة وتضاريسها بأعلى دقة
    (async () => {
      try { meta = await (await fetch(url('ksa.json'))).json(); } catch (e) { meta = { window: [32, 60, 12, 35], sdfRange: 24, sdfPxPerDeg: 64 }; }
      await load('earth-day-4k.webp', true).then(put('day')).then(() => { ready = true; host.classList.add('ea-on'); request(); });
      load('earth-relief-2k.webp', true).then(put('rel'));
      load('ksa-border-sdf.png', false).then(put('sdf', 2));
      await load('mena-day-60.webp', true).then(put('dayM', 3));
      load('mena-relief-60.webp', true).then(put('relM', 4));
      await load('ksa-day-120.webp', true).then(put('dayK', 0));
      load('ksa-relief-120.webp', true).then(put('relK', 1));
    })().catch(() => {});

    // ----- الكاميرا والحركة -----
    // دخول: الكاميرا أعلى قليلا ثم تنزل إلى موضعها وهي تهدأ، والإصبع أو الفأرة يميلانها قليلا بنابض بلا ارتداد
    // البورتفوليو: التمرير يحدد موضع الكاميرا (pose)، والنابض يلحقه فلا تقفز الصورة مع عجلة الفأرة
    const KEYS = ['lat', 'lon', 'aimLat', 'aimLon', 'bearing', 'tilt', 'dist', 'fov'];
    let v = Object.assign({}, opts.view), tgt = Object.assign({}, opts.view), off = { bearing: 0, tilt: 0 };
    let vel = {}, last = 0, W = 1, H = 1, dpr = 1, aspectK = 1;
    for (const k of KEYS) vel[k] = 0;
    const L = sunAt(opts.view.lat, opts.view.lon, opts.sun.az, opts.sun.el);
    function step(dt) {
      // نابض حرج التخميد (استجابة 1.1 ثانية للدخول، 0.6 للميل): يصل بلا تجاوز
      let moving = false;
      const w0 = 2 * Math.PI / (reduced ? 0.05 : 0.45);
      for (const k of KEYS) {
        const goal = tgt[k] + (off[k] || 0) * (k === 'fov' ? 0 : 1) + 0;
        const g = k === 'fov' ? tgt.fov * aspectK : goal;
        const x = v[k] - g, a = -w0 * w0 * x - 2 * w0 * vel[k];
        vel[k] += a * dt; v[k] += vel[k] * dt;
        if (Math.abs(x) > 1e-4 || Math.abs(vel[k]) > 1e-4) moving = true; else { v[k] = g; vel[k] = 0; }
      }
      return moving;
    }

    // ----- الإدارات: نقاط ضوء خافتة -----
    const dots = opts.dots.map((d, i) => {
      const el = document.createElement('span'); el.className = 'ea-dot'; el.style.setProperty('--i', i);
      el.innerHTML = '<i></i>'; if (d.r) el.style.setProperty('--r', d.r);
      if (d.label) { const b = document.createElement('b'); b.textContent = d.label; if (d.s) b.dataset.s = d.s; el.appendChild(b); }
      dotsEl.appendChild(el);
      return { d, el, n: basisAt(d.lat, d.lon).n };
    });
    function placeDots(cam) {
      for (const p of dots) {
        const rel = add(p.n, cam.C, -1), z = dot(rel, cam.f);
        const facing = dot(p.n, mul(rel, -1)) > 0.02;
        if (z <= 0 || !facing) { delete p.el.dataset.on; continue; }
        const x = dot(rel, cam.r) / (z * cam.tan * W / H), y = dot(rel, cam.u) / (z * cam.tan);
        p.el.style.transform = `translate3d(${((x + 1) / 2 * W).toFixed(1)}px,${((1 - y) / 2 * H).toFixed(1)}px,0)`;
        p.el.dataset.on = '';
      }
    }

    function resize() {
      const r = host.getBoundingClientRect();
      W = Math.max(1, Math.round(r.width)); H = Math.max(1, Math.round(r.height));
      dpr = Math.min(root.devicePixelRatio || 1, opts.maxDpr);
      canvas.width = Math.round(W * dpr); canvas.height = Math.round(H * dpr);
      // اللوحة الضيقة تحتاج زاوية أوسع كي تبقى المملكة كاملة
      aspectK = Math.max(1, Math.min(1.6, 0.82 * H / W));
      v.fov = tgt.fov * aspectK;
      request();
    }
    function frame(now) {
      raf = 0; if (!alive) return;
      const dt = Math.min(0.05, last ? (now - last) / 1000 : 0.016); last = now;
      let moving = ready ? step(dt) : true;
      for (let i = 0; i < 5; i++) if (mix[i] < mixTo[i]) { mix[i] = Math.min(1, mix[i] + (reduced ? 1 : dt * 1.6)); moving = true; }
      if (ready && linked()) draw(); else moving = true;
      if (moving) request(); else last = 0;
    }
    function draw() {
      const cam = camera(v);
      gl.viewport(0, 0, canvas.width, canvas.height);
      gl.useProgram(prog);
      gl.uniform2f(U.uRes, canvas.width, canvas.height);
      gl.uniform3fv(U.uC, cam.C);
      gl.uniformMatrix3fv(U.uCam, false, [...cam.r, ...cam.u, ...cam.f]);
      gl.uniform1f(U.uTan, cam.tan);
      [['uDay', 'day'], ['uDayK', 'dayK'], ['uRel', 'rel'], ['uRelK', 'relK'], ['uSdf', 'sdf'], ['uDayM', 'dayM'], ['uRelM', 'relM']].forEach(([u, k], i) => {
        gl.activeTexture(gl.TEXTURE0 + i); gl.bindTexture(gl.TEXTURE_2D, tex[k]); gl.uniform1i(U[u], i);
      });
      const win = meta ? meta.window : [32, 60, 12, 35];
      gl.uniform4f(U.uWin, win[0], win[1], win[2], win[3]);
      gl.uniform3f(U.uMix, mix[0], mix[1], mix[2] * opts.border);
      gl.uniform2f(U.uMixM, mix[3], mix[4]);
      gl.uniform4f(U.uWinM, 20, 75, 5, 45);
      gl.uniform3fv(U.uL, L);
      gl.uniform1f(U.uExag, opts.exaggeration);
      gl.uniform1f(U.uExp, opts.exposure);
      gl.uniform1f(U.uSdfK, meta ? 255 / 127 * meta.sdfRange / meta.sdfPxPerDeg : 0.75);
      gl.uniform1f(U.uSpace, 1);
      gl.bindVertexArray(vao);
      gl.drawArrays(gl.TRIANGLE_STRIP, 0, 4);
      placeDots(cam);
    }
    function request() { if (!raf && alive && visible) raf = requestAnimationFrame(frame); }

    // ميل خفيف يتبع المؤشر: درجتان على الأكثر، فيبدو المشهد حيا ولا يتحرك وحده
    let visible = true;
    function onMove(e) {
      if (!opts.parallax || reduced || e.pointerType === 'touch') return;
      const nx = e.clientX / innerWidth - 0.5, ny = e.clientY / innerHeight - 0.5;
      off.bearing = -nx * 4; off.tilt = -ny * 3;
      request();
    }
    root.addEventListener('pointermove', onMove, { passive: true });
    const ro = new ResizeObserver(resize); ro.observe(host);
    const io = new IntersectionObserver((en) => { visible = en[0].isIntersecting; if (visible) request(); }); io.observe(host);
    const onVis = () => { visible = !document.hidden; if (visible) { last = 0; request(); } };
    document.addEventListener('visibilitychange', onVis);
    resize();
    return {
      ok: true,
      set(o) { Object.assign(opts, o); if (o.view) Object.assign(tgt, o.view); request(); },
      /** موضع الكاميرا من التمرير؛ jump يضعها فورا (أول رسم أو تقليل الحركة) */
      pose(p, jump) { Object.assign(tgt, p); if (jump) for (const k of KEYS) { v[k] = k === 'fov' ? tgt.fov * aspectK : tgt[k]; vel[k] = 0; } request(); },
      dots(on) { host.classList.toggle('ea-lit', !!on); },
      destroy() {
        alive = false; cancelAnimationFrame(raf); ro.disconnect(); io.disconnect();
        root.removeEventListener('pointermove', onMove); document.removeEventListener('visibilitychange', onVis);
        canvas.remove(); dotsEl.remove(); host.classList.remove('ea', 'ea-on');
      },
    };
  }
  root.EarthArt = { create };
})(typeof window !== 'undefined' ? window : this);
