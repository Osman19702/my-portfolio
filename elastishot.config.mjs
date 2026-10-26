// Visual check for osmanturalioglu.com. `npm run visual` runs `elastishot pr`:
// it checks the reference out into a temporary worktree, serves it and the
// working tree side by side, and compares every target. The site is static, so
// each side's folder is served as it is and there is no `pr` block.
//
// The site is a tab SPA: only the active section is in the layout, so every
// section is its own target and is opened by clicking its tab before the
// capture. Two colour schemes and two widths cover what the e2e suite checks
// by hand (360 px fit, both themes).
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
      url: '/',
      capture: { colorScheme: theme, waitFor: openTab(id) },
    })),
  ),
}
