/* Dishes3D — procedural 3D food scenes for the Parichayam site.
   No external models/textures: every dish is built from primitive geometry in code.
   Three.js (r149, UMD) is lazy-loaded from assets/vendor/three.min.js on first use. */
(function (W) {
  'use strict';
  var D = (W.Dishes3D = {});
  var T = null, loading = null;

  D.reduce = W.matchMedia && W.matchMedia('(prefers-reduced-motion: reduce)').matches;
  D.mobile = W.matchMedia && W.matchMedia('(max-width: 820px), (pointer: coarse)').matches;

  function hasWebGL() {
    try {
      var c = document.createElement('canvas');
      return !!(W.WebGLRenderingContext && (c.getContext('webgl2') || c.getContext('webgl')));
    } catch (e) { return false; }
  }
  D.supported = hasWebGL();

  D.load = function () {
    if (T) return Promise.resolve(T);
    if (!D.supported) return Promise.reject(new Error('WebGL unavailable'));
    if (loading) return loading;
    loading = new Promise(function (res, rej) {
      var s = document.createElement('script');
      s.src = 'assets/vendor/three.min.js';
      s.onload = function () {
        T = W.THREE;
        if (T.ColorManagement) T.ColorManagement.legacyMode = false;
        res(T);
      };
      s.onerror = function () { rej(new Error('three.js failed to load')); };
      document.head.appendChild(s);
    });
    return loading;
  };

  /* ---------- helpers ---------- */
  function hash(str) { var h = 1779033703 ^ str.length; for (var i = 0; i < str.length; i++) { h = Math.imul(h ^ str.charCodeAt(i), 3432918353); h = (h << 13) | (h >>> 19); } return (h >>> 0) || 1; }
  function rng(seed) { var a = seed >>> 0; return function () { a |= 0; a = (a + 0x6D2B79F5) | 0; var t = Math.imul(a ^ (a >>> 15), 1 | a); t = (t + Math.imul(t ^ (t >>> 7), 61 | t)) ^ t; return ((t ^ (t >>> 14)) >>> 0) / 4294967296; }; }
  function mat(color, o) { return new T.MeshStandardMaterial(Object.assign({ color: color, roughness: 0.6, metalness: 0 }, o || {})); }
  function mesh(geo, m, x, y, z) { var o = new T.Mesh(geo, m); o.position.set(x || 0, y || 0, z || 0); return o; }

  function radialTexture(stops, size) {
    var c = document.createElement('canvas'); c.width = c.height = size || 128;
    var x = c.getContext('2d'), h = c.width / 2, g = x.createRadialGradient(h, h, 2, h, h, h - 2);
    stops.forEach(function (s) { g.addColorStop(s[0], s[1]); });
    x.fillStyle = g; x.fillRect(0, 0, c.width, c.height);
    return new T.CanvasTexture(c);
  }

  function lump(r, amp, seed, sy) {
    var g = new T.SphereGeometry(r, 22, 16), p = g.attributes.position, v = new T.Vector3();
    for (var i = 0; i < p.count; i++) {
      v.fromBufferAttribute(p, i);
      var n = 1 + Math.sin(v.x * 7 + seed) * Math.cos(v.y * 6 + seed * 1.7) * Math.sin(v.z * 8 + seed * 0.6) * amp;
      v.multiplyScalar(n); p.setXYZ(i, v.x, v.y * (sy || 1), v.z);
    }
    g.computeVertexNormals();
    return g;
  }

  function dispose(obj) {
    obj.traverse(function (o) {
      if (o.geometry) o.geometry.dispose();
      if (o.material) { (Array.isArray(o.material) ? o.material : [o.material]).forEach(function (m) { if (m.map) m.map.dispose(); m.dispose(); }); }
    });
  }

  /* ---------- plates ---------- */
  function plate(R, kind) {
    var g = new T.Group();
    var pts = [[0, 0], [0.72, 0], [0.9, 0.02], [R * 0.92, 0.1], [R, 0.17], [R * 1.0, 0.2], [R * 0.95, 0.19], [R * 0.9, 0.14], [R * 0.7, 0.07], [0, 0.065]]
      .map(function (p) { return new T.Vector2(p[0] * (p[0] > 0.8 ? 1 : 1), p[1]); });
    var brass = kind === 'brass';
    g.add(new T.Mesh(new T.LatheGeometry(pts, 64), mat(brass ? '#cf9b38' : '#f3efe6', { roughness: brass ? 0.38 : 0.22, metalness: brass ? 0.55 : 0.02, side: T.DoubleSide })));
    if (brass) {
      var leaf = new T.Mesh(new T.CircleGeometry(R * 0.78, 48), mat('#1d6a38', { roughness: 0.85 }));
      leaf.rotation.x = -Math.PI / 2; leaf.position.y = 0.075; g.add(leaf);
    }
    return g;
  }

  function contactShadow(size) {
    var m = new T.MeshBasicMaterial({ map: radialTexture([[0, 'rgba(0,0,0,.6)'], [0.6, 'rgba(0,0,0,.25)'], [1, 'rgba(0,0,0,0)']]), transparent: true, depthWrite: false });
    var p = new T.Mesh(new T.PlaneGeometry(size, size), m);
    p.rotation.x = -Math.PI / 2; p.position.y = -0.01; return p;
  }

  /* ---------- rice mound ---------- */
  function rice(rnd, n, H, R) {
    var g = new T.Group();
    var base = new T.Mesh(new T.SphereGeometry(R * 0.93, 32, 18, 0, Math.PI * 2, 0, Math.PI / 2), mat('#d9993f', { roughness: 0.85 }));
    base.scale.y = H / (R * 0.93) * 0.92; base.position.y = 0.07; g.add(base);
    var m = new T.InstancedMesh(new T.CapsuleGeometry(0.019, 0.08, 2, 6), mat('#ffffff', { roughness: 0.5 }), n);
    var o = new T.Object3D(), c = new T.Color(), pal = ['#f3e6c4', '#ecd08f', '#e2a43d', '#d4822a', '#f0dfb4', '#dcb25a'];
    for (var i = 0; i < n; i++) {
      var r = Math.sqrt(rnd()) * R * 0.92, a = rnd() * 6.2832, k = Math.max(0, 1 - Math.pow(r / (R * 0.95), 2));
      o.position.set(Math.cos(a) * r, 0.07 + H * Math.pow(k, 0.7) * (0.8 + 0.2 * rnd()), Math.sin(a) * r);
      o.rotation.set(rnd() * 6.28, rnd() * 6.28, rnd() * 6.28); o.updateMatrix();
      m.setMatrixAt(i, o.matrix); c.set(pal[(rnd() * pal.length) | 0]); m.setColorAt(i, c);
    }
    m.instanceMatrix.needsUpdate = true; m.instanceColor.needsUpdate = true; g.add(m);
    g.userData.hAt = function (r) { return 0.07 + H * Math.pow(Math.max(0, 1 - Math.pow(r / (R * 0.95), 2)), 0.7); };
    return g;
  }

  /* ---------- small food parts ---------- */
  function chickenPiece(rnd, size, color) {
    var s = rnd() * 50;
    var o = mesh(lump(size, 0.28, s, 0.78), mat(color, { roughness: 0.55 }));
    o.scale.set(1.3, 0.85, 1); o.rotation.set(rnd() * 0.8, rnd() * 6, rnd() * 0.8); return o;
  }
  function drumstick(rnd, color) {
    var g = new T.Group();
    var meat = mesh(lump(0.17, 0.12, rnd() * 30, 1.35), mat(color, { roughness: 0.4 }), 0, 0.02, 0);
    var bone = mesh(new T.CylinderGeometry(0.032, 0.032, 0.3, 10), mat('#f1e8d2'), 0, -0.27, 0);
    var k1 = mesh(new T.SphereGeometry(0.052, 10, 8), mat('#f1e8d2'), 0.03, -0.42, 0), k2 = mesh(new T.SphereGeometry(0.052, 10, 8), mat('#f1e8d2'), -0.03, -0.42, 0);
    g.add(meat, bone, k1, k2); return g;
  }
  function lemonHalf(r) {
    var m = new T.Mesh(new T.CylinderGeometry(r, r, 0.06, 28, 1, false, 0, Math.PI), [mat('#f2cd2f', { side: T.DoubleSide }), mat('#fff2a6', { roughness: 0.7 }), mat('#fff2a6', { roughness: 0.7 })]);
    return m;
  }
  function lemonSlice(r) {
    var g = new T.Group();
    g.add(mesh(new T.CylinderGeometry(r, r, 0.035, 32), mat('#f4d23a', { roughness: 0.5 })));
    g.add(mesh(new T.CylinderGeometry(r * 0.88, r * 0.88, 0.04, 32), mat('#fff0a0', { roughness: 0.7 })));
    return g;
  }
  function mint(rnd) { var o = mesh(new T.SphereGeometry(0.1, 12, 8), mat('#2f9a4a', { roughness: 0.7 })); o.scale.set(1, 0.16, 0.65); o.rotation.set((rnd() - 0.5) * 0.6, rnd() * 6.28, (rnd() - 0.5) * 0.6); return o; }
  function chili(rnd, len) {
    var curve = new T.CatmullRomCurve3([new T.Vector3(-len / 2, 0, 0), new T.Vector3(0, 0.05, 0.03), new T.Vector3(len / 2, -0.02, 0.1)]);
    var o = mesh(new T.TubeGeometry(curve, 12, 0.026, 8), mat('#cf2a1c', { roughness: 0.35 })); o.rotation.y = rnd() * 6.28; return o;
  }
  function onionRing(r, col) { var o = mesh(new T.TorusGeometry(r, r * 0.14, 8, 24), mat(col || '#e8b9d6', { roughness: 0.5 })); o.rotation.x = Math.PI / 2; return o; }
  function eggHalf() {
    var g = new T.Group(), w = mesh(new T.SphereGeometry(0.17, 18, 12), mat('#fffdf5', { roughness: 0.4 })); w.scale.set(1, 0.7, 0.82);
    var y = mesh(new T.SphereGeometry(0.085, 14, 10), mat('#f6b92b', { roughness: 0.45 }), 0, 0.075, 0); y.scale.y = 0.7; g.add(w, y); return g;
  }
  function paneerCube(rnd) { var o = mesh(new T.BoxGeometry(0.2, 0.17, 0.2), mat('#f6ebc9', { roughness: 0.6 })); o.rotation.set(rnd() * 0.6, rnd() * 6, rnd() * 0.6); return o; }
  function mushroom(rnd) {
    var g = new T.Group();
    var cap = mesh(new T.SphereGeometry(0.15, 16, 10, 0, Math.PI * 2, 0, Math.PI / 2), mat('#c9a77c', { roughness: 0.6 })); cap.position.y = 0.07;
    var st = mesh(new T.CylinderGeometry(0.05, 0.065, 0.14, 12), mat('#efe3cf'), 0, 0.03, 0); g.add(cap, st); g.rotation.set((rnd() - 0.5) * 0.7, rnd() * 6.28, (rnd() - 0.5) * 0.7); return g;
  }
  function friedOnions(rnd, n, hAt, R) {
    var m = new T.InstancedMesh(new T.CapsuleGeometry(0.012, 0.13, 2, 5), mat('#c9862a', { roughness: 0.7 }), n), o = new T.Object3D();
    for (var i = 0; i < n; i++) {
      var r = Math.sqrt(rnd()) * R * 0.8, a = rnd() * 6.28;
      o.position.set(Math.cos(a) * r, hAt(r) + 0.03, Math.sin(a) * r); o.rotation.set(Math.PI / 2 + (rnd() - 0.5), rnd() * 6.28, (rnd() - 0.5)); o.updateMatrix(); m.setMatrixAt(i, o.matrix);
    }
    m.instanceMatrix.needsUpdate = true; return m;
  }

  /* ---------- steam ---------- */
  function steam(n, spread, top) {
    var tex = radialTexture([[0, 'rgba(255,255,255,.9)'], [0.5, 'rgba(255,255,255,.35)'], [1, 'rgba(255,255,255,0)']], 64);
    var pos = new Float32Array(n * 3), seed = new Float32Array(n);
    for (var i = 0; i < n; i++) { seed[i] = Math.random(); pos[i * 3] = (Math.random() - 0.5) * spread; pos[i * 3 + 1] = Math.random() * top; pos[i * 3 + 2] = (Math.random() - 0.5) * spread; }
    var g = new T.BufferGeometry(); g.setAttribute('position', new T.BufferAttribute(pos, 3));
    var p = new T.Points(g, new T.PointsMaterial({ map: tex, size: 0.62, transparent: true, opacity: 0.2, depthWrite: false, color: '#ffffff' }));
    p.userData.update = function (t, dt) {
      for (var i = 0; i < n; i++) {
        pos[i * 3 + 1] += dt * (0.22 + seed[i] * 0.2);
        pos[i * 3] += Math.sin(t * 0.8 + seed[i] * 12) * dt * 0.05;
        if (pos[i * 3 + 1] > top) { pos[i * 3 + 1] = 0.5; pos[i * 3] = (Math.random() - 0.5) * spread; pos[i * 3 + 2] = (Math.random() - 0.5) * spread; }
      }
      g.attributes.position.needsUpdate = true;
    };
    return p;
  }

  /* ---------- dish builders ---------- */
  function buildBiryani(def, o) {
    var rnd = rng(hash(def.id)), g = new T.Group(), id = def.id;
    var plain = /rice/.test(id);
    g.add(contactShadow(4.2));
    g.add(plate(1.35, 'brass'));
    var ricePart = rice(rnd, o.mobile ? 650 : 1500, plain ? 0.42 : 0.56, 0.98); g.add(ricePart);
    var hAt = ricePart.userData.hAt, top = new T.Group(); g.add(top);
    function put(obj, r, a, lift) { obj.position.set(Math.cos(a) * r, hAt(r) + (lift == null ? 0.07 : lift), Math.sin(a) * r); top.add(obj); }
    if (!plain) {
      if (def.veg) {
        var isMush = /mushroom/.test(id), isPaneer = /paneer/.test(id);
        for (var i = 0; i < 5; i++) put(isMush ? mushroom(rnd) : (isPaneer ? paneerCube(rnd) : chickenPiece(rnd, 0.12, '#8fb25a')), 0.2 + rnd() * 0.5, i * 1.26 + rnd(), 0.06);
        if (!isMush && !isPaneer) { for (var j = 0; j < 4; j++) put(mushroom(rnd), 0.3 + rnd() * 0.3, j * 1.6 + 0.4, 0.05); }
      } else {
        var count = /boneless/.test(id) ? 6 : /lollipop/.test(id) ? 3 : 4;
        for (var k = 0; k < count; k++) {
          var ang = k * (6.283 / count) + rnd() * 0.4, rr = 0.25 + rnd() * 0.42;
          if (/lollipop/.test(id)) { var d = drumstick(rnd, '#a35a24'); d.rotation.z = Math.PI / 2.4; d.rotation.y = ang; put(d, rr, ang, 0.08); }
          else put(chickenPiece(rnd, /boneless/.test(id) ? 0.13 : 0.19, rnd() > 0.5 ? '#6f3412' : '#86441a'), rr, ang, 0.1);
        }
        if (/mughalai/.test(id)) { for (var e = 0; e < 2; e++) put(eggHalf(), 0.55 + e * 0.15, 2 + e * 3, 0.05); }
        if (/65/.test(id)) { for (var c = 0; c < 4; c++) put(chili(rnd, 0.28), 0.3 + rnd() * 0.4, c * 1.7, 0.1); }
      }
      top.add(friedOnions(rnd, o.mobile ? 30 : 70, hAt, 0.98));
      for (var m = 0; m < 5; m++) put(mint(rnd), 0.1 + rnd() * 0.7, rnd() * 6.28, 0.1);
    } else {
      for (var q = 0; q < 3; q++) put(mint(rnd), 0.1 + rnd() * 0.4, q * 2.1, 0.06);
    }
    var lem = lemonHalf(0.27); lem.position.set(1.0, 0.2, 0.55); lem.rotation.set(0.12, -0.6, 0.1); g.add(lem);
    var onion = onionRing(0.2); onion.position.set(-0.95, 0.2, 0.6); g.add(onion);
    var st = steam(o.mobile ? 12 : 26, 1.1, 1.7); st.position.y = 0.55; g.add(st);
    g.userData = { fitR: 1.75, cy: 0.35, spin: 0.35, anim: function (t, dt) { st.userData.update(t, dt); } };
    return g;
  }

  var STARTER = {
    'chilli-chicken':   { glaze: '#6b2210', veg: 'pepper' },
    'chicken-lollipop': { glaze: '#a02e17', legs: true },
    'dragon-chicken':   { glaze: '#5e1408', veg: 'chili' },
    'pepper-chicken':   { glaze: '#3b2a1c', veg: 'pepper', speck: true },
    'lemon-chicken':    { glaze: '#c99a22', veg: 'lemon' }
  };
  function buildStarter(def, o) {
    var rnd = rng(hash(def.id)), cfg = STARTER[def.id] || STARTER['chilli-chicken'], g = new T.Group();
    g.add(contactShadow(4.2)); g.add(plate(1.45, 'white'));
    var inner = new T.Mesh(new T.CircleGeometry(0.85, 40), mat('#2b2e2c', { roughness: 0.5 })); inner.rotation.x = -Math.PI / 2; inner.position.y = 0.072; g.add(inner);
    var gl = { roughness: 0.28, metalness: 0.12 };
    if (cfg.legs) {
      for (var i = 0; i < 7; i++) {
        var a = (i / 7) * 6.283, d = drumstick(rnd, cfg.glaze); d.children[0].material.roughness = 0.28;
        d.position.set(Math.cos(a) * 0.5, 0.3, Math.sin(a) * 0.5); d.rotation.set(0, -a + Math.PI / 2, Math.PI / 2.8); g.add(d);
      }
    } else {
      for (var j = 0; j < 9; j++) {
        var ring = j < 6 ? 0.58 : 0.18, aa = j < 6 ? (j / 6) * 6.283 : (j - 6) * 2.1, p = chickenPiece(rnd, 0.2, cfg.glaze);
        p.material.roughness = 0.5; p.material.metalness = 0;
        p.position.set(Math.cos(aa) * ring, 0.22 + (j >= 6 ? 0.12 : 0), Math.sin(aa) * ring); g.add(p);
      }
    }
    for (var s = 0; s < 14; s++) { var so = onionRing(0.055, '#3fae4f'); var sa = rnd() * 6.283, sr = 0.2 + rnd() * 0.75; so.position.set(Math.cos(sa) * sr, 0.34 + rnd() * 0.06, Math.sin(sa) * sr); g.add(so); }
    if (cfg.veg === 'pepper') for (var v = 0; v < 6; v++) { var b = mesh(new T.BoxGeometry(0.13, 0.05, 0.13), mat(v % 2 ? '#2f8f3f' : '#d23b2a'), Math.cos(v * 1.1) * 0.7, 0.3, Math.sin(v * 1.1) * 0.7); b.rotation.y = rnd() * 3; g.add(b); }
    if (cfg.veg === 'chili') for (var c = 0; c < 5; c++) { var ch = chili(rnd, 0.32); ch.position.set(Math.cos(c * 1.3) * 0.55, 0.42, Math.sin(c * 1.3) * 0.55); g.add(ch); }
    if (cfg.veg === 'lemon') for (var l = 0; l < 3; l++) { var ls = lemonSlice(0.2); ls.position.set(Math.cos(l * 2.1 + 0.5) * 0.95, 0.2 + l * 0.01, Math.sin(l * 2.1 + 0.5) * 0.95); ls.rotation.set(0.15, rnd(), 0.1); g.add(ls); }
    if (cfg.speck) { var sp = new T.InstancedMesh(new T.SphereGeometry(0.014, 5, 4), mat('#0c0c0c'), 90), ob = new T.Object3D(); for (var k = 0; k < 90; k++) { var ka = rnd() * 6.28, kr = Math.sqrt(rnd()) * 0.85; ob.position.set(Math.cos(ka) * kr, 0.36 + rnd() * 0.08, Math.sin(ka) * kr); ob.updateMatrix(); sp.setMatrixAt(k, ob.matrix); } g.add(sp); }
    var st = steam(o.mobile ? 10 : 22, 1.2, 1.6); st.position.y = 0.5; g.add(st);
    g.userData = { fitR: 1.85, cy: 0.3, spin: 0.35, anim: function (t, dt) { st.userData.update(t, dt); } };
    return g;
  }

  var SHAKE = {
    'chocolate-milkshake': { c: ['#5b3320'], top: 'choc' }, 'vanilla-milkshake': { c: ['#f5e7c1'], top: 'cherry' },
    'strawberry-milkshake': { c: ['#f29bb0'], top: 'berry' }, 'blackcurrant-milkshake': { c: ['#6b2f6d'], top: 'currant' },
    'oreo-blast-milkshake': { c: ['#7b726c'], top: 'oreo' }, 'kitkat-milkshake': { c: ['#8b5a3c'], top: 'kitkat' },
    'bournville-chocolate-milkshake': { c: ['#3a2016'], top: 'choc' }, 'butterscotch-milkshake': { c: ['#dc9d3f'], top: 'caramel' },
    'double-milkshake': { c: ['#e9b8a0', '#f5e7c1'], top: 'cherry' }, 'choco-vanilla': { c: ['#5b3320', '#f5e7c1'], top: 'choc' },
    'oreo-with-digestive': { c: ['#9b8c7e', '#f5e7c1'], top: 'oreo' }, 'pista-with-vanilla': { c: ['#a8c97a', '#f5e7c1'], top: 'pista' },
    'blackcurrant-with-vanilla': { c: ['#6b2f6d', '#f5e7c1'], top: 'currant' }, 'strawberry-with-vanilla': { c: ['#f29bb0', '#f5e7c1'], top: 'berry' },
    'oreo-with-ice-cream': { c: ['#7b726c', '#fff4dc'], top: 'oreo' }
  };
  function buildShake(def, o) {
    var rnd = rng(hash(def.id)), cfg = SHAKE[def.id] || SHAKE['double-milkshake'], g = new T.Group();
    var H = def.double ? 1.7 : 1.45, rt = 0.52, rb = 0.4, y0 = 0.1;
    g.add(contactShadow(3));
    var rad = function (y) { return rb + (rt - rb) * ((y - y0) / H); };
    g.add(mesh(new T.CylinderGeometry(rb + 0.03, rb + 0.03, 0.1, 40), mat('#ffffff', { transparent: true, opacity: 0.45, roughness: 0.1 }), 0, 0.05, 0));
    var Lh = H * 0.8, layers = cfg.c.length, lh = Lh / layers;
    for (var i = 0; i < layers; i++) {
      var ya = y0 + i * lh, yb = ya + lh;
      var liq = mesh(new T.CylinderGeometry(rad(yb) - 0.02, rad(ya) - 0.02, lh, 40), mat(cfg.c[i], { roughness: 0.35 }), 0, (ya + yb) / 2, 0);
      g.add(liq);
    }
    g.add(mesh(new T.CylinderGeometry(rt, rb, H, 44, 1, true), mat('#ffffff', { transparent: true, opacity: 0.17, roughness: 0.04, side: T.DoubleSide, depthWrite: false }), 0, y0 + H / 2, 0));
    var yt = y0 + Lh, cream = new T.Group(); cream.position.y = yt; g.add(cream);
    [[0.42, 0.14, 0.0], [0.33, 0.13, 0.15], [0.23, 0.12, 0.29], [0.13, 0.1, 0.4]].forEach(function (s) {
      var sp = mesh(new T.SphereGeometry(s[0], 24, 14), mat('#fffaf0', { roughness: 0.55 }), 0, s[2], 0); sp.scale.y = s[1] / s[0] * 1.4; cream.add(sp);
    });
    var tp = cfg.top, ty = yt + 0.46;
    if (tp === 'cherry') cream.add(mesh(new T.SphereGeometry(0.09, 14, 10), mat('#c4122e', { roughness: 0.2 }), 0.02, 0.5, 0));
    else if (tp === 'berry') cream.add(mesh(new T.ConeGeometry(0.11, 0.18, 10), mat('#d5233c', { roughness: 0.35 }), 0, 0.52, 0)), cream.children[cream.children.length - 1].rotation.x = Math.PI;
    else if (tp === 'currant') for (var a = 0; a < 3; a++) cream.add(mesh(new T.SphereGeometry(0.06, 10, 8), mat('#3a1245', { roughness: 0.25 }), Math.cos(a * 2.1) * 0.08, 0.48, Math.sin(a * 2.1) * 0.08));
    else if (tp === 'oreo') for (var b = 0; b < 3; b++) { var ck = mesh(new T.CylinderGeometry(0.15, 0.15, 0.04, 20), mat('#1d1512'), Math.cos(b * 2.1) * 0.2, 0.35 + b * 0.04, Math.sin(b * 2.1) * 0.2); ck.rotation.set(rnd() * 0.6, 0, rnd() * 0.6); cream.add(ck); }
    else if (tp === 'kitkat') for (var k = 0; k < 2; k++) { var bar = mesh(new T.BoxGeometry(0.1, 0.5, 0.07), mat('#5a2e17', { roughness: 0.4 }), k * 0.16 - 0.08, 0.6, 0); bar.rotation.z = k ? 0.22 : -0.22; cream.add(bar); }
    else if (tp === 'pista' || tp === 'choc' || tp === 'caramel') for (var c = 0; c < 14; c++) cream.add(mesh(new T.BoxGeometry(0.04, 0.03, 0.04), mat(tp === 'pista' ? '#78a63c' : tp === 'choc' ? '#3a2016' : '#c27a1c', { roughness: 0.4 }), (rnd() - 0.5) * 0.3, 0.38 + rnd() * 0.08, (rnd() - 0.5) * 0.3));
    var straw = new T.Group(); straw.position.set(0.12, yt + 0.1, -0.05); straw.rotation.z = -0.16; g.add(straw);
    for (var s = 0; s < 6; s++) straw.add(mesh(new T.CylinderGeometry(0.035, 0.035, 0.34, 10), mat(s % 2 ? '#ffffff' : '#d8342b', { roughness: 0.4 }), 0, s * 0.34 - 0.25, 0));
    g.userData = { fitR: def.double ? 1.55 : 1.4, cy: y0 + H * 0.5 - 0.1, spin: 0.3, anim: function (t) { cream.rotation.y = t * 0.2; } };
    return g;
  }

  /* ---------- floating ingredients (hero only) ---------- */
  function floaters(rnd, n) {
    var g = new T.Group(), items = [];
    for (var i = 0; i < n; i++) {
      var k = i % 6, o;
      if (k === 0) { o = mesh(new T.SphereGeometry(0.06, 10, 8), mat('#6fae3d', { roughness: 0.5 })); o.scale.set(1, 0.65, 0.65); }
      else if (k === 1) o = chili(rnd, 0.3);
      else if (k === 2) { o = lemonSlice(0.2); }
      else if (k === 3) o = onionRing(0.16, '#e8b9d6');
      else if (k === 4) o = mint(rnd);
      else { o = mesh(new T.CylinderGeometry(0.025, 0.025, 0.45, 8), mat('#7a4a28', { roughness: 0.8 })); }
      var depth = 0.4 + rnd() * 1.2;
      items.push({ o: o, a: rnd() * 6.283, r: 1.6 + rnd() * 0.8, y: 0.4 + rnd() * 1.9, sp: 0.1 + rnd() * 0.18, ph: rnd() * 6, depth: depth, rs: new T.Vector3(rnd() * 0.8, rnd() * 0.8, rnd() * 0.8) });
      g.add(o);
    }
    g.userData.update = function (t, px, py, freeze) {
      items.forEach(function (it) {
        var a = it.a + (freeze ? 0 : t * it.sp);
        it.o.position.set(Math.cos(a) * it.r + px * it.depth * 0.5, it.y + (freeze ? 0 : Math.sin(t * 1.1 + it.ph) * 0.12) + py * it.depth * 0.3, Math.sin(a) * it.r * 0.7);
        if (!freeze) it.o.rotation.set(t * it.rs.x, t * it.rs.y, t * it.rs.z);
      });
    };
    return g;
  }

  D.defFor = function (id, group, cat) {
    if (group === 'rm' || group === 'dm') return { kind: 'shake', id: id, double: group === 'dm' };
    if (group === 'st') return { kind: 'starter', id: id };
    return { kind: 'biryani', id: id, veg: cat === 'v' };
  };

  function build(def, o) {
    var g = def.kind === 'shake' ? buildShake(def, o) : def.kind === 'starter' ? buildStarter(def, o) : buildBiryani(def, o);
    if (o.hero) {
      var f = floaters(rng(7), o.mobile ? 8 : 14); g.add(f);
      var base = g.userData.anim;
      g.userData.anim = function (t, dt, px, py, freeze) { base(t, dt); f.userData.update(t, px, py, freeze); };
      g.userData.fitR = 1.85;
    }
    return g;
  }

  /* ---------- Stage: one renderer bound to one container ---------- */
  function Stage(container, opt) {
    opt = opt || {};
    var self = this, mobile = D.mobile;
    self.opt = opt; self.el = container; self.t = 0; self.wanted = false; self.visible = true; self.running = false; self.disposed = false;
    self.px = self.py = self.tx = self.ty = 0; self.yaw = opt.yaw == null ? -0.5 : opt.yaw; self.pitch = 0; self.vy = 0; self.last = 0;

    var r = self.renderer = new T.WebGLRenderer({ antialias: !mobile, alpha: true, powerPreference: 'high-performance' });
    r.outputEncoding = T.sRGBEncoding; r.toneMapping = T.ACESFilmicToneMapping; r.toneMappingExposure = 1.08;
    r.setPixelRatio(Math.min(W.devicePixelRatio || 1, mobile ? 1.5 : 2));
    var cv = self.canvas = r.domElement; cv.className = 'd3-canvas'; cv.setAttribute('aria-hidden', 'true');
    if (opt.drag) cv.style.touchAction = 'pan-y';
    container.appendChild(cv);

    var scene = self.scene = new T.Scene();
    self.camera = new T.PerspectiveCamera(32, 1, 0.1, 60);
    scene.add(new T.HemisphereLight(0xfff3dc, 0x1c3a2a, 0.95));
    var key = new T.DirectionalLight(0xfff0d0, 2.0); key.position.set(3, 5, 3.5); scene.add(key);
    var rim = new T.DirectionalLight(0x9fd2ff, 0.7); rim.position.set(-4, 2.5, -3); scene.add(rim);
    var warm = new T.PointLight(0xffb347, 1.1, 12); warm.position.set(-1.5, 1.5, 3); scene.add(warm);
    self.root = new T.Group(); scene.add(self.root);

    self.setDish = function (def) {
      if (self.dish) { self.root.remove(self.dish); dispose(self.dish); }
      self.def = def; self.dish = build(def, { mobile: mobile, hero: !!opt.hero });
      self.root.add(self.dish); self.fit(); self.renderOnce();
    };

    self.fit = function () {
      var w = container.clientWidth || 300, h = container.clientHeight || 300, ud = self.dish ? self.dish.userData : { fitR: 1.8, cy: 0.4 };
      r.setSize(w, h, false); self.camera.aspect = w / h;
      var tf = Math.tan(16 * Math.PI / 180), R = ud.fitR * (opt.pad || 1);
      var d = Math.max(R / tf, R / (tf * self.camera.aspect));
      var el = (opt.elev == null ? 26 : opt.elev) * Math.PI / 180;
      self.camera.position.set(0, ud.cy + Math.sin(el) * d, Math.cos(el) * d);
      self.camera.lookAt(0, ud.cy, 0); self.camera.updateProjectionMatrix();
    };

    self.update = function (dt) {
      var reduce = D.reduce;
      self.t += dt; self.px += (self.tx - self.px) * 0.07; self.py += (self.ty - self.py) * 0.07;
      if (!self.drag) { self.yaw += self.vy; self.vy *= 0.94; if (!reduce) self.yaw += (opt.spin == null ? (self.dish && self.dish.userData.spin) || 0.3 : opt.spin) * dt; }
      self.root.rotation.y = self.yaw + self.px * 0.4; self.root.rotation.x = self.pitch + self.py * 0.14;
      self.root.position.y = reduce ? 0 : Math.sin(self.t * 1.3) * 0.04;
      if (self.dish) self.dish.userData.anim(self.t, dt, self.px, self.py, reduce);
    };
    self.renderOnce = function () { if (self.disposed) return; self.update(0.0001); r.render(scene, self.camera); };
    self._tick = function (now) {
      if (!self.running || self.disposed) return;
      self._raf = requestAnimationFrame(self._tick);
      var dt = Math.min(0.05, (now - self.last) / 1000 || 0.016); self.last = now;
      self.update(dt); r.render(scene, self.camera);
    };
    self._sync = function () {
      var go = self.wanted && self.visible && !document.hidden && !self.disposed && !D.reduce;
      if (go && !self.running) { self.running = true; self.last = performance.now(); self._raf = requestAnimationFrame(self._tick); }
      else if (!go && self.running) { self.running = false; cancelAnimationFrame(self._raf); }
    };
    self.start = function () { self.wanted = true; self._sync(); };
    self.stop = function () { self.wanted = false; self._sync(); };

    // pointer parallax
    var pe = opt.pointerEl || container;
    function move(e) { var b = pe.getBoundingClientRect(); self.tx = Math.max(-1, Math.min(1, ((e.clientX - b.left) / b.width - 0.5) * 2)); self.ty = Math.max(-1, Math.min(1, ((e.clientY - b.top) / b.height - 0.5) * 2)); if (D.reduce) self.renderOnce(); }
    function leave() { self.tx = self.ty = 0; }
    if (!mobile) { pe.addEventListener('pointermove', move); pe.addEventListener('pointerleave', leave); }
    // drag to rotate
    if (opt.drag) {
      var lx = 0, ly = 0;
      cv.addEventListener('pointerdown', function (e) { self.drag = true; lx = e.clientX; ly = e.clientY; self.vy = 0; try { cv.setPointerCapture(e.pointerId); } catch (x) {} });
      cv.addEventListener('pointermove', function (e) { if (!self.drag) return; var dx = e.clientX - lx, dy = e.clientY - ly; lx = e.clientX; ly = e.clientY; self.yaw += dx * 0.012; self.vy = dx * 0.0016; self.pitch = Math.max(-0.5, Math.min(0.5, self.pitch + dy * 0.006)); if (!self.running) self.renderOnce(); });
      var up = function () { self.drag = false; };
      cv.addEventListener('pointerup', up); cv.addEventListener('pointercancel', up);
      container.addEventListener('keydown', function (e) {
        var s = 0.25; if (e.key === 'ArrowLeft') self.yaw -= s; else if (e.key === 'ArrowRight') self.yaw += s; else if (e.key === 'ArrowUp') self.pitch = Math.max(-0.5, self.pitch - 0.1); else if (e.key === 'ArrowDown') self.pitch = Math.min(0.5, self.pitch + 0.1); else return;
        e.preventDefault(); if (!self.running) self.renderOnce();
      });
    }
    // visibility + resize
    if ('IntersectionObserver' in W) { self._io = new IntersectionObserver(function (en) { self.visible = en[0].isIntersecting; self._sync(); }); self._io.observe(container); }
    if ('ResizeObserver' in W) { self._ro = new ResizeObserver(function () { self.fit(); if (!self.running) self.renderOnce(); }); self._ro.observe(container); }
    self._vis = function () { self._sync(); }; document.addEventListener('visibilitychange', self._vis);
    cv.addEventListener('webglcontextlost', function (e) { e.preventDefault(); self.onlost && self.onlost(); });

    self.dispose = function () {
      self.disposed = true; self.running = false; cancelAnimationFrame(self._raf);
      if (self._io) self._io.disconnect(); if (self._ro) self._ro.disconnect();
      document.removeEventListener('visibilitychange', self._vis);
      if (self.dish) dispose(self.dish); r.dispose();
      try { r.forceContextLoss(); } catch (e) {}
      if (cv.parentNode) cv.parentNode.removeChild(cv);
    };
    if (opt.def) self.setDish(opt.def);
  }

  D.createStage = function (container, opt) {
    return D.load().then(function () { return new Stage(container, opt); });
  };
})(window);
