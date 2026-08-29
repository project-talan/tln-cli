import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import { promises as fs } from 'node:fs';
import os from 'node:os';
import path from 'node:path';
import { execSync } from 'node:child_process';
import { Component, create } from './component.js';
import { Env } from './env.js';
import type { ExecutionContext } from './util/misc.js';

vi.mock('node:child_process', async (importOriginal) => {
  const actual = await importOriginal<typeof import('node:child_process')>();
  return { ...actual, execSync: vi.fn() };
});

const mockedExecSync = vi.mocked(execSync);

const TEST_EXECUTION_CONTEXT: ExecutionContext = { platform: 'darwin', arch: 'arm64', type: 'Darwin', release: '99.0.0' };

describe('Component constructor', () => {
  it('stores parent/id/sourcePath/homePath', () => {
    const parent = new Component(null, 'parent', '/parent-src', '/parent-home', TEST_EXECUTION_CONTEXT);
    const child = new Component(parent, 'child', '/child-src', '/child-home', TEST_EXECUTION_CONTEXT);

    expect(child.parent).toBe(parent);
    expect(child.id).toBe('child');
    expect(child.sourcePath).toBe('/child-src');
    expect(child.homePath).toBe('/child-home');
  });

  it('has no descriptions before init() is called', () => {
    const component = new Component(null, 'root', '/src', '/home', TEST_EXECUTION_CONTEXT);

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

    const component = new Component(null, 'root', dir, dir, TEST_EXECUTION_CONTEXT);
    await component.init();

    expect(component.descriptions).toHaveLength(1);
    expect(component.descriptions[0]!.source).toBe(path.join(dir, '.tln.tjs'));
    expect(typeof component.descriptions[0]!.env).toBe('function');
  });

  it('merges .tln folder subfolder configs, sorted by folder name, before the own file', async () => {
    const dir = await makeTempDir();
    await fs.writeFile(path.join(dir, '.tln.tjs'), `module.exports = {};`, 'utf-8');
    await fs.mkdir(path.join(dir, '.tln', 'zeta'), { recursive: true });
    await fs.mkdir(path.join(dir, '.tln', 'alpha'), { recursive: true });
    await fs.writeFile(path.join(dir, '.tln', 'zeta', '.tln.tjs'), `module.exports = {};`, 'utf-8');
    await fs.writeFile(path.join(dir, '.tln', 'alpha', '.tln.tjs'), `module.exports = {};`, 'utf-8');
    // Stray non-directory entry inside .tln — must be ignored, not treated as a config source.
    await fs.writeFile(path.join(dir, '.tln', 'notes.txt'), 'ignore me', 'utf-8');

    const component = new Component(null, 'root', dir, dir, TEST_EXECUTION_CONTEXT);
    await component.init();

    expect(component.descriptions.map((d) => d.source)).toEqual([
      path.join(dir, '.tln', 'alpha', '.tln.tjs'),
      path.join(dir, '.tln', 'zeta', '.tln.tjs'),
      path.join(dir, '.tln.tjs'),
    ]);
  });

  it('has no descriptions when there is no local .tln.tjs or .tln folder', async () => {
    const dir = await makeTempDir();

    const component = new Component(null, 'root', dir, dir, TEST_EXECUTION_CONTEXT);
    await component.init();

    expect(component.descriptions).toEqual([]);
  });

  it('throws a descriptive error naming the file when .tln.tjs has invalid syntax', async () => {
    const dir = await makeTempDir();
    await fs.writeFile(path.join(dir, '.tln.tjs'), 'module.exports = { broken:', 'utf-8');

    const component = new Component(null, 'root', dir, dir, TEST_EXECUTION_CONTEXT);

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
    const component = new Component(null, 'test', dir, dir, TEST_EXECUTION_CONTEXT);
    await component.init();
    return component;
  }

  it("passes a deep clone of the component's executionContext as tln, isolated from mutation", async () => {
    const logSpy = vi.spyOn(console, 'log').mockImplementation(() => undefined);
    const component = await makeComponentWithCommands(`module.exports = {
      commands: async () => ({
        greet: {
          builder: async (tln) => {
            const line = JSON.stringify(tln);
            tln.platform = 'mutated'; // must not affect the component or the next call's clone
            return [line];
          },
        },
      }),
    };`);

    await component.run('greet', true);
    await component.run('greet', true);

    expect(logSpy).toHaveBeenNthCalledWith(1, JSON.stringify(TEST_EXECUTION_CONTEXT));
    expect(logSpy).toHaveBeenNthCalledWith(2, JSON.stringify(TEST_EXECUTION_CONTEXT));
    expect(component.executionContext).toEqual(TEST_EXECUTION_CONTEXT);

    logSpy.mockRestore();
  });

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
    const component = new Component(null, 'test', dir, dir, TEST_EXECUTION_CONTEXT);
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

describe('Component#run (env)', () => {
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

  it('loads dotenvs files and applies the env(tln, env) function on top, passing the result as the builder\'s env argument', async () => {
    const dir = await makeTempDir();
    await fs.writeFile(path.join(dir, '.env'), 'FROM_FILE=file-value\nOVERRIDDEN=from-file\n', 'utf-8');
    await fs.writeFile(
      path.join(dir, '.tln.tjs'),
      `module.exports = {
        dotenvs: async () => ['.env'],
        env: async (tln, env) => { env.OVERRIDDEN = 'from-function'; env.FROM_FUNCTION = 'yes'; },
        commands: async () => ({ report: { builder: async (tln, env) => [JSON.stringify(env)] } }),
      };`,
      'utf-8',
    );
    const component = new Component(null, 'test', dir, dir, TEST_EXECUTION_CONTEXT);
    await component.init();
    const logSpy = vi.spyOn(console, 'log').mockImplementation(() => undefined);

    await component.run('report', true);

    const printed = JSON.parse(logSpy.mock.calls[0]![0] as string);
    expect(printed).toMatchObject({ FROM_FILE: 'file-value', OVERRIDDEN: 'from-function', FROM_FUNCTION: 'yes' });
    logSpy.mockRestore();
  });

  it("merges a parent's env before this component's own, so the child's dotenvs/env() override the parent's", async () => {
    const dir = await makeTempDir();
    await fs.writeFile(
      path.join(dir, '.tln.tjs'),
      `module.exports = { env: async (tln, env) => { env.FOO = 'from-parent'; env.PARENT_ONLY = 'yes'; } };`,
      'utf-8',
    );
    await fs.mkdir(path.join(dir, 'child'));
    await fs.writeFile(
      path.join(dir, 'child', '.tln.tjs'),
      `module.exports = {
        env: async (tln, env) => { env.FOO = 'from-child'; },
        commands: async () => ({ report: { builder: async (tln, env) => [JSON.stringify(env)] } }),
      };`,
      'utf-8',
    );
    const root = new Component(null, 'root', dir, dir, TEST_EXECUTION_CONTEXT);
    await root.init();
    const child = await root.buildChild('child');
    const logSpy = vi.spyOn(console, 'log').mockImplementation(() => undefined);

    await child.run('report', true);

    const printed = JSON.parse(logSpy.mock.calls[0]![0] as string);
    expect(printed).toMatchObject({ FOO: 'from-child', PARENT_ONLY: 'yes' });
    logSpy.mockRestore();
  });

  it("merges an inherits-named component's env as a mixin, overridable by this component's own", async () => {
    const dir = await makeTempDir();
    await fs.mkdir(path.join(dir, 'base'));
    await fs.writeFile(
      path.join(dir, 'base', '.tln.tjs'),
      `module.exports = { env: async (tln, env) => { env.FOO = 'from-base'; env.BASE_ONLY = 'yes'; } };`,
      'utf-8',
    );
    await fs.mkdir(path.join(dir, 'derived'));
    await fs.writeFile(
      path.join(dir, 'derived', '.tln.tjs'),
      `module.exports = {
        inherits: async () => ['base'],
        env: async (tln, env) => { env.FOO = 'from-derived'; },
        commands: async () => ({ report: { builder: async (tln, env) => [JSON.stringify(env)] } }),
      };`,
      'utf-8',
    );
    const root = new Component(null, 'root', dir, dir, TEST_EXECUTION_CONTEXT);
    await root.init();
    const derived = await root.buildChild('derived');
    const logSpy = vi.spyOn(console, 'log').mockImplementation(() => undefined);

    await derived.run('report', true);

    const printed = JSON.parse(logSpy.mock.calls[0]![0] as string);
    expect(printed).toMatchObject({ FOO: 'from-derived', BASE_ONLY: 'yes' });
    logSpy.mockRestore();
  });

  it("threads the root's seeded base Env (e.g. from process.env, via create) down through parent to every descendant", async () => {
    const dir = await makeTempDir();
    await fs.mkdir(path.join(dir, 'child'));
    await fs.writeFile(
      path.join(dir, 'child', '.tln.tjs'),
      `module.exports = { commands: async () => ({ report: { builder: async (tln, env) => [JSON.stringify(env)] } }) };`,
      'utf-8',
    );
    const root = new Component(null, '/', dir, dir, TEST_EXECUTION_CONTEXT, [], new Env({ SEEDED: 'from-root' }));
    await root.init();
    const child = await root.buildChild('child');
    const logSpy = vi.spyOn(console, 'log').mockImplementation(() => undefined);

    await child.run('report', true);

    const printed = JSON.parse(logSpy.mock.calls[0]![0] as string);
    expect(printed).toMatchObject({ SEEDED: 'from-root' });
    logSpy.mockRestore();
  });

  it('gives each builder invocation within one run() its own copy of env — one mutating its env argument does not affect a sibling batch/alias call', async () => {
    const dir = await makeTempDir();
    await fs.writeFile(
      path.join(dir, '.tln.tjs'),
      `module.exports = {
        env: async (tln, env) => { env.FOO = 'original'; },
        commands: async () => ({
          mutator: { builder: async (tln, env) => { env.FOO = 'mutated-by-mutator'; return [JSON.stringify(env)]; } },
          reporter: { builder: async (tln, env) => [JSON.stringify(env)] },
          batch: { builder: ['mutator', 'reporter'] },
        }),
      };`,
      'utf-8',
    );
    const component = new Component(null, 'test', dir, dir, TEST_EXECUTION_CONTEXT);
    await component.init();
    const logSpy = vi.spyOn(console, 'log').mockImplementation(() => undefined);

    await component.run('batch', true);

    const [mutatorOutput, reporterOutput] = logSpy.mock.calls.map((call) => JSON.parse(call[0] as string));
    expect(mutatorOutput).toMatchObject({ FOO: 'mutated-by-mutator' });
    expect(reporterOutput).toMatchObject({ FOO: 'original' });
    logSpy.mockRestore();
  });

  it('resolves a fresh env for every run() call — no state leaks between separate executions', async () => {
    const dir = await makeTempDir();
    await fs.writeFile(
      path.join(dir, '.tln.tjs'),
      `module.exports = {
        env: async (tln, env) => { env.FOO = 'original'; },
        commands: async () => ({
          mutator: {
            builder: async (tln, env) => {
              const seenOnEntry = env.FOO; // captured BEFORE this call's own mutation
              env.FOO = 'mutated';
              return [JSON.stringify({ seenOnEntry })];
            },
          },
        }),
      };`,
      'utf-8',
    );
    const component = new Component(null, 'test', dir, dir, TEST_EXECUTION_CONTEXT);
    await component.init();
    const logSpy = vi.spyOn(console, 'log').mockImplementation(() => undefined);

    await component.run('mutator', true);
    await component.run('mutator', true);

    const outputs = logSpy.mock.calls.map((call) => JSON.parse(call[0] as string));
    expect(outputs[0]).toEqual({ seenOnEntry: 'original' });
    expect(outputs[1]).toEqual({ seenOnEntry: 'original' });
    logSpy.mockRestore();
  });

  it("maps a CLI token (from --) onto ${prefix}_${KEY}, dashes in a multi-word key becoming underscores", async () => {
    const dir = await makeTempDir();
    await fs.writeFile(
      path.join(dir, '.tln.tjs'),
      `module.exports = {
        options: async () => ({ prefix: 'TPM', options: [{ key: 'context', type: 'string', default: null }, { key: 'two-words', type: 'string', default: null }] }),
        commands: async () => ({ report: { builder: async (tln, env) => [JSON.stringify(env)] } }),
      };`,
      'utf-8',
    );
    const component = new Component(null, 'test', dir, dir, TEST_EXECUTION_CONTEXT, [], new Env(), { context: 'dev01', 'two-words': 'value' });
    await component.init();
    const logSpy = vi.spyOn(console, 'log').mockImplementation(() => undefined);

    await component.run('report', true);

    const printed = JSON.parse(logSpy.mock.calls[0]![0] as string);
    expect(printed).toMatchObject({ TPM_CONTEXT: 'dev01', TPM_TWO_WORDS: 'value' });
    logSpy.mockRestore();
  });

  it('falls back to the option\'s default when the CLI flag was not passed, and sets nothing when neither is present', async () => {
    const dir = await makeTempDir();
    await fs.writeFile(
      path.join(dir, '.tln.tjs'),
      `module.exports = {
        options: async () => ({ prefix: 'TPM', options: [
          { key: 'context', type: 'string', default: 'dev' },
          { key: 'unset', type: 'string', default: null },
        ] }),
        commands: async () => ({ report: { builder: async (tln, env) => [JSON.stringify(env)] } }),
      };`,
      'utf-8',
    );
    const component = new Component(null, 'test', dir, dir, TEST_EXECUTION_CONTEXT);
    await component.init();
    const logSpy = vi.spyOn(console, 'log').mockImplementation(() => undefined);

    await component.run('report', true);

    const printed = JSON.parse(logSpy.mock.calls[0]![0] as string);
    expect(printed.TPM_CONTEXT).toBe('dev');
    expect(printed).not.toHaveProperty('TPM_UNSET');
    logSpy.mockRestore();
  });

  it('joins a repeated CLI flag (already a string[], from parseCliOverrides) with commas', async () => {
    const dir = await makeTempDir();
    await fs.writeFile(
      path.join(dir, '.tln.tjs'),
      `module.exports = {
        options: async () => ({ prefix: 'TPM', options: [{ key: 'tag', type: 'array', default: null }] }),
        commands: async () => ({ report: { builder: async (tln, env) => [JSON.stringify(env)] } }),
      };`,
      'utf-8',
    );
    const component = new Component(null, 'test', dir, dir, TEST_EXECUTION_CONTEXT, [], new Env(), { tag: ['a', 'b', 'c'] });
    await component.init();
    const logSpy = vi.spyOn(console, 'log').mockImplementation(() => undefined);

    await component.run('report', true);

    const printed = JSON.parse(logSpy.mock.calls[0]![0] as string);
    expect(printed.TPM_TAG).toBe('a,b,c');
    logSpy.mockRestore();
  });

  it("type: 'array' still produces a single-element joined value when the CLI flag was only given once", async () => {
    const dir = await makeTempDir();
    await fs.writeFile(
      path.join(dir, '.tln.tjs'),
      `module.exports = {
        options: async () => ({ prefix: 'TPM', options: [{ key: 'tag', type: 'array', default: null }] }),
        commands: async () => ({ report: { builder: async (tln, env) => [JSON.stringify(env)] } }),
      };`,
      'utf-8',
    );
    const component = new Component(null, 'test', dir, dir, TEST_EXECUTION_CONTEXT, [], new Env(), { tag: 'solo' });
    await component.init();
    const logSpy = vi.spyOn(console, 'log').mockImplementation(() => undefined);

    await component.run('report', true);

    const printed = JSON.parse(logSpy.mock.calls[0]![0] as string);
    expect(printed.TPM_TAG).toBe('solo');
    logSpy.mockRestore();
  });

  it('renders a bare boolean CLI flag (e.g. --flag / --no-flag) as the literal string "true"/"false"', async () => {
    const dir = await makeTempDir();
    await fs.writeFile(
      path.join(dir, '.tln.tjs'),
      `module.exports = {
        options: async () => ({ prefix: 'TPM', options: [{ key: 'flag', type: 'boolean', default: null }] }),
        commands: async () => ({ report: { builder: async (tln, env) => [JSON.stringify(env)] } }),
      };`,
      'utf-8',
    );
    const component = new Component(null, 'test', dir, dir, TEST_EXECUTION_CONTEXT, [], new Env(), { flag: false });
    await component.init();
    const logSpy = vi.spyOn(console, 'log').mockImplementation(() => undefined);

    await component.run('report', true);

    const printed = JSON.parse(logSpy.mock.calls[0]![0] as string);
    expect(printed.TPM_FLAG).toBe('false');
    logSpy.mockRestore();
  });

  it('supports a non-null default (including an array default) when the CLI flag was not passed', async () => {
    const dir = await makeTempDir();
    await fs.writeFile(
      path.join(dir, '.tln.tjs'),
      `module.exports = {
        options: async () => ({ prefix: 'TPM', options: [{ key: 'tags', type: 'array', default: ['x', 'y'] }] }),
        commands: async () => ({ report: { builder: async (tln, env) => [JSON.stringify(env)] } }),
      };`,
      'utf-8',
    );
    const component = new Component(null, 'test', dir, dir, TEST_EXECUTION_CONTEXT);
    await component.init();
    const logSpy = vi.spyOn(console, 'log').mockImplementation(() => undefined);

    await component.run('report', true);

    const printed = JSON.parse(logSpy.mock.calls[0]![0] as string);
    expect(printed.TPM_TAGS).toBe('x,y');
    logSpy.mockRestore();
  });

  it('applies options() after dotenvs/env(), so a CLI value overrides both for that same description', async () => {
    const dir = await makeTempDir();
    await fs.writeFile(path.join(dir, '.env'), 'CONTEXT=from-file\n', 'utf-8');
    await fs.writeFile(
      path.join(dir, '.tln.tjs'),
      `module.exports = {
        dotenvs: async () => ['.env'],
        env: async (tln, env) => { env.CONTEXT = 'from-function'; },
        options: async () => ({ options: [{ key: 'context', type: 'string', default: null }] }),
        commands: async () => ({ report: { builder: async (tln, env) => [JSON.stringify(env)] } }),
      };`,
      'utf-8',
    );
    const component = new Component(null, 'test', dir, dir, TEST_EXECUTION_CONTEXT, [], new Env(), { context: 'from-cli' });
    await component.init();
    const logSpy = vi.spyOn(console, 'log').mockImplementation(() => undefined);

    await component.run('report', true);

    const printed = JSON.parse(logSpy.mock.calls[0]![0] as string);
    expect(printed.CONTEXT).toBe('from-cli');
    logSpy.mockRestore();
  });

  it('omits the prefix segment entirely when options() declares no prefix', async () => {
    const dir = await makeTempDir();
    await fs.writeFile(
      path.join(dir, '.tln.tjs'),
      `module.exports = {
        options: async () => ({ options: [{ key: 'context', type: 'string', default: null }] }),
        commands: async () => ({ report: { builder: async (tln, env) => [JSON.stringify(env)] } }),
      };`,
      'utf-8',
    );
    const component = new Component(null, 'test', dir, dir, TEST_EXECUTION_CONTEXT, [], new Env(), { context: 'dev01' });
    await component.init();
    const logSpy = vi.spyOn(console, 'log').mockImplementation(() => undefined);

    await component.run('report', true);

    const printed = JSON.parse(logSpy.mock.calls[0]![0] as string);
    expect(printed.CONTEXT).toBe('dev01');
    logSpy.mockRestore();
  });

  it('does not throw when options() returns {} with no "options" array (a valid "no options declared" shape)', async () => {
    const dir = await makeTempDir();
    await fs.writeFile(
      path.join(dir, '.tln.tjs'),
      `module.exports = {
        options: async () => ({}),
        commands: async () => ({ report: { builder: async (tln, env) => [JSON.stringify(env)] } }),
      };`,
      'utf-8',
    );
    const component = new Component(null, 'test', dir, dir, TEST_EXECUTION_CONTEXT, [], new Env(), { context: 'dev01' });
    await component.init();
    const logSpy = vi.spyOn(console, 'log').mockImplementation(() => undefined);

    await expect(component.run('report', true)).resolves.toBeUndefined();

    const printed = JSON.parse(logSpy.mock.calls[0]![0] as string);
    expect(printed).not.toHaveProperty('CONTEXT');
    logSpy.mockRestore();
  });

  it('threads the same cliOverrides down through buildChild, so a descendant\'s own options() reads the same CLI tokens', async () => {
    const dir = await makeTempDir();
    await fs.mkdir(path.join(dir, 'child'));
    await fs.writeFile(
      path.join(dir, 'child', '.tln.tjs'),
      `module.exports = {
        options: async () => ({ prefix: 'CHILD', options: [{ key: 'context', type: 'string', default: null }] }),
        commands: async () => ({ report: { builder: async (tln, env) => [JSON.stringify(env)] } }),
      };`,
      'utf-8',
    );
    const root = new Component(null, 'root', dir, dir, TEST_EXECUTION_CONTEXT, [], new Env(), { context: 'dev01' });
    await root.init();
    const child = await root.buildChild('child');
    const logSpy = vi.spyOn(console, 'log').mockImplementation(() => undefined);

    await child.run('report', true);

    const printed = JSON.parse(logSpy.mock.calls[0]![0] as string);
    expect(printed.CHILD_CONTEXT).toBe('dev01');
    logSpy.mockRestore();
  });
});

describe('Component#findCommand (hierarchy, inherits, access)', () => {
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

  it('a child can call a protected/public command defined only on an ancestor', async () => {
    const dir = await makeTempDir();
    await fs.writeFile(
      path.join(dir, '.tln.tjs'),
      `module.exports = { commands: async () => ({ shared: { builder: async () => ['echo from-root'], access: 'protected' } }) };`,
      'utf-8',
    );
    const root = new Component(null, 'root', dir, dir, TEST_EXECUTION_CONTEXT);
    await root.init();
    const child = await root.buildChild('child');
    const logSpy = vi.spyOn(console, 'log').mockImplementation(() => undefined);

    await child.run('shared', true);

    expect(logSpy).toHaveBeenCalledWith('echo from-root');
    logSpy.mockRestore();
  });

  it('running a command id defined both on this component and on an ancestor executes both, ancestor first then own', async () => {
    const dir = await makeTempDir();
    await fs.writeFile(
      path.join(dir, '.tln.tjs'),
      `module.exports = { commands: async () => ({ hi: { builder: async () => ['echo hi-from-root'], access: 'protected' } }) };`,
      'utf-8',
    );
    await fs.mkdir(path.join(dir, 'child'));
    await fs.writeFile(
      path.join(dir, 'child', '.tln.tjs'),
      `module.exports = { commands: async () => ({ hi: { builder: async () => ['echo hi-from-child'] } }) };`,
      'utf-8',
    );
    const root = new Component(null, 'root', dir, dir, TEST_EXECUTION_CONTEXT);
    await root.init();
    const child = await root.buildChild('child');
    const logSpy = vi.spyOn(console, 'log').mockImplementation(() => undefined);

    await child.run('hi', true);

    expect(logSpy.mock.calls.map((call) => call[0])).toEqual(['echo hi-from-root', 'echo hi-from-child']);
    logSpy.mockRestore();
  });

  it('runs every definition of a command id, not just the first per origin: ancestor, inline components-seed, .tln-folder override, and own file, in that order', async () => {
    const dir = await makeTempDir();
    await fs.writeFile(
      path.join(dir, '.tln.tjs'),
      `module.exports = {
        commands: async () => ({ hi: { builder: async () => ['echo hi-from-root'], access: 'protected' } }),
        components: async () => [{
          id: 'child',
          commands: async () => ({ hi: { builder: async () => ['echo hi-from-inline-seed'] } }),
        }],
      };`,
      'utf-8',
    );
    await fs.mkdir(path.join(dir, 'child', '.tln', 'override'), { recursive: true });
    await fs.writeFile(
      path.join(dir, 'child', '.tln', 'override', '.tln.tjs'),
      `module.exports = { commands: async () => ({ hi: { builder: async () => ['echo hi-from-tln-folder'] } }) };`,
      'utf-8',
    );
    await fs.writeFile(
      path.join(dir, 'child', '.tln.tjs'),
      `module.exports = { commands: async () => ({ hi: { builder: async () => ['echo hi-from-own-file'] } }) };`,
      'utf-8',
    );
    const root = new Component(null, 'root', dir, dir, TEST_EXECUTION_CONTEXT);
    await root.init();
    const child = await root.buildChild('child');
    const logSpy = vi.spyOn(console, 'log').mockImplementation(() => undefined);

    await child.run('hi', true);

    expect(logSpy.mock.calls.map((call) => call[0])).toEqual([
      'echo hi-from-root',
      'echo hi-from-inline-seed',
      'echo hi-from-tln-folder',
      'echo hi-from-own-file',
    ]);
    logSpy.mockRestore();

    const inspection = await child.inspect();
    expect(inspection.commands.filter((entry) => entry === 'hi' || entry.startsWith('hi@'))).toEqual(['hi', 'hi', 'hi', 'hi@root']);
  });

  it("a private command is callable on the component that defines it, but not on a child (even though the child could otherwise reach it via parent)", async () => {
    const dir = await makeTempDir();
    await fs.writeFile(
      path.join(dir, '.tln.tjs'),
      `module.exports = { commands: async () => ({ secret: { builder: async () => ['echo root-only'], access: 'private' } }) };`,
      'utf-8',
    );
    const root = new Component(null, 'root', dir, dir, TEST_EXECUTION_CONTEXT);
    await root.init();
    const child = await root.buildChild('child');
    const logSpy = vi.spyOn(console, 'log').mockImplementation(() => undefined);

    await root.run('secret', true);
    expect(logSpy).toHaveBeenCalledWith('echo root-only');

    await expect(child.run('secret')).rejects.toThrow('Command "secret" not found in component "child"');

    logSpy.mockRestore();
  });

  it('inherits resolves other top-level catalog components by id (independent of the parent tree) and exposes their protected/public commands', async () => {
    const dir = await makeTempDir();
    await fs.mkdir(path.join(dir, 'base'));
    await fs.writeFile(
      path.join(dir, 'base', '.tln.tjs'),
      `module.exports = { commands: async () => ({ hi: { builder: async () => ['echo hi-from-base'], access: 'public' } }) };`,
      'utf-8',
    );
    await fs.mkdir(path.join(dir, 'derived'));
    await fs.writeFile(
      path.join(dir, 'derived', '.tln.tjs'),
      `module.exports = { inherits: async () => ['base'] };`,
      'utf-8',
    );
    const root = new Component(null, 'root', dir, dir, TEST_EXECUTION_CONTEXT);
    await root.init();
    const derived = await root.buildChild('derived');
    const logSpy = vi.spyOn(console, 'log').mockImplementation(() => undefined);

    await derived.run('hi', true);

    expect(logSpy).toHaveBeenCalledWith('echo hi-from-base');
    logSpy.mockRestore();
  });

  it("inherits is transitive (an inherited component's own inherits are searched too) and excludes private commands there as well", async () => {
    const dir = await makeTempDir();
    await fs.mkdir(path.join(dir, 'grandbase'));
    await fs.writeFile(
      path.join(dir, 'grandbase', '.tln.tjs'),
      `module.exports = { commands: async () => ({
        hi: { builder: async () => ['echo hi-from-grandbase'], access: 'public' },
        secret: { builder: async () => ['echo should-not-run'], access: 'private' },
      }) };`,
      'utf-8',
    );
    await fs.mkdir(path.join(dir, 'base'));
    await fs.writeFile(path.join(dir, 'base', '.tln.tjs'), `module.exports = { inherits: async () => ['grandbase'] };`, 'utf-8');
    await fs.mkdir(path.join(dir, 'derived'));
    await fs.writeFile(path.join(dir, 'derived', '.tln.tjs'), `module.exports = { inherits: async () => ['base'] };`, 'utf-8');
    const root = new Component(null, 'root', dir, dir, TEST_EXECUTION_CONTEXT);
    await root.init();
    const derived = await root.buildChild('derived');
    const logSpy = vi.spyOn(console, 'log').mockImplementation(() => undefined);

    await derived.run('hi', true);
    expect(logSpy).toHaveBeenCalledWith('echo hi-from-grandbase');

    await expect(derived.run('secret')).rejects.toThrow('Command "secret" not found in component "derived"');

    logSpy.mockRestore();
  });

  it('does not infinite-loop on an inherits cycle (A inherits B, B inherits A)', async () => {
    const dir = await makeTempDir();
    await fs.mkdir(path.join(dir, 'a'));
    await fs.writeFile(path.join(dir, 'a', '.tln.tjs'), `module.exports = { inherits: async () => ['b'] };`, 'utf-8');
    await fs.mkdir(path.join(dir, 'b'));
    await fs.writeFile(path.join(dir, 'b', '.tln.tjs'), `module.exports = { inherits: async () => ['a'] };`, 'utf-8');
    const root = new Component(null, 'root', dir, dir, TEST_EXECUTION_CONTEXT);
    await root.init();
    const a = await root.buildChild('a');

    await expect(a.run('nope', true)).rejects.toThrow('Command "nope" not found in component "a"');
  });
});

describe('Component#inspect', () => {
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

  it('resolves id/sourcePath/homePath/descriptions/inherits/depends/commands/env from a single description', async () => {
    const dir = await makeTempDir();
    await fs.writeFile(
      path.join(dir, '.tln.tjs'),
      `module.exports = {
        inherits: async () => ['docker'],
        depends: async () => ['maven'],
        commands: async () => ({ hi: { builder: async () => ['echo hi'] } }),
        env: async (tln, env) => { env.FOO = 'bar'; },
      };`,
      'utf-8',
    );
    const component = new Component(null, 'root', dir, dir, TEST_EXECUTION_CONTEXT);
    await component.init();

    const inspection = await component.inspect();

    expect(inspection).toEqual({
      parent: '',
      id: 'root',
      sourcePath: dir,
      homePath: dir,
      descriptions: [path.join(dir, '.tln.tjs')],
      inherits: ['docker'],
      depends: ['maven'],
      commands: ['hi'],
      env: { FOO: 'bar' },
    });
  });

  it('returns empty lists/object when there are no descriptions', async () => {
    const dir = await makeTempDir();
    const component = new Component(null, 'root', dir, dir, TEST_EXECUTION_CONTEXT);
    await component.init();

    const inspection = await component.inspect();

    expect(inspection.descriptions).toEqual([]);
    expect(inspection.inherits).toEqual([]);
    expect(inspection.depends).toEqual([]);
    expect(inspection.commands).toEqual([]);
    expect(inspection.env).toEqual({});
  });

  it('concatenates inherits/depends, unions commands, and lets later descriptions override earlier env vars', async () => {
    const dir = await makeTempDir();
    await fs.mkdir(path.join(dir, '.tln', 'a'), { recursive: true });
    await fs.writeFile(
      path.join(dir, '.tln', 'a', '.tln.tjs'),
      `module.exports = {
        inherits: async () => ['docker'],
        depends: async () => ['maven'],
        commands: async () => ({ first: { builder: async () => ['echo first'] } }),
        env: async (tln, env) => { env.FOO = 'from-a'; env.ONLY_A = 'yes'; },
      };`,
      'utf-8',
    );
    await fs.writeFile(
      path.join(dir, '.tln.tjs'),
      `module.exports = {
        inherits: async () => ['git'],
        depends: async () => [],
        commands: async () => ({ second: { builder: async () => ['echo second'] } }),
        env: async (tln, env) => { env.FOO = 'from-own'; },
      };`,
      'utf-8',
    );
    const component = new Component(null, 'root', dir, dir, TEST_EXECUTION_CONTEXT);
    await component.init();

    const inspection = await component.inspect();

    // .tln folder descriptions load before the own file (see Component#init), so 'own' wins the FOO override.
    expect(inspection.inherits).toEqual(['docker', 'git']);
    expect(inspection.depends).toEqual(['maven']);
    expect(inspection.commands).toEqual(['first', 'second']);
    expect(inspection.env).toEqual({ FOO: 'from-own', ONLY_A: 'yes' });
  });

  it('formats a command reachable only via parent as "<id>@<originUUID>"', async () => {
    const dir = await makeTempDir();
    await fs.writeFile(
      path.join(dir, '.tln.tjs'),
      `module.exports = { commands: async () => ({ hi: { builder: async () => ['echo hi-from-root'], access: 'protected' } }) };`,
      'utf-8',
    );
    const root = new Component(null, 'root', dir, dir, TEST_EXECUTION_CONTEXT);
    await root.init();
    const child = await root.buildChild('child');

    const inspection = await child.inspect();

    expect(inspection.commands).toEqual(['hi@root']);
  });

  it('formats a command reachable only via inherits as "<id>@<originUUID>", alongside its own commands as plain "<id>"', async () => {
    const dir = await makeTempDir();
    await fs.mkdir(path.join(dir, 'base'));
    await fs.writeFile(
      path.join(dir, 'base', '.tln.tjs'),
      `module.exports = { commands: async () => ({ hi2: { builder: async () => ['echo hi2-from-base'], access: 'public' } }) };`,
      'utf-8',
    );
    await fs.mkdir(path.join(dir, 'derived'));
    await fs.writeFile(
      path.join(dir, 'derived', '.tln.tjs'),
      `module.exports = { inherits: async () => ['base'], commands: async () => ({ own: { builder: async () => ['echo own'] } }) };`,
      'utf-8',
    );
    const root = new Component(null, 'root', dir, dir, TEST_EXECUTION_CONTEXT);
    await root.init();
    const derived = await root.buildChild('derived');

    const inspection = await derived.inspect();

    expect(inspection.commands).toEqual(['own', 'hi2@root/base']);
  });

  it('lists a same-named command from both this component and an ancestor, instead of letting the closer one shadow the other', async () => {
    const dir = await makeTempDir();
    await fs.writeFile(
      path.join(dir, '.tln.tjs'),
      `module.exports = { commands: async () => ({ hi: { builder: async () => ['echo hi-from-root'], access: 'protected' } }) };`,
      'utf-8',
    );
    await fs.mkdir(path.join(dir, 'child'));
    await fs.writeFile(
      path.join(dir, 'child', '.tln.tjs'),
      `module.exports = { commands: async () => ({ hi: { builder: async () => ['echo hi-from-child'] } }) };`,
      'utf-8',
    );
    const root = new Component(null, 'root', dir, dir, TEST_EXECUTION_CONTEXT);
    await root.init();
    const child = await root.buildChild('child');

    const inspection = await child.inspect();

    expect(inspection.commands).toEqual(['hi', 'hi@root']);
  });
});

describe('create', () => {
  it('builds the root component (id "/", no parent), loading config from sourcePath', async () => {
    const dir = await fs.mkdtemp(path.join(os.tmpdir(), 'tln-component-test-'));
    try {
      await fs.writeFile(path.join(dir, '.tln.tjs'), 'module.exports = { env: async () => {} };', 'utf-8');

      const root = await create(dir, '/fake/home-path', TEST_EXECUTION_CONTEXT, new Env());

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

  it('builds a child by joining sourcePath/homePath onto the parent, with no seeded descriptions when the parent declares none for this id', async () => {
    const dir = await makeTempDir();
    await fs.writeFile(path.join(dir, '.tln.tjs'), 'module.exports = {};', 'utf-8');
    await fs.mkdir(path.join(dir, 'nested'));
    const parent = new Component(null, 'root', dir, dir, TEST_EXECUTION_CONTEXT);
    await parent.init();

    const child = await parent.buildChild('nested');

    expect(child.id).toBe('nested');
    expect(child.parent).toBe(parent);
    expect(child.sourcePath).toBe(path.join(dir, 'nested'));
    expect(child.homePath).toBe(path.join(dir, 'nested'));
    expect(child.descriptions).toEqual([]);
  });

  it("seeds the child with descriptions the parent's own descriptions inline-declare for the child's id via `components`", async () => {
    const dir = await makeTempDir();
    await fs.writeFile(
      path.join(dir, '.tln.tjs'),
      `module.exports = {
        components: async () => [
          { id: 'nested', env: async () => {} },
        ],
      };`,
      'utf-8',
    );
    await fs.mkdir(path.join(dir, 'nested'));
    const parent = new Component(null, 'root', dir, dir, TEST_EXECUTION_CONTEXT);
    await parent.init();

    const child = await parent.buildChild('nested');

    expect(child.descriptions).toHaveLength(1);
    expect(typeof child.descriptions[0]!.env).toBe('function');
    expect(child.descriptions[0]!.source).toBe(`${path.join(dir, '.tln.tjs')}#components/nested`);
  });

  it("layers the child's own real .tln.tjs (loaded via init()) on top of any parent-seeded description", async () => {
    const dir = await makeTempDir();
    await fs.writeFile(
      path.join(dir, '.tln.tjs'),
      `module.exports = {
        components: async () => [
          { id: 'nested', env: async () => {} },
        ],
      };`,
      'utf-8',
    );
    await fs.mkdir(path.join(dir, 'nested'));
    await fs.writeFile(path.join(dir, 'nested', '.tln.tjs'), 'module.exports = { depends: async () => [] };', 'utf-8');
    const parent = new Component(null, 'root', dir, dir, TEST_EXECUTION_CONTEXT);
    await parent.init();

    const child = await parent.buildChild('nested');

    expect(child.descriptions).toHaveLength(2);
    expect(typeof child.descriptions[0]!.env).toBe('function');
    expect(child.descriptions[1]!.source).toBe(path.join(dir, 'nested', '.tln.tjs'));
  });

  it('caches the child on repeat calls with the same id', async () => {
    const dir = await makeTempDir();
    await fs.mkdir(path.join(dir, 'nested'));
    const parent = new Component(null, 'root', dir, dir, TEST_EXECUTION_CONTEXT);

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
    const parent = new Component(null, '/', catalogDir, catalogDir, TEST_EXECUTION_CONTEXT);

    const child = await parent.createChild(location);

    expect(child.id).toBe(path.basename(location));
    expect(child.parent).toBe(parent);
    expect(child.sourcePath).toBe(location);
    expect(child.homePath).toBe(location);
  });

  it('caches the child on repeat calls for the same location', async () => {
    const catalogDir = await makeTempDir();
    const location = await makeTempDir();
    const parent = new Component(null, '/', catalogDir, catalogDir, TEST_EXECUTION_CONTEXT);

    const first = await parent.createChild(location);
    const second = await parent.createChild(location);

    expect(second).toBe(first);
  });

  it("seeds the anchor with descriptions the parent's own descriptions inline-declare for the anchor's id via `components`", async () => {
    const catalogDir = await makeTempDir();
    const location = await makeTempDir();
    const id = path.basename(location);
    await fs.writeFile(
      path.join(catalogDir, '.tln.tjs'),
      `module.exports = {
        components: async () => [
          { id: "${id}", env: async () => {} },
        ],
      };`,
      'utf-8',
    );
    const parent = new Component(null, '/', catalogDir, catalogDir, TEST_EXECUTION_CONTEXT);
    await parent.init();

    const child = await parent.createChild(location);

    expect(child.descriptions).toHaveLength(1);
    expect(typeof child.descriptions[0]!.env).toBe('function');
  });
});

describe('Component#ls', () => {
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

  it('discovers real subfolders as children, excluding .git and .tln', async () => {
    const dir = await makeTempDir();
    await fs.mkdir(path.join(dir, 'a'));
    await fs.mkdir(path.join(dir, 'b'));
    await fs.mkdir(path.join(dir, '.git'));
    await fs.mkdir(path.join(dir, '.tln'));
    const component = new Component(null, 'root', dir, dir, TEST_EXECUTION_CONTEXT);
    await component.init();

    const tree = await component.ls({ parents: false, depth: 1, limit: 0, installedOnly: false });

    // Real subfolders are unordered (fs.readdir doesn't guarantee an order) — only
    // declared `components` order is meaningful now, covered by a dedicated test below.
    expect(tree!.children.map((c) => c.id).sort()).toEqual(['a', 'b']);
  });

  it('merges inline `components`-declared ids with real subfolders, deduplicated', async () => {
    const dir = await makeTempDir();
    await fs.mkdir(path.join(dir, 'a'));
    await fs.writeFile(
      path.join(dir, '.tln.tjs'),
      `module.exports = { components: async () => [{ id: 'a' }, { id: 'virtual' }] };`,
      'utf-8',
    );
    const component = new Component(null, 'root', dir, dir, TEST_EXECUTION_CONTEXT);
    await component.init();

    const tree = await component.ls({ parents: false, depth: 1, limit: 0, installedOnly: false });

    expect(tree!.children.map((c) => c.id)).toEqual(['a', 'virtual']);
  });

  it('depth: 0 returns just this node, with no children discovered', async () => {
    const dir = await makeTempDir();
    await fs.mkdir(path.join(dir, 'a'));
    const component = new Component(null, 'root', dir, dir, TEST_EXECUTION_CONTEXT);
    await component.init();

    const tree = await component.ls({ parents: false, depth: 0, limit: 0, installedOnly: false });

    expect(tree).toEqual({ id: 'root', installed: true, children: [], more: 0 });
  });

  it('depth: -1 recurses through every level without decrementing', async () => {
    const dir = await makeTempDir();
    await fs.mkdir(path.join(dir, 'a', 'b', 'c'), { recursive: true });
    const component = new Component(null, 'root', dir, dir, TEST_EXECUTION_CONTEXT);
    await component.init();

    const tree = await component.ls({ parents: false, depth: -1, limit: 0, installedOnly: false });

    expect(tree!.children[0]!.id).toBe('a');
    expect(tree!.children[0]!.children[0]!.id).toBe('b');
    expect(tree!.children[0]!.children[0]!.children[0]!.id).toBe('c');
    expect(tree!.children[0]!.children[0]!.children[0]!.children).toEqual([]);
  });

  it('limit truncates children and reports the remainder in `more`', async () => {
    const dir = await makeTempDir();
    await fs.mkdir(path.join(dir, 'a'));
    await fs.mkdir(path.join(dir, 'b'));
    await fs.mkdir(path.join(dir, 'c'));
    const component = new Component(null, 'root', dir, dir, TEST_EXECUTION_CONTEXT);
    await component.init();

    const tree = await component.ls({ parents: false, depth: 1, limit: 2, installedOnly: false });

    expect(tree!.children).toHaveLength(2);
    expect(tree!.more).toBe(1);
  });

  it('preserves the order components were declared in, not alphabetical order', async () => {
    const dir = await makeTempDir();
    await fs.writeFile(
      path.join(dir, '.tln.tjs'),
      `module.exports = { components: async () => [{ id: 'zeta' }, { id: 'alpha' }, { id: 'mid' }] };`,
      'utf-8',
    );
    const component = new Component(null, 'root', dir, dir, TEST_EXECUTION_CONTEXT);
    await component.init();

    const tree = await component.ls({ parents: false, depth: 1, limit: 0, installedOnly: false });

    expect(tree!.children.map((c) => c.id)).toEqual(['zeta', 'alpha', 'mid']);
  });

  it('installed reflects whether homePath exists, independent of sourcePath', async () => {
    const sourceDir = await makeTempDir();
    const homeDir = path.join(await makeTempDir(), 'does-not-exist');
    const component = new Component(null, 'root', sourceDir, homeDir, TEST_EXECUTION_CONTEXT);

    const tree = await component.ls({ parents: false, depth: 0, limit: 0, installedOnly: false });

    expect(tree!.installed).toBe(false);
  });

  it('installedOnly drops a non-installed component and its whole subtree', async () => {
    const dir = await makeTempDir();
    const component = new Component(null, 'root', dir, path.join(dir, 'missing-home'), TEST_EXECUTION_CONTEXT);

    const tree = await component.ls({ parents: false, depth: -1, limit: 0, installedOnly: true });

    expect(tree).toBeNull();
  });

  it('parents wraps the ancestor chain down to this component, without pulling in sibling branches', async () => {
    const dir = await makeTempDir();
    await fs.mkdir(path.join(dir, 'a', 'sibling'), { recursive: true });
    await fs.mkdir(path.join(dir, 'a', 'b'), { recursive: true });
    const root = new Component(null, 'root', dir, dir, TEST_EXECUTION_CONTEXT);
    await root.init();
    const a = await root.buildChild('a');
    const b = await a.buildChild('b');

    const tree = await b.ls({ parents: true, depth: 0, limit: 0, installedOnly: false });

    expect(tree).toEqual({
      id: 'root',
      installed: true,
      more: 0,
      children: [
        {
          id: 'a',
          installed: true,
          more: 0,
          children: [{ id: 'b', installed: true, more: 0, children: [] }],
        },
      ],
    });
  });
});
