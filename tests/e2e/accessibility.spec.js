const { test, expect } = require('@playwright/test');
const { SECTIONS, BACKGROUND, openPanel, waitForAnimations, blockingViolations } = require('./helpers');

/**
 * Automated checks catch roughly a third of real accessibility problems, so a
 * green run here is a floor and not a certificate. Light mode gets the same
 * coverage as dark because it redefines the entire palette and is the
 * less-travelled path.
 */

/**
 * body carries `transition: all 0.4s`, and that transition runs on the first
 * paint as well as on a theme switch. Scanning inside that window measures
 * white text against a background that has not finished darkening, which
 * produces contrast "violations" that do not exist once the page settles.
 * Waiting for the final background colour, and for a freshly opened panel to
 * finish animating in, makes the scan deterministic.
 */
async function settled(page, theme) {
    await expect(page.locator('body')).toHaveCSS('background-color', BACKGROUND[theme]);
    await waitForAnimations(page);
}

test.describe('Accessibility (axe-core)', () => {
    // axe skips hidden content and four of the five panels are display:none at
    // any moment, so each one is opened and scanned in its own right, in both
    // themes. Scanning only the default view once meant the contact form - the
    // only interactive content on the site - was never audited at all.
    for (const theme of ['dark', 'light']) {
        for (const panel of SECTIONS) {
            test(`the ${panel} panel has no critical or serious violations in ${theme} mode`, async ({ page }) => {
                await page.emulateMedia({ colorScheme: theme });
                await page.goto('/');
                if (panel !== 'home') {
                    await openPanel(page, panel);
                }
                await settled(page, theme);

                expect(await blockingViolations(page)).toEqual([]);
            });
        }
    }

    test('the page has exactly one h1', async ({ page }) => {
        await page.goto('/');
        await expect(page.locator('h1')).toHaveCount(1);
    });

    test('the document declares a language', async ({ page }) => {
        await page.goto('/');
        await expect(page.locator('html')).toHaveAttribute('lang', /\w/);
    });
});

test.describe('Document structure (WCAG 1.3.1, 2.4.1)', () => {
    test.beforeEach(async ({ page }) => {
        await page.goto('/');
    });

    test('heading levels never skip', async ({ page }) => {
        const levels = await page.locator('h1,h2,h3,h4,h5,h6').evaluateAll(
            (nodes) => nodes.map((n) => Number(n.tagName[1]))
        );

        expect(levels[0], 'the document should start at h1').toBe(1);
        for (let i = 1; i < levels.length; i += 1) {
            expect(
                levels[i] - levels[i - 1],
                `h${levels[i - 1]} is followed by h${levels[i]}`
            ).toBeLessThanOrEqual(1);
        }
    });

    test('decorative heading text is hidden from assistive tech', async ({ page }) => {
        // .bg-text is a large watermark behind each title. Left visible to the
        // accessibility tree it ran into the real heading: "About memy stats".
        for (const [panel, expected] of [
            ['about', 'About me'],
            ['certifications', 'Licenses & Certifications'],
            ['projects', 'My Projects'],
            ['contact', 'Contact Me'],
        ]) {
            await openPanel(page, panel);
            const snapshot = await page.locator(`#${panel} .main-title h2`).first().ariaSnapshot();
            expect(snapshot).toContain(`heading "${expected}"`);
        }
    });

    test('a skip link is the first thing in the tab order', async ({ page }) => {
        await page.keyboard.press('Tab');

        const focused = await page.evaluate(() => ({
            cls: document.activeElement.className,
            href: document.activeElement.getAttribute('href'),
        }));
        expect(focused.cls).toContain('skip-link');
        expect(focused.href).toBe('#tab-home');
    });

    test('the skip link is invisible until focused', async ({ page }) => {
        const link = page.locator('.skip-link');

        expect((await link.boundingBox()).x).toBeLessThan(-1000);
        await link.focus();
        expect((await link.boundingBox()).x).toBeGreaterThanOrEqual(0);
    });

    test('the page exposes navigation and main landmarks', async ({ page }) => {
        await expect(page.locator('nav[aria-label]')).toHaveCount(1);
        await expect(page.locator('main')).toHaveCount(1);
    });
});
