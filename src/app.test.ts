import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import { promises as fs } from 'node:fs';
import os from 'node:os';
import path from 'node:path';
import { App } from './app.js';
import type { Component } from './component.js';

const CATALOG_HOME = '/fake/catalog-home';
const VERBOSE = 0;

function delay(ms: number): Promise<void> {
  return new Promise((resolve) => setTimeout(resolve, ms));
}

describe('App', () => {
  let tempDirs: string[];
  // App#init() now mkdir's userHome for real, so it must be a real (temp) path,
  // not the fixed fake string CATALOG_HOME gets away with (catalogHome is only read from).
  let USER_HOME: string;

  beforeEach(() => {
    tempDirs = [];
  });

  afterEach(async () => {
    vi.restoreAllMocks();
    await Promise.all(tempDirs.map((dir) => fs.rm(dir, { recursive: true, force: true })));
  });

  async function makeTempDir(): Promise<string> {
    const dir = await fs.mkdtemp(path.join(os.tmpdir(), 'tln-app-test-'));
    tempDirs.push(dir);
    return dir;
  }

  beforeEach(async () => {
    USER_HOME = await makeTempDir();
  });

  describe('init', () => {
    it('walks up from cwd to the topmost ancestor with a tln config and builds the component chain down to cwd', async () => {
      const root = await makeTempDir();
      await fs.writeFile(path.join(root, '.tln.tjs'), 'module.exports = {};', 'utf-8');
      const cwd = path.join(root, 'a', 'b');
      await fs.mkdir(cwd, { recursive: true });

      const app = new App(cwd, CATALOG_HOME, USER_HOME, VERBOSE);
      await app.init();

      expect(app.home).toBe(root);
      expect(app.rootComponent.id).toBe('/');
      expect(app.rootComponent.sourcePath).toBe(CATALOG_HOME);
      expect(app.rootComponent.homePath).toBe(USER_HOME);
      expect(app.currentComponent.sourcePath).toBe(cwd);
      expect(app.currentComponent.homePath).toBe(cwd);
      expect(app.currentComponent.id).toBe('b');
      expect(app.currentComponent.parent?.id).toBe('a');
      // 'a' is anchored directly at `root` (not joined from the catalog root), then 'b' joins onto it.
      expect(app.currentComponent.parent?.sourcePath).toBe(path.join(root, 'a'));
      const anchor = app.currentComponent.parent?.parent;
      expect(anchor?.id).toBe(path.basename(root));
      expect(anchor?.sourcePath).toBe(root);
      expect(anchor?.homePath).toBe(root);
      expect(anchor?.parent).toBe(app.rootComponent);
    });

    it('prefers the topmost ancestor with a config over a nearer one', async () => {
      const root = await makeTempDir();
      await fs.writeFile(path.join(root, '.tln.tjs'), 'module.exports = {};', 'utf-8');
      const mid = path.join(root, 'mid');
      await fs.mkdir(mid);
      await fs.writeFile(path.join(mid, '.tln.tjs'), 'module.exports = {};', 'utf-8');
      const cwd = path.join(mid, 'leaf');
      await fs.mkdir(cwd);

      const app = new App(cwd, CATALOG_HOME, USER_HOME, VERBOSE);
      await app.init();

      expect(app.home).toBe(root);
    });

    it('falls back to cwd as home when no ancestor has a tln config', async () => {
      const cwd = await makeTempDir();

      const app = new App(cwd, CATALOG_HOME, USER_HOME, VERBOSE);
      await app.init();

      expect(app.home).toBe(cwd);
      // currentComponent is still the anchor (a child of rootComponent), not rootComponent itself,
      // even when home === cwd — rootComponent always represents the catalog root.
      expect(app.currentComponent.parent).toBe(app.rootComponent);
      expect(app.currentComponent.sourcePath).toBe(cwd);
      expect(app.currentComponent.homePath).toBe(cwd);
    });

    it('creates userHome (recursively) if it does not exist yet', async () => {
      const cwd = await makeTempDir();
      const parent = await makeTempDir();
      const userHome = path.join(parent, 'nested', 'user-home');

      const app = new App(cwd, CATALOG_HOME, userHome, VERBOSE);
      await app.init();

      const stat = await fs.stat(userHome);
      expect(stat.isDirectory()).toBe(true);
    });

    it('logs cwd/catalogHome/userHome/home when verbose > 0', async () => {
      const cwd = await makeTempDir();
      const logSpy = vi.spyOn(console, 'log').mockImplementation(() => undefined);

      const app = new App(cwd, CATALOG_HOME, USER_HOME, 1);
      await app.init();

      expect(logSpy).toHaveBeenCalledWith('cwd:', cwd);
      expect(logSpy).toHaveBeenCalledWith('catalogHome:', CATALOG_HOME);
      expect(logSpy).toHaveBeenCalledWith('userHome:', USER_HOME);
      expect(logSpy).toHaveBeenCalledWith('home:', cwd);
    });

    it('does not log when verbose is 0', async () => {
      const cwd = await makeTempDir();
      const logSpy = vi.spyOn(console, 'log').mockImplementation(() => undefined);

      const app = new App(cwd, CATALOG_HOME, USER_HOME, 0);
      await app.init();

      expect(logSpy).not.toHaveBeenCalled();
    });
  });

  describe('resolve', () => {
    it('resolves to [currentComponent] for an empty components list by default', async () => {
      const cwd = await makeTempDir();
      const app = new App(cwd, CATALOG_HOME, USER_HOME, VERBOSE);
      await app.init();

      expect(await app.resolve([])).toEqual([app.currentComponent]);
    });

    it('resolves to [] for an empty components list when resolveEmptyToThis is false', async () => {
      const cwd = await makeTempDir();
      const app = new App(cwd, CATALOG_HOME, USER_HOME, VERBOSE);
      await app.init();

      expect(await app.resolve([], false)).toEqual([]);
    });

    it('resolves "/" to the root component', async () => {
      const cwd = await makeTempDir();
      const app = new App(cwd, CATALOG_HOME, USER_HOME, VERBOSE);
      await app.init();

      expect(await app.resolve(['/'])).toEqual([app.rootComponent]);
    });

    it('warns and drops ids other than "/", since tree search is not ported yet', async () => {
      const cwd = await makeTempDir();
      const app = new App(cwd, CATALOG_HOME, USER_HOME, VERBOSE);
      await app.init();
      const warnSpy = vi.spyOn(console, 'warn').mockImplementation(() => undefined);

      const result = await app.resolve(['maven']);

      expect(result).toEqual([]);
      expect(warnSpy).toHaveBeenCalledWith(expect.stringContaining('maven'));
    });
  });

  describe('run', () => {
    it('runs each command against every resolved component, in order', async () => {
      const cwd = await makeTempDir();
      const app = new App(cwd, CATALOG_HOME, USER_HOME, VERBOSE);
      await app.init();
      const order: string[] = [];
      const runSpy = vi.spyOn(app.currentComponent, 'run').mockImplementation(async (command) => {
        order.push(String(command));
      });

      await app.run(['build', 'test'], [], false, true);

      expect(runSpy).toHaveBeenNthCalledWith(1, 'build', true);
      expect(runSpy).toHaveBeenNthCalledWith(2, 'test', true);
      expect(order).toEqual(['build', 'test']);
    });

    it('awaits each resolved component in turn when not parallel', async () => {
      const cwd = await makeTempDir();
      const app = new App(cwd, CATALOG_HOME, USER_HOME, VERBOSE);
      await app.init();
      const order: string[] = [];
      const componentA = { run: vi.fn(async () => { order.push('a-start'); await delay(10); order.push('a-end'); }) } as unknown as Component;
      const componentB = { run: vi.fn(async () => { order.push('b-start'); order.push('b-end'); }) } as unknown as Component;
      vi.spyOn(app, 'resolve').mockResolvedValue([componentA, componentB]);

      await app.run(['cmd'], [], false, false);

      expect(order).toEqual(['a-start', 'a-end', 'b-start', 'b-end']);
    });

    it('fires resolved components without waiting for each other when parallel', async () => {
      const cwd = await makeTempDir();
      const app = new App(cwd, CATALOG_HOME, USER_HOME, VERBOSE);
      await app.init();
      const order: string[] = [];
      const componentA = { run: vi.fn(async () => { order.push('a-start'); await delay(10); order.push('a-end'); }) } as unknown as Component;
      const componentB = { run: vi.fn(async () => { order.push('b-start'); order.push('b-end'); }) } as unknown as Component;
      vi.spyOn(app, 'resolve').mockResolvedValue([componentA, componentB]);

      await app.run(['cmd'], [], true, false);
      await delay(20);

      expect(order.indexOf('b-start')).toBeLessThan(order.indexOf('a-end'));
    });
  });

  describe('unported dispatch methods', () => {
    it('config rejects naming Component#config as the missing piece', async () => {
      const cwd = await makeTempDir();
      const app = new App(cwd, CATALOG_HOME, USER_HOME, VERBOSE);
      await app.init();

      await expect(
        app.config([], { repo: undefined, update: false, folder: undefined, force: false, terse: false, depend: [], inherit: [] }),
      ).rejects.toThrow('Not implemented: App#config — needs Component#config');
    });

    it('inspect rejects naming Component#inspect as the missing piece', async () => {
      const cwd = await makeTempDir();
      const app = new App(cwd, CATALOG_HOME, USER_HOME, VERBOSE);
      await app.init();

      await expect(app.inspect([], { json: false })).rejects.toThrow('Not implemented: App#inspect — needs Component#inspect');
    });

    it('ls rejects naming Component#ls as the missing piece', async () => {
      const cwd = await makeTempDir();
      const app = new App(cwd, CATALOG_HOME, USER_HOME, VERBOSE);
      await app.init();

      await expect(app.ls([], { limit: 5, parents: false, installedOnly: false })).rejects.toThrow(
        'Not implemented: App#ls — needs Component#ls',
      );
    });

    it('exec rejects naming Component#exec as the missing piece', async () => {
      const cwd = await makeTempDir();
      const app = new App(cwd, CATALOG_HOME, USER_HOME, VERBOSE);
      await app.init();

      await expect(app.exec([], false, false, 1, { command: 'echo hi', input: undefined })).rejects.toThrow(
        'Not implemented: App#exec — needs Component#exec',
      );
    });
  });
});
