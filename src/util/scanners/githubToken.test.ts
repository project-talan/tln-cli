import { afterEach, describe, expect, it, vi } from 'vitest';

const { readFileMock } = vi.hoisted(() => ({ readFileMock: vi.fn() }));
vi.mock('node:fs', () => ({ promises: { readFile: readFileMock } }));

import { resolveGithubToken } from './githubToken.js';

describe('resolveGithubToken', () => {
  afterEach(() => {
    readFileMock.mockReset();
    delete process.env['GITHUB_TOKEN'];
  });

  it('prefers an explicit token over everything else', async () => {
    process.env['GITHUB_TOKEN'] = 'env-token';
    readFileMock.mockResolvedValue('file-token');

    expect(await resolveGithubToken('explicit-token')).toBe('explicit-token');
    expect(readFileMock).not.toHaveBeenCalled();
  });

  it('falls back to GITHUB_TOKEN when no explicit token is given', async () => {
    process.env['GITHUB_TOKEN'] = 'env-token';
    readFileMock.mockResolvedValue('file-token');

    expect(await resolveGithubToken()).toBe('env-token');
    expect(readFileMock).not.toHaveBeenCalled();
  });

  it('falls back to a file on disk, trimmed, when neither explicit nor env token is set', async () => {
    readFileMock.mockResolvedValue('file-token\n');

    expect(await resolveGithubToken()).toBe('file-token');
  });

  it('returns undefined when nothing provides a token (a missing file is not an error)', async () => {
    readFileMock.mockRejectedValue(new Error('ENOENT'));

    expect(await resolveGithubToken()).toBeUndefined();
  });

  it('returns undefined for an empty explicit value, deferring to the next source', async () => {
    process.env['GITHUB_TOKEN'] = 'env-token';

    expect(await resolveGithubToken('')).toBe('env-token');
  });
});
