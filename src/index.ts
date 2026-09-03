/**
 * dot.paths: fast, type-safe dot-notation path types for TypeScript.
 *
 * - `Paths<T, Opts>`: union of every valid dot-notation path into `T`.
 * - `Get<T, P>`: value type at path `P` within `T` (loose `P`, fast).
 * - `GetStrict<T, P>`: same, but `P` is constrained to `Paths<T>` for
 *                        autocomplete + invalid-path rejection (DX).
 *
 * Zero runtime, zero dependencies: these are pure type-level utilities tuned
 * for compiler performance. See README for the benchmark methodology/results.
 */

// ==========================================
// Path enumeration
// ==========================================

/**
 * Types that terminate path traversal. Past the primitives and callables the
 * list is hand-picked: opaque runtime values whose members are methods, not
 * data. `Function` also covers constructor types, so `typeof SomeClass` is a
 * leaf. `ReadonlyMap` and `ReadonlySet` match `Map` and `Set` as well;
 * `ArrayBufferView` covers every typed array and `DataView`. `T extends _Leaf`
 * runs once per node; growing the list from 13 to 22 members measured +27
 * instantiations on `paths`, nothing on check time.
 */
type _Leaf =
  | string
  | number
  | boolean
  | bigint
  | symbol
  | null
  | undefined
  | ((...args: never[]) => unknown)
  | Function
  | Date
  | RegExp
  | ReadonlyMap<unknown, unknown>
  | ReadonlySet<unknown>
  | WeakMap<object, unknown>
  | WeakSet<object>
  | WeakRef<object>
  | Promise<unknown>
  | ArrayBuffer
  | SharedArrayBuffer
  | ArrayBufferView
  | String
  | Number;

/**
 * One key's contribution to `Paths`: the key itself, plus every sub-path
 * joined under it with `.`. `K` may be a number (a numeric index signature or
 * a numeric literal key), which is why the bare key is `${K}` and not `K`.
 *
 * Both halves live in ONE alias on purpose. The obvious shape, `K | _Join<K,
 * Sub>` inside the mapped type or the bare keys unioned in beside it, forms
 * a second union per object node, and every union that mixes string literals
 * with pattern templates (`${number}`, `${string}`) re-runs TypeScript's
 * literal-vs-template reduction over the whole subtree. On the `recursive`
 * benchmark that measured +28–60% check time for every such variant tried;
 * folding the bare key into the join's own template keeps one union per node
 * and measured −6.8% instantiations on `paths` against the old `_Join` shape.
 *
 * The `[Sub] extends [never]` guard is load-bearing for performance, not just
 * correctness: leaf keys (whose sub-paths are `never`) bail out via a cheap
 * conditional instead of building a join template that would only collapse
 * anyway. The tuple wrapper also prevents distribution.
 */
type _Entry<K extends string | number, Sub> = [Sub] extends [never]
  ? `${K}`
  : `${K}` | `${K}.${Sub & string}`;

/**
 * Decrement lookup for the recursion-depth guard (O(1) vs tuple-spread).
 * `_Prev[N]` is `N - 1`; length bounds the maximum configurable depth (16).
 */
type _Prev = [never, 0, 1, 2, 3, 4, 5, 6, 7, 8, 9, 10, 11, 12, 13, 14, 15];

/**
 * Valid `depth` values, derived from `_Prev` so the two never drift: extend the
 * table above and the allowed range follows automatically.
 *
 * `Exclude<keyof _Prev, keyof unknown[]>` yields the tuple's index literals as
 * strings (`'0' | … | '16'`), `_ToNum` turns them into number literals, and `0`
 * is dropped (depth 0 = no paths).
 */
/**
 * A segment as a number, only when it round-trips: `'7'` is `7` and
 * `` `${number}` `` is `number`, but `'007'`, `'1e3'` and `' 1'` are `never`,
 * since `` `${infer N extends number}` `` alone widens them to `number` and a
 * miss would then resolve to every numerically keyed value. At runtime
 * `obj['007']` is a different property from `obj[7]`, so a miss is right.
 */
type _ToNum<S> = S extends `${infer N extends number}`
  ? `${N}` extends S
    ? N
    : never
  : never;
type _Depth = Exclude<_ToNum<Exclude<keyof _Prev, keyof unknown[]>>, 0>;

/** Options accepted by {@link Paths}. */
export interface PathsOptions {
  /**
   * Maximum traversal depth before paths are truncated. Default `8`.
   * Bounded by the `_Prev` table length (currently `1`–`16`); going deeper
   * risks TypeScript's own recursion limit on pathological types.
   */
  depth?: _Depth;
}

/**
 * Recursive worker for {@link Paths}. `_D` is a numeric countdown.
 *
 * Performance notes:
 * - `T extends _Leaf` gates first: primitives (the common leaf) match an early
 *   union member and terminate cheaply; reordering to `T extends object`-first
 *   measured WORSE (more intermediate type nodes).
 * - No `T extends object` guard before the mapped type: after the leaf and
 *   array checks everything left is already an object, so the guard was dead
 *   weight (~13% of Paths instantiations on wide types).
 * - O(1) decrement depth guard (`_Prev[_D]`), no per-level tuple-spread.
 * - `NonNullable<T[K]>` is KEPT, deliberately. Dropping it lets the recursion
 *   distribute over nullable members (`FatNode | null`) at EVERY level; on
 *   deeply recursive nullable types that measured ~5% slower. Keeping it
 *   collapses the union once, up front: cheap on flat types, decisive on
 *   recursive ones.
 * - Keys are mapped over `keyof T & (string | number)`, not `keyof T & string`.
 *   `number & string` is `never`, so numeric index signatures
 *   (`Record<number, V>`) and numeric literal keys (`{ 0: V }`) used to
 *   produce no paths at all. Widening the key domain itself is free (measured
 *   +0.1% instantiations); what costs is anything that adds a union member
 *   per node, see {@link _Entry}. A `number extends keyof T` conditional per
 *   node measured +47–60% check time on `recursive`, a second mapped type over
 *   `keyof T & number` +18% instantiations on `paths`. A string index
 *   signature makes `keyof T` = `string | number`; its `${number}` twin is
 *   absorbed by the `string` member of the same union.
 * - An empty tuple has no element, so it yields no `${number}` slot. The
 *   `T extends readonly []` check runs only on array nodes and measured +330
 *   instantiations on `paths`.
 */
type _Paths<T, _D extends number> = _D extends 0
  ? never
  : T extends _Leaf
    ? never
    : T extends readonly unknown[]
      ? T extends readonly []
        ? never
        : _Entry<number, _Paths<NonNullable<T[number]>, _Prev[_D]>>
      : {
          [K in keyof T & (string | number)]: _Entry<
            K,
            _Paths<NonNullable<T[K]>, _Prev[_D]>
          >;
        }[keyof T & (string | number)];

/**
 * Union of every valid dot-notation path into `T`, e.g.
 * `'user' | 'user.name' | 'items' | `items.${number}` | …`.
 *
 * Depth defaults to 8; raise it with `Paths<T, { depth: 12 }>` (≤ 16).
 *
 * @example
 * type P = Paths<{ user: { name: string }; tags: string[] }>;
 * //   ^? 'user' | 'user.name' | 'tags' | `tags.${number}`
 */
export type Paths<T, Opts extends PathsOptions = {}> = _Paths<
  T,
  Opts extends { depth: infer D extends number } ? D : 8
>;

// ==========================================
// Value resolution
// ==========================================

/**
 * Resolves the value type at dot-notation path `P` within `T`. `P` is loosely
 * typed (`string`): fast, and the right primitive for internal use and
 * one-off lookups. For path autocomplete / invalid-path errors at the call
 * site, use {@link GetStrict}.
 *
 * Performance notes:
 * - Per segment, `_Index` does the fused `T[K & keyof T]`: `K & keyof T` is `K`
 *   for a real key (→ `T[K]`) and `never` for a miss. The intersection is far
 *   cheaper for the checker to relate than a `K extends keyof T` conditional,
 *   the win grows with type size (~−40% to −57% check time on the benchmark).
 * - Tail-recursive (`Get<…, R>` in tail position) → TypeScript TCO (4.5+),
 *   so arbitrarily deep paths don't hit the recursion limit.
 *
 * @example
 * type V = Get<{ user: { name: string } }, 'user.name'>;
 * //   ^? string
 */
export type Get<T, P extends string> = P extends `${infer H}.${infer R}`
  ? Get<_Index<T, H>, R>
  : _Index<T, P>;

/**
 * Resolve one path segment. The hit path probes the key intersection
 * `K & keyof T` directly (`never` on a miss, `K` on a hit) instead of
 * materializing the indexed access `T[K & keyof T]` just to never-test it, so
 * a hit builds the value type once and the checker only relates a small key
 * type. Measured on the `get` scenario against a value-guard: Types −11.6%,
 * Instantiations −4.1%, check time −13% (TS 5.9.3). A tuple member *declared*
 * `never` still has a real key, so it resolves to `never` rather than falling
 * through (see `NeverMembers` in `test/equivalence.ts`).
 *
 * A miss on the whole type hands over to {@link _IndexEach}, which retries per
 * union member. `keyof (A | B)` is only the shared keys and `keyof (X | null)`
 * is `never`, so without that step every path `Paths` enumerates through a
 * nullable, optional or union member (`Partial<Record<K, V>>`, `(A | B)[]`,
 * `[A?]`) resolved to `never`. Miss path only: distributing on the hit path as
 * well measured +2.8% instantiations and +8% check time on `get`; this shape
 * measured +0.4% and no check-time change. The distributing conditional has
 * to be its own alias: nested inside another conditional's branch it does
 * not distribute.
 *
 * There is no array-element fallback any more. It existed so `Json[] | {…}`
 * kept resolving through `keyof` of the union; with per-member retry the
 * object member resolves on its own, and the fallback only turned garbage
 * segments into the element type (`Get<{ list: El[] }, 'list.first'>` was
 * `El`, and `Get<{ u: V[] | { a: 1 } }, 'u.a'>` was `V`).
 */
type _Index<T, K extends string> = [K & keyof T] extends [never]
  ? _IndexEach<T, K>
  : T[K & keyof T];

/**
 * Per-member retry for a segment that missed on the whole type. Assignability
 * (`K extends keyof T`) rather than the intersection guard, because a wide
 * `` `${string}` `` segment intersects every method name of a primitive or
 * array member (`Get<Json[], `${string}`>` came back as fifty method types).
 *
 * `_ToNum` is guarded with a tuple check before it is used as an index:
 * `T[never]` is not `never`, it falls into the index signature (`X[][never]`
 * is `X`, `string[never]` is `string`). The `_StringKeyed` step is what makes
 * enum-keyed records resolvable: `Paths` lists an enum member by its value
 * (`'red'`), and neither `'red' & Color` nor `'red' extends Color` holds, so
 * the keys are remapped to their string form. Object members only, since a
 * primitive's `keyof` is fifty method names. Whole chain measured within
 * noise on `get`, `combined` and `recursive`.
 */
type _IndexEach<T, K extends string> = T extends unknown
  ? K extends keyof T
    ? T[K]
    : [_ToNum<K>] extends [never]
      ? K extends `${number}`
        ? never
        : T extends object
          ? K extends keyof _StringKeyed<T>
            ? _StringKeyed<T>[K]
            : never
          : never
      : _ToNum<K> extends keyof T
        ? T[_ToNum<K>]
        : never
  : never;

type _StringKeyed<T> = { [P in keyof T as `${P & (string | number)}`]: T[P] };

/**
 * `Get`, but with `P` constrained to `Paths<T>`, which enables path autocomplete
 * and rejects invalid paths at the call site. Delegates to the loose `Get`
 * (the constraint forces a `Paths<T>` computation, so reach for this at API
 * boundaries that want the DX, not in hot inner code).
 *
 * @example
 * type V = GetStrict<{ user: { name: string } }, 'user.name'>; // string
 * type E = GetStrict<{ user: { name: string } }, 'user.xyz'>;  // compile error
 */
export type GetStrict<T, P extends Paths<T>> = Get<T, P>;
