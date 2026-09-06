const { test, expect } = require('@playwright/test');

/**
 * Regression guard for the discoverability layer added in UC-1. None of this
 * is visible on the page, which is exactly why it needs a test - a stray edit
 * to <head> would otherwise go unnoticed until a share preview broke.
 */
test.describe('Discoverability metadata', () => {
    test.beforeEach(async ({ page }) => {
        await page.goto('/');
    });

    test('the page carries a description of a sensible length', async ({ page }) => {
        const description = await page
            .locator('meta[name="description"]')
            .getAttribute('content');

        expect(description).toBeTruthy();
        expect(description.length).toBeGreaterThan(50);
        expect(description.length).toBeLessThanOrEqual(160);
    });

    test('the canonical URL points at the production domain', async ({ page }) => {
        await expect(page.locator('link[rel="canonical"]'))
            .toHaveAttribute('href', 'https://www.osmanturalioglu.com/');
    });

    test('Open Graph and Twitter cards are complete', async ({ page }) => {
        const required = [
            'meta[property="og:type"]',
            'meta[property="og:title"]',
            'meta[property="og:description"]',
            'meta[property="og:url"]',
            'meta[property="og:image"]',
            'meta[property="og:image:width"]',
            'meta[property="og:image:height"]',
            'meta[name="twitter:card"]',
            'meta[name="twitter:title"]',
            'meta[name="twitter:image"]',
        ];

        for (const selector of required) {
            const content = await page.locator(selector).getAttribute('content');
            expect(content, `${selector} should be present and non-empty`).toBeTruthy();
        }
    });

    test('the Open Graph image is an absolute URL that resolves', async ({ page, request }) => {
        const src = await page.locator('meta[property="og:image"]').getAttribute('content');
        expect(src, 'og:image must be absolute').toMatch(/^https?:\/\//);

        // The tag points at production by necessity, so verify the local copy
        // of the same asset actually exists rather than hitting the internet.
        const response = await request.get(new URL(new URL(src).pathname, page.url()).toString());
        expect(response.status()).toBe(200);
        expect(response.headers()['content-type']).toContain('image/png');
    });

    test('the JSON-LD parses and describes a Person', async ({ page }) => {
        const raw = await page
            .locator('script[type="application/ld+json"]')
            .textContent();

        const data = JSON.parse(raw);

        expect(data['@type']).toBe('Person');
        expect(data.name).toBe('Osman Turalioglu');
        expect(data.jobTitle).toBeTruthy();
        expect(Array.isArray(data.hasCredential)).toBe(true);
        expect(data.hasCredential.length).toBeGreaterThan(0);
    });

    test('robots.txt and sitemap.xml are served', async ({ request }) => {
        const robots = await request.get('/robots.txt');
        expect(robots.status()).toBe(200);
        expect(await robots.text()).toContain('Sitemap:');

        const sitemap = await request.get('/sitemap.xml');
        expect(sitemap.status()).toBe(200);
        expect(await sitemap.text()).toContain('<loc>https://www.osmanturalioglu.com/</loc>');
    });

    test('the favicon set is served', async ({ request }) => {
        for (const asset of ['/favicon.svg', '/favicon.ico', '/apple-touch-icon.png']) {
            const response = await request.get(asset);
            expect(response.status(), asset).toBe(200);
        }
    });
});
