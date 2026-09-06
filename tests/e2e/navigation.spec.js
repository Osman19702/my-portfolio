const { test, expect } = require('@playwright/test');

/**
 * The site is not scroll-based. It is a tab pattern: `.container` is
 * display:none until `.active` is applied, and app.js maps a control's
 * `data-id` onto the section id it reveals. These tests pin that contract.
 */

// The sections that actually render. A fifth, #portfolio, exists in
// index.html but is wrapped in an HTML comment (around line 505) and never
// reaches the DOM, so it is deliberately absent from this list.
const SECTIONS = ['home', 'about', 'certifications', 'contact'];

// `active-btn` also contains the substring "active", and a hyphen counts as a
// word boundary, so a naive /\bactive\b/ matches both. Match the whole token.
const ACTIVE = /(?:^|\s)active(?:\s|$)/;

test.describe('Navigation - the tab contract', () => {
    test.beforeEach(async ({ page }) => {
        await page.goto('/');
    });

    test('every rendered section is present in the DOM', async ({ page }) => {
        for (const id of SECTIONS) {
            await expect(page.locator(`#${id}`), `section #${id}`).toHaveCount(1);
        }
    });

    test('home is the only section shown on first load', async ({ page }) => {
        await expect(page.locator('#home')).toHaveAttribute('class', ACTIVE);

        for (const id of SECTIONS.filter((s) => s !== 'home')) {
            await expect(page.locator(`#${id}`), `#${id} should start hidden`)
                .not.toHaveAttribute('class', ACTIVE);
        }
    });

    for (const target of SECTIONS) {
        test(`clicking the "${target}" control reveals only that section`, async ({ page }) => {
            // Arrange
            const control = page.locator(`.control[data-id="${target}"]`);
            await expect(control).toHaveCount(1);

            // Act
            await control.click();

            // Assert - the target is shown...
            await expect(page.locator(`#${target}`)).toHaveAttribute('class', ACTIVE);

            // ...and every other section was deactivated.
            for (const other of SECTIONS.filter((s) => s !== target)) {
                await expect(page.locator(`#${other}`), `#${other} should be hidden`)
                    .not.toHaveAttribute('class', ACTIVE);
            }

            // ...and exactly one control is marked selected.
            await expect(page.locator('.control.active-btn')).toHaveCount(1);
            await expect(control).toHaveClass(/active-btn/);
        });
    }

    test('only one section is ever visible at a time', async ({ page }) => {
        for (const target of SECTIONS) {
            await page.locator(`.control[data-id="${target}"]`).click();
            const visible = await page.locator('.container.active').count();
            expect(visible, `after clicking "${target}"`).toBe(1);
        }
    });

    test('the navigation exposes exactly the sections that exist', async ({ page }) => {
        // Guards both directions: a control pointing at a section that was
        // removed, and a section added without a way to reach it.
        const navTargets = await page.locator('.control').evaluateAll(
            (nodes) => nodes.map((n) => n.dataset.id)
        );
        const rendered = await page.locator('.container[id]').evaluateAll(
            (nodes) => nodes.map((n) => n.id)
        );

        expect(navTargets.slice().sort()).toEqual(rendered.slice().sort());
    });

    test('navigation controls are reachable and operable by keyboard', async ({ page }) => {
        test.fail(
            true,
            'KNOWN BUG (backlog #2): .control elements are <div>s with click handlers. ' +
            'They are not focusable and do not respond to Enter/Space. Fixed by UC-3.'
        );

        const control = page.locator('.control[data-id="about"]');
        await control.focus();
        await page.keyboard.press('Enter');
        await expect(page.locator('#about')).toHaveAttribute('class', ACTIVE);
    });
});
