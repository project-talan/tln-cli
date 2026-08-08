import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import { promises as fs } from 'node:fs';
import os from 'node:os';
import path from 'node:path';
import { build } from './cli.js';

describe('build', () => {
  let tempDirs: string[];

  beforeEach(() => {
    tempDirs = [];
  });

  afterEach(async () => {
    vi.restoreAllMocks();
    await Promise.all(tempDirs.map((dir) => fs.rm(dir, { recursive: true, force: true })));
  });

  const catalogHome = '/fake/catalog-home';

  async function makeTempDir(): Promise<string> {
    const dir = await fs.mkdtemp(path.join(os.tmpdir(), 'tln-cli-test-'));
    tempDirs.push(dir);
    return dir;
  }

  it('exposes the tln scriptName and usage text via getHelp', async () => {
    const dir = await makeTempDir();

    const help = await build([], dir, catalogHome).getHelp();

    expect(help).toContain('tln');
    expect(help).toContain('Multi-component management system');
  });

  it('normalizes "--" to an empty array when nothing follows it', async () => {
    const dir = await makeTempDir();
    const logSpy = vi.spyOn(console, 'log').mockImplementation(() => undefined);

    const argv = await build(['about'], dir, catalogHome).parseAsync();

    expect(argv['--']).toEqual([]);
    logSpy.mockRestore();
  });

  it('captures everything after "--" as passthrough args', async () => {
    const dir = await makeTempDir();
    const logSpy = vi.spyOn(console, 'log').mockImplementation(() => undefined);

    const argv = await build(['about', '--', 'foo', 'bar'], dir, catalogHome).parseAsync();

    expect(argv['--']).toEqual(['foo', 'bar']);
    logSpy.mockRestore();
  });

  it('applies defaults found in the nearest .tlnrc walking up from cwd', async () => {
    const root = await makeTempDir();
    await fs.writeFile(path.join(root, '.tlnrc'), JSON.stringify({ verbose: 3 }), 'utf-8');
    const nested = path.join(root, 'nested');
    await fs.mkdir(nested);

    const logSpy = vi.spyOn(console, 'log').mockImplementation(() => undefined);
    const argv = await build(['about'], nested, catalogHome).parseAsync();
    logSpy.mockRestore();

    expect(argv.verbose).toBe(3);
  });

  it('falls back to no config when no .tlnrc is found', async () => {
    const dir = await makeTempDir();
    const logSpy = vi.spyOn(console, 'log').mockImplementation(() => undefined);

    const argv = await build(['about'], dir, catalogHome).parseAsync();
    logSpy.mockRestore();

    expect(argv.verbose).toBe(0);
  });

  it('stashes cwd and catalogHome on argv without exposing them as CLI options', async () => {
    const dir = await makeTempDir();
    const logSpy = vi.spyOn(console, 'log').mockImplementation(() => undefined);

    const argv = await build(['about'], dir, catalogHome).parseAsync();
    logSpy.mockRestore();

    expect(argv.cwd).toBe(dir);
    expect(argv.catalogHome).toBe(catalogHome);
    expect(await build([], dir, catalogHome).getHelp()).not.toContain('--cwd');
  });
});
