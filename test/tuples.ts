/**
 * Tuple coverage for `Paths`, `Get` and `GetStrict`.
 *
 * `test/equivalence.ts` pins one tuple property against the reference. This
 * file covers root and property position, `readonly`, optional and rest
 * elements, named members, nesting and unions. The part that bites: `Paths`
 * merges every position under `${number}`, while `Get` resolves a literal
 * index to that exact position.
 */
import type { Get, GetStrict, Paths } from '../src/index';

type Equal<A, B> =
  (<T>() => T extends A ? 1 : 2) extends <T>() => T extends B ? 1 : 2
    ? true
    : false;
type Expect<T extends true> = T;

type Pair = [string, number];
type Het = [{ a: 1 }, { b: 2 }];
type Homo = [{ a: 1 }, { a: 1 }];

// A tuple at the root is an array to `Paths`: indices collapse to `${number}`.
type _RootTuples = [
  Expect<Equal<Paths<Pair>, `${number}`>>,
  Expect<Equal<Paths<readonly [string, number]>, `${number}`>>,
  Expect<Equal<Paths<Het>, `${number}` | `${number}.a` | `${number}.b`>>,
  // identical to the equivalent array root: the tuple's arity is not encoded
  Expect<Equal<Paths<Pair>, Paths<(string | number)[]>>>,
];

// Same shape one level down, and `readonly` changes nothing.
type _TupleProperty = [
  Expect<Equal<Paths<{ t: Pair }>, 't' | `t.${number}`>>,
  Expect<Equal<Paths<{ t: readonly [string, number] }>, 't' | `t.${number}`>>,
  Expect<Equal<Paths<{ t: [Date, RegExp] }>, 't' | `t.${number}`>>,
  Expect<
    Equal<
      Paths<{ t: Het }>,
      't' | `t.${number}` | `t.${number}.a` | `t.${number}.b`
    >
  >,
  Expect<Equal<Paths<{ t: Homo }>, 't' | `t.${number}` | `t.${number}.a`>>,
  // a declared-`never` element contributes nothing to the element union
  Expect<
    Equal<
      Paths<{ t: [never, { a: 1 }] }>,
      't' | `t.${number}` | `t.${number}.a`
    >
  >,
];

// Optional elements, rest elements and named members all reduce to `${number}`.
type _OptionalRestAndNamed = [
  Expect<Equal<Paths<{ t: [string, number?] }>, 't' | `t.${number}`>>,
  Expect<Equal<Paths<{ t: [string, ...number[]] }>, 't' | `t.${number}`>>,
  Expect<Equal<Paths<{ t: [...string[], number] }>, 't' | `t.${number}`>>,
  Expect<
    Equal<Paths<{ t: [string, ...boolean[], number] }>, 't' | `t.${number}`>
  >,
  Expect<Equal<Paths<{ t: [x: number, y: number] }>, 't' | `t.${number}`>>,
  Expect<
    Equal<
      Paths<{ t: [{ a: 1 }, ...{ b: 2 }[]] }>,
      't' | `t.${number}` | `t.${number}.a` | `t.${number}.b`
    >
  >,
  Expect<
    Equal<
      Paths<{ t: [head: { a: 1 }, ...rest: { b: 2 }[]] }>,
      't' | `t.${number}` | `t.${number}.a` | `t.${number}.b`
    >
  >,
  Expect<
    Equal<Paths<{ t: [{ a: 1 }?] }>, 't' | `t.${number}` | `t.${number}.a`>
  >,
];

// Nesting a tuple costs one `${number}` segment per level, like arrays.
type _NestedAndComposed = [
  Expect<
    Equal<
      Paths<{ t: [[{ a: 1 }, { b: 2 }], { c: 3 }] }>,
      | 't'
      | `t.${number}`
      | `t.${number}.${number}`
      | `t.${number}.${number}.a`
      | `t.${number}.${number}.b`
      | `t.${number}.c`
    >
  >,
  Expect<
    Equal<
      Paths<{ t: [string, { a: 1 }][] }>,
      't' | `t.${number}` | `t.${number}.${number}` | `t.${number}.${number}.a`
    >
  >,
  Expect<
    Equal<
      Paths<{ t: [{ a: 1 }[], { b: 2 }[]] }>,
      | 't'
      | `t.${number}`
      | `t.${number}.${number}`
      | `t.${number}.${number}.a`
      | `t.${number}.${number}.b`
    >
  >,
  Expect<
    Equal<
      Paths<{ t: [{ list: [number, { z: boolean }] }] }>,
      | 't'
      | `t.${number}`
      | `t.${number}.list`
      | `t.${number}.list.${number}`
      | `t.${number}.list.${number}.z`
    >
  >,
];

// Nullable/optional collapse via `NonNullable`; a union of tuples merges.
type _UnionAndNullablePaths = [
  Expect<
    Equal<
      Paths<{ t: Het | null }>,
      't' | `t.${number}` | `t.${number}.a` | `t.${number}.b`
    >
  >,
  Expect<
    Equal<
      Paths<{ t?: Het }>,
      't' | `t.${number}` | `t.${number}.a` | `t.${number}.b`
    >
  >,
  Expect<
    Equal<
      Paths<{ t: [{ a: 1 }] | [{ b: 2 }, { c: 3 }] }>,
      't' | `t.${number}` | `t.${number}.a` | `t.${number}.b` | `t.${number}.c`
    >
  >,
  Expect<
    Equal<
      Paths<{ t: [{ a: 1 } | { b: 2 }, string] }>,
      't' | `t.${number}` | `t.${number}.a` | `t.${number}.b`
    >
  >,
];

// Each tuple level spends one depth unit, same as an object level.
type _DepthPaths = [
  Expect<Equal<Paths<{ t: Pair }, { depth: 1 }>, 't'>>,
  Expect<Equal<Paths<{ t: Pair }, { depth: 2 }>, 't' | `t.${number}`>>,
  Expect<
    Equal<
      Paths<{ t: [[{ a: 1 }]] }, { depth: 3 }>,
      't' | `t.${number}` | `t.${number}.${number}`
    >
  >,
  Expect<
    Equal<
      Paths<{ t: [[{ a: 1 }]] }, { depth: 4 }>,
      't' | `t.${number}` | `t.${number}.${number}` | `t.${number}.${number}.a`
    >
  >,
  Expect<Equal<Paths<[[[[{ a: string }]]]], { depth: 1 }>, `${number}`>>,
];

// `Get` is position-aware where `Paths` is not: a literal index picks one slot.
type _GetLiteralIndex = [
  Expect<Equal<Get<{ t: Pair }, 't'>, Pair>>,
  Expect<Equal<Get<{ t: Pair }, 't.0'>, string>>,
  Expect<Equal<Get<{ t: Pair }, 't.1'>, number>>,
  Expect<Equal<Get<{ t: readonly [string, number] }, 't.0'>, string>>,
  Expect<Equal<Get<{ t: [x: number, y: string] }, 't.0'>, number>>,
  Expect<Equal<Get<{ t: [x: number, y: string] }, 't.1'>, string>>,
  Expect<Equal<Get<{ t: [Date, RegExp] }, 't.0'>, Date>>,
  Expect<Equal<Get<{ t: [Date, RegExp] }, 't.1'>, RegExp>>,
  Expect<Equal<Get<{ t: Het }, 't.0'>, { a: 1 }>>,
  Expect<Equal<Get<{ t: Het }, 't.1'>, { b: 2 }>>,
  Expect<Equal<Get<{ t: Het }, 't.0.a'>, 1>>,
  Expect<Equal<Get<{ t: Het }, 't.1.b'>, 2>>,
  Expect<Equal<Get<Pair, '0'>, string>>,
  Expect<Equal<Get<[string, { a: 1 }], '1.a'>, 1>>,
  // a declared-`never` element resolves to `never`, not to a key miss
  Expect<Equal<Get<{ t: [never, { a: 1 }] }, 't.0'>, never>>,
  Expect<Equal<Get<{ t: [never, { a: 1 }] }, 't.1.a'>, 1>>,
];

// Intended limitation: arity is not encoded, so an out-of-range index resolves
// to `undefined` rather than missing, and GetStrict accepts it.
type _OutOfRange = [
  Expect<Equal<Get<{ t: [string, number] }, 't.2'>, undefined>>,
  Expect<Equal<Get<{ t: [string, number] }, 't.9'>, undefined>>,
  Expect<Equal<GetStrict<{ t: [string, number] }, 't.2'>, undefined>>,
  Expect<Equal<Get<readonly [], '0'>, undefined>>,
];

// The other side of position-awareness: a key from the wrong slot misses.
type _GetWrongPosition = [
  Expect<Equal<Get<{ t: Het }, 't.0.b'>, never>>,
  Expect<Equal<Get<{ t: Het }, 't.1.a'>, never>>,
];

// `${number}` addresses the whole element union, so heterogeneous slots merge.
type _GetNumberTemplate = [
  Expect<Equal<Get<{ t: Pair }, `t.${number}`>, string | number>>,
  Expect<Equal<Get<{ t: Het }, `t.${number}`>, { a: 1 } | { b: 2 }>>,
  Expect<Equal<Get<Pair, `${number}`>, string | number>>,
  // uniform slots make the merge invisible, sub-paths still resolve
  Expect<Equal<Get<{ t: Homo }, `t.${number}.a`>, 1>>,
  Expect<Equal<Get<{ t: [{ a: 1 }] }, `t.${number}.a`>, 1>>,
];

// Fixed (tuples-4): `${number}` still addresses the element union, but each
// member is now looked up on its own, so heterogeneous sub-paths resolve.
type _HeterogeneousMerge = [
  Expect<Equal<Get<{ t: Het }, `t.${number}.a`>, 1>>,
  Expect<Equal<Get<{ t: Het }, `t.${number}.b`>, 2>>,
  Expect<Equal<GetStrict<{ t: Het }, `t.${number}.a`>, 1>>,
  // the wrong-position literals still miss, and GetStrict still accepts them:
  // `Paths` merged the slots before the constraint ever saw them
  Expect<Equal<GetStrict<{ t: Het }, 't.1.a'>, never>>,
  Expect<Equal<GetStrict<{ t: Het }, 't.0.b'>, never>>,
];

// Fixed (tuples-5): a slot typed as a union keeps its sub-paths, because a
// segment that misses the whole type is retried per union member.
type _UnionSlotSubPaths = [
  Expect<Equal<Get<{ t: [{ a: 1 }?] }, 't.0.a'>, 1>>,
  Expect<Equal<Get<{ t: [{ a: 1 } | { b: 2 }, string] }, 't.0.a'>, 1>>,
  Expect<Equal<Get<{ t: [{ a: 1 } | { b: 2 }, string] }, 't.0.b'>, 2>>,
  Expect<Equal<Get<{ t: [{ a: 1 }] | [{ b: 2 }, { c: 3 }] }, 't.0.a'>, 1>>,
  Expect<Equal<Get<{ t: [{ a: 1 }] | [{ b: 2 }, { c: 3 }] }, 't.1.c'>, 3>>,
  Expect<
    Equal<
      Get<{ t: [{ a: 1 }] | [{ b: 2 }, { c: 3 }] }, 't.0'>,
      { a: 1 } | { b: 2 }
    >
  >,
  Expect<Equal<GetStrict<{ t: [{ a: 1 }?] }, 't.0.a'>, 1>>,
  Expect<
    Equal<GetStrict<{ t: [{ a: 1 }] | [{ b: 2 }, { c: 3 }] }, 't.1.c'>, 3>
  >,
];

// Fixed (tuples-6): `Paths` strips null per key and `Get` now drops the null
// and undefined members too, so a nullable tuple property keeps its sub-paths.
type _NullableTupleProperty = [
  Expect<Equal<Get<{ t: Het | null }, 't.0.a'>, 1>>,
  Expect<Equal<Get<{ t: Het | null }, 't.1.b'>, 2>>,
  Expect<Equal<Get<{ t?: Het }, 't.0.a'>, 1>>,
  // the first hop narrows to the member at that slot, not the element union
  Expect<Equal<Get<{ t: Het | null }, 't.0'>, { a: 1 }>>,
  Expect<Equal<Get<{ t: Het | null }, `t.${number}`>, { a: 1 } | { b: 2 }>>,
  Expect<Equal<GetStrict<{ t: Het | null }, 't.0.a'>, 1>>,
];

// Rest and optional elements resolve through TypeScript's own indexed access.
type _GetRestAndOptionalElements = [
  Expect<Equal<Get<{ t: [string, ...number[]] }, 't.0'>, string>>,
  Expect<Equal<Get<{ t: [string, ...number[]] }, 't.1'>, number>>,
  Expect<Equal<Get<{ t: [string, ...number[]] }, 't.5'>, number>>,
  Expect<Equal<Get<{ t: [...string[], number] }, 't.0'>, string | number>>,
  Expect<
    Equal<Get<{ t: [string, ...boolean[], number] }, 't.1'>, number | boolean>
  >,
  // an optional element keeps its `undefined`
  Expect<Equal<Get<{ t: [string, number?] }, 't.1'>, number | undefined>>,
  Expect<Equal<Get<{ t: [{ a: 1 }?] }, 't.0'>, { a: 1 } | undefined>>,
];

// A non-canonical numeral passes the `${number}` constraint but does not
// round-trip as a number, so it is a miss. A negative index does round-trip,
// and a tuple's `keyof` carries `number`, so it lands on the element union
// the same way TypeScript types `pair[-1]`.
type _NonCanonicalIndex = [
  Expect<Equal<GetStrict<{ t: [string, number] }, 't.-1'>, string | number>>,
  Expect<Equal<GetStrict<{ t: [string, number] }, 't.01'>, never>>,
  Expect<Equal<GetStrict<{ t: [string, number] }, 't.+1'>, never>>,
  Expect<Equal<GetStrict<{ t: [string, number] }, 't.1e0'>, never>>,
];

// Intended limitation: `${number}` matches decimal strings, so one template
// segment can span two real segments and the wrong arity passes the constraint.
type _DecimalSegment = [
  Expect<Equal<GetStrict<{ t: [[{ a: 1 }], { c: 3 }] }, 't.0.0.c'>, never>>,
  Expect<Equal<GetStrict<{ t: [string, number] }, 't.0.5'>, string>>,
  Expect<Equal<Get<{ t: [string, number] }, 't.0.5'>, string>>,
];

// Composed shapes: tuple in tuple, tuple in array, array in tuple.
type _GetNestedAndComposed = [
  Expect<Equal<Get<{ t: [[{ a: 1 }, { b: 2 }], { c: 3 }] }, 't.0.0.a'>, 1>>,
  Expect<Equal<Get<{ t: [[{ a: 1 }, { b: 2 }], { c: 3 }] }, 't.1.c'>, 3>>,
  Expect<
    Equal<Get<{ t: readonly [readonly [{ a: 1 }], { b: 2 }] }, 't.0.0.a'>, 1>
  >,
  Expect<Equal<Get<{ t: [string, { a: 1 }][] }, 't.0.0'>, string>>,
  Expect<Equal<Get<{ t: [string, { a: 1 }][] }, 't.0.1.a'>, 1>>,
  Expect<Equal<Get<{ t: [{ a: 1 }[], { b: 2 }[]] }, 't.0.0.a'>, 1>>,
  Expect<
    Equal<
      Get<{ t: [{ list: [number, { z: boolean }] }] }, 't.0.list.1.z'>,
      boolean
    >
  >,
  // `Get` ignores the depth cap that bounds `Paths`
  Expect<
    Equal<Get<{ t: [[[[[[[[[{ a: 1 }]]]]]]]]] }, 't.0.0.0.0.0.0.0.0.0.a'>, 1>
  >,
];

// `GetStrict` accepts a literal index because `'0'` is a `${number}`.
type _GetStrictPositives = [
  Expect<Equal<GetStrict<{ t: Pair }, 't.0'>, string>>,
  Expect<Equal<GetStrict<{ t: Pair }, 't.1'>, number>>,
  Expect<Equal<GetStrict<{ t: Pair }, `t.${number}`>, string | number>>,
  Expect<Equal<GetStrict<{ t: Het }, 't.0.a'>, 1>>,
  Expect<Equal<GetStrict<{ t: Het }, 't.1.b'>, 2>>,
  Expect<Equal<GetStrict<Pair, '0'>, string>>,
  Expect<Equal<GetStrict<[string, { a: 1 }], '1.a'>, 1>>,
  Expect<Equal<GetStrict<{ t: [[{ a: 1 }], { c: 3 }] }, 't.0.0.a'>, 1>>,
  Expect<Equal<GetStrict<{ t: Pair }, 't.0'>, Get<{ t: Pair }, 't.0'>>>,
];

// `length` on a tuple is the arity LITERAL, where an array's is `number`.
type _TupleLength = [
  Expect<Equal<Get<{ t: Pair }, 't.length'>, 2>>,
  Expect<Equal<Get<{ t: readonly [string, number] }, 't.length'>, 2>>,
  Expect<Equal<Get<Pair, 'length'>, 2>>,
  Expect<Equal<Get<{ t: [string, number, boolean] }, 't.length'>, 3>>,
  // an optional element makes it a union, a rest element widens it back
  Expect<Equal<Get<{ t: [string, number?] }, 't.length'>, 1 | 2>>,
  Expect<Equal<Get<{ t: [string, ...number[]] }, 't.length'>, number>>,
  Expect<Equal<Get<{ list: string[] }, 'list.length'>, number>>,
];

// Intended limitation: loose `Get` reaches Array members that `Paths` never
// lists (GetStrict rejects them, see the negatives below).
type _ArrayMembers = [
  Expect<Equal<Get<{ t: [string, number] }, 't.length'>, 2>>,
  Expect<Equal<Get<[string, number], 'length'>, 2>>,
  Expect<Equal<Get<{ t: [] }, 't.length'>, 0>>,
];

// The empty tuple has no element, so it contributes no `${number}` slot at
// all; the property key is the only path it produces.
type _EmptyTuple = [
  Expect<Equal<Paths<[]>, never>>,
  Expect<Equal<Paths<readonly []>, never>>,
  Expect<Equal<Paths<{ t: [] }>, 't'>>,
  Expect<Equal<Paths<{ t: readonly [] }>, 't'>>,
  Expect<Equal<Paths<{ t: []; u: readonly [] }>, 't' | 'u'>>,
  // an empty member of a union of tuples drops out, the populated one stays
  Expect<
    Equal<Paths<{ t: [] | [{ a: 1 }] }>, 't' | `t.${number}` | `t.${number}.a`>
  >,
  Expect<Equal<Get<{ t: [] }, 't'>, []>>,
  Expect<Equal<Get<{ t: [] }, 't.length'>, 0>>,
  Expect<Equal<Get<{ t: readonly [] }, 't.length'>, 0>>,
  Expect<Equal<Get<{ t: [] }, `t.${number}`>, never>>,
];

// `readonly` and a rest element together, in each rest position.
type _ReadonlyRestPaths = [
  Expect<
    Equal<
      Paths<{ t: readonly [string, ...{ a: 1 }[]] }>,
      't' | `t.${number}` | `t.${number}.a`
    >
  >,
  Expect<
    Equal<
      Paths<{ t: readonly [...{ a: 1 }[], number] }>,
      't' | `t.${number}` | `t.${number}.a`
    >
  >,
  Expect<
    Equal<
      Paths<{ t: readonly [string, ...boolean[], { a: 1 }] }>,
      't' | `t.${number}` | `t.${number}.a`
    >
  >,
  Expect<
    Equal<
      Paths<{ t: readonly [{ a: 1 }, ...{ b: 2 }[]] }>,
      't' | `t.${number}` | `t.${number}.a` | `t.${number}.b`
    >
  >,
];

// The same shapes through `Get`: literal indices still pick a position.
type _ReadonlyRestGet = [
  Expect<Equal<Get<{ t: readonly [string, ...{ a: 1 }[]] }, 't.0'>, string>>,
  Expect<Equal<Get<{ t: readonly [string, ...{ a: 1 }[]] }, 't.1.a'>, 1>>,
  Expect<Equal<GetStrict<{ t: readonly [string, ...{ a: 1 }[]] }, 't.1.a'>, 1>>,
  Expect<
    Equal<Get<{ t: readonly [{ a: 1 }, ...{ b: 2 }[]] }, 't.1'>, { b: 2 }>
  >,
  Expect<Equal<Get<{ t: readonly [{ a: 1 }, ...{ b: 2 }[]] }, 't.0.a'>, 1>>,
];

// Rejected: array machinery and sub-keys `Paths` never enumerates.
// @ts-expect-error `length` is not a `${number}` segment
type _NLength = GetStrict<{ t: Pair }, 't.length'>;
// @ts-expect-error array methods are not paths either
type _NMap = GetStrict<{ t: Pair }, 't.map'>;
// @ts-expect-error a non-numeric index segment
type _NWord = GetStrict<{ t: Pair }, 't.first'>;
// @ts-expect-error `NaN` is not a `${number}`
type _NNaN = GetStrict<{ t: Pair }, 't.NaN'>;
// @ts-expect-error no such key on either slot
type _NNope = GetStrict<{ t: Het }, 't.0.nope'>;
// @ts-expect-error descends past a leaf slot
type _NPastLeaf = GetStrict<{ t: Het }, 't.0.a.b'>;
// @ts-expect-error descends into an exotic leaf's members
type _NExotic = GetStrict<{ t: [Date, RegExp] }, 't.0.getTime'>;
// @ts-expect-error one segment past the nested tuple's leaf
type _NNestedDeep = GetStrict<{ t: [[{ a: 1 }]] }, 't.0.0.a.b'>;
// @ts-expect-error an empty tuple advertises no index segment
type _NEmptyIndex = GetStrict<{ t: [] }, `t.${number}`>;
// @ts-expect-error a root tuple has no `length` path
type _NRootLength = GetStrict<Pair, 'length'>;
// @ts-expect-error empty path
type _NEmptyPath = GetStrict<Pair, ''>;

// Force `tsc` to resolve the positive tuples (negatives self-check above).
export const _paths = undefined as unknown as [
  _RootTuples,
  _TupleProperty,
  _OptionalRestAndNamed,
  _NestedAndComposed,
  _UnionAndNullablePaths,
  _DepthPaths,
  _ReadonlyRestPaths,
];
export const _values = undefined as unknown as [
  _GetLiteralIndex,
  _OutOfRange,
  _GetWrongPosition,
  _GetNumberTemplate,
  _HeterogeneousMerge,
  _UnionSlotSubPaths,
  _NullableTupleProperty,
  _GetRestAndOptionalElements,
  _NonCanonicalIndex,
  _DecimalSegment,
  _GetNestedAndComposed,
  _GetStrictPositives,
  _TupleLength,
  _ArrayMembers,
  _EmptyTuple,
  _ReadonlyRestGet,
];
