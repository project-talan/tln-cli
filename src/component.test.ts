import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import { promises as fs } from 'node:fs';
import os from 'node:os';
import path from 'node:path';
import { execSync } from 'node:child_process';
import { Component, create } from './component.js';

vi.mock('node:child_process', async (importOriginal) => {
  const actual = await importOriginal<typeof import('node:child_process')>();
  return { ...actual, execSync: vi.fn() };
});

const mockedExecSync = vi.mocked(execSync);

describe('Component constructor', () => {
  it('stores parent/id/sourcePath/homePath', () => {
    const parent = new Component(null, 'parent', '/parent-src', '/parent-home');
    const child = new Component(parent, 'child', '/child-src', '/child-home');

    expect(child.parent).toBe(parent);
    expect(child.id).toBe('child');
    expect(child.sourcePath).toBe('/child-src');
    expect(child.homePath).toBe('/child-home');
  });

  it('has no descriptions before init() is called', () => {
    const component = new Component(null, 'root', '/src', '/home');

    expect(component.descriptions).toEqual([]);
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

  it("loads the component's own .tln.tjs file (from sourcePath) and tags its source", async () => {
    const dir = await makeTempDir();
    await fs.writeFile(path.join(dir, '.tln.tjs'), `module.exports = { env: async (tln, env) => { env.FOO = 'bar'; } };`, 'utf-8');

    const component = new Component(null, 'root', dir, dir);
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

    const component = new Component(null, 'root', dir, dir);
    await component.init();

    expect(component.descriptions.map((d) => d.source)).toEqual([
      path.join(dir, '.tln.tjs'),
      path.join(dir, '.tln', 'alpha', '.tln.tjs'),
      path.join(dir, '.tln', 'zeta', '.tln.tjs'),
    ]);
  });

  it('has no descriptions when there is no local .tln.tjs or .tln folder', async () => {
    const dir = await makeTempDir();

    const component = new Component(null, 'root', dir, dir);
    await component.init();

    expect(component.descriptions).toEqual([]);
  });

  it('throws a descriptive error naming the file when .tln.tjs has invalid syntax', async () => {
    const dir = await makeTempDir();
    await fs.writeFile(path.join(dir, '.tln.tjs'), 'module.exports = { broken:', 'utf-8');

    const component = new Component(null, 'root', dir, dir);

    await expect(component.init()).rejects.toThrow(path.join(dir, '.tln.tjs'));
  });
});

describe('Component#run', () => {
  let tempDirs: string[];

  beforeEach(() => {
    tempDirs = [];
    mockedExecSync.mockReset();
  });

  afterEach(async () => {
    await Promise.all(tempDirs.map((dir) => fs.rm(dir, { recursive: true, force: true })));
  });

  async function makeTempDir(): Promise<string> {
    const dir = await fs.mkdtemp(path.join(os.tmpdir(), 'tln-component-test-'));
    tempDirs.push(dir);
    return dir;
  }

  async function makeComponentWithCommands(tljs: string): Promise<Component> {
    const dir = await makeTempDir();
    await fs.writeFile(path.join(dir, '.tln.tjs'), tljs, 'utf-8');
    const component = new Component(null, 'test', dir, dir);
    await component.init();
    return component;
  }

  it('dry-run prints resolved command lines without executing anything', async () => {
    const logSpy = vi.spyOn(console, 'log').mockImplementation(() => undefined);
    const component = await makeComponentWithCommands(`module.exports = {
      commands: async () => ({
        greet: { builder: async () => ['echo one', 'echo two'], access: 'public' },
      }),
    };`);

    await component.run('greet', true);

    expect(logSpy).toHaveBeenCalledWith('echo one');
    expect(logSpy).toHaveBeenCalledWith('echo two');
    expect(mockedExecSync).not.toHaveBeenCalled();

    logSpy.mockRestore();
  });

  it('resolves batch/alias builders and skips cross-component references with a warning', async () => {
    const logSpy = vi.spyOn(console, 'log').mockImplementation(() => undefined);
    const warnSpy = vi.spyOn(console, 'warn').mockImplementation(() => undefined);
    const component = await makeComponentWithCommands(`module.exports = {
      commands: async () => ({
        greet: { builder: async () => ['echo greet-line'], access: 'public' },
        batch: { builder: ['other:thing', 'greet'], access: 'protected' },
      }),
    };`);

    await component.run('batch', true);

    expect(warnSpy).toHaveBeenCalledWith(expect.stringContaining('other:thing'));
    expect(logSpy).toHaveBeenCalledWith('echo greet-line');

    logSpy.mockRestore();
    warnSpy.mockRestore();
  });

  it('throws when the command is not found in any description', async () => {
    const dir = await makeTempDir();
    const component = new Component(null, 'test', dir, dir);
    await component.init();

    await expect(component.run('missing')).rejects.toThrow('Command "missing" not found in component "test"');
  });

  it('writes resolved lines to a temp script under <tmpdir>/talan/cli and executes it with homePath as cwd', async () => {
    const component = await makeComponentWithCommands(`module.exports = {
      commands: async () => ({
        greet: { builder: async () => ['echo one', '', 'echo two'], access: 'public' },
      }),
    };`);

    await component.run('greet');

    expect(mockedExecSync).toHaveBeenCalledTimes(1);
    const [scriptPath, options] = mockedExecSync.mock.calls[0]!;
    expect(typeof scriptPath).toBe('string');
    expect(scriptPath as string).toContain(path.join(os.tmpdir(), 'talan', 'cli'));
    expect(options).toMatchObject({ cwd: component.homePath, stdio: 'inherit' });

    const content = await fs.readFile(scriptPath as string, 'utf-8');
    expect(content).toBe(['#!/usr/bin/env bash', 'set -e', 'echo one', 'echo two', ''].join('\n'));

    await fs.rm(scriptPath as string, { force: true });
  });
});

describe('create', () => {
  it('builds the root component (id "/", no parent), loading config from sourcePath', async () => {
    const dir = await fs.mkdtemp(path.join(os.tmpdir(), 'tln-component-test-'));
    try {
      await fs.writeFile(path.join(dir, '.tln.tjs'), 'module.exports = { env: async () => {} };', 'utf-8');

      const root = await create(dir, '/fake/home-path');

      expect(root.id).toBe('/');
      expect(root.parent).toBeNull();
      expect(root.sourcePath).toBe(dir);
      expect(root.homePath).toBe('/fake/home-path');
      expect(root.descriptions).toHaveLength(1);
      expect(root.descriptions[0]!.source).toBe(path.join(dir, '.tln.tjs'));
    } finally {
      await fs.rm(dir, { recursive: true, force: true });
    }
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

  it('builds a child by joining sourcePath/homePath onto the parent, composing descriptions from the parent chain', async () => {
    const dir = await makeTempDir();
    await fs.writeFile(path.join(dir, '.tln.tjs'), 'module.exports = {};', 'utf-8');
    await fs.mkdir(path.join(dir, 'nested'));
    const parent = new Component(null, 'root', dir, dir);
    await parent.init();

    const child = await parent.buildChild('nested');

    expect(child.id).toBe('nested');
    expect(child.parent).toBe(parent);
    expect(child.sourcePath).toBe(path.join(dir, 'nested'));
    expect(child.homePath).toBe(path.join(dir, 'nested'));
    expect(child.descriptions).toEqual(parent.descriptions);
  });

  it('caches the child on repeat calls with the same id', async () => {
    const dir = await makeTempDir();
    await fs.mkdir(path.join(dir, 'nested'));
    const parent = new Component(null, 'root', dir, dir);

    const first = await parent.buildChild('nested');
    const second = await parent.buildChild('nested');

    expect(second).toBe(first);
  });
});

describe('Component#createChild', () => {
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

  it('anchors sourcePath/homePath at the given location directly (not joined onto the parent), with id = basename(location)', async () => {
    const catalogDir = await makeTempDir();
    const location = await makeTempDir();
    const parent = new Component(null, '/', catalogDir, catalogDir);

    const child = await parent.createChild(location);

    expect(child.id).toBe(path.basename(location));
    expect(child.parent).toBe(parent);
    expect(child.sourcePath).toBe(location);
    expect(child.homePath).toBe(location);
  });

  it('caches the child on repeat calls for the same location', async () => {
    const catalogDir = await makeTempDir();
    const location = await makeTempDir();
    const parent = new Component(null, '/', catalogDir, catalogDir);

    const first = await parent.createChild(location);
    const second = await parent.createChild(location);

    expect(second).toBe(first);
  });
});
