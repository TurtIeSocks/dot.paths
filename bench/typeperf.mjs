#!/usr/bin/env node

/**
 * Type-level performance benchmark for `Paths` and `Get`.
 *
 * Runs `tsc --extendedDiagnostics` against three isolated scenarios so each
 * utility's cost can be read independently:
 *
 *   paths     — `Paths<HugeType>` only.
 *   get       — `Get` mapped over large explicit path-literal unions only.
 *   combined  — round-trip `{ [P in Paths<T>]: Get<T, P> }` (realistic).
 *
 * Each scenario is compiled in its own temp tsconfig that includes ONLY that
 * scenario file (+ its imports). Each is run `--runs` times; the deterministic
 * counters (Types, Instantiations) are reported as-is, while the noisy timers
 * (Check time, Total time, Memory) are reported as the MIN across runs (the
 * least OS-contaminated sample).
 *
 * Usage:
 *   npm run typeperf                      Run all scenarios (compare to baseline)
 *   npm run typeperf -- --only get        Run a single scenario
 *   npm run typeperf -- --runs 5          Min over 5 runs (default 3)
 *   npm run typeperf -- --save            Save current results as baseline
 *   npm run typeperf -- --clear           Delete the saved baseline
 */

import { execFileSync } from 'node:child_process';
import { existsSync, readFileSync, unlinkSync, writeFileSync } from 'node:fs';
import { dirname, resolve } from 'node:path';
import { fileURLToPath } from 'node:url';

const __dirname = dirname(fileURLToPath(import.meta.url));
const ROOT = resolve(__dirname, '..');
const BASELINE_PATH = resolve(ROOT, '.typeperf-baseline.json');
const TSC = resolve(ROOT, 'node_modules', '.bin', 'tsc');
const TMP_CONFIG = resolve(ROOT, '.typeperf.tmp.tsconfig.json');
const FIXTURES = resolve(ROOT, 'bench', 'fixtures.ts');

// Timers/memory are only comparable within one environment — stamp the
// baseline with the node/TypeScript versions it was captured under so a
// silent toolchain change doesn't read as a phantom perf win/loss.
const TS_VERSION = JSON.parse(
  readFileSync(resolve(ROOT, 'node_modules', 'typescript', 'package.json'), 'utf8')
).version;
const ENV_STAMP = { node: process.version, typescript: TS_VERSION };

/** Generate the benchmark fixtures on demand if they don't exist yet. */
function ensureFixtures() {
  if (existsSync(FIXTURES)) return;
  console.log('Benchmark fixtures missing — generating (bench/gen-fixtures.mjs)…');
  execFileSync('node', [resolve(__dirname, 'gen-fixtures.mjs')], {
    stdio: 'inherit',
    cwd: ROOT,
  });
}

const SCENARIOS = [
  { name: 'paths', file: 'bench/paths.scenario.ts' },
  { name: 'get', file: 'bench/get.scenario.ts' },
  { name: 'combined', file: 'bench/combined.scenario.ts' },
  { name: 'recursive', file: 'bench/recursive.scenario.ts' },
  { name: 'getstrict', file: 'bench/getstrict.scenario.ts' },
];

// Deterministic counters first, then noisy timers/memory.
const COUNT_METRICS = ['Types', 'Instantiations'];
const TIME_METRICS = ['Memory used', 'Check time', 'Total time'];
const METRICS = [...COUNT_METRICS, ...TIME_METRICS];

// ── CLI ──────────────────────────────────────────────────
const args = process.argv.slice(2);
const wantSave = args.includes('--save');
const wantClear = args.includes('--clear');
const onlyIdx = args.indexOf('--only');
const only = onlyIdx !== -1 ? args[onlyIdx + 1] : null;
const runsIdx = args.indexOf('--runs');
const RUNS = runsIdx !== -1 ? Math.max(1, Number(args[runsIdx + 1])) : 3;

// ── Benchmark runner ─────────────────────────────────────

function runOnce(scenarioFile) {
  writeFileSync(
    TMP_CONFIG,
    `${JSON.stringify(
      {
        extends: './tsconfig.json',
        compilerOptions: { noEmit: true },
        files: [scenarioFile],
        include: [],
      },
      null,
      2
    )}\n`
  );

  let output;
  try {
    output = execFileSync(
      TSC,
      ['--noEmit', '--extendedDiagnostics', '-p', TMP_CONFIG],
      { encoding: 'utf8', cwd: ROOT }
    );
  } catch (err) {
    // tsc exits non-zero on type errors but still prints diagnostics.
    output = `${err.stdout ?? ''}\n${err.stderr ?? ''}`;
    const errors = (err.stderr ?? '').trim();
    if (errors) {
      console.error('\n⚠  tsc reported errors:\n');
      console.error(errors);
      console.error();
    }
  }

  const result = {};
  for (const line of output.split('\n')) {
    for (const metric of METRICS) {
      if (line.startsWith(`${metric}:`)) {
        result[metric] = line.slice(metric.length + 1).trim();
      }
    }
  }
  return result;
}

function parseNumeric(str) {
  return Number.parseFloat(String(str).replace(/[^\d.]/g, ''));
}

/** Run a scenario `RUNS` times; min the timers, assert-stable the counters. */
function benchScenario(scenarioFile) {
  const samples = [];
  for (let i = 0; i < RUNS; i++) samples.push(runOnce(scenarioFile));

  const merged = {};

  for (const m of COUNT_METRICS) {
    const vals = samples.map((s) => s[m]).filter(Boolean);
    merged[m] = vals[0];
    const allEqual = vals.every((v) => v === vals[0]);
    if (!allEqual) {
      console.error(
        `⚠  ${m} not deterministic across runs: ${vals.join(', ')}`
      );
    }
  }

  for (const m of TIME_METRICS) {
    const vals = samples.map((s) => s[m]).filter(Boolean);
    if (vals.length === 0) continue;
    // Keep the sample with the smallest numeric value (least noise).
    merged[m] = vals.reduce((best, v) =>
      parseNumeric(v) < parseNumeric(best) ? v : best
    );
  }

  return merged;
}

// ── Formatting ───────────────────────────────────────────

function fmtValue(str) {
  if (!str) return 'N/A';
  const n = parseNumeric(str);
  if (String(str).endsWith('s')) return `${n.toFixed(2)}s`;
  if (String(str).endsWith('K')) return `${n.toLocaleString('en-US')}K`;
  return n.toLocaleString('en-US');
}

function fmtChange(current, baseline) {
  const c = parseNumeric(current);
  const b = parseNumeric(baseline);
  if (!Number.isFinite(b) || b === 0) return 'N/A';
  const pct = ((c - b) / b) * 100;
  const sign = pct <= 0 ? '' : '+';
  return `${sign}${pct.toFixed(1)}%`;
}

function pad(str, width, align = 'right') {
  const s = String(str);
  return align === 'left' ? s.padEnd(width) : s.padStart(width);
}

function printTable(title, current, baseline) {
  const has = baseline != null;
  const W = { metric: 16, val: 14, pct: 12 };

  const hr = (l, m, r) => {
    let s = `${l}${'─'.repeat(W.metric + 2)}${m}${'─'.repeat(W.val + 2)}`;
    if (has) s += `${m}${'─'.repeat(W.val + 2)}${m}${'─'.repeat(W.pct + 2)}`;
    return `${s}${r}`;
  };
  const row = (metric, cur, base, change) => {
    let s = `│ ${pad(metric, W.metric, 'left')} │ ${pad(cur, W.val)} `;
    if (has) s += `│ ${pad(base ?? '', W.val)} │ ${pad(change ?? '', W.pct)} `;
    return `${s}│`;
  };

  console.log();
  console.log(`▸ ${title}`);
  console.log(hr('┌', '┬', '┐'));
  console.log(
    has ? row('Metric', 'Current', 'Baseline', 'Change') : row('Metric', 'Current')
  );
  console.log(hr('├', '┼', '┤'));
  for (const m of METRICS) {
    const c = fmtValue(current[m]);
    if (has && baseline[m]) {
      console.log(row(m, c, fmtValue(baseline[m]), fmtChange(current[m], baseline[m])));
    } else {
      console.log(row(m, c));
    }
  }
  console.log(hr('└', '┴', '┘'));
}

// ── Main ─────────────────────────────────────────────────

if (wantClear) {
  if (existsSync(BASELINE_PATH)) {
    unlinkSync(BASELINE_PATH);
    console.log('Baseline cleared.');
  } else {
    console.log('No baseline to clear.');
  }
  process.exit(0);
}

const scenarios = only ? SCENARIOS.filter((s) => s.name === only) : SCENARIOS;
if (scenarios.length === 0) {
  console.error(`Unknown scenario "${only}". Options: ${SCENARIOS.map((s) => s.name).join(', ')}`);
  process.exit(1);
}

ensureFixtures();
console.log(`Running type-level benchmark (${RUNS} run(s) each, min reported)…`);

const baseline = existsSync(BASELINE_PATH)
  ? JSON.parse(readFileSync(BASELINE_PATH, 'utf8'))
  : null;

if (baseline?._env && (baseline._env.node !== ENV_STAMP.node || baseline._env.typescript !== ENV_STAMP.typescript)) {
  console.log(
    `⚠ baseline saved on node ${baseline._env.node} / TS ${baseline._env.typescript}, ` +
      `current node ${ENV_STAMP.node} / TS ${ENV_STAMP.typescript} — timers and memory ` +
      'are not comparable across environments; counters are.'
  );
}

const results = {};
try {
  for (const s of scenarios) {
    results[s.name] = benchScenario(s.file);
    printTable(s.name, results[s.name], baseline?.[s.name] ?? null);
  }
} finally {
  if (existsSync(TMP_CONFIG)) unlinkSync(TMP_CONFIG);
}

console.log();

if (wantSave) {
  // Merge into any existing baseline so `--only` saves don't wipe others.
  const merged = { ...(baseline ?? {}), ...results, _env: ENV_STAMP };
  writeFileSync(BASELINE_PATH, `${JSON.stringify(merged, null, 2)}\n`);
  console.log(`Baseline saved → ${BASELINE_PATH}`);
} else if (!baseline) {
  console.log('Tip: run with --save to store these as the baseline.');
}
console.log();
