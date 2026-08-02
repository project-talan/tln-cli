import { describe, expect, it, vi } from 'vitest';
import type { ArgumentsCamelCase } from 'yargs';
import { lsCommand, type LsArgv } from './ls.js';
import { baseArgv } from '../test-support/argv.js';

describe('lsCommand', () => {
  it('is registered as "ls [components] [-d depth] [-l] [--parents] [--installed-only]"', () => {
    expect(lsCommand.command).toBe('ls [components] [-d depth] [-l] [--parents] [--installed-only]');
  });

  it('uses limit=-1 when --all is set, overriding --limit, and always rejects with Not implemented', async () => {
    const logSpy = vi.spyOn(console, 'log').mockImplementation(() => undefined);
    const argv: ArgumentsCamelCase<LsArgv> = { ...baseArgv(), all: true, components: '', limit: 5, parents: false, installedOnly: false };

    await expect(lsCommand.handler!(argv)).rejects.toThrow('Not implemented: ls command');
    expect(logSpy).toHaveBeenCalledWith(expect.stringContaining('limit=-1'));

    logSpy.mockRestore();
  });

  it('uses the provided --limit when --all is not set', async () => {
    const logSpy = vi.spyOn(console, 'log').mockImplementation(() => undefined);
    const argv: ArgumentsCamelCase<LsArgv> = { ...baseArgv(), all: false, components: '', limit: 7, parents: false, installedOnly: false };

    await expect(lsCommand.handler!(argv)).rejects.toThrow('Not implemented: ls command');
    expect(logSpy).toHaveBeenCalledWith(expect.stringContaining('limit=7'));

    logSpy.mockRestore();
  });
});
