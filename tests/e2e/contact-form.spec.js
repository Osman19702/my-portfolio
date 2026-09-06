const { test, expect } = require('@playwright/test');

/**
 * The form posts to Web3Forms because GitHub Pages runs no server code. Every
 * test here intercepts that endpoint, so the suite never sends real mail and
 * never depends on a third party being up.
 */

const ENDPOINT = 'https://api.web3forms.com/submit';

// form-submission.js drops anything submitted within MIN_FILL_MS of load as a
// bot. Tests must clear that window before a submission can reach the network.
const FILL_GUARD_MS = 1400;

async function openContactPanel(page) {
    await page.goto('/');
    await page.locator('.control[data-id="contact"]').click();
    await expect(page.locator('#contact-form')).toBeVisible();
}

async function fillValidly(page) {
    await page.fill('#name', 'Jane Recruiter');
    await page.fill('#email', 'jane@example.com');
    await page.fill('#subject', 'Senior QA role');
    await page.fill('#message', 'We have a role that looks like a good fit for you.');
}

/** Supplies a key so the "not configured" guard does not short-circuit. */
async function configureKey(page) {
    await page.locator('[name="access_key"]').evaluate((el) => {
        el.value = 'test-access-key';
    });
}

test.describe('Contact form', () => {
    test.beforeEach(async ({ page }) => {
        await openContactPanel(page);
    });

    test('every field has a real label, not just a placeholder', async ({ page }) => {
        for (const id of ['name', 'email', 'subject', 'message']) {
            const label = page.locator(`label[for="${id}"]`);
            await expect(label, `label for #${id}`).toHaveCount(1);
            expect((await label.textContent()).trim().length).toBeGreaterThan(0);
        }
    });

    test('submitting empty reports every problem and focuses the first', async ({ page }) => {
        await page.locator('#contact-submit').click();

        await expect(page.locator('#name-error')).not.toBeEmpty();
        await expect(page.locator('#email-error')).not.toBeEmpty();
        await expect(page.locator('#subject-error')).not.toBeEmpty();
        await expect(page.locator('#message-error')).not.toBeEmpty();

        await expect(page.locator('#name')).toHaveAttribute('aria-invalid', 'true');
        await expect(page.locator('#name')).toBeFocused();
        await expect(page.locator('#notification')).toHaveClass(/show/);
    });

    test('each field is described by its own error message', async ({ page }) => {
        for (const id of ['name', 'email', 'subject', 'message']) {
            await expect(page.locator(`#${id}`)).toHaveAttribute('aria-describedby', `${id}-error`);
        }
    });

    test('a malformed email is rejected with a specific message', async ({ page }) => {
        await page.fill('#email', 'not-an-address');
        await page.locator('#subject').click(); // blur

        await expect(page.locator('#email-error')).toContainText(/email address/i);
        await expect(page.locator('#email')).toHaveAttribute('aria-invalid', 'true');
    });

    test('an error clears as soon as the visitor corrects the field', async ({ page }) => {
        await page.locator('#contact-submit').click();
        await expect(page.locator('#name-error')).not.toBeEmpty();

        await page.fill('#name', 'Jane Recruiter');

        await expect(page.locator('#name-error')).toBeEmpty();
        await expect(page.locator('#name')).toHaveAttribute('aria-invalid', 'false');
    });

    test('the honeypot is hidden from people and skipped by Tab', async ({ page }) => {
        const honeypot = page.locator('[name="botcheck"]');

        await expect(honeypot).toHaveCount(1);
        await expect(honeypot).toHaveAttribute('tabindex', '-1');
        await expect(honeypot).not.toBeInViewport();
    });

    test('a submission that trips the honeypot never reaches the network', async ({ page }) => {
        let called = false;
        await page.route(ENDPOINT, async (route) => {
            called = true;
            await route.fulfill({ status: 200, body: JSON.stringify({ success: true }) });
        });

        await configureKey(page);
        await fillValidly(page);
        await page.locator('[name="botcheck"]').evaluate((el) => { el.checked = true; });
        await page.waitForTimeout(FILL_GUARD_MS);
        await page.locator('#contact-submit').click();

        await expect(page.locator('#notification')).toHaveClass(/show/);
        expect(called, 'honeypot submissions must not be sent').toBe(false);
    });

    test('an instant submission is treated as a bot and not sent', async ({ page }) => {
        let called = false;
        await page.route(ENDPOINT, async (route) => {
            called = true;
            await route.fulfill({ status: 200, body: JSON.stringify({ success: true }) });
        });

        // Typing through the UI can itself outlast the guard window, which made
        // this test racy. Populate and submit in one synchronous step instead,
        // so the elapsed time is genuinely bot-like and the assertion is about
        // the guard rather than about how fast the test runner types.
        const sent = await page.evaluate(() => {
            const set = (id, value) => { document.getElementById(id).value = value; };
            document.querySelector('[name="access_key"]').value = 'test-access-key';
            set('name', 'Bot');
            set('email', 'bot@example.com');
            set('subject', 'Instant');
            set('message', 'Submitted far faster than a person could type this.');

            const start = performance.now();
            document.getElementById('contact-form')
                .dispatchEvent(new Event('submit', { cancelable: true, bubbles: true }));
            return performance.now() - start;
        });

        expect(sent, 'the submission must land inside the guard window').toBeLessThan(1200);
        await expect(page.locator('#notification')).toHaveClass(/show/);
        expect(called, 'submissions faster than a human must not be sent').toBe(false);
    });

    test('an unconfigured access key fails loudly instead of silently', async ({ page }) => {
        let called = false;
        await page.route(ENDPOINT, async (route) => {
            called = true;
            await route.abort();
        });

        await fillValidly(page);
        await page.waitForTimeout(FILL_GUARD_MS);
        await page.locator('#contact-submit').click();

        await expect(page.locator('#notification-text')).toContainText(/not configured/i);
        await expect(page.locator('#notification')).toHaveClass(/is-error/);
        expect(called).toBe(false);
    });

    test('a successful send confirms and clears the form', async ({ page }) => {
        await page.route(ENDPOINT, async (route) => {
            await route.fulfill({
                status: 200,
                contentType: 'application/json',
                body: JSON.stringify({ success: true, message: 'Email sent successfully' }),
            });
        });

        await configureKey(page);
        await fillValidly(page);
        await page.waitForTimeout(FILL_GUARD_MS);
        await page.locator('#contact-submit').click();

        await expect(page.locator('#notification')).toHaveClass(/is-success/);
        await expect(page.locator('#notification-text')).toContainText(/sent/i);
        await expect(page.locator('#name')).toHaveValue('');
        await expect(page.locator('#message')).toHaveValue('');
        await expect(page.locator('#contact-submit')).toBeEnabled();
    });

    test('a rejected send reports the failure and keeps what was typed', async ({ page }) => {
        await page.route(ENDPOINT, async (route) => {
            await route.fulfill({
                status: 422,
                contentType: 'application/json',
                body: JSON.stringify({ success: false, message: 'Access key is invalid' }),
            });
        });

        await configureKey(page);
        await fillValidly(page);
        await page.waitForTimeout(FILL_GUARD_MS);
        await page.locator('#contact-submit').click();

        await expect(page.locator('#notification')).toHaveClass(/is-error/);
        await expect(page.locator('#notification-text')).toContainText(/Access key is invalid/);
        // Nothing was sent, so the visitor must not lose their message.
        await expect(page.locator('#message')).not.toHaveValue('');
        await expect(page.locator('#contact-submit')).toBeEnabled();
    });

    test('a network failure is handled rather than thrown', async ({ page }) => {
        const errors = [];
        page.on('pageerror', (e) => errors.push(e.message));
        await page.route(ENDPOINT, (route) => route.abort('failed'));

        await configureKey(page);
        await fillValidly(page);
        await page.waitForTimeout(FILL_GUARD_MS);
        await page.locator('#contact-submit').click();

        await expect(page.locator('#notification')).toHaveClass(/is-error/);
        await expect(page.locator('#notification-text')).toContainText(/connection|reach/i);
        await expect(page.locator('#contact-submit')).toBeEnabled();
        expect(errors, 'the failure must not surface as an uncaught error').toEqual([]);
    });

    test('the button reports a busy state while sending', async ({ page }) => {
        let release;
        const held = new Promise((resolve) => { release = resolve; });
        await page.route(ENDPOINT, async (route) => {
            await held;
            await route.fulfill({ status: 200, body: JSON.stringify({ success: true }) });
        });

        await configureKey(page);
        await fillValidly(page);
        await page.waitForTimeout(FILL_GUARD_MS);
        await page.locator('#contact-submit').click();

        await expect(page.locator('#contact-submit')).toBeDisabled();
        await expect(page.locator('#contact-submit')).toHaveAttribute('aria-busy', 'true');

        release();
        await expect(page.locator('#contact-submit')).toBeEnabled();
    });

    test('the toast is announced and does not block clicks while hidden', async ({ page }) => {
        const notification = page.locator('#notification');

        await expect(notification).toHaveAttribute('role', 'status');
        await expect(notification).toHaveCSS('visibility', 'hidden');
        await expect(notification).toHaveCSS('pointer-events', 'none');
    });

    test('the form is operable by keyboard alone', async ({ page }) => {
        await page.locator('#name').focus();
        await page.keyboard.type('Jane Recruiter');
        await page.keyboard.press('Tab');
        await page.keyboard.type('jane@example.com');
        await page.keyboard.press('Tab');
        await page.keyboard.type('Senior QA role');
        await page.keyboard.press('Tab');
        await page.keyboard.type('We have a role that looks like a good fit for you.');

        await expect(page.locator('#email')).toHaveValue('jane@example.com');
        await expect(page.locator('#subject')).toHaveValue('Senior QA role');
    });
});
