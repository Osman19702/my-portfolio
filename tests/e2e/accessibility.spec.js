const { test, expect } = require('@playwright/test');
const AxeBuilder = require('@axe-core/playwright').default;

/**
 * Automated checks catch roughly a third of real accessibility problems, so a
 * green run here is a floor and not a certificate. Light mode is audited
 * separately because it redefines the entire palette and is the less-travelled
 * path.
 */

const BLOCKING = ['critical', 'serious'];

const BACKGROUND = {
    dark: 'rgb(25, 29, 43)',      // --color-primary #191d2b
    light: 'rgb(255, 255, 255)',  // .light-mode --color-primary #ffffff
};

/** Render violations as something readable in a CI log. */
function summarise(violations) {
    return violations.map((v) => ({
        id: v.id,
        impact: v.impact,
        help: v.help,
        nodes: v.nodes.length,
        example: v.nodes[0] && v.nodes[0].html.slice(0, 120),
    }));
}

/**
 * body carries `transition: all 0.4s` (styles.css:43), and that transition runs
 * on the first paint as well as on a theme switch. Scanning inside that window
 * measures white text against a background that has not finished darkening,
 * which produces contrast "violations" that do not exist once the page settles.
 * Waiting for the final background colour makes the scan deterministic.
 */
async function settled(page, theme) {
    await expect(page.locator('body')).toHaveCSS('background-color', BACKGROUND[theme]);
    await page.waitForFunction(
        () => document.getAnimations().every((a) => a.playState === 'finished'),
        null,
        { timeout: 5000 }
    ).catch(() => { /* decorative loops never finish; the colour check is what matters */ });
}

async function scan(page) {
    const results = await new AxeBuilder({ page })
        .withTags(['wcag2a', 'wcag2aa', 'wcag21a', 'wcag21aa'])
        .analyze();
    return results.violations.filter((v) => BLOCKING.includes(v.impact));
}

test.describe('Accessibility (axe-core)', () => {
    test('dark mode has no critical or serious violations', async ({ page }) => {
        await page.goto('/');
        await settled(page, 'dark');

        const blocking = await scan(page);
        expect(summarise(blocking)).toEqual([]);
    });

    test('light mode has no critical or serious violations', async ({ page }) => {
        await page.goto('/');
        await page.locator('.theme-btn').click();
        await expect(page.locator('body')).toHaveClass(/light-mode/);
        await settled(page, 'light');

        const blocking = await scan(page);
        expect(summarise(blocking)).toEqual([]);
    });

    // Hidden panels are skipped by axe, so each one has to be revealed and
    // scanned in its own right. Without this the contact form - the only
    // interactive content on the site - would never be audited at all.
    for (const panel of ['about', 'certifications', 'contact']) {
        test(`the ${panel} panel has no critical or serious violations`, async ({ page }) => {
            await page.goto('/');
            await settled(page, 'dark');

            await page.locator(`.control[data-id="${panel}"]`).click();
            await expect(page.locator(`#${panel}`)).toHaveAttribute('class', /(?:^|\s)active(?:\s|$)/);

            const blocking = await scan(page);
            expect(summarise(blocking)).toEqual([]);
        });
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
            ['contact', 'Contact Me'],
        ]) {
            await page.locator(`.control[data-id="${panel}"]`).click();
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
