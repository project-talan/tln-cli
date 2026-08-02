import { beforeEach, describe, expect, it, vi } from 'vitest';
import type { ArgumentsCamelCase } from 'yargs';

const { createMock } = vi.hoisted(() => ({ createMock: vi.fn() }));

vi.mock('../component.js', async (importOriginal) => {
  const actual = await importOriginal<typeof import('../component.js')>();
  return { ...actual, create: createMock };
});

import { runCommand, type RunArgv } from './run.js';
import { baseArgv } from '../test-support/argv.js';

describe('runCommand', () => {
  let runMock: ReturnType<typeof vi.fn>;

  beforeEach(() => {
    runMock = vi.fn().mockResolvedValue(undefined);
    createMock.mockReset();
    createMock.mockResolvedValue({ run: runMock });
  });

  it('is registered as the default "$0 <steps> [components]" command', () => {
    expect(runCommand.command).toBe('$0 <steps> [components] [-r] [-p] [-s] [-u] [--depends]');
  });

  it('creates the root component at cwd and runs each colon-delimited step with the dry-run flag', async () => {
    const argv: ArgumentsCamelCase<RunArgv> = { ...baseArgv(), steps: 'build:test', components: '', save: false, depends: false, dryRun: true };

    await runCommand.handler!(argv);

    expect(createMock).toHaveBeenCalledWith(process.cwd());
    expect(runMock).toHaveBeenNthCalledWith(1, 'build', true);
    expect(runMock).toHaveBeenNthCalledWith(2, 'test', true);
  });

  it('warns and still runs against the root component when a target component is given', async () => {
    const warnSpy = vi.spyOn(console, 'warn').mockImplementation(() => undefined);
    const argv: ArgumentsCamelCase<RunArgv> = { ...baseArgv(), steps: 'build', components: 'maven:boost', save: false, depends: false };

    await runCommand.handler!(argv);

    expect(warnSpy).toHaveBeenCalledWith(expect.stringContaining('maven:boost'));
    expect(runMock).toHaveBeenCalledWith('build', false);

    warnSpy.mockRestore();
  });

  it('does not warn when no target component is given', async () => {
    const warnSpy = vi.spyOn(console, 'warn').mockImplementation(() => undefined);
    const argv: ArgumentsCamelCase<RunArgv> = { ...baseArgv(), steps: 'build', components: '', save: false, depends: false };

    await runCommand.handler!(argv);

    expect(warnSpy).not.toHaveBeenCalled();

    warnSpy.mockRestore();
  });
});
