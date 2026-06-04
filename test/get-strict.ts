/**
 * Tests for `GetStrict` — the strict-`P` wrapper.
 *
 * `GetStrict<T, P extends Paths<T>>` must:
 *   (a) resolve valid paths identically to `Get`, and
 *   (b) REJECT invalid paths at compile time (the DX it exists for).
 *
 * Pure type-level — validated by `tsc` (`pnpm test`). The negative cases use
 * `@ts-expect-error`: if a "bad" path ever stops erroring, its directive becomes
 * unused and this file fails to compile. dot.paths is type-only, so the
 * type-check IS the test.
 */
import type { Get, GetStrict } from '../src/index';

type Equal<A, B> =
  (<T>() => T extends A ? 1 : 2) extends <T>() => T extends B ? 1 : 2
    ? true
    : false;
type Expect<T extends true> = T;

interface Shape {
  user: { name: string; age: number; tags: string[] };
  items: { id: number; title: string }[];
  flag: boolean;
  meta: { nested: { deep: string } | null };
}

// ── Positive: resolves valid paths, identically to `Get` ──────────────────
type _Resolves = [
  Expect<Equal<GetStrict<Shape, 'user'>, Shape['user']>>,
  Expect<Equal<GetStrict<Shape, 'user.name'>, string>>,
  Expect<Equal<GetStrict<Shape, 'user.age'>, number>>,
  Expect<Equal<GetStrict<Shape, 'user.tags'>, string[]>>,
  Expect<Equal<GetStrict<Shape, 'flag'>, boolean>>,
  Expect<Equal<GetStrict<Shape, 'items'>, Shape['items']>>,
  Expect<
    Equal<GetStrict<Shape, `items.${number}`>, { id: number; title: string }>
  >,
  Expect<Equal<GetStrict<Shape, `items.${number}.id`>, number>>,
  Expect<Equal<GetStrict<Shape, 'meta.nested'>, { deep: string } | null>>,
  // delegates to `Get` → identical resolution for every valid path
  Expect<Equal<GetStrict<Shape, 'user.name'>, Get<Shape, 'user.name'>>>,
  Expect<
    Equal<
      GetStrict<Shape, `items.${number}.title`>,
      Get<Shape, `items.${number}.title`>
    >
  >,
];

// ── Negative: invalid paths are a compile error (must each error) ─────────
// @ts-expect-error top-level typo
type _N1 = GetStrict<Shape, 'usr'>;
// @ts-expect-error nested typo
type _N2 = GetStrict<Shape, 'user.nam'>;
// @ts-expect-error descends into a primitive (string is a leaf)
type _N3 = GetStrict<Shape, 'user.name.length'>;
// @ts-expect-error descends into a boolean
type _N4 = GetStrict<Shape, 'flag.x'>;
// @ts-expect-error wrong sub-key of an array element
type _N5 = GetStrict<Shape, `items.${number}.nope`>;
// @ts-expect-error array indexed by a non-numeric segment
type _N6 = GetStrict<Shape, 'items.first'>;
// @ts-expect-error empty path
type _N7 = GetStrict<Shape, ''>;
// @ts-expect-error wide `string` is not a concrete path
type _N8 = GetStrict<Shape, string>;

// ── Depth interaction: GetStrict constrains via Paths<T> at DEFAULT depth 8 ──
interface Deep {
  a: { b: { c: { d: { e: { f: { g: { h: { i: string } } } } } } } };
}
type _DepthChecks = [
  // the depth-8 path is valid and resolves to the object at that level
  Expect<Equal<GetStrict<Deep, 'a.b.c.d.e.f.g.h'>, { i: string }>>,
  // loose `Get` has no depth cap — it resolves the 9-segment path fine
  Expect<Equal<Get<Deep, 'a.b.c.d.e.f.g.h.i'>, string>>,
];
// @ts-expect-error 9 segments exceeds the default depth cap (8), so it's not a
// member of Paths<Deep> and GetStrict rejects it
type _DeepTooDeep = GetStrict<Deep, 'a.b.c.d.e.f.g.h.i'>;

// Force `tsc` to resolve the positive tuples (negatives self-check above).
export const _resolves = undefined as unknown as _Resolves;
export const _depth = undefined as unknown as _DepthChecks;
