// A/B baseline mirror of combined.scenario.ts using the frozen original impl.
// biome-ignore-all lint: benchmark scenario, type-only
import type { ArrayHeavy, Matrix, Sink, Wide } from './fixtures';
import type { GetOrig, PathsOrig } from './orig-impl';

type RoundTrip<T> = { [P in PathsOrig<T>]: GetOrig<T, P> };
type Values<T> = T[keyof T];

type _M = Values<RoundTrip<Matrix>>;
type _W = Values<RoundTrip<Wide>>;
type _A = Values<RoundTrip<ArrayHeavy>>;
type _S = Values<RoundTrip<Sink>>;

export type _CombinedBench = _M | _W | _A | _S;
declare const _use: _CombinedBench;
export { _use };
