/**
 * Recursive types at the default depth and at the cap.
 *
 * `test/equivalence.ts` proves recursive shapes agree with the reference and
 * `test/composition.ts` pins one tree at two depths. This file pins the exact
 * unions at the default depth of 8 and at the 16 cap, recursion through a
 * numeric record and through a tuple, and the cap as `GetStrict` sees it.
 * Pure type-level; `tsc` is the test.
 */
import type { Get, GetStrict, Paths } from '../src/index';

type Equal<A, B> =
  (<T>() => T extends A ? 1 : 2) extends <T>() => T extends B ? 1 : 2
    ? true
    : false;
type Expect<T extends true> = T;

interface List {
  data: number;
  next: List | null;
}
interface Comment {
  body: string;
  replies: Comment[];
}
interface NumTree {
  v: number;
  sub: Record<number, NumTree>;
}
interface StrTree {
  v: number;
  sub: Record<string, StrTree>;
}
type Cons = [number, Cons | null];
type Hops = '1.1.1';
interface A {
  name: string;
  b: B;
}
interface B {
  id: number;
  a: A;
}
type Json = string | number | boolean | null | Json[] | { [k: string]: Json };

// A nullable self-reference: each level costs one, so depth 8 is eight `next`
// hops, and the leaf under the eighth is cut.
type _LinearDefault = [
  Expect<Equal<Paths<List, { depth: 1 }>, 'data' | 'next'>>,
  Expect<
    Equal<
      Paths<List>,
      | 'data'
      | 'next'
      | 'next.data'
      | 'next.next'
      | 'next.next.data'
      | 'next.next.next'
      | 'next.next.next.data'
      | 'next.next.next.next'
      | 'next.next.next.next.data'
      | 'next.next.next.next.next'
      | 'next.next.next.next.next.data'
      | 'next.next.next.next.next.next'
      | 'next.next.next.next.next.next.data'
      | 'next.next.next.next.next.next.next'
      | 'next.next.next.next.next.next.next.data'
      | 'next.next.next.next.next.next.next.next'
    >
  >,
];

// The cap adds exactly eight more hops on top of the default.
type _LinearCap = [
  Expect<
    Equal<
      Paths<List, { depth: 16 }>,
      | Paths<List>
      | 'next.next.next.next.next.next.next.next.data'
      | 'next.next.next.next.next.next.next.next.next'
      | 'next.next.next.next.next.next.next.next.next.data'
      | 'next.next.next.next.next.next.next.next.next.next'
      | 'next.next.next.next.next.next.next.next.next.next.data'
      | 'next.next.next.next.next.next.next.next.next.next.next'
      | 'next.next.next.next.next.next.next.next.next.next.next.data'
      | 'next.next.next.next.next.next.next.next.next.next.next.next'
      | 'next.next.next.next.next.next.next.next.next.next.next.next.data'
      | 'next.next.next.next.next.next.next.next.next.next.next.next.next'
      | 'next.next.next.next.next.next.next.next.next.next.next.next.next.data'
      | 'next.next.next.next.next.next.next.next.next.next.next.next.next.next'
      | 'next.next.next.next.next.next.next.next.next.next.next.next.next.next.data'
      | 'next.next.next.next.next.next.next.next.next.next.next.next.next.next.next'
      | 'next.next.next.next.next.next.next.next.next.next.next.next.next.next.next.data'
      | 'next.next.next.next.next.next.next.next.next.next.next.next.next.next.next.next'
    >
  >,
];

// Recursion through an array: the `${number}` slot costs a level of its own,
// so the default depth reaches four `replies` deep.
type _ArrayRecursion = [
  Expect<
    Equal<
      Paths<Comment, { depth: 3 }>,
      | 'body'
      | 'replies'
      | `replies.${number}`
      | `replies.${number}.body`
      | `replies.${number}.replies`
    >
  >,
  Expect<
    Equal<
      Paths<Comment>,
      | 'body'
      | 'replies'
      | `replies.${number}`
      | `replies.${number}.body`
      | `replies.${number}.replies`
      | `replies.${number}.replies.${number}`
      | `replies.${number}.replies.${number}.body`
      | `replies.${number}.replies.${number}.replies`
      | `replies.${number}.replies.${number}.replies.${number}`
      | `replies.${number}.replies.${number}.replies.${number}.body`
      | `replies.${number}.replies.${number}.replies.${number}.replies`
      | `replies.${number}.replies.${number}.replies.${number}.replies.${number}`
    >
  >,
];

// Recursion through a numeric record behaves like the array case, with the
// signature's `${number}` in place of the element slot.
type _NumericRecordRecursion = [
  Expect<
    Equal<
      Paths<NumTree, { depth: 3 }>,
      'v' | 'sub' | `sub.${number}` | `sub.${number}.v` | `sub.${number}.sub`
    >
  >,
  Expect<
    Equal<
      Paths<NumTree>,
      | 'v'
      | 'sub'
      | `sub.${number}`
      | `sub.${number}.v`
      | `sub.${number}.sub`
      | `sub.${number}.sub.${number}`
      | `sub.${number}.sub.${number}.v`
      | `sub.${number}.sub.${number}.sub`
      | `sub.${number}.sub.${number}.sub.${number}`
      | `sub.${number}.sub.${number}.sub.${number}.v`
      | `sub.${number}.sub.${number}.sub.${number}.sub`
      | `sub.${number}.sub.${number}.sub.${number}.sub.${number}`
    >
  >,
  Expect<Equal<Get<NumTree, 'sub.3.sub.4.v'>, number>>,
  Expect<Equal<GetStrict<NumTree, `sub.${number}.sub.${number}.v`>, number>>,
];

// A string record absorbs the recursion at the first level, and `Get` still
// walks it to any depth.
type _StringRecordRecursion = [
  Expect<Equal<Paths<StrTree>, 'v' | 'sub' | `sub.${string}`>>,
  Expect<Equal<Get<StrTree, 'sub.a.sub.b.v'>, number>>,
  Expect<Equal<GetStrict<StrTree, 'sub.a.sub.b.v'>, number>>,
  Expect<Equal<Paths<{ j: Json }>, 'j' | `j.${string}`>>,
  Expect<Equal<Get<{ j: Json }, `j.${string}`>, Json>>,
];

// A tuple that references itself: every level is a `${number}` slot.
type _TupleRecursion = [
  Expect<
    Equal<
      Paths<Cons>,
      | `${number}`
      | `${number}.${number}`
      | `${number}.${number}.${number}`
      | `${number}.${number}.${number}.${number}`
      | `${number}.${number}.${number}.${number}.${number}`
      | `${number}.${number}.${number}.${number}.${number}.${number}`
      | `${number}.${number}.${number}.${number}.${number}.${number}.${number}`
      | `${number}.${number}.${number}.${number}.${number}.${number}.${number}.${number}`
    >
  >,
  Expect<
    Equal<
      Paths<Cons, { depth: 16 }>,
      | Paths<Cons>
      | `${number}.${number}.${number}.${number}.${number}.${number}.${number}.${number}.${number}`
      | `${number}.${number}.${number}.${number}.${number}.${number}.${number}.${number}.${number}.${number}`
      | `${number}.${number}.${number}.${number}.${number}.${number}.${number}.${number}.${number}.${number}.${number}`
      | `${number}.${number}.${number}.${number}.${number}.${number}.${number}.${number}.${number}.${number}.${number}.${number}`
      | `${number}.${number}.${number}.${number}.${number}.${number}.${number}.${number}.${number}.${number}.${number}.${number}.${number}`
      | `${number}.${number}.${number}.${number}.${number}.${number}.${number}.${number}.${number}.${number}.${number}.${number}.${number}.${number}`
      | `${number}.${number}.${number}.${number}.${number}.${number}.${number}.${number}.${number}.${number}.${number}.${number}.${number}.${number}.${number}`
      | `${number}.${number}.${number}.${number}.${number}.${number}.${number}.${number}.${number}.${number}.${number}.${number}.${number}.${number}.${number}.${number}`
    >
  >,
  Expect<Equal<Get<Cons, '0'>, number>>,
  Expect<Equal<Get<Cons, '1'>, Cons | null>>,
  Expect<Equal<Get<Cons, '1.0'>, number>>,
  Expect<Equal<GetStrict<Cons, '1.1.0'>, number>>,
  // `Get` has no cap, so it keeps walking past the deepest listed slot
  Expect<Equal<Get<Cons, `${Hops}.${Hops}.${Hops}.1.0`>, number>>,
];

// Two interfaces referencing each other alternate all the way down.
type _MutualRecursion = [
  Expect<
    Equal<
      Paths<A>,
      | 'name'
      | 'b'
      | 'b.id'
      | 'b.a'
      | 'b.a.name'
      | 'b.a.b'
      | 'b.a.b.id'
      | 'b.a.b.a'
      | 'b.a.b.a.name'
      | 'b.a.b.a.b'
      | 'b.a.b.a.b.id'
      | 'b.a.b.a.b.a'
      | 'b.a.b.a.b.a.name'
      | 'b.a.b.a.b.a.b'
      | 'b.a.b.a.b.a.b.id'
      | 'b.a.b.a.b.a.b.a'
    >
  >,
];

// The cap bounds `GetStrict` too: eight segments pass, nine do not, and
// `Get` walks on regardless.
type _CapAndGetStrict = [
  Expect<
    Equal<GetStrict<List, 'next.next.next.next.next.next.next.data'>, number>
  >,
  Expect<
    Equal<
      GetStrict<List, 'next.next.next.next.next.next.next.next'>,
      List | null
    >
  >,
  Expect<
    Equal<
      Get<List, 'next.next.next.next.next.next.next.next.next.next.data'>,
      number
    >
  >,
];
// @ts-expect-error nine segments is past the default depth
type _N1 = GetStrict<List, 'next.next.next.next.next.next.next.next.data'>;
// @ts-expect-error GetStrict takes no depth option
type _N2 = GetStrict<List, 'next.data', { depth: 16 }>;

// A deeper strict lookup is a one-line wrapper over `Paths` with a depth.
type GetDeep<T, P extends Paths<T, { depth: 12 }>> = Get<T, P>;
type _DeepWrapper = [
  Expect<
    Equal<
      GetDeep<
        List,
        'next.next.next.next.next.next.next.next.next.next.next.data'
      >,
      number
    >
  >,
];
type _N3 = GetDeep<
  List,
  // @ts-expect-error twelve hops is past a depth-12 cap
  'next.next.next.next.next.next.next.next.next.next.next.next.data'
>;

// Force `tsc` to resolve the positive tuples (negatives self-check above).
export declare const _checks: [
  _LinearDefault,
  _LinearCap,
  _ArrayRecursion,
  _NumericRecordRecursion,
  _StringRecordRecursion,
  _TupleRecursion,
  _MutualRecursion,
  _CapAndGetStrict,
  _DeepWrapper,
];
export type { _N1, _N2, _N3 };
