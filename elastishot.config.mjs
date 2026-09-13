// Visual regression targets for osmanturalioglu.com, run by tests/visual/run.js.
//
// The site is a tab SPA: only the active section is in the layout, so every
// section is its own target and is opened by clicking its tab before the
// capture. Two colour schemes and two widths cover what the e2e suite checks
// by hand (360 px fit, both themes).
const PORT = process.env.VISUAL_PORT ?? '4174'
const BASE = `http://127.0.0.1:${PORT}/`

const SECTIONS = ['home', 'about', 'certifications', 'projects', 'contact']
const THEMES = ['dark', 'light']

/** Open the section's tab and wait for it to be the active panel. */
const openTab = (id) => async (page) => {
  if (id !== 'home') {
    const tab = await page.$(`.control[data-id="${id}"]`)
    if (!tab) throw new Error(`no "${id}" tab on this build`)
    await tab.click()
  }
  await page.waitForSelector(`#${id}.active`, { timeout: 10_000 })
  await page.waitForTimeout(300)
}

export default {
  baselineDir: process.env.VISUAL_BASELINES ?? 'tests/visual/baselines',
  outDir: '.elastishot/runs',
  threshold: 0.98,
  viewports: [
    { name: 'desktop', width: 1440, height: 900 },
    { name: 'mobile', width: 360, height: 780 },
  ],
  capture: { fullPage: true, waitUntil: 'load', timeoutMs: 60_000 },
  report: { title: 'osmanturalioglu.com visual check' },
  targets: SECTIONS.flatMap((id) =>
    THEMES.map((theme) => ({
      name: `${id}-${theme}`,
      url: BASE,
      capture: { colorScheme: theme, waitFor: openTab(id) },
    })),
  ),
}
