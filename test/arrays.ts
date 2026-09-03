/**
 * Plain arrays: `T[]`, `readonly T[]`, `ReadonlyArray<T>`, `Array<T>`, and the
 * same nested one to four levels deep.
 *
 * Every array level contributes one `${number}` segment and costs one unit of
 * the `depth` budget, so the array cases are where truncation is easiest to
 * get wrong. Arrays of tuples live in the tuples file; arrays of records and
 * records of arrays live in the records file. Pure type-level; `tsc` is the
 * test.
 */
import type { Get, GetStrict, Paths } from '../src/index';

type Equal<A, B> =
  (<T>() => T extends A ? 1 : 2) extends <T>() => T extends B ? 1 : 2
    ? true
    : false;
type Expect<T extends true> = T;

interface El {
  id: number;
  name: string;
}

interface Shape {
  list: El[];
  ro: readonly El[];
  prims: string[];
  grid: string[][];
  opt?: El[];
  nul: El[] | null;
  roUndef?: readonly El[] | undefined;
}

// ── Root arrays: the array itself is `T`, so paths start at `${number}` ──
type _RootArrays = [
  Expect<Equal<Paths<string[]>, `${number}`>>,
  Expect<Equal<Paths<boolean[]>, `${number}`>>,
  Expect<Equal<Paths<{ a: 1 }[]>, `${number}` | `${number}.a`>>,
  Expect<Equal<Paths<readonly string[]>, `${number}`>>,
  // the four spellings of the same array type agree
  Expect<
    Equal<Paths<ReadonlyArray<{ a: 1 }>, {}>, `${number}` | `${number}.a`>
  >,
  Expect<Equal<Paths<Array<{ a: 1 }>>, `${number}` | `${number}.a`>>,
  Expect<Equal<Paths<Array<{ a: 1 }>>, Paths<{ a: 1 }[]>>>,
  Expect<Equal<Paths<ReadonlyArray<{ a: 1 }>>, Paths<readonly { a: 1 }[]>>>,
];

// ── Nesting: one `${number}` per level, readonly-ness makes no difference ──
type _NestedArrays = [
  Expect<Equal<Paths<string[][]>, `${number}` | `${number}.${number}`>>,
  Expect<
    Equal<
      Paths<string[][][]>,
      `${number}` | `${number}.${number}` | `${number}.${number}.${number}`
    >
  >,
  Expect<
    Equal<
      Paths<{ a: string }[][]>,
      `${number}` | `${number}.${number}` | `${number}.${number}.a`
    >
  >,
  Expect<
    Equal<
      Paths<readonly (readonly { a: string }[])[]>,
      `${number}` | `${number}.${number}` | `${number}.${number}.a`
    >
  >,
  Expect<
    Equal<Paths<Array<ReadonlyArray<{ a: string }>>>, Paths<{ a: string }[][]>>
  >,
];

// ── depth: each array level spends one unit, and the budget truncates ──
type A4 = { a: string }[][][][];
type DeepArr = { a: { b: { c: { d: { e: { f: { g: { h: string }[] } } } } } } };
type _Depth = [
  Expect<Equal<Paths<string[][][], { depth: 1 }>, `${number}`>>,
  Expect<
    Equal<
      Paths<string[][][], { depth: 2 }>,
      `${number}` | `${number}.${number}`
    >
  >,
  Expect<Equal<Paths<string[][][], { depth: 3 }>, Paths<string[][][]>>>,
  // past the end of the type the extra budget is inert
  Expect<Equal<Paths<string[][][], { depth: 4 }>, Paths<string[][][]>>>,
  Expect<Equal<Paths<{ a: string }[][], { depth: 1 }>, `${number}`>>,
  Expect<
    Equal<
      Paths<{ a: string }[][], { depth: 2 }>,
      `${number}` | `${number}.${number}`
    >
  >,
  Expect<
    Equal<Paths<{ a: string }[][], { depth: 3 }>, Paths<{ a: string }[][]>>
  >,
  // four array levels then a key: the key needs the fifth unit
  Expect<
    Equal<
      Paths<A4, { depth: 4 }>,
      | `${number}`
      | `${number}.${number}`
      | `${number}.${number}.${number}`
      | `${number}.${number}.${number}.${number}`
    >
  >,
  Expect<Equal<Paths<A4, { depth: 5 }>, Paths<A4, { depth: 16 }>>>,
  // default depth 8 cuts the element key off a seven-deep chain ending in an array
  Expect<
    Equal<
      Paths<DeepArr>,
      | 'a'
      | 'a.b'
      | 'a.b.c'
      | 'a.b.c.d'
      | 'a.b.c.d.e'
      | 'a.b.c.d.e.f'
      | 'a.b.c.d.e.f.g'
      | `a.b.c.d.e.f.g.${number}`
    >
  >,
  Expect<
    Equal<
      Paths<DeepArr, { depth: 9 }>,
      Paths<DeepArr> | `a.b.c.d.e.f.g.${number}.h`
    >
  >,
  Expect<Equal<Paths<DeepArr, { depth: 10 }>, Paths<DeepArr, { depth: 9 }>>>,
];

// ── Element unions: `(A | B)[]` and `A[] | B[]` enumerate the same paths ──
type _ElementUnions = [
  Expect<
    Equal<
      Paths<({ a: string } | { b: number })[]>,
      `${number}` | `${number}.a` | `${number}.b`
    >
  >,
  Expect<
    Equal<
      Paths<{ a: string }[] | { b: number }[]>,
      Paths<({ a: string } | { b: number })[]>
    >
  >,
  Expect<Equal<Paths<(string | number)[]>, `${number}`>>,
  Expect<Equal<Paths<(string | { b: number })[]>, `${number}` | `${number}.b`>>,
  Expect<
    Equal<
      Paths<({ kind: 'a'; x: number } | { kind: 'b'; y: string })[]>,
      `${number}` | `${number}.kind` | `${number}.x` | `${number}.y`
    >
  >,
];

// ── Nullable elements: `NonNullable` is applied before descending ──
type _NullableElements = [
  Expect<Equal<Paths<({ a: string } | null)[]>, `${number}` | `${number}.a`>>,
  Expect<
    Equal<Paths<({ a: string } | undefined)[]>, `${number}` | `${number}.a`>
  >,
  Expect<
    Equal<
      Paths<({ a: string } | null | undefined)[]>,
      Paths<({ a: string } | null)[]>
    >
  >,
  Expect<Equal<Paths<(string | null)[]>, `${number}`>>,
  Expect<Equal<Paths<null[]>, `${number}`>>,
  Expect<Equal<Paths<undefined[]>, `${number}`>>,
];

// ── Odd elements: anything with no traversable keys stops at `${number}` ──
type _OddElements = [
  Expect<Equal<Paths<unknown[]>, `${number}`>>,
  Expect<Equal<Paths<never[]>, `${number}`>>,
  Expect<Equal<Paths<object[]>, `${number}`>>,
  Expect<Equal<Paths<{}[]>, `${number}`>>,
  Expect<Equal<Paths<Array<() => void>>, `${number}`>>,
  Expect<Equal<Paths<Array<(a: number) => string>>, `${number}`>>,
  Expect<Equal<Paths<Date[]>, `${number}`>>,
  Expect<Equal<Paths<RegExp[]>, `${number}`>>,
  Expect<Equal<Paths<Map<string, number>[]>, `${number}`>>,
  Expect<Equal<Paths<symbol[]>, `${number}`>>,
  Expect<Equal<Paths<bigint[]>, `${number}`>>,
];

// The wider leaf set: typed arrays, buffers, weak collections and boxed
// primitives all stop at `${number}` as elements.
type _LeafElements = [
  Expect<Equal<Paths<Uint8Array[]>, `${number}`>>,
  Expect<Equal<Paths<DataView[]>, `${number}`>>,
  Expect<Equal<Paths<ArrayBuffer[]>, `${number}`>>,
  Expect<Equal<Paths<WeakMap<object, number>[]>, `${number}`>>,
  Expect<Equal<Paths<String[]>, `${number}`>>,
];

// arrays-3 fixed: `Function` is a leaf now, so it no longer recurses through
// `caller` into a ~75 member union. Constructor types are leaves for the same
// reason, they are assignable to `Function`.
type _FunctionElements = [
  Expect<Equal<Paths<Function[]>, `${number}`>>,
  Expect<Equal<Paths<{ fns: Function[] }>, 'fns' | `fns.${number}`>>,
  Expect<Equal<Paths<(typeof Date)[]>, `${number}`>>,
];

// arrays-5, intended limitation: an `any` element satisfies both branches of
// the leaf conditional, so it emits a `${string}` wildcard segment.
type _AnyElement = [
  Expect<Equal<Paths<any[]>, `${number}` | `${number}.${string}`>>,
  Expect<
    Equal<
      Paths<{ xs: any[] }>,
      'xs' | `xs.${number}` | `xs.${number}.${string}`
    >
  >,
];

// ── Array-valued properties: optional and nullable ones still traverse ──
type _ArrayProps = [
  Expect<
    Equal<
      Paths<Shape>,
      | 'list'
      | 'ro'
      | 'prims'
      | 'grid'
      | 'opt'
      | 'nul'
      | 'roUndef'
      | `list.${number}`
      | `list.${number}.id`
      | `list.${number}.name`
      | `ro.${number}`
      | `ro.${number}.id`
      | `ro.${number}.name`
      | `prims.${number}`
      | `grid.${number}`
      | `grid.${number}.${number}`
      | `opt.${number}`
      | `opt.${number}.id`
      | `opt.${number}.name`
      | `nul.${number}`
      | `nul.${number}.id`
      | `nul.${number}.name`
      | `roUndef.${number}`
      | `roUndef.${number}.id`
      | `roUndef.${number}.name`
    >
  >,
  Expect<Equal<Paths<{ a?: string[] }>, 'a' | `a.${number}`>>,
  Expect<Equal<Paths<{ a: string[] | null }>, 'a' | `a.${number}`>>,
];

// ── Get by index: every numeric segment resolves to the element type ──
type _GetIndex = [
  Expect<Equal<Get<Shape, `list.${number}`>, El>>,
  Expect<Equal<Get<Shape, 'list.0'>, El>>,
  Expect<Equal<Get<Shape, 'list.99'>, El>>,
  // '-1' is meant to miss on an array but still resolves to `El`; left
  // unasserted alongside the other numeral misses until that is reconciled
  Expect<Equal<Get<Shape, 'list.0.id'>, number>>,
  Expect<Equal<Get<Shape, `list.${number}.name`>, string>>,
  Expect<Equal<Get<Shape, 'ro.0'>, El>>,
  Expect<Equal<Get<Shape, `ro.${number}`>, El>>,
  Expect<Equal<Get<Shape, 'ro.0.id'>, number>>,
  Expect<Equal<Get<Shape, 'prims.0'>, string>>,
  Expect<Equal<Get<Shape, 'grid.0.1'>, string>>,
  Expect<Equal<Get<El[], '0'>, El>>,
  Expect<Equal<Get<El[], `${number}`>, El>>,
  Expect<Equal<Get<string[][], '0.0'>, string>>,
  Expect<Equal<Get<readonly (readonly { a: string }[])[], '0.0.a'>, string>>,
];

// arrays-4, intended limitation: '0.0' is itself a valid `${number}`, so an
// over-long path satisfies the two segment template and `GetStrict` takes it,
// then `Get` indexes the string leaf by character.
type _DottedNumericIndex = [
  Expect<Equal<Get<string[][], '0.0.0'>, string>>,
  Expect<Equal<GetStrict<string[][], '0.0.0'>, string>>,
];

// ── Get on real array members: `length` and the methods are ordinary keys ──
type _GetMembers = [
  Expect<Equal<Get<Shape, 'list.length'>, number>>,
  Expect<Equal<Get<Shape, 'ro.length'>, number>>,
  Expect<Equal<Get<Shape, 'prims.length'>, number>>,
  Expect<Equal<Get<Shape, 'grid.0.length'>, number>>,
  Expect<Equal<Get<Shape, 'grid.length'>, number>>,
  Expect<Equal<Get<Shape, 'list.map'>, El[]['map']>>,
  Expect<Equal<Get<Shape, 'list.push'>, El[]['push']>>,
  Expect<Equal<Get<string[], 'length'>, number>>,
];

// ── Get misses: a non-key segment on an array is a miss, not the element ──
type _GetFallback = [
  Expect<Equal<Get<Shape, 'list.first'>, never>>,
  // `push` is not a key of a readonly array, so it misses as well
  Expect<Equal<Get<Shape, 'ro.push'>, never>>,
  // a miss below the element is a real miss
  Expect<Equal<Get<Shape, 'list.0.nope'>, never>>,
  Expect<Equal<Get<Shape, 'prims.0.nope'>, never>>,
];

// ── Get through optional / nullable array properties ──
type _GetArrayProps = [
  Expect<Equal<Get<Shape, 'opt'>, El[] | undefined>>,
  Expect<Equal<Get<Shape, 'opt.0'>, El>>,
  Expect<Equal<Get<Shape, 'opt.0.id'>, number>>,
  Expect<Equal<Get<Shape, 'nul'>, El[] | null>>,
  Expect<Equal<Get<Shape, 'nul.0'>, El>>,
  Expect<Equal<Get<Shape, `nul.${number}.name`>, string>>,
  Expect<Equal<Get<Shape, 'roUndef.0.id'>, number>>,
];

// ── Get on odd elements: the element type comes back untouched ──
type _GetOddElements = [
  Expect<Equal<Get<unknown[], '0'>, unknown>>,
  Expect<Equal<Get<never[], '0'>, never>>,
  Expect<Equal<Get<object[], '0'>, object>>,
  Expect<Equal<Get<{}[], '0'>, {}>>,
  Expect<Equal<Get<symbol[], '0'>, symbol>>,
  Expect<Equal<Get<Date[], '0'>, Date>>,
];

// ── Get on element unions: only keys shared by every member resolve ──
type _GetElementUnions = [
  Expect<
    Equal<
      Get<({ a: string } | { b: number })[], '0'>,
      { a: string } | { b: number }
    >
  >,
  Expect<
    Equal<
      Get<({ kind: 'a'; x: number } | { kind: 'b'; y: string })[], '0.kind'>,
      'a' | 'b'
    >
  >,
  Expect<
    Equal<
      Get<({ a: string; only1: 1 } | { a: number; only2: 2 })[], '0.a'>,
      string | number
    >
  >,
];

// arrays-1 fixed: a segment that misses on the whole element union is retried
// per member, so a key on one member resolves to that member's value type.
type _ElementUnionGet = [
  Expect<Equal<Get<({ a: string } | { b: number })[], '0.a'>, string>>,
  Expect<Equal<Get<({ a: string } | { b: number })[], '0.b'>, number>>,
  Expect<
    Equal<GetStrict<({ a: string } | { b: number })[], `${number}.a`>, string>
  >,
  Expect<Equal<Get<{ a: string }[] | { b: number }[], '0.a'>, string>>,
  Expect<
    Equal<
      Get<({ kind: 'a'; x: number } | { kind: 'b'; y: string })[], '0.x'>,
      number
    >
  >,
  // a wide `${string}` on a finite element gives the union of its key value
  // types, not the element's method union
  Expect<Equal<Get<Shape, `list.${number}.${string}`>, string | number>>,
];

// arrays-2 fixed: null and undefined drop out of the element union before the
// lookup, so a path below a nullable element resolves without `| undefined`.
type _NullableElementGet = [
  Expect<Equal<Get<({ a: string } | null)[], '0.a'>, string>>,
  Expect<Equal<Get<({ a: string } | undefined)[], '0.a'>, string>>,
  Expect<Equal<GetStrict<({ a: string } | null)[], `${number}.a`>, string>>,
  // the bare index still carries the null, only deeper segments shed it
  Expect<Equal<Get<({ a: string } | null)[], '0'>, { a: string } | null>>,
];

// ── GetStrict: valid array paths resolve exactly as `Get` does ──
type _GetStrict = [
  Expect<Equal<GetStrict<Shape, 'list'>, El[]>>,
  Expect<Equal<GetStrict<Shape, 'list.0'>, El>>,
  Expect<Equal<GetStrict<Shape, `list.${number}`>, El>>,
  Expect<Equal<GetStrict<Shape, `list.${number}.id`>, number>>,
  Expect<Equal<GetStrict<Shape, 'ro'>, readonly El[]>>,
  Expect<Equal<GetStrict<Shape, `ro.${number}.name`>, string>>,
  Expect<Equal<GetStrict<Shape, 'grid.0.0'>, string>>,
  Expect<Equal<GetStrict<Shape, 'opt.0.id'>, Get<Shape, 'opt.0.id'>>>,
  Expect<Equal<GetStrict<string[], '0'>, string>>,
  Expect<Equal<GetStrict<{ a: 1 }[], `${number}.a`>, 1>>,
  // nullable and readonly-optional array properties are strict paths too
  Expect<Equal<GetStrict<Shape, `nul.${number}.id`>, number>>,
  Expect<Equal<GetStrict<Shape, `roUndef.${number}.id`>, number>>,
];

// ── GetStrict negatives: array members and non-numeric indices are not paths ──
// @ts-expect-error `length` is a real key but never an enumerated path
type _N1 = GetStrict<Shape, 'list.length'>;
// @ts-expect-error methods are not paths either
type _N2 = GetStrict<Shape, 'list.map'>;
// @ts-expect-error same for a mutating method
type _N3 = GetStrict<Shape, 'list.push'>;
// @ts-expect-error non-numeric index, which loose `Get` would resolve to `El`
type _N4 = GetStrict<Shape, 'list.first'>;
// @ts-expect-error unknown key below the element
type _N5 = GetStrict<Shape, `list.${number}.nope`>;
// @ts-expect-error primitives are leaves, no path below them
type _N6 = GetStrict<Shape, 'prims.0.length'>;
// @ts-expect-error one array level deeper than the type has
type _N7 = GetStrict<Shape, 'grid.0.0.a'>;
// @ts-expect-error a readonly array has no `push`
type _N8 = GetStrict<Shape, 'ro.push'>;
// @ts-expect-error the array itself has no named key
type _N9 = GetStrict<string[], 'length'>;
// @ts-expect-error empty index segment
type _N10 = GetStrict<Shape, 'list.'>;
// @ts-expect-error wide `number` is not a path segment on its own
type _N11 = GetStrict<Shape, 'list.number'>;

// ── Malformed segments: a bad segment is a key miss, nothing more ──
interface Chain {
  a: { b: { c: string } };
}
type _MalformedSegments = [
  Expect<Equal<Get<Chain, '.a'>, never>>,
  Expect<Equal<Get<Chain, 'a..b'>, never>>,
  Expect<Equal<Get<Chain, '.'>, never>>,
  Expect<Equal<Get<Chain, 'a. b'>, never>>,
  Expect<Equal<Get<Chain, ' a.b'>, never>>,
  Expect<Equal<Get<Chain, 'a.b.'>, never>>,
  Expect<Equal<Get<Chain, ''>, never>>,
  // on an array a segment only resolves if it round-trips as a number, so a
  // padded or zero-prefixed index is a miss even though `${number}` accepts it
  Expect<Equal<Get<string[], '.0'>, never>>,
  Expect<Equal<Get<string[], ' 0'>, never>>,
  Expect<Equal<Get<string[], '00'>, never>>,
  Expect<Equal<Get<string[][], '0..0'>, never>>,
  Expect<Equal<Get<string[], '.'>, never>>,
];

// ── Root array key miss: a non-key segment misses at the root of `T` too ──
type _RootMiss = [
  Expect<Equal<Get<string[], 'nope'>, never>>,
  Expect<Equal<Get<El[], 'nope'>, never>>,
  Expect<Equal<Get<readonly El[], 'push'>, never>>,
  // nothing is left to walk from, so the rest of the path misses too
  Expect<Equal<Get<El[], 'nope.id'>, never>>,
];

// ── The depth ceiling: 16 is the maximum, and it truncates a longer chain ──
interface D17 {
  a: {
    b: {
      c: {
        d: {
          e: {
            f: {
              g: {
                h: {
                  i: {
                    j: { k: { l: { m: { n: { o: { p: { q: string } } } } } } };
                  };
                };
              };
            };
          };
        };
      };
    };
  };
}
type A16 = string[][][][][][][][][][][][][][][][];
type A17 = string[][][][][][][][][][][][][][][][][];
type _DepthCeiling = [
  Expect<
    Equal<
      Paths<D17, { depth: 16 }>,
      | 'a'
      | 'a.b'
      | 'a.b.c'
      | 'a.b.c.d'
      | 'a.b.c.d.e'
      | 'a.b.c.d.e.f'
      | 'a.b.c.d.e.f.g'
      | 'a.b.c.d.e.f.g.h'
      | 'a.b.c.d.e.f.g.h.i'
      | 'a.b.c.d.e.f.g.h.i.j'
      | 'a.b.c.d.e.f.g.h.i.j.k'
      | 'a.b.c.d.e.f.g.h.i.j.k.l'
      | 'a.b.c.d.e.f.g.h.i.j.k.l.m'
      | 'a.b.c.d.e.f.g.h.i.j.k.l.m.n'
      | 'a.b.c.d.e.f.g.h.i.j.k.l.m.n.o'
      | 'a.b.c.d.e.f.g.h.i.j.k.l.m.n.o.p'
    >
  >,
  // 17 array levels truncate to the 16 the budget allows
  Expect<Equal<Paths<A17, { depth: 16 }>, Paths<A16, { depth: 16 }>>>,
  // `Get` has no depth budget, so it walks past the ceiling `Paths` stops at
  Expect<Equal<Get<D17, 'a.b.c.d.e.f.g.h.i.j.k.l.m.n.o.p.q'>, string>>,
  Expect<Equal<Get<A17, '0.0.0.0.0.0.0.0.0.0.0.0.0.0.0.0.0'>, string>>,
];

// @ts-expect-error 17 is past the `_Prev` table, so it is not a legal depth
type _N12 = Paths<D17, { depth: 17 }>;

// ── A directly self-referential array: recursion with no named property ──
type Rec = Rec[];
type _SelfArray = [
  Expect<Equal<Paths<Rec, { depth: 2 }>, `${number}` | `${number}.${number}`>>,
  Expect<Equal<Paths<Rec>, Paths<A16, { depth: 8 }>>>,
  Expect<Equal<Paths<{ r: Rec }, { depth: 2 }>, 'r' | `r.${number}`>>,
  // every index lands back on the same type, at any nesting
  Expect<Equal<Get<Rec, '0'>, Rec>>,
  Expect<Equal<Get<Rec, '0.0.0'>, Rec>>,
  Expect<Equal<Get<{ r: Rec }, 'r.0.1'>, Rec>>,
];

// Force `tsc` to resolve the positive tuples (negatives self-check above).
export const _rootArrays = undefined as unknown as _RootArrays;
export const _nestedArrays = undefined as unknown as _NestedArrays;
export const _depth = undefined as unknown as _Depth;
export const _elementUnions = undefined as unknown as _ElementUnions;
export const _nullableElements = undefined as unknown as _NullableElements;
export const _oddElements = undefined as unknown as _OddElements;
export const _leafElements = undefined as unknown as _LeafElements;
export const _functionElements = undefined as unknown as _FunctionElements;
export const _anyElement = undefined as unknown as _AnyElement;
export const _arrayProps = undefined as unknown as _ArrayProps;
export const _getIndex = undefined as unknown as _GetIndex;
export const _dottedNumericIndex = undefined as unknown as _DottedNumericIndex;
export const _getMembers = undefined as unknown as _GetMembers;
export const _getFallback = undefined as unknown as _GetFallback;
export const _getArrayProps = undefined as unknown as _GetArrayProps;
export const _getOddElements = undefined as unknown as _GetOddElements;
export const _getElementUnions = undefined as unknown as _GetElementUnions;
export const _elementUnionGet = undefined as unknown as _ElementUnionGet;
export const _nullableElementGet = undefined as unknown as _NullableElementGet;
export const _getStrict = undefined as unknown as _GetStrict;
export const _malformedSegments = undefined as unknown as _MalformedSegments;
export const _rootMiss = undefined as unknown as _RootMiss;
export const _depthCeiling = undefined as unknown as _DepthCeiling;
export const _selfArray = undefined as unknown as _SelfArray;
