/* liquid-glass.js — real liquid glass for the web. Zero dependencies.
 *
 * The technique (the same one Apple's Liquid Glass uses, rebuilt for the web):
 *  1. For each glass element, generate a displacement map at runtime from the
 *     element's own rounded-rectangle SDF: neutral (128,128) in the middle so
 *     the centre stays perfectly readable, bending only in a band near the rim.
 *  2. Feed that map into an SVG filter chain that splits the backdrop into
 *     R / G / B channels and displaces each by a slightly different scale
 *     (60 / 54 / 48) — that difference is the chromatic dispersion you see
 *     fringing the edges of real glass.
 *  3. Drive a specular sheen from the pointer / device tilt, smoothed with a
 *     little idle sway, so the highlight feels alive instead of painted on.
 *
 * Usage: add class="lg" (or a data-lg attribute) to an element and include
 * liquid-glass.css. Elements get the refraction once their map is ready;
 * until then (and on browsers without SVG filters in backdrop-filter) they
 * show the frosted-glass fallback from the CSS. Nothing ever looks broken.
 */
(function () {
  'use strict';
  var SVGNS = 'http://www.w3.org/2000/svg';
  var SCALES = [60, 54, 48]; // R, G, B displacement scales -> dispersion

  function sdf(x, y, w, h, r) {
    var cx = w / 2, cy = h / 2;
    var qx = Math.abs(x - cx) - (cx - r), qy = Math.abs(y - cy) - (cy - r);
    var ax = Math.max(qx, 0), ay = Math.max(qy, 0);
    return Math.hypot(ax, ay) + Math.min(Math.max(qx, qy), 0) - r;
  }

  function buildMap(w, h, r) {
    var band = Math.max(14, Math.min(w, h) * 0.34);
    var cv = document.createElement('canvas');
    cv.width = w; cv.height = h;
    var ctx = cv.getContext('2d');
    var im = ctx.createImageData(w, h), px = im.data;
    for (var y = 0; y < h; y++) for (var x = 0; x < w; x++) {
      var idx = (y * w + x) * 4;
      px[idx] = 128; px[idx + 1] = 128; px[idx + 2] = 128; px[idx + 3] = 255;
      var d = sdf(x + 0.5, y + 0.5, w, h, r);
      if (d >= -0.5) {
        var depth = Math.max(0, -d), t = Math.min(1, depth / band);
        var f = Math.pow(1 - t, 1.6);
        if (f > 0.003) {
          var e = 1.2;
          var gx = sdf(x + 0.5 + e, y + 0.5, w, h, r) - sdf(x + 0.5 - e, y + 0.5, w, h, r);
          var gy = sdf(x + 0.5, y + 0.5 + e, w, h, r) - sdf(x + 0.5, y + 0.5 - e, w, h, r);
          var gl = Math.hypot(gx, gy) || 1;
          px[idx]     = 128 + (-(gx / gl) * f * 0.92) * 127;
          px[idx + 1] = 128 + (-(gy / gl) * f * 0.92) * 127;
        }
      }
    }
    ctx.putImageData(im, 0, 0);
    return cv.toDataURL('image/png');
  }

  var MATS = [
    '1 0 0 0 0  0 0 0 0 0  0 0 0 0 0  0 0 0 1 0',
    '0 0 0 0 0  0 1 0 0 0  0 0 0 0 0  0 0 0 1 0',
    '0 0 0 0 0  0 0 0 0 0  0 0 1 0 0  0 0 0 1 0'
  ];

  function makeFilter(id) {
    var svg = document.createElementNS(SVGNS, 'svg');
    svg.setAttribute('width', '0'); svg.setAttribute('height', '0');
    svg.setAttribute('aria-hidden', 'true');
    svg.style.position = 'absolute';
    var defs = document.createElementNS(SVGNS, 'defs');
    var filter = document.createElementNS(SVGNS, 'filter');
    filter.setAttribute('id', id);
    filter.setAttribute('x', '0%'); filter.setAttribute('y', '0%');
    filter.setAttribute('width', '100%'); filter.setAttribute('height', '100%');
    filter.setAttribute('color-interpolation-filters', 'sRGB');
    var feImage = document.createElementNS(SVGNS, 'feImage');
    feImage.setAttribute('preserveAspectRatio', 'none');
    feImage.setAttribute('result', 'map');
    filter.appendChild(feImage);
    var chans = ['r', 'g', 'b'], prev = null;
    chans.forEach(function (c, i) {
      var cm = document.createElementNS(SVGNS, 'feColorMatrix');
      cm.setAttribute('in', 'SourceGraphic');
      cm.setAttribute('type', 'matrix');
      cm.setAttribute('values', MATS[i]);
      cm.setAttribute('result', c + 'C');
      filter.appendChild(cm);
      var dm = document.createElementNS(SVGNS, 'feDisplacementMap');
      dm.setAttribute('in', c + 'C');
      dm.setAttribute('in2', 'map');
      dm.setAttribute('scale', String(SCALES[i]));
      dm.setAttribute('xChannelSelector', 'R');
      dm.setAttribute('yChannelSelector', 'G');
      dm.setAttribute('result', c + 'D');
      filter.appendChild(dm);
      if (prev) {
        var blend = document.createElementNS(SVGNS, 'feBlend');
        blend.setAttribute('in', prev);
        blend.setAttribute('in2', c + 'D');
        blend.setAttribute('mode', 'screen');
        if (i < 2) blend.setAttribute('result', 'blend' + i);
        filter.appendChild(blend);
        prev = 'blend' + i;
      } else {
        prev = c + 'D';
      }
    });
    defs.appendChild(filter);
    svg.appendChild(defs);
    document.body.appendChild(svg);
    return feImage;
  }

  function radiusOf(el, h) {
    var v = parseFloat(getComputedStyle(el).borderTopLeftRadius) || 0;
    return Math.max(0, Math.min(v, h / 2));
  }

  var refreshers = [];
  function enhance(el, i) {
    var img = makeFilter('lg-refract-' + i);
    function apply() {
      var w = el.offsetWidth, h = el.offsetHeight;
      if (!w || !h) return;
      img.setAttribute('href', buildMap(w, h, radiusOf(el, h)));
      img.setAttribute('width', String(w));
      img.setAttribute('height', String(h));
      el.style.setProperty('--lg-filter', 'url(#lg-refract-' + i + ')');
      el.classList.add('lg-on');
    }
    refreshers.push(apply);
    apply();
  }

  function init() {
    var els = document.querySelectorAll('.lg, [data-lg]');
    for (var i = 0; i < els.length; i++) enhance(els[i], i);
  }
  if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', init);
  } else {
    init();
  }

  var rto;
  addEventListener('resize', function () {
    clearTimeout(rto);
    rto = setTimeout(function () { refreshers.forEach(function (f) { f(); }); }, 180);
  });

  /* ---- live specular: pointer / tilt, smoothed, with a gentle idle sway ---- */
  var root = document.documentElement;
  var tx = 0, ty = 0, gx = 0, gy = 0;
  addEventListener('pointermove', function (e) {
    gx = (e.clientX / innerWidth - 0.5) * 22;
    gy = (e.clientY / innerHeight - 0.5) * 14;
  }, { passive: true });
  addEventListener('deviceorientation', function (e) {
    if (e.gamma != null) {
      gx = Math.max(-1, Math.min(1, e.gamma / 28)) * 20;
      gy = Math.max(-1, Math.min(1, (e.beta - 45) / 28)) * 12;
    }
  }, { passive: true });

  /* ---- optional scene flash hook -------------------------------------------
   * If the page has an element with [data-lg-flash] whose opacity animates
   * (a lightning overlay, a camera flash, ...), the glass answers it: the
   * --lg-flash variable rises and the sheen/rim brighten for a moment.     */
  var flashEl = document.querySelector('[data-lg-flash]');
  if (flashEl && window.MutationObserver) {
    new MutationObserver(function () {
      var o = parseFloat(flashEl.style.opacity) || 0;
      root.style.setProperty('--lg-flash', Math.min(1, o * 4).toFixed(3));
    }).observe(flashEl, { attributes: true, attributeFilter: ['style'] });
  }

  (function anim() {
    var t = performance.now() / 1000;
    var ix = Math.sin(t * 0.4) * 3.5, iy = Math.cos(t * 0.31) * 2.5;
    tx += (gx + ix - tx) * 0.06;
    ty += (gy + iy - ty) * 0.06;
    root.style.setProperty('--lg-tx', tx.toFixed(1) + 'px');
    root.style.setProperty('--lg-ty', ty.toFixed(1) + 'px');
    root.style.setProperty('--lg-bx', (tx * 2.2).toFixed(1) + '%');
    root.style.setProperty('--lg-ang', Math.atan2(ty, tx).toFixed(3) + 'rad');
    requestAnimationFrame(anim);
  })();

  window.LiquidGlass = {
    refresh: function () { refreshers.forEach(function (f) { f(); }); },
    setFlash: function (v) {
      root.style.setProperty('--lg-flash', Math.max(0, Math.min(1, v)).toFixed(3));
    }
  };
})();
