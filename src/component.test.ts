import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import { promises as fs } from 'node:fs';
import os from 'node:os';
import path from 'node:path';
import { execSync } from 'node:child_process';
import { Component, create, hasConfig, splitComponents, type ComponentDescription } from './component.js';

vi.mock('node:child_process', async (importOriginal) => {
  const actual = await importOriginal<typeof import('node:child_process')>();
  return { ...actual, execSync: vi.fn() };
});

const mockedExecSync = vi.mocked(execSync);

describe('splitComponents', () => {
  it('splits a colon-delimited string into parts', () => {
    expect(splitComponents('maven:boost:bootstrap')).toEqual(['maven', 'boost', 'bootstrap']);
  });

  it('returns an empty array for an empty string', () => {
    expect(splitComponents('')).toEqual([]);
  });
});

describe('Component constructor', () => {
  it('stores parent/id/home and takes a defensive copy of the inherited descriptions', () => {
    const parent = new Component(null, 'parent', '/parent-home');
    const inherited: ComponentDescription[] = [{ source: 'a' }];
    const child = new Component(parent, 'child', '/child-home', inherited);

    expect(child.parent).toBe(parent);
    expect(child.id).toBe('child');
    expect(child.home).toBe('/child-home');
    expect(child.descriptions).toEqual(inherited);

    inherited.push({ source: 'b' });
    expect(child.descriptions).toHaveLength(1);
  });
});

describe('Component#init', () => {
  let tempDirs: string[];

  beforeEach(() => {
    tempDirs = [];
  });

  afterEach(async () => {
    await Promise.all(tempDirs.map((dir) => fs.rm(dir, { recursive: true, force: true })));
  });

  async function makeTempDir(): Promise<string> {
    const dir = await fs.mkdtemp(path.join(os.tmpdir(), 'tln-component-test-'));
    tempDirs.push(dir);
    return dir;
  }

  it("loads the component's own .tln.tjs file and tags its source", async () => {
    const dir = await makeTempDir();
    await fs.writeFile(path.join(dir, '.tln.tjs'), `module.exports = { env: async (tln, env) => { env.FOO = 'bar'; } };`, 'utf-8');

    const component = new Component(null, 'root', dir);
    await component.init();

    expect(component.descriptions).toHaveLength(1);
    expect(component.descriptions[0]!.source).toBe(path.join(dir, '.tln.tjs'));
    expect(typeof component.descriptions[0]!.env).toBe('function');
  });

  it('merges .tln folder subfolder configs, sorted by folder name, after the own file', async () => {
    const dir = await makeTempDir();
    await fs.writeFile(path.join(dir, '.tln.tjs'), `module.exports = {};`, 'utf-8');
    await fs.mkdir(path.join(dir, '.tln', 'zeta'), { recursive: true });
    await fs.mkdir(path.join(dir, '.tln', 'alpha'), { recursive: true });
    await fs.writeFile(path.join(dir, '.tln', 'zeta', '.tln.tjs'), `module.exports = {};`, 'utf-8');
    await fs.writeFile(path.join(dir, '.tln', 'alpha', '.tln.tjs'), `module.exports = {};`, 'utf-8');
    // Stray non-directory entry inside .tln — must be ignored, not treated as a config source.
    await fs.writeFile(path.join(dir, '.tln', 'notes.txt'), 'ignore me', 'utf-8');

    const component = new Component(null, 'root', dir);
    await component.init();

    expect(component.descriptions.map((d) => d.source)).toEqual([
      path.join(dir, '.tln.tjs'),
      path.join(dir, '.tln', 'alpha', '.tln.tjs'),
      path.join(dir, '.tln', 'zeta', '.tln.tjs'),
    ]);
  });

  it('keeps only the inherited descriptions when there is no local .tln.tjs or .tln folder', async () => {
    const dir = await makeTempDir();
    const inherited: ComponentDescription = { source: 'inherited-from-parent' };

    const component = new Component(null, 'root', dir, [inherited]);
    await component.init();

    expect(component.descriptions).toEqual([inherited]);
  });

  it('throws a descriptive error naming the file when .tln.tjs has invalid syntax', async () => {
    const dir = await makeTempDir();
    await fs.writeFile(path.join(dir, '.tln.tjs'), 'module.exports = { broken:', 'utf-8');

    const component = new Component(null, 'root', dir);

    await expect(component.init()).rejects.toThrow(path.join(dir, '.tln.tjs'));
  });
});

describe('Component#run', () => {
  beforeEach(() => {
    mockedExecSync.mockReset();
  });

  it('dry-run prints resolved command lines without executing anything', async () => {
    const logSpy = vi.spyOn(console, 'log').mockImplementation(() => undefined);
    const component = new Component(null, 'test', '/fake/home', [
      {
        source: 'inline',
        commands: async () => ({
          greet: { builder: async () => ['echo one', 'echo two'], access: 'public' },
        }),
      },
    ]);

    await component.run('greet', true);

    expect(logSpy).toHaveBeenCalledWith('echo one');
    expect(logSpy).toHaveBeenCalledWith('echo two');
    expect(mockedExecSync).not.toHaveBeenCalled();

    logSpy.mockRestore();
  });

  it('resolves batch/alias builders and skips cross-component references with a warning', async () => {
    const logSpy = vi.spyOn(console, 'log').mockImplementation(() => undefined);
    const warnSpy = vi.spyOn(console, 'warn').mockImplementation(() => undefined);
    const component = new Component(null, 'test', '/fake/home', [
      {
        source: 'inline',
        commands: async () => ({
          greet: { builder: async () => ['echo greet-line'], access: 'public' },
          batch: { builder: ['other:thing', 'greet'], access: 'protected' },
        }),
      },
    ]);

    await component.run('batch', true);

    expect(warnSpy).toHaveBeenCalledWith(expect.stringContaining('other:thing'));
    expect(logSpy).toHaveBeenCalledWith('echo greet-line');

    logSpy.mockRestore();
    warnSpy.mockRestore();
  });

  it('throws when the command is not found in any description', async () => {
    const component = new Component(null, 'test', '/fake/home', []);

    await expect(component.run('missing')).rejects.toThrow('Command "missing" not found in component "test"');
  });

  it('writes resolved lines to a temp script under <tmpdir>/talan/cli and executes it', async () => {
    const component = new Component(null, 'test', '/fake/home', [
      {
        source: 'inline',
        commands: async () => ({
          greet: { builder: async () => ['echo one', '', 'echo two'], access: 'public' },
        }),
      },
    ]);

    await component.run('greet');

    expect(mockedExecSync).toHaveBeenCalledTimes(1);
    const [scriptPath, options] = mockedExecSync.mock.calls[0]!;
    expect(typeof scriptPath).toBe('string');
    expect(scriptPath as string).toContain(path.join(os.tmpdir(), 'talan', 'cli'));
    expect(options).toMatchObject({ cwd: '/fake/home', stdio: 'inherit' });

    const content = await fs.readFile(scriptPath as string, 'utf-8');
    expect(content).toBe(['#!/usr/bin/env bash', 'set -e', 'echo one', 'echo two', ''].join('\n'));

    await fs.rm(scriptPath as string, { force: true });
  });
});

describe('create', () => {
  it('builds the root component (id "/", no parent) and loads its config', async () => {
    const dir = await fs.mkdtemp(path.join(os.tmpdir(), 'tln-component-test-'));
    try {
      await fs.writeFile(path.join(dir, '.tln.tjs'), 'module.exports = { env: async () => {} };', 'utf-8');

      const root = await create(dir);

      expect(root.id).toBe('/');
      expect(root.parent).toBeNull();
      expect(root.home).toBe(dir);
      expect(root.descriptions).toHaveLength(1);
      expect(root.descriptions[0]!.source).toBe(path.join(dir, '.tln.tjs'));
    } finally {
      await fs.rm(dir, { recursive: true, force: true });
    }
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
    const dir = await fs.mkdtemp(path.join(os.tmpdir(), 'tln-component-test-'));
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

describe('Component#buildChild', () => {
  let tempDirs: string[];

  beforeEach(() => {
    tempDirs = [];
  });

  afterEach(async () => {
    await Promise.all(tempDirs.map((dir) => fs.rm(dir, { recursive: true, force: true })));
  });

  async function makeTempDir(): Promise<string> {
    const dir = await fs.mkdtemp(path.join(os.tmpdir(), 'tln-component-test-'));
    tempDirs.push(dir);
    return dir;
  }

  it('builds a child at path.join(parent.home, id), inheriting parent descriptions', async () => {
    const dir = await makeTempDir();
    await fs.mkdir(path.join(dir, 'nested'));
    const inherited: ComponentDescription = { source: 'inherited-from-parent' };
    const parent = new Component(null, 'root', dir, [inherited]);

    const child = await parent.buildChild('nested');

    expect(child.id).toBe('nested');
    expect(child.parent).toBe(parent);
    expect(child.home).toBe(path.join(dir, 'nested'));
    expect(child.descriptions).toEqual([inherited]);
  });

  it('caches the child on repeat calls with the same id', async () => {
    const dir = await makeTempDir();
    await fs.mkdir(path.join(dir, 'nested'));
    const parent = new Component(null, 'root', dir);

    const first = await parent.buildChild('nested');
    const second = await parent.buildChild('nested');

    expect(second).toBe(first);
  });
});
