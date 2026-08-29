import { beforeEach, describe, expect, it, vi } from 'vitest';
import type { ArgumentsCamelCase } from 'yargs';

const { createAppMock } = vi.hoisted(() => ({ createAppMock: vi.fn() }));

vi.mock('../app.js', () => ({ createApp: createAppMock }));

import { lsCommand, type LsArgv } from './ls.js';
import { baseArgv } from '../test-support/argv.js';

describe('lsCommand', () => {
  let lsMock: ReturnType<typeof vi.fn>;

  beforeEach(() => {
    lsMock = vi.fn().mockResolvedValue(undefined);
    createAppMock.mockReset();
    createAppMock.mockResolvedValue({ ls: lsMock });
  });

  it('is registered as "ls [components] [-d depth] [-l] [--parents] [--installed-only]"', () => {
    expect(lsCommand.command).toBe('ls [components] [-d depth] [-l] [--parents] [--installed-only]');
  });

  it('uses limit=-1 when --all is set, overriding --limit', async () => {
    const argv: ArgumentsCamelCase<LsArgv> = { ...baseArgv(), all: true, components: '', limit: 5, parents: false, installedOnly: false };

    await lsCommand.handler!(argv);

    expect(lsMock).toHaveBeenCalledWith([], { limit: -1, parents: false, installedOnly: false, depth: argv.depth });
  });

  it('uses the provided --limit when --all is not set', async () => {
    const argv: ArgumentsCamelCase<LsArgv> = { ...baseArgv(), all: false, components: '', limit: 7, parents: false, installedOnly: false };

    await lsCommand.handler!(argv);

    expect(lsMock).toHaveBeenCalledWith([], { limit: 7, parents: false, installedOnly: false, depth: argv.depth });
  });
});
