#!/usr/bin/env node

/**
 * A/B type-perf comparison: optimized impl vs the frozen original, measured
 * BACK-TO-BACK in the same process so the noisy `Check time` / `Total time`
 * metrics are compared under the same machine state.
 *
 * For each scenario pair we run N interleaved rounds — order alternates each
 * round (even rounds NEW→ORIG, odd rounds ORIG→NEW) so neither side is always
 * the "warmer" second process — and report the MEDIAN of the per-round ratios
 * (new/orig). A ratio < 1.0 means the optimized impl is faster. Deterministic
 * counters (Types / Instantiations / Memory) are reported once.
 *
 * Usage:
 *   node scripts/typeperf-ab.mjs                 (5 rounds, all pairs)
 *   node scripts/typeperf-ab.mjs --rounds 9
 *   node scripts/typeperf-ab.mjs --only get
 */

import { execFileSync } from 'node:child_process';
import { existsSync, unlinkSync, writeFileSync } from 'node:fs';
import { dirname, resolve } from 'node:path';
import { fileURLToPath } from 'node:url';

const __dirname = dirname(fileURLToPath(import.meta.url));
const ROOT = resolve(__dirname, '..');
const TSC = resolve(ROOT, 'node_modules', '.bin', 'tsc');
const TMP = resolve(ROOT, '.typeperf-ab.tmp.tsconfig.json');
const FIXTURES = resolve(ROOT, 'bench', 'fixtures.ts');

/** Generate the benchmark fixtures on demand if they don't exist yet. */
function ensureFixtures() {
  if (existsSync(FIXTURES)) return;
  console.log('Benchmark fixtures missing — generating (bench/gen-fixtures.mjs)…');
  execFileSync('node', [resolve(__dirname, 'gen-fixtures.mjs')], {
    stdio: 'inherit',
    cwd: ROOT,
  });
}

const PAIRS = [
  { name: 'paths', neu: 'paths.scenario.ts', orig: 'paths-orig.scenario.ts' },
  { name: 'get', neu: 'get.scenario.ts', orig: 'get-orig.scenario.ts' },
  {
    name: 'combined',
    neu: 'combined.scenario.ts',
    orig: 'combined-orig.scenario.ts',
  },
  {
    name: 'recursive',
    neu: 'recursive.scenario.ts',
    orig: 'recursive-orig.scenario.ts',
  },
];

const COUNTERS = ['Types', 'Instantiations', 'Memory used'];
const TIMERS = ['Check time', 'Total time'];

const args = process.argv.slice(2);
const roundsIdx = args.indexOf('--rounds');
const ROUNDS = roundsIdx !== -1 ? Math.max(1, Number(args[roundsIdx + 1])) : 5;
const onlyIdx = args.indexOf('--only');
const only = onlyIdx !== -1 ? args[onlyIdx + 1] : null;

function run(file) {
  writeFileSync(
    TMP,
    JSON.stringify({
      extends: './tsconfig.json',
      compilerOptions: { noEmit: true },
      files: [`bench/${file}`],
      include: [],
    })
  );
  let out;
  try {
    out = execFileSync(TSC, ['--noEmit', '--extendedDiagnostics', '-p', TMP], {
      encoding: 'utf8',
      cwd: ROOT,
    });
  } catch (err) {
    out = `${err.stdout ?? ''}\n${err.stderr ?? ''}`;
  }
  const m = {};
  for (const line of out.split('\n')) {
    for (const k of [...COUNTERS, ...TIMERS]) {
      if (line.startsWith(`${k}:`)) m[k] = line.slice(k.length + 1).trim();
    }
  }
  return m;
}

const num = (s) => Number.parseFloat(String(s).replace(/[^\d.]/g, ''));
const median = (xs) => {
  const s = [...xs].sort((a, b) => a - b);
  const mid = Math.floor(s.length / 2);
  return s.length % 2 ? s[mid] : (s[mid - 1] + s[mid]) / 2;
};
const fmtCount = (s) => {
  const n = num(s);
  return String(s).endsWith('K') ? `${n.toLocaleString()}K` : n.toLocaleString();
};

const pairs = only ? PAIRS.filter((p) => p.name === only) : PAIRS;

ensureFixtures();
console.log(
  `A/B type-perf — ${ROUNDS} interleaved rounds, median new/orig ratio (<1.0 = optimized faster)\n`
);

try {
  for (const p of pairs) {
    const ratios = { 'Check time': [], 'Total time': [] };
    let newCounts;
    let origCounts;
    for (let r = 0; r < ROUNDS; r++) {
      // Alternate order each round: even rounds NEW→ORIG, odd ORIG→NEW.
      // A fixed order lets the second process always run warmer (file cache,
      // CPU boost state) — a same-sign bias the median cannot cancel.
      let n;
      let o;
      if (r % 2 === 0) {
        n = run(p.neu);
        o = run(p.orig);
      } else {
        o = run(p.orig);
        n = run(p.neu);
      }
      if (r === 0) {
        newCounts = n;
        origCounts = o;
      }
      for (const t of TIMERS) {
        if (n[t] && o[t]) ratios[t].push(num(n[t]) / num(o[t]));
      }
    }

    console.log(`▸ ${p.name}`);
    for (const c of COUNTERS) {
      const nv = num(newCounts[c]);
      const ov = num(origCounts[c]);
      const pct = ov === 0 ? 0 : ((nv - ov) / ov) * 100;
      console.log(
        `    ${c.padEnd(15)} new ${fmtCount(newCounts[c]).padStart(12)}  ` +
          `orig ${fmtCount(origCounts[c]).padStart(12)}  ` +
          `${pct <= 0 ? '' : '+'}${pct.toFixed(1)}%`
      );
    }
    for (const t of TIMERS) {
      const med = median(ratios[t]);
      const pct = (med - 1) * 100;
      console.log(
        `    ${t.padEnd(15)} median ratio ${med.toFixed(3)}  ` +
          `(${pct <= 0 ? '' : '+'}${pct.toFixed(1)}%)  ` +
          `[${ratios[t].map((x) => x.toFixed(2)).join(' ')}]`
      );
    }
    console.log();
  }
} finally {
  if (existsSync(TMP)) unlinkSync(TMP);
}
