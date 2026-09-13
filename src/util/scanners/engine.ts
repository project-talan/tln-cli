import { promises as fs } from 'node:fs';
import path from 'node:path';
import { GITHUB_API } from '../../config.js';
import { fetchAllGithubReleases, fetchAllGithubTags } from './github.js';
import { fetchJson, fetchText } from './http.js';
import { SourceKind, type CatalogEntry, type ScannerConfig, type Source } from './types.js';
import { sortVersionsDescending } from './version.js';

/**
 * Fetches `source.urlSegment` however `source.kind` calls for — the one place
 * that knows how each kind is actually requested: `Json`/`Html` fetch
 * `urlSegment` as-is (it's already a full URL); the GitHub kinds expand it
 * (a plain `owner/repo`) into the real REST API URL before paginating it.
 */
function fetchSource(source: Source, githubToken?: string): Promise<unknown> {
  switch (source.kind) {
    case SourceKind.Json:
      return fetchJson(source.urlSegment);
    case SourceKind.Html:
      return fetchText(source.urlSegment);
    case SourceKind.GithubReleases:
      return fetchAllGithubReleases(`${GITHUB_API}/repos/${source.urlSegment}/releases`, githubToken);
    case SourceKind.GithubTags:
      return fetchAllGithubTags(`${GITHUB_API}/repos/${source.urlSegment}/tags`, githubToken);
  }
}

/**
 * The one procedure every catalog component goes through, regardless of source
 * kind: call the upstream endpoint (`fetchSource`, which owns pagination and
 * error handling for its kind), hand the raw result to this component's own
 * `parse` callback, then apply the single shared validate/sort/prefix step —
 * every entry's id is uniformly `${componentId}@version`, no exceptions. Errors
 * from `fetchSource` or `parse` propagate to the caller (see `index.ts`'s
 * `scan`), which isolates them per component. `githubToken` (already resolved by
 * `index.ts`'s `scan`, see `githubToken.ts`) is only ever used for the GitHub
 * source kinds — ignored otherwise.
 */
export async function runScanner(config: ScannerConfig, githubToken?: string): Promise<CatalogEntry[]> {
  const raw = await fetchSource(config.source, githubToken);
  const rawVersions = config.parse(raw);
  const versions = sortVersionsDescending(rawVersions, config.componentId);
  return versions.map((version) => ({ id: `${config.componentId}@${version}` }));
}

export function catalogFilePath(catalogHome: string, relativePath: string): string {
  return path.join(catalogHome, relativePath, 'components.cjs');
}

export async function writeCatalogFile(filePath: string, entries: CatalogEntry[]): Promise<void> {
  await fs.writeFile(filePath, `module.exports = ${JSON.stringify(entries)};\n`);
}

/** Runs `task` over `items` with at most `limit` in flight at once — the scanners are independent network calls, no reason to serialize them. */
export async function runWithConcurrency<T>(items: readonly T[], limit: number, task: (item: T) => Promise<void>): Promise<void> {
  let nextIndex = 0;
  async function worker(): Promise<void> {
    while (nextIndex < items.length) {
      const item = items[nextIndex++]!;
      await task(item);
    }
  }
  const workerCount = Math.max(1, Math.min(limit, items.length));
  await Promise.all(Array.from({ length: workerCount }, worker));
}
