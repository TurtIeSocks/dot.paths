# dot.paths

Fast, type-safe **dot-notation path types** for TypeScript.

- **`Paths<T>`** — a union of every valid dot-notation path into `T`.
- **`Get<T, P>`** — the value type at a path (loose `P`, maximally fast).
- **`GetStrict<T, P>`** — `Get` with `P` constrained to valid paths (autocomplete + invalid-path errors).

Zero runtime. Zero dependencies. Pure type-level utilities, tuned for **compiler performance** — the resolver is ~40% faster to type-check than a conventional `keyof`-cascade, and the gap widens as your types grow.

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

(Type-only — install as a dev dependency.)

## API

### `Paths<T, Opts?>`

Union of every dot-notation path into `T`.

- Walks objects, arrays (`` `${number}` `` segments), tuples, optionals, nullable unions, and recursive types.
- Stops at "leaf" values (primitives, `Date`, `RegExp`, `Map`, `Set`, `Promise`, functions).
- **Depth** defaults to `8`. Raise it for deeply nested/recursive types:

```ts
type Deep = Paths<MyTree, { depth: 12 }> // up to 16
```

The depth cap is what keeps recursive types (linked lists, trees, JSON) from exploding the compiler — it bounds path length rather than failing.

### `Get<T, P extends string>`

Value type at path `P`. `P` is loosely typed (`string`) — this is the fast primitive; use it internally and for one-off lookups. Tail-recursive, so arbitrarily deep paths are fine.

### `GetStrict<T, P extends Paths<T>>`

Same resolution, but `P` is constrained to `Paths<T>` — you get path autocomplete and invalid paths become compile errors. The constraint forces a `Paths<T>` computation, so prefer it at API boundaries that want the DX rather than in hot inner code. (If your paths already come from `Paths<T>`, this is effectively free.)

> Note: a naive `Get<T, P extends Paths<T>>` does **not** compile — the recursive tail can't be proven a sub-path. `GetStrict` is the wrapper that makes it work (strict boundary, loose recursion).

## Performance

These types are built to be cheap for `tsc`. Highlights from the included benchmark (vs a conventional implementation, same fixtures, fair same-session A/B):

| Workload              | Instantiations |    Check time |
| --------------------- | -------------: | ------------: |
| `Get` (resolution)    |          ~flat |      **−40%** |
| `Paths` (enumeration) |       **−15%** |           −6% |
| realistic round-trip  |        **−9%** |      **−40%** |
| recursive types       |            −2% | no regression |

The `Get` check-time win **grows with type size** (−40% at the benchmark's 2× scale, −57% at 3×), because the core trick — resolving a segment with a fused `T[K & keyof T]` indexed access — is far cheaper for the checker to relate than a `K extends keyof T` conditional.

Correctness is locked: every optimization is proven type-identical to a frozen reference implementation across objects, arrays, tuples, optionals, nullable/discriminated unions, exotic leaves, and recursive types (including self-referential JSON maps) — see `test/equivalence.ts`.

### Running the benchmarks

```sh
npm run typeperf:gen        # generate the pathological fixtures
npm run typeperf            # measure Paths / Get / combined / recursive
npm run typeperf -- --save  # save current numbers as the baseline
npm run typeperf:ab         # A/B the optimized impl vs a frozen original
```

`typeperf` runs `tsc --extendedDiagnostics` against isolated scenarios and reports the deterministic counters (Types, Instantiations) plus min-over-N timers. `typeperf:ab` interleaves the optimized and original implementations in one process for a drift-free timing comparison.

## How it works (the short version)

- **`Paths`** gates on `T extends _Leaf` first (primitives — the common case — terminate in one cheap check), drops a redundant `T extends object` guard, uses an O(1) decrement for the depth counter, and keeps `NonNullable` per key (dropping it is faster on flat types but slower on recursive nullable ones).
- **`Get`** is two branches: split on the first `.`, then resolve the segment with `_Index`. `_Index` is the fused `T[K & keyof T]`, with a fallback to the array element type that only fires on a key miss — which is exactly what keeps recursive unions like JSON resolving correctly while normal lookups stay fast.

## License

MIT
