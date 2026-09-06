const { test, expect } = require('@playwright/test');

/**
 * The CV download is the single most important conversion on the site, and
 * the social links are the only other way out of the page. Both are worth
 * pinning.
 */
test.describe('Links', () => {
    test.beforeEach(async ({ page }) => {
        await page.goto('/');
    });

    test('the CV link resolves to a real PDF', async ({ page, request }) => {
        // Arrange - read the href the browser actually resolved.
        const href = await page.locator('a.main-btn').first().getAttribute('href');
        expect(href, 'CV link should exist').toBeTruthy();
        const absolute = new URL(href, page.url()).toString();

        // Act
        const response = await request.get(absolute);

        // Assert
        expect(response.status(), `GET ${absolute}`).toBe(200);
        expect(response.headers()['content-type']).toContain('application/pdf');

        const body = await response.body();
        expect(body.length, 'PDF should not be empty').toBeGreaterThan(1000);
        expect(body.subarray(0, 5).toString('latin1'), 'PDF magic bytes').toBe('%PDF-');
    });

    test('the CV link carries a cache-busting version', async ({ page }) => {
        const href = await page.locator('a.main-btn').first().getAttribute('href');
        expect(href, 'CV link should be versioned so a new PDF is not cached')
            .toMatch(/\?v=\d{4}-\d{2}-\d{2}/);
    });

    test('external links open in a new tab', async ({ page }) => {
        const external = page.locator('a[href^="http"]:not([href*="osmanturalioglu.com"])');
        const count = await external.count();
        expect(count, 'expected the social links to be present').toBeGreaterThan(0);

        for (let i = 0; i < count; i += 1) {
            const link = external.nth(i);
            const href = await link.getAttribute('href');
            await expect(link, `${href} should open in a new tab`)
                .toHaveAttribute('target', '_blank');
        }
    });

    test('every link opening a new tab sets rel="noopener noreferrer"', async ({ page }) => {
        test.fail(
            true,
            'KNOWN BUG: all three social links use target="_blank" with no rel attribute, ' +
            'giving the opened page a window.opener handle back to this one. Fixed by UC-7.'
        );

        const offenders = await page.locator('a[target="_blank"]').evaluateAll((links) =>
            links
                .filter((a) => {
                    const rel = (a.getAttribute('rel') || '').toLowerCase();
                    return !rel.includes('noopener') || !rel.includes('noreferrer');
                })
                .map((a) => a.getAttribute('href'))
        );

        expect(offenders, 'links missing rel="noopener noreferrer"').toEqual([]);
    });

    test('every social link exposes an accessible name', async ({ page }) => {
        test.fail(
            true,
            'KNOWN BUG: the Instagram link is icon-only with no aria-label, so a screen ' +
            'reader announces it as an unlabelled link. Fixed by UC-7.'
        );

        const unnamed = await page.locator('.contact-icon a').evaluateAll((links) =>
            links
                .filter((a) => !(a.getAttribute('aria-label') || a.textContent || '').trim())
                .map((a) => a.getAttribute('href'))
        );

        expect(unnamed, 'icon-only links with no accessible name').toEqual([]);
    });
});
