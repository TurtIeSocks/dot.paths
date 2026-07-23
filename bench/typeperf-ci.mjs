#!/usr/bin/env node

/**
 * CI type-perf gate: compares deterministic `tsc --extendedDiagnostics`
 * counters (Types, Instantiations) for the live impl against the frozen
 * original (`bench/orig-impl.ts`), one compile each per scenario — no
 * rounds, no timing. Only Types and Instantiations are deterministic across
 * runs; noisy metrics (Check time, Total time, Memory used) are not
 * measured here.
 *
 * For each scenario, computes the new/orig ratio for each counter and
 * compares it against the checked-in threshold in
 * `bench/typeperf-thresholds.json`. Exits 1 if any ratio exceeds its
 * threshold, so a change that quietly balloons instantiation count (even
 * while keeping resolved types equivalent) fails CI instead of merging
 * green.
 *
 * This script intentionally duplicates `run()`/`ensureFixtures()` from
 * `bench/typeperf-ab.mjs` rather than importing them — the two harnesses
 * stay decoupled (see plan 002 maintenance notes).
 *
 * Usage:
 *   node bench/typeperf-ci.mjs
 */

import { execFileSync } from 'node:child_process';
import { existsSync, readFileSync, unlinkSync, writeFileSync } from 'node:fs';
import { dirname, resolve } from 'node:path';
import { fileURLToPath } from 'node:url';

const __dirname = dirname(fileURLToPath(import.meta.url));
const ROOT = resolve(__dirname, '..');
const TSC = resolve(ROOT, 'node_modules', '.bin', 'tsc');
const TMP = resolve(ROOT, '.typeperf-ci.tmp.tsconfig.json');
const FIXTURES = resolve(ROOT, 'bench', 'fixtures.ts');
const THRESHOLDS_PATH = resolve(ROOT, 'bench', 'typeperf-thresholds.json');

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

const COUNTERS = ['Types', 'Instantiations'];

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
    for (const k of COUNTERS) {
      if (line.startsWith(`${k}:`)) m[k] = line.slice(k.length + 1).trim();
    }
  }
  return { m, raw: out };
}

const num = (s) => Number.parseFloat(String(s).replace(/[^\d.]/g, ''));

const thresholds = JSON.parse(readFileSync(THRESHOLDS_PATH, 'utf8'));

ensureFixtures();
console.log('Type-perf CI gate — new/orig counter ratios vs frozen original\n');

const W = { scenario: 10, metric: 16, ratio: 8, threshold: 10, status: 6 };
const hr = () =>
  console.log(
    '─'.repeat(
      W.scenario + W.metric + W.ratio + W.threshold + W.status + 10
    )
  );

console.log(
  `${'Scenario'.padEnd(W.scenario)}  ${'Metric'.padEnd(W.metric)}  ` +
    `${'Ratio'.padStart(W.ratio)}  ${'Threshold'.padStart(W.threshold)}  ${'Status'.padEnd(W.status)}`
);
hr();

let anyFail = false;

try {
  for (const p of PAIRS) {
    const scenarioThresholds = thresholds[p.name];
    if (!scenarioThresholds) {
      console.error(`No thresholds configured for scenario "${p.name}" — see bench/typeperf-thresholds.json`);
      process.exit(2);
    }

    const { m: newCounts, raw: newRaw } = run(p.neu);
    const { m: origCounts, raw: origRaw } = run(p.orig);

    for (const c of COUNTERS) {
      const nv = newCounts[c];
      const ov = origCounts[c];
      if (nv === undefined || ov === undefined) {
        console.error(`\nFailed to parse "${c}:" from tsc --extendedDiagnostics output for scenario "${p.name}".`);
        console.error(`\n--- new (${p.neu}) raw output ---\n${newRaw}`);
        console.error(`\n--- orig (${p.orig}) raw output ---\n${origRaw}`);
        process.exit(2);
      }

      const ratio = num(nv) / num(ov);
      const threshold = scenarioThresholds[c];
      const pass = ratio <= threshold;
      if (!pass) anyFail = true;

      console.log(
        `${p.name.padEnd(W.scenario)}  ${c.padEnd(W.metric)}  ` +
          `${ratio.toFixed(4).padStart(W.ratio)}  ${String(threshold).padStart(W.threshold)}  ` +
          `${pass ? 'PASS' : 'FAIL'}`
      );
    }
  }
} finally {
  if (existsSync(TMP)) unlinkSync(TMP);
}

hr();
console.log();

if (anyFail) {
  console.error('Type-perf gate FAILED — a counter ratio exceeded its threshold.');
  console.error('See bench/typeperf-thresholds.json to review/update budgets, or bench/typeperf-ab.mjs for full diagnostics.');
  process.exit(1);
}

console.log('Type-perf gate passed — all ratios within threshold.');
