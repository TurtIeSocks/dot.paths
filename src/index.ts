/**
 * dot.paths — fast, type-safe dot-notation path types for TypeScript.
 *
 * - `Paths<T, Opts>`   — union of every valid dot-notation path into `T`.
 * - `Get<T, P>`        — value type at path `P` within `T` (loose `P`, fast).
 * - `GetStrict<T, P>`  — same, but `P` is constrained to `Paths<T>` for
 *                        autocomplete + invalid-path rejection (DX).
 *
 * Zero runtime, zero dependencies — these are pure type-level utilities tuned
 * for compiler performance. See README for the benchmark methodology/results.
 */

// ==========================================
// Path enumeration
// ==========================================

/** Types that terminate path traversal — no further nesting possible. */
type _Leaf =
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

/**
 * Joins a head segment to a union of tail sub-paths with `.`, short-circuiting
 * to `never` when there are no sub-paths.
 *
 * The `[T] extends [never]` guard is load-bearing for performance, not just
 * correctness: it lets leaf keys (whose sub-paths are `never`) bail out via a
 * cheap conditional INSTEAD of constructing a template literal that would only
 * collapse to `never` anyway. Dropping it measured ~6% slower (every leaf key
 * builds a throwaway template). The tuple wrapper also prevents distribution.
 */
type _Join<H extends string, T> = [T] extends [never]
  ? never
  : `${H}.${T & string}`;

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
type _ToNum<S> = S extends `${infer N extends number}` ? N : never;
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
 * - O(1) decrement depth guard (`_Prev[_D]`) — no per-level tuple-spread.
 * - `NonNullable<T[K]>` is KEPT, deliberately. Dropping it lets the recursion
 *   distribute over nullable members (`FatNode | null`) at EVERY level; on
 *   deeply recursive nullable types that measured ~5% slower. Keeping it
 *   collapses the union once, up front — cheap on flat types, decisive on
 *   recursive ones.
 */
type _Paths<T, _D extends number> = _D extends 0
  ? never
  : T extends _Leaf
    ? never
    : T extends readonly unknown[]
      ?
          | `${number}`
          | _Join<`${number}`, _Paths<NonNullable<T[number]>, _Prev[_D]>>
      : {
          [K in keyof T & string]:
            | K
            | _Join<K, _Paths<NonNullable<T[K]>, _Prev[_D]>>;
        }[keyof T & string];

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
 * typed (`string`) — fast, and the right primitive for internal use and
 * one-off lookups. For path autocomplete / invalid-path errors at the call
 * site, use {@link GetStrict}.
 *
 * Performance notes:
 * - Per segment, `_Index` does the fused `T[K & keyof T]`: `K & keyof T` is `K`
 *   for a real key (→ `T[K]`) and `never` for a miss. The intersection is far
 *   cheaper for the checker to relate than a `K extends keyof T` conditional —
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
 * Resolve one path segment. Fast path is the fused `T[K & keyof T]`; only when
 * that collapses to `never` (a key miss) do we fall back to the array branch.
 * That fallback is what keeps recursive unions like JSON (`… | Json[]`)
 * resolving to their value type — matching a classic `keyof`-cascade exactly —
 * while every normal hit pays only the cheap intersection-index.
 */
type _Index<T, K extends string> = [T[K & keyof T]] extends [never]
  ? T extends readonly unknown[]
    ? T[number]
    : never
  : T[K & keyof T];

/**
 * `Get`, but with `P` constrained to `Paths<T>` — enables path autocomplete
 * and rejects invalid paths at the call site. Delegates to the loose `Get`
 * (the constraint forces a `Paths<T>` computation, so reach for this at API
 * boundaries that want the DX, not in hot inner code).
 *
 * @example
 * type V = GetStrict<{ user: { name: string } }, 'user.name'>; // string
 * type E = GetStrict<{ user: { name: string } }, 'user.xyz'>;  // compile error
 */
export type GetStrict<T, P extends Paths<T>> = Get<T, P>;
