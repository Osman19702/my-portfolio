# osmanturalioglu.com

[![CI](https://github.com/Osman19702/my-portfolio/actions/workflows/ci.yml/badge.svg)](https://github.com/Osman19702/my-portfolio/actions/workflows/ci.yml)

Personal portfolio for **Osman Turalioglu**, Senior QA Engineer (ISTQB CT-AI, CTAL-TAE).

**Live:** <https://www.osmanturalioglu.com>

![The site in dark mode](docs/screenshot.png)

---

## What this is

A single-page portfolio built as a tab interface: one HTML file, one stylesheet, three
small scripts, **no framework and no build step**. The files in the repo root are the
files the browser gets.

It is also a work sample. The owner is a QA engineer, so the repo carries a real test
suite — **82 Playwright tests across 8 spec files**, including accessibility scans of
every panel in both themes, and they run in CI on every push and pull request.

## Stack

| | |
|---|---|
| Markup | Hand-written HTML, single page |
| Styles | Plain CSS with custom properties — **no preprocessor** |
| Scripts | Three vanilla files, no bundler |
| Icons | Inline SVG sprite generated from Font Awesome |
| Hosting | GitHub Pages on a custom domain (`CNAME`) |
| Runtime dependencies | **None** |
| Dev dependencies | Playwright, axe-core, Lighthouse, Font Awesome source |

### Why no build step

GitHub Pages serves whatever is committed. With no compile stage there is nothing that
can be out of sync between source and deployed output, and no build to break before a
deploy. The one generated artifact — the icon sprite — is committed, and its generator
is checked in beside it.

## Running it

```bash
npm install     # dev dependencies only; the site itself needs nothing
npm start       # serves the site at http://127.0.0.1:4173
```

Any static server will do. `npm start` uses a small zero-dependency one in `tests/` so
local and CI behave identically.

## Tests

```bash
npm test          # the whole suite
npm run test:ui   # Playwright's interactive runner
npm run test:a11y # accessibility specs only
npm run test:report  # open the last HTML report
```

Chromium only, to keep installs and CI fast. Add browsers in `playwright.config.js` if
you want cross-browser evidence.

| Spec | Covers |
|---|---|
| `navigation.spec.js` | The tab contract, ARIA tabs pattern, roving tabindex, arrow keys |
| `accessibility.spec.js` | axe scans of **every panel in both themes**, heading order, skip link, landmarks |
| `contact-form.spec.js` | Validation, spam guards, success / rejection / network failure, busy state |
| `links.spec.js` | CV integrity, external link safety, contact-detail privacy, CSP |
| `theme.spec.js` | Toggle, persistence, OS preference, pre-paint application |
| `responsive.spec.js` | 360 / 768 / 1440 — horizontal scroll and content clipping |
| `seo.spec.js` | Metadata, Open Graph, JSON-LD, robots, sitemap, favicons |
| `console.spec.js` | No console errors, no failed requests |

### Expected failures

One test carries a `test.fail()` annotation. It documents a real, unfixed bug rather
than a passing behaviour, and each names the defect in its message. If the bug is ever
fixed, Playwright reports *"expected to fail but passed"* and forces the annotation to
be removed — so these cannot rot silently.

## Performance

```bash
npm run perf    # Lighthouse, median of 5 runs, writes lighthouse-run.json
```

Replacing the Font Awesome webfont with an inline SVG sprite removed 134 KiB and four
requests:

| | before | after |
|---|---|---|
| Lighthouse performance | 93 | 95 |
| LCP | 3074 ms | 2609 ms |
| Total transfer | 194.4 KiB | 131.6 KiB |
| Requests | 12 | 8 |

Numbers are from a local static server, so absolute values are optimistic against
GitHub Pages; the deltas are what matter.

## Project structure

```
index.html                  the entire page, including the inline icon sprite
app.js                      tab navigation, theme toggle, contact-detail assembly
form-submission.js          contact form validation and submission
notification.js             toast notifications (an ARIA live region)
styles/styles.css           the ONLY stylesheet — see the note below
scripts/build-icon-sprite.js  regenerates the sprite from Font Awesome
tests/e2e/                  Playwright specs
tests/static-server.js      zero-dependency static server for local and CI runs
tests/lighthouse.js         repeatable performance measurement
docs/MASTER_PROMPT.md       working notes, constraints and the defect backlog
.github/workflows/ci.yml    runs the suite on push and PR
```

### A note on Sass

**There is no Sass in this project, deliberately.** A `styles/styles.scss` used to sit
next to the stylesheet. It was a stale 110-line fragment against 1382 live lines,
naming selectors that no longer existed and declaring an accent colour the site had not
used in years. Compiling it would have replaced the entire stylesheet. It was deleted;
`styles/styles.css` is the single source of truth. Please do not reintroduce a
preprocessor without also removing this note.

### Editing icons

Icons come from an inline sprite, not a webfont or a CDN. After adding or removing an
`<svg class="svg-icon">` in `index.html`:

```bash
npm run build:icons
```

Font Awesome Free icons are used under **CC BY 4.0**; the attribution is in the sprite.

### Content-Security-Policy

`index.html` declares a strict CSP with no `unsafe-inline`. Anything that adds an inline
script, an inline style attribute, an inline event handler, or a new external origin
will be **blocked** until the policy is updated. The single inline script — the pre-paint
theme setter — is allowed by its `sha256` hash; **if you edit it, regenerate that hash**.

## Known limitations

Honest list, not a marketing section.

- **The contact form is not delivering yet.** `index.html` carries a placeholder
  Web3Forms access key. Until a real key replaces it, the form validates and reports
  that it is not configured. Get one at <https://web3forms.com>.
- **Content is clipped at 360px.** `div.header-content` is a 280px box holding 287px of
  content behind `overflow-x: hidden`, so the hero heading is cut off on small phones.
  The page does not scroll sideways; the content is hidden rather than spilled.
- **The CSP is delivered by `<meta>`**, because GitHub Pages cannot set response
  headers. `frame-ancestors` is ignored in a meta policy, so this does not prevent the
  page being framed.
- **Contact-detail obfuscation is partial by design.** Splitting the address and number
  across data attributes defeats scrapers that read raw HTML. It does not defeat one
  that runs JavaScript.
- **No screen-reader testing.** axe is clean across every panel in both themes, but
  automated tools catch roughly a third of real barriers. NVDA and VoiceOver passes have
  not been done.
- **Chromium only** in CI. No Firefox or WebKit evidence.
- **The site requires JavaScript.** Navigation is a tab interface, so without JS only
  the home panel renders.

## Licence

Code is ISC — see [LICENSE](LICENSE).

This does **not** cover the personal content: the CV in `cv/`, the biographical text,
the employment history or the certification details. Those are Osman Turalioglu's and
are not licensed for reuse. Font Awesome icons in the sprite are CC BY 4.0.
