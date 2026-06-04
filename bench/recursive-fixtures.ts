// Recursive type fixtures — the case most prone to TS slowdowns and the
// reason the depth cap exists. Shared by recursive.scenario.ts and its -orig
// mirror so both measure the identical shapes.
// biome-ignore-all lint: benchmark fixtures, type-only

// Heavy branching recursion: four self-referential fields per node, so each
// depth level multiplies the number of sub-paths. Stresses Paths hardest.
export interface FatNode {
  id: string;
  name: string;
  value: number;
  flag: boolean;
  left: FatNode | null;
  right: FatNode | null;
  children: FatNode[];
  meta: { tag: string; weight: number; node: FatNode | null };
}

// Linear nullable recursion — exercises the exact depth-cap boundary cleanly.
export interface LinkedList {
  data: number;
  label: string;
  next: LinkedList | null;
}

// Mutual recursion across two interfaces.
export interface MutualA {
  name: string;
  value: number;
  b: MutualB;
  bs: MutualB[];
}
export interface MutualB {
  id: number;
  tag: string;
  a: MutualA;
  as: MutualA[];
}

// JSON-like recursive union (the classic recursive-union stress case).
export type JsonValue =
  | string
  | number
  | boolean
  | null
  | JsonObject
  | JsonArray;
export interface JsonObject {
  [key: string]: JsonValue;
}
export type JsonArray = JsonValue[];

// Recursive record map.
export interface TreeMap {
  name: string;
  nodes: Record<string, FatNode>;
  sub: Record<string, TreeMap>;
}

export interface RecursiveStore {
  fat: FatNode;
  list: LinkedList;
  mutual: MutualA;
  json: JsonObject;
  map: TreeMap;
}

// Explicit deep recursive paths for Get isolation (linear + branching +
// mutual + through-array). These traverse the recursive structures by hand so
// Get's cost on recursion is measured independently of Paths.
export type GET_PATHS_RECURSIVE =
  | 'fat.value'
  | 'fat.left.value'
  | 'fat.left.left.value'
  | 'fat.left.left.left.value'
  | 'fat.right.right.right.value'
  | 'fat.left.right.left.right.value'
  | 'fat.children.0.value'
  | 'fat.children.0.children.0.value'
  | 'fat.children.0.children.0.children.0.value'
  | 'fat.meta.node.meta.node.meta.tag'
  | 'fat.left.children.0.right.value'
  | 'list.next.data'
  | 'list.next.next.data'
  | 'list.next.next.next.data'
  | 'list.next.next.next.next.label'
  | 'mutual.b.a.b.a.name'
  | 'mutual.bs.0.as.0.b.id'
  | 'mutual.b.as.0.b.a.value'
  | 'map.sub.k.nodes.n.left.value'
  | 'map.nodes.n.children.0.meta.tag';
