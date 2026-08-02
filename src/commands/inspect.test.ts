import { describe, expect, it, vi } from 'vitest';
import type { ArgumentsCamelCase } from 'yargs';
import { inspectCommand, type InspectArgv } from './inspect.js';
import { baseArgv } from '../test-support/argv.js';

describe('inspectCommand', () => {
  it('is registered as "inspect [components] [-j]"', () => {
    expect(inspectCommand.command).toBe('inspect [components] [-j]');
  });

  it('logs a stub summary and always rejects with Not implemented', async () => {
    const logSpy = vi.spyOn(console, 'log').mockImplementation(() => undefined);
    const argv: ArgumentsCamelCase<InspectArgv> = { ...baseArgv(), components: 'maven', json: true };

    await expect(inspectCommand.handler!(argv)).rejects.toThrow('Not implemented: inspect command');
    expect(logSpy).toHaveBeenCalledWith('[stub] inspect: components=maven json=true');

    logSpy.mockRestore();
  });
});
