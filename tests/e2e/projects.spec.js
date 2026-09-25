const { test, expect } = require('@playwright/test');
const AxeBuilder = require('@axe-core/playwright').default;

/**
 * The Projects panel is the one place on the site that hands a visitor
 * something to run: an installer for PromptFixer, an npm package for
 * Elastishot. What makes that safe to accept - a versioned URL on a host they
 * can inspect, a checksum to compare, a plain statement of what the file is
 * and is not - is all content, and content drifts. These tests pin it for
 * every card, and pin every copy of the version, file name and digest to
 * each other so a rebuild cannot leave one of them stale.
 */

const ACTIVE = /(?:^|\s)active(?:\s|$)/;
const SHA256 = /^[0-9A-F]{64}$/i;

// One entry per card, in the order the cards appear. `asset` captures the
// version from the primary link; `sums` is where the checksum file must be.
const PROJECTS = [
    {
        name: 'PromptFixer',
        repo: 'https://github.com/Osman19702/PromptFixer',
        stack: ['Electron', 'React', 'TypeScript', 'Playwright'],
        asset: /^https:\/\/github\.com\/Osman19702\/PromptFixer\/releases\/download\/v(\d+\.\d+\.\d+)\/(PromptFixer-(\d+\.\d+\.\d+)-win-x64\.exe)$/,
        sums: (href) => href.replace(/\/[^/]+$/, '/SHA256SUMS.txt'),
        verifyMentions: (file) => file,
        note: [/not code-signed|unsigned/i, /SmartScreen/, /Run anyway/],
    },
    {
        name: 'Elastishot',
        repo: 'https://github.com/Osman19702/elastishot',
        stack: ['TypeScript', 'Node.js', 'Playwright'],
        asset: /^https:\/\/www\.npmjs\.com\/package\/elastishot$/,
        sums: () => null,
        sumsPattern: /^https:\/\/github\.com\/Osman19702\/elastishot\/releases\/download\/v(\d+\.\d+\.\d+)\/SHA256SUMS$/,
        verifyMentions: () => 'elastishot@',
        note: [/npm install -D elastishot/, /provenance/],
    },
];

async function openProjects(page) {
    await page.goto('/');
    await page.locator('.control[data-id="projects"]').click();
    await expect(page.locator('#projects')).toHaveAttribute('class', ACTIVE);
}

const cardOf = (page, i) => page.locator('#projects .project-card').nth(i);

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

    test('there is one card per project, in order', async ({ page }) => {
        await openProjects(page);
        await expect(page.locator('#projects .project-card')).toHaveCount(PROJECTS.length);
        await expect(page.locator('#projects .project-card h3')).toHaveText(PROJECTS.map((p) => p.name));
    });

    test('every icon on the panel and its tab resolves to a sprite symbol', async ({ page }) => {
        await openProjects(page);
        const missing = await page.locator('#projects use, #tab-projects use').evaluateAll((uses) =>
            uses.map((u) => u.getAttribute('href')).filter((id) => !document.querySelector(`symbol${id}`))
        );
        expect(missing, 'a <use> without a symbol renders nothing, silently').toEqual([]);
    });

    for (const [i, project] of PROJECTS.entries()) {
        test.describe(project.name, () => {
            test('names the project and the stack it is built on', async ({ page }) => {
                await openProjects(page);
                const card = cardOf(page, i);
                await expect(card.locator('h3')).toHaveText(project.name);
                const chips = await card.locator('.project-stack span').allTextContents();
                for (const tool of project.stack) {
                    expect(chips, `stack should list ${tool}`).toContain(tool);
                }
            });

            test('the primary link is versioned or canonical, and opens safely', async ({ page }) => {
                await openProjects(page);
                const link = cardOf(page, i).locator('a.project-btn');
                await expect(link).toHaveCount(1);
                await expect(link).toBeVisible();
                expect(await link.getAttribute('href')).toMatch(project.asset);
                await expect(link).toHaveAttribute('target', '_blank');
                await expect(link).toHaveAttribute('rel', /\bnoopener\b/);
                await expect(link).toHaveAttribute('rel', /\bnoreferrer\b/);
            });

            test('every copy of the version agrees: tag, file name, version shown, verify command', async ({ page }) => {
                await openProjects(page);
                const card = cardOf(page, i);
                const href = await card.locator('a.project-btn').getAttribute('href');
                const shown = (await card.locator('.project-version').textContent()).trim();
                expect(shown).toMatch(/^\d+\.\d+\.\d+$/);
                const m = href.match(project.asset);
                if (m && m[1]) {
                    expect(m[3], 'tag and file name disagree').toBe(m[1]);
                    expect(shown).toBe(m[1]);
                }
                await expect(card.locator('.project-verify')).toContainText(project.verifyMentions(m && m[2]) + (m && m[2] ? '' : shown));
            });

            test('the SHA-256 is shown in full, labelled, as 64 hex characters', async ({ page }) => {
                await openProjects(page);
                const card = cardOf(page, i);
                await expect(card.locator('.project-hash-label')).toHaveText(/SHA-256/);
                const shown = (await card.locator('.project-hash code').textContent()).trim();
                expect(shown).toMatch(SHA256);
            });

            test('the checksum file lives in the release the version points at', async ({ page }) => {
                await openProjects(page);
                const card = cardOf(page, i);
                const sums = card.locator('a[href*="SHA256SUMS"]');
                await expect(sums).toHaveCount(1);
                const href = await sums.getAttribute('href');
                const primary = await card.locator('a.project-btn').getAttribute('href');
                const expected = project.sums(primary);
                if (expected) expect(href).toBe(expected);
                else {
                    expect(href).toMatch(project.sumsPattern);
                    const version = (await card.locator('.project-version').textContent()).trim();
                    expect(href.match(project.sumsPattern)[1], 'checksums belong to another version').toBe(version);
                }
                await expect(sums).toHaveAttribute('target', '_blank');
                await expect(sums).toHaveAttribute('rel', /\bnoopener\b/);
            });

            test('the source link points at the repository the release belongs to', async ({ page }) => {
                await openProjects(page);
                const source = cardOf(page, i).locator(`a[href="${project.repo}"]`);
                await expect(source).toHaveCount(1);
                await expect(source).toHaveAttribute('target', '_blank');
                await expect(source).toHaveAttribute('rel', /\bnoreferrer\b/);
            });

            test('the note says in plain words what the visitor is getting, and describes the link', async ({ page }) => {
                await openProjects(page);
                const card = cardOf(page, i);
                const note = card.locator('.project-note');
                await expect(note).toBeVisible();
                for (const pattern of project.note) await expect(note).toContainText(pattern);
                const describedBy = await card.locator('a.project-btn').getAttribute('aria-describedby');
                expect(describedBy).toBeTruthy();
                await expect(page.locator(`#${describedBy}`)).toHaveCount(1);
                await expect(note).toHaveAttribute('id', describedBy);
            });

            test('the screenshot is a real PNG with alt text and dimensions', async ({ page, request }) => {
                await openProjects(page);
                const img = cardOf(page, i).locator('.project-media img');
                await expect(img).toHaveCount(1);
                expect(((await img.getAttribute('alt')) || '').trim().length).toBeGreaterThan(20);
                expect(await img.getAttribute('width')).toBeTruthy();
                expect(await img.getAttribute('height')).toBeTruthy();
                const response = await request.get(new URL(await img.getAttribute('src'), page.url()).toString());
                expect(response.status()).toBe(200);
                expect(response.headers()['content-type']).toContain('image/png');
                await img.scrollIntoViewIfNeeded();
                await expect.poll(() => img.evaluate((el) => el.complete && el.naturalWidth > 0)).toBe(true);
            });

            // responsive.spec.js only measures the panel that is visible on load,
            // so the digest and the command - the two things here with no natural
            // break opportunity - need their own check at the narrowest tested width.
            test('the install block fits a 360px viewport without clipping', async ({ page }) => {
                await page.setViewportSize({ width: 360, height: 800 });
                await openProjects(page);
                const card = cardOf(page, i);
                await card.scrollIntoViewIfNeeded();
                const doc = await page.evaluate(() => ({
                    scroll: document.documentElement.scrollWidth,
                    client: document.documentElement.clientWidth,
                }));
                expect(doc.scroll, 'panel scrolls sideways').toBeLessThanOrEqual(doc.client + 1);
                for (const selector of ['.project-hash code', '.project-verify', 'a.project-btn', '.project-note']) {
                    const box = await card.locator(selector).boundingBox();
                    expect(box, selector).not.toBeNull();
                    expect(Math.ceil(box.x + box.width), `${selector} overflows`).toBeLessThanOrEqual(361);
                }
                const clipped = await card.locator('.project-hash code, .project-verify, .project-command')
                    .evaluateAll((els) => els.filter((el) => el.scrollWidth > el.clientWidth + 1).map((el) => el.className));
                expect(clipped, 'hash or command hidden behind its own edge').toEqual([]);
            });
        });
    }
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
