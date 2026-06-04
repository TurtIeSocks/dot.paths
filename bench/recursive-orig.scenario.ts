// A/B baseline mirror of recursive.scenario.ts using the frozen original impl.
// biome-ignore-all lint: benchmark scenario, type-only
import type { GetOrig, PathsOrig } from './orig-impl';
import type {
  FatNode,
  GET_PATHS_RECURSIVE,
  JsonObject,
  LinkedList,
  MutualA,
  RecursiveStore,
  TreeMap,
} from './recursive-fixtures';

type _Force<T extends string> = T;
type GetAll<T, Ps extends string> = { [P in Ps]: GetOrig<T, P> };
type Values<T> = T[keyof T];

type _P1 = _Force<PathsOrig<FatNode>>;
type _P2 = _Force<PathsOrig<LinkedList>>;
type _P3 = _Force<PathsOrig<MutualA>>;
type _P4 = _Force<PathsOrig<JsonObject>>;
type _P5 = _Force<PathsOrig<TreeMap>>;
type _P6 = _Force<PathsOrig<RecursiveStore>>;

type _G = Values<GetAll<RecursiveStore, GET_PATHS_RECURSIVE>>;

export type _PathsBench = _P1 | _P2 | _P3 | _P4 | _P5 | _P6;
export type _GetBench = _G;
declare const _usePaths: _PathsBench;
declare const _useGet: _GetBench;
export { _usePaths, _useGet };
