// Type-level benchmark scenario: realistic round-trip.
// Generates every path with `Paths`, then resolves each back through `Get` —
// the work the middleware's typings conceptually perform. Exercises both
// utilities together.
// biome-ignore-all lint: benchmark scenario, type-only
import type { Get, Paths } from '../src/index';
import type { ArrayHeavy, Matrix, Sink, Wide } from './fixtures';

type RoundTrip<T> = { [P in Paths<T>]: Get<T, P> };
type Values<T> = T[keyof T];

type _M = Values<RoundTrip<Matrix>>;
type _W = Values<RoundTrip<Wide>>;
type _A = Values<RoundTrip<ArrayHeavy>>;
type _S = Values<RoundTrip<Sink>>;

export type _CombinedBench = _M | _W | _A | _S;
declare const _use: _CombinedBench;
export { _use };
