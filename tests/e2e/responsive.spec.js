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
            await expect(page.locator('a.main-btn')).toBeVisible();
        });
    }

    for (const viewport of VIEWPORTS) {
        test(`${viewport.name} (${viewport.width}px) does not clip its own content`, async ({ page }) => {
            if (viewport.width === 360) {
                test.fail(
                    true,
                    'KNOWN BUG (backlog #11): at 360px div.header-content is a 280px box ' +
                    'holding 287px of content behind overflow-x:hidden, so the hero heading ' +
                    'is visibly cut off. The page does NOT scroll sideways, which is why the ' +
                    'horizontal-scroll check above passes - the content is clipped, not ' +
                    'spilled. Confirmed pre-existing at HEAD. Needs a responsive fix.'
                );
            }

            await page.setViewportSize({ width: viewport.width, height: viewport.height });
            await page.goto('/');

            // An element whose scroll extent exceeds its visible box is hiding
            // content from the reader.
            const clipped = await page.evaluate(() =>
                [...document.querySelectorAll('body *')]
                    .filter((el) => {
                        const rect = el.getBoundingClientRect();
                        return rect.width > 0 && rect.height > 0
                            && el.scrollWidth > el.clientWidth + 1;
                    })
                    .map((el) => ({
                        selector: el.tagName.toLowerCase()
                            + (el.className ? '.' + String(el.className).trim().split(/\s+/).join('.') : ''),
                        scrollWidth: el.scrollWidth,
                        clientWidth: el.clientWidth,
                    }))
            );

            expect(clipped, 'elements hiding content behind their own edge').toEqual([]);
        });
    }

    test('the navigation is usable at mobile width', async ({ page }) => {
        await page.setViewportSize({ width: 360, height: 800 });
        await page.goto('/');

        await page.locator('.control[data-id="contact"]').click();
        await expect(page.locator('#contact')).toHaveAttribute('class', /(?:^|\s)active(?:\s|$)/);
    });
});
