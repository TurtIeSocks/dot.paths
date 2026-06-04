// Type-level benchmark scenario: `Paths` in isolation.
// biome-ignore-all lint: benchmark scenario, type-only
import type { Paths } from '../src/index';
import type { ArrayHeavy, Deep, Matrix, Sink, Wide } from './fixtures';

// Force full union expansion by constraining the result to `string`.
type _Force<T extends string> = T;

type _M = _Force<Paths<Matrix>>;
type _W = _Force<Paths<Wide>>;
type _D = _Force<Paths<Deep>>;
type _A = _Force<Paths<ArrayHeavy>>;
type _S = _Force<Paths<Sink>>;

// Export to force the checker to fully resolve each result type.
export type _PathsBench = _M | _W | _D | _A | _S;
declare const _use: _PathsBench;
export { _use };
