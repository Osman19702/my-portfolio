const { test, expect } = require('@playwright/test');

/**
 * Theme is a single class on <body>. Dark is the default; `.light-mode`
 * redefines the CSS custom properties that everything else reads from.
 */
test.describe('Theme toggle', () => {
    test.beforeEach(async ({ page }) => {
        await page.goto('/');
    });

    test('the page starts in dark mode', async ({ page }) => {
        await expect(page.locator('body')).not.toHaveClass(/light-mode/);
    });

    test('the toggle switches to light mode and back', async ({ page }) => {
        // Arrange
        const toggle = page.locator('.theme-btn');
        const body = page.locator('body');

        // Act / Assert - on
        await toggle.click();
        await expect(body).toHaveClass(/light-mode/);

        // Act / Assert - and off again
        await toggle.click();
        await expect(body).not.toHaveClass(/light-mode/);
    });

    test('light mode actually repaints the page background', async ({ page }) => {
        const backgroundOf = () =>
            page.evaluate(() => getComputedStyle(document.body).backgroundColor);

        const dark = await backgroundOf();
        await page.locator('.theme-btn').click();

        // body carries `transition: all 0.4s` (styles.css:43), so the computed
        // colour is still the old one for a few frames after the click. Poll
        // rather than sleeping a fixed amount.
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
        await expect(page.locator('body')).toHaveClass(/light-mode/);

        await page.keyboard.press(' ');
        await expect(page.locator('body')).not.toHaveClass(/light-mode/);
    });

    test('the chosen theme survives a reload', async ({ page }) => {
        test.fail(
            true,
            'KNOWN BUG (backlog #10): the theme is a body class only. It is never ' +
            'persisted, so every visit resets to dark. Fixed by UC-9.'
        );

        await page.locator('.theme-btn').click();
        await expect(page.locator('body')).toHaveClass(/light-mode/);

        await page.reload();
        await expect(page.locator('body')).toHaveClass(/light-mode/);
    });
});
