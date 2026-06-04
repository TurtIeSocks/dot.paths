// A/B baseline mirror of paths.scenario.ts using the frozen original impl.
// biome-ignore-all lint: benchmark scenario, type-only
import type { ArrayHeavy, Deep, Matrix, Sink, Wide } from './fixtures';
import type { PathsOrig } from './orig-impl';

type _Force<T extends string> = T;

type _M = _Force<PathsOrig<Matrix>>;
type _W = _Force<PathsOrig<Wide>>;
type _D = _Force<PathsOrig<Deep>>;
type _A = _Force<PathsOrig<ArrayHeavy>>;
type _S = _Force<PathsOrig<Sink>>;

export type _PathsBench = _M | _W | _D | _A | _S;
declare const _use: _PathsBench;
export { _use };
