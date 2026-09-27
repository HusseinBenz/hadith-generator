/* Hadith Generator — draw, filter by topic, copy, share and keep.
   Kept hadiths live only in this browser (localStorage). */
(function () {
  'use strict';
  var $ = function (id) { return document.getElementById(id); };
  var KEEP_KEY = 'hg-kept';
  var MAIN_TOPICS = ['Character', 'Charity', 'Faith', 'Family', 'Knowledge', 'Brotherhood', 'Neighbors', 'Worship', 'Speech'];

  var hadiths = [];
  var current = null;
  var topic = 'Any';
  var showAllTopics = false;
  var flip = false;
  var kept = readKept();

  function readKept() {
    try { var v = JSON.parse(localStorage.getItem(KEEP_KEY) || '[]'); return Array.isArray(v) ? v : []; }
    catch (e) { return []; }
  }
  function saveKept() {
    try { localStorage.setItem(KEEP_KEY, JSON.stringify(kept)); } catch (e) { /* private mode */ }
  }

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
    $('count').textContent = 'No. ' + h.id + ' of ' + hadiths.length;
    $('topic').textContent = h.topic;
    text.textContent = '“' + h.text + '”';
    text.classList.toggle('is-long', h.text.length > 130);
    text.classList.toggle('is-short', h.text.length < 55);
    $('narrator').textContent = h.narrator;
    $('reference').textContent = h.reference;
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
    try { history.replaceState(null, '', '?id=' + h.id); } catch (e) { /* file:// */ }
  }

  function renderTopics() {
    var counts = {};
    hadiths.forEach(function (h) { counts[h.topic] = (counts[h.topic] || 0) + 1; });
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
      b.textContent = t === 'Any' ? 'Any topic' : t === 'Kept' ? 'Kept (' + kept.length + ')' : t;
      b.addEventListener('click', function () {
        topic = t;
        renderTopics();
        render(pickOne(), true);
      });
      box.appendChild(b);
    });
    if (rest.length) {
      var more = document.createElement('button');
      more.type = 'button';
      more.className = 'sk-chip sk-chip--dashed';
      more.textContent = showAllTopics ? 'Fewer topics' : '+ ' + rest.length + ' more';
      more.setAttribute('aria-expanded', showAllTopics ? 'true' : 'false');
      more.addEventListener('click', function () { showAllTopics = !showAllTopics; renderTopics(); });
      box.appendChild(more);
    }
    $('keptCount').textContent = kept.length + ' kept on this device';
  }

  function payload() {
    return '“' + current.text + '”\n— Narrated by ' + current.narrator + ' (' + current.reference + ')';
  }

  function next() { render(pickOne(), true); }

  function copy() {
    if (!current) return;
    Sakina.copy(payload()).then(function () { Sakina.toast('Copied with its reference'); });
  }

  function share() {
    if (!current) return;
    var url = location.href.split('?')[0] + '?id=' + current.id;
    if (navigator.share) {
      navigator.share({ title: 'Hadith', text: payload(), url: url }).catch(function () { /* dismissed */ });
    } else {
      Sakina.copy(payload() + '\n' + url).then(function () { Sakina.toast('Link copied — ready to share'); });
    }
  }

  function keep() {
    if (!current) return;
    var i = kept.indexOf(current.id);
    if (i >= 0) kept.splice(i, 1); else kept.push(current.id);
    saveKept();
    if (topic === 'Kept' && !kept.length) topic = 'Any';
    renderTopics();
    render(current, false);
    Sakina.toast(i >= 0 ? 'Removed from kept' : 'Kept on this device');
  }

  function onKey(e) {
    if (e.defaultPrevented || e.altKey || e.ctrlKey || e.metaKey) return;
    var tag = (e.target && e.target.tagName) || '';
    if (/^(INPUT|TEXTAREA|SELECT|BUTTON|A)$/.test(tag)) return;
    if (e.key === ' ' || e.key === 'ArrowRight') { e.preventDefault(); next(); }
    else if (e.key === 'c') copy();
  }

  $('nextBtn').addEventListener('click', next);
  $('copyBtn').addEventListener('click', copy);
  $('shareBtn').addEventListener('click', share);
  $('keepBtn').addEventListener('click', keep);
  document.addEventListener('keydown', onKey);

  fetch('data/hadiths.json')
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
      $('hadithText').textContent = 'The hadith list could not be loaded. Please refresh the page.';
      $('card').setAttribute('aria-busy', 'false');
    });
})();
