/**
 * Repeatable Lighthouse measurement for the local build.
 *
 *   node tests/lighthouse.js [runs] [label] [root]
 *
 * Lighthouse is noisy, so this runs several times and reports the median of
 * each metric. Numbers are from a local static server: absolute values are
 * optimistic compared with GitHub Pages, but the before/after delta and the
 * transfer sizes are meaningful. `root` serves another tree (a checkout of
 * an older commit, say) instead of this one, for a before/after pair.
 */
const fs = require('fs');
const path = require('path');
const { serve } = require('./serve');

const RUNS = Number(process.argv[2]) || 5;
const LABEL = process.argv[3] || 'run';
const ROOT = process.argv[4] || '';
const PORT = 4187;

const median = (xs) => {
    const s = [...xs].sort((a, b) => a - b);
    const mid = Math.floor(s.length / 2);
    return s.length % 2 ? s[mid] : (s[mid - 1] + s[mid]) / 2;
};

async function main() {
    const lighthouse = (await import('lighthouse')).default;
    const chromeLauncher = await import('chrome-launcher');

    const site = serve(ROOT, PORT);
    const samples = [];
    let chrome;

    try {
        await site.ready;
        chrome = await chromeLauncher.launch({ chromeFlags: ['--headless=new'] });
        for (let i = 0; i < RUNS; i += 1) {
            const result = await lighthouse(site.url, {
                port: chrome.port,
                output: 'json',
                logLevel: 'error',
                onlyCategories: ['performance'],
            });
            const a = result.lhr.audits;
            samples.push({
                score: result.lhr.categories.performance.score * 100,
                LCP: a['largest-contentful-paint'].numericValue,
                CLS: a['cumulative-layout-shift'].numericValue,
                TBT: a['total-blocking-time'].numericValue,
                FCP: a['first-contentful-paint'].numericValue,
                SI: a['speed-index'].numericValue,
                bytes: a['total-byte-weight'].numericValue,
                requests: a['network-requests'].details.items.length,
            });
            process.stderr.write(`  run ${i + 1}/${RUNS} done\n`);
        }
    } finally {
        if (chrome) await chrome.kill();
        site.child.kill();
    }

    const keys = Object.keys(samples[0]);
    const result = { label: LABEL, runs: RUNS, when: new Date().toISOString() };
    keys.forEach((k) => { result[k] = Math.round(median(samples.map((s) => s[k])) * 100) / 100; });

    const out = path.join(__dirname, '..', `lighthouse-${LABEL}.json`);
    fs.writeFileSync(out, JSON.stringify({ median: result, samples }, null, 2));

    console.log(`\n=== ${LABEL} (median of ${RUNS}) ===`);
    console.log(`  performance score : ${result.score}`);
    console.log(`  LCP               : ${Math.round(result.LCP)} ms`);
    console.log(`  CLS               : ${result.CLS}`);
    console.log(`  TBT               : ${Math.round(result.TBT)} ms`);
    console.log(`  FCP               : ${Math.round(result.FCP)} ms`);
    console.log(`  Speed Index       : ${Math.round(result.SI)} ms`);
    console.log(`  total transfer    : ${(result.bytes / 1024).toFixed(1)} KiB`);
    console.log(`  requests          : ${result.requests}`);
    console.log(`\n  written to ${path.basename(out)}`);
}

main().catch((e) => { console.error(e); process.exit(1); });
