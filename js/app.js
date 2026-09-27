(function () {
  var hadiths = [];
  var lastId = null;

  var topicEl = document.getElementById("topic");
  var textEl = document.getElementById("hadithText");
  var narratorEl = document.getElementById("narrator");
  var referenceEl = document.getElementById("reference");
  var nextBtn = document.getElementById("nextBtn");
  var copyBtn = document.getElementById("copyBtn");

  function pickOne() {
    if (!hadiths.length) return null;
    if (hadiths.length === 1) return hadiths[0];
    var candidate;
    do {
      candidate = hadiths[Math.floor(Math.random() * hadiths.length)];
    } while (candidate.id === lastId);
    return candidate;
  }

  function render(h) {
    if (!h) return;
    lastId = h.id;
    topicEl.textContent = h.topic;
    textEl.textContent = h.text;
    narratorEl.textContent = "Narrated by " + h.narrator;
    referenceEl.textContent = h.reference;
  }

  function next() {
    render(pickOne());
  }

  function copyCurrent() {
    var payload = textEl.textContent + "\n— " + narratorEl.textContent + " (" + referenceEl.textContent + ")";
    if (navigator.clipboard && navigator.clipboard.writeText) {
      navigator.clipboard.writeText(payload).then(function () {
        flashCopied();
      }, function () {
        fallbackCopy(payload);
      });
    } else {
      fallbackCopy(payload);
    }
  }

  function fallbackCopy(text) {
    var ta = document.createElement("textarea");
    ta.value = text;
    ta.style.position = "fixed";
    ta.style.opacity = "0";
    document.body.appendChild(ta);
    ta.select();
    try { document.execCommand("copy"); } catch (e) {}
    document.body.removeChild(ta);
    flashCopied();
  }

  function flashCopied() {
    var original = copyBtn.textContent;
    copyBtn.textContent = "Copied";
    setTimeout(function () { copyBtn.textContent = original; }, 1400);
  }

  nextBtn.addEventListener("click", next);
  copyBtn.addEventListener("click", copyCurrent);

  fetch("data/hadiths.json")
    .then(function (r) { return r.json(); })
    .then(function (data) {
      hadiths = data;
      next();
    })
    .catch(function () {
      topicEl.textContent = "Error";
      textEl.textContent = "Could not load the hadith collection.";
    });
})();
