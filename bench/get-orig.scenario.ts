// A/B baseline mirror of get.scenario.ts using the frozen original impl.
// biome-ignore-all lint: benchmark scenario, type-only
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
import type { GetOrig } from './orig-impl';

type GetAll<T, Ps extends string> = { [P in Ps]: GetOrig<T, P> };
type Values<T> = T[keyof T];

type _M = Values<GetAll<Matrix, GET_PATHS_MATRIX>>;
type _W = Values<GetAll<Wide, GET_PATHS_WIDE>>;
type _D = Values<GetAll<Deep, GET_PATHS_DEEP>>;
type _A = Values<GetAll<ArrayHeavy, GET_PATHS_ARRAY>>;

export type _GetBench = _M | _W | _D | _A;
declare const _use: _GetBench;
export { _use };
