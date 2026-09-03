/**
 * Cross-family compositions: records inside arrays, arrays inside records,
 * tuples inside both, and the optional/nullable/union layers users stack on
 * top of them. Each family is covered on its own elsewhere; what this file
 * pins is how they behave when nested through each other: where `${string}`
 * absorbs a subtree, where `${number}` keeps enumerating, and where the
 * `Paths` to `Get` round trip still holds.
 *
 * Pure type-level; `tsc` is the test.
 */
import type { Get, GetStrict, Paths } from '../src/index';

type Equal<A, B> =
  (<T>() => T extends A ? 1 : 2) extends <T>() => T extends B ? 1 : 2
    ? true
    : false;
type Expect<T extends true> = T;

interface V {
  a: string;
  b: { c: number };
}

// ── String-keyed records absorb everything below them ────
// `r.${string}` is a supertype of every path under it, so TypeScript reduces
// the whole subtree into that one member. The deep paths are still *valid*
// (they match the template), just not separately listed.
type _StringRecords = [
  Expect<Equal<Paths<{ r: Record<string, V[]> }>, 'r' | `r.${string}`>>,
  Expect<Equal<Paths<{ r: Record<string, V[][]> }>, 'r' | `r.${string}`>>,
  Expect<
    Equal<
      Paths<{ r: Record<string, Array<Record<string, V>>> }>,
      'r' | `r.${string}`
    >
  >,
  Expect<
    Equal<
      Paths<{ r: Record<string, [string, { z: boolean }]> }>,
      'r' | `r.${string}`
    >
  >,
  Expect<
    Equal<Paths<{ r: Record<string, Record<number, V>> }>, 'r' | `r.${string}`>
  >,
  // Absorption is local: a sibling key keeps its own enumerated paths.
  Expect<
    Equal<
      Paths<{ r: Record<string, V>; other: { x: number } }>,
      'r' | `r.${string}` | 'other' | 'other.x'
    >
  >,
];

// ── Numeric-keyed records enumerate through every layer ──
// `${number}` is not a supertype of `${number}.a`, so unlike `${string}` the
// sub-paths survive and each nested family adds its own segment.
type _NumericRecords = [
  Expect<
    Equal<
      Paths<{ r: Record<number, V[]> }>,
      | 'r'
      | `r.${number}`
      | `r.${number}.${number}`
      | `r.${number}.${number}.a`
      | `r.${number}.${number}.b`
      | `r.${number}.${number}.b.c`
    >
  >,
  Expect<
    Equal<
      Paths<{ r: Record<number, string[]> }>,
      'r' | `r.${number}` | `r.${number}.${number}`
    >
  >,
  // A string record nested under a numeric one absorbs from that point down.
  Expect<
    Equal<
      Paths<{ r: Record<number, Record<string, V>> }>,
      'r' | `r.${number}` | `r.${number}.${string}`
    >
  >,
];

// ── Arrays of records, records of arrays, and both stacked ──
type _ArraysOfRecords = [
  Expect<
    Equal<
      Paths<{ r: Array<Record<string, V>> }>,
      'r' | `r.${number}` | `r.${number}.${string}`
    >
  >,
  Expect<
    Equal<
      Paths<{ r: ReadonlyArray<Record<number, V>> }>,
      | 'r'
      | `r.${number}`
      | `r.${number}.${number}`
      | `r.${number}.${number}.a`
      | `r.${number}.${number}.b`
      | `r.${number}.${number}.b.c`
    >
  >,
  Expect<
    Equal<
      Paths<{ r: Array<Array<Record<number, V>>> }>,
      | 'r'
      | `r.${number}`
      | `r.${number}.${number}`
      | `r.${number}.${number}.${number}`
      | `r.${number}.${number}.${number}.a`
      | `r.${number}.${number}.${number}.b`
      | `r.${number}.${number}.${number}.b.c`
    >
  >,
  Expect<
    Equal<
      Paths<Array<{ id: number; meta?: Record<number, { t: string }> }>>,
      | `${number}`
      | `${number}.id`
      | `${number}.meta`
      | `${number}.meta.${number}`
      | `${number}.meta.${number}.t`
    >
  >,
];

// ── Tuples inside records, records inside tuples ─────────
// Tuples go through the array branch, so slots are `${number}` and the
// element types are unioned, so a record slot contributes its own keys.
type _TuplesAndRecords = [
  Expect<
    Equal<
      Paths<{ t: [Record<string, V>, number] }>,
      't' | `t.${number}` | `t.${number}.${string}`
    >
  >,
  Expect<
    Equal<
      Paths<{ t: [Record<number, string>, boolean] }>,
      't' | `t.${number}` | `t.${number}.${number}`
    >
  >,
  Expect<
    Equal<
      Paths<{ r: Record<number, [string, { z: boolean }]> }>,
      'r' | `r.${number}` | `r.${number}.${number}` | `r.${number}.${number}.z`
    >
  >,
  Expect<
    Equal<
      Paths<{ t: readonly [Record<number, string>, V] }>,
      | 't'
      | `t.${number}`
      | `t.${number}.${number}`
      | `t.${number}.a`
      | `t.${number}.b`
      | `t.${number}.b.c`
    >
  >,
  // A rest element merges into the same `${number}` slot as the fixed prefix.
  Expect<
    Equal<
      Paths<{ t: [Record<number, string>, ...V[]] }>,
      | 't'
      | `t.${number}`
      | `t.${number}.${number}`
      | `t.${number}.a`
      | `t.${number}.b`
      | `t.${number}.b.c`
    >
  >,
  // An empty tuple has no slot to offer, so only the key itself is listed.
  Expect<Equal<Paths<{ t: [] }>, 't'>>,
  Expect<Equal<Paths<{ t: readonly [] }>, 't'>>,
  // At the root there is not even a key left, so the whole union is empty.
  Expect<Equal<Paths<[]>, never>>,
  Expect<Equal<Paths<readonly []>, never>>,
];

// ── Optional and nullable at each layer ──────────────────
// `Paths` strips `null`/`undefined` per key (`NonNullable<T[K]>`), so an
// optional or nullable layer never shortens the enumeration.
type _OptionalLayers = [
  Expect<
    Equal<
      Paths<{ r: Record<number, V[] | null> }>,
      Paths<{ r: Record<number, V[]> }>
    >
  >,
  Expect<
    Equal<
      Paths<{ r: Array<Record<number, V> | null> }>,
      Paths<{ r: Array<Record<number, V>> }>
    >
  >,
  Expect<
    Equal<
      Paths<{ r: Array<Record<number, V>> | null }>,
      Paths<{ r: Array<Record<number, V>> }>
    >
  >,
  Expect<
    Equal<
      Paths<{ r: Record<number, { list?: V[] }> }>,
      | 'r'
      | `r.${number}`
      | `r.${number}.list`
      | `r.${number}.list.${number}`
      | `r.${number}.list.${number}.a`
      | `r.${number}.list.${number}.b`
      | `r.${number}.list.${number}.b.c`
    >
  >,
  Expect<
    Equal<
      Paths<{ r: Record<number, { x?: { y: string } }> }>,
      'r' | `r.${number}` | `r.${number}.x` | `r.${number}.x.y`
    >
  >,
  Expect<Equal<Paths<{ r: Array<V | undefined> }>, Paths<{ r: V[] }>>>,
  // Same for the string-keyed analogues, where absorption hides the layer too.
  Expect<
    Equal<
      Paths<{ r: Record<string, V[] | null> }>,
      Paths<{ r: Record<string, V[]> }>
    >
  >,
  Expect<
    Equal<
      Paths<{ r: (Record<string, V> | null)[] }>,
      Paths<{ r: Array<Record<string, V>> }>
    >
  >,
];

// ── `Get` reaches through a nullable or optional layer ───
// `Get` distributes over union members and drops `null`/`undefined`, so the
// paths `Paths` enumerates through a nullable record now resolve to the
// member's value type, with no `| undefined` of their own.
type _NullableLayerGets = [
  Expect<Equal<Get<{ r: Record<number, V> | null }, `r.${number}`>, V>>,
  Expect<Equal<Get<{ r?: Record<number, V> }, `r.${number}.a`>, string>>,
  Expect<
    Equal<Get<{ r: Record<number, V> | undefined }, `r.${number}.b.c`>, number>
  >,
  Expect<
    Equal<
      Get<Partial<{ list: V[]; byId: Record<number, V> }>, `byId.${number}.a`>,
      string
    >
  >,
  // The whole member still carries its `null` when read as a whole.
  Expect<
    Equal<Get<{ r: Record<number, V> | null }, 'r'>, Record<number, V> | null>
  >,
];

type DUElement = { k: 'a'; x: string } | { k: 'b'; y: number };

// ── Unions across families ───────────────────────────────
// The recursion distributes over the union, so every member contributes its
// paths to one flat set: the array's `${number}` beside the object's keys.
type _CrossFamilyUnions = [
  Expect<
    Equal<
      Paths<{ u: Record<number, V> | V[] }>,
      | 'u'
      | `u.${number}`
      | `u.${number}.a`
      | `u.${number}.b`
      | `u.${number}.b.c`
    >
  >,
  Expect<
    Equal<
      Paths<{ u: Record<number, V> | { a: 1 } }>,
      | 'u'
      | 'u.a'
      | `u.${number}`
      | `u.${number}.a`
      | `u.${number}.b`
      | `u.${number}.b.c`
    >
  >,
  Expect<
    Equal<
      Paths<{ u: V[] | { a: 1 } }>,
      | 'u'
      | 'u.a'
      | `u.${number}`
      | `u.${number}.a`
      | `u.${number}.b`
      | `u.${number}.b.c`
    >
  >,
  // A string record on either side of the union absorbs the rest.
  Expect<
    Equal<Paths<{ u: Record<string, V> | { a: 1 } }>, 'u' | `u.${string}`>
  >,
  // The array side is absorbed too: `${string}` swallows the `${number}` slot.
  Expect<Equal<Paths<{ u: Record<string, V> | V[] }>, 'u' | `u.${string}`>>,
  // Discriminated unions: every member's keys are offered under one slot.
  Expect<
    Equal<
      Paths<{ u: Array<{ k: 'a'; x: string } | { k: 'b'; y: number }> }>,
      'u' | `u.${number}` | `u.${number}.k` | `u.${number}.x` | `u.${number}.y`
    >
  >,
  Expect<
    Equal<
      Paths<{
        u: Record<number, { k: 'a'; x: string } | { k: 'b'; y: number }>;
      }>,
      Paths<{ u: Array<{ k: 'a'; x: string } | { k: 'b'; y: number }> }>
    >
  >,
];

// ── `Get` on a key that only one union member has ────────
// The lookup distributes per member instead of intersecting `keyof` over the
// whole union, so a key carried by a single member resolves to that member's
// type. The old array fallback is gone with it: an array beside an object no
// longer answers for the object's key.
type _UnionMemberKeys = [
  Expect<Equal<Get<{ u: V[] | { a: 1 } }, 'u.a'>, 1>>,
  Expect<Equal<Get<{ u: Record<number, V> | { a: 1 } }, 'u.a'>, 1>>,
  Expect<
    Equal<Get<{ u: Record<number, V> | { a: 1 } }, `u.${number}.b.c`>, number>
  >,
  // A segment no member has is still a miss, on an array as anywhere else.
  Expect<Equal<Get<{ list: V[] }, 'list.first'>, never>>,
  Expect<Equal<Get<V[], 'first'>, never>>,
];

// ── Member-specific fields of a discriminated element ────
// The discriminant already resolved; the per-member fields do too now, each
// to the type its own member declares.
type _DiscriminatedElements = [
  Expect<Equal<Get<{ u: DUElement[] }, `u.${number}.k`>, 'a' | 'b'>>,
  Expect<Equal<Get<{ u: DUElement[] }, `u.${number}.x`>, string>>,
  Expect<Equal<Get<{ u: DUElement[] }, `u.${number}.y`>, number>>,
];

// ── A tuple slot read through the generic `${number}` ────
// The generic index form `Paths` actually emits now resolves the same as the
// concrete one, so the `Paths` to `Get` round trip holds for tuples nested in
// a numeric record.
type _TupleSlotGets = [
  Expect<
    Equal<
      Get<
        { r: Record<number, [string, { z: boolean }]> },
        `r.${number}.${number}.z`
      >,
      boolean
    >
  >,
  Expect<
    Equal<
      Get<{ r: Record<number, [string, { z: boolean }]> }, `r.${number}.1.z`>,
      boolean
    >
  >,
];

// ── Exotic and empty payloads inside compositions ────────
// Leaves stay leaves however deeply they are wrapped.
type _ExoticPayloads = [
  Expect<
    Equal<Paths<{ r: Record<number, Map<string, V>> }>, 'r' | `r.${number}`>
  >,
  Expect<
    Equal<Paths<{ r: Record<string, Set<number>[]> }>, 'r' | `r.${string}`>
  >,
  Expect<Equal<Paths<{ r: Record<number, {}> }>, 'r' | `r.${number}`>>,
];

// ── Partial / Required / Readonly over compositions ──────
// The modifiers change assignability, not structure, so paths are unchanged.
interface Comp {
  list: V[];
  byId: Record<number, V>;
  t: [string, V];
}
type _Modifiers = [
  Expect<Equal<Paths<Partial<Comp>>, Paths<Comp>>>,
  Expect<Equal<Paths<Readonly<Comp>>, Paths<Comp>>>,
  Expect<
    Equal<
      Paths<Required<{ list?: V[]; byId?: Record<number, V> }>>,
      Paths<{ list: V[]; byId: Record<number, V> }>
    >
  >,
  Expect<
    Equal<
      Paths<{ r: Record<number, Partial<V>> }>,
      Paths<{ r: Record<number, V> }>
    >
  >,
];

// ── A generic wrapper instantiated with an object type ───
interface Wrapper<T> {
  data: T[];
  byId: Record<string, T>;
}
type _GenericWrapper = [
  Expect<
    Equal<
      Paths<Wrapper<V>>,
      | 'data'
      | 'byId'
      | `byId.${string}`
      | `data.${number}`
      | `data.${number}.a`
      | `data.${number}.b`
      | `data.${number}.b.c`
    >
  >,
  Expect<
    Equal<
      Paths<Wrapper<Wrapper<{ n: number }>>>,
      | 'data'
      | 'byId'
      | `byId.${string}`
      | `data.${number}`
      | `data.${number}.data`
      | `data.${number}.byId`
      | `data.${number}.data.${number}`
      | `data.${number}.data.${number}.n`
      | `data.${number}.byId.${string}`
    >
  >,
  Expect<Equal<Get<Wrapper<V>, `data.${number}.b.c`>, number>>,
  Expect<Equal<Get<Wrapper<V>, `byId.${string}.a`>, string>>,
  Expect<Equal<Get<Wrapper<V>, 'byId.anything.b.c'>, number>>,
  Expect<
    Equal<
      Get<Wrapper<Wrapper<{ n: number }>>, `data.${number}.data.${number}.n`>,
      number
    >
  >,
];

// ── Roots that are themselves compositions ───────────────
type _CompositionRoots = [
  Expect<
    Equal<Paths<Array<Record<string, V>>>, `${number}` | `${number}.${string}`>
  >,
  Expect<
    Equal<
      Paths<Array<Record<number, V>>>,
      | `${number}`
      | `${number}.${number}`
      | `${number}.${number}.a`
      | `${number}.${number}.b`
      | `${number}.${number}.b.c`
    >
  >,
  Expect<Equal<Paths<Record<number, V[]>>, Paths<Array<Record<number, V>>>>>,
  Expect<
    Equal<
      Paths<[Record<number, string>, V[]]>,
      | `${number}`
      | `${number}.${number}`
      | `${number}.${number}.a`
      | `${number}.${number}.b`
      | `${number}.${number}.b.c`
    >
  >,
  Expect<
    Equal<
      Paths<Record<number, V> | V[]>,
      `${number}` | `${number}.a` | `${number}.b` | `${number}.b.c`
    >
  >,
  Expect<Equal<Get<Array<Record<string, V>>, `${number}.${string}.a`>, string>>,
  Expect<
    Equal<Get<Array<Record<number, V>>, `${number}.${number}.b.c`>, number>
  >,
];

// ── Depth truncation across mixed layers ─────────────────
// Every layer costs one, whatever family it belongs to: a record segment, an
// array segment and an object segment are all worth the same budget.
interface Mixed {
  r: Record<number, Array<{ inner: { deep: { x: string } } }>>;
}
type _Depth = [
  Expect<Equal<Paths<Mixed, { depth: 1 }>, 'r'>>,
  Expect<Equal<Paths<Mixed, { depth: 2 }>, 'r' | `r.${number}`>>,
  Expect<
    Equal<
      Paths<Mixed, { depth: 3 }>,
      'r' | `r.${number}` | `r.${number}.${number}`
    >
  >,
  Expect<
    Equal<
      Paths<Mixed, { depth: 4 }>,
      | 'r'
      | `r.${number}`
      | `r.${number}.${number}`
      | `r.${number}.${number}.inner`
    >
  >,
  // Five layers deep, so the default 8 already reaches the leaf and 16 adds
  // nothing.
  Expect<Equal<Paths<Mixed>, Paths<Mixed, { depth: 16 }>>>,
  Expect<
    Equal<
      Paths<Mixed>,
      | 'r'
      | `r.${number}`
      | `r.${number}.${number}`
      | `r.${number}.${number}.inner`
      | `r.${number}.${number}.inner.deep`
      | `r.${number}.${number}.inner.deep.x`
    >
  >,
];

// ── The default depth of 8 truncates a mixed chain ───────
interface Deep8 {
  a: Record<
    number,
    { b: Array<{ c: Record<number, { d: { e: { f: string } } }> }> }
  >;
}
type _DepthDefault = [
  Expect<
    Equal<
      Paths<Deep8>,
      | 'a'
      | `a.${number}`
      | `a.${number}.b`
      | `a.${number}.b.${number}`
      | `a.${number}.b.${number}.c`
      | `a.${number}.b.${number}.c.${number}`
      | `a.${number}.b.${number}.c.${number}.d`
      | `a.${number}.b.${number}.c.${number}.d.e`
    >
  >,
  // Raising the cap recovers the last segment.
  Expect<
    Equal<
      Paths<Deep8, { depth: 16 }>,
      Paths<Deep8> | `a.${number}.b.${number}.c.${number}.d.e.f`
    >
  >,
  // `Get` has no cap, so the truncated path still resolves.
  Expect<
    Equal<Get<Deep8, `a.${number}.b.${number}.c.${number}.d.e.f`>, string>
  >,
];

// ── `Get` through composed layers ────────────────────────
type _GetRoundTrips = [
  Expect<
    Equal<Get<{ r: Record<string, V[]> }, `r.${string}.${number}.a`>, string>
  >,
  Expect<Equal<Get<{ r: Record<string, V[]> }, 'r.anything.0.a'>, string>>,
  Expect<
    Equal<Get<{ r: Record<number, V[]> }, `r.${number}.${number}.b.c`>, number>
  >,
  Expect<
    Equal<
      Get<{ r: Record<string, V[][]> }, `r.${string}.${number}.${number}.a`>,
      string
    >
  >,
  Expect<
    Equal<
      Get<{ r: Array<Record<string, V>> }, `r.${number}.${string}.a`>,
      string
    >
  >,
  Expect<
    Equal<
      Get<
        { r: Array<Array<Record<number, V>>> },
        `r.${number}.${number}.${number}.a`
      >,
      string
    >
  >,
  Expect<
    Equal<
      Get<
        { r: Record<number, Record<string, V>> },
        `r.${number}.${string}.b.c`
      >,
      number
    >
  >,
  // A nullable ARRAY member still resolves: the per-member distribution drops
  // the `null` side and the array element indexes normally.
  Expect<
    Equal<
      Get<{ r: Record<number, V[] | null> }, `r.${number}.${number}.a`>,
      string
    >
  >,
  // An optional leaf keeps its `undefined` when read as a whole.
  Expect<
    Equal<
      Get<{ r: Record<number, { list?: V[] }> }, `r.${number}.list`>,
      V[] | undefined
    >
  >,
  Expect<
    Equal<
      Get<
        { r: Record<number, { list?: V[] }> },
        `r.${number}.list.${number}.a`
      >,
      string
    >
  >,
  // A fixed tuple slot read by `${number}` gives the union of the slots.
  Expect<
    Equal<
      Get<{ t: [Record<number, string>, { z: boolean }] }, `t.${number}`>,
      Record<number, string> | { z: boolean }
    >
  >,
  Expect<
    Equal<
      Get<{ r: Record<number, [string, { z: boolean }]> }, `r.${number}.1.z`>,
      boolean
    >
  >,
  Expect<
    Equal<Get<{ r: Record<'a' | 'b', V[]> }, `r.a.${number}.b.c`>, number>
  >,
  // A key outside a literal-key record is a miss.
  Expect<Equal<Get<{ r: Record<'a' | 'b', V> }, 'r.c'>, never>>,
  // Union members sharing a key resolve to the union of its types.
  Expect<
    Equal<Get<{ o: { x: string } | { x: number } }, 'o.x'>, string | number>
  >,
  Expect<Equal<Get<{ u: Record<number, V> | V[] }, `u.${number}`>, V>>,
  // Modifiers do not change resolution, except that `Partial` adds `undefined`.
  Expect<Equal<Get<Readonly<Comp>, `byId.${number}.b.c`>, number>>,
  Expect<Equal<Get<Required<{ list?: V[] }>, `list.${number}.a`>, string>>,
  Expect<Equal<Get<Partial<Comp>, 'list'>, V[] | undefined>>,
  Expect<Equal<Get<Partial<Comp>, `list.${number}.a`>, string>>,
];

// ── `GetStrict` round trips on a composed shape ──────────
interface Shape {
  groups: Record<number, V[]>;
  rows: Array<Record<number, { id: number }>>;
  wrap: Wrapper<V>;
  t: [Record<number, string>, { z: boolean }];
}
type _StrictRoundTrips = [
  Expect<Equal<GetStrict<Shape, `groups.${number}.${number}.b.c`>, number>>,
  Expect<Equal<GetStrict<Shape, `rows.${number}.${number}.id`>, number>>,
  Expect<Equal<GetStrict<Shape, `wrap.byId.${string}`>, V>>,
  Expect<Equal<GetStrict<Shape, 'wrap.data'>, V[]>>,
  Expect<
    Equal<
      GetStrict<Shape, `t.${number}`>,
      Record<number, string> | { z: boolean }
    >
  >,
  // Delegation: identical to the loose `Get` for every valid path.
  Expect<
    Equal<
      GetStrict<Shape, `groups.${number}.${number}.a`>,
      Get<Shape, `groups.${number}.${number}.a`>
    >
  >,
];

// ── `GetStrict` negatives on composed shapes ─────────────
// @ts-expect-error a numeric record is not indexable by a name
type _N1 = GetStrict<Shape, 'groups.first'>;
// @ts-expect-error wrong sub-key below two numeric layers
type _N2 = GetStrict<Shape, `groups.${number}.${number}.d`>;
// @ts-expect-error wrong sub-key of a record inside an array
type _N3 = GetStrict<Shape, `rows.${number}.${number}.nope`>;
// @ts-expect-error typo on a generic wrapper's field
type _N4 = GetStrict<Shape, 'wrap.dat'>;
// @ts-expect-error the tuple's element union has no such key
type _N5 = GetStrict<Shape, `t.${number}.q`>;
// @ts-expect-error descends past a leaf inside a composition
type _N6 = GetStrict<Shape, `groups.${number}.${number}.a.length`>;
// @ts-expect-error missing an array segment between the two records
type _N7 = GetStrict<Shape, `rows.${number}.id`>;

// ── Documented limitations of the round trip ─────────────
// Intended behavior, pinned so a change to any of it is deliberate.
type _KnownLimitations = [
  // A string index signature absorbs every path below it, so `GetStrict` has
  // nothing left to reject there.
  Expect<Equal<GetStrict<{ r: Record<string, V> }, 'r.k.nope.deeper'>, never>>,
  // At the root there is no prefix to keep the template distinct, so the whole
  // union is plain `string` and the constraint accepts anything.
  Expect<Equal<Paths<Record<string, V>>, string>>,
  Expect<Equal<GetStrict<Record<string, V>, string>, V>>,
  // A wide `${number}` on a rest tuple hits the fixed prefix's literal key, so
  // the rest element is left out; a literal index reads it fine.
  Expect<
    Equal<
      Get<{ t: [Record<number, string>, ...V[]] }, `t.${number}`>,
      Record<number, string>
    >
  >,
  Expect<Equal<Get<{ t: [Record<number, string>, ...V[]] }, 't.1'>, V>>,
  // so a sub-path of the rest element resolves by literal index only, even
  // though `Paths` lists the wide form and `GetStrict` accepts it
  Expect<
    Equal<Get<{ t: [Record<number, string>, ...V[]] }, `t.${number}.a`>, never>
  >,
  Expect<
    Equal<
      GetStrict<{ t: [Record<number, string>, ...V[]] }, `t.${number}.a`>,
      never
    >
  >,
  Expect<Equal<Get<{ t: [Record<number, string>, ...V[]] }, 't.1.a'>, string>>,
  // An out-of-range tuple index reads as `undefined`, not as a miss, and
  // `t.${number}` lets `GetStrict` accept it.
  Expect<
    Equal<
      Get<{ t: [Record<number, string>, { z: boolean }] }, 't.2'>,
      undefined
    >
  >,
  Expect<
    Equal<
      GetStrict<{ t: [Record<number, string>, { z: boolean }] }, 't.2'>,
      undefined
    >
  >,
  Expect<Equal<Get<{ t: [] }, 't.0'>, undefined>>,
];

// ── Full key-to-value maps ───────────────────────────────
// The round trip as a user actually consumes it: every enumerated path mapped
// to what `Get` returns for it.
interface Small {
  list: Array<{ id: number }>;
  byId: Record<number, { id: number }>;
}
interface SmallMap {
  list: Array<{ id: number }>;
  byId: Record<number, { id: number }>;
  [k: `list.${number}`]: { id: number };
  [k: `list.${number}.id`]: number;
  [k: `byId.${number}`]: { id: number };
  [k: `byId.${number}.id`]: number;
}
interface WrapperMap {
  data: Array<{ n: number }>;
  byId: Record<string, { n: number }>;
  [k: `data.${number}`]: { n: number };
  [k: `data.${number}.n`]: number;
  [k: `byId.${string}`]: { n: number };
}
interface NestedArrays {
  r: Record<number, string[]>;
}
interface NestedArraysMap {
  r: Record<number, string[]>;
  [k: `r.${number}`]: string[];
  [k: `r.${number}.${number}`]: string;
}
type _ValueMaps = [
  Expect<Equal<{ [P in Paths<Small>]: Get<Small, P> }, SmallMap>>,
  Expect<
    Equal<
      { [P in Paths<Wrapper<{ n: number }>>]: Get<Wrapper<{ n: number }>, P> },
      WrapperMap
    >
  >,
  Expect<
    Equal<{ [P in Paths<NestedArrays>]: Get<NestedArrays, P> }, NestedArraysMap>
  >,
];

// ── Non-object roots ─────────────────────────────────────
// `any` at the root behaves like a string index signature: every path is
// valid, which is what an untyped payload gets you. Everything else
// unenumerable yields `never`.
type _NonObjectRoots = [
  Expect<Equal<Paths<any>, string>>,
  Expect<Equal<Paths<unknown>, never>>,
  Expect<Equal<Paths<never>, never>>,
  Expect<Equal<Paths<object>, never>>,
  Expect<Equal<Paths<{}>, never>>,
  Expect<Equal<Paths<string>, never>>,
  Expect<Equal<Paths<number>, never>>,
  Expect<Equal<Paths<boolean>, never>>,
  Expect<Equal<Paths<null>, never>>,
  Expect<Equal<Paths<undefined>, never>>,
  Expect<Equal<Paths<void>, never>>,
  Expect<Equal<Get<any, 'a.b.c'>, any>>,
  Expect<Equal<Get<unknown, 'a'>, never>>,
];

// ── `any` and `unknown` mid-path ─────────────────────────
// An `any` field absorbs its subtree the way `Record<string, any>` does, and
// `Get` through it stays `any`. `unknown` is a dead end instead.
type _AnyMidPath = [
  Expect<Equal<Paths<{ a: any }>, 'a' | `a.${string}`>>,
  Expect<Equal<Get<{ a: any }, 'a'>, any>>,
  Expect<Equal<Get<{ a: any }, 'a.b.c'>, any>>,
  Expect<Equal<Paths<{ a: unknown }>, 'a'>>,
  Expect<Equal<Get<{ a: unknown }, 'a'>, unknown>>,
  Expect<Equal<Get<{ a: unknown }, 'a.b'>, never>>,
  // Absorption is local here too: the sibling still enumerates.
  Expect<
    Equal<Paths<{ a: any; b: { c: 1 } }>, 'a' | `a.${string}` | 'b' | 'b.c'>
  >,
  Expect<
    Equal<Paths<{ a: any[] }>, 'a' | `a.${number}` | `a.${number}.${string}`>
  >,
];

// ── Unions at the ROOT of `T` ────────────────────────────
// The recursion distributes at the root as well, so leaf members (`string`,
// `null`) contribute nothing and the object members' paths are unioned.
type _UnionRoots = [
  Expect<Equal<Paths<{ a: 1 } | string>, 'a'>>,
  Expect<Equal<Paths<{ a: 1 } | null>, 'a'>>,
  Expect<Equal<Paths<{ a: 1 } | undefined>, 'a'>>,
  Expect<Equal<Paths<{ a: 1 } | { b: 2 }>, 'a' | 'b'>>,
  Expect<Equal<Paths<string | number>, never>>,
  Expect<
    Equal<
      Paths<V[] | null>,
      `${number}` | `${number}.a` | `${number}.b` | `${number}.b.c`
    >
  >,
  Expect<
    Equal<
      Paths<{ a: { x: 1 } } | V[]>,
      | 'a'
      | 'a.x'
      | `${number}`
      | `${number}.a`
      | `${number}.b`
      | `${number}.b.c`
    >
  >,
  // The array root survives the `| null`: `Get` distributes per union member
  // and indexes directly on the surviving branch.
  Expect<Equal<Get<V[] | null, `${number}.a`>, string>>,
];

// ── Intersections of plain objects ───────────────────────
// `A & B` enumerates the merged key set; on a same-key collision both sides'
// sub-paths survive and `Get` returns the intersected value.
type _PlainIntersections = [
  Expect<Equal<Paths<{ a: { x: 1 } } & { b: 2 }>, 'a' | 'b' | 'a.x'>>,
  Expect<Equal<Paths<{ a: { x: 1 } } & { a: { y: 2 } }>, 'a' | 'a.x' | 'a.y'>>,
  Expect<Equal<Paths<{ a: 1 } & { a: 1 }>, 'a'>>,
  Expect<
    Equal<
      Paths<{ a: 1 } & { b: { c: 2 } } & { d: string[] }>,
      'a' | 'b' | 'b.c' | 'd' | `d.${number}`
    >
  >,
  Expect<Equal<Get<{ a: { x: 1 } } & { b: 2 }, 'a.x'>, 1>>,
  Expect<Equal<Get<{ a: { x: 1 } } & { a: { y: 2 } }, 'a.x'>, 1>>,
  Expect<Equal<Get<{ a: { x: 1 } } & { a: { y: 2 } }, 'a.y'>, 2>>,
  Expect<
    Equal<Get<{ a: { x: 1 } } & { a: { y: 2 } }, 'a'>, { x: 1 } & { y: 2 }>
  >,
];

// ── `P` as a union of paths ──────────────────────────────
// Picking several fields at once distributes to a union of their values. A
// member that misses contributes `never`, which vanishes from that union, so
// a typo alongside a valid path is silent. `GetStrict` is where you get the
// error.
type _UnionPaths = [
  Expect<
    Equal<Get<{ u: { n: string; g: number } }, 'u.n' | 'u.g'>, string | number>
  >,
  Expect<Equal<Get<{ a: { b: 1 }; c: 2 }, 'a.b' | 'c'>, 1 | 2>>,
  Expect<Equal<Get<{ a: { b: 1 } }, 'a' | 'zz'>, { b: 1 }>>,
  Expect<Equal<Get<{ a: { b: 1 } }, 'zz' | 'yy'>, never>>,
  Expect<
    Equal<
      Get<{ list: Array<{ id: number }> }, 'list' | `list.${number}.id`>,
      Array<{ id: number }> | number
    >
  >,
];

// ── Branded / intersected primitives ─────────────────────
// `string & { __brand }` still matches `_Leaf`, so enumeration stops at the
// branded key: the brand marker is not offered as a path.
type _BrandedLeaves = [
  Expect<Equal<Paths<{ id: string & { __brand: 'id' } }>, 'id'>>,
  Expect<Equal<Paths<{ id: number & { __b: 'n' } }>, 'id'>>,
  Expect<Equal<Paths<string & { __brand: 'id' }>, never>>,
  Expect<
    Equal<Paths<{ ids: Array<string & { __b: 'i' }> }>, 'ids' | `ids.${number}`>
  >,
  Expect<
    Equal<
      Get<{ id: string & { __brand: 'id' } }, 'id'>,
      string & { __brand: 'id' }
    >
  >,
];

// ── An exotic leaf widened with extra keys ───────────────
// The intersection still matches `_Leaf`, so the added keys are unreachable
// from `Paths` however useful they look.
type _WidenedExotics = [
  Expect<Equal<Paths<{ d: Date & { extra: { z: 1 } } }>, 'd'>>,
  Expect<Equal<Paths<{ m: Map<string, number> & { extra: { q: 1 } } }>, 'm'>>,
];

// ── Concrete truncation of recursive shapes ──────────────
// `equivalence.ts` proves recursive types agree with the reference; this pins
// what the union actually is at a chosen depth. Each level costs one, and the
// budget is spent on the last segment reached.
interface LinkedList {
  data: string;
  next: LinkedList | null;
}
interface Tree {
  v: number;
  kids: Tree[];
}
interface RecRec {
  [k: string]: RecRec | string;
}
type _RecursiveTruncation = [
  Expect<
    Equal<Paths<{ l: LinkedList }, { depth: 2 }>, 'l' | 'l.data' | 'l.next'>
  >,
  Expect<
    Equal<
      Paths<{ l: LinkedList }, { depth: 3 }>,
      'l' | 'l.data' | 'l.next' | 'l.next.data' | 'l.next.next'
    >
  >,
  Expect<
    Equal<
      Paths<{ l: LinkedList }, { depth: 4 }>,
      | 'l'
      | 'l.data'
      | 'l.next'
      | 'l.next.data'
      | 'l.next.next'
      | 'l.next.next.data'
      | 'l.next.next.next'
    >
  >,
  Expect<
    Equal<
      Paths<{ t: Tree }, { depth: 3 }>,
      't' | 't.v' | 't.kids' | `t.kids.${number}`
    >
  >,
  Expect<
    Equal<
      Paths<{ t: Tree }, { depth: 5 }>,
      | 't'
      | 't.v'
      | 't.kids'
      | `t.kids.${number}`
      | `t.kids.${number}.v`
      | `t.kids.${number}.kids`
      | `t.kids.${number}.kids.${number}`
    >
  >,
  Expect<Equal<Get<{ t: Tree }, `t.kids.${number}.kids.${number}.v`>, number>>,
  // A recursive string-keyed record collapses to one absorbing member at the
  // first level, so depth never comes into it.
  Expect<Equal<Paths<{ r: RecRec }>, 'r' | `r.${string}`>>,
  Expect<Equal<Paths<{ r: RecRec }, { depth: 16 }>, Paths<{ r: RecRec }>>>,
];

// ── The `PathsOptions` surface ───────────────────────────
// The depth range is enforced by the `PathsOptions` constraint, not clamped
// silently; an options object with extra keys is still accepted.
interface D {
  a: { b: string };
}
type _Options = [
  Expect<Equal<Paths<D, { depth: 2; bogus: true }>, 'a' | 'a.b'>>,
  Expect<Equal<Paths<D, {}>, Paths<D>>>,
  Expect<Equal<Paths<D, { depth: 1 }>, 'a'>>,
  Expect<Equal<Paths<D, { depth: 16 }>, 'a' | 'a.b'>>,
];
// @ts-expect-error depth 0 would yield no paths and is out of range
type _O1 = Paths<D, { depth: 0 }>;
// @ts-expect-error 17 is past the `_Prev` table
type _O2 = Paths<D, { depth: 17 }>;
// @ts-expect-error a wide `number` is not one of the allowed literals
type _O3 = Paths<D, { depth: number }>;
// @ts-expect-error negative depth
type _O4 = Paths<D, { depth: -1 }>;
// @ts-expect-error a string is not a depth
type _O5 = Paths<D, { depth: '2' }>;

// ── Keys that collide with prototype member names ────────
// Traversal recurses into them like any other key. A data map can hold
// `constructor` or `toString`.
type _PrototypeNameKeys = [
  Expect<
    Equal<
      Paths<{ o: { toString: () => string; constructor: { name: string } } }>,
      'o' | 'o.toString' | 'o.constructor' | 'o.constructor.name'
    >
  >,
  Expect<
    Equal<
      Paths<{ o: { valueOf: { v: 1 }; hasOwnProperty: { h: 2 } } }>,
      | 'o'
      | 'o.valueOf'
      | 'o.valueOf.v'
      | 'o.hasOwnProperty'
      | 'o.hasOwnProperty.h'
    >
  >,
  Expect<
    Equal<
      Paths<{ o: Record<'toString' | 'valueOf', { q: 1 }> }>,
      'o' | 'o.toString' | 'o.toString.q' | 'o.valueOf' | 'o.valueOf.q'
    >
  >,
  Expect<
    Equal<
      Get<
        { o: { toString: () => string; constructor: { name: string } } },
        'o.constructor.name'
      >,
      string
    >
  >,
  Expect<
    Equal<Get<{ o: { hasOwnProperty: { h: 2 } } }, 'o.hasOwnProperty.h'>, 2>
  >,
];

// Force `tsc` to resolve the positive tuples (negatives self-check above).
export const _checks = undefined as unknown as [
  _StringRecords,
  _NumericRecords,
  _ArraysOfRecords,
  _TuplesAndRecords,
  _OptionalLayers,
  _NullableLayerGets,
  _CrossFamilyUnions,
  _UnionMemberKeys,
  _DiscriminatedElements,
  _TupleSlotGets,
  _ExoticPayloads,
  _Modifiers,
  _GenericWrapper,
  _CompositionRoots,
  _Depth,
  _DepthDefault,
  _GetRoundTrips,
  _StrictRoundTrips,
  _KnownLimitations,
  _ValueMaps,
  _NonObjectRoots,
  _AnyMidPath,
  _UnionRoots,
  _PlainIntersections,
  _UnionPaths,
  _BrandedLeaves,
  _WidenedExotics,
  _RecursiveTruncation,
  _Options,
  _PrototypeNameKeys,
];
