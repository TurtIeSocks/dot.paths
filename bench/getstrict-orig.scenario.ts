// A/B baseline mirror of getstrict.scenario.ts using the frozen original impl.
// biome-ignore-all lint: benchmark scenario, type-only
import type { Matrix, Sink } from './fixtures';
import type { GetStrictOrig, PathsOrig } from './orig-impl';

type StrictAllOrig<T> = { [P in PathsOrig<T> & string]: GetStrictOrig<T, P> };
type Values<T> = T[keyof T];

type _M = Values<StrictAllOrig<Matrix>>;
type _S = Values<StrictAllOrig<Sink>>;

export type _GetStrictBenchOrig = _M | _S;
declare const _use: _GetStrictBenchOrig;
export { _use };
