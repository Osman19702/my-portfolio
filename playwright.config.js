const { defineConfig, devices } = require('@playwright/test');

const PORT = Number(process.env.PORT) || 4173;
const BASE_URL = `http://127.0.0.1:${PORT}`;

module.exports = defineConfig({
    testDir: './tests/e2e',
    fullyParallel: true,

    // A stray test.only must never silently shrink the suite in CI.
    forbidOnly: !!process.env.CI,
    retries: process.env.CI ? 1 : 0,

    reporter: [
        ['list'],
        ['html', { outputFolder: 'playwright-report', open: 'never' }],
    ],

    use: {
        baseURL: BASE_URL,

        // The site now honours prefers-color-scheme on a first visit, and
        // Playwright's own default is light. Pin the baseline to dark so
        // "starts in dark mode" means something; the tests that care about
        // the light preference set it explicitly with emulateMedia.
        colorScheme: 'dark',

        trace: 'on-first-retry',
        screenshot: 'only-on-failure',
    },

    projects: [
        { name: 'chromium', use: { ...devices['Desktop Chrome'] } },
    ],

    // Zero-dependency static server, so local and CI runs are identical.
    webServer: {
        command: 'node tests/static-server.js',
        url: BASE_URL,
        reuseExistingServer: !process.env.CI,
        timeout: 30_000,
    },
});
