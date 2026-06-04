// Frozen ORIGINAL implementation of Paths/Get (pre-optimization baseline).
// Used only by the *-orig benchmark scenarios so the optimized impl can be
// A/B-compared against it back-to-back in a single process — the only fair way
// to compare the noisy `Check time` metric (cross-session timing drifts with
// machine load/thermal state).
// biome-ignore-all lint: frozen baseline, benchmark-only

type _Leaf =
  | string
  | number
  | boolean
  | bigint
  | symbol
  | null
  | undefined
  | ((...args: never[]) => unknown)
  | Date
  | RegExp
  | Map<unknown, unknown>
  | Set<unknown>
  | Promise<unknown>;

type _Join<H extends string, T> = [T] extends [never]
  ? never
  : `${H}.${T & string}`;

export type PathsOrig<T, _D extends 0[] = []> = _D['length'] extends 8
  ? never
  : T extends _Leaf
    ? never
    : T extends readonly unknown[]
      ?
          | `${number}`
          | _Join<`${number}`, PathsOrig<NonNullable<T[number]>, [..._D, 0]>>
      : T extends object
        ? {
            [K in keyof T & string]:
              | K
              | _Join<K, PathsOrig<NonNullable<T[K]>, [..._D, 0]>>;
          }[keyof T & string]
        : never;

export type GetOrig<T, P extends string> = P extends `${infer H}.${infer R}`
  ? H extends keyof T
    ? GetOrig<T[H], R>
    : T extends readonly unknown[]
      ? GetOrig<T[number], R>
      : never
  : P extends keyof T
    ? T[P]
    : T extends readonly unknown[]
      ? T[number]
      : never;
