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
        const unnamed = await page.locator('.contact-icon a').evaluateAll((links) =>
            links
                .filter((a) => !(a.getAttribute('aria-label') || a.textContent || '').trim())
                .map((a) => a.getAttribute('href'))
        );

        expect(unnamed, 'icon-only links with no accessible name').toEqual([]);
    });
});

test.describe('Privacy hardening', () => {
    test('the served HTML contains no harvestable email address', async ({ request }) => {
        const html = await (await request.get('/')).text();
        const found = html.match(/[A-Za-z0-9._%+-]+@[A-Za-z0-9.-]+\.[A-Za-z]{2,}/g) || [];

        expect(found, 'raw HTML must not expose an email address').toEqual([]);
    });

    test('the served HTML contains no harvestable phone number', async ({ request }) => {
        const html = await (await request.get('/')).text();
        const found = html.match(/\+?\(?44\)?[\s-]?7\d{3}[\s-]?\d{3}[\s-]?\d{3}/g) || [];

        expect(found, 'raw HTML must not expose a phone number').toEqual([]);
    });

    test('the email and phone are still reachable in one click', async ({ page }) => {
        await page.goto('/');
        await page.locator('.control[data-id="contact"]').click();

        const mailto = page.locator('a.contact-link[href^="mailto:"]');
        await expect(mailto).toHaveCount(1);
        await expect(mailto).toHaveText(/@/);

        const tel = page.locator('a.contact-link[href^="tel:"]');
        await expect(tel).toHaveCount(1);
        await expect(tel).toHaveText(/^\+44/);
    });

    test('the assembled links look like the surrounding text', async ({ page }) => {
        await page.goto('/');
        await page.locator('.control[data-id="contact"]').click();

        const link = page.locator('a.contact-link').first();
        const parentColor = await link.evaluate(
            (el) => getComputedStyle(el.parentElement).color
        );
        await expect(link).toHaveCSS('color', parentColor);
        await expect(link).toHaveCSS('text-decoration-line', 'none');
    });

    test('a Content-Security-Policy is declared', async ({ page }) => {
        await page.goto('/');

        const policy = await page
            .locator('meta[http-equiv="Content-Security-Policy"]')
            .getAttribute('content');

        expect(policy).toBeTruthy();
        // No escape hatches: the page genuinely has no inline script or style.
        expect(policy).not.toContain ('unsafe');
        expect(policy).toContain("default-src 'self'");
        expect(policy).toContain("object-src 'none'");
        expect(policy).toContain('connect-src https://api.web3forms.com');
    });

    test('the CSP does not block anything the page needs', async ({ page }) => {
        const violations = [];
        page.on('console', (m) => {
            if (/Content Security Policy|Refused to/i.test(m.text())) {
                violations.push(m.text());
            }
        });

        await page.goto('/');
        await page.waitForLoadState('networkidle');
        await page.locator('.control[data-id="contact"]').click();

        expect(violations).toEqual([]);
    });
});
