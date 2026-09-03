/**
 * Records and index signatures with string-like keys.
 *
 * Three key domains behave differently and users hit all three: a wide
 * `string` signature collapses every sub-path into one `${string}` template, a
 * template-literal key keeps its own pattern (and its sub-paths), and a
 * literal union enumerates like an ordinary object. Wrappers (`Partial`,
 * `Readonly`, `| null`, optional) sit on top of each. Pure type-level; `tsc`
 * is the test.
 */
import type { Get, GetStrict, Paths } from '../src/index';

type Equal<A, B> =
  (<T>() => T extends A ? 1 : 2) extends <T>() => T extends B ? 1 : 2
    ? true
    : false;
type Expect<T extends true> = T;

interface Obj {
  a: number;
  b: { c: string };
}

// ── A wide `string` key absorbs every sub-path into one `${string}` ───────
type _StringSignature = [
  Expect<Equal<Paths<{ r: Record<string, string> }>, 'r' | `r.${string}`>>,
  Expect<Equal<Paths<{ r: Record<string, Obj> }>, 'r' | `r.${string}`>>,
  Expect<Equal<Paths<{ r: { [k: string]: Obj } }>, 'r' | `r.${string}`>>,
  Expect<
    Equal<Paths<{ r: { readonly [k: string]: Obj } }>, 'r' | `r.${string}`>
  >,
  Expect<Equal<Paths<{ r: Record<string, Obj | null> }>, 'r' | `r.${string}`>>,
  Expect<
    Equal<Paths<{ r: Record<string, Obj | undefined> }>, 'r' | `r.${string}`>
  >,
  Expect<
    Equal<Paths<{ r: Record<string, string | Obj> }>, 'r' | `r.${string}`>
  >,
  Expect<Equal<Paths<{ r: Record<string, unknown> }>, 'r' | `r.${string}`>>,
  Expect<Equal<Paths<{ r: Record<string, any> }>, 'r' | `r.${string}`>>,
  Expect<Equal<Paths<{ r: Record<string, never> }>, 'r' | `r.${string}`>>,
  Expect<Equal<Paths<{ r: Record<string, undefined> }>, 'r' | `r.${string}`>>,
  Expect<Equal<Paths<{ r: Record<string, object> }>, 'r' | `r.${string}`>>,
  Expect<Equal<Paths<{ r: Record<string, Date> }>, 'r' | `r.${string}`>>,
  // `Record<string, V>` and `Partial<Record<string, V>>` enumerate identically;
  // only the resolved value type differs (see `_GetWrapped`).
  Expect<
    Equal<
      Paths<{ r: Partial<Record<string, Obj>> }>,
      Paths<{ r: Record<string, Obj | undefined> }>
    >
  >,
];

// ── Intended limitation: a root string record collapses to plain `string` ─
type _RootStringRecord = [
  Expect<Equal<Paths<Record<string, { a: number }>>, string>>,
  Expect<Equal<Paths<{ id: number; [k: string]: number | string }>, string>>,
  // With no literal prefix to anchor the template, `GetStrict` rejects nothing.
  Expect<
    Equal<GetStrict<Record<string, { a: number }>, 'literally.anything'>, never>
  >,
];

// ── Template-literal keys keep their pattern, and their sub-paths ─────────
type _TemplateKeys = [
  Expect<
    Equal<
      Paths<{ r: Record<`k${number}`, Obj> }>,
      | 'r'
      | `r.k${number}`
      | `r.k${number}.a`
      | `r.k${number}.b`
      | `r.k${number}.b.c`
    >
  >,
  Expect<
    Equal<
      Paths<{ r: { [k: `data-${string}`]: { v: number } } }>,
      'r' | `r.data-${string}` | `r.data-${string}.v`
    >
  >,
  Expect<
    Equal<
      Paths<{ r: Record<`data-${string}`, string> }>,
      'r' | `r.data-${string}`
    >
  >,
  Expect<
    Equal<
      Paths<{ r: Record<`${string}-${string}`, string> }>,
      'r' | `r.${string}-${string}`
    >
  >,
  // Resolvable templates enumerate as plain literals.
  Expect<
    Equal<
      Paths<{ r: Record<`on${Capitalize<'click'>}`, { v: 1 }> }>,
      'r' | 'r.onClick' | 'r.onClick.v'
    >
  >,
  Expect<
    Equal<
      Paths<{ r: Record<Uppercase<'a' | 'b'>, { v: 1 }> }>,
      'r' | 'r.A' | 'r.B' | 'r.A.v' | 'r.B.v'
    >
  >,
  // Root position: a template key survives where a bare `string` would not.
  Expect<
    Equal<Paths<Record<`k${number}`, { v: 1 }>>, `k${number}` | `k${number}.v`>
  >,
];

// ── Literal-union keys enumerate exactly like declared properties ─────────
enum Color {
  Red = 'red',
  Blue = 'blue',
}

type _LiteralKeys = [
  Expect<
    Equal<
      Paths<{ r: Record<'a' | 'b', { v: number }> }>,
      'r' | 'r.a' | 'r.b' | 'r.a.v' | 'r.b.v'
    >
  >,
  Expect<Equal<Paths<{ r: Record<'only', string> }>, 'r' | 'r.only'>>,
  Expect<Equal<Paths<{ r: Record<'a', Date> }>, 'r' | 'r.a'>>,
  Expect<Equal<Paths<{ r: Record<'a', () => void> }>, 'r' | 'r.a'>>,
  Expect<Equal<Paths<{ r: Record<'a' | 'b', boolean> }>, 'r' | 'r.a' | 'r.b'>>,
  Expect<
    Equal<
      Paths<{ r: Record<keyof { x: 1; y: 2 }, string> }>,
      'r' | 'r.x' | 'r.y'
    >
  >,
  // String enum members enumerate by their VALUE, not their member name.
  Expect<
    Equal<
      Paths<{ r: Record<Color, { hex: string }> }>,
      'r' | 'r.red' | 'r.blue' | 'r.red.hex' | 'r.blue.hex'
    >
  >,
  Expect<Equal<Paths<Record<'a' | 'b', { v: 1 }>>, 'a' | 'b' | 'a.v' | 'b.v'>>,
];

// ── Enum keys resolve through `Get`, as records and as computed keys ──────
type EnumRec = { c: Record<Color, { hex: string }> };
type EnumComputed = { c: { [Color.Red]: { hex: string } } };

type _GetEnumKeys = [
  Expect<Equal<Get<EnumRec, 'c.red'>, { hex: string }>>,
  Expect<Equal<Get<EnumRec, 'c.red.hex'>, string>>,
  Expect<Equal<Get<EnumRec, 'c.blue.hex'>, string>>,
  Expect<Equal<Get<EnumRec, `c.${Color}`>, { hex: string }>>,
  Expect<Equal<Get<EnumRec, 'c.green'>, never>>,
  Expect<Equal<GetStrict<EnumRec, 'c.red.hex'>, string>>,
  Expect<Equal<Paths<EnumComputed>, 'c' | 'c.red' | 'c.red.hex'>>,
  Expect<Equal<Get<EnumComputed, 'c.red.hex'>, string>>,
];

// ── Wrappers do not change enumeration; a `string` key still absorbs ──────
type _Wrappers = [
  Expect<
    Equal<
      Paths<{ r: Partial<Record<'a' | 'b', { v: number }>> }>,
      'r' | 'r.a' | 'r.b' | 'r.a.v' | 'r.b.v'
    >
  >,
  Expect<
    Equal<
      Paths<{ r: Readonly<Record<'a' | 'b', { v: number }>> }>,
      'r' | 'r.a' | 'r.b' | 'r.a.v' | 'r.b.v'
    >
  >,
  Expect<
    Equal<
      Paths<{ r: Required<Partial<Record<'a' | 'b', { v: number }>>> }>,
      'r' | 'r.a' | 'r.b' | 'r.a.v' | 'r.b.v'
    >
  >,
  Expect<
    Equal<
      Paths<{ r: Record<'a' | 'b', { v: number } | undefined> }>,
      'r' | 'r.a' | 'r.b' | 'r.a.v' | 'r.b.v'
    >
  >,
  // Nullable and optional records: `NonNullable` per key keeps the sub-paths.
  Expect<
    Equal<Paths<{ r: Record<'a', { v: 1 }> | null }>, 'r' | 'r.a' | 'r.a.v'>
  >,
  Expect<Equal<Paths<{ r?: Record<'a', { v: 1 }> }>, 'r' | 'r.a' | 'r.a.v'>>,
  Expect<
    Equal<Paths<{ r: Partial<Record<string, Obj>> }>, 'r' | `r.${string}`>
  >,
  Expect<
    Equal<Paths<{ r: Readonly<Record<string, Obj>> }>, 'r' | `r.${string}`>
  >,
  Expect<Equal<Paths<{ r: Record<string, Obj> | null }>, 'r' | `r.${string}`>>,
  Expect<Equal<Paths<{ r?: Record<string, Obj> }>, 'r' | `r.${string}`>>,
];

// ── Declared keys next to a string signature: the signature swallows them ─
interface Mixed {
  id: number;
  [k: string]: number | string;
}
interface MixedObj {
  id: number;
  [k: string]: number | { a: string };
}
interface ExtRec extends Record<string, { a: number }> {
  id: { a: number };
}
declare class Bag {
  [k: string]: { a: number };
}

type _MixedShapes = [
  Expect<Equal<Paths<{ m: Mixed }>, 'm' | `m.${string}`>>,
  Expect<Equal<Paths<{ m: MixedObj }>, 'm' | `m.${string}`>>,
  Expect<Equal<Paths<{ e: ExtRec }>, 'e' | `e.${string}`>>,
  Expect<Equal<Paths<{ b: Bag }>, 'b' | `b.${string}`>>,
  Expect<
    Equal<Paths<{ i: { a: 1 } & Record<string, unknown> }>, 'i' | `i.${string}`>
  >,
  Expect<
    Equal<
      Paths<{ i: { a: { b: string } } & Record<string, { b: string }> }>,
      'i' | `i.${string}`
    >
  >,
];

// ── Empty and exotic key domains produce no sub-paths at all ──────────────
type _EmptyAndOdd = [
  Expect<Equal<Paths<{ r: Record<never, { a: 1 }> }>, 'r'>>,
  Expect<Equal<Paths<{ r: {} }>, 'r'>>,
  Expect<Equal<Paths<{ r: object }>, 'r'>>,
  // Symbol keys have no string form; `PropertyKey` keeps only the `${string}`
  // member (its `${number}` twin is absorbed by it).
  Expect<Equal<Paths<{ r: Record<PropertyKey, Obj> }>, 'r' | `r.${string}`>>,
  Expect<
    Equal<
      Paths<{ r: Record<string, Record<string, Obj>> }>,
      'r' | `r.${string}`
    >
  >,
  Expect<
    Equal<
      Paths<{ r: Record<string, Record<'a', { b: number }>> }>,
      'r' | `r.${string}`
    >
  >,
  Expect<
    Equal<
      Paths<{ r: Record<'a', Record<string, { b: number }>> }>,
      'r' | 'r.a' | `r.a.${string}`
    >
  >,
  Expect<
    Equal<
      Paths<{ r: Record<'a', Record<'b', { c: number }>> }>,
      'r' | 'r.a' | 'r.a.b' | 'r.a.b.c'
    >
  >,
];

// ── `depth` truncates record levels like any other object level ───────────
type Chain = Record<'a', Record<'b', Record<'c', { d: string }>>>;

type _Depth = [
  Expect<Equal<Paths<{ r: Record<'a', { b: number }> }, { depth: 1 }>, 'r'>>,
  Expect<
    Equal<Paths<{ r: Record<'a', { b: number }> }, { depth: 2 }>, 'r' | 'r.a'>
  >,
  Expect<
    Equal<
      Paths<{ r: Record<'a', { b: number }> }, { depth: 3 }>,
      'r' | 'r.a' | 'r.a.b'
    >
  >,
  Expect<Equal<Paths<{ r: Chain }, { depth: 2 }>, 'r' | 'r.a'>>,
  Expect<
    Equal<
      Paths<{ r: Chain }, { depth: 16 }>,
      'r' | 'r.a' | 'r.a.b' | 'r.a.b.c' | 'r.a.b.c.d'
    >
  >,
  // A `${string}` key is already absorbing, so depth changes nothing past 1.
  Expect<Equal<Paths<{ r: Record<string, Obj> }, { depth: 1 }>, 'r'>>,
  Expect<
    Equal<Paths<{ r: Record<string, Obj> }, { depth: 2 }>, 'r' | `r.${string}`>
  >,
  Expect<
    Equal<
      Paths<{ r: Record<'a', Record<string, { b: number }>> }, { depth: 2 }>,
      'r' | 'r.a'
    >
  >,
];

// ── `Get` through a string signature: any segment hits, depth is unbounded ─
interface S {
  r: Record<string, Obj>;
  p: Record<string, string>;
  u: Record<string, unknown>;
  n: Record<string, never>;
  sl: Record<string, Record<'a', { b: number }>>;
  ls: Record<'a', Record<string, { b: number }>>;
  m: Mixed;
  mo: MixedObj;
  er: ExtRec;
  bag: Bag;
  i: { a: 1 } & Record<string, unknown>;
  i2: { a: { b: string } } & Record<string, { b: string }>;
  e: {};
  o: object;
  pk: Record<PropertyKey, Obj>;
  nk: Record<never, Obj>;
}

type _GetStringSignature = [
  Expect<Equal<Get<S, 'r'>, Record<string, Obj>>>,
  Expect<Equal<Get<S, 'r.anything'>, Obj>>,
  Expect<Equal<Get<S, 'r.anything.a'>, number>>,
  Expect<Equal<Get<S, 'r.a.b.c'>, string>>,
  Expect<Equal<Get<S, `r.${string}`>, Obj>>,
  Expect<Equal<Get<S, `r.${string}.a`>, number>>,
  Expect<Equal<Get<S, 'p.whatever'>, string>>,
  // Past a primitive value it is a miss, same as any other leaf.
  Expect<Equal<Get<S, 'p.whatever.nope'>, never>>,
  Expect<Equal<Get<S, 'u.k'>, unknown>>,
  Expect<Equal<Get<S, 'n.k'>, never>>,
  Expect<Equal<Get<S, 'sl.k.a.b'>, number>>,
  Expect<Equal<Get<S, 'ls.a.k.b'>, number>>,
  Expect<Equal<Get<S, 'sl.k.zzz'>, never>>,
  Expect<Equal<Get<S, 'zzz'>, never>>,
  // A declared key next to a signature still resolves to its own type.
  Expect<Equal<Get<S, 'm.id'>, number>>,
  Expect<Equal<Get<S, 'm.other'>, string | number>>,
  Expect<Equal<Get<S, 'mo.id'>, number>>,
  Expect<Equal<Get<S, 'mo.other'>, number | { a: string }>>,
  Expect<Equal<Get<S, 'i.a'>, 1>>,
  Expect<Equal<Get<S, 'i.other'>, unknown>>,
  Expect<Equal<Get<S, 'i2.a.b'>, string>>,
  Expect<Equal<Get<S, 'i2.other.b'>, string>>,
  // An interface extending a record, and a class index signature, resolve the
  // declared key and the signature to the same value type.
  Expect<Equal<Get<S, 'er.id'>, { a: number }>>,
  Expect<Equal<Get<S, 'er.other'>, { a: number }>>,
  Expect<Equal<Get<S, 'er.other.a'>, number>>,
  Expect<Equal<Get<S, 'bag.x'>, { a: number }>>,
  Expect<Equal<Get<S, 'bag.x.a'>, number>>,
  // No index signature, no key: a miss.
  Expect<Equal<Get<S, 'e.x'>, never>>,
  Expect<Equal<Get<S, 'o.x'>, never>>,
  Expect<Equal<Get<S, 'nk.a'>, never>>,
  Expect<Equal<Get<S, 'pk.x.a'>, number>>,
];

// ── `Get` through template and literal keys: only matching segments hit ───
interface K {
  t: Record<`k${number}`, { a: string }>;
  d: Record<`data-${string}`, { v: number }>;
  m: Record<`${string}-${string}`, string>;
  lit: Record<'a' | 'b', { v: number }>;
  only: Record<'only', string>;
  up: Record<Uppercase<'a' | 'b'>, { v: 1 }>;
  cap: Record<`on${Capitalize<'click'>}`, { v: 1 }>;
}

type _GetKeyed = [
  Expect<Equal<Get<K, 't.k1'>, { a: string }>>,
  Expect<Equal<Get<K, 't.k1.a'>, string>>,
  Expect<Equal<Get<K, `t.k${number}`>, { a: string }>>,
  Expect<Equal<Get<K, 't.nope'>, never>>,
  Expect<Equal<Get<K, 'd.data-x.v'>, number>>,
  Expect<Equal<Get<K, 'd.other'>, never>>,
  Expect<Equal<Get<K, 'm.a-b'>, string>>,
  Expect<Equal<Get<K, 'lit.a.v'>, number>>,
  Expect<Equal<Get<K, 'lit.c'>, never>>,
  Expect<Equal<Get<K, 'only.only'>, string>>,
  // A resolvable template key behaves as the literals it expands to.
  Expect<Equal<Get<K, 'up.A.v'>, 1>>,
  Expect<Equal<Get<K, 'up.C'>, never>>,
  Expect<Equal<Get<K, 'cap.onClick.v'>, 1>>,
  Expect<Equal<Get<K, 'cap.onclick'>, never>>,
];

// ── Wrapped values resolve with the wrapper's `undefined` still attached ──
interface W {
  ro: Readonly<Record<'a', { v: number }>>;
  req: Required<Partial<Record<'a', { v: number }>>>;
  par: Partial<Record<string, { v: number }>>;
  vu: Record<string, { v: number } | undefined>;
  plit: Partial<Record<'a' | 'b', { v: number }>>;
}

type _GetWrapped = [
  Expect<Equal<Get<W, 'ro.a.v'>, number>>,
  Expect<Equal<Get<W, 'req.a.v'>, number>>,
  Expect<Equal<Get<W, 'par.k'>, { v: number } | undefined>>,
  Expect<Equal<Get<W, 'vu.k'>, { v: number } | undefined>>,
  Expect<Equal<Get<W, 'plit.a'>, { v: number } | undefined>>,
  // `Partial<Record<string, V>>` and `Record<string, V | undefined>` resolve
  // to the same value type.
  Expect<Equal<Get<W, 'par.k'>, Get<W, 'vu.k'>>>,
];

// ── Past an optional or nullable value the lookup distributes; no `undefined` ─
type _GetThroughOptional = [
  Expect<
    Equal<Get<{ r: Partial<Record<'a', { v: number }>> }, 'r.a.v'>, number>
  >,
  Expect<
    Equal<
      GetStrict<{ r: Partial<Record<'a', { v: number }>> }, 'r.a.v'>,
      number
    >
  >,
  Expect<
    Equal<
      Get<{ r: Record<string, { v: number } | undefined> }, 'r.k.v'>,
      number
    >
  >,
  Expect<
    Equal<Get<{ r: Partial<Record<string, { v: number }>> }, 'r.k.v'>, number>
  >,
  // A nullable or optional record itself resolves to the non-nullable member.
  Expect<
    Equal<Get<{ r: Record<'a', { v: number }> | null }, 'r.a'>, { v: number }>
  >,
  Expect<Equal<Get<{ r: Record<'a', { v: number }> | null }, 'r.a.v'>, number>>,
  Expect<Equal<Get<{ r?: Record<'a', { v: number }> }, 'r.a'>, { v: number }>>,
  Expect<Equal<Get<{ r?: Record<'a', { v: number }> }, 'r.a.v'>, number>>,
];

// ── A union of records resolves each branch's own keys ────────────────────
type UnionRecs = { r: Record<'a', { v: 1 }> | Record<'b', { w: 2 }> };

type _GetUnionOfRecords = [
  Expect<Equal<Paths<UnionRecs>, 'r' | 'r.a' | 'r.b' | 'r.a.v' | 'r.b.w'>>,
  Expect<Equal<Get<UnionRecs, 'r.a'>, { v: 1 }>>,
  Expect<Equal<Get<UnionRecs, 'r.b'>, { w: 2 }>>,
  Expect<Equal<Get<UnionRecs, 'r.a.v'>, 1>>,
  Expect<Equal<Get<UnionRecs, 'r.zzz'>, never>>,
  Expect<Equal<GetStrict<UnionRecs, 'r.a.v'>, 1>>,
];

// ── `GetStrict`: a `${string}` key accepts any segment, literals do not ───
type _Strict = [
  Expect<Equal<GetStrict<S, 'r.anything'>, Obj>>,
  Expect<Equal<GetStrict<S, 'r.anything.a'>, number>>,
  Expect<Equal<GetStrict<S, `r.${string}`>, Obj>>,
  Expect<Equal<GetStrict<S, 'm.whatever'>, string | number>>,
  Expect<Equal<GetStrict<K, 'lit.a.v'>, number>>,
  Expect<Equal<GetStrict<K, `t.k${number}.a`>, string>>,
  Expect<Equal<GetStrict<W, 'ro.a.v'>, number>>,
  Expect<Equal<GetStrict<K, 'up.A.v'>, 1>>,
  Expect<Equal<GetStrict<K, 'cap.onClick.v'>, 1>>,
  Expect<Equal<GetStrict<S, 'mo.whatever'>, number | { a: string }>>,
  Expect<Equal<GetStrict<S, 'er.id.a'>, number>>,
  Expect<Equal<GetStrict<S, 'bag.x.a'>, number>>,
  Expect<Equal<GetStrict<S, 'i2.other.b'>, string>>,
  // `${string}` structurally matches strings containing dots, so it absorbs an
  // arbitrarily deep nonsense path past a primitive value.
  Expect<Equal<GetStrict<S, 'p.whatever.nope'>, never>>,
];

// @ts-expect-error a key outside the literal union
type _N1 = GetStrict<K, 'lit.c'>;
// @ts-expect-error a segment the key template cannot match
type _N2 = GetStrict<K, 't.x'>;
// @ts-expect-error `data-` prefix is required by the key template
type _N3 = GetStrict<K, 'd.other'>;
// @ts-expect-error past a literal record's leaf
type _N4 = GetStrict<K, 'lit.a.v.length'>;
// @ts-expect-error `Record<never, V>` has no keys
type _N5 = GetStrict<S, 'nk.a'>;
// @ts-expect-error `{}` has no keys
type _N6 = GetStrict<S, 'e.x'>;
// @ts-expect-error `object` has no keys
type _N7 = GetStrict<S, 'o.x'>;
// @ts-expect-error not a property of the root at all
type _N8 = GetStrict<S, 'nope'>;
// @ts-expect-error empty path
type _N9 = GetStrict<S, ''>;
// @ts-expect-error outside the expanded template key union
type _N10 = GetStrict<K, 'up.C'>;

// ── A key containing the separator is joined like any other key ───────────
type DotKey = { r: { 'a.b': { c: number } } };

type _DotInKey = [
  Expect<Equal<Paths<DotKey>, 'r' | 'r.a.b' | 'r.a.b.c'>>,
  Expect<
    Equal<Paths<{ r: Record<'a.b', { c: number }> }>, 'r' | 'r.a.b' | 'r.a.b.c'>
  >,
  // `Get` splits on '.', so a dotted key is listed by `Paths` but structurally
  // unresolvable; `GetStrict` compiles it anyway and gives `never`.
  Expect<Equal<Get<DotKey, 'r.a.b'>, never>>,
  Expect<Equal<Get<DotKey, 'r.a.b.c'>, never>>,
  Expect<Equal<GetStrict<DotKey, 'r.a.b'>, never>>,
];

// ── An empty-string key produces a trailing-dot path, and it resolves ─────
type EmptyKey = { r: Record<'', string> };
type EmptyDeep = { r: Record<'', { v: 1 }> };

type _EmptyStringKey = [
  Expect<Equal<Paths<EmptyKey>, 'r' | 'r.'>>,
  Expect<Equal<Get<EmptyKey, 'r.'>, string>>,
  Expect<Equal<GetStrict<EmptyKey, 'r.'>, string>>,
  Expect<Equal<Paths<EmptyDeep>, 'r' | 'r.' | 'r..v'>>,
  Expect<Equal<Get<EmptyDeep, 'r..v'>, 1>>,
];

// ── Intended limitation: a trailing dot substitutes '' into `${string}` ────
type _TrailingDot = [
  Expect<Equal<Get<{ r: Record<string, { v: number }> }, 'r.'>, { v: number }>>,
  Expect<
    Equal<GetStrict<{ r: Record<string, { v: number }> }, 'r.'>, { v: number }>
  >,
];

// ── Spaces, punctuation and unicode in keys pass through untouched ────────
type _OddKeys = [
  Expect<Equal<Paths<{ r: { 'a b': { c: 1 } } }>, 'r' | 'r.a b' | 'r.a b.c'>>,
  Expect<Equal<Get<{ r: { 'a b': { c: 1 } } }, 'r.a b.c'>, 1>>,
  Expect<Equal<GetStrict<{ r: Record<'a b', { v: 1 }> }, 'r.a b.v'>, 1>>,
  Expect<
    Equal<
      Paths<{ r: Record<'Content-Type' | '@id', { v: 1 }> }>,
      'r' | 'r.Content-Type' | 'r.@id' | 'r.Content-Type.v' | 'r.@id.v'
    >
  >,
  Expect<
    Equal<Get<{ r: Record<'Content-Type', { v: 1 }> }, 'r.Content-Type.v'>, 1>
  >,
  Expect<
    Equal<
      Paths<{ r: Record<' ' | '🚩', { v: 1 }> }>,
      'r' | 'r. ' | 'r.🚩' | 'r. .v' | 'r.🚩.v'
    >
  >,
];

// ── Template keys keep their pattern under wrappers and under `depth` ─────
type TemplDeep = { r: Record<`k${number}`, { a: { b: 1 } }> };

type _TemplateWrapped = [
  Expect<
    Equal<
      Paths<{ r: Partial<Record<`k${number}`, { v: 1 }>> }>,
      'r' | `r.k${number}` | `r.k${number}.v`
    >
  >,
  Expect<
    Equal<
      Paths<{ r: Readonly<Record<`data-${string}`, { v: 1 }>> }>,
      'r' | `r.data-${string}` | `r.data-${string}.v`
    >
  >,
  Expect<
    Equal<
      Paths<{ r: Required<Partial<Record<`k${number}`, { v: 1 }>>> }>,
      'r' | `r.k${number}` | `r.k${number}.v`
    >
  >,
  Expect<
    Equal<
      Paths<{ r: Record<`k${number}`, { v: 1 }> | null }>,
      'r' | `r.k${number}` | `r.k${number}.v`
    >
  >,
  Expect<
    Equal<
      Paths<{ r?: Record<`k${number}`, { v: 1 }> }>,
      'r' | `r.k${number}` | `r.k${number}.v`
    >
  >,
  Expect<
    Equal<
      Get<{ r: Partial<Record<`k${number}`, { v: 1 }>> }, 'r.k1'>,
      { v: 1 } | undefined
    >
  >,
  Expect<Equal<Paths<TemplDeep, { depth: 1 }>, 'r'>>,
  Expect<Equal<Paths<TemplDeep, { depth: 2 }>, 'r' | `r.k${number}`>>,
  Expect<
    Equal<
      Paths<TemplDeep, { depth: 3 }>,
      'r' | `r.k${number}` | `r.k${number}.a`
    >
  >,
];

// ── A template signature does NOT absorb a declared key; both survive ─────
interface TemplMixed {
  id: number;
  [k: `data-${string}`]: number | { v: string };
}
interface TemplUniform {
  id: number;
  [k: `data-${string}`]: { v: string };
}

type _TemplateSignatureMix = [
  Expect<
    Equal<
      Paths<{ m: TemplMixed }>,
      'm' | 'm.id' | `m.data-${string}` | `m.data-${string}.v`
    >
  >,
  Expect<
    Equal<
      Paths<{ m: TemplUniform }>,
      'm' | 'm.id' | `m.data-${string}` | `m.data-${string}.v`
    >
  >,
  Expect<Equal<Get<{ m: TemplMixed }, 'm.id'>, number>>,
  Expect<Equal<Get<{ m: TemplMixed }, 'm.data-x'>, number | { v: string }>>,
  Expect<Equal<Get<{ m: TemplMixed }, 'm.other'>, never>>,
  Expect<Equal<Get<{ m: TemplUniform }, 'm.data-x.v'>, string>>,
  Expect<Equal<GetStrict<{ m: TemplMixed }, 'm.id'>, number>>,
];

// ── Several non-string signatures on one type each keep their own pattern ─
interface TwoTempl {
  [k: `a${string}`]: { x: 1 };
  [k: `b${string}`]: { y: 2 };
}
interface TemplNum {
  [k: `k${string}`]: { x: 1 };
  [k: number]: { y: 2 };
}

type _MultipleSignatures = [
  Expect<
    Equal<
      Paths<{ m: TwoTempl }>,
      | 'm'
      | `m.a${string}`
      | `m.b${string}`
      | `m.a${string}.x`
      | `m.b${string}.y`
    >
  >,
  Expect<
    Equal<
      Paths<{ m: TemplNum }>,
      'm' | `m.${number}` | `m.k${string}` | `m.${number}.y` | `m.k${string}.x`
    >
  >,
  Expect<Equal<Get<{ m: TwoTempl }, 'm.az.x'>, 1>>,
  Expect<Equal<Get<{ m: TwoTempl }, 'm.bz.y'>, 2>>,
  Expect<Equal<Get<{ m: TemplNum }, 'm.k1.x'>, 1>>,
  Expect<Equal<Get<{ m: TemplNum }, 'm.7.y'>, 2>>,
];

// ── A key union mixing a literal with a template keeps both halves ────────
type LitTempl = { r: Record<'a' | `k${number}`, { v: 1 }> };

type _LiteralPlusTemplate = [
  Expect<
    Equal<
      Paths<LitTempl>,
      'r' | 'r.a' | 'r.a.v' | `r.k${number}` | `r.k${number}.v`
    >
  >,
  Expect<Equal<Get<LitTempl, 'r.a.v'>, 1>>,
  Expect<Equal<Get<LitTempl, 'r.k9.v'>, 1>>,
];

// ── An unresolvable intrinsic stays in the path as an intrinsic ───────────
type _WideIntrinsicKeys = [
  Expect<
    Equal<
      Paths<{ r: Record<Uppercase<string>, { v: 1 }> }>,
      'r' | `r.${Uppercase<string>}` | `r.${Uppercase<string>}.v`
    >
  >,
  Expect<
    Equal<
      Paths<{ r: Record<Capitalize<string>, { v: 1 }> }>,
      'r' | `r.${Capitalize<string>}` | `r.${Capitalize<string>}.v`
    >
  >,
  Expect<Equal<Get<{ r: Record<Uppercase<string>, { v: 1 }> }, 'r.ABC.v'>, 1>>,
];

// ── A template SEGMENT mid-path resolves the keys after it ────────────────
type DataRec = { d: Record<`data-${string}`, { v: number }> };

type _TemplateSegment = [
  Expect<Equal<Get<DataRec, `d.data-${string}`>, { v: number }>>,
  Expect<Equal<Get<DataRec, `d.data-${string}.v`>, number>>,
  Expect<Equal<GetStrict<DataRec, `d.data-${string}.v`>, number>>,
];
