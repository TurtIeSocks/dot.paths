/**
 * Behavior-lock for `Paths` and `Get`.
 *
 * Holds a FROZEN copy of the original implementation (`PathsRef` / `GetRef`)
 * and asserts that the live implementation in ../src/index produces an
 * identical type for every shape that touches a distinct branch:
 * flat/nested objects, arrays (of primitives, of objects, nested, readonly),
 * tuples, optionals, nullable unions, discriminated unions, exotic leaves
 * (Date/Map/Set/function), index signatures, and self-referential recursion.
 *
 * If an optimization changes the produced type ANYWHERE, one of these asserts
 * stops compiling. This is the regression net that lets us refactor the
 * implementations aggressively.
 *
 * One deliberate semantic change is mirrored into the reference: numeric keys
 * (index signatures `Record<number, V>` and literal keys `{ 0: V }`) now
 * produce `${number}` / `'0'` paths and resolve through `Get`. Before that
 * both implementations silently dropped them. The exact results are asserted
 * in `test/numeric-index.ts`.
 */
import type { Get, Paths } from '../src/index';

// ── Frozen reference implementation (original) ───────────
type _LeafRef =
  | string
  | number
  | boolean
  | bigint
  | symbol
  | null
  | undefined
  | ((...args: never[]) => unknown)
  | Date
  | RegExp
  | Map<unknown, unknown>
  | Set<unknown>
  | Promise<unknown>;

type _JoinRef<H extends string, T> = [T] extends [never]
  ? never
  : `${H}.${T & string}`;

type PathsRef<T, _D extends 0[] = []> = _D['length'] extends 8
  ? never
  : T extends _LeafRef
    ? never
    : T extends readonly unknown[]
      ?
          | `${number}`
          | _JoinRef<`${number}`, PathsRef<NonNullable<T[number]>, [..._D, 0]>>
      : T extends object
        ?
            | {
                [K in keyof T & string]:
                  | K
                  | _JoinRef<K, PathsRef<NonNullable<T[K]>, [..._D, 0]>>;
              }[keyof T & string]
            | {
                [K in keyof T & number]:
                  | `${K}`
                  | _JoinRef<`${K}`, PathsRef<NonNullable<T[K]>, [..._D, 0]>>;
              }[keyof T & number]
        : never;

type GetRef<T, P extends string> = P extends `${infer H}.${infer R}`
  ? H extends keyof T
    ? GetRef<T[H], R>
    : _ToNumRef<H> extends keyof T
      ? GetRef<T[_ToNumRef<H>], R>
      : T extends readonly unknown[]
        ? GetRef<T[number], R>
        : never
  : P extends keyof T
    ? T[P]
    : _ToNumRef<P> extends keyof T
      ? T[_ToNumRef<P>]
      : T extends readonly unknown[]
        ? T[number]
        : never;
// A numeric segment becomes its number; anything else passes through unchanged so
// the `extends keyof T` test below simply fails again (never would pass it).
type _ToNumRef<S> = S extends `${infer N extends number}` ? N : S;

// ── Equality machinery ───────────────────────────────────
type Equal<A, B> =
  (<T>() => T extends A ? 1 : 2) extends <T>() => T extends B ? 1 : 2
    ? true
    : false;
type Expect<T extends true> = T;

// `Paths` and `Get` agree with the reference for shape `T`.
type PathsAgree<T> = Equal<Paths<T>, PathsRef<T>>;
// Round-trips every path back through `Get`, comparing the full key→value map.
type GetAgree<T> = Equal<
  { [P in Paths<T>]: Get<T, P> },
  { [P in PathsRef<T>]: GetRef<T, P> }
>;
type Agree<T> =
  PathsAgree<T> extends true
    ? GetAgree<T> extends true
      ? true
      : false
    : false;

// ── Shapes exercising every branch ───────────────────────
interface Flat {
  a: string;
  b: number;
  c: boolean;
}
interface Nested {
  x: { y: { z: string }; w: number };
  k: boolean;
}
interface WithArrays {
  prims: number[];
  objs: Array<{ id: number; name: string }>;
  nested: Array<Array<{ v: string }>>;
  readonlyArr: readonly string[];
  readonlyObjs: ReadonlyArray<{ q: number }>;
}
type Tuple = { t: [string, number, { a: boolean }] };
interface Optionals {
  req: string;
  opt?: { deep?: { leaf?: number } };
  maybe?: string;
}
interface Nullables {
  a: { x: string } | null;
  b: { y: number } | undefined;
  c: { z: boolean } | null | undefined;
}
type Discriminated = {
  u: { kind: 'a'; x: number } | { kind: 'b'; y: string };
};
interface ExoticLeaves {
  d: Date;
  r: RegExp;
  m: Map<string, number>;
  s: Set<number>;
  p: Promise<string>;
  fn: (a: number) => string;
  big: bigint;
  sym: symbol;
}
interface IndexSig {
  rec: Record<string, { v: number }>;
  numRec: Record<number, string>;
}
interface TreeNode {
  value: string;
  children: TreeNode[];
}
interface LinkedList {
  data: number;
  next: LinkedList | null;
}
interface MutualA {
  name: string;
  b: MutualB;
}
interface MutualB {
  id: number;
  a: MutualA;
}
interface Recursive {
  tree: TreeNode;
  list: LinkedList;
  mutual: MutualA;
}
interface DeepChain {
  l0: { l1: { l2: { l3: { l4: { l5: { l6: { l7: { l8: string } } } } } } } };
}

// Recursive union (JSON): recursion through an index signature + union.
type JsonValue = string | number | boolean | null | JsonObject | JsonArray;
interface JsonObject {
  [key: string]: JsonValue;
}
type JsonArray = JsonValue[];
interface JsonHolder {
  root: JsonObject;
  list: JsonArray;
}
// Heavy branching recursion: multiple nullable + array self-refs per node
// (mirrors the benchmark's FatNode) — worst case for depth-capped expansion.
interface FatNode {
  id: string;
  left: FatNode | null;
  right: FatNode | null;
  children: FatNode[];
  meta: { tag: string; node: FatNode | null };
}
interface FatHolder {
  fat: FatNode;
}

// Never-typed members: a tuple slot declared `never` must resolve to `never`,
// not fall back to the array element union (the value-guard _Index bug).
interface NeverMembers {
  t: [never, string];
  r: readonly [never, boolean];
  p: { a: never; b: string };
}

// ── Assertions (fail to compile on any divergence) ───────
type _Checks = [
  Expect<Agree<Flat>>,
  Expect<Agree<Nested>>,
  Expect<Agree<WithArrays>>,
  Expect<Agree<Tuple>>,
  Expect<Agree<Optionals>>,
  Expect<Agree<Nullables>>,
  Expect<Agree<Discriminated>>,
  Expect<Agree<ExoticLeaves>>,
  Expect<Agree<IndexSig>>,
  Expect<Agree<Recursive>>,
  Expect<Agree<JsonHolder>>,
  Expect<Agree<FatHolder>>,
  Expect<Agree<DeepChain>>,
  // Primitive / leaf roots → no paths.
  Expect<Equal<Paths<string>, PathsRef<string>>>,
  Expect<Equal<Paths<number>, PathsRef<number>>>,
  Expect<Equal<Paths<null>, PathsRef<null>>>,
  // Array roots.
  Expect<Agree<{ arr: string[] }>>,
  Expect<Equal<Paths<number[]>, PathsRef<number[]>>>,
];

// Spot-check a handful of concrete Get resolutions against the reference,
// independent of the round-trip map, to catch value-level divergence early.
type _GetSpot = [
  Expect<Equal<Get<Nested, 'x.y.z'>, GetRef<Nested, 'x.y.z'>>>,
  Expect<
    Equal<Get<WithArrays, 'objs.0.name'>, GetRef<WithArrays, 'objs.0.name'>>
  >,
  Expect<Equal<Get<Nullables, 'a'>, GetRef<Nullables, 'a'>>>,
  Expect<Equal<Get<Recursive, 'list.next'>, GetRef<Recursive, 'list.next'>>>,
  Expect<
    Equal<
      Get<DeepChain, 'l0.l1.l2.l3.l4.l5.l6.l7.l8'>,
      GetRef<DeepChain, 'l0.l1.l2.l3.l4.l5.l6.l7.l8'>
    >
  >,
  // Deep recursive paths — the case Get is most likely to mishandle.
  // Linear nullable chain:
  Expect<
    Equal<
      Get<Recursive, 'list.next.next.next.data'>,
      GetRef<Recursive, 'list.next.next.next.data'>
    >
  >,
  // Branching recursion through an array:
  Expect<
    Equal<
      Get<Recursive, 'tree.children.0.children.0.value'>,
      GetRef<Recursive, 'tree.children.0.children.0.value'>
    >
  >,
  // Mutual recursion, several hops:
  Expect<
    Equal<
      Get<Recursive, 'mutual.b.a.b.a.name'>,
      GetRef<Recursive, 'mutual.b.a.b.a.name'>
    >
  >,
  // Mixed branching + nullable through the heavy node:
  Expect<
    Equal<
      Get<FatHolder, 'fat.left.children.0.meta.node.right.id'>,
      GetRef<FatHolder, 'fat.left.children.0.meta.node.right.id'>
    >
  >,
];

// Never-typed members: a tuple/object slot declared `never` must resolve to
// `never`, not fall back to the array element union. Locks the divergence
// the value-guard `_Index` had against the reference (`GetRef`).
type _NeverLock = [
  Expect<Equal<Get<NeverMembers, 't.0'>, GetRef<NeverMembers, 't.0'>>>,
  Expect<Equal<Get<NeverMembers, 't.1'>, GetRef<NeverMembers, 't.1'>>>,
  Expect<Equal<Get<NeverMembers, 'r.0'>, GetRef<NeverMembers, 'r.0'>>>,
  Expect<Equal<Get<NeverMembers, 'p.a'>, GetRef<NeverMembers, 'p.a'>>>,
  Expect<Equal<Get<NeverMembers, 'p.b'>, GetRef<NeverMembers, 'p.b'>>>,
];

// These exported casts force `tsc` to resolve both assert tuples — the real
// gate, run via `npm test` (which is `tsc --noEmit`). If any `Expect<…>`
// diverges, this file fails to compile. dotpaths is type-only, so the
// type-check IS the test; there is nothing to assert at runtime.
export const _checks = undefined as unknown as _Checks;
export const _spot = undefined as unknown as _GetSpot;
export const _neverLock = undefined as unknown as _NeverLock;
