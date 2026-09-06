const { test, expect } = require('@playwright/test');

/**
 * Nothing should be broken badly enough to reach the console, and no asset the
 * page asks for should be missing. Listeners are attached before goto() so
 * load-time failures are not missed.
 */
test.describe('Runtime health', () => {
    test('the page loads with no console errors and no uncaught exceptions', async ({ page }) => {
        const problems = [];

        page.on('console', (message) => {
            if (message.type() === 'error') {
                problems.push(`console.error: ${message.text()}`);
            }
        });
        page.on('pageerror', (error) => {
            problems.push(`uncaught: ${error.message}`);
        });

        await page.goto('/');
        await page.waitForLoadState('networkidle');

        expect(problems).toEqual([]);
    });

    test('no request the page makes comes back 4xx or 5xx', async ({ page }) => {
        const broken = [];

        page.on('response', (response) => {
            if (response.status() >= 400) {
                broken.push(`${response.status()} ${response.url()}`);
            }
        });

        await page.goto('/');
        await page.waitForLoadState('networkidle');

        expect(broken).toEqual([]);
    });

    test('navigating every tab raises no errors', async ({ page }) => {
        const problems = [];
        page.on('pageerror', (error) => problems.push(error.message));
        page.on('console', (m) => {
            if (m.type() === 'error') problems.push(m.text());
        });

        await page.goto('/');
        for (const target of ['about', 'certifications', 'contact', 'home']) {
            await page.locator(`.control[data-id="${target}"]`).click();
        }

        expect(problems).toEqual([]);
    });
});
