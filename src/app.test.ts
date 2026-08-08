import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import { promises as fs } from 'node:fs';
import os from 'node:os';
import path from 'node:path';
import { App } from './app.js';
import type { Component } from './component.js';

const CATALOG_HOME = '/fake/catalog-home';

function delay(ms: number): Promise<void> {
  return new Promise((resolve) => setTimeout(resolve, ms));
}

describe('App', () => {
  let tempDirs: string[];

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

  describe('init', () => {
    it('walks up from cwd to the topmost ancestor with a tln config and builds the component chain down to cwd', async () => {
      const root = await makeTempDir();
      await fs.writeFile(path.join(root, '.tln.tjs'), 'module.exports = {};', 'utf-8');
      const cwd = path.join(root, 'a', 'b');
      await fs.mkdir(cwd, { recursive: true });

      const app = new App(cwd, CATALOG_HOME);
      await app.init();

      expect(app.home).toBe(root);
      expect(app.localRepo).toBe(root);
      expect(app.rootComponent.id).toBe('/');
      expect(app.rootComponent.home).toBe(root);
      expect(app.currentComponent.home).toBe(cwd);
      expect(app.currentComponent.id).toBe('b');
      expect(app.currentComponent.parent?.id).toBe('a');
    });

    it('prefers the topmost ancestor with a config over a nearer one', async () => {
      const root = await makeTempDir();
      await fs.writeFile(path.join(root, '.tln.tjs'), 'module.exports = {};', 'utf-8');
      const mid = path.join(root, 'mid');
      await fs.mkdir(mid);
      await fs.writeFile(path.join(mid, '.tln.tjs'), 'module.exports = {};', 'utf-8');
      const cwd = path.join(mid, 'leaf');
      await fs.mkdir(cwd);

      const app = new App(cwd, CATALOG_HOME);
      await app.init();

      expect(app.home).toBe(root);
    });

    it('falls back to cwd as home when no ancestor has a tln config', async () => {
      const cwd = await makeTempDir();

      const app = new App(cwd, CATALOG_HOME);
      await app.init();

      expect(app.home).toBe(cwd);
      expect(app.localRepo).toBe(cwd);
      expect(app.currentComponent).toBe(app.rootComponent);
    });
  });

  describe('isRootPath', () => {
    it('is true at the posix filesystem root', () => {
      const app = new App('/foo/bar', CATALOG_HOME);
      expect(app.isRootPath('/')).toBe(true);
      expect(app.isRootPath('/foo')).toBe(false);
    });

    it('is true at the drive root on win32', () => {
      // node's `path` module always uses posix separators on a posix host, even when
      // os.platform() is mocked — so this exercises isRootPath's win32 branch logic
      // (root = first path.sep-delimited segment of cwd) rather than real backslash paths.
      vi.spyOn(os, 'platform').mockReturnValue('win32');
      const cwd = ['C:', 'Users', 'x'].join(path.sep);
      const app = new App(cwd, CATALOG_HOME);

      expect(app.isRootPath(`C:${path.sep}`)).toBe(true);
      expect(app.isRootPath(['C:', 'Users'].join(path.sep))).toBe(false);
    });
  });

  describe('resolve', () => {
    it('resolves to [currentComponent] for an empty components list by default', async () => {
      const cwd = await makeTempDir();
      const app = new App(cwd, CATALOG_HOME);
      await app.init();

      expect(await app.resolve([])).toEqual([app.currentComponent]);
    });

    it('resolves to [] for an empty components list when resolveEmptyToThis is false', async () => {
      const cwd = await makeTempDir();
      const app = new App(cwd, CATALOG_HOME);
      await app.init();

      expect(await app.resolve([], false)).toEqual([]);
    });

    it('resolves "/" to the root component', async () => {
      const cwd = await makeTempDir();
      const app = new App(cwd, CATALOG_HOME);
      await app.init();

      expect(await app.resolve(['/'])).toEqual([app.rootComponent]);
    });

    it('warns and drops ids other than "/", since tree search is not ported yet', async () => {
      const cwd = await makeTempDir();
      const app = new App(cwd, CATALOG_HOME);
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
      const app = new App(cwd, CATALOG_HOME);
      await app.init();
      const order: string[] = [];
      const runSpy = vi.spyOn(app.currentComponent, 'run').mockImplementation(async (command) => {
        order.push(String(command));
      });

      await app.run([], false, ['build', 'test'], true);

      expect(runSpy).toHaveBeenNthCalledWith(1, 'build', true);
      expect(runSpy).toHaveBeenNthCalledWith(2, 'test', true);
      expect(order).toEqual(['build', 'test']);
    });

    it('awaits each resolved component in turn when not parallel', async () => {
      const cwd = await makeTempDir();
      const app = new App(cwd, CATALOG_HOME);
      await app.init();
      const order: string[] = [];
      const componentA = { run: vi.fn(async () => { order.push('a-start'); await delay(10); order.push('a-end'); }) } as unknown as Component;
      const componentB = { run: vi.fn(async () => { order.push('b-start'); order.push('b-end'); }) } as unknown as Component;
      vi.spyOn(app, 'resolve').mockResolvedValue([componentA, componentB]);

      await app.run([], false, ['cmd'], false);

      expect(order).toEqual(['a-start', 'a-end', 'b-start', 'b-end']);
    });

    it('fires resolved components without waiting for each other when parallel', async () => {
      const cwd = await makeTempDir();
      const app = new App(cwd, CATALOG_HOME);
      await app.init();
      const order: string[] = [];
      const componentA = { run: vi.fn(async () => { order.push('a-start'); await delay(10); order.push('a-end'); }) } as unknown as Component;
      const componentB = { run: vi.fn(async () => { order.push('b-start'); order.push('b-end'); }) } as unknown as Component;
      vi.spyOn(app, 'resolve').mockResolvedValue([componentA, componentB]);

      await app.run([], true, ['cmd'], false);
      await delay(20);

      expect(order.indexOf('b-start')).toBeLessThan(order.indexOf('a-end'));
    });
  });

  describe('unported dispatch methods', () => {
    it('config rejects naming Component#config as the missing piece', async () => {
      const cwd = await makeTempDir();
      const app = new App(cwd, CATALOG_HOME);
      await app.init();

      await expect(
        app.config([], { repo: undefined, update: false, folder: undefined, force: false, terse: false, depend: [], inherit: [] }),
      ).rejects.toThrow('Not implemented: App#config — needs Component#config');
    });

    it('inspect rejects naming Component#inspect as the missing piece', async () => {
      const cwd = await makeTempDir();
      const app = new App(cwd, CATALOG_HOME);
      await app.init();

      await expect(app.inspect([], { json: false })).rejects.toThrow('Not implemented: App#inspect — needs Component#inspect');
    });

    it('ls rejects naming Component#ls as the missing piece', async () => {
      const cwd = await makeTempDir();
      const app = new App(cwd, CATALOG_HOME);
      await app.init();

      await expect(app.ls([], { limit: 5, parents: false, installedOnly: false })).rejects.toThrow(
        'Not implemented: App#ls — needs Component#ls',
      );
    });

    it('exec rejects naming Component#exec as the missing piece', async () => {
      const cwd = await makeTempDir();
      const app = new App(cwd, CATALOG_HOME);
      await app.init();

      await expect(app.exec([], false, false, 1, { command: 'echo hi', input: undefined })).rejects.toThrow(
        'Not implemented: App#exec — needs Component#exec',
      );
    });
  });
});
