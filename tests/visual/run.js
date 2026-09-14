#!/usr/bin/env node
/**
 * Visual regression with Elastishot: the working tree against a git ref, one
 * capture per section, theme and width (see elastishot.config.mjs).
 *
 *   node tests/visual/run.js                          # working tree vs master (what is deployed)
 *   node tests/visual/run.js --against v2026.09        # vs a tag, branch or commit
 *   node tests/visual/run.js --against origin/master   # what CI does on a pull request
 *
 * The ref is checked out into a temporary git worktree and served on its own
 * port; Elastishot approves that as the baseline, then compares the working
 * tree served on a second port. Both captures happen on the same machine in
 * the same run, so font rendering and Chromium version cancel out. Nothing
 * is written outside .elastishot/ (ignored by git).
 *
 * Exit codes follow Elastishot: 0 no differences, 1 differences found (open
 * .elastishot/runs/latest/index.html), 2 error. Zero dependencies beyond the
 * elastishot devDependency, like the rest of tests/.
 */
const { spawn, execFileSync } = require('child_process');
const fs = require('fs');
const http = require('http');
const os = require('os');
const path = require('path');

const ROOT = path.resolve(__dirname, '..', '..');
const CONFIG = path.join(ROOT, 'elastishot.config.mjs');
const BIN = path.join(path.dirname(require.resolve('elastishot/package.json')), 'bin', 'elastishot.js');
const PORT_BASE = 4175;
const PORT_HEAD = 4174;

const args = process.argv.slice(2);
const at = args.indexOf('--against');
const ref = at >= 0 && args[at + 1] ? args[at + 1] : 'master';

const git = (...a) => execFileSync('git', a, { cwd: ROOT, encoding: 'utf8' }).trim();

function serve(root, port) {
    const child = spawn(process.execPath, [path.join(ROOT, 'tests', 'static-server.js')], {
        env: { ...process.env, STATIC_ROOT: root, PORT: String(port) },
        stdio: 'ignore',
    });
    return { child, url: `http://127.0.0.1:${port}/` };
}

function waitForServer(url, timeoutMs = 15000) {
    const started = Date.now();
    return new Promise((resolve, reject) => {
        const attempt = () => {
            http.get(url, (res) => {
                res.resume();
                if (res.statusCode === 200) resolve();
                else retry();
            }).on('error', retry);
        };
        const retry = () => {
            if (Date.now() - started > timeoutMs) reject(new Error(`no server at ${url} after ${timeoutMs} ms`));
            else setTimeout(attempt, 200);
        };
        attempt();
    });
}

function elastishot(cliArgs, env) {
    return new Promise((resolve, reject) => {
        const child = spawn(process.execPath, [BIN, ...cliArgs], { cwd: ROOT, env: { ...process.env, ...env }, stdio: 'inherit' });
        child.on('error', reject);
        child.on('close', (code) => resolve(code ?? 1));
    });
}

/** A Markdown table for the GitHub job summary, from the run's report.json. */
function summarise(runDir) {
    const report = JSON.parse(fs.readFileSync(path.join(runDir, 'report.json'), 'utf8'));
    const rows = report.pairs.map((p) => {
        const s = p.summary;
        const score = s ? `${(s.similarity * 100).toFixed(1)}%` : '—';
        const counts = s ? `+${s.counts.added} −${s.counts.removed} ~${s.counts.changed} ›${s.counts.moved}` : '';
        const top = (p.locators?.changedLocators ?? []).filter((l) => l.evidence.includes('pixels')).slice(0, 3).map((l) => `\`${l.locator}\``).join(', ');
        return `| ${p.name} | ${p.viewport?.name ?? ''} | ${p.status} | ${score} | ${counts} | ${top} |`;
    });
    return [
        `### Visual check against \`${ref}\``,
        '',
        `${report.totals.passed} passed, ${report.totals.failed} with differences, ${report.totals.errors} errors. Full report in the \`elastishot-report\` artifact.`,
        '',
        '| Section | Viewport | Result | Similarity | Regions | Elements |',
        '|---|---|---|---|---|---|',
        ...rows,
        '',
    ].join('\n');
}

(async () => {
    const sha = git('rev-parse', '--short', ref);
    const worktree = fs.mkdtempSync(path.join(os.tmpdir(), 'portfolio-baseline-'));
    fs.rmSync(worktree, { recursive: true, force: true });
    git('worktree', 'add', '--detach', worktree, ref);
    const baselines = path.join(ROOT, '.elastishot', 'baselines', ref.replace(/[^\w.-]+/g, '_'));
    fs.rmSync(baselines, { recursive: true, force: true });
    const base = serve(worktree, PORT_BASE);
    const head = serve(ROOT, PORT_HEAD);
    try {
        await waitForServer(base.url);
        await waitForServer(head.url);
        console.log(`\n== baseline: ${ref} (${sha}) served from ${worktree}`);
        const approved = await elastishot(['run', '--config', CONFIG, '--update'], { VISUAL_PORT: String(PORT_BASE), VISUAL_BASELINES: baselines });
        // A section that does not exist yet on the reference (a new tab) is an
        // error on this side and a "new" pair on the next; only a reference
        // that captured nothing at all is a failure.
        if (!fs.existsSync(baselines) || fs.readdirSync(baselines).length === 0) {
            console.error(`baseline capture produced nothing (exit ${approved})`);
            process.exitCode = 2;
            return;
        }
        if (approved !== 0) console.warn(`some sections could not be captured on ${ref}; they will show as new`);
        console.log(`\n== candidate: working tree (${git('rev-parse', '--short', 'HEAD')}${git('status', '--porcelain') ? ', uncommitted changes' : ''})`);
        const code = await elastishot(['run', '--config', CONFIG, '--junit'], { VISUAL_PORT: String(PORT_HEAD), VISUAL_BASELINES: baselines });
        const latest = fs.readFileSync(path.join(ROOT, '.elastishot', 'runs', 'latest'), 'utf8').trim();
        console.log(`\nreport: ${path.join(latest, 'index.html')}`);
        if (process.env.GITHUB_STEP_SUMMARY) fs.appendFileSync(process.env.GITHUB_STEP_SUMMARY, summarise(latest));
        process.exitCode = code;
    } finally {
        base.child.kill();
        head.child.kill();
        try {
            git('worktree', 'remove', '--force', worktree);
        } catch {
            /* the worktree is in the OS temp folder either way */
        }
    }
})().catch((error) => {
    console.error(error.message);
    process.exitCode = 2;
});
