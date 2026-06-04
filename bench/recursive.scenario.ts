// Type-level benchmark scenario: recursive types (the depth-cap stress case).
// Exercises Paths on heavily self-referential / mutual / union-recursive types
// AND Get over explicit deep recursive paths.
// biome-ignore-all lint: benchmark scenario, type-only
import type { Get, Paths } from '../src/index';
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
type GetAll<T, Ps extends string> = { [P in Ps]: Get<T, P> };
type Values<T> = T[keyof T];

// Paths over each recursive shape (depth-cap expansion).
type _P1 = _Force<Paths<FatNode>>;
type _P2 = _Force<Paths<LinkedList>>;
type _P3 = _Force<Paths<MutualA>>;
type _P4 = _Force<Paths<JsonObject>>;
type _P5 = _Force<Paths<TreeMap>>;
type _P6 = _Force<Paths<RecursiveStore>>;

// Get over explicit deep recursive paths.
type _G = Values<GetAll<RecursiveStore, GET_PATHS_RECURSIVE>>;

export type _PathsBench = _P1 | _P2 | _P3 | _P4 | _P5 | _P6;
export type _GetBench = _G;
declare const _usePaths: _PathsBench;
declare const _useGet: _GetBench;
export { _usePaths, _useGet };
