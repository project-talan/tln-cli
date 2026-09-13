import type { GithubRelease, GithubTag } from './github.js';
import { SourceKind, type ScannerConfig, type Source } from './types.js';
import { normalizeTag } from './version.js';

/**
 * Fluent builder for one component's `ScannerConfig` — the Builder-pattern
 * counterpart to old/update.js's plain endpoint-descriptor object literals. The
 * `githubReleases`/`githubTags` factories below pre-wire the common
 * tag-name-to-version extraction, so a typical GitHub-based component needs only
 * `.at(relativePath).id(componentId).build()`; `.parse(...)` is there for the
 * handful that need something else (a compound tag, an HTML page, npm's version
 * map, ...). Every component ends up with exactly the same three identifying
 * fields (`relativePath`, `componentId`, the source's `urlSegment`) — no
 * per-component escape hatches.
 */
class ScannerConfigBuilder<Raw> {
  private relativePathValue?: string;
  private componentIdValue?: string;

  constructor(
    private readonly source: Source,
    private parseFn?: (raw: Raw) => string[],
  ) {}

  at(relativePath: string): this {
    this.relativePathValue = relativePath;
    return this;
  }

  id(componentId: string): this {
    this.componentIdValue = componentId;
    return this;
  }

  parse(fn: (raw: Raw) => string[]): this {
    this.parseFn = fn;
    return this;
  }

  build(): ScannerConfig {
    if (!this.relativePathValue) throw new Error('ScannerConfigBuilder: at(relativePath) was never called');
    if (!this.componentIdValue) throw new Error('ScannerConfigBuilder: id(componentId) was never called');
    if (!this.parseFn) throw new Error('ScannerConfigBuilder: parse(fn) was never called');
    return {
      relativePath: this.relativePathValue,
      componentId: this.componentIdValue,
      source: this.source,
      parse: this.parseFn as (raw: unknown) => string[],
    };
  }
}

/** `repo` is the plain GitHub shorthand `owner/name` (e.g. `kubernetes/kubernetes`) — stored as-is as `urlSegment`; `engine.ts`'s `fetchSource` expands it into the real REST API URL. */
export function githubReleases(repo: string): ScannerConfigBuilder<GithubRelease[]> {
  return new ScannerConfigBuilder<GithubRelease[]>({ kind: SourceKind.GithubReleases, urlSegment: repo }, (releases) => releases.map((release) => normalizeTag(release.tag_name)));
}

export function githubTags(repo: string): ScannerConfigBuilder<GithubTag[]> {
  return new ScannerConfigBuilder<GithubTag[]>({ kind: SourceKind.GithubTags, urlSegment: repo }, (tags) => tags.map((tag) => normalizeTag(tag.name)));
}

export function json<Raw>(url: string): ScannerConfigBuilder<Raw> {
  return new ScannerConfigBuilder<Raw>({ kind: SourceKind.Json, urlSegment: url });
}

export function html(url: string): ScannerConfigBuilder<string> {
  return new ScannerConfigBuilder<string>({ kind: SourceKind.Html, urlSegment: url });
}
