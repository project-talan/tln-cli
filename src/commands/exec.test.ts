import { describe, expect, it, vi } from 'vitest';
import type { ArgumentsCamelCase } from 'yargs';
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
    it('logs a stub summary and always rejects with Not implemented', async () => {
      const logSpy = vi.spyOn(console, 'log').mockImplementation(() => undefined);
      const argv: ArgumentsCamelCase<ExecArgv> = {
        ...baseArgv(),
        components: 'maven',
        command: 'ls -la',
        input: undefined,
      };

      await expect(execCommand.handler!(argv)).rejects.toThrow('Not implemented: exec command');
      expect(logSpy).toHaveBeenCalledWith(expect.stringContaining('command=ls -la'));

      logSpy.mockRestore();
    });
  });
});
