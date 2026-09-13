/** One resolved version entry, matching the shape every `components.cjs` already stores. */
export interface CatalogEntry {
  id: string;
}

/**
 * The four ways `engine.ts`'s `fetchSource` knows how to retrieve a `Source.url` —
 * a single JSON/HTML fetch, or a paginated GitHub releases/tags listing. Never
 * serialized or compared against an external string, so plain auto-numbered
 * members are enough — no need to pin string values as if this crossed a boundary.
 */
export enum SourceKind {
  Json,
  Html,
  GithubReleases,
  GithubTags,
}

/**
 * Where one component's raw version data comes from — a `kind` and the
 * `urlSegment` needed to build the actual request for that kind. For `Json`/`Html`,
 * `urlSegment` already is the full URL to fetch. For the GitHub kinds, it's the
 * plain `owner/repo` shorthand (e.g. `kubernetes/kubernetes`) — `engine.ts`'s
 * `fetchSource` is the one place that expands it into the real REST API URL
 * (`https://api.github.com/repos/kubernetes/kubernetes/releases`) and dispatches
 * to the matching fetch procedure. A component never fetches for itself, it only
 * declares which kind of source it has and the raw segment locating it.
 */
export interface Source {
  kind: SourceKind;
  urlSegment: string;
}

/**
 * Data-driven description of one catalog component's upstream source — the
 * spiritual equivalent of one entry in old/update.js's `endpoints` array. Never
 * constructed by hand; see `builder.ts`'s fluent factories (`githubReleases`,
 * `githubTags`, `json`, `html`). Every component is fully described by exactly
 * these fields — no per-component escape hatches.
 */
export interface ScannerConfig {
  /** Folder under the catalog root this refreshes, relative to it, e.g. `'aws-cli'`, `'k8s/knative'` — joined onto the catalog root via `path.join` (see `engine.ts`'s `catalogFilePath`) to get the actual file to write. Purely a file-system location — not what selects this component. */
  relativePath: string;
  /**
   * This component's id: how it's selected via `scan(['knative'])` (note: that's
   * `'knative'`, not its `relativePath` `'k8s/knative'`), and, uniformly for every
   * component, the prefix embedded in each entry's id as `${componentId}@version`
   * (see `engine.ts`'s `runScanner`).
   */
  componentId: string;
  source: Source;
  /**
   * Extracts raw, unsorted, unvalidated version strings from whatever `fetchSource`
   * returned for this `source.kind` — the "specific callback function provided by
   * component configuration data" the shared engine (`runScanner`) calls after
   * fetching. Validation, sorting, and id-prefixing happen once, centrally, in
   * `runScanner` — this callback's only job is extraction.
   */
  parse: (raw: unknown) => string[];
}

export interface ScanOptions {
  /** Catalog root to read/write `components.cjs` under (see `App.catalogHome`). */
  catalogHome: string;
  /** When true, scan and report but don't write any file. */
  dryRun?: boolean;
  /** How many components to scan at once. */
  concurrency?: number;
  /** Explicit GitHub token (e.g. `--github-token`) — see `githubToken.ts`'s `resolveGithubToken` for the full precedence (this, then `GITHUB_TOKEN`, then a file on disk). Only used by the two GitHub source kinds. */
  githubToken?: string;
}

export type ScanResult =
  | { componentId: string; ok: true; count: number; filePath: string }
  | { componentId: string; ok: false; error: string };
