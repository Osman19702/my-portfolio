const { test, expect } = require('@playwright/test');

/**
 * Theme is a single class on <html>, not <body>, so the pre-paint script in
 * <head> can apply it before <body> exists. Dark is the default; `.light-mode`
 * redefines the CSS custom properties everything else reads from.
 */
test.describe('Theme toggle', () => {
    test.beforeEach(async ({ page }) => {
        await page.goto('/');
    });

    test('the page starts in dark mode', async ({ page }) => {
        await expect(page.locator('html')).not.toHaveClass(/light-mode/);
    });

    test('the toggle switches to light mode and back', async ({ page }) => {
        const toggle = page.locator('.theme-btn');
        const root = page.locator('html');

        await toggle.click();
        await expect(root).toHaveClass(/light-mode/);

        await toggle.click();
        await expect(root).not.toHaveClass(/light-mode/);
    });

    test('light mode actually repaints the page background', async ({ page }) => {
        const backgroundOf = () =>
            page.evaluate(() => getComputedStyle(document.body).backgroundColor);

        const dark = await backgroundOf();
        await page.locator('.theme-btn').click();

        // body carries `transition: all 0.4s` (styles.css), so the computed
        // colour is still the old one for a few frames after the click.
        await expect
            .poll(backgroundOf, { message: 'background should change with the theme' })
            .not.toBe(dark);
    });

    test('the toggle is a real button that reports its state', async ({ page }) => {
        const toggle = page.locator('.theme-btn');

        await expect(toggle).toHaveJSProperty('tagName', 'BUTTON');
        await expect(toggle).toHaveAttribute('type', 'button');
        await expect(toggle).toHaveAttribute('aria-pressed', 'false');
        await expect(toggle).toHaveAttribute('aria-label', /light mode/i);

        await toggle.click();

        await expect(toggle).toHaveAttribute('aria-pressed', 'true');
        await expect(toggle).toHaveAttribute('aria-label', /dark mode/i);
    });

    test('the toggle responds to the keyboard', async ({ page }) => {
        const toggle = page.locator('.theme-btn');

        await toggle.focus();
        await page.keyboard.press('Enter');
        await expect(page.locator('html')).toHaveClass(/light-mode/);

        await page.keyboard.press(' ');
        await expect(page.locator('html')).not.toHaveClass(/light-mode/);
    });
});

test.describe('Theme persistence', () => {
    test('an explicit choice survives a reload', async ({ page }) => {
        await page.goto('/');
        await page.locator('.theme-btn').click();
        await expect(page.locator('html')).toHaveClass(/light-mode/);

        await page.reload();

        await expect(page.locator('html')).toHaveClass(/light-mode/);
        await expect(page.locator('.theme-btn')).toHaveAttribute('aria-pressed', 'true');
    });

    test('choosing dark also persists, and is not mistaken for "no choice"', async ({ page }) => {
        // With the OS asking for light, an explicit dark choice must win.
        await page.emulateMedia({ colorScheme: 'light' });
        await page.goto('/');
        await expect(page.locator('html')).toHaveClass(/light-mode/);

        await page.locator('.theme-btn').click();
        await expect(page.locator('html')).not.toHaveClass(/light-mode/);

        await page.reload();
        await expect(page.locator('html')).not.toHaveClass(/light-mode/);
    });

    test('a first-time visitor gets the theme their OS asks for', async ({ page }) => {
        await page.emulateMedia({ colorScheme: 'light' });
        await page.goto('/');
        await expect(page.locator('html')).toHaveClass(/light-mode/);

        await page.emulateMedia({ colorScheme: 'dark' });
        await page.goto('/');
        await expect(page.locator('html')).not.toHaveClass(/light-mode/);
    });

    test('the theme is applied before the first paint, with no flash', async ({ page }) => {
        await page.goto('/');
        await page.locator('.theme-btn').click();
        await expect(page.locator('html')).toHaveClass(/light-mode/);

        // Sample the class at the earliest moment a document script can run.
        // If the theme were applied later, this would come back false and the
        // visitor would see a dark frame before the light one.
        await page.addInitScript(() => {
            window.__themeAtStart = null;
            document.addEventListener('readystatechange', () => {
                if (window.__themeAtStart === null) {
                    window.__themeAtStart = document.documentElement.className;
                }
            }, { once: true });
        });
        await page.reload();

        const atStart = await page.evaluate(() => window.__themeAtStart);
        expect(atStart, 'theme class must be present at the first readystatechange')
            .toContain('light-mode');
    });

    test('a blocked localStorage does not break the toggle', async ({ page }) => {
        await page.addInitScript(() => {
            Object.defineProperty(window, 'localStorage', {
                get() { throw new Error('storage blocked'); },
            });
        });

        const errors = [];
        page.on('pageerror', (e) => errors.push(e.message));

        await page.goto('/');
        await page.locator('.theme-btn').click();

        await expect(page.locator('html')).toHaveClass(/light-mode/);
        expect(errors, 'blocked storage must be caught, not thrown').toEqual([]);
    });
});
