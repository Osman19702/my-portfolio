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
        test.fail(
            true,
            'KNOWN BUG (backlog #12): in light mode the accent --color-secondary #0dbae1 ' +
            'on #ffffff measures 2.3:1 where WCAG 1.4.3 requires 3:1 for large text. It ' +
            'hits the "Osman." span in the hero h1. Fixed by UC-6.'
        );

        await page.goto('/');
        await page.locator('.theme-btn').click();
        await expect(page.locator('body')).toHaveClass(/light-mode/);
        await settled(page, 'light');

        const blocking = await scan(page);
        expect(summarise(blocking)).toEqual([]);
    });

    test('the page has exactly one h1', async ({ page }) => {
        await page.goto('/');
        await expect(page.locator('h1')).toHaveCount(1);
    });

    test('the document declares a language', async ({ page }) => {
        await page.goto('/');
        await expect(page.locator('html')).toHaveAttribute('lang', /\w/);
    });
});
