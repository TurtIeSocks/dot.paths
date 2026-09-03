/**
 * Numeric keys: index signatures (`Record<number, V>`, `{ [k: number]: V }`)
 * and numeric literal keys (`{ 0: V }`).
 *
 * Earlier releases produced no paths for these (`keyof T & string` drops
 * `number`) and `Get` resolved them to `never`. String index signatures must
 * stay as they were: `keyof Record<string, V>` is `string | number`, so the
 * numeric side must not grow every string record a `${number}` twin path.
 * Pure type-level; `tsc` is the test.
 */
import type { Get, GetStrict, Paths } from '../src/index';

type Equal<A, B> =
  (<T>() => T extends A ? 1 : 2) extends <T>() => T extends B ? 1 : 2
    ? true
    : false;
type Expect<T extends true> = T;

interface Shape {
  extras: Record<number, boolean>;
  rows: Record<number, { a: string; b: { c: number } }>;
  tags: Record<string, boolean>;
  mixed: { fixed: 1; [k: number]: { z: boolean } };
  sig: { [k: number]: string };
  lit: { 0: string; 1: { deep: boolean } };
  list: Array<{ id: number }>;
}

// ── Paths ────────────────────────────────────────────────
type _Paths = [
  Expect<
    Equal<
      Paths<{ extras: Record<number, boolean> }>,
      'extras' | `extras.${number}`
    >
  >,
  Expect<
    Equal<
      Paths<{ rows: Record<number, { a: string; b: { c: number } }> }>,
      | 'rows'
      | `rows.${number}`
      | `rows.${number}.a`
      | `rows.${number}.b`
      | `rows.${number}.b.c`
    >
  >,
  // String index signatures unchanged: no `${number}` twin.
  Expect<
    Equal<Paths<{ tags: Record<string, boolean> }>, 'tags' | `tags.${string}`>
  >,
  // Literal keys and a numeric signature coexist.
  Expect<
    Equal<
      Paths<{ mixed: { fixed: 1; [k: number]: { z: boolean } } }>,
      'mixed' | 'mixed.fixed' | `mixed.${number}` | `mixed.${number}.z`
    >
  >,
  Expect<
    Equal<Paths<{ sig: { [k: number]: string } }>, 'sig' | `sig.${number}`>
  >,
];

// ── Get ──────────────────────────────────────────────────
type _Get = [
  Expect<Equal<Get<Shape, 'extras.7'>, boolean>>,
  Expect<Equal<Get<Shape, `extras.${number}`>, boolean>>,
  Expect<Equal<Get<Shape, 'rows.3.a'>, string>>,
  Expect<Equal<Get<Shape, `rows.${number}.b.c`>, number>>,
  Expect<Equal<Get<Shape, 'mixed.fixed'>, 1>>,
  Expect<Equal<Get<Shape, 'mixed.4.z'>, boolean>>,
  Expect<Equal<Get<Shape, 'sig.0'>, string>>,
  Expect<Equal<Get<Shape, 'lit.0'>, string>>,
  Expect<Equal<Get<Shape, 'lit.1.deep'>, boolean>>,
  // Arrays keep resolving by index and by `${number}`.
  Expect<Equal<Get<Shape, 'list.0.id'>, number>>,
  Expect<Equal<Get<Shape, `list.${number}.id`>, number>>,
  // A miss on a numeric record is still a miss.
  Expect<Equal<Get<Shape, 'extras.7.nope'>, never>>,
];

// ── GetStrict accepts numeric-record paths and rejects junk ──────────────
type _Strict = [
  Expect<Equal<GetStrict<Shape, 'extras.7'>, boolean>>,
  Expect<Equal<GetStrict<Shape, `rows.${number}.a`>, string>>,
];
// @ts-expect-error a non-numeric segment under a numeric signature is invalid
type _Bad1 = GetStrict<Shape, 'extras.x'>;
// @ts-expect-error a non-numeric segment under a bare numeric signature is invalid
type _Bad2 = GetStrict<Shape, 'sig.x'>;
