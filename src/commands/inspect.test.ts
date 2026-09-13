import { beforeEach, describe, expect, it, vi } from 'vitest';
import type { ArgumentsCamelCase } from 'yargs';

const { createAppMock } = vi.hoisted(() => ({ createAppMock: vi.fn() }));

vi.mock('../app.js', () => ({ createApp: createAppMock }));

import { inspectCommand, type InspectArgv } from './inspect.js';
import { baseArgv } from '../test-support/argv.js';

describe('inspectCommand', () => {
  let inspectMock: ReturnType<typeof vi.fn>;

  beforeEach(() => {
    inspectMock = vi.fn().mockResolvedValue(undefined);
    createAppMock.mockReset();
    createAppMock.mockResolvedValue({ inspect: inspectMock });
  });

  it('is registered as "inspect [components] [-j]"', () => {
    expect(inspectCommand.command).toBe('inspect [components] [-j]');
  });

  it('creates an App and delegates to App#inspect', async () => {
    const argv: ArgumentsCamelCase<InspectArgv> = { ...baseArgv(), components: 'maven', json: true };

    await inspectCommand.handler!(argv);

    expect(createAppMock).toHaveBeenCalledWith(argv);
    expect(inspectMock).toHaveBeenCalledWith(['maven'], { json: true });
  });
});
