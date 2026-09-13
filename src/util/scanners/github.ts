export interface GithubRelease {
  tag_name: string;
}

export interface GithubTag {
  name: string;
}

/** `Authorization` header for an optional token — unauthenticated when none is given. Token resolution (CLI flag / env var / file on disk) is the caller's concern, see `githubToken.ts`'s `resolveGithubToken`. */
function githubHeaders(token?: string): HeadersInit {
  return token ? { Authorization: `token ${token}` } : {};
}

/**
 * Fetches every page of a GitHub REST list endpoint (port of old/update.js's
 * `it`/`options.page` loop), stopping once a page comes back empty or short of a
 * full `per_page`. Throws on a non-2xx response (e.g. rate limiting) so the caller
 * (see `catalog.ts`) can isolate the failure to this one scanner.
 */
async function fetchAllGithubPages<T>(url: string, token?: string): Promise<T[]> {
  const results: T[] = [];
  const perPage = 100;
  for (let page = 1; ; page++) {
    const separator = url.includes('?') ? '&' : '?';
    const pageUrl = `${url}${separator}per_page=${perPage}&page=${page}`;
    const response = await fetch(pageUrl, { headers: githubHeaders(token) });
    if (!response.ok) {
      throw new Error(`GitHub API request failed (${response.status} ${response.statusText}): ${pageUrl}`);
    }
    const data = (await response.json()) as T[];
    if (data.length === 0) break;
    results.push(...data);
    if (data.length < perPage) break;
  }
  return results;
}

export function fetchAllGithubReleases(url: string, token?: string): Promise<GithubRelease[]> {
  return fetchAllGithubPages<GithubRelease>(url, token);
}

export function fetchAllGithubTags(url: string, token?: string): Promise<GithubTag[]> {
  return fetchAllGithubPages<GithubTag>(url, token);
}
