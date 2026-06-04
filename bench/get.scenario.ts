// Type-level benchmark scenario: `Get` in isolation.
// Maps `Get` over explicit, pre-generated path-literal unions so the cost is
// attributable to `Get` alone (no `Paths` involved).
// biome-ignore-all lint: benchmark scenario, type-only
import type { Get } from '../src/index';
import type {
  ArrayHeavy,
  Deep,
  GET_PATHS_ARRAY,
  GET_PATHS_DEEP,
  GET_PATHS_MATRIX,
  GET_PATHS_WIDE,
  Matrix,
  Wide,
} from './fixtures';

// Resolve every path in the union, then index to force evaluation of every
// property value (each a separate `Get` instantiation).
type GetAll<T, Ps extends string> = { [P in Ps]: Get<T, P> };
type Values<T> = T[keyof T];

type _M = Values<GetAll<Matrix, GET_PATHS_MATRIX>>;
type _W = Values<GetAll<Wide, GET_PATHS_WIDE>>;
type _D = Values<GetAll<Deep, GET_PATHS_DEEP>>;
type _A = Values<GetAll<ArrayHeavy, GET_PATHS_ARRAY>>;

export type _GetBench = _M | _W | _D | _A;
declare const _use: _GetBench;
export { _use };
