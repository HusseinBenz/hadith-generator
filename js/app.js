/* Hadith Generator — draw, filter by topic, copy, share, keep, and turn a
   hadith into an image for social media. Arabic and English.
   Kept hadiths and image settings live only in this browser. */
(function () {
  'use strict';
  var $ = function (id) { return document.getElementById(id); };
  var KEEP_KEY = 'hg-kept';
  var STUDIO_KEY = 'hg-studio';
  var MAIN_TOPICS = ['Character', 'Charity', 'Faith', 'Family', 'Knowledge', 'Brotherhood', 'Neighbors', 'Worship', 'Speech'];

  var hadiths = [];
  var current = null;
  var topic = 'Any';
  var showAllTopics = false;
  var flip = false;
  var kept = read(KEEP_KEY, []);
  var studio = read(STUDIO_KEY, { style: 'arch', size: 'square', lang: 'both', palette: null });

  function read(key, fallback) {
    try { var v = JSON.parse(localStorage.getItem(key)); return v == null ? fallback : v; } catch (e) { return fallback; }
  }
  function write(key, value) {
    try { localStorage.setItem(key, JSON.stringify(value)); } catch (e) { /* private mode */ }
  }
  function ar() { return Sakina.lang() === 'ar'; }
  function num(n) { return Sakina.num(n); }
  function T(en, arText) { return ar() ? arText : en; }

  function labelButtons() {
    Array.prototype.forEach.call(document.querySelectorAll('[data-label-en]'), function (b) {
      var label = ar() ? b.getAttribute('data-label-ar') : b.getAttribute('data-label-en');
      b.setAttribute('aria-label', label);
      b.setAttribute('title', label);
    });
    $('cardCanvas').setAttribute('aria-label', T('Hadith image preview', 'معاينة صورة الحديث'));
  }

  /* ---------- drawing a hadith ---------- */
  function pool() {
    if (topic === 'Kept') return hadiths.filter(function (h) { return kept.indexOf(h.id) >= 0; });
    return hadiths.filter(function (h) { return topic === 'Any' || h.topic === topic; });
  }
  function pickOne() {
    var list = pool();
    if (!list.length) list = hadiths;
    var options = list.length > 1 && current ? list.filter(function (h) { return h.id !== current.id; }) : list;
    return options[Math.floor(Math.random() * options.length)];
  }

  function render(h, animate) {
    if (!h) return;
    current = h;
    var card = $('card');
    var text = $('hadithText');
    var arabic = ar();
    var body = arabic ? (h.text_ar || h.text) : '“' + h.text + '”';
    $('count').textContent = T('No. ', 'رقم ') + num(h.id) + T(' of ', ' من ') + num(hadiths.length);
    $('topic').textContent = arabic ? (h.topic_ar || h.topic) : h.topic;
    text.textContent = body;
    text.setAttribute('lang', arabic ? 'ar' : 'en');
    text.classList.toggle('sk-ar', arabic);
    text.classList.toggle('is-long', body.length > (arabic ? 90 : 130));
    text.classList.toggle('is-short', body.length < (arabic ? 30 : 55));
    $('hadithAr').textContent = h.text_ar || '';
    $('hadithAr').hidden = arabic || !h.text_ar;
    $('narrator').textContent = arabic ? (h.narrator_ar || h.narrator) : h.narrator;
    $('reference').textContent = arabic ? (h.reference_ar || h.reference) : h.reference;
    card.setAttribute('aria-busy', 'false');
    if (animate) {
      flip = !flip;
      card.classList.remove('is-deal', 'is-deal-b');
      void card.offsetWidth;
      card.classList.add(flip ? 'is-deal' : 'is-deal-b');
    }
    var isKept = kept.indexOf(h.id) >= 0;
    $('keepBtn').setAttribute('aria-pressed', isKept ? 'true' : 'false');
    $('keepBtn').querySelector('svg').setAttribute('fill', isKept ? 'currentColor' : 'none');
    try {
      var url = new URL(location.href);
      url.searchParams.set('id', h.id);
      history.replaceState(null, '', url);
    } catch (e) { /* file:// */ }
    if ($('studio').open) drawCard();
  }

  function renderTopics() {
    var counts = {}, names = {};
    hadiths.forEach(function (h) { counts[h.topic] = (counts[h.topic] || 0) + 1; names[h.topic] = h.topic_ar || h.topic; });
    var rest = Object.keys(counts).filter(function (t) { return MAIN_TOPICS.indexOf(t) < 0; }).sort();
    var list = ['Any'].concat(MAIN_TOPICS.filter(function (t) { return counts[t]; }));
    if (showAllTopics) list = list.concat(rest);
    if (kept.length) list.push('Kept');
    var box = $('topics');
    box.innerHTML = '';
    list.forEach(function (t) {
      var b = document.createElement('button');
      b.type = 'button';
      b.className = 'sk-chip';
      b.setAttribute('aria-pressed', t === topic ? 'true' : 'false');
      b.textContent = t === 'Any' ? T('Any topic', 'كل المواضيع')
        : t === 'Kept' ? T('Kept (', 'المحفوظة (') + num(kept.length) + ')'
        : (ar() ? names[t] : t);
      b.addEventListener('click', function () { topic = t; renderTopics(); render(pickOne(), true); });
      box.appendChild(b);
    });
    if (rest.length) {
      var more = document.createElement('button');
      more.type = 'button';
      more.className = 'sk-chip sk-chip--dashed';
      more.textContent = showAllTopics ? T('Fewer topics', 'مواضيع أقل') : '+ ' + num(rest.length) + T(' more', ' أخرى');
      more.setAttribute('aria-expanded', showAllTopics ? 'true' : 'false');
      more.addEventListener('click', function () { showAllTopics = !showAllTopics; renderTopics(); });
      box.appendChild(more);
    }
    $('keptCount').textContent = num(kept.length) + T(' kept on this device', ' محفوظة على هذا الجهاز');
  }

  function payload() {
    if (ar()) return '«' + (current.text_ar || current.text) + '»\n— الراوي: ' + (current.narrator_ar || current.narrator) + ' (' + (current.reference_ar || current.reference) + ')';
    return '“' + current.text + '”\n— Narrated by ' + current.narrator + ' (' + current.reference + ')';
  }
  function next() { render(pickOne(), true); }
  function copy() {
    if (!current) return;
    Sakina.copy(payload()).then(function () { Sakina.toast(T('Copied with its reference', 'نُسخ الحديث مع مصدره')); });
  }
  function shareUrl() {
    var url = location.href.split('?')[0] + '?id=' + current.id;
    return ar() ? url + '&lang=ar' : url;
  }
  function share() {
    if (!current) return;
    if (navigator.share) {
      navigator.share({ title: T('Hadith', 'حديث'), text: payload(), url: shareUrl() }).catch(function () { /* dismissed */ });
    } else {
      Sakina.copy(payload() + '\n' + shareUrl()).then(function () { Sakina.toast(T('Link copied — ready to share', 'نُسخ الرابط — جاهز للمشاركة')); });
    }
  }
  function keep() {
    if (!current) return;
    var i = kept.indexOf(current.id);
    if (i >= 0) kept.splice(i, 1); else kept.push(current.id);
    write(KEEP_KEY, kept);
    if (topic === 'Kept' && !kept.length) topic = 'Any';
    renderTopics();
    render(current, false);
    Sakina.toast(i >= 0 ? T('Removed from kept', 'أُزيل من المحفوظات') : T('Kept on this device', 'حُفظ على هذا الجهاز'));
  }

  /* ---------- image studio ---------- */
  function palette() {
    return studio.palette || HadithCard.TOPIC_PALETTE[current.topic] || 'midnight';
  }
  function optionButtons(boxId, items, selected, onPick, extra) {
    var box = $(boxId);
    box.innerHTML = '';
    Object.keys(items).forEach(function (key) {
      var b = document.createElement('button');
      b.type = 'button';
      b.className = 'sk-chip';
      b.setAttribute('aria-pressed', key === selected ? 'true' : 'false');
      b.textContent = ar() ? items[key].ar : items[key].en;
      if (extra && extra(key)) { var s = document.createElement('small'); s.textContent = extra(key); b.appendChild(document.createTextNode(' ')); b.appendChild(s); }
      b.addEventListener('click', function () { onPick(key); });
      box.appendChild(b);
    });
  }
  function renderStudioControls() {
    optionButtons('styleOptions', HadithCard.STYLES, studio.style, function (k) { studio.style = k; saveStudio(); });
    optionButtons('sizeOptions', HadithCard.SIZES, studio.size, function (k) { studio.size = k; saveStudio(); }, function (k) { return HadithCard.SIZES[k].hint; });
    optionButtons('langOptions', { both: { en: 'Both', ar: 'كلاهما' }, ar: { en: 'Arabic', ar: 'العربية' }, en: { en: 'English', ar: 'الإنجليزية' } }, studio.lang, function (k) { studio.lang = k; saveStudio(); });
    var box = $('paletteOptions');
    box.innerHTML = '';
    var active = palette();
    Object.keys(HadithCard.PALETTES).forEach(function (key) {
      var p = HadithCard.PALETTES[key];
      var b = document.createElement('button');
      b.type = 'button';
      b.className = 'swatch';
      b.style.background = p.bg;
      b.style.setProperty('--dot', p.accent);
      b.setAttribute('aria-pressed', key === active ? 'true' : 'false');
      b.setAttribute('aria-label', ar() ? p.ar : p.en);
      b.title = ar() ? p.ar : p.en;
      b.addEventListener('click', function () { studio.palette = key; saveStudio(); });
      box.appendChild(b);
    });
  }
  function saveStudio() {
    write(STUDIO_KEY, studio);
    renderStudioControls();
    drawCard();
  }
  function drawCard() {
    if (!current) return;
    HadithCard.ready().then(function () {
      HadithCard.render($('cardCanvas'), current, { style: studio.style, size: studio.size, lang: studio.lang, palette: palette() });
    });
  }
  function openStudio() {
    if (!current) return;
    renderStudioControls();
    drawCard();
    var dlg = $('studio');
    if (dlg.showModal) dlg.showModal(); else dlg.setAttribute('open', '');
  }
  function surprise() {
    var pick = function (o) { var k = Object.keys(o); return k[Math.floor(Math.random() * k.length)]; };
    var style = studio.style, pal = palette();
    while (style === studio.style) style = pick(HadithCard.STYLES);
    while (pal === palette()) pal = pick(HadithCard.PALETTES);
    studio.style = style;
    studio.palette = pal;
    saveStudio();
  }
  function fileName() { return 'hadith-' + current.id + '-' + studio.style + '-' + palette() + '.png'; }
  function download() {
    HadithCard.toBlob($('cardCanvas')).then(function (blob) {
      var a = document.createElement('a');
      a.href = URL.createObjectURL(blob);
      a.download = fileName();
      document.body.appendChild(a);
      a.click();
      setTimeout(function () { URL.revokeObjectURL(a.href); a.remove(); }, 1000);
      Sakina.toast(T('Image saved', 'حُفظت الصورة'));
    });
  }
  function shareImage() {
    HadithCard.toBlob($('cardCanvas')).then(function (blob) {
      var file = new File([blob], fileName(), { type: 'image/png' });
      navigator.share({ files: [file], text: payload() }).catch(function () { /* dismissed */ });
    });
  }
  function copyImage() {
    HadithCard.toBlob($('cardCanvas')).then(function (blob) {
      return navigator.clipboard.write([new ClipboardItem({ 'image/png': blob })]);
    }).then(function () { Sakina.toast(T('Image copied', 'نُسخت الصورة')); })
      .catch(function () { Sakina.toast(T('Copying images is not supported here', 'نسخ الصور غير مدعوم هنا')); });
  }
  (function detectAbilities() {
    try {
      var probe = new File([new Blob(['x'], { type: 'image/png' })], 'x.png', { type: 'image/png' });
      $('shareImageBtn').hidden = !(navigator.canShare && navigator.canShare({ files: [probe] }));
    } catch (e) { $('shareImageBtn').hidden = true; }
    $('copyImageBtn').hidden = !(window.ClipboardItem && navigator.clipboard && navigator.clipboard.write);
  })();

  /* ---------- wiring ---------- */
  function onKey(e) {
    if (e.defaultPrevented || e.altKey || e.ctrlKey || e.metaKey || $('studio').open) return;
    var tag = (e.target && e.target.tagName) || '';
    if (/^(INPUT|TEXTAREA|SELECT|BUTTON|A)$/.test(tag)) return;
    if (e.key === ' ' || e.key === 'ArrowRight' || e.key === 'ArrowLeft') { e.preventDefault(); next(); }
    else if (e.key === 'c') copy();
    else if (e.key === 'i') openStudio();
  }

  $('nextBtn').addEventListener('click', next);
  $('imageBtn').addEventListener('click', openStudio);
  $('copyBtn').addEventListener('click', copy);
  $('shareBtn').addEventListener('click', share);
  $('keepBtn').addEventListener('click', keep);
  $('studioClose').addEventListener('click', function () { $('studio').close(); });
  $('studio').addEventListener('click', function (e) { if (e.target === $('studio')) $('studio').close(); });
  $('surpriseBtn').addEventListener('click', surprise);
  $('downloadBtn').addEventListener('click', download);
  $('shareImageBtn').addEventListener('click', shareImage);
  $('copyImageBtn').addEventListener('click', copyImage);
  document.addEventListener('keydown', onKey);
  document.addEventListener('sakina:lang', function () {
    labelButtons();
    renderTopics();
    if (current) render(current, false);
    if ($('studio').open) renderStudioControls();
  });
  labelButtons();

  fetch('data/hadiths.json?v=sk2')
    .then(function (res) { if (!res.ok) throw new Error('Could not load hadiths'); return res.json(); })
    .then(function (data) {
      hadiths = data;
      kept = kept.filter(function (id) { return hadiths.some(function (h) { return h.id === id; }); });
      renderTopics();
      var wanted = parseInt(new URLSearchParams(location.search).get('id'), 10);
      var first = hadiths.filter(function (h) { return h.id === wanted; })[0];
      render(first || pickOne(), false);
    })
    .catch(function () {
      $('count').textContent = '';
      $('hadithText').textContent = T('The hadith list could not be loaded. Please refresh the page.', 'تعذّر تحميل قائمة الأحاديث. حدّث الصفحة من فضلك.');
      $('card').setAttribute('aria-busy', 'false');
    });
})();
