/**
 * Shared vocabulary for the specs: which sections exist, how to tell the
 * active one, how to open one, and what counts as an accessibility failure.
 * Not a spec itself; Playwright only collects *.spec.js.
 */
const { expect } = require('@playwright/test');
const AxeBuilder = require('@axe-core/playwright').default;

// Every section that renders, in DOM order. The tablist must expose exactly
// these, so adding a panel means adding it here too.
const SECTIONS = ['home', 'about', 'certifications', 'projects', 'contact'];

// `active-btn` also contains the substring "active", and a hyphen counts as a
// word boundary, so a naive /\bactive\b/ matches both. Match the whole token.
const ACTIVE = /(?:^|\s)active(?:\s|$)/;

// The body paints --color-primary, so this is how each theme looks once applied.
const BACKGROUND = {
    dark: 'rgb(25, 29, 43)',      // :root #191d2b
    light: 'rgb(255, 255, 255)',  // .light-mode #ffffff
};

/** Clicks a section's tab and waits until its panel is the active one. */
async function openPanel(page, id) {
    await page.locator(`.control[data-id="${id}"]`).click();
    await expect(page.locator(`#${id}`)).toHaveAttribute('class', ACTIVE);
}

/**
 * Waits until every finite animation and transition has finished. A panel
 * scales in from scaleY(0) over a second, so geometry measured as soon as it
 * is active is a stack of zero-height boxes, which overflow checks skip:
 * a check like that passes without having looked. The hero's decorative
 * loops never finish, so infinite animations are left out.
 */
async function waitForAnimations(page) {
    await page.waitForFunction(() => document.getAnimations().every(
        (a) => a.playState !== 'running' || a.effect.getComputedTiming().iterations === Infinity
    ));
}

/**
 * Critical and serious WCAG 2.1 A/AA violations in what is visible, shaped to
 * read well in a CI log. axe skips display:none content, so a panel has to be
 * open to be audited at all.
 */
async function blockingViolations(page) {
    const results = await new AxeBuilder({ page })
        .withTags(['wcag2a', 'wcag2aa', 'wcag21a', 'wcag21aa'])
        .analyze();
    return results.violations
        .filter((v) => ['critical', 'serious'].includes(v.impact))
        .map((v) => ({
            id: v.id,
            impact: v.impact,
            help: v.help,
            nodes: v.nodes.length,
            example: v.nodes[0] && v.nodes[0].html.slice(0, 120),
        }));
}

module.exports = { SECTIONS, ACTIVE, BACKGROUND, openPanel, waitForAnimations, blockingViolations };
