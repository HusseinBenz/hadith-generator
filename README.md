# Hadith Generator

A tiny static site that shows a random, well-known authentic hadith with its
narrator and reference. No build step, no backend, no tracking — just
`index.html`, a stylesheet, a script, and a JSON collection.

Live: https://husseinbenz.github.io/hadith-generator/

## Content

`data/hadiths.json` holds a curated set of widely cited hadiths (mostly from
Sahih al-Bukhari and Sahih Muslim, plus a few from the well-known collections
such as al-Nawawi's Forty Hadith), each with its narrator and reference.
This is an educational reference, not a substitute for a primary collection
or a qualified scholar — always verify wording and rulings before relying on
a hadith for religious practice.

## Run locally

Because the page fetches `data/hadiths.json`, opening `index.html` directly
from disk will fail in most browsers (CORS blocks `file://` fetches). Serve
the folder instead:

```bash
python -m http.server 8000
```

Then open http://localhost:8000/.
