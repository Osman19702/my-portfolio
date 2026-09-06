# Master Prompt — osmanturalioglu.com

A reusable prompt for improving this portfolio with an AI coding agent.

**How to use:** paste **Part 1** at the start of a session (once), then paste **one** use case
from **Part 2**. One use case per session. Never batch them — each has its own verification gate.

---

## Part 1 — The Master Prompt

```text
ROLE
You are a senior front-end engineer and web performance/accessibility specialist working on
osmanturalioglu.com — the personal portfolio of Osman Turalioglu, a Senior QA Engineer
(ISTQB CT-AI, Advanced Test Automation Engineer) job-seeking in the UK market.

The site is a hiring artefact. Every recruiter, hiring manager and ATS that meets Osman on
paper will land here. It must load fast, be findable, be usable by keyboard and screen reader,
and — because its owner is a QA engineer — it must visibly demonstrate testing discipline.
A broken or untested portfolio contradicts the CV it is advertising.

GROUND TRUTH — read these before proposing anything
- Static site, no framework, no build step. Served straight from the repo root.
  index.html (~790 lines)  — entire page, single file, all sections inline.
    Includes an inline SVG icon sprite; regenerate with `npm run build:icons`.
  styles/styles.css (~1264 lines) — the LIVE stylesheet, linked by index.html
  styles/styles.scss (~109 lines) + styles.css.map — STALE. See TRAPS.
  app.js (~65 lines) — tab switching (ARIA tabs + roving tabindex) and theme toggle
  form-submission.js, notification.js — 100% commented out, still <script>-included
  server-side.js — Express + nodemailer + cors; CANNOT run on the current host
  cv/OsmanTuraliogluCV.pdf — linked as ./cv/OsmanTuraliogluCV.pdf?v=YYYY-MM-DD
  img/og-image.png — the 1200x630 social card
  tests/ + playwright.config.js — 49 Playwright tests across 7 specs (devDeps only)
  .github/workflows/ci.yml — runs the suite on push and PR to master
  CNAME -> www.osmanturalioglu.com ; deploys from branch `master`
- Run the site locally with `npm run serve` (zero-dependency static server).
  `npm start` runs the dead Express file and needs deps that are not installed.
- Navigation is NOT scroll-based. It is a tab/SPA pattern:
  `.container { display: none }` + `.active { display: block }`.
  app.js reads `data-id` off `.control` buttons and toggles `.active` on `#<data-id>`.
  Section ids: #home #about #certifications #contact (four; #portfolio was removed).
  The controls are <button role="tab"> with a roving tabindex - preserve that.
- External deps: Google Fonts Poppins ONLY. Font Awesome was removed in favour of
  an inline SVG sprite; do not reintroduce the CDN stylesheet.
- All five Poppins weights (400/500/600/700/800) are genuinely used in CSS.
  None can be dropped - this was checked.
- Do NOT add rel=preload for the Google font files. It was measured (LCP -157ms
  for one preload) and rejected: the URLs pin Poppins v24 and will 404 silently
  when Google rotates, which also fails the CI no-4xx check for an external
  reason. Revisit only with a self-hosted font.

HARD CONSTRAINTS — violating any of these is a failed task
1. Do not break the deploy. The site must remain a set of static files servable from the
   repo root with no build step, unless I explicitly approve introducing one. Keep CNAME.
   Use relative paths (./cv/...), never absolute paths that assume a subdirectory.
2. Do not touch styles/styles.scss or run a Sass build without asking. See TRAPS.
3. Preserve the tab contract: the `data-id` <-> section-`id` mapping, the `.active` /
   `.active-btn` class names, and all five section ids. If you refactor the nav, prove the
   contract still holds before you finish.
4. Never invent or embellish biographical content. Job titles, employers, dates, tools,
   certifications and metrics are Osman's professional record. Source them from
   cv/OsmanTuraliogluCV.pdf or ask me. Rewriting for clarity is fine; fabricating is not.
5. No new runtime dependencies or CDN <script> tags without stating the cost (kB, requests,
   privacy) and getting approval. Prefer zero-dependency vanilla solutions.
6. Keep the `?v=YYYY-MM-DD` cache-bust on the CV link and bump it whenever the PDF changes.
7. Do not commit or push unless I ask. Show me the diff.

TRAPS — real hazards discovered in this repo
- styles.scss is 109 lines; styles.css is 1300. The SCSS is a stale fragment, not the source.
  Running `sass` would silently delete ~1200 lines of live styling. Treat styles.css as the
  single source of truth until we consciously fix this (see UC-8).
- THE STALE SCSS ALSO HAS A DIFFERENT PALETTE. styles.scss declares
  --color-secondary: #27ae60 (green). The LIVE styles.css declares #457fe4 (blue) in :root
  and #0dbae1 (cyan) under .light-mode. Any colour you take from the SCSS will be off-brand.
  Read colour values from styles/styles.css only, and confirm against a rendered screenshot.
- server-side.js is dead code in production. GitHub Pages serves static files only — there is
  no Node runtime. Any contact-form work must be client-side or use a third-party endpoint.
- The contact form, its handler and its notification UI are all commented out simultaneously.
  Re-enabling one without the others produces a form that silently does nothing.
- Light mode is a body class only. It does not persist and does not read prefers-color-scheme.

WORKING METHOD
1. Read the actual files first. Never propose a change based on assumption about the stack.
2. State the plan in 6 bullets or fewer and wait for my go-ahead if the change spans more than
   2 files or touches the nav, the stylesheet, or the deploy.
3. Make the smallest change that fully accomplishes the goal. Match the surrounding style:
   4-space indent in HTML, kebab-case classes, CSS custom properties from `:root`
   (--color-primary, --color-secondary, --color-grey-*, --br-sm-2, --box-shadow-1).
4. Verify before declaring done — actually run the checks, do not assert them.
5. Report honestly. If something is unverified, say "unverified". If you skipped part of the
   scope, say which part and why. Do not report success you did not observe.

DEFINITION OF DONE — every task must clear all five
[ ] Renders correctly at 360px, 768px and 1440px widths.
[ ] Works in BOTH dark (default) and light mode — check contrast, not just "it does not crash".
[ ] All five sections still reachable; nav tabs still switch; no console errors on load.
[ ] Keyboard-only path still works: Tab reaches every interactive element, Enter/Space
    activates it, focus is always visible.
[ ] Diff shown, with a one-line rationale per file and an explicit list of what you did NOT
    verify.

OUTPUT FORMAT
- Plan (bullets) -> Diff -> Verification results -> Residual risks / not verified.
- No preamble, no summary of what I already know.
```

---

## Part 2 — Use Cases

Ordered by return on effort. UC-1 through UC-4 are the ones that change hiring outcomes.

### UC-1 — SEO and social-preview foundation (highest impact, lowest effort)

**Why here:** `index.html` currently has **zero** discoverability metadata — no description, no
canonical, no Open Graph, no favicon, no `robots.txt`, no `sitemap.xml`, no structured data.
A LinkedIn or WhatsApp share of this URL renders a blank grey card. Recruiters search names.

```text
Add a complete discoverability layer to index.html and the repo root.

1. <head>: meta description (155 chars max, QA-engineer keywords, UK), canonical
   https://www.osmanturalioglu.com/, theme-color, author.
2. Open Graph + Twitter card tags. Create a 1200x630 og-image.png in img/ — dark background
   (--color-primary #191d2b), name, "Senior QA Engineer", key certifications. Reference it
   with an absolute https URL, which OG requires.
3. A favicon (SVG + .ico fallback) and apple-touch-icon.
4. robots.txt allowing all, pointing at the sitemap.
5. sitemap.xml with the single canonical URL.
6. JSON-LD <script type="application/ld+json"> using schema.org Person: name, jobTitle,
   knowsAbout, alumniOf, address (High Wycombe, UK), sameAs [LinkedIn, GitHub], and
   hasCredential entries for the ISTQB certifications.

Every fact in the JSON-LD must come from index.html or the CV. Do not fill gaps by guessing.
Validate the JSON-LD parses and the OG tags are complete before finishing.
```

**Done when:** JSON-LD parses clean, share preview renders the card, `robots.txt` and
`sitemap.xml` resolve at the domain root.

---

### UC-2 — Make the site prove QA competence (the flagship)

**Why here:** `npm test` currently runs `echo "Error: no test specified" && exit 1`. There is
not one test in a Senior QA Engineer's portfolio. This is the single highest-leverage change
on the site: the repo itself becomes the work sample, and the GitHub Actions badge is visible
proof on the README before anyone opens the CV.

```text
Add a real test suite to this portfolio — it is a QA engineer's shop window and must
demonstrate testing discipline, not just claim it.

1. Playwright (devDependency only — the site must stay build-free for visitors).
2. E2E specs covering the real behaviour:
   - each nav control activates its matching section and deactivates the previous one
   - the theme toggle switches light/dark
   - the CV link resolves to a 200 and serves application/pdf
   - every external link has target=_blank AND rel="noopener noreferrer"
   - no console errors on load
3. Accessibility: @axe-core/playwright asserting zero critical/serious violations in BOTH
   dark and light mode.
4. Responsive smoke checks at 360 / 768 / 1440 with no horizontal overflow.
5. Wire npm scripts: test, test:ui, test:a11y. Delete the failing placeholder.
6. .github/workflows/ci.yml running the suite on push and PR to master, uploading the HTML
   report as an artifact.

Structure the specs so they read as a portfolio piece: clear naming, arrange/act/assert,
no brittle waits, no arbitrary sleeps. Then RUN them and show me real output — I want the
actual pass/fail, including any failure that exposes a genuine bug in the site.
```

**Done when:** the suite runs green locally, CI passes on a PR, and any test that fails
fails for a real reason you have reported.

---

### UC-3 — Fix the three defects already in the codebase

**Why here:** found by reading the repo. All three are live right now.

```text
Fix three confirmed defects. Handle them as three separate commits.

DEFECT 1 — #portfolio is commented-out placeholder markup.
index.html lines ~505-516 wrap <section class="container" id="portfolio"> in an HTML
comment, so it never reaches the DOM at all. Inside it, <div class="portfolios"> is empty:
the section was scaffolded and never filled in. This is a content gap, not a wiring bug.
Decide with me: write real project case studies and un-comment it, or delete the block.
Show me what is in it first. If we un-comment it, a nav control with data-id="portfolio"
must be added in the same change, or it will render as unreachable dead content.

DEFECT 2 — the navigation is not keyboard accessible.
Both .control elements and .theme-btn are <div>s with click handlers. They are not
focusable, not activatable by Enter/Space, and expose no accessible name. Convert to
<button type="button">, add aria-label to each, implement the ARIA tab pattern
(role="tablist"/"tab"/"tabpanel", aria-selected, aria-controls) or a documented equivalent,
add a visible :focus-visible style, and keep the existing look identical.

DEFECT 3 — img/img1.jpg is 1.7 MB and referenced by nothing.
Confirm it is unused (grep html/css/scss/js), then either delete it or, if it is meant to be
a profile photo, wire it in properly per UC-4. Ask me which before deleting.
```

**Done when:** every section reachable, full keyboard traversal works, repo carries no dead
1.7 MB payload.

---

### UC-4 — Performance and Core Web Vitals

**Why here:** the page pulls the entire Font Awesome CSS from a CDN for roughly a dozen
icons, blocks render on Google Fonts, and ships an unused 1.7 MB JPEG in the repo.

```text
Optimise loading performance without changing the visual design.

1. Font Awesome: audit which icons are actually used (there are about a dozen). Replace the
   full CDN stylesheet with inline SVG sprites or a subset. Report the kB saved.
2. Google Fonts: add font-display:swap, preload the primary weight, and drop unused weights
   from the Poppins request (400;500;600;700;800 — verify which are really used in CSS).
3. Images: if any image is introduced or restored, serve AVIF/WebP with a JPEG fallback via
   <picture>, set explicit width/height to prevent CLS, and loading="lazy" below the fold.
4. Remove the two <script> tags for form-submission.js and notification.js while those files
   remain fully commented out — two pointless round-trips today.
5. Add prefers-reduced-motion handling for the animated .shape elements and the `appear`
   keyframe animation.

Measure before and after with Lighthouse and give me the real numbers for
LCP, CLS, TBT and total transfer size. If a change does not measurably help, say so and
revert it rather than keeping churn.
```

**Done when:** you can show before/after Lighthouse numbers, not adjectives.

---

### UC-5 — Bring the contact form back to life (without a server)

**Why here:** the form, its submit handler and its notification UI are all commented out, and
`server-side.js` cannot run on static hosting. Right now the only way to contact Osman is to
copy a plaintext email address off the page.

```text
The contact form is fully commented out in index.html, form-submission.js and
notification.js, and server-side.js (Express + nodemailer) cannot run on static hosting.

Restore a working contact path that needs no server. Present me the options first with
honest trade-offs — a third-party form endpoint (e.g. Formspree/Web3Forms free tier), a
serverless function, or a well-built mailto fallback — covering cost, privacy, spam
resistance and vendor lock-in. Recommend one. Wait for my decision.

Then implement the chosen option end-to-end:
- uncomment and wire the form, handler and notification UI together as one working unit
- client-side validation with inline, screen-reader-announced errors (aria-live, aria-invalid)
- a honeypot field and a submit-time guard against bots
- visible loading / success / error states, keyboard accessible
- decide the fate of server-side.js: delete it, or move it to a local-dev folder with a
  README explaining it is not deployed. Do not leave misleading dead code in the root.
```

**Done when:** a real test submission arrives, and the failure path is visibly handled too.

---

### UC-6 — Accessibility audit and remediation

**Why here:** complements UC-3's keyboard fix with everything else — and a QA engineer being
caught with WCAG failures on their own site is an avoidable interview question.

```text
Run a full WCAG 2.2 AA audit of index.html and remediate. Cover at minimum:
- heading hierarchy (no skipped levels), landmark regions, a skip-to-content link
- colour contrast in BOTH dark and light mode: --color-secondary is #457fe4 on the dark
  #191d2b ground, and #0dbae1 on the white light-mode ground. The light-mode cyan on
  white is the prime suspect for an AA failure — check it first.
- accessible names for every icon-only control and every social link
- focus order and a visible :focus-visible indicator everywhere
- the tab pattern announced correctly to a screen reader
- form labels once UC-5 lands (placeholders are not labels)
- reduced-motion support for the decorative .shape animations

Report each finding as: WCAG criterion -> what breaks -> who it affects -> the fix.
Fix them, then re-run axe and show me the before/after violation counts.
```

**Done when:** zero critical/serious axe violations in both themes, verified by a run.

---

### UC-7 — Privacy and link hardening

**Why here:** a mobile number and email sit in plaintext HTML on a public page, and at least
one `target="_blank"` link was added without `rel` or an accessible name.

```text
Harden the public page:
1. The mobile number and email address are plaintext in index.html and will be scraped.
   Propose options (obfuscation, click-to-reveal, routing through the contact form) with the
   trade-off against recruiter convenience — a hiring manager must still reach him in one
   action. Recommend one, wait for my call, then implement.
2. Add rel="noopener noreferrer" to every target="_blank" link (the Instagram link is
   missing an aria-label too).
3. Verify the Font Awesome SRI hash is still correct and add SRI to any other CDN asset.
4. Add a Content-Security-Policy via <meta http-equiv> as tight as the CDN dependencies
   permit, and tell me honestly what a meta-tag CSP cannot enforce on static hosting.
```

---

### UC-8 — Resolve the SCSS/CSS drift

**Why here:** the stale `styles.scss` is a landmine for any future agent or IDE Sass watcher.

```text
styles/styles.scss is 109 lines. styles/styles.css is 1300 lines and is the file actually
linked by index.html. The SCSS is a stale fragment — compiling it would destroy the live
stylesheet, and styles.css.map points at a source that no longer reflects reality.

Diff them and establish exactly what the SCSS covers versus what the CSS contains. Then give
me two options with a recommendation:
(a) delete styles.scss and styles.css.map, making styles.css the honest single source; or
(b) rebuild a complete, accurate styles.scss from the current CSS and adopt a real build step.

Do not compile anything until I choose. Whichever we pick, leave a note in the README so the
next person — or the next agent — cannot fall into this.
```

---

### UC-9 — Theme system that actually behaves

```text
Improve the light/dark theme in app.js and styles.css:
- respect prefers-color-scheme on first visit
- persist the user's explicit choice in localStorage and restore it
- eliminate the flash of wrong theme on load (inline pre-paint script in <head>)
- make the toggle a real <button> with aria-pressed and a proper accessible name (UC-3)
- audit light-mode contrast — it is the less-tested path and likely has AA failures
Keep it dependency-free and under about 30 lines of JS.
```

---

### UC-10 — Repo hygiene and README

**Why here:** the repo has no README. It is a public GitHub repo linked from the site; hiring
managers open it.

```text
Write a README.md that treats this repo as a work sample:
- what the site is, live URL, screenshot
- stack and the deliberate no-build-step decision
- how to run locally, how to run the tests (once UC-2 lands), CI badge
- project structure with a one-line purpose per file
- the styles.scss caveat from UC-8 so nobody recompiles it by accident
- a "known limitations / roadmap" section — candid, not marketing

Also: add a LICENSE, fill in the empty author/description fields in package.json, and add a
.nvmrc or engines field. Keep the tone factual. Do not claim capabilities the repo does not
have.
```

---

## Part 3 — Confirmed defect backlog

Found by reading the repo; each is real and reproducible today.

| # | Defect | Location | Impact |
|---|--------|----------|--------|
| 1 | ~~`#portfolio` was commented-out placeholder markup~~ **FIXED** (2f49bc0) - block and its CSS removed. A real project showcase still needs writing | - | Open as a content task, not a defect |
| 2 | ~~Nav controls and theme toggle are `<div>`s~~ **FIXED** (97d11a6) - now `<button>` with the ARIA tabs pattern and roving tabindex | - | - |
| 3 | ~~`img/img1.jpg` (1.6 MB) referenced nowhere~~ **FIXED** (3593e08) - deleted | - | - |
| 4 | Contact form + handler + notifications all commented out | index.html, form-submission.js, notification.js | No working contact path |
| 5 | `server-side.js` cannot run on static hosting | server-side.js | Misleading dead code |
| 6 | `styles.scss` (109 ln) stale vs `styles.css` (1300 ln) | styles/ | Recompiling destroys the site |
| 7 | ~~No description, canonical, OG, favicon, robots, sitemap, JSON-LD~~ **FIXED** (2c779f9) | - | Not yet validated against live crawlers |
| 8 | ~~`npm test` exits 1 by design~~ **FIXED** (d71b611) - 49 Playwright tests across 7 specs | - | - |
| 9 | ~~Two `<script>` tags load fully-commented files~~ **FIXED** (2798137) | - | - |
| 10 | Theme choice not persisted, ignores `prefers-color-scheme` | app.js | Resets every visit |
| 11 | At 360px `div.header-content` is a 280px box holding 287px of content behind `overflow-x:hidden`, cutting off the hero heading. The page does NOT scroll sideways | styles.css | Hero unreadable on small phones; confirmed pre-existing at HEAD |
| 12 | Light-mode accent `#0dbae1` on `#ffffff` measures **2.3:1**, below the 3:1 WCAG 1.4.3 minimum for large text | styles.css:26 | Confirmed by axe; hits the "Osman." span in the hero h1 |
| 13 | `styles.scss` palette (`#27ae60`) diverges from live `styles.css` (`#457fe4`) | styles/ | Any colour sourced from the SCSS is off-brand |
| 14 | `body { transition: all 0.4s }` runs on first paint, so for ~400ms after load white text sits on a background still darkening toward `#191d2b` | styles.css:43 | Automated contrast scans read a real low-contrast window at load; worth confirming whether a human sees a flash |
| 15 | A commented-out `.blogs` feature remains in `styles.css` (~51 lines) with three live orphaned media-query rules; no markup has ever referenced it | styles.css:~705, ~1130, ~1210 | Same abandoned-scaffold pattern as #portfolio; left in place as out of scope |
| 16 | `tests/static-server.js` resolved its root from `__dirname/..`, so `cd`-ing elsewhere still served the repo root - it silently invalidated a before/after comparison | fixed (2798137) | Now honours `STATIC_ROOT`; always verify two servers serve different builds before trusting a diff |
