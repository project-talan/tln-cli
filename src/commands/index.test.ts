import { describe, expect, it, vi } from 'vitest';
import type { Argv } from 'yargs';
import type { GlobalArgv } from '../util/globalOptions.js';
import { registerCommands } from './index.js';
import { configCommand } from './config.js';
import { inspectCommand } from './inspect.js';
import { lsCommand } from './ls.js';
import { execCommand } from './exec.js';
import { runCommand } from './run.js';
import { aboutCommand } from './about.js';

describe('registerCommands', () => {
  it('registers all six commands, in order, on the yargs instance', () => {
    const fake = { command: vi.fn() };
    fake.command.mockReturnValue(fake);

    const result = registerCommands(fake as unknown as Argv<GlobalArgv>);

    expect(result).toBe(fake);
    expect(fake.command).toHaveBeenNthCalledWith(1, configCommand);
    expect(fake.command).toHaveBeenNthCalledWith(2, inspectCommand);
    expect(fake.command).toHaveBeenNthCalledWith(3, lsCommand);
    expect(fake.command).toHaveBeenNthCalledWith(4, execCommand);
    expect(fake.command).toHaveBeenNthCalledWith(5, runCommand);
    expect(fake.command).toHaveBeenNthCalledWith(6, aboutCommand);
    expect(fake.command).toHaveBeenCalledTimes(6);
  });
});
