import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import type { ArgumentsCamelCase } from 'yargs';

const { scanMock } = vi.hoisted(() => ({ scanMock: vi.fn() }));
vi.mock('../util/scanners/index.js', () => ({ scan: scanMock }));

import { catalogCommand, catalogRefreshCommand, type CatalogRefreshArgv } from './catalog.js';
import { baseArgv } from '../test-support/argv.js';

function refreshArgv(overrides: Partial<CatalogRefreshArgv> = {}): ArgumentsCamelCase<CatalogRefreshArgv> {
  return { ...baseArgv(), targets: '', concurrency: 4, ...overrides } as ArgumentsCamelCase<CatalogRefreshArgv>;
}

describe('catalogCommand', () => {
  it('is registered as "catalog" and requires a subcommand', () => {
    expect(catalogCommand.command).toBe('catalog');

    const fake = { command: vi.fn(), demandCommand: vi.fn() };
    fake.command.mockReturnValue(fake);
    fake.demandCommand.mockReturnValue(fake);

    (catalogCommand.builder as (y: unknown) => unknown)(fake);

    expect(fake.command).toHaveBeenCalledWith(catalogRefreshCommand);
    expect(fake.demandCommand).toHaveBeenCalledWith(1, expect.any(String));
  });
});

describe('catalogRefreshCommand', () => {
  beforeEach(() => {
    scanMock.mockReset();
    vi.spyOn(console, 'log').mockImplementation(() => undefined);
    vi.spyOn(console, 'error').mockImplementation(() => undefined);
  });

  afterEach(() => {
    vi.restoreAllMocks();
    process.exitCode = undefined;
  });

  it('is registered as "refresh [targets]"', () => {
    expect(catalogRefreshCommand.command).toBe('refresh [targets]');
  });

  it('passes null (meaning "every component") to scan when no targets are given', async () => {
    scanMock.mockResolvedValue([]);

    await catalogRefreshCommand.handler!(refreshArgv());

    expect(scanMock).toHaveBeenCalledWith(null, { catalogHome: '/fake/catalog-home', dryRun: false, concurrency: 4 });
  });

  it('splits a colon-delimited targets string into an id array for scan', async () => {
    scanMock.mockResolvedValue([]);

    await catalogRefreshCommand.handler!(refreshArgv({ targets: 'helm:node' }));

    expect(scanMock).toHaveBeenCalledWith(['helm', 'node'], expect.objectContaining({ catalogHome: '/fake/catalog-home' }));
  });

  it('forwards --github-token to scan when given', async () => {
    scanMock.mockResolvedValue([]);

    await catalogRefreshCommand.handler!(refreshArgv({ githubToken: 'secret' }));

    expect(scanMock).toHaveBeenCalledWith(null, expect.objectContaining({ githubToken: 'secret' }));
  });

  it('omits githubToken from scan options entirely when --github-token is not given', async () => {
    scanMock.mockResolvedValue([]);

    await catalogRefreshCommand.handler!(refreshArgv());

    expect(scanMock).toHaveBeenCalledWith(null, { catalogHome: '/fake/catalog-home', dryRun: false, concurrency: 4 });
    const passedOptions = scanMock.mock.calls[0]![1] as object;
    expect(passedOptions).not.toHaveProperty('githubToken');
  });

  it('logs a success line per successful result and never touches the exit code', async () => {
    const logSpy = vi.spyOn(console, 'log');
    scanMock.mockResolvedValue([{ componentId: 'helm', ok: true, count: 42, filePath: '/catalog/helm/components.cjs' }]);

    await catalogRefreshCommand.handler!(refreshArgv());

    expect(logSpy).toHaveBeenCalledWith(expect.stringContaining('helm: wrote 42 version(s) -> /catalog/helm/components.cjs'));
    expect(process.exitCode).toBeUndefined();
  });

  it('prefixes dry-run result lines with [dry-run]', async () => {
    const logSpy = vi.spyOn(console, 'log');
    scanMock.mockResolvedValue([{ componentId: 'helm', ok: true, count: 42, filePath: '/catalog/helm/components.cjs' }]);

    await catalogRefreshCommand.handler!(refreshArgv({ dryRun: true }));

    expect(logSpy).toHaveBeenCalledWith(expect.stringContaining('[dry-run] helm: 42 version(s)'));
  });

  it('logs a failure line per failed result and sets a non-zero exit code', async () => {
    const errorSpy = vi.spyOn(console, 'error');
    scanMock.mockResolvedValue([
      { componentId: 'helm', ok: false, error: 'boom' },
      { componentId: 'node', ok: true, count: 1, filePath: '/catalog/node/components.cjs' },
    ]);

    await catalogRefreshCommand.handler!(refreshArgv());

    expect(errorSpy).toHaveBeenCalledWith(expect.stringContaining('helm: failed — boom'));
    expect(process.exitCode).toBe(1);
  });
});
