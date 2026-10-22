const { test, expect } = require('@playwright/test');
const { openPanel } = require('./helpers');

/**
 * The Projects panel is the one place on the site that hands a visitor
 * something to run: installers and disk images for PromptFixer, an npm
 * package for Elastishot. What makes that safe to accept - a versioned URL on
 * a host they can inspect, a checksum to compare, a plain statement of what
 * the file is and is not - is all content, and content drifts. These tests
 * pin it for every download button of every card, and pin every copy of the
 * version, file name and digest to each other so a rebuild cannot leave one
 * of them stale. Its accessibility is scanned, in both themes, with every
 * other panel's in accessibility.spec.js.
 */

const SHA256 = /^[0-9A-F]{64}$/i;

const PROMPTFIXER_ASSET = (file) =>
    new RegExp(`^https://github\\.com/Osman19702/PromptFixer/releases/download/v(\\d+\\.\\d+\\.\\d+)/(PromptFixer-(\\d+\\.\\d+\\.\\d+)-${file})$`);

const GATEKEEPER = [/not notarized/i, /Privacy & Security/, /Open Anyway/];

// One entry per card, in the order the cards appear. `downloads` is one entry
// per button, keyed by its data-download attribute, which also keys the hash
// shown for that file; `asset` captures the version from the link, and `note`
// is what the sentence the button is described by must say. `sums` is where
// the card's checksum file must be.
const PROJECTS = [
    {
        name: 'PromptFixer',
        repo: 'https://github.com/Osman19702/PromptFixer',
        stack: ['Electron', 'React', 'TypeScript', 'Playwright'],
        downloads: [
            { key: 'win-x64', asset: PROMPTFIXER_ASSET('win-x64\\.exe'), note: [/not code-signed|unsigned/i, /SmartScreen/, /Run anyway/] },
            { key: 'mac-arm64', asset: PROMPTFIXER_ASSET('mac-arm64\\.dmg'), note: GATEKEEPER },
            { key: 'mac-x64', asset: PROMPTFIXER_ASSET('mac-x64\\.dmg'), note: GATEKEEPER },
        ],
        sums: (href) => href.replace(/\/[^/]+$/, '/SHA256SUMS.txt'),
        verifyMentions: (file) => file,
    },
    {
        name: 'Elastishot',
        repo: 'https://github.com/Osman19702/elastishot',
        stack: ['TypeScript', 'Node.js', 'Playwright'],
        downloads: [
            { key: 'npm', asset: /^https:\/\/www\.npmjs\.com\/package\/elastishot$/, note: [/npm install -D elastishot/, /provenance/] },
        ],
        sums: () => null,
        sumsPattern: /^https:\/\/github\.com\/Osman19702\/elastishot\/releases\/download\/v(\d+\.\d+\.\d+)\/SHA256SUMS$/,
        verifyMentions: () => 'elastishot@',
    },
];

async function openProjects(page) {
    await page.goto('/');
    await openPanel(page, 'projects');
}

const cardOf = (page, i) => page.locator('#projects .project-card').nth(i);
const buttonOf = (card, download) => card.locator(`a.project-btn[data-download="${download.key}"]`);
const hashOf = (card, download) => card.locator(`.project-hash[data-download="${download.key}"]`);

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

            test('every download link is versioned or canonical, and opens safely', async ({ page }) => {
                await openProjects(page);
                const card = cardOf(page, i);
                // Exactly the buttons listed above: one more would be a download nothing here vouches for.
                await expect(card.locator('a.project-btn')).toHaveCount(project.downloads.length);
                for (const download of project.downloads) {
                    const link = buttonOf(card, download);
                    await expect(link, download.key).toHaveCount(1);
                    await expect(link).toBeVisible();
                    expect(await link.getAttribute('href'), download.key).toMatch(download.asset);
                    await expect(link).toHaveAttribute('target', '_blank');
                    await expect(link).toHaveAttribute('rel', /\bnoopener\b/);
                    await expect(link).toHaveAttribute('rel', /\bnoreferrer\b/);
                }
            });

            test('every copy of the version agrees: tag, file name, version shown, verify command', async ({ page }) => {
                await openProjects(page);
                const card = cardOf(page, i);
                const shown = (await card.locator('.project-version').textContent()).trim();
                expect(shown).toMatch(/^\d+\.\d+\.\d+$/);
                const verify = (await card.locator('.project-verify').allTextContents()).join('\n');
                for (const download of project.downloads) {
                    const href = await buttonOf(card, download).getAttribute('href');
                    const m = href.match(download.asset);
                    if (m && m[1]) {
                        expect(m[3], `${download.key}: tag and file name disagree`).toBe(m[1]);
                        expect(shown, `${download.key}: version shown`).toBe(m[1]);
                    }
                    const file = m && m[2];
                    expect(verify, `${download.key}: the verify command names the file`).toContain(project.verifyMentions(file) + (file ? '' : shown));
                }
            });

            test('the SHA-256 of every file is shown in full, labelled, as 64 hex characters', async ({ page }) => {
                await openProjects(page);
                const card = cardOf(page, i);
                await expect(card.locator('.project-hash')).toHaveCount(project.downloads.length);
                for (const download of project.downloads) {
                    const hash = hashOf(card, download);
                    await expect(hash, download.key).toHaveCount(1);
                    await expect(hash.locator('.project-hash-label')).toHaveText(/SHA-256/);
                    const shown = (await hash.locator('code').textContent()).trim();
                    expect(shown, download.key).toMatch(SHA256);
                }
                // Three files, three different digests: a copied line would pass every other check.
                const digests = await card.locator('.project-hash code').allTextContents();
                expect(new Set(digests.map((d) => d.trim().toLowerCase())).size).toBe(digests.length);
            });

            test('the checksum file lives in the release the version points at', async ({ page }) => {
                await openProjects(page);
                const card = cardOf(page, i);
                const sums = card.locator('a[href*="SHA256SUMS"]');
                await expect(sums).toHaveCount(1);
                const href = await sums.getAttribute('href');
                const primary = await buttonOf(card, project.downloads[0]).getAttribute('href');
                const expected = project.sums(primary);
                if (expected) {
                    expect(href).toBe(expected);
                    // Every file on the card is in the same release as its checksum file.
                    for (const download of project.downloads) {
                        const other = await buttonOf(card, download).getAttribute('href');
                        expect(project.sums(other), `${download.key} is in another release`).toBe(expected);
                    }
                } else {
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

            test('every button is described by a note that says in plain words what the visitor is getting', async ({ page }) => {
                await openProjects(page);
                const card = cardOf(page, i);
                for (const download of project.downloads) {
                    const describedBy = await buttonOf(card, download).getAttribute('aria-describedby');
                    expect(describedBy, download.key).toBeTruthy();
                    const note = page.locator(`#${describedBy}`);
                    await expect(note, download.key).toHaveCount(1);
                    await expect(note).toBeVisible();
                    await expect(note).toHaveClass(/\bproject-note\b/);
                    for (const pattern of download.note) await expect(note, download.key).toContainText(pattern);
                }
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

            // responsive.spec.js checks that every panel fits a 360px viewport.
            // The digests and the commands - the things here with no natural
            // break opportunity - also have to wrap inside their own boxes
            // rather than clip, which only a check on those boxes can see.
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
                    const boxes = await card.locator(selector).evaluateAll((els) =>
                        els.map((el) => {
                            const r = el.getBoundingClientRect();
                            return { x: r.x, width: r.width };
                        })
                    );
                    expect(boxes.length, selector).toBeGreaterThan(0);
                    for (const box of boxes) expect(Math.ceil(box.x + box.width), `${selector} overflows`).toBeLessThanOrEqual(361);
                }
                const clipped = await card.locator('.project-hash code, .project-verify, .project-command')
                    .evaluateAll((els) => els.filter((el) => el.scrollWidth > el.clientWidth + 1).map((el) => el.className));
                expect(clipped, 'hash or command hidden behind its own edge').toEqual([]);
            });
        });
    }
});
