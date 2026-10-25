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
suite — **122 Playwright tests across 10 spec files**, including accessibility scans of
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

The contact-form specs mock `api.web3forms.com` rather than posting to it, so the suite
sends no mail and stays deterministic. That is also a practical necessity: the endpoint
is behind Cloudflare, which rejects the CORS preflight from a headless user agent. A
live send was verified once, by hand, with a real browser UA.

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
| `projects.spec.js` | The Projects panel, one card per project (Whetprompt, Elastishot): a versioned release or package URL and new-tab safety for every download button (Whetprompt has three: Windows, macOS on Apple Silicon, macOS on Intel), each download's version / file / hash copies pinned to each other (Windows and macOS can be on different releases), the checksum file of every release on the card, the note that says what the visitor gets, the Microsoft Store badge (link, new-tab safety, one image per theme, served by this site), 360px fit |
| `icons.spec.js` | Every icon resolves to a sprite symbol and carries that symbol's `viewBox`; no unused symbols |

Shared constants and helpers (the section list, opening a panel, the axe scan) live in
`tests/e2e/helpers.js`.

### Visual check before a release

```bash
npm run visual                        # working tree vs master, i.e. what is deployed
npm run visual -- --against v2026.09  # vs any tag, branch or commit
npm run visual:report                 # open the last report
```

`tests/visual/run.js` drives [Elastishot](https://github.com/Osman19702/elastishot),
a screenshot comparison that aligns the two captures first and names the element
behind every change. It checks out the reference into a temporary worktree, serves it
and the working tree on two ports, and captures every section in both themes at 1440
and 360 px (20 pairs, `elastishot.config.mjs`). Both sides are captured on the same
machine in the same run, so fonts and Chromium cancel out and nothing has to be
committed as a baseline. Exit code 1 means differences; the report in
`.elastishot/runs/latest/index.html` shows them with a slider and the locators.
The same script runs on every pull request in CI against the target branch and
uploads its report as the `elastishot-report` artifact. Elastishot comes from npm
(`elastishot@^0.2.0`, a devDependency).

### Expected failures

One, currently. Where a test documents a real, unfixed bug rather than a passing
behaviour, it carries a `test.fail()` annotation naming the defect. If the bug is later
fixed, Playwright reports *"expected to fail but passed"* and forces the annotation to
be removed — so they cannot rot silently.

- `responsive.spec.js` › *the certifications panel stays inside the viewport once
  opened*. On phones the title word CERTIFICATIONS (3rem, Poppins 700) is 395px wide and
  cannot break, so the page is 435px wide and scrolls sideways at 320–414px (defect #28
  in `docs/MASTER_PROMPT.md`). The check used to pass only because it measured the panel
  while it was still scaling in from zero height, when there was nothing to overflow.

Six others were used earlier and have been retired by fixing the underlying bugs.

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
fonts/                      Poppins, five weights, latin subset, woff2, self-hosted with its OFL licence
img/whetprompt.png          the Whetprompt screenshot on the Projects tab (a real local-model run with one
                            passage of the rewrite kept and one marked for change, made with Whetprompt's
                            scripts/capture-screenshot.mjs; the command is in its header)
img/ms-store-badge-*.svg    Microsoft's "Download from the Microsoft Store" badge, dark and light, on the Whetprompt card; kept
                            here rather than loaded from Microsoft, so the CSP still allows no other origin
img/elastishot.png          the Elastishot screenshot on the Projects tab (a real report from its UI lab,
                            made with Elastishot's scripts/capture-portfolio-shot.mjs; the command is in its header)
scripts/build-icon-sprite.js  regenerates the sprite from Font Awesome
tests/e2e/                  Playwright specs, plus helpers.js shared between them
tests/static-server.js      zero-dependency static server for local and CI runs
tests/serve.js              starts that server for the scripts below and waits until it is listening
tests/lighthouse.js         repeatable performance measurement
tests/visual/run.js         visual check against a git ref, driving Elastishot (elastishot.config.mjs)
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

Icons come from an inline sprite in `index.html`, not a webfont or a CDN, and the page
itself is the sprite's manifest. To add an icon, write it where it should appear:

```html
<svg class="svg-icon" aria-hidden="true" focusable="false"><use href="#i-NAME"></use></svg>
```

then run `npm run build:icons`. `scripts/build-icon-sprite.js` looks `NAME` up in Font
Awesome's solid set, then its brands set (`node_modules/@fortawesome/fontawesome-free/svgs/`),
rewrites the sprite between its markers with one `<symbol>` per icon the page uses, and
copies each symbol's `viewBox` onto every icon that uses it. An icon nothing references any
more drops out on the next run, and running it twice changes nothing. Do not edit the
sprite by hand. `icons.spec.js` fails if an icon has no symbol, or a `viewBox` that
disagrees with its symbol's, which shrinks the glyph: a 640-wide icon in a 512-wide box is
drawn a fifth too small.

Font Awesome Free icons are used under **CC BY 4.0**; the attribution is in the sprite.

### Content-Security-Policy

`index.html` declares a strict CSP with no `unsafe-inline`. Anything that adds an inline
script, an inline style attribute, an inline event handler, or a new external origin
will be **blocked** until the policy is updated. The single inline script — the pre-paint
theme setter — is allowed by its `sha256` hash; **if you edit it, regenerate that hash**.

The policy deliberately omits `upgrade-insecure-requests`. It was there briefly and
took the site down: while GitHub was still provisioning the certificate for the custom
domain, Pages served over http, and the directive rewrote every same-origin subresource
to https — into a certificate that did not yet match. The stylesheet and all three
scripts failed and visitors got unstyled markup. It is redundant now that Pages
redirects http to https, and it would turn any future certificate lapse from a warning
into a blank site, so it stays out. A test asserts its absence. Note that the local
suite cannot catch this class of bug at all: the directive exempts localhost.

## Known limitations

Honest list, not a marketing section.

- **The contact form's spam guards are client-side only.** The honeypot and the
  minimum-fill-time check stop bots that drive the form in a browser. Nothing stops a
  script POSTing straight to the Web3Forms endpoint, because the access key is public
  by necessity — it ships in the markup. Web3Forms' own filtering is the only backstop
  there, and the free tier caps submissions per month.
- **Layout is tight at 360px.** The container reserves 80px of horizontal padding at a
  360px viewport, leaving the hero heading a ~220px column. It wraps correctly and
  nothing is cut off, but there is little room to spare on the smallest phones.
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
