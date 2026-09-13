import { afterEach, describe, expect, it, vi } from 'vitest';
import { fetchAllGithubReleases, fetchAllGithubTags } from './github.js';

function jsonResponse(body: unknown, ok = true): Response {
  return {
    ok,
    status: ok ? 200 : 500,
    statusText: ok ? 'OK' : 'Internal Server Error',
    json: async () => body,
  } as Response;
}

const RELEASES_URL = 'https://api.github.com/repos/example/repo/releases';
const TAGS_URL = 'https://api.github.com/repos/example/repo/tags';

describe('fetchAllGithubReleases', () => {
  afterEach(() => {
    vi.unstubAllGlobals();
  });

  it('pages through full pages until a short page ends the loop', async () => {
    const page1 = Array.from({ length: 100 }, (_v, i) => ({ tag_name: `v1.${i}.0` }));
    const page2 = [{ tag_name: 'v2.0.0' }];
    const fetchMock = vi.fn().mockResolvedValueOnce(jsonResponse(page1)).mockResolvedValueOnce(jsonResponse(page2));
    vi.stubGlobal('fetch', fetchMock);

    const releases = await fetchAllGithubReleases(RELEASES_URL);

    expect(releases).toHaveLength(101);
    expect(fetchMock).toHaveBeenCalledTimes(2);
    expect(fetchMock.mock.calls[0]![0]).toBe(`${RELEASES_URL}?per_page=100&page=1`);
    expect(fetchMock.mock.calls[1]![0]).toBe(`${RELEASES_URL}?per_page=100&page=2`);
  });

  it('stops immediately on an empty first page', async () => {
    const fetchMock = vi.fn().mockResolvedValueOnce(jsonResponse([]));
    vi.stubGlobal('fetch', fetchMock);

    const releases = await fetchAllGithubReleases(RELEASES_URL);

    expect(releases).toEqual([]);
    expect(fetchMock).toHaveBeenCalledTimes(1);
  });

  it('sends an Authorization header only when a token is given', async () => {
    const fetchMock = vi.fn().mockResolvedValueOnce(jsonResponse([]));
    vi.stubGlobal('fetch', fetchMock);

    await fetchAllGithubReleases(RELEASES_URL, 'secret');

    const options = fetchMock.mock.calls[0]![1] as { headers: Record<string, string> };
    expect(options.headers['Authorization']).toBe('token secret');
  });

  it('sends no Authorization header when no token is given', async () => {
    const fetchMock = vi.fn().mockResolvedValueOnce(jsonResponse([]));
    vi.stubGlobal('fetch', fetchMock);

    await fetchAllGithubReleases(RELEASES_URL);

    const options = fetchMock.mock.calls[0]![1] as { headers: Record<string, string> };
    expect(options.headers['Authorization']).toBeUndefined();
  });

  it('throws on a non-2xx response', async () => {
    const fetchMock = vi.fn().mockResolvedValueOnce(jsonResponse(null, false));
    vi.stubGlobal('fetch', fetchMock);

    await expect(fetchAllGithubReleases(RELEASES_URL)).rejects.toThrow(/GitHub API request failed/);
  });
});

describe('fetchAllGithubTags', () => {
  afterEach(() => {
    vi.unstubAllGlobals();
  });

  it('pages the given URL as-is (the caller decides releases vs. tags)', async () => {
    const fetchMock = vi.fn().mockResolvedValueOnce(jsonResponse([{ name: '1.0.0' }]));
    vi.stubGlobal('fetch', fetchMock);

    const tags = await fetchAllGithubTags(TAGS_URL);

    expect(tags).toEqual([{ name: '1.0.0' }]);
    expect(fetchMock.mock.calls[0]![0]).toBe(`${TAGS_URL}?per_page=100&page=1`);
  });
});
