import { beforeEach, describe, expect, it, vi } from 'vitest';
import type { ArgumentsCamelCase } from 'yargs';

const { createAppMock } = vi.hoisted(() => ({ createAppMock: vi.fn() }));

vi.mock('../app.js', () => ({ createApp: createAppMock }));

import { runCommand, type RunArgv } from './run.js';
import { baseArgv } from '../test-support/argv.js';

describe('runCommand', () => {
  let runMock: ReturnType<typeof vi.fn>;

  beforeEach(() => {
    runMock = vi.fn().mockResolvedValue(undefined);
    createAppMock.mockReset();
    createAppMock.mockResolvedValue({ run: runMock });
  });

  it('is registered as the default "$0 <commands> [components]" command', () => {
    expect(runCommand.command).toBe('$0 <commands> [components] [-r] [-p] [-s] [-u] [--depends]');
  });

  it('creates an App and runs each colon-delimited command with the dry-run flag', async () => {
    const argv: ArgumentsCamelCase<RunArgv> = { ...baseArgv(), commands: 'build:test', components: '', save: false, depends: false, dryRun: true };

    await runCommand.handler!(argv);

    expect(createAppMock).toHaveBeenCalledWith(argv);
    expect(runMock).toHaveBeenCalledWith(['build', 'test'], [], false, true);
  });

  it('passes the target components through to App#run', async () => {
    const argv: ArgumentsCamelCase<RunArgv> = { ...baseArgv(), commands: 'build', components: 'maven:boost', save: false, depends: false };

    await runCommand.handler!(argv);

    expect(runMock).toHaveBeenCalledWith(['build'], ['maven', 'boost'], false, false);
  });
});
