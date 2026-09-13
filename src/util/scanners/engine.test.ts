import { afterEach, describe, expect, it, vi } from 'vitest';
import path from 'node:path';

const { fetchJsonMock, fetchTextMock } = vi.hoisted(() => ({ fetchJsonMock: vi.fn(), fetchTextMock: vi.fn() }));
vi.mock('./http.js', () => ({ fetchJson: fetchJsonMock, fetchText: fetchTextMock }));

const { fetchAllGithubReleasesMock, fetchAllGithubTagsMock } = vi.hoisted(() => ({
  fetchAllGithubReleasesMock: vi.fn(),
  fetchAllGithubTagsMock: vi.fn(),
}));
vi.mock('./github.js', () => ({
  fetchAllGithubReleases: fetchAllGithubReleasesMock,
  fetchAllGithubTags: fetchAllGithubTagsMock,
}));

const { writeFileMock } = vi.hoisted(() => ({ writeFileMock: vi.fn() }));
vi.mock('node:fs', () => ({ promises: { writeFile: writeFileMock } }));

import { catalogFilePath, runScanner, runWithConcurrency, writeCatalogFile } from './engine.js';
import { SourceKind, type ScannerConfig } from './types.js';

describe('runScanner', () => {
  afterEach(() => vi.clearAllMocks());

  it('dispatches a json source to fetchJson (urlSegment as-is), then parse, sort, and prefix with componentId', async () => {
    fetchJsonMock.mockResolvedValue([{ v: '1.0.0' }, { v: '2.0.0' }]);
    const config: ScannerConfig = {
      relativePath: 'x',
      componentId: 'x',
      source: { kind: SourceKind.Json, urlSegment: 'https://example.test' },
      parse: (raw) => (raw as { v: string }[]).map((e) => e.v),
    };

    const entries = await runScanner(config);

    expect(fetchJsonMock).toHaveBeenCalledWith('https://example.test');
    expect(entries).toEqual([{ id: 'x@2.0.0' }, { id: 'x@1.0.0' }]);
  });

  it('dispatches an html source to fetchText (urlSegment as-is)', async () => {
    fetchTextMock.mockResolvedValue('<html></html>');
    const config: ScannerConfig = {
      relativePath: 'x',
      componentId: 'x',
      source: { kind: SourceKind.Html, urlSegment: 'https://example.test' },
      parse: () => ['1.0.0'],
    };

    const entries = await runScanner(config);

    expect(fetchTextMock).toHaveBeenCalledWith('https://example.test');
    expect(entries).toEqual([{ id: 'x@1.0.0' }]);
  });

  it('dispatches a github-releases source, expanding urlSegment (owner/repo) into the real REST API URL, forwarding the githubToken', async () => {
    fetchAllGithubReleasesMock.mockResolvedValue([{ tag_name: 'v1.0.0' }]);
    const config: ScannerConfig = {
      relativePath: 'x',
      componentId: 'x',
      source: { kind: SourceKind.GithubReleases, urlSegment: 'a/b' },
      parse: (raw) => (raw as { tag_name: string }[]).map((r) => r.tag_name),
    };

    await runScanner(config, 'secret');

    expect(fetchAllGithubReleasesMock).toHaveBeenCalledWith('https://api.github.com/repos/a/b/releases', 'secret');
  });

  it('dispatches a github-tags source, expanding urlSegment (owner/repo) into the real REST API URL, with no token when none is given', async () => {
    fetchAllGithubTagsMock.mockResolvedValue([{ name: '1.0.0' }]);
    const config: ScannerConfig = {
      relativePath: 'x',
      componentId: 'x',
      source: { kind: SourceKind.GithubTags, urlSegment: 'a/b' },
      parse: () => [],
    };

    await runScanner(config);

    expect(fetchAllGithubTagsMock).toHaveBeenCalledWith('https://api.github.com/repos/a/b/tags', undefined);
  });

  it('drops invalid versions the parse callback returns', async () => {
    fetchTextMock.mockResolvedValue('');
    const config: ScannerConfig = {
      relativePath: 'x',
      componentId: 'x',
      source: { kind: SourceKind.Html, urlSegment: 'https://example.test' },
      parse: () => ['1.0.0', 'not-a-version'],
    };

    vi.spyOn(console, 'warn').mockImplementation(() => undefined);
    const entries = await runScanner(config);
    vi.restoreAllMocks();

    expect(entries).toEqual([{ id: 'x@1.0.0' }]);
  });
});

describe('catalogFilePath', () => {
  it('joins catalogHome/relativePath/components.cjs', () => {
    expect(catalogFilePath('/catalog', 'k8s/knative')).toBe(path.join('/catalog', 'k8s/knative', 'components.cjs'));
  });
});

describe('writeCatalogFile', () => {
  afterEach(() => vi.clearAllMocks());

  it('writes entries as a module.exports array', async () => {
    await writeCatalogFile('/catalog/x/components.cjs', [{ id: 'x@1.0.0' }]);
    expect(writeFileMock).toHaveBeenCalledWith('/catalog/x/components.cjs', 'module.exports = [{"id":"x@1.0.0"}];\n');
  });
});

describe('runWithConcurrency', () => {
  it('runs every item exactly once, respecting the concurrency limit', async () => {
    let active = 0;
    let maxActive = 0;
    const seen: number[] = [];

    await runWithConcurrency([1, 2, 3, 4, 5], 2, async (item) => {
      active++;
      maxActive = Math.max(maxActive, active);
      await Promise.resolve();
      seen.push(item);
      active--;
    });

    expect(seen.sort()).toEqual([1, 2, 3, 4, 5]);
    expect(maxActive).toBeLessThanOrEqual(2);
  });
});
