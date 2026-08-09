import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import { promises as fs } from 'node:fs';
import os from 'node:os';
import path from 'node:path';
import { hasConfig, isRootPath, splitIds } from './misc.js';

describe('splitIds', () => {
  it('splits a colon-delimited string into parts', () => {
    expect(splitIds('maven:boost:bootstrap')).toEqual(['maven', 'boost', 'bootstrap']);
  });

  it('splits a commands list the same way as a components list', () => {
    expect(splitIds('build:test')).toEqual(['build', 'test']);
  });

  it('returns an empty array for an empty string', () => {
    expect(splitIds('')).toEqual([]);
  });
});

describe('hasConfig', () => {
  let tempDirs: string[];

  beforeEach(() => {
    tempDirs = [];
  });

  afterEach(async () => {
    await Promise.all(tempDirs.map((dir) => fs.rm(dir, { recursive: true, force: true })));
  });

  async function makeTempDir(): Promise<string> {
    const dir = await fs.mkdtemp(path.join(os.tmpdir(), 'tln-misc-test-'));
    tempDirs.push(dir);
    return dir;
  }

  it('is true when a .tln.tjs file is present', async () => {
    const dir = await makeTempDir();
    await fs.writeFile(path.join(dir, '.tln.tjs'), 'module.exports = {};', 'utf-8');

    expect(await hasConfig(dir)).toBe(true);
  });

  it('is true when a .tln folder is present', async () => {
    const dir = await makeTempDir();
    await fs.mkdir(path.join(dir, '.tln'));

    expect(await hasConfig(dir)).toBe(true);
  });

  it('is false when neither is present', async () => {
    const dir = await makeTempDir();

    expect(await hasConfig(dir)).toBe(false);
  });
});

describe('isRootPath', () => {
  afterEach(() => {
    vi.restoreAllMocks();
  });

  it('is true at the posix filesystem root', () => {
    expect(isRootPath('/foo/bar', '/')).toBe(true);
    expect(isRootPath('/foo/bar', '/foo')).toBe(false);
  });

  it('is true at the drive root on win32', () => {
    // node's `path` module always uses posix separators on a posix host, even when
    // os.platform() is mocked — so this exercises isRootPath's win32 branch logic
    // (root = first path.sep-delimited segment of cwd) rather than real backslash paths.
    vi.spyOn(os, 'platform').mockReturnValue('win32');
    const cwd = ['C:', 'Users', 'x'].join(path.sep);

    expect(isRootPath(cwd, `C:${path.sep}`)).toBe(true);
    expect(isRootPath(cwd, ['C:', 'Users'].join(path.sep))).toBe(false);
  });
});
