/* Parichayam — immersive experience layer.
   Builds on the existing page (menu data `M`, `byId`, `add`, cart drawer). Safe to remove:
   without this file the site still works with the original photos. */
(function (W, doc) {
  'use strict';
  var D = W.Dishes3D;
  var $ = function (s, r) { return (r || doc).querySelector(s); };
  var $$ = function (s, r) { return Array.prototype.slice.call((r || doc).querySelectorAll(s)); };
  var reduce = D && D.reduce, fine = W.matchMedia('(pointer: fine)').matches;
  var IMG = 'images/menu/';

  function item(id) { try { return byId[id]; } catch (e) { return null; } }   // byId lives in index.html
  function defOf(id) { var m = item(id); return D.defFor(id, m[4], m[3]); }
  function esc(s) { return String(s).replace(/[&<>"]/g, function (c) { return { '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;' }[c]; }); }

  /* ---------- progress bar, header, active nav ---------- */
  var bar = doc.createElement('div'); bar.className = 'scroll-progress'; bar.setAttribute('aria-hidden', 'true'); doc.body.appendChild(bar);
  var ticking = false, header = $('header');
  function onScroll() {
    if (ticking) return; ticking = true;
    requestAnimationFrame(function () {
      var h = doc.documentElement.scrollHeight - W.innerHeight;
      bar.style.transform = 'scaleX(' + (h > 0 ? W.scrollY / h : 0) + ')';
      header.classList.toggle('scrolled', W.scrollY > 24); ticking = false;
    });
  }
  W.addEventListener('scroll', onScroll, { passive: true }); onScroll();

  var links = $$('#nav a');
  if ('IntersectionObserver' in W) {
    var secIO = new IntersectionObserver(function (es) {
      es.forEach(function (e) {
        if (!e.isIntersecting) return;
        links.forEach(function (a) { var on = a.getAttribute('href') === '#' + e.target.id; a.classList.toggle('active', on); if (on) a.setAttribute('aria-current', 'location'); else a.removeAttribute('aria-current'); });
      });
    }, { rootMargin: '-45% 0px -50% 0px' });
    $$('section[id]').forEach(function (s) { secIO.observe(s); });
  }
  links.forEach(function (a) { a.addEventListener('click', function () { $('#nav').classList.remove('open'); }); });

  /* ---------- toast: announce to screen readers ---------- */
  var toastEl = $('#toast'); if (toastEl) { toastEl.setAttribute('role', 'status'); toastEl.setAttribute('aria-live', 'polite'); }

  /* ---------- micro-interactions ---------- */
  doc.addEventListener('pointerdown', function (e) {
    var b = e.target.closest && e.target.closest('.btn, .cartlink'); if (!b || reduce) return;
    var r = b.getBoundingClientRect(), s = doc.createElement('span'), d = Math.max(r.width, r.height) * 1.4;
    s.className = 'ripple'; s.style.cssText = 'width:' + d + 'px;height:' + d + 'px;left:' + (e.clientX - r.left - d / 2) + 'px;top:' + (e.clientY - r.top - d / 2) + 'px';
    b.appendChild(s); setTimeout(function () { s.remove(); }, 650);
  });
  if (fine && !reduce) {
    $$('.hero .btn, .dark .btn, #resForm .btn, .sp-card .btn').forEach(function (b) {
      b.addEventListener('pointermove', function (e) { var r = b.getBoundingClientRect(); b.style.translate = ((e.clientX - r.left - r.width / 2) * 0.22) + 'px ' + ((e.clientY - r.top - r.height / 2) * 0.3) + 'px'; });
      b.addEventListener('pointerleave', function () { b.style.translate = ''; });
    });
  }
  var _add = W.add;
  if (typeof _add === 'function') {
    W.add = function (id) { _add(id); var c = $('.cartlink'); if (c && !reduce) { c.classList.remove('bump'); void c.offsetWidth; c.classList.add('bump'); } };
  }

  /* ---------- counters ---------- */
  $$('[data-count]').forEach(function (el) {
    var to = parseFloat(el.dataset.count), dec = +el.dataset.dec || 0, suf = el.dataset.suf || '';
    function fmt(v) { return (dec ? v.toFixed(dec) : Math.round(v).toLocaleString('en-IN')) + suf; }
    el.textContent = fmt(0);
    function run() {
      if (reduce) { el.textContent = fmt(to); return; }
      var t0 = performance.now(), dur = 1400;
      (function step(n) { var p = Math.min(1, (n - t0) / dur); el.textContent = fmt(to * (1 - Math.pow(1 - p, 3))); if (p < 1) requestAnimationFrame(step); })(t0);
    }
    if ('IntersectionObserver' in W) { var io = new IntersectionObserver(function (es) { if (es[0].isIntersecting) { run(); io.disconnect(); } }, { threshold: 0.5 }); io.observe(el); } else el.textContent = fmt(to);
  });

  /* ---------- open now ---------- */
  (function () {
    var el = $('#openNow'); if (!el) return;
    function upd() {
      var p = new Intl.DateTimeFormat('en-GB', { timeZone: 'Asia/Kolkata', hour: 'numeric', minute: 'numeric', hour12: false }).formatToParts(new Date()), h = 0;
      p.forEach(function (x) { if (x.type === 'hour') h = +x.value % 24; });
      var open = h >= 11 && h < 23;
      el.className = 'open-now ' + (open ? 'yes' : 'no');
      el.innerHTML = '<span class="dot" aria-hidden="true"></span>' + (open ? 'Open now · closes 11:00 PM' : 'Closed now · opens 11:00 AM');
    }
    upd(); setInterval(upd, 60000);
  })();

  /* ---------- reservation form → WhatsApp (same channel the site already uses) ---------- */
  (function () {
    var f = $('#resForm'); if (!f) return;
    var d = f.elements.date; if (d) { var n = new Date(); d.min = n.getFullYear() + '-' + String(n.getMonth() + 1).padStart(2, '0') + '-' + String(n.getDate()).padStart(2, '0'); }
    f.addEventListener('submit', function (e) {
      e.preventDefault(); if (!f.reportValidity()) return;
      var v = f.elements, msg = 'Hello Parichayam! I would like to reserve:\n• Name: ' + v.name.value + '\n• Guests: ' + v.guests.value + '\n• Date: ' + v.date.value + '\n• Time: ' + v.time.value + (v.notes.value ? '\n• Notes: ' + v.notes.value : '');
      W.open('https://wa.me/919014498145?text=' + encodeURIComponent(msg), '_blank');
      if (W.toast) W.toast('Opening WhatsApp to confirm your reservation');
    });
  })();

  if (!D) return;

  /* ---------- hero ---------- */
  (function () {
    var mount = $('#hero3d'), hero = $('.hero'); if (!mount || !D.supported) return;
    D.createStage(mount, { def: { kind: 'biryani', id: 'chicken-dum-biryani', veg: false }, hero: true, pointerEl: hero, spin: 0.26, elev: 22 })
      .then(function (st) {
        hero.classList.add('hero-3d'); st.start(); requestAnimationFrame(function () { mount.classList.add('ready'); });
        st.onlost = function () { hero.classList.remove('hero-3d'); mount.classList.remove('ready'); };
      }).catch(function () { /* keeps the photo */ });
  })();

  /* ---------- hover 3D on menu cards (desktop, motion allowed) ---------- */
  var hv = null, hvHost = null, hvCard = null, hvBusy = false, hvOff = 0;
  function activate(card) {
    if (D.mobile || reduce || !D.supported || hvBusy && hvCard === card) return;
    clearTimeout(hvOff); hvCard = card;
    var id = card.dataset.id; if (!item(id)) return;
    if (!hvHost) { hvHost = doc.createElement('div'); hvHost.className = 'd3-hover'; hvHost.setAttribute('aria-hidden', 'true'); }
    card.querySelector('.im').appendChild(hvHost); hvHost.classList.remove('on');
    var show = function () {
      if (hvCard !== card) return;
      hv.setDish(defOf(id)); hv.start(); requestAnimationFrame(function () { if (hvCard === card) hvHost.classList.add('on'); });
    };
    if (hv) show();
    else if (!hvBusy) { hvBusy = true; D.createStage(hvHost, { spin: 0.7, elev: 24, pointerEl: hvHost, yaw: -0.4, pad: 0.82 }).then(function (s) { hv = s; hvBusy = false; show(); }).catch(function () { hvBusy = false; }); }
  }
  function deactivate() {
    hvCard = null; if (hvHost) hvHost.classList.remove('on');
    hvOff = setTimeout(function () { if (!hvCard) { if (hv) hv.stop(); if (hvHost && hvHost.parentNode) hvHost.parentNode.removeChild(hvHost); } }, 260);
  }
  doc.addEventListener('mouseover', function (e) { var c = e.target.closest && e.target.closest('.card[data-id]'); if (c && c !== hvCard) activate(c); });
  doc.addEventListener('mouseout', function (e) { if (hvCard && !hvCard.contains(e.relatedTarget)) deactivate(); });
  doc.addEventListener('focusin', function (e) { var c = e.target.closest && e.target.closest('.card[data-id]'); if (c && c !== hvCard) activate(c); });
  doc.addEventListener('focusout', function (e) { if (hvCard && !hvCard.contains(e.relatedTarget)) deactivate(); });

  /* ---------- "View dish" modal ---------- */
  var dlg = null, dlgStage = null, opener = null;
  function buildDlg() {
    dlg = doc.createElement('div'); dlg.className = 'dlg-back'; dlg.id = 'dlg'; dlg.hidden = true;
    dlg.innerHTML = '<div class="dlg" role="dialog" aria-modal="true" aria-labelledby="dlg-t"><button class="dlg-x" type="button" aria-label="Close dish view">×</button>' +
      '<div class="dlg-stage" id="dlg-stage" tabindex="0"><img alt="" id="dlg-img"><p class="dlg-hint">Drag or use ← → keys to rotate</p></div>' +
      '<div class="dlg-info"><span class="pill" id="dlg-pill"></span><h3 id="dlg-t"></h3><div class="price" id="dlg-price"></div><p class="gift" id="dlg-gift"></p>' +
      '<p class="dlg-note">Free delivery within 3 km of Angallu. Orders are confirmed on WhatsApp.</p>' +
      '<div class="act"><button class="btn gold" type="button" id="dlg-add">Add to order</button><button class="btn ghost" type="button" id="dlg-cart">Open cart</button></div>' +
      '<img class="dlg-photo" id="dlg-photo" alt=""></div></div>';
    doc.body.appendChild(dlg);
    dlg.addEventListener('click', function (e) { if (e.target === dlg) closeDlg(); });
    $('.dlg-x', dlg).addEventListener('click', closeDlg);
    dlg.addEventListener('keydown', function (e) {
      if (e.key === 'Escape') { closeDlg(); return; }
      if (e.key !== 'Tab') return;
      var f = $$('button, [href], [tabindex="0"]', dlg).filter(function (x) { return !x.disabled && x.offsetParent !== null; });
      if (!f.length) return; var a = f[0], z = f[f.length - 1];
      if (e.shiftKey && doc.activeElement === a) { e.preventDefault(); z.focus(); } else if (!e.shiftKey && doc.activeElement === z) { e.preventDefault(); a.focus(); }
    });
  }
  function viewDish(id) {
    var m = item(id); if (!m) return;
    if (!dlg) buildDlg();
    opener = doc.activeElement;
    var veg = m[3] === 'v';
    $('#dlg-t').textContent = m[1]; $('#dlg-price').textContent = '₹' + m[2];
    var p = $('#dlg-pill'); p.textContent = veg ? '● Veg' : '● Non-Veg'; p.className = 'pill ' + (veg ? 'v' : 'n');
    var g = $('#dlg-gift'); g.textContent = m[5] ? '🎁 ' + m[5] : ''; g.hidden = !m[5];
    $('#dlg-img').src = IMG + id + '.jpg'; $('#dlg-img').alt = m[1];
    $('#dlg-photo').src = IMG + id + '.jpg'; $('#dlg-photo').alt = 'Photo of ' + m[1];
    $('#dlg-stage').setAttribute('aria-label', '3D view of ' + m[1] + '. Drag, or use the arrow keys, to rotate.');
    $('#dlg-add').onclick = function () { W.add(id); };
    $('#dlg-cart').onclick = function () { closeDlg(); W.toggleCart(true); };
    dlg.hidden = false; doc.body.classList.add('no-scroll');
    requestAnimationFrame(function () { dlg.classList.add('open'); $('.dlg-x', dlg).focus(); });
    var st = $('#dlg-stage'); st.classList.remove('has3d');
    if (!D.supported) return;
    var go = function () { dlgStage.setDish(defOf(id)); dlgStage.start(); st.classList.add('has3d'); };
    if (dlgStage) go(); else D.createStage(st, { drag: true, spin: 0.35, elev: 24, pad: 0.95 }).then(function (s) { dlgStage = s; go(); }).catch(function () {});
  }
  function closeDlg() {
    if (!dlg || dlg.hidden) return;
    dlg.classList.remove('open'); doc.body.classList.remove('no-scroll'); if (dlgStage) dlgStage.stop();
    setTimeout(function () { dlg.hidden = true; }, 220);
    if (opener && opener.focus) opener.focus();
  }
  W.viewDish = viewDish;

  /* ---------- Chef's specials (data comes from the existing menu) ---------- */
  (function () {
    var grid = $('#spgrid'); if (!grid) return;
    var ids = ['mughalai-biryani', 'dragon-chicken', 'paneer-biryani'].filter(item);
    grid.innerHTML = ids.map(function (id, i) {
      var m = item(id);
      return '<article class="sp-card" data-id="' + id + '" style="--i:' + i + '"><div class="sp-stage" tabindex="0" aria-label="3D preview of ' + esc(m[1]) + '. Drag or use the arrow keys to rotate."><img src="' + IMG + id + '.jpg" alt="' + esc(m[1]) + '" loading="lazy"></div>' +
        '<div class="sp-bd"><span class="pill ' + m[3] + '">' + (m[3] === 'v' ? '● Veg' : '● Non-Veg') + '</span><h3>' + esc(m[1]) + '</h3><div class="price">₹' + m[2] + '</div>' +
        (m[5] ? '<p class="gift">🎁 ' + esc(m[5]) + '</p>' : '') +
        '<div class="act"><button class="btn ghost" type="button" onclick="viewDish(\'' + id + '\')" aria-label="View dish: ' + esc(m[1]) + '">View dish</button><button class="btn gold" type="button" onclick="add(\'' + id + '\')" aria-label="Add ' + esc(m[1]) + ' to order">Add to order</button></div></div></article>';
    }).join('');
    if (!D.supported || !('IntersectionObserver' in W)) return;
    $$('.sp-card', grid).forEach(function (card) {
      var stageEl = $('.sp-stage', card), made = false, st = null;
      new IntersectionObserver(function (es) {
        var on = es[0].isIntersecting;
        if (on && !made) {
          made = true;
          D.createStage(stageEl, { def: defOf(card.dataset.id), drag: true, spin: 0.45, elev: 24, pad: 0.92 }).then(function (s) { st = s; stageEl.classList.add('ready'); s.start(); }).catch(function () {});
        } else if (st) { on ? st.start() : st.stop(); }
      }, { rootMargin: '150px' }).observe(card);
    });
  })();
})(window, document);
