/* Hadith Generator — image cards for social media.
   Draws a hadith onto a <canvas> at full resolution in one of several
   designs, palettes and sizes. No libraries; fonts come from the page. */
var HadithCard = (function () {
  'use strict';

  var SIZES = {
    square:   { w: 1080, h: 1080, en: 'Post',     ar: 'منشور', hint: '1:1' },
    portrait: { w: 1080, h: 1350, en: 'Portrait', ar: 'طولي',  hint: '4:5' },
    story:    { w: 1080, h: 1920, en: 'Story',    ar: 'قصة',   hint: '9:16' },
    wide:     { w: 1600, h: 900,  en: 'Wide',     ar: 'عريض',  hint: '16:9' }
  };

  // Every palette comes from the Sakīna family of the Islamic Projects.
  var PALETTES = {
    midnight:   { en: 'Midnight',   ar: 'منتصف الليل', bg: '#0B1624', bg2: '#16304D', fg: '#F2EEE3', muted: '#AEBDCD', accent: '#EBC46F', pattern: '#8FB4D9', dark: true },
    pearl:      { en: 'Pearl',      ar: 'لؤلؤ',       bg: '#F6F4EE', bg2: '#E9E3D3', fg: '#13202F', muted: '#45526A', accent: '#8E6214', pattern: '#0E7C72', dark: false },
    iznik:      { en: 'Iznik',      ar: 'إزنيق',      bg: '#0E7C72', bg2: '#075A52', fg: '#FFFFFF', muted: '#CDEAE5', accent: '#F3D38A', pattern: '#FFFFFF', dark: true },
    saffron:    { en: 'Saffron',    ar: 'زعفران',     bg: '#F5E8C6', bg2: '#EAD49C', fg: '#3B2A08', muted: '#6E5520', accent: '#8E6214', pattern: '#8E6214', dark: false },
    lapis:      { en: 'Lapis',      ar: 'لازورد',     bg: '#1C2B6B', bg2: '#101A4A', fg: '#F4F1FF', muted: '#C9D2F5', accent: '#EBC46F', pattern: '#97ADFF', dark: true },
    lavender:   { en: 'Lavender',   ar: 'خزامى',      bg: '#ECE5FB', bg2: '#D9CCF6', fg: '#26184F', muted: '#4F4180', accent: '#7048C8', pattern: '#7048C8', dark: false },
    terracotta: { en: 'Terracotta', ar: 'طين',        bg: '#B54A30', bg2: '#8C3421', fg: '#FFF6EE', muted: '#F8D9CC', accent: '#FFD9A0', pattern: '#FFFFFF', dark: true },
    olive:      { en: 'Olive',      ar: 'زيتون',      bg: '#E9F0D6', bg2: '#D5E1B4', fg: '#23300A', muted: '#4A5A22', accent: '#5B7A1E', pattern: '#5B7A1E', dark: false },
    rose:       { en: 'Rose',       ar: 'ورد',        bg: '#F8E1E5', bg2: '#EFC6CE', fg: '#3E1320', muted: '#7A3645', accent: '#B83C54', pattern: '#B83C54', dark: false }
  };

  var STYLES = {
    arch:    { en: 'Arch',    ar: 'قوس' },
    tile:    { en: 'Tiles',   ar: 'زليج' },
    minimal: { en: 'Minimal', ar: 'بسيط' },
    horizon: { en: 'Horizon', ar: 'أفق' },
    frame:   { en: 'Frame',   ar: 'إطار' }
  };

  // A calm default palette for each topic, so every hadith starts with its own colour
  var TOPIC_PALETTE = {
    Intentions: 'midnight', Brotherhood: 'iznik', 'Self-control': 'lapis', Speech: 'pearl', Character: 'olive',
    Kindness: 'rose', Family: 'rose', Charity: 'saffron', Neighbors: 'terracotta', Knowledge: 'lapis',
    Worship: 'midnight', Contentment: 'lavender', Guidance: 'iznik', Faith: 'midnight', Certainty: 'pearl',
    Modesty: 'lavender', Mercy: 'rose', Hospitality: 'saffron', Sincerity: 'olive'
  };

  var FONTS = {
    en: '"Instrument Serif", Georgia, serif',
    ar: 'Amiri, "Traditional Arabic", serif',
    ui: 'Figtree, "Segoe UI", system-ui, sans-serif',
    arUi: '"IBM Plex Sans Arabic", "Segoe UI", Tahoma, sans-serif'
  };

  var fontsReady = null;
  function ready() {
    if (fontsReady) return fontsReady;
    if (!document.fonts || !document.fonts.load) return (fontsReady = Promise.resolve());
    fontsReady = Promise.all([
      document.fonts.load('400 64px "Instrument Serif"'),
      document.fonts.load('italic 400 64px "Instrument Serif"'),
      document.fonts.load('400 64px Amiri', 'بسم'),
      document.fonts.load('700 64px Amiri', 'بسم'),
      document.fonts.load('600 32px Figtree'),
      document.fonts.load('600 32px "IBM Plex Sans Arabic"', 'بسم')
    ]).catch(function () { /* draw with fallbacks */ });
    return fontsReady;
  }

  /* ---------- small helpers ---------- */
  function rng(seed) { // mulberry32 — the same hadith and design always draw the same stars
    var a = seed >>> 0;
    return function () {
      a = (a + 0x6D2B79F5) | 0;
      var t = Math.imul(a ^ (a >>> 15), 1 | a);
      t = (t + Math.imul(t ^ (t >>> 7), 61 | t)) ^ t;
      return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
    };
  }
  function hexA(hex, alpha) {
    var n = parseInt(hex.slice(1), 16);
    return 'rgba(' + (n >> 16 & 255) + ',' + (n >> 8 & 255) + ',' + (n & 255) + ',' + alpha + ')';
  }
  function starPath(ctx, cx, cy, R) {
    var a = 0.7071 * R, b = 0.2929 * R;
    var pts = [[R, 0], [a, b], [a, a], [b, a], [0, R], [-b, a], [-a, a], [-a, b], [-R, 0], [-a, -b], [-a, -a], [-b, -a], [0, -R], [b, -a], [a, -a], [a, -b]];
    ctx.beginPath();
    pts.forEach(function (p, i) { if (i) ctx.lineTo(cx + p[0], cy + p[1]); else ctx.moveTo(cx + p[0], cy + p[1]); });
    ctx.closePath();
  }
  function archPath(ctx, x, y, w, h, r) {
    var rad = w / 2;
    ctx.beginPath();
    ctx.moveTo(x, y + h - r);
    ctx.lineTo(x, y + rad);
    ctx.arc(x + rad, y + rad, rad, Math.PI, 0);
    ctx.lineTo(x + w, y + h - r);
    ctx.quadraticCurveTo(x + w, y + h, x + w - r, y + h);
    ctx.lineTo(x + r, y + h);
    ctx.quadraticCurveTo(x, y + h, x, y + h - r);
    ctx.closePath();
  }
  function roundRect(ctx, x, y, w, h, r) {
    ctx.beginPath();
    ctx.moveTo(x + r, y);
    ctx.arcTo(x + w, y, x + w, y + h, r);
    ctx.arcTo(x + w, y + h, x, y + h, r);
    ctx.arcTo(x, y + h, x, y, r);
    ctx.arcTo(x, y, x + w, y, r);
    ctx.closePath();
  }
  function girih(ctx, W, H, color, alpha, cell) {
    ctx.save();
    ctx.strokeStyle = hexA(color, alpha);
    ctx.lineWidth = Math.max(1, cell / 60);
    var R = cell * 0.18;
    for (var y = 0; y <= H + cell; y += cell) {
      for (var x = 0; x <= W + cell; x += cell) {
        starPath(ctx, x, y, R); ctx.stroke();
        starPath(ctx, x + cell / 2, y + cell / 2, R); ctx.stroke();
        ctx.beginPath();
        ctx.moveTo(x + cell / 2, y + cell / 2 - R); ctx.lineTo(x + cell / 2, y + R);
        ctx.moveTo(x + cell / 2, y + cell / 2 + R); ctx.lineTo(x + cell / 2, y + cell - R);
        ctx.moveTo(x + cell / 2 - R, y + cell / 2); ctx.lineTo(x + R, y + cell / 2);
        ctx.moveTo(x + cell / 2 + R, y + cell / 2); ctx.lineTo(x + cell - R, y + cell / 2);
        ctx.stroke();
      }
    }
    ctx.restore();
  }
  function wrap(ctx, text, maxW) {
    var words = String(text).split(/\s+/), lines = [], line = '';
    words.forEach(function (w) {
      var test = line ? line + ' ' + w : w;
      if (ctx.measureText(test).width > maxW && line) { lines.push(line); line = w; }
      else line = test;
    });
    if (line) lines.push(line);
    return lines;
  }

  /* ---------- text layout: fits the hadith into a box ---------- */
  function layout(ctx, h, lang, box, S) {
    var showAr = lang === 'ar' || lang === 'both';
    var showEn = lang === 'en' || lang === 'both';
    var arText = h.text_ar || h.text;
    var enText = '“' + h.text + '”';
    var max = Math.round(box.w * (lang === 'both' ? 0.1 : 0.12));
    var min = Math.round(box.w * 0.035);
    var best = null;
    for (var size = max; size >= min; size -= 2) {
      var blocks = [], total = 0;
      if (showAr) {
        var as = lang === 'both' ? size : size;
        ctx.font = '400 ' + as + 'px ' + FONTS.ar;
        var al = wrap(ctx, arText, box.w);
        var alh = as * 1.72;
        blocks.push({ kind: 'ar', size: as, lines: al, lh: alh, h: al.length * alh });
      }
      if (showAr && showEn) blocks.push({ kind: 'gap', h: size * 0.9 });
      if (showEn) {
        var es = lang === 'both' ? Math.round(size * 0.62) : size;
        ctx.font = (lang === 'both' ? 'italic ' : '') + '400 ' + es + 'px ' + FONTS.en;
        var el = wrap(ctx, enText, box.w);
        var elh = es * 1.2;
        blocks.push({ kind: 'en', size: es, lines: el, lh: elh, h: el.length * elh });
      }
      blocks.forEach(function (b) { total += b.h; });
      best = { blocks: blocks, h: total, size: size };
      if (total <= box.h) break;
    }
    return best;
  }

  function drawText(ctx, h, opts, box, P, S) {
    var lang = opts.lang;
    var metaAr = lang === 'ar';
    var unit = Math.min(S.w, S.h) / 1080;
    // room for the narrator and reference lines under the text
    var metaH = 140 * unit;
    var L = layout(ctx, h, lang, { x: box.x, y: box.y, w: box.w, h: Math.max(80 * unit, box.h - metaH) }, S);
    var top = box.y + Math.max(0, (box.h - L.h - metaH) / 2);
    ctx.textAlign = 'center';
    ctx.textBaseline = 'alphabetic';
    var cx = box.x + box.w / 2;
    L.blocks.forEach(function (b) {
      if (b.kind === 'gap') {
        ctx.save();
        ctx.fillStyle = P.accent;
        starPath(ctx, cx, top + b.h / 2, 9 * unit); ctx.fill();
        ctx.fillRect(cx - 90 * unit, top + b.h / 2 - 1, 60 * unit, 2);
        ctx.fillRect(cx + 30 * unit, top + b.h / 2 - 1, 60 * unit, 2);
        ctx.restore();
        top += b.h;
        return;
      }
      ctx.save();
      if (b.kind === 'ar') {
        ctx.direction = 'rtl';
        ctx.font = '400 ' + b.size + 'px ' + FONTS.ar;
        ctx.fillStyle = P.fg;
      } else {
        ctx.direction = 'ltr';
        ctx.font = (lang === 'both' ? 'italic ' : '') + '400 ' + b.size + 'px ' + FONTS.en;
        ctx.fillStyle = lang === 'both' ? P.muted : P.fg;
      }
      b.lines.forEach(function (line, i) { ctx.fillText(line, cx, top + (i + 0.78) * b.lh); });
      ctx.restore();
      top += b.h;
    });
    // narrator and reference
    top += 44 * unit;
    ctx.save();
    ctx.direction = metaAr ? 'rtl' : 'ltr';
    ctx.fillStyle = P.muted;
    ctx.font = (metaAr ? '500 ' : '500 ') + Math.round(27 * unit) + 'px ' + (metaAr ? FONTS.arUi : FONTS.ui);
    var who = metaAr ? 'الراوي: ' + (h.narrator_ar || h.narrator) : 'Narrated by ' + h.narrator;
    ctx.fillText(who, cx, top);
    ctx.fillStyle = P.accent;
    ctx.font = '700 ' + Math.round(27 * unit) + 'px ' + (metaAr ? FONTS.arUi : FONTS.ui);
    wrap(ctx, metaAr ? (h.reference_ar || h.reference) : h.reference, box.w).forEach(function (line, i) {
      ctx.fillText(line, cx, top + (i + 1) * 40 * unit);
    });
    ctx.restore();
  }

  function topicChip(ctx, text, x, y, P, unit, rtl) {
    ctx.save();
    ctx.font = '700 ' + Math.round(24 * unit) + 'px ' + (rtl ? FONTS.arUi : FONTS.ui);
    ctx.direction = rtl ? 'rtl' : 'ltr';
    var label = rtl ? text : text.toUpperCase();
    if (!rtl) { try { ctx.letterSpacing = (3 * unit) + 'px'; } catch (e) { /* older canvas */ } }
    var w = ctx.measureText(label).width + 44 * unit, hgt = 50 * unit;
    roundRect(ctx, x - w / 2, y - hgt / 2, w, hgt, hgt / 2);
    ctx.fillStyle = hexA(P.accent, P.dark ? 0.16 : 0.12);
    ctx.fill();
    ctx.fillStyle = P.accent;
    ctx.textAlign = 'center';
    ctx.textBaseline = 'middle';
    ctx.fillText(label, x, y + 2 * unit);
    ctx.restore();
  }

  function watermark(ctx, S, P, unit, rtl, y) {
    ctx.save();
    ctx.globalAlpha = 0.72;
    ctx.fillStyle = P.muted;
    ctx.font = '600 ' + Math.round(22 * unit) + 'px ' + FONTS.ui;
    ctx.textAlign = 'center';
    ctx.textBaseline = 'middle';
    var label = 'husseinbenz.github.io/hadith-generator';
    var w = ctx.measureText(label).width;
    ctx.fillText(label, S.w / 2 + 16 * unit, y);
    ctx.fillStyle = P.accent;
    starPath(ctx, S.w / 2 - w / 2 - 6 * unit, y, 10 * unit);
    ctx.fill();
    ctx.restore();
  }

  function skyline(ctx, S, color, unit) {
    // a quiet row of domes and minarets along the bottom edge
    ctx.save();
    ctx.fillStyle = color;
    var base = S.h, s = unit * 1.3, cx = S.w / 2;
    ctx.fillRect(0, base - 40 * s, S.w, 40 * s);
    function dome(x, w, hgt) {
      ctx.fillRect(x - w / 2, base - 40 * s - hgt * 0.55, w, hgt * 0.55 + 1);
      ctx.beginPath();
      ctx.moveTo(x - w / 2, base - 40 * s - hgt * 0.55);
      ctx.bezierCurveTo(x - w / 2, base - 40 * s - hgt * 1.05, x - w * 0.1, base - 40 * s - hgt * 1.1, x, base - 40 * s - hgt * 1.25);
      ctx.bezierCurveTo(x + w * 0.1, base - 40 * s - hgt * 1.1, x + w / 2, base - 40 * s - hgt * 1.05, x + w / 2, base - 40 * s - hgt * 0.55);
      ctx.fill();
    }
    function minaret(x, hgt) {
      ctx.fillRect(x - 9 * s, base - 40 * s - hgt, 18 * s, hgt);
      ctx.fillRect(x - 15 * s, base - 40 * s - hgt * 0.7, 30 * s, 7 * s);
      ctx.beginPath();
      ctx.moveTo(x - 10 * s, base - 40 * s - hgt);
      ctx.lineTo(x, base - 40 * s - hgt - 30 * s);
      ctx.lineTo(x + 10 * s, base - 40 * s - hgt);
      ctx.fill();
    }
    dome(cx, 190 * s, 150 * s);
    minaret(cx - 150 * s, 230 * s);
    minaret(cx + 150 * s, 230 * s);
    dome(cx - 300 * s, 110 * s, 80 * s);
    dome(cx + 300 * s, 110 * s, 80 * s);
    ctx.fillRect(0, base - 90 * s, cx - 360 * s, 50 * s);
    ctx.fillRect(cx + 360 * s, base - 70 * s, S.w, 30 * s);
    ctx.restore();
  }

  /* ---------- the designs ---------- */
  function render(canvas, h, opts) {
    var S = SIZES[opts.size] || SIZES.square;
    var P = PALETTES[opts.palette] || PALETTES.midnight;
    var style = STYLES[opts.style] ? opts.style : 'arch';
    var rtl = opts.lang === 'ar';
    canvas.width = S.w;
    canvas.height = S.h;
    var ctx = canvas.getContext('2d');
    var unit = Math.min(S.w, S.h) / 1080;
    var rand = rng((h.id || 1) * 97 + style.length * 13 + S.h);
    var topic = rtl ? (h.topic_ar || h.topic) : h.topic;
    var pad = (S.w > S.h ? 120 : 96) * unit;

    // ground: palette colour with a soft glow
    ctx.fillStyle = P.bg;
    ctx.fillRect(0, 0, S.w, S.h);
    var glow = ctx.createRadialGradient(S.w * 0.5, S.h * 0.1, 0, S.w * 0.5, S.h * 0.1, Math.max(S.w, S.h) * 0.9);
    glow.addColorStop(0, hexA(P.bg2, 0.9));
    glow.addColorStop(1, hexA(P.bg, 0));
    ctx.fillStyle = glow;
    ctx.fillRect(0, 0, S.w, S.h);

    var box, chipY, markY = S.h - 56 * unit;

    if (style === 'arch') {
      girih(ctx, S.w, S.h, P.pattern, P.dark ? 0.07 : 0.09, 150 * unit);
      var aw = Math.min(S.w - 2 * pad, S.h * 0.78), ah = S.h - 2 * pad - 60 * unit;
      var ax = (S.w - aw) / 2, ay = pad;
      ctx.save();
      archPath(ctx, ax, ay, aw, ah, 36 * unit);
      ctx.fillStyle = P.dark ? hexA('#FFFFFF', 0.05) : hexA('#FFFFFF', 0.55);
      ctx.fill();
      ctx.lineWidth = 2 * unit; ctx.strokeStyle = hexA(P.accent, 0.55); ctx.stroke();
      archPath(ctx, ax + 22 * unit, ay + 22 * unit, aw - 44 * unit, ah - 44 * unit, 22 * unit);
      ctx.lineWidth = 1.2 * unit; ctx.strokeStyle = hexA(P.accent, 0.3); ctx.stroke();
      ctx.fillStyle = P.accent;
      starPath(ctx, S.w / 2, ay, 26 * unit); ctx.fill();
      ctx.fillStyle = P.bg; ctx.beginPath(); ctx.arc(S.w / 2, ay, 8 * unit, 0, Math.PI * 2); ctx.fill();
      ctx.restore();
      chipY = ay + aw * 0.42;
      box = { x: ax + 70 * unit, y: chipY + 50 * unit, w: aw - 140 * unit, h: ah - (chipY - ay) - 110 * unit };
      markY = Math.min(S.h - 40 * unit, ay + ah + 44 * unit);
    } else if (style === 'tile') {
      girih(ctx, S.w, S.h, P.pattern, P.dark ? 0.16 : 0.2, 120 * unit);
      var m = pad * 0.9;
      ctx.save();
      roundRect(ctx, m, m, S.w - 2 * m, S.h - 2 * m - 50 * unit, 40 * unit);
      ctx.fillStyle = P.bg; ctx.fill();
      ctx.lineWidth = 3 * unit; ctx.strokeStyle = hexA(P.accent, 0.7); ctx.stroke();
      roundRect(ctx, m + 16 * unit, m + 16 * unit, S.w - 2 * m - 32 * unit, S.h - 2 * m - 82 * unit, 28 * unit);
      ctx.lineWidth = 1.2 * unit; ctx.strokeStyle = hexA(P.accent, 0.35); ctx.stroke();
      ctx.fillStyle = P.accent;
      [[m + 16 * unit, m + 16 * unit], [S.w - m - 16 * unit, m + 16 * unit], [m + 16 * unit, S.h - m - 66 * unit], [S.w - m - 16 * unit, S.h - m - 66 * unit]].forEach(function (c) {
        starPath(ctx, c[0], c[1], 16 * unit); ctx.fill();
      });
      ctx.restore();
      chipY = m + 90 * unit;
      box = { x: m + 80 * unit, y: chipY + 60 * unit, w: S.w - 2 * m - 160 * unit, h: S.h - 2 * m - 280 * unit };
    } else if (style === 'minimal') {
      ctx.save();
      ctx.fillStyle = P.accent;
      starPath(ctx, S.w / 2, pad + 30 * unit, 34 * unit); ctx.fill();
      ctx.fillStyle = P.bg; ctx.beginPath(); ctx.arc(S.w / 2, pad + 30 * unit, 11 * unit, 0, Math.PI * 2); ctx.fill();
      ctx.fillStyle = hexA(P.accent, 0.5);
      ctx.fillRect(S.w / 2 - 120 * unit, S.h - pad - 70 * unit, 240 * unit, 2 * unit);
      ctx.restore();
      chipY = pad + 120 * unit;
      box = { x: pad + 20 * unit, y: chipY + 60 * unit, w: S.w - 2 * pad - 40 * unit, h: S.h - chipY - 60 * unit - pad - 110 * unit };
    } else if (style === 'horizon') {
      var sky = ctx.createLinearGradient(0, 0, 0, S.h);
      sky.addColorStop(0, P.dark ? P.bg2 : P.bg);
      sky.addColorStop(0.7, P.dark ? P.bg : P.bg2);
      sky.addColorStop(1, hexA(P.accent, P.dark ? 0.35 : 0.45));
      ctx.fillStyle = sky; ctx.fillRect(0, 0, S.w, S.h);
      ctx.save();
      for (var i = 0; i < 70; i++) {
        var sx = rand() * S.w, sy = rand() * S.h * 0.55, sr = (0.8 + rand() * 1.8) * unit;
        ctx.globalAlpha = 0.25 + rand() * 0.6;
        ctx.fillStyle = P.dark ? '#FFF6DC' : P.accent;
        ctx.beginPath(); ctx.arc(sx, sy, sr, 0, Math.PI * 2); ctx.fill();
      }
      ctx.globalAlpha = 1;
      // crescent
      var mx = S.w * (rtl ? 0.2 : 0.8), my = pad + 60 * unit, mr = 46 * unit;
      ctx.fillStyle = P.dark ? '#F7EDCB' : P.accent;
      ctx.beginPath(); ctx.arc(mx, my, mr, 0, Math.PI * 2); ctx.fill();
      ctx.globalCompositeOperation = 'destination-out';
      ctx.beginPath(); ctx.arc(mx + mr * 0.42, my - mr * 0.18, mr * 0.88, 0, Math.PI * 2); ctx.fill();
      ctx.globalCompositeOperation = 'source-over';
      ctx.restore();
      skyline(ctx, S, P.dark ? hexA('#050B14', 0.85) : hexA(P.fg, 0.14), unit);
      chipY = pad + 170 * unit;
      box = { x: pad + 20 * unit, y: chipY + 60 * unit, w: S.w - 2 * pad - 40 * unit, h: S.h - chipY - 60 * unit - 380 * unit * (S.h > S.w ? 1 : 0.7) };
      markY = S.h - 36 * unit;
    } else { // frame — an illuminated border
      var f = pad * 0.7, band = 46 * unit;
      ctx.save();
      ctx.strokeStyle = hexA(P.accent, 0.8); ctx.lineWidth = 3 * unit;
      ctx.strokeRect(f, f, S.w - 2 * f, S.h - 2 * f);
      ctx.lineWidth = 1.2 * unit;
      ctx.strokeRect(f + band, f + band, S.w - 2 * f - 2 * band, S.h - 2 * f - 2 * band);
      ctx.fillStyle = hexA(P.accent, 0.75);
      var step = band * 1.2;
      for (var x = f + band; x <= S.w - f - band + 1; x += step) {
        starPath(ctx, x, f + band / 2, band * 0.28); ctx.fill();
        starPath(ctx, x, S.h - f - band / 2, band * 0.28); ctx.fill();
      }
      for (var y = f + band + step; y <= S.h - f - band - step + 1; y += step) {
        starPath(ctx, f + band / 2, y, band * 0.28); ctx.fill();
        starPath(ctx, S.w - f - band / 2, y, band * 0.28); ctx.fill();
      }
      ctx.fillStyle = P.accent;
      [[f + band / 2, f + band / 2], [S.w - f - band / 2, f + band / 2], [f + band / 2, S.h - f - band / 2], [S.w - f - band / 2, S.h - f - band / 2]].forEach(function (c) {
        starPath(ctx, c[0], c[1], band * 0.46); ctx.fill();
      });
      ctx.restore();
      girih(ctx, S.w, S.h, P.pattern, P.dark ? 0.03 : 0.04, 140 * unit);
      chipY = f + band + 90 * unit;
      box = { x: f + band + 60 * unit, y: chipY + 60 * unit, w: S.w - 2 * (f + band + 60 * unit), h: S.h - 2 * (f + band) - 330 * unit };
      markY = S.h - f - band - 40 * unit;
    }

    topicChip(ctx, topic, S.w / 2, chipY, P, unit, rtl);
    drawText(ctx, h, opts, box, P, S);
    watermark(ctx, S, P, unit, rtl, markY);
    return canvas;
  }

  function toBlob(canvas) {
    return new Promise(function (resolve) { canvas.toBlob(resolve, 'image/png'); });
  }

  return {
    SIZES: SIZES,
    PALETTES: PALETTES,
    STYLES: STYLES,
    TOPIC_PALETTE: TOPIC_PALETTE,
    ready: ready,
    render: render,
    toBlob: toBlob
  };
})();
