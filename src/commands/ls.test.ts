import { beforeEach, describe, expect, it, vi } from 'vitest';
import type { ArgumentsCamelCase } from 'yargs';

const { createAppMock } = vi.hoisted(() => ({ createAppMock: vi.fn() }));

vi.mock('../app.js', () => ({ createApp: createAppMock }));

import { lsCommand, type LsArgv } from './ls.js';
import { baseArgv } from '../test-support/argv.js';

describe('lsCommand', () => {
  let lsMock: ReturnType<typeof vi.fn>;

  beforeEach(() => {
    lsMock = vi.fn().mockRejectedValue(new Error('Not implemented: App#ls'));
    createAppMock.mockReset();
    createAppMock.mockResolvedValue({ ls: lsMock });
  });

  it('is registered as "ls [components] [-d depth] [-l] [--parents] [--installed-only]"', () => {
    expect(lsCommand.command).toBe('ls [components] [-d depth] [-l] [--parents] [--installed-only]');
  });

  it('uses limit=-1 when --all is set, overriding --limit, and propagates App#ls\'s rejection', async () => {
    const argv: ArgumentsCamelCase<LsArgv> = { ...baseArgv(), all: true, components: '', limit: 5, parents: false, installedOnly: false };

    await expect(lsCommand.handler!(argv)).rejects.toThrow('Not implemented: App#ls');

    expect(lsMock).toHaveBeenCalledWith([], { limit: -1, parents: false, installedOnly: false });
  });

  it('uses the provided --limit when --all is not set', async () => {
    const argv: ArgumentsCamelCase<LsArgv> = { ...baseArgv(), all: false, components: '', limit: 7, parents: false, installedOnly: false };

    await expect(lsCommand.handler!(argv)).rejects.toThrow('Not implemented: App#ls');

    expect(lsMock).toHaveBeenCalledWith([], { limit: 7, parents: false, installedOnly: false });
  });
});
