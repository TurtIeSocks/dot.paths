/**
 * Array-like and collection built-ins that are neither arrays nor `_Leaf`
 * members: `ArrayLike`, `IArguments`, typed arrays and buffers, iterators,
 * the readonly/weak collections, wrapper objects, `Error`.
 *
 * Most of these have no dedicated branch in `_Paths`, so they fall through to
 * the plain-object mapped type. This file pins the parts that are stable and
 * intended: the `ArrayLike` shape (numeric index signature plus `length`),
 * symbol-only keys producing nothing, and `Get` resolution, which never
 * consults `_Leaf` and so stays valid however the leaf list changes.
 * Pure type-level; `tsc` is the test.
 */
import type { Get, GetStrict, Paths } from '../src/index';

type Equal<A, B> =
  (<T>() => T extends A ? 1 : 2) extends <T>() => T extends B ? 1 : 2
    ? true
    : false;
type Expect<T extends true> = T;

interface Bag {
  al: ArrayLike<{ a: number }>;
  label: string;
}

// ArrayLike is a numeric index signature plus `length`; declaration form (built-in,
// inline, readonly) must not change the paths.
type _ArrayLikeShapes = [
  Expect<Equal<Paths<ArrayLike<string>>, `${number}` | 'length'>>,
  Expect<
    Equal<
      Paths<ArrayLike<{ a: number }>>,
      `${number}` | 'length' | `${number}.a`
    >
  >,
  Expect<
    Equal<
      Paths<{ length: number; [n: number]: string }>,
      `${number}` | 'length'
    >
  >,
  Expect<
    Equal<
      Paths<{ readonly length: number; readonly [n: number]: string }>,
      `${number}` | 'length'
    >
  >,
  Expect<Equal<Paths<ArrayLike<unknown>>, `${number}` | 'length'>>,
  Expect<
    Equal<
      Paths<{ al: ArrayLike<{ a: number }> }>,
      'al' | `al.${number}` | 'al.length' | `al.${number}.a`
    >
  >,
];

// Nesting: array-likes compose with each other and with real arrays, and extra
// declared keys sit alongside the numeric ones.
type _ArrayLikeNesting = [
  Expect<
    Equal<
      Paths<ArrayLike<ArrayLike<number>>>,
      `${number}` | 'length' | `${number}.${number}` | `${number}.length`
    >
  >,
  Expect<
    Equal<
      Paths<Array<ArrayLike<{ a: number }>>>,
      | `${number}`
      | `${number}.${number}`
      | `${number}.length`
      | `${number}.${number}.a`
    >
  >,
  Expect<
    Equal<
      Paths<ArrayLike<{ a: number }[]>>,
      `${number}` | 'length' | `${number}.${number}` | `${number}.${number}.a`
    >
  >,
  Expect<
    Equal<
      Paths<{
        length: number;
        [n: number]: { a: number };
        label: string;
        meta: { tag: string };
      }>,
      `${number}` | 'length' | `${number}.a` | 'label' | 'meta' | 'meta.tag'
    >
  >,
];

// `depth` truncates array-likes the same way it truncates objects.
type _ArrayLikeDepth = [
  Expect<
    Equal<Paths<ArrayLike<{ a: number }>, { depth: 1 }>, `${number}` | 'length'>
  >,
  Expect<
    Equal<
      Paths<ArrayLike<{ a: number }>, { depth: 2 }>,
      `${number}` | 'length' | `${number}.a`
    >
  >,
  Expect<Equal<Paths<{ al: ArrayLike<{ a: number }> }, { depth: 1 }>, 'al'>>,
];

// `Get` treats a numeric index signature like an array index: `${number}` and a
// literal digit both resolve, a non-key segment is `never`.
type _ArrayLikeGet = [
  Expect<Equal<Get<ArrayLike<{ a: number }>, 'length'>, number>>,
  Expect<Equal<Get<ArrayLike<{ a: number }>, `${number}`>, { a: number }>>,
  Expect<Equal<Get<ArrayLike<{ a: number }>, '0'>, { a: number }>>,
  Expect<Equal<Get<ArrayLike<{ a: number }>, `${number}.a`>, number>>,
  Expect<
    Equal<Get<ArrayLike<ArrayLike<number>>, `${number}.${number}`>, number>
  >,
  Expect<Equal<Get<ArrayLike<ArrayLike<number>>, `${number}.length`>, number>>,
  Expect<Equal<Get<ArrayLike<{ a: number }>, 'nope'>, never>>,
  Expect<Equal<Get<ArrayLike<{ a: number }>, `${number}.b`>, never>>,
  Expect<Equal<Get<ArrayLike<{ a: number }>, 'length.foo'>, never>>,
];

// GetStrict accepts every enumerated array-like path, including a literal index
// under `${number}`, and rejects the rest.
type _ArrayLikeGetStrict = [
  Expect<Equal<GetStrict<Bag, 'label'>, string>>,
  Expect<Equal<GetStrict<Bag, 'al.length'>, number>>,
  Expect<Equal<GetStrict<Bag, `al.${number}`>, { a: number }>>,
  Expect<Equal<GetStrict<Bag, 'al.0'>, { a: number }>>,
  Expect<Equal<GetStrict<Bag, `al.${number}.a`>, number>>,
];

// @ts-expect-error 'al.0.b' is not a path of Bag
type _NegBagDeep = GetStrict<Bag, 'al.0.b'>;
// @ts-expect-error 'length' belongs to `al`, not to Bag
type _NegBagLength = GetStrict<Bag, 'length'>;

// Iterables carry only `[Symbol.iterator]`, so they contribute no paths at all.
// A property typed `Iterable` is a leaf in practice, not by the leaf list.
type _IterableShapes = [
  Expect<Equal<Paths<Iterable<string>>, never>>,
  Expect<Equal<Paths<Iterable<{ a: number }>>, never>>,
  Expect<Equal<Paths<AsyncIterable<string>>, never>>,
  Expect<Equal<Paths<{ it: Iterable<{ a: number }> }>, 'it'>>,
  Expect<Equal<Paths<{ it: AsyncIterable<{ a: number }> }>, 'it'>>,
  Expect<
    Equal<Paths<{ xs: Iterable<{ a: number }>[] }>, 'xs' | `xs.${number}`>
  >,
  Expect<Equal<Get<Iterable<{ a: number }>, 'a'>, never>>,
  Expect<Equal<Get<{ it: Iterable<{ a: number }> }, 'it.a'>, never>>,
  Expect<
    Equal<Get<{ it: Iterable<{ a: number }> }, 'it'>, Iterable<{ a: number }>>
  >,
];

// Intended limitation: iterators are not on the leaf list, so unlike `Iterable`
// they enumerate their methods, and the ES2025 helper set varies by `lib`.
type _IteratorMethods = [
  Expect<Equal<Paths<Iterator<string>>, 'next' | 'return' | 'throw'>>,
  Expect<
    Equal<
      Extract<Paths<Generator<string>>, 'next' | 'map' | 'toArray'>,
      'next' | 'map' | 'toArray'
    >
  >,
  // Same shape for `Boolean`, which stayed off the leaf list.
  Expect<Equal<Paths<Boolean>, 'valueOf'>>,
];

// Symbol keys never produce a path: dot notation can't address them.
type _SymbolKeys = [
  Expect<
    Equal<Paths<{ a: number; [Symbol.iterator]: () => Iterator<string> }>, 'a'>
  >,
  Expect<Equal<Paths<{ [Symbol.iterator]: () => Iterator<string> }>, never>>,
  Expect<
    Equal<Paths<{ x: { [Symbol.iterator]: () => Iterator<string> } }>, 'x'>
  >,
  Expect<
    Equal<
      Paths<{
        [Symbol.toStringTag]: string;
        [k: symbol]: unknown;
        real: { deep: boolean };
      }>,
      'real' | 'real.deep'
    >
  >,
];

// Error is an ordinary object of four declared fields; `cause` is `unknown` and
// stops there. Subclasses that add nothing add no paths.
type _ErrorShapes = [
  Expect<Equal<Paths<Error>, 'name' | 'message' | 'stack' | 'cause'>>,
  Expect<Equal<Paths<TypeError>, 'name' | 'message' | 'stack' | 'cause'>>,
  Expect<
    Equal<
      Paths<{ err: Error }>,
      'err' | 'err.name' | 'err.message' | 'err.stack' | 'err.cause'
    >
  >,
  Expect<
    Equal<
      Extract<Paths<AggregateError>, 'errors' | `errors.${number}`>,
      'errors' | `errors.${number}`
    >
  >,
  Expect<Equal<Get<Error, 'message'>, string>>,
  Expect<Equal<Get<Error, 'cause'>, unknown>>,
  Expect<Equal<Get<Error, 'nope'>, never>>,
];

// The widened `_Leaf` list terminates every opaque binary and collection type,
// so a field holding one contributes its own key and nothing below it.
type _LeafWidening = [
  Expect<Equal<Paths<Uint8Array>, never>>,
  Expect<Equal<Paths<Float64Array>, never>>,
  Expect<Equal<Paths<BigInt64Array>, never>>,
  Expect<Equal<Paths<ArrayBufferView>, never>>,
  Expect<Equal<Paths<ArrayBuffer>, never>>,
  Expect<Equal<Paths<SharedArrayBuffer>, never>>,
  Expect<Equal<Paths<DataView>, never>>,
  Expect<Equal<Paths<{ buf: Uint8Array }>, 'buf'>>,
  Expect<Equal<Paths<{ bufs: Uint8Array[] }>, 'bufs' | `bufs.${number}`>>,
  // Readonly collections match their mutable twins instead of dumping methods.
  Expect<Equal<Paths<ReadonlyMap<string, { a: number }>>, never>>,
  Expect<Equal<Paths<ReadonlySet<number>>, never>>,
  Expect<Equal<Paths<WeakMap<object, number>>, never>>,
  Expect<Equal<Paths<WeakSet<object>>, never>>,
  Expect<Equal<Paths<WeakRef<{ a: number }>>, never>>,
  // The boxed wrappers follow the primitives they wrap.
  Expect<Equal<Paths<String>, never>>,
  Expect<Equal<Paths<Number>, never>>,
  // `Function` is a leaf, so `callee` no longer walks `caller.caller...`.
  Expect<Equal<Paths<{ f: Function }>, 'f'>>,
  Expect<
    Equal<
      Paths<IArguments>,
      `${number}` | 'length' | 'callee' | `${number}.${string}`
    >
  >,
  Expect<
    Equal<
      Paths<{
        buf: Uint8Array;
        rm: ReadonlyMap<string, { a: number }>;
        wr: WeakRef<{ a: number }>;
        f: Function;
      }>,
      'buf' | 'rm' | 'wr' | 'f'
    >
  >,
];

// `Get` ignores `_Leaf`, so these hold whether or not the type is a leaf: the
// numeric index and the non-function fields of typed arrays and buffers resolve.
type _TypedArrayGet = [
  Expect<Equal<Get<Uint8Array, `${number}`>, number>>,
  Expect<Equal<Get<Uint8Array, '3'>, number>>,
  Expect<Equal<Get<Float64Array, `${number}`>, number>>,
  Expect<Equal<Get<BigInt64Array, `${number}`>, bigint>>,
  Expect<Equal<Get<Uint8Array, 'length'>, number>>,
  Expect<Equal<Get<Uint8Array, 'BYTES_PER_ELEMENT'>, number>>,
  Expect<Equal<Get<Uint8Array, 'buffer'>, ArrayBuffer | SharedArrayBuffer>>,
  Expect<Equal<Get<Uint8Array, 'buffer.byteLength'>, number>>,
  Expect<Equal<Get<Uint8Array, 'nope'>, never>>,
  Expect<Equal<Get<ArrayBuffer, 'byteLength'>, number>>,
  Expect<Equal<Get<SharedArrayBuffer, 'byteLength'>, number>>,
  Expect<Equal<Get<DataView, 'byteOffset'>, number>>,
  Expect<Equal<Get<IArguments, 'length'>, number>>,
  Expect<Equal<Get<IArguments, `${number}`>, any>>,
  Expect<Equal<Get<IArguments, 'callee'>, Function>>,
];

// Intended limitation: a member typed `any` widens to `Paths<any>` = string, so
// the wildcard swallows every path below it.
type _AnyMembers = [
  Expect<Equal<Paths<any>, string>>,
  Expect<
    Equal<
      Extract<Paths<IArguments>, `${number}.${string}`>,
      `${number}.${string}`
    >
  >,
  Expect<
    Equal<
      Extract<Paths<AggregateError>, `errors.${number}.${string}`>,
      `errors.${number}.${string}`
    >
  >,
];

// Same for the collections that `_Leaf` now lists: their members still resolve
// through `Get`, which enumerates nothing and consults no leaf list.
type _CollectionGet = [
  Expect<Equal<Get<ReadonlyMap<string, number>, 'size'>, number>>,
  Expect<Equal<Get<ReadonlySet<number>, 'size'>, number>>,
  Expect<
    Equal<
      Get<WeakMap<object, number>, 'get'>,
      (key: object) => number | undefined
    >
  >,
  Expect<Equal<Get<WeakSet<object>, 'has'>, (value: object) => boolean>>,
  Expect<
    Equal<Get<WeakRef<{ a: number }>, 'deref'>, () => { a: number } | undefined>
  >,
  Expect<
    Equal<Get<{ wr: WeakRef<{ a: number }> }, 'wr'>, WeakRef<{ a: number }>>
  >,
  Expect<
    Equal<
      Get<Iterator<string>, 'next'>,
      (...args: [] | [any]) => IteratorResult<string, any>
    >
  >,
  Expect<Equal<Get<Iterator<string>, 'nope'>, never>>,
  Expect<
    Equal<
      Get<Generator<string>, 'next'>,
      (...args: [] | [any]) => IteratorResult<string, any>
    >
  >,
  Expect<Equal<Get<String, 'length'>, number>>,
  Expect<Equal<Get<String, '0'>, string>>,
  Expect<Equal<Get<Number, 'valueOf'>, () => number>>,
  Expect<Equal<Get<Boolean, 'valueOf'>, () => boolean>>,
];

// Intended limitation: `Get` never consults `_Leaf`, so it reaches members of a
// type `Paths` refuses to enumerate. `GetStrict` cannot express these.
type _GetReachesIntoLeaves = [
  Expect<Equal<Get<Map<string, number>, 'size'>, number>>,
  Expect<Equal<Get<Set<number>, 'size'>, number>>,
  Expect<Equal<Get<ReadonlyMap<string, number>, 'size'>, number>>,
  Expect<Equal<Get<Uint8Array, 'length'>, number>>,
  Expect<Equal<Get<ArrayBuffer, 'byteLength'>, number>>,
  Expect<Equal<Get<{ f: Function }, 'f.name'>, string>>,
];

// A thenable declared inline is an ordinary object: `then` is a method, so it
// enumerates as a leaf path and stops there.
type _ThenableShapes = [
  Expect<
    Equal<
      Paths<{ t: { then(cb: (v: { a: number }) => void): void } }>,
      't' | 't.then'
    >
  >,
  Expect<
    Equal<
      Paths<
        { t: { then(cb: (v: { a: number }) => void): void } },
        { depth: 1 }
      >,
      't'
    >
  >,
  Expect<
    Equal<
      Get<{ t: { then(cb: (v: { a: number }) => void): void } }, 't.then'>,
      (cb: (v: { a: number }) => void) => void
    >
  >,
];

// A call signature makes a type a leaf however many properties it carries, so a
// callable object stops at its own key. `Function` is on the leaf list and every
// constructor type is assignable to it, so a constructor stops there too.
interface Callable {
  (): void;
  prop: { z: number };
}
interface Ctor {
  new (): { a: number };
  tag: string;
}
type _CallableVsConstruct = [
  Expect<Equal<Paths<Callable>, never>>,
  Expect<Equal<Paths<{ f: Callable }>, 'f'>>,
  Expect<
    Equal<
      Paths<{ f: { (x: string): void; (x: number): void; prop: { z: 1 } } }>,
      'f'
    >
  >,
  Expect<
    Equal<Paths<{ b: { (): void; new (): { a: number }; tag: string } }>, 'b'>
  >,
  Expect<Equal<Paths<Ctor>, never>>,
  Expect<Equal<Paths<{ c: Ctor }>, 'c'>>,
  Expect<
    Equal<Paths<{ c: { new (): { a: number }; meta: { deep: boolean } } }>, 'c'>
  >,
  Expect<Equal<Paths<{ c: { new <T>(v: T): T; tag: string } }>, 'c'>>,
  // A bare construct signature has no keys of its own.
  Expect<Equal<Paths<{ c: new () => { a: number } }>, 'c'>>,
  Expect<Equal<Paths<{ c: abstract new () => { a: number } }>, 'c'>>,
  // The loose `Get` still reads a static off the leaf.
  Expect<Equal<Get<{ c: Ctor }, 'c.tag'>, string>>,
];

// @ts-expect-error a constructor type is a leaf, so its statics are not paths
type _NegCtorTag = GetStrict<{ c: Ctor }, 'c.tag'>;
// @ts-expect-error a construct signature contributes no path
type _NegCtorNew = GetStrict<{ c: Ctor }, 'c.new'>;

// Class member kinds: accessors are properties and recurse; `#private`,
// `private`, `protected` and `static` members are all outside `keyof`.
// biome-ignore lint/correctness/noUnusedPrivateClassMembers: the unused `#p` is the case
declare class Acc {
  get x(): { deep: number };
  set y(v: { w: number });
  #p: number;
  static s: string;
  private q: number;
  protected r: { rr: number };
}
// biome-ignore lint/correctness/noUnusedPrivateClassMembers: the unused `#hidden` is the case
declare class OnlyPrivate {
  #hidden: { a: number };
}
// biome-ignore lint/complexity/noStaticOnlyClass: a static-only class is the case
declare class OnlyStatic {
  static s: { deep: number };
}
type _ClassMemberKinds = [
  Expect<Equal<Paths<Acc>, 'x' | 'y' | 'x.deep' | 'y.w'>>,
  Expect<Equal<Paths<{ a: Acc }>, 'a' | 'a.x' | 'a.y' | 'a.x.deep' | 'a.y.w'>>,
  Expect<Equal<Paths<{ o: OnlyPrivate }>, 'o'>>,
  // The static side is a constructor type, so `typeof` is a leaf and neither the
  // statics nor the prototype are enumerated.
  Expect<Equal<Paths<typeof OnlyStatic>, never>>,
  Expect<Equal<Paths<typeof Acc>, never>>,
  Expect<Equal<Get<typeof OnlyStatic, 's.deep'>, number>>,
  Expect<Equal<Get<{ a: Acc }, 'a.x.deep'>, number>>,
  // A set-only accessor reads as its parameter type.
  Expect<Equal<Get<Acc, 'y'>, { w: number }>>,
  Expect<Equal<Get<Acc, 'p'>, never>>,
  Expect<Equal<Get<Acc, 'q'>, never>>,
  Expect<Equal<Get<Acc, 's'>, never>>,
  Expect<Equal<GetStrict<{ a: Acc }, 'a.x.deep'>, number>>,
  Expect<Equal<GetStrict<{ a: Acc }, 'a.y'>, { w: number }>>,
];

// @ts-expect-error a `#private` field is not a path
type _NegAccPrivate = GetStrict<{ a: Acc }, 'a.p'>;
// @ts-expect-error a static member is not an instance path
type _NegAccStatic = GetStrict<{ a: Acc }, 'a.s'>;

// A mapped-modifier wrapper preserves the array-like key domain, and a union
// with a real array unions the two branches' paths rather than collapsing.
interface UnionBag {
  x: ArrayLike<{ a: number }> | { a: number }[];
}
type _ArrayLikeWrappedAndUnioned = [
  Expect<
    Equal<
      Paths<Partial<ArrayLike<{ a: number }>>>,
      `${number}` | 'length' | `${number}.a`
    >
  >,
  Expect<
    Equal<
      Paths<Required<ArrayLike<{ a: number }>>>,
      `${number}` | 'length' | `${number}.a`
    >
  >,
  Expect<
    Equal<
      Paths<Readonly<ArrayLike<{ a: number }>>>,
      `${number}` | 'length' | `${number}.a`
    >
  >,
  Expect<
    Equal<
      Paths<{ p: Partial<ArrayLike<{ a: number }>> }>,
      'p' | `p.${number}` | 'p.length' | `p.${number}.a`
    >
  >,
  Expect<Equal<Paths<Pick<ArrayLike<{ a: number }>, 'length'>>, 'length'>>,
  Expect<
    Equal<
      Paths<Omit<ArrayLike<{ a: number }>, 'length'>>,
      `${number}` | `${number}.a`
    >
  >,
  Expect<
    Equal<Paths<UnionBag>, 'x' | `x.${number}` | 'x.length' | `x.${number}.a`>
  >,
  Expect<
    Equal<
      Paths<ArrayLike<{ a: number }> | { a: number }[]>,
      `${number}` | 'length' | `${number}.a`
    >
  >,
  Expect<
    Equal<
      Paths<{ x: ArrayLike<{ a: number }> | { b: number } }>,
      'x' | `x.${number}` | 'x.length' | `x.${number}.a` | 'x.b'
    >
  >,
  // NonNullable collapses the nullable member before recursing.
  Expect<
    Equal<
      Paths<{ x: ArrayLike<{ a: number }> | undefined }>,
      'x' | `x.${number}` | 'x.length' | `x.${number}.a`
    >
  >,
  Expect<Equal<Get<UnionBag, 'x.0.a'>, number>>,
  Expect<Equal<Get<UnionBag, 'x.length'>, number>>,
  Expect<
    Equal<
      Get<Partial<ArrayLike<{ a: number }>>, '0'>,
      { a: number } | undefined
    >
  >,
  Expect<
    Equal<Get<Partial<ArrayLike<{ a: number }>>, 'length'>, number | undefined>
  >,
  Expect<Equal<GetStrict<UnionBag, 'x.length'>, number>>,
  Expect<Equal<GetStrict<UnionBag, `x.${number}.a`>, number>>,
  Expect<Equal<GetStrict<UnionBag, 'x.3.a'>, number>>,
];

// A missing segment now distributes over the union, so an optional or nullable
// array-like resolves through `Get` on every path `Paths` lists for it.
type _NullableRoundTrips = [
  Expect<
    Equal<
      Paths<{ al?: ArrayLike<{ a: number }> }>,
      'al' | `al.${number}` | 'al.length' | `al.${number}.a`
    >
  >,
  Expect<Equal<Get<{ al?: ArrayLike<{ a: number }> }, 'al.length'>, number>>,
  Expect<Equal<Get<{ al?: ArrayLike<{ a: number }> }, 'al.0'>, { a: number }>>,
  Expect<
    Equal<Get<{ al?: ArrayLike<{ a: number }> }, `al.${number}.a`>, number>
  >,
  Expect<
    Equal<
      Get<{ al: ArrayLike<{ a: number }> | null }, `al.${number}.a`>,
      number
    >
  >,
  Expect<
    Equal<Get<{ al: ArrayLike<{ a: number }> | null }, 'al.length'>, number>
  >,
  Expect<Equal<Get<{ buf?: Uint8Array }, 'buf.length'>, number>>,
  Expect<Equal<Get<{ m?: ReadonlyMap<string, number> }, 'm.size'>, number>>,
  Expect<Equal<Get<{ al?: ArrayLike<{ a: number }> }, 'al.nope'>, never>>,
  Expect<
    Equal<GetStrict<{ al?: ArrayLike<{ a: number }> }, 'al.length'>, number>
  >,
  Expect<
    Equal<
      GetStrict<{ al?: ArrayLike<{ a: number }> }, `al.${number}.a`>,
      number
    >
  >,
  // A `Partial` wrapper keeps the `| undefined` on its own members.
  Expect<Equal<Get<Partial<ArrayLike<{ a: number }>>, '0.a'>, number>>,
];
