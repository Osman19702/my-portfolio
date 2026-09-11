const { test, expect } = require('@playwright/test');

/**
 * The site is not scroll-based. It is a tab pattern: `.container` is
 * display:none until `.active` is applied, and app.js maps a control's
 * `data-id` onto the section id it reveals. These tests pin that contract.
 */

// Every section that renders, in DOM order. The tablist must expose exactly
// these, so adding a panel means adding it here too.
const SECTIONS = ['home', 'about', 'certifications', 'projects', 'contact'];

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
        const control = page.locator('.control[data-id="about"]');

        await control.focus();
        await page.keyboard.press('Enter');
        await expect(page.locator('#about')).toHaveAttribute('class', ACTIVE);

        await page.locator('.control[data-id="contact"]').focus();
        await page.keyboard.press(' ');
        await expect(page.locator('#contact')).toHaveAttribute('class', ACTIVE);
    });

    test('the controls are real buttons with accessible names', async ({ page }) => {
        const controls = page.locator('.control');
        const count = await controls.count();

        for (let i = 0; i < count; i += 1) {
            const control = controls.nth(i);
            await expect(control).toHaveJSProperty('tagName', 'BUTTON');
            await expect(control).toHaveAttribute('type', 'button');

            const name = await control.getAttribute('aria-label');
            expect(name, `control ${i} needs an accessible name`).toBeTruthy();
        }
    });

    test('the tablist exposes the ARIA tab pattern', async ({ page }) => {
        await expect(page.locator('.controls')).toHaveAttribute('role', 'tablist');

        for (const id of SECTIONS) {
            const tab = page.locator(`.control[data-id="${id}"]`);
            await expect(tab).toHaveAttribute('role', 'tab');
            await expect(tab).toHaveAttribute('aria-controls', id);
            await expect(page.locator(`#${id}`)).toHaveAttribute('role', 'tabpanel');
            await expect(page.locator(`#${id}`)).toHaveAttribute('aria-labelledby', `tab-${id}`);
        }
    });

    test('aria-selected and the roving tabindex follow the selection', async ({ page }) => {
        await page.locator('.control[data-id="certifications"]').click();

        const selected = await page.locator('.control').evaluateAll((nodes) =>
            nodes.map((n) => ({
                id: n.dataset.id,
                selected: n.getAttribute('aria-selected'),
                tabindex: n.getAttribute('tabindex'),
            }))
        );

        // Exactly one tab is selected, and only that tab is in the tab order.
        expect(selected.filter((t) => t.selected === 'true')).toHaveLength(1);
        expect(selected.find((t) => t.id === 'certifications').selected).toBe('true');
        expect(selected.find((t) => t.id === 'certifications').tabindex).toBe('0');
        expect(selected.filter((t) => t.tabindex === '-1')).toHaveLength(SECTIONS.length - 1);
    });

    test('arrow keys move between tabs and wrap around', async ({ page }) => {
        await page.locator('.control[data-id="home"]').focus();

        await page.keyboard.press('ArrowDown');
        await expect(page.locator('#about')).toHaveAttribute('class', ACTIVE);

        await page.keyboard.press('ArrowUp');
        await expect(page.locator('#home')).toHaveAttribute('class', ACTIVE);

        // Up from the first tab wraps to the last.
        await page.keyboard.press('ArrowUp');
        await expect(page.locator('#contact')).toHaveAttribute('class', ACTIVE);

        await page.keyboard.press('Home');
        await expect(page.locator('#home')).toHaveAttribute('class', ACTIVE);

        await page.keyboard.press('End');
        await expect(page.locator('#contact')).toHaveAttribute('class', ACTIVE);
    });

    test('the whole tablist occupies a single tab stop', async ({ page }) => {
        // A roving tabindex means Tab enters the tablist once, not five times.
        const inTabOrder = await page.locator('.control').evaluateAll(
            (nodes) => nodes.filter((n) => n.tabIndex === 0).length
        );

        expect(inTabOrder).toBe(1);
    });
});
