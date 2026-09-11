const { test, expect } = require('@playwright/test');

/**
 * A page that scrolls sideways on a phone is broken, regardless of how it
 * looks in a desktop browser. 360 is a small Android, 768 a tablet, 1440 a
 * laptop.
 */

const VIEWPORTS = [
    { name: 'mobile', width: 360, height: 800 },
    { name: 'tablet', width: 768, height: 1024 },
    { name: 'laptop', width: 1440, height: 900 },
];

/** Elements whose right edge sits beyond the viewport. */
async function overflowingElements(page) {
    return page.evaluate(() => {
        const limit = document.documentElement.clientWidth;
        return [...document.querySelectorAll('body *')]
            .filter((el) => {
                const rect = el.getBoundingClientRect();
                if (rect.width === 0 || rect.height === 0) return false;
                if (getComputedStyle(el).visibility === 'hidden') return false;
                return Math.ceil(rect.right) > limit + 1;
            })
            .slice(0, 8)
            .map((el) => `${el.tagName.toLowerCase()}.${el.className || '(no class)'}`);
    });
}

test.describe('Responsive layout', () => {
    for (const viewport of VIEWPORTS) {
        test(`${viewport.name} (${viewport.width}px) does not scroll horizontally`, async ({ page }) => {
            // Arrange
            await page.setViewportSize({ width: viewport.width, height: viewport.height });
            await page.goto('/');

            // Act
            const scrollWidth = await page.evaluate(() => document.documentElement.scrollWidth);
            const clientWidth = await page.evaluate(() => document.documentElement.clientWidth);

            // Assert
            const offenders = await overflowingElements(page);
            expect(
                scrollWidth,
                `page scrolls ${scrollWidth - clientWidth}px sideways. Overflowing: ${offenders.join(', ')}`
            ).toBeLessThanOrEqual(clientWidth + 1);
        });

        test(`${viewport.name} (${viewport.width}px) renders the hero and the CV button`, async ({ page }) => {
            await page.setViewportSize({ width: viewport.width, height: viewport.height });
            await page.goto('/');

            await expect(page.locator('h1.name')).toBeVisible();
            // Scoped to the hero: the Projects panel has its own .main-btn download link.
            await expect(page.locator('#home a.main-btn')).toBeVisible();
        });
    }

    for (const viewport of VIEWPORTS) {
        test(`${viewport.name} (${viewport.width}px) does not clip its own text`, async ({ page }) => {
            await page.setViewportSize({ width: viewport.width, height: viewport.height });
            await page.goto('/');

            // Only elements that hold text of their own. A container whose
            // scroll extent exceeds its box because of a decorative child is
            // not a bug: .header-shapes deliberately overhangs and is clipped
            // by overflow:hidden, which is the intended look.
            const clipped = await page.evaluate(() =>
                [...document.querySelectorAll('body *')]
                    .filter((el) => {
                        const rect = el.getBoundingClientRect();
                        if (rect.width === 0 || rect.height === 0) return false;
                        if (getComputedStyle(el).visibility === 'hidden') return false;

                        const ownText = [...el.childNodes]
                            .filter((n) => n.nodeType === Node.TEXT_NODE)
                            .map((n) => n.textContent.trim())
                            .join('');
                        if (!ownText) return false;

                        return el.scrollWidth > el.clientWidth + 1;
                    })
                    .map((el) => ({
                        selector: el.tagName.toLowerCase()
                            + (el.className ? '.' + String(el.className).trim().split(/\s+/).join('.') : ''),
                        text: el.textContent.trim().slice(0, 40),
                        scrollWidth: el.scrollWidth,
                        clientWidth: el.clientWidth,
                    }))
            );

            expect(clipped, 'elements hiding their own text behind their edge').toEqual([]);
        });
    }

    test('the navigation is usable at mobile width', async ({ page }) => {
        await page.setViewportSize({ width: 360, height: 800 });
        await page.goto('/');

        await page.locator('.control[data-id="contact"]').click();
        await expect(page.locator('#contact')).toHaveAttribute('class', /(?:^|\s)active(?:\s|$)/);
    });
});
