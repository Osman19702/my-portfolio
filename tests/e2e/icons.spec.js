const { test, expect } = require('@playwright/test');

/**
 * Every icon is a <use> of a <symbol> in the inline sprite that
 * scripts/build-icon-sprite.js writes. Both ways that goes wrong fail
 * silently: a <use> with no symbol renders nothing and logs nothing, and an
 * icon whose viewBox disagrees with its symbol's is drawn shrunk (a 640-wide
 * glyph in a 512-wide box loses a fifth of its size). The fix for either is
 * `npm run build:icons`.
 */
test.describe('Icon sprite', () => {
    test.beforeEach(async ({ page }) => {
        await page.goto('/');
    });

    test('every icon resolves to a symbol in the sprite', async ({ page }) => {
        const missing = await page.locator('use').evaluateAll((uses) =>
            uses
                .map((use) => use.getAttribute('href'))
                .filter((href) => !document.querySelector(`.icon-sprite symbol${href}`))
        );

        expect(missing, 'a <use> without a symbol renders nothing, silently').toEqual([]);
    });

    test('every icon carries its own symbol\'s viewBox', async ({ page }) => {
        const mismatched = await page.locator('svg.svg-icon').evaluateAll((icons) =>
            icons
                .map((icon) => {
                    const href = icon.querySelector('use')?.getAttribute('href');
                    const symbol = href && document.querySelector(`.icon-sprite symbol${href}`);
                    return { href, icon: icon.getAttribute('viewBox'), symbol: symbol?.getAttribute('viewBox') };
                })
                .filter(({ icon, symbol }) => icon !== symbol)
        );

        expect(mismatched, 'icons drawn at the wrong size').toEqual([]);
    });

    test('the sprite carries no symbol the page does not use', async ({ page }) => {
        const unused = await page.locator('.icon-sprite symbol').evaluateAll((symbols) => {
            const used = new Set([...document.querySelectorAll('use')].map((use) => use.getAttribute('href')));
            return symbols.map((symbol) => `#${symbol.id}`).filter((id) => !used.has(id));
        });

        expect(unused, 'path data every visitor downloads for nothing').toEqual([]);
    });

    test('the sprite itself takes no space and is hidden from assistive tech', async ({ page }) => {
        const sprite = page.locator('svg.icon-sprite');

        await expect(sprite).toHaveCount(1);
        await expect(sprite).toBeHidden();
        await expect(sprite).toHaveAttribute('aria-hidden', 'true');
    });
});
