/**
 * Per-command option shapes, shared between `App` (dispatch) and `Component`
 * (where a command's logic is actually implemented) so neither side redeclares
 * the same fields under a different name (e.g. `LsOptions` vs. `ComponentLsOptions`).
 */

export interface ConfigOptions {
  repo: string | undefined;
  update: boolean;
  folder: string | undefined;
  force: boolean;
  terse: boolean;
  depend: string[];
  inherit: string[];
}

export interface InspectOptions {
  json: boolean;
}

export interface LsOptions {
  /** Wrap the ancestor chain down to the target component around the result, instead of just its subtree. */
  parents: boolean;
  /** How many levels of children to include; `-1` means unlimited. */
  depth: number;
  /** Max children to include per level (<=0 means unlimited); the rest are counted in `more`. */
  limit: number;
  installedOnly: boolean;
}

export interface ExecOptions {
  command: string | undefined;
  input: string | undefined;
}
