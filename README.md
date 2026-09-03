# dot.paths

Fast, type-safe **dot-notation path types** for TypeScript.

- **`Paths<T>`**: a union of every valid dot-notation path into `T`.
- **`Get<T, P>`**: the value type at a path (loose `P`, maximally fast).
- **`GetStrict<T, P>`**: `Get` with `P` constrained to valid paths (autocomplete + invalid-path errors).

Zero runtime. Zero dependencies. Pure type-level utilities, tuned for **compiler performance**: the resolver is ~40% faster to type-check than a conventional `keyof`-cascade, and the gap widens as your types grow.

```ts
import type { Paths, Get, GetStrict } from 'dot.paths'

interface State {
  user: { name: string; age: number }
  todos: { id: string; done: boolean }[]
}

type P = Paths<State>
//   ^? 'user' | 'user.name' | 'user.age' | 'todos' | `todos.${number}`
//      | `todos.${number}.id` | `todos.${number}.done`

type Name = Get<State, 'user.name'> //          string
type Todo = Get<State, `todos.${number}`> //    { id: string; done: boolean }
type Done = Get<State, `todos.${number}.done`> // boolean

// Strict: invalid paths are a compile error, valid ones autocomplete.
type Bad = GetStrict<State, 'user.xyz'>
//                          ~~~~~~~~~~~  Type '"user.xyz"' does not satisfy …
```

## Install

```sh
npm i -D dot.paths
```

(Type-only, so install it as a dev dependency.)

## API

### `Paths<T, Opts?>`

Union of every dot-notation path into `T`.

- Walks objects, arrays (`` `${number}` `` segments), tuples, optionals, nullable unions, and recursive types.
- Stops at "leaf" values: primitives and their boxed `String` and `Number` (not `Boolean`, whose whole shape is `valueOf(): boolean`), functions and constructors, `Date`, `RegExp`, `Promise`, `Map`/`Set` and their readonly and weak forms, `WeakRef`, typed arrays, `ArrayBuffer`, `SharedArrayBuffer`, `DataView`.
- **Depth** defaults to `8`. Raise it for deeply nested/recursive types:

```ts
type Deep = Paths<MyTree, { depth: 12 }> // up to 16
```

The depth cap is what keeps recursive types (linked lists, trees, JSON) from exploding the compiler: it bounds path length rather than failing.

```ts
interface Comment {
  body: string
  replies: Comment[]
}

type P = Paths<Comment, { depth: 3 }>
//   ^? 'body' | 'replies' | `replies.${number}`
//      | `replies.${number}.body` | `replies.${number}.replies`
```

### `Get<T, P extends string>`

Value type at path `P`. `P` is loosely typed (`string`): this is the fast primitive, use it internally and for one-off lookups. Tail-recursive, so deep paths are fine up to TypeScript's tail-call limit of 1000 segments.

### `GetStrict<T, P extends Paths<T>>`

Same resolution, but `P` is constrained to `Paths<T>`, so you get path autocomplete and invalid paths become compile errors. The constraint forces a `Paths<T>` computation, so prefer it at API boundaries that want the DX rather than in hot inner code. (If your paths already come from `Paths<T>`, this is effectively free.)

> Note: a naive `Get<T, P extends Paths<T>>` does **not** compile, because the recursive tail can't be proven a sub-path. `GetStrict` is the wrapper that makes it work (strict boundary, loose recursion).

`GetStrict` checks against the default depth. For a deeper cap, wrap it yourself: `type GetDeep<T, P extends Paths<T, { depth: 12 }>> = Get<T, P>`.

## Performance

These types are built to be cheap for `tsc`. Highlights from the included benchmark (vs a conventional implementation, same fixtures, fair same-session A/B):

| Workload              | Instantiations |    Check time |
| --------------------- | -------------: | ------------: |
| `Get` (resolution)    |        **−4%** |      **−48%** |
| `Paths` (enumeration) |       **−20%** |           −4% |
| realistic round-trip  |       **−11%** |      **−36%** |
| recursive types       |            +1% | no regression |

The `Get` check-time win **grows with type size** (−50% at the benchmark's 2× scale, −60% at 3×), because the core trick, resolving a segment by testing the key intersection `K & keyof T` against `never`, is far cheaper for the checker to relate than a `K extends keyof T` conditional, and never materializes the indexed-access value type on a miss.

Instantiation counts do not predict check time here. One derived helper type (`_Depth`, computed with a template `infer` over seventeen string literals) cost nothing in instantiations and made every `Paths` computation in the program a third slower to check; the interleaved A/B (`npm run typeperf:ab`) is what caught it, so judge a change by that, not by the counters alone.

Correctness is locked: every optimization is proven type-identical to a frozen reference implementation across objects, arrays, tuples, optionals, nullable/discriminated unions, exotic leaves, and recursive types (including self-referential JSON maps), see `test/equivalence.ts`.

### Running the benchmarks

```sh
npm run typeperf:gen        # generate the pathological fixtures
npm run typeperf            # measure Paths / Get / combined / recursive
npm run typeperf -- --save  # save current numbers as the baseline
npm run typeperf:ab         # A/B the optimized impl vs a frozen original
```

`typeperf` runs `tsc --extendedDiagnostics` against isolated scenarios and reports the deterministic counters (Types, Instantiations) plus min-over-N timers. `typeperf:ab` interleaves the optimized and original implementations in one process for a drift-free timing comparison.

## How it works (the short version)

- **`Paths`** enumerates string keys, array elements as `${number}`, numeric index signatures (`Record<number, V>`) as `${number}` too, and numeric literal keys (`{ 0: V }`) as `"0"`; string index signatures stay `${string}` only. It gates on `T extends _Leaf` first (primitives, the common case, terminate in one cheap check), drops a redundant `T extends object` guard, uses an O(1) decrement for the depth counter, and keeps `NonNullable` per key (dropping it is faster on flat types but slower on recursive nullable ones).
- **`Get`** is two branches: split on the first `.`, then resolve the segment with `_Index`. `_Index` is the fused `T[K & keyof T]`. Only when that misses on the whole type does it retry per union member, which is how a path through a nullable, optional or union member (`Partial<Record<K, V>>`, `(A | B)[]`, `[A?]`) resolves to the member's value instead of `never`, and how enum-keyed records resolve by member value. Numeric segments are read as numbers only when they round-trip, so `'007'` misses a numeric key; a string key spelled `'007'` still resolves.

## Limitations

Known and pinned in `test/`, each a consequence of TypeScript's own rules rather than something the implementation can route around cheaply.

- A string index signature at the root (`Paths<Record<string, V>>`) is exactly `string`, so `GetStrict` accepts any path there. Nested, `r.${string}` absorbs every deeper path, so `GetStrict<{ r: Record<string, V> }, 'r.a.b.c'>` always compiles: it resolves through the keys `V` has and to `never` past them.
- A key containing `.` (a numeric key like `1.5` too) is listed by `Paths` and unresolvable by `Get`, which splits on the first dot.
- A trailing dot resolves through a string index signature, because `''` is a valid key.
- Tuples are addressed as `${number}`. An out-of-range literal index resolves to `undefined` and `GetStrict` accepts it. A wide `${number}` segment on a tuple with a rest element gives the fixed elements only; literal indices resolve the rest element.
- `${number}` also matches decimal strings such as `'0.0'`, so on nested arrays of primitives a path with one segment too many can pass `GetStrict`.
- Where a path is `${number}` (numeric index signatures, arrays, tuples), non-canonical numerals such as `'007'`, `'1e3'` and `'+1'` satisfy the template, so `GetStrict` accepts them, and they resolve to `never`: at runtime they are different property keys. A numeric literal key `7` only answers to `'7'`, and a string key spelled `'007'` is its own path and resolves as normal.
- `any` is a wildcard: `Paths<any>` is `string`, and an `any` field emits `${string}` below it.
- Loose `Get` resolves any structural member, including `length`, array methods and `Map.size`. `GetStrict` never offers them, except under `any`, where every path satisfies the constraint.
- A wide `${string}` segment on loose `Get` gives the union of matching values on a plain object and the shared keys' values on a union, and `never` through a nullable object or a union with no shared keys. A string index signature resolves it either way.
- `Get` resolves through optional and nullable members to the value type without `| undefined`, matching what `Paths` enumerates.

## License

MIT
