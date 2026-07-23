#!/usr/bin/env node

/**
 * Generates pathological TypeScript fixtures for benchmarking `Paths` and
 * `Get`. The goal is to produce enough type-instantiation volume that small
 * algorithmic changes to the utilities move the needle well above timing
 * noise.
 *
 * Output: bench/fixtures.ts
 *
 * Knobs (env or flags) let you scale the stress up/down:
 *   node bench/gen-fixtures.mjs --scale 2     (default)
 *   node bench/gen-fixtures.mjs --scale 4     (≈2× volume)
 *
 * The generated file exports:
 *   - Big interfaces of escalating shape (wide, deep, matrix, arrays, sink).
 *   - GET_PATHS_*: explicit string-literal path unions, so the Get benchmark
 *     is independent of Paths (no circular "use Paths to feed Get").
 *   - Includes paths that traverse arrays (numeric segments) to exercise the
 *     array-indexing branch of Get specifically.
 */

import { writeFileSync } from 'node:fs';
import { dirname, resolve } from 'node:path';
import { fileURLToPath } from 'node:url';

const __dirname = dirname(fileURLToPath(import.meta.url));
const OUT = resolve(__dirname, 'fixtures.ts');

// ── Scale knobs ──────────────────────────────────────────
const args = process.argv.slice(2);
const scaleIdx = args.indexOf('--scale');
const SCALE = scaleIdx !== -1 ? Number(args[scaleIdx + 1]) : 2;

// Matrix: WIDTH keys × INNER keys × leaf object. Dominates Paths width.
const WIDTH = Math.round(40 * SCALE);
const INNER = Math.round(20 * SCALE);
// Wide: flat-ish object with many small nested objects.
const WIDE = Math.round(60 * SCALE);
// ArrayHeavy: number of array-typed roots.
const ARRAYS = Math.round(20 * SCALE);

const pad = (n, w = 2) => String(n).padStart(w, '0');

// ── Matrix type ──────────────────────────────────────────
// { k00: { s00: { a; b; c }, ... }, ... }
function genMatrix() {
  let s = 'export interface Matrix {\n';
  for (let i = 0; i < WIDTH; i++) {
    s += `  k${pad(i)}: {\n`;
    for (let j = 0; j < INNER; j++) {
      s += `    s${pad(j)}: { a: string; b: number; c: boolean };\n`;
    }
    s += '  };\n';
  }
  s += '}\n';
  return s;
}

// Explicit leaf paths of Matrix: "k00.s00.a" etc.
function genMatrixPaths() {
  const paths = [];
  for (let i = 0; i < WIDTH; i++) {
    for (let j = 0; j < INNER; j++) {
      paths.push(`k${pad(i)}.s${pad(j)}.a`);
      paths.push(`k${pad(i)}.s${pad(j)}.b`);
      paths.push(`k${pad(i)}.s${pad(j)}.c`);
    }
  }
  return paths;
}

// ── Wide type ────────────────────────────────────────────
// { w000: { a; b }, ... } — width without much depth.
function genWide() {
  let s = 'export interface Wide {\n';
  for (let i = 0; i < WIDE; i++) {
    s += `  w${pad(i, 3)}: { a: string; b: number };\n`;
  }
  s += '}\n';
  return s;
}

function genWidePaths() {
  const paths = [];
  for (let i = 0; i < WIDE; i++) {
    paths.push(`w${pad(i, 3)}.a`);
    paths.push(`w${pad(i, 3)}.b`);
  }
  return paths;
}

// ── Deep type ────────────────────────────────────────────
// Nested chain to depth 8 (the recursion cap), with a sibling leaf at each
// level for a little width. Exercises max-depth recursion of both utilities.
function genDeep() {
  const DEPTH = 8;
  let inner = '{ leaf: string; sib: number }';
  for (let d = DEPTH - 1; d >= 0; d--) {
    inner = `{ d${d}: ${inner}; sib${d}: string }`;
  }
  return `export interface Deep ${inner}\n`;
}

function genDeepPaths() {
  // d0.d1...d7.leaf and each sibling along the way.
  const DEPTH = 8;
  const paths = [];
  let prefix = '';
  for (let d = 0; d < DEPTH; d++) {
    prefix += `d${d}.`;
    paths.push(`${prefix.slice(0, -1)}`); // the object itself
  }
  paths.push(`${prefix}leaf`);
  paths.push(`${prefix}sib`);
  return paths;
}

// ── ArrayHeavy type ──────────────────────────────────────
// { a00: Array<{ x: string; tags: string[]; nested: Array<{ y: number; z: string }> }>, ... }
function genArrayHeavy() {
  let s = 'export interface ArrayHeavy {\n';
  for (let i = 0; i < ARRAYS; i++) {
    s +=
      `  a${pad(i)}: Array<{ x: string; tags: string[]; ` +
      `nested: Array<{ y: number; z: string }> }>;\n`;
  }
  s += '}\n';
  return s;
}

// Paths that traverse arrays via numeric segments — exercises the
// array-index branch of Get (the `keyof Array` hotspot).
function genArrayPaths() {
  const paths = [];
  for (let i = 0; i < ARRAYS; i++) {
    const r = `a${pad(i)}`;
    paths.push(`${r}.0.x`);
    paths.push(`${r}.0.tags.0`);
    paths.push(`${r}.0.nested.0.y`);
    paths.push(`${r}.0.nested.0.z`);
    paths.push(`${r}.1.nested.2.y`);
  }
  return paths;
}

// ── Sink type ────────────────────────────────────────────
// Mixed bag: optionals, nullable unions, recursive tree/list, discriminated
// unions. Stresses NonNullable handling and union distribution.
function genSink() {
  return `export interface TreeNode {
  value: string;
  meta: { tag: string; weight: number };
  children: TreeNode[];
}

export interface LinkedList {
  data: number;
  label: string;
  next: LinkedList | null;
}

export interface Sink {
  tree: TreeNode;
  list: LinkedList;
  opt?: { nested?: { deep?: string } };
  nullable: { a: string } | null;
  union: { kind: 'a'; x: number } | { kind: 'b'; y: string };
  records: Record<string, { v: number }>;
  matrix: Matrix;
  arrays: ArrayHeavy;
}
`;
}

// ── Assemble ─────────────────────────────────────────────
function unionType(name, paths) {
  // Emit as a union of string literals, chunked for readability.
  const lits = paths.map((p) => `'${p}'`);
  return `export type ${name} =\n  | ${lits.join('\n  | ')};\n`;
}

const sections = [];
sections.push('// AUTO-GENERATED by scripts/gen-fixtures.mjs — do not edit by hand.');
sections.push(`// scale=${SCALE} width=${WIDTH} inner=${INNER} wide=${WIDE} arrays=${ARRAYS}`);
sections.push('/* biome-ignore-all lint: generated benchmark fixtures */');
sections.push('');
sections.push(genMatrix());
sections.push(genWide());
sections.push(genDeep());
sections.push(genArrayHeavy());
sections.push(genSink());

const matrixPaths = genMatrixPaths();
const widePaths = genWidePaths();
const deepPaths = genDeepPaths();
const arrayPaths = genArrayPaths();

sections.push(unionType('GET_PATHS_MATRIX', matrixPaths));
sections.push(unionType('GET_PATHS_WIDE', widePaths));
sections.push(unionType('GET_PATHS_DEEP', deepPaths));
sections.push(unionType('GET_PATHS_ARRAY', arrayPaths));

const totalPaths =
  matrixPaths.length + widePaths.length + deepPaths.length + arrayPaths.length;

writeFileSync(OUT, `${sections.join('\n')}\n`);

console.log(`Wrote ${OUT}`);
console.log(
  `  scale=${SCALE} → Matrix ${WIDTH}×${INNER}, Wide ${WIDE}, Arrays ${ARRAYS}`
);
console.log(
  `  explicit Get paths: matrix=${matrixPaths.length} wide=${widePaths.length} ` +
    `deep=${deepPaths.length} array=${arrayPaths.length} (total ${totalPaths})`
);
