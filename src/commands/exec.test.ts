import { beforeEach, describe, expect, it, vi } from 'vitest';
import type { ArgumentsCamelCase } from 'yargs';

const { createAppMock } = vi.hoisted(() => ({ createAppMock: vi.fn() }));

vi.mock('../app.js', () => ({ createApp: createAppMock }));

import { execCommand, type ExecArgv } from './exec.js';
import { baseArgv } from '../test-support/argv.js';

function createFakeYargs() {
  const checks: Array<(argv: unknown) => boolean> = [];
  const fake = {
    positional: vi.fn(() => fake),
    option: vi.fn(() => fake),
    conflicts: vi.fn(() => fake),
    check: vi.fn((fn: (argv: unknown) => boolean) => {
      checks.push(fn);
      return fake;
    }),
  };
  return { fake, checks };
}

describe('execCommand', () => {
  it('is registered as "exec [components] [-r] [-p] [-c] [-i]"', () => {
    expect(execCommand.command).toBe('exec [components] [-r] [-p] [-c] [-i]');
  });

  describe('builder validation', () => {
    it('wires command/input as conflicting options', () => {
      const { fake } = createFakeYargs();
      (execCommand.builder as (y: unknown) => unknown)(fake);

      expect(fake.conflicts).toHaveBeenCalledWith('command', 'input');
    });

    it('throws when neither command nor input is provided', () => {
      const { fake, checks } = createFakeYargs();
      (execCommand.builder as (y: unknown) => unknown)(fake);

      expect(() => checks[0]!({ command: undefined, input: undefined })).toThrow('command or input option is required');
    });

    it('passes when command or input is provided', () => {
      const { fake, checks } = createFakeYargs();
      (execCommand.builder as (y: unknown) => unknown)(fake);

      expect(checks[0]!({ command: 'ls -la', input: undefined })).toBe(true);
      expect(checks[0]!({ command: undefined, input: 'script.sh' })).toBe(true);
    });
  });

  describe('handler', () => {
    let execMock: ReturnType<typeof vi.fn>;

    beforeEach(() => {
      execMock = vi.fn().mockRejectedValue(new Error('Not implemented: App#exec'));
      createAppMock.mockReset();
      createAppMock.mockResolvedValue({ exec: execMock });
    });

    it('creates an App and delegates to App#exec, propagating its rejection', async () => {
      const argv: ArgumentsCamelCase<ExecArgv> = {
        ...baseArgv(),
        components: 'maven',
        parallel: true,
        recursive: true,
        depth: 2,
        command: 'ls -la',
        input: undefined,
      };

      await expect(execCommand.handler!(argv)).rejects.toThrow('Not implemented: App#exec');

      expect(createAppMock).toHaveBeenCalledWith(argv);
      expect(execMock).toHaveBeenCalledWith(['maven'], true, true, 2, { command: 'ls -la', input: undefined });
    });
  });
});
