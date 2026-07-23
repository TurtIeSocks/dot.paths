// Type-level benchmark scenario: `GetStrict` (strict wrapper).
// Measures the real cost of the constraint (`P extends Paths<T>` forces a
// Paths<T> computation) plus resolution, mapped over every valid path.
// biome-ignore-all lint: benchmark scenario, type-only
import type { GetStrict, Paths } from '../src/index';
import type { Matrix, Sink } from './fixtures';

type StrictAll<T> = { [P in Paths<T> & string]: GetStrict<T, P> };
type Values<T> = T[keyof T];

type _M = Values<StrictAll<Matrix>>;
type _S = Values<StrictAll<Sink>>;

export type _GetStrictBench = _M | _S;
declare const _use: _GetStrictBench;
export { _use };
