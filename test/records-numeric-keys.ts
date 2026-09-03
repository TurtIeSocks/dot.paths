/**
 * Records and index signatures keyed by numbers and symbols, beyond the basic
 * cases in `test/numeric-index.ts`: numeric keys at the root, literal key sets,
 * both index signatures on one type, symbol keys, mapped-modifier wrappers, and
 * how `Get` parses a segment before matching it against a numeric key.
 *
 * Pure type-level; `tsc` is the test.
 */
import type { Get, GetStrict, Paths } from '../src/index';

type Equal<A, B> =
  (<T>() => T extends A ? 1 : 2) extends <T>() => T extends B ? 1 : 2
    ? true
    : false;
type Expect<T extends true> = T;

// ── Numeric keys at the root of T, not behind a property ──────────────
type _RootNumeric = [
  Expect<
    Equal<Paths<{ [k: number]: { v: string } }>, `${number}` | `${number}.v`>
  >,
  Expect<
    Equal<Paths<Record<number, { v: string }>>, `${number}` | `${number}.v`>
  >,
  Expect<Equal<Paths<Record<number, string>>, `${number}`>>,
  Expect<Equal<Paths<{ 0: { v: string }; 1: number }>, '0' | '1' | '0.v'>>,
  Expect<Equal<Get<{ [k: number]: { v: string } }, '0.v'>, string>>,
  Expect<Equal<Get<Record<number, { v: string }>, `${number}.v`>, string>>,
  Expect<Equal<Get<{ 0: { v: string }; 1: number }, '0.v'>, string>>,
];

// ── Finite key sets: numeric literals, numeric-looking strings, `${number}` ──
type _LiteralKeySets = [
  Expect<
    Equal<
      Paths<{ r: Record<0 | 1 | 2, { v: string }> }>,
      'r' | 'r.0' | 'r.1' | 'r.2' | 'r.0.v' | 'r.1.v' | 'r.2.v'
    >
  >,
  Expect<Equal<Get<{ r: Record<0 | 1 | 2, { v: string }> }, 'r.1.v'>, string>>,
  // Out of the declared set is a miss, unlike an open numeric signature.
  Expect<Equal<Get<{ r: Record<0 | 1 | 2, { v: string }> }, 'r.3.v'>, never>>,
  // String literals that look numeric behave like the numeric literals above.
  Expect<
    Equal<
      Paths<{ k: Record<'0' | '1', { v: string }> }>,
      'k' | 'k.0' | 'k.1' | 'k.0.v' | 'k.1.v'
    >
  >,
  Expect<Equal<Get<{ k: Record<'0' | '1', { v: string }> }, 'k.0.v'>, string>>,
  // A `${number}` key type is the template twin of a numeric signature.
  Expect<
    Equal<
      Paths<{ t: Record<`${number}`, { v: string }> }>,
      't' | `t.${number}` | `t.${number}.v`
    >
  >,
  Expect<
    Equal<Get<{ t: Record<`${number}`, { v: string }> }, 't.42.v'>, string>
  >,
  Expect<
    Equal<Get<{ t: Record<`${number}`, { v: string }> }, 't.abc.v'>, never>
  >,
  // Negative literal keys survive the round trip; `-` is not a path separator.
  Expect<Equal<Paths<{ n: { [-1]: { v: string } } }>, 'n' | 'n.-1' | 'n.-1.v'>>,
  Expect<Equal<Get<{ n: { [-1]: { v: string } } }, 'n.-1.v'>, string>>,
  Expect<Equal<Get<{ n: { [-1]: string; 0: number } }, 'n.-1'>, string>>,
  // Non-decimal literal keys are normalized by TypeScript before `Paths` sees
  // them: `1e3` is key `1000`, `0x10` is key `16`.
  Expect<
    Equal<Paths<{ w: { 1e3: string; 0x10: string } }>, 'w' | 'w.16' | 'w.1000'>
  >,
];

// ── Enum-keyed records: `Paths` enumerates the members' numeric values ──
enum Rank {
  Low = 0,
  High = 1,
}
enum Tier {
  Bronze = 10,
  Silver = 20,
}
// A `const enum` is erased at runtime but keyed identically at the type level.
// biome-ignore lint/suspicious/noConstEnum: the point of the case is `const`
const enum CTier {
  Bronze = 10,
  Silver = 20,
}
type _EnumKeys = [
  Expect<
    Equal<
      Paths<{ e: Record<Rank, { v: string }> }>,
      'e' | 'e.0' | 'e.1' | 'e.0.v' | 'e.1.v'
    >
  >,
  Expect<
    Equal<
      Paths<{ c: Record<Tier, { v: string }> }>,
      'c' | 'c.10' | 'c.20' | 'c.10.v' | 'c.20.v'
    >
  >,
  Expect<
    Equal<
      Paths<{ c: Record<CTier, { v: string }> }>,
      'c' | 'c.10' | 'c.20' | 'c.10.v' | 'c.20.v'
    >
  >,
  // Enum members used as computed keys land as plain numeric literal keys.
  Expect<
    Equal<
      Paths<{ e: { [Rank.Low]: string; [Rank.High]: { deep: boolean } } }>,
      'e' | 'e.0' | 'e.1' | 'e.1.deep'
    >
  >,
];

// ── Enum-keyed records resolve, not just enumerate ────────────────────
enum Color {
  Red = 'red',
  Blue = 'blue',
}
type _EnumKeysResolve = [
  Expect<Equal<Get<{ e: Record<Rank, { v: string }> }, 'e.0'>, { v: string }>>,
  Expect<Equal<Get<{ e: Record<Rank, { v: string }> }, 'e.0.v'>, string>>,
  Expect<Equal<GetStrict<{ e: Record<Rank, { v: string }> }, 'e.1.v'>, string>>,
  Expect<Equal<Get<{ c: Record<Tier, { v: string }> }, 'c.10.v'>, string>>,
  Expect<Equal<Get<{ c: Record<CTier, { v: string }> }, 'c.20.v'>, string>>,
  Expect<
    Equal<
      Get<
        { e: { [Rank.Low]: string; [Rank.High]: { deep: boolean } } },
        'e.1.deep'
      >,
      boolean
    >
  >,
  // String enums key a record the same way, member value by member value.
  Expect<
    Equal<
      Paths<{ c: Record<Color, { hex: string }> }>,
      'c' | 'c.red' | 'c.blue' | 'c.red.hex' | 'c.blue.hex'
    >
  >,
  Expect<
    Equal<Get<{ c: Record<Color, { hex: string }> }, 'c.red'>, { hex: string }>
  >,
  Expect<
    Equal<Get<{ c: Record<Color, { hex: string }> }, 'c.red.hex'>, string>
  >,
  Expect<
    Equal<
      GetStrict<{ c: Record<Color, { hex: string }> }, 'c.blue.hex'>,
      string
    >
  >,
  Expect<
    Equal<
      Paths<{ e: { [Color.Red]: { hex: string } } }>,
      'e' | 'e.red' | 'e.red.hex'
    >
  >,
  Expect<
    Equal<Get<{ e: { [Color.Red]: { hex: string } } }, 'e.red.hex'>, string>
  >,
];

// ── Both index signatures on one type: `${string}` absorbs its numeric twin ──
type Both = {
  [k: string]: { a: string } | { b: number };
  [k: number]: { b: number };
};
type _BothIndexSignatures = [
  Expect<Equal<Paths<{ x: Both }>, 'x' | `x.${string}`>>,
  // A numeric-looking segment picks the number signature, not the string one.
  Expect<Equal<Get<{ x: Both }, 'x.7'>, { b: number }>>,
  Expect<Equal<Get<{ x: Both }, 'x.7.b'>, number>>,
  Expect<Equal<Get<{ x: Both }, 'x.foo'>, { a: string } | { b: number }>>,
  // Same for an intersection of the two signatures.
  Expect<
    Equal<
      Paths<{
        x: { [k: number]: { b: number } } & { [k: string]: { a: string } };
      }>,
      'x' | `x.${string}`
    >
  >,
  // `Record<string | number, V>` is a string signature; no `${number}` twin.
  Expect<
    Equal<
      Paths<{ r: Record<string | number, { v: string }> }>,
      'r' | `r.${string}`
    >
  >,
  Expect<
    Equal<Get<{ r: Record<string | number, { v: string }> }, 'r.7.v'>, string>
  >,
];

// ── Symbol keys are unreachable by dot notation, so they yield no paths ──
declare const Tag: unique symbol;
type _SymbolKeys = [
  Expect<Equal<Paths<{ o: { [Tag]: { v: string }; s: string } }>, 'o' | 'o.s'>>,
  Expect<Equal<Paths<{ r: Record<symbol, { v: string }> }>, 'r'>>,
  Expect<Equal<Paths<{ [Tag]: { v: string } }>, never>>,
  Expect<Equal<Get<{ [Tag]: { v: string } }, 'v'>, never>>,
  // A symbol alongside string and numeric keys drops only the symbol.
  Expect<
    Equal<
      Paths<{ m: { [Tag]: number; a: string; 0: boolean } }>,
      'm' | 'm.0' | 'm.a'
    >
  >,
  Expect<
    Equal<
      Paths<{ m: Record<symbol | number, { v: string }> }>,
      'm' | `m.${number}` | `m.${number}.v`
    >
  >,
];

// ── Numeric keys declared on interfaces and classes, not object literals ──
interface INum {
  0: string;
  [k: number]: string;
}
interface IBase {
  [k: number]: { v: string };
}
interface IExt extends IBase {
  name: string;
}
declare class CNum {
  0: string;
  [k: number]: string | { deep: boolean };
  name: string;
}
declare class CLit {
  0: { deep: boolean };
  label: string;
  method(): void;
}
type _InterfacesAndClasses = [
  Expect<Equal<Paths<{ i: INum }>, 'i' | `i.${number}`>>,
  Expect<Equal<Get<{ i: INum }, 'i.0'>, string>>,
  Expect<
    Equal<Paths<{ x: IExt }>, 'x' | 'x.name' | `x.${number}` | `x.${number}.v`>
  >,
  Expect<Equal<Get<{ x: IExt }, 'x.9.v'>, string>>,
  Expect<
    Equal<
      Paths<{ c: CNum }>,
      'c' | 'c.name' | `c.${number}` | `c.${number}.deep`
    >
  >,
  Expect<Equal<Get<{ c: CNum }, 'c.5'>, string | { deep: boolean }>>,
  Expect<
    Equal<Paths<{ c: CLit }>, 'c' | 'c.0' | 'c.label' | 'c.method' | 'c.0.deep'>
  >,
];

// ── Mapped-modifier wrappers keep the numeric key domain intact ──
type _MappedWrappers = [
  Expect<
    Equal<
      Paths<{ p: Partial<Record<number, { v: string }>> }>,
      'p' | `p.${number}` | `p.${number}.v`
    >
  >,
  Expect<
    Equal<
      Get<{ p: Partial<Record<number, { v: string }>> }, 'p.3'>,
      { v: string } | undefined
    >
  >,
  Expect<
    Equal<
      Paths<{ r: Readonly<Record<number, { v: string }>> }>,
      'r' | `r.${number}` | `r.${number}.v`
    >
  >,
  Expect<
    Equal<Get<{ r: Readonly<Record<number, { v: string }>> }, 'r.3.v'>, string>
  >,
  Expect<
    Equal<
      Paths<{ q: Required<Partial<Record<number, { v: string }>>> }>,
      'q' | `q.${number}` | `q.${number}.v`
    >
  >,
  Expect<
    Equal<
      Paths<{ r: { readonly [k: number]: { v: string } } }>,
      'r' | `r.${number}` | `r.${number}.v`
    >
  >,
  Expect<
    Equal<Get<{ r: { readonly [k: number]: { v: string } } }, 'r.1.v'>, string>
  >,
  Expect<
    Equal<
      Paths<{ p: Partial<{ 0: { v: string }; 1: number }> }>,
      'p' | 'p.0' | 'p.1' | 'p.0.v'
    >
  >,
  Expect<
    Equal<Get<{ o: { 0?: { v: string } } }, 'o.0'>, { v: string } | undefined>
  >,
  // Nullable and optional records still enumerate through `NonNullable`.
  Expect<
    Equal<
      Paths<{ n: Record<number, { v: string }> | null }>,
      'n' | `n.${number}` | `n.${number}.v`
    >
  >,
  Expect<
    Equal<
      Paths<{ o?: Record<number, { v: string }> }>,
      'o' | `o.${number}` | `o.${number}.v`
    >
  >,
  // Two numeric records in a union contribute both sub-paths. The two-level
  // descent those paths advertise is reported separately, not pinned here.
  Expect<
    Equal<
      Paths<{
        u: Record<number, { v: string }> | Record<number, { w: number }>;
      }>,
      'u' | `u.${number}` | `u.${number}.v` | `u.${number}.w`
    >
  >,
  Expect<
    Equal<
      Get<
        { u: Record<number, { v: string }> | Record<number, { w: number }> },
        'u.2'
      >,
      { v: string } | { w: number }
    >
  >,
];

// ── Descent through a nullable, optional or `Partial` numeric record ──
// The lookup distributes over the union and drops `null` / `undefined`, so a
// deep path resolves to the member's value type with no `| undefined`.
type _NullableDescent = [
  Expect<
    Equal<Get<{ n: Record<number, { v: string }> | null }, 'n.2.v'>, string>
  >,
  Expect<Equal<Get<{ o?: Record<number, { v: string }> }, 'o.2.v'>, string>>,
  Expect<
    Equal<Get<{ p: Partial<Record<number, { v: string }>> }, 'p.3.v'>, string>
  >,
  Expect<Equal<Get<{ p: Partial<{ 0: { v: string } }> }, 'p.0.v'>, string>>,
  Expect<Equal<Get<{ o: { 0?: { v: string } } }, 'o.0.v'>, string>>,
  Expect<Equal<Get<{ n: { [-1]: { v: string } } | null }, 'n.-1.v'>, string>>,
  Expect<
    Equal<
      GetStrict<{ n: Record<number, { v: string }> | null }, `n.${number}.v`>,
      string
    >
  >,
  Expect<
    Equal<
      GetStrict<{ p: Partial<Record<number, { v: string }>> }, `p.${number}.v`>,
      string
    >
  >,
  Expect<
    Equal<
      GetStrict<{ o?: Record<number, { v: string }> }, `o.${number}.v`>,
      string
    >
  >,
];

// ── Descent into a union, whether the union is the value or the record ──
// A branch-specific key resolves per member, so `Get` reaches every path
// `Paths` lists rather than stopping at the union's empty `keyof`.
type UnionRecords = {
  u: Record<number, { v: string }> | Record<number, { w: number }>;
};
type _UnionDescent = [
  Expect<
    Equal<
      Paths<{ r: Record<number, string | { v: number }> }>,
      'r' | `r.${number}` | `r.${number}.v`
    >
  >,
  Expect<
    Equal<Get<{ r: Record<number, string | { v: number }> }, 'r.1.v'>, number>
  >,
  Expect<Equal<Get<{ r: { k: string | { v: number } } }, 'r.k.v'>, number>>,
  Expect<
    Equal<
      GetStrict<{ r: Record<number, string | { v: number }> }, `r.${number}.v`>,
      number
    >
  >,
  Expect<Equal<Get<UnionRecords, 'u.2.v'>, string>>,
  Expect<Equal<Get<UnionRecords, 'u.2.w'>, number>>,
  Expect<Equal<GetStrict<UnionRecords, 'u.2.v'>, string>>,
  Expect<Equal<GetStrict<UnionRecords, `u.${number}.w`>, number>>,
];

// ── Numeric records nested in each other, in arrays, and against `depth` ──
type Chain = Record<number, Record<number, Record<number, { v: string }>>>;
type _NestedNumeric = [
  Expect<
    Equal<
      Paths<{ g: Record<number, Record<number, { v: string }>> }>,
      'g' | `g.${number}` | `g.${number}.${number}` | `g.${number}.${number}.v`
    >
  >,
  Expect<
    Equal<
      Get<{ g: Record<number, Record<number, { v: string }>> }, 'g.5.4.v'>,
      string
    >
  >,
  Expect<
    Equal<
      Paths<Record<number, Record<number, string>>>,
      `${number}` | `${number}.${number}`
    >
  >,
  Expect<
    Equal<
      Paths<{ r: Record<number, { id: string }[]> }>,
      'r' | `r.${number}` | `r.${number}.${number}` | `r.${number}.${number}.id`
    >
  >,
  Expect<
    Equal<Get<{ r: Record<number, { id: string }[]> }, 'r.1.0.id'>, string>
  >,
  // Exotic-leaf, `never` and `unknown` values terminate at the index segment.
  Expect<Equal<Paths<{ r: Record<number, Date> }>, 'r' | `r.${number}`>>,
  Expect<Equal<Get<{ r: Record<number, Date> }, 'r.1'>, Date>>,
  Expect<Equal<Paths<{ x: Record<number, never> }>, 'x' | `x.${number}`>>,
  Expect<Equal<Paths<{ x: Record<number, unknown> }>, 'x' | `x.${number}`>>,
  Expect<Equal<Get<{ x: Record<number, unknown> }, 'x.1'>, unknown>>,
  // Each numeric index segment costs one depth level, same as an object key.
  Expect<Equal<Paths<{ c: Chain }, { depth: 1 }>, 'c'>>,
  Expect<Equal<Paths<{ c: Chain }, { depth: 2 }>, 'c' | `c.${number}`>>,
  Expect<
    Equal<
      Paths<{ c: Chain }, { depth: 3 }>,
      'c' | `c.${number}` | `c.${number}.${number}`
    >
  >,
];

// ── How `Get` reads one segment before matching it against a numeric key ──
type Seg = { r: Record<number, string>; lit: { 0: string; 7: number } };
type _SegmentParsing = [
  Expect<Equal<Get<Seg, 'r.7'>, string>>,
  Expect<Equal<Get<Seg, `r.${number}`>, string>>,
  Expect<Equal<Get<Seg, 'r.-1'>, string>>,
  // Non-numeric segments miss an open numeric signature.
  Expect<Equal<Get<Seg, 'r.NaN'>, never>>,
  Expect<Equal<Get<Seg, 'r.Infinity'>, never>>,
  Expect<Equal<Get<Seg, `r.${string}`>, never>>,
  // An empty segment is a miss, at the root and after a separator.
  Expect<Equal<Get<Seg, ''>, never>>,
  Expect<Equal<Get<Seg, 'r.'>, never>>,
  // A finite literal key set only answers to its own keys.
  Expect<Equal<Get<Seg, 'lit.7'>, number>>,
  Expect<Equal<Get<Seg, 'lit.0'>, string>>,
  Expect<Equal<Get<Seg, 'lit.8'>, never>>,
  Expect<Equal<Get<Seg, 'lit.-1'>, never>>,
  Expect<Equal<Get<Seg, 'lit.NaN'>, never>>,
  // A miss below a resolved numeric key stays a miss.
  Expect<Equal<Get<Seg, 'r.7.nope'>, never>>,
];

// ── GetStrict: numeric and symbol shapes it accepts ──
interface Strict {
  r: Record<number, { v: string }>;
  t: Record<0 | 1 | 2, { v: string }>;
  sym: Record<symbol, { v: string }>;
  p: Partial<Record<number, { v: string }>>;
  b: { [k: string]: { a: string }; [k: number]: { a: string } };
}
type _Strict = [
  Expect<Equal<GetStrict<Strict, `r.${number}.v`>, string>>,
  Expect<Equal<GetStrict<Strict, 't.2.v'>, string>>,
  Expect<Equal<GetStrict<Strict, 'sym'>, Record<symbol, { v: string }>>>,
  Expect<Equal<GetStrict<Strict, `b.${string}`>, { a: string }>>,
  Expect<Equal<GetStrict<{ [k: number]: { v: string } }, '0'>, { v: string }>>,
  Expect<
    Equal<GetStrict<Record<number, { v: string }>, `${number}.v`>, string>
  >,
];
// @ts-expect-error a miss below an open numeric signature is not a path
type _BadDeep = GetStrict<Strict, 'r.3.nope'>;
// @ts-expect-error 3 is outside the declared key set 0 | 1 | 2
type _BadOutOfSet = GetStrict<Strict, 't.3'>;
// @ts-expect-error symbol keys contribute no paths, so nothing nests under them
type _BadSymbol = GetStrict<Strict, 'sym.x'>;
// @ts-expect-error the wrapper does not add keys to the record's value
type _BadPartial = GetStrict<Strict, 'p.1.nope'>;
// @ts-expect-error a root-level numeric record has no named keys
type _BadRoot = GetStrict<Record<number, { v: string }>, 'nope'>;

// ── Numeric enums mixed into a wider key union ──
type _MixedEnumKeys = [
  // A string literal beside the enum keeps every key a literal path.
  Expect<
    Equal<
      Paths<{ r: Record<Rank | 'x', { v: 1 }> }>,
      'r' | 'r.0' | 'r.1' | 'r.x' | 'r.0.v' | 'r.1.v' | 'r.x.v'
    >
  >,
  Expect<Equal<Get<{ r: Record<Rank | 'x', { v: 1 }> }, 'r.x.v'>, 1>>,
  // A plain numeric literal joins the enum members' values.
  Expect<
    Equal<
      Paths<{ r: Record<Rank | 5, { v: 1 }> }>,
      'r' | 'r.0' | 'r.1' | 'r.5' | 'r.0.v' | 'r.1.v' | 'r.5.v'
    >
  >,
  Expect<Equal<Get<{ r: Record<Rank | 5, { v: 1 }> }, 'r.5.v'>, 1>>,
  // The open domains absorb the members: no literal survives beside them.
  Expect<
    Equal<
      Paths<{ r: Record<Rank | number, { v: 1 }> }>,
      'r' | `r.${number}` | `r.${number}.v`
    >
  >,
  Expect<Equal<Get<{ r: Record<Rank | number, { v: 1 }> }, 'r.9.v'>, 1>>,
  Expect<
    Equal<Paths<{ r: Record<Rank | string, { v: 1 }> }>, 'r' | `r.${string}`>
  >,
  Expect<Equal<Get<{ r: Record<Rank | string, { v: 1 }> }, 'r.k.v'>, 1>>,
];

// ── Non-canonical numeric spellings as a segment on an open signature ──
// All of these are members of `${number}`, so `Paths` lists them and
// `GetStrict` accepts them, but none round-trips as a number: `obj['007']` is
// a different property from `obj[7]`, so `Get` treats them as misses.
type Spell = { r: Record<number, string> };
type _NumericSpellings = [
  Expect<Equal<Get<Spell, 'r.+1'>, never>>,
  Expect<Equal<Get<Spell, 'r.01'>, never>>,
  Expect<Equal<Get<Spell, 'r.1e3'>, never>>,
  Expect<Equal<Get<Spell, 'r.0x10'>, never>>,
  Expect<Equal<Get<Spell, 'r. 1'>, never>>,
  Expect<Equal<GetStrict<Spell, 'r.0x10'>, never>>,
  Expect<Equal<Get<Spell, 'r.7'>, string>>,
  Expect<Equal<Get<Spell, 'r.-1'>, string>>,
  // Spellings TypeScript will not read as a number stay misses.
  Expect<Equal<Get<Spell, 'r.1_0'>, never>>,
  Expect<Equal<Get<Spell, 'r.1n'>, never>>,
];

// ── The same spellings against a finite literal key set are all misses ──
// A segment has to round-trip through `${N}` to become a number literal, and
// only then must that literal be a declared key, so no widening to the union
// of every numeric value.
type _NonCanonicalOnLiterals = [
  Expect<Equal<Get<Seg, 'lit.007'>, never>>,
  Expect<Equal<Get<Seg, 'lit.1e3'>, never>>,
  Expect<Equal<Get<Seg, 'lit.0x10'>, never>>,
  Expect<Equal<Get<Seg, 'lit. 1'>, never>>,
  Expect<Equal<Get<Seg, 'lit.1 '>, never>>,
  Expect<Equal<Get<Seg, 'lit.+1'>, never>>,
  Expect<Equal<Get<Seg, 'lit.01'>, never>>,
  // A wide numeric segment is not assignable to a finite key set either.
  Expect<Equal<Get<Seg, `lit.${number}`>, never>>,
];

// ── Documented limitation: a key whose own text contains a dot ────────
// `Paths` lists it, `Get` splits on the first '.', so it is unresolvable.
type _PinFractionalKey = [
  Expect<
    Equal<Paths<{ f: { 1.5: string; 2: number } }>, 'f' | 'f.2' | 'f.1.5'>
  >,
  Expect<Equal<Get<{ f: { 1.5: string; 2: number } }, 'f.1.5'>, never>>,
  Expect<Equal<GetStrict<{ f: { 1.5: string; 2: number } }, 'f.1.5'>, never>>,
  // The sibling integer key is unaffected.
  Expect<Equal<Get<{ f: { 1.5: string; 2: number } }, 'f.2'>, number>>,
];

// ── Inline symbol index signatures, alone and beside a numeric one ──
type SymNum = {
  r: { [k: symbol]: { v: string }; [k: number]: { w: number } };
};
type _SymbolIndexSignature = [
  Expect<Equal<Paths<{ r: { [k: symbol]: { v: string } } }>, 'r'>>,
  Expect<Equal<Get<{ r: { [k: symbol]: { v: string } } }, 'r.v'>, never>>,
  // Only the numeric half of a two-signature type is reachable by dot path.
  Expect<Equal<Paths<SymNum>, 'r' | `r.${number}` | `r.${number}.w`>>,
  Expect<Equal<Get<SymNum, 'r.3.w'>, number>>,
  Expect<Equal<GetStrict<SymNum, `r.${number}.w`>, number>>,
  Expect<
    Equal<Paths<{ r: { [k: symbol]: { v: string }; a: string } }>, 'r' | 'r.a'>
  >,
  Expect<Equal<Paths<{ [k: symbol]: { v: string } }>, never>>,
  Expect<
    Equal<
      Paths<{ [k: symbol]: { v: string }; [k: number]: string }>,
      `${number}`
    >
  >,
];
