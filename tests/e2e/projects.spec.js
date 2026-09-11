const { test, expect } = require('@playwright/test');
const AxeBuilder = require('@axe-core/playwright').default;

/**
 * The Projects panel is the one place on the site that hands a visitor an
 * executable. What makes that safe to accept - a versioned URL on a host they
 * can inspect, a checksum to compare, a plain statement that the file is
 * unsigned - is all content, and content drifts. These tests pin it, and pin
 * every copy of the version, file name and digest to each other so a rebuild
 * cannot leave one of them stale.
 */

const ACTIVE = /(?:^|\s)active(?:\s|$)/;
const REPO = 'https://github.com/Osman19702/PromptFixer';
const ASSET = /^https:\/\/github\.com\/Osman19702\/PromptFixer\/releases\/download\/v(\d+\.\d+\.\d+)\/(PromptFixer-(\d+\.\d+\.\d+)-win-x64\.exe)$/;
const SHA256 = /^[0-9A-F]{64}$/i;

async function openProjects(page) {
    await page.goto('/');
    await page.locator('.control[data-id="projects"]').click();
    await expect(page.locator('#projects')).toHaveAttribute('class', ACTIVE);
}

async function blocking(page) {
    const results = await new AxeBuilder({ page })
        .withTags(['wcag2a', 'wcag2aa', 'wcag21a', 'wcag21aa'])
        .analyze();
    return results.violations
        .filter((v) => ['critical', 'serious'].includes(v.impact))
        .map((v) => ({
            id: v.id,
            impact: v.impact,
            help: v.help,
            nodes: v.nodes.length,
            example: v.nodes[0] && v.nodes[0].html.slice(0, 120),
        }));
}

test.describe('Projects panel', () => {
    test('the projects tab reveals the panel and nothing else', async ({ page }) => {
        await openProjects(page);
        await expect(page.locator('.container.active')).toHaveCount(1);
        await expect(page.locator('.control[data-id="projects"]')).toHaveAttribute('aria-selected', 'true');
    });

    test('the heading reads "My Projects" without its watermark', async ({ page }) => {
        await openProjects(page);
        const snapshot = await page.locator('#projects .main-title h2').ariaSnapshot();
        expect(snapshot).toContain('heading "My Projects"');
    });

    test('the card names PromptFixer and the stack it is built on', async ({ page }) => {
        await openProjects(page);
        const card = page.locator('#projects .project-card').first();
        await expect(card.locator('h3')).toHaveText('PromptFixer');
        const chips = await card.locator('.project-stack span').allTextContents();
        for (const tool of ['Electron', 'React', 'TypeScript', 'Playwright']) {
            expect(chips, `stack should list ${tool}`).toContain(tool);
        }
    });

    test('the download link is a versioned GitHub release asset that opens safely', async ({ page }) => {
        await openProjects(page);
        const link = page.locator('#projects a.project-btn');
        await expect(link).toHaveCount(1);
        await expect(link).toBeVisible();
        expect(await link.getAttribute('href')).toMatch(ASSET);
        await expect(link).toHaveAttribute('target', '_blank');
        await expect(link).toHaveAttribute('rel', /\bnoopener\b/);
        await expect(link).toHaveAttribute('rel', /\bnoreferrer\b/);
    });

    test('every copy of the version agrees: tag, file name, version shown, verify command', async ({ page }) => {
        await openProjects(page);
        const href = await page.locator('#projects a.project-btn').getAttribute('href');
        const [, tag, file, fileVersion] = href.match(ASSET);
        expect(fileVersion, 'tag and file name disagree').toBe(tag);
        await expect(page.locator('#projects .project-version')).toHaveText(tag);
        await expect(page.locator('#projects .project-verify')).toContainText(file);
    });

    test('the SHA-256 is shown in full, labelled, as 64 hex characters', async ({ page }) => {
        await openProjects(page);
        await expect(page.locator('#projects .project-hash-label')).toHaveText(/SHA-256/);
        const shown = (await page.locator('#projects .project-hash code').textContent()).trim();
        expect(shown).toMatch(SHA256);
    });

    test('every copy of the hash agrees', async ({ page }) => {
        await openProjects(page);
        const vt = page.locator('#projects a[href*="virustotal.com/gui/file/"]');
        test.skip((await vt.count()) === 0, 'no VirusTotal link on the card');
        const shown = (await page.locator('#projects .project-hash code').textContent()).trim().toLowerCase();
        expect((await vt.getAttribute('href')).toLowerCase()).toContain(`/gui/file/${shown}`);
    });

    test('the checksum file lives in the same release as the installer', async ({ page }) => {
        await openProjects(page);
        const installer = await page.locator('#projects a.project-btn').getAttribute('href');
        const sums = page.locator('#projects a[href$="/SHA256SUMS.txt"]');
        await expect(sums).toHaveCount(1);
        await expect(sums).toHaveAttribute('href', installer.replace(/\/[^/]+$/, '/SHA256SUMS.txt'));
        await expect(sums).toHaveAttribute('target', '_blank');
        await expect(sums).toHaveAttribute('rel', /\bnoopener\b/);
    });

    test('the source link points at the repository the release belongs to', async ({ page }) => {
        await openProjects(page);
        const source = page.locator(`#projects a[href="${REPO}"]`);
        await expect(source).toHaveCount(1);
        await expect(source).toHaveAttribute('target', '_blank');
        await expect(source).toHaveAttribute('rel', /\bnoreferrer\b/);
    });

    test('the unsigned-installer warning is stated in plain words and describes the link', async ({ page }) => {
        await openProjects(page);
        const note = page.locator('#projects .project-note');
        await expect(note).toBeVisible();
        await expect(note).toContainText(/not code-signed|unsigned/i);
        await expect(note).toContainText(/SmartScreen/);
        await expect(note).toContainText(/Run anyway/);
        const describedBy = await page.locator('#projects a.project-btn').getAttribute('aria-describedby');
        expect(describedBy).toBeTruthy();
        await expect(page.locator(`#${describedBy}`)).toHaveCount(1);
    });

    test('every icon on the panel and its tab resolves to a sprite symbol', async ({ page }) => {
        await openProjects(page);
        const missing = await page.locator('#projects use, #tab-projects use').evaluateAll((uses) =>
            uses.map((u) => u.getAttribute('href')).filter((id) => !document.querySelector(`symbol${id}`))
        );
        expect(missing, 'a <use> without a symbol renders nothing, silently').toEqual([]);
    });

    test('the screenshot, when shipped, is a real PNG with alt text and dimensions', async ({ page, request }) => {
        await openProjects(page);
        const img = page.locator('#projects .project-media img');
        test.skip((await img.count()) === 0, 'no screenshot committed yet: add img/promptfixer.png and the <figure>');
        expect(((await img.getAttribute('alt')) || '').trim().length).toBeGreaterThan(20);
        expect(await img.getAttribute('width')).toBeTruthy();
        expect(await img.getAttribute('height')).toBeTruthy();
        const response = await request.get(new URL(await img.getAttribute('src'), page.url()).toString());
        expect(response.status()).toBe(200);
        expect(response.headers()['content-type']).toContain('image/png');
        await img.scrollIntoViewIfNeeded();
        await expect.poll(() => img.evaluate((el) => el.complete && el.naturalWidth > 0)).toBe(true);
    });

    // responsive.spec.js only measures the panel that is visible on load, so
    // the digest and the command - the two things here with no natural break
    // opportunity - need their own check at the narrowest tested width.
    test('the download block fits a 360px viewport without clipping', async ({ page }) => {
        await page.setViewportSize({ width: 360, height: 800 });
        await openProjects(page);
        const doc = await page.evaluate(() => ({
            scroll: document.documentElement.scrollWidth,
            client: document.documentElement.clientWidth,
        }));
        expect(doc.scroll, 'panel scrolls sideways').toBeLessThanOrEqual(doc.client + 1);
        for (const selector of ['.project-hash code', '.project-verify', 'a.project-btn', '.project-note']) {
            const box = await page.locator(`#projects ${selector}`).boundingBox();
            expect(box, selector).not.toBeNull();
            expect(Math.ceil(box.x + box.width), `${selector} overflows`).toBeLessThanOrEqual(361);
        }
        const clipped = await page.locator('#projects .project-hash code, #projects .project-verify')
            .evaluateAll((els) => els.filter((el) => el.scrollWidth > el.clientWidth + 1).map((el) => el.className));
        expect(clipped, 'hash or command hidden behind its own edge').toEqual([]);
    });
});

test.describe('Projects panel accessibility (axe-core)', () => {
    test('dark mode has no critical or serious violations', async ({ page }) => {
        await page.goto('/');
        await expect(page.locator('body')).toHaveCSS('background-color', 'rgb(25, 29, 43)');
        await page.locator('.control[data-id="projects"]').click();
        await expect(page.locator('#projects')).toHaveAttribute('class', ACTIVE);
        expect(await blocking(page)).toEqual([]);
    });

    test('light mode has no critical or serious violations', async ({ page }) => {
        await page.goto('/');
        await page.locator('.theme-btn').click();
        await expect(page.locator('html')).toHaveClass(/light-mode/);
        await expect(page.locator('body')).toHaveCSS('background-color', 'rgb(255, 255, 255)');
        await page.locator('.control[data-id="projects"]').click();
        await expect(page.locator('#projects')).toHaveAttribute('class', ACTIVE);
        expect(await blocking(page)).toEqual([]);
    });
});
