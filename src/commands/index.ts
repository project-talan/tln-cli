import type { Argv } from 'yargs';
import type { GlobalArgv } from '../cli/globalOptions.js';
import { configCommand } from './config.js';
import { inspectCommand } from './inspect.js';
import { lsCommand } from './ls.js';
import { execCommand } from './exec.js';
import { runCommand } from './run.js';
import { aboutCommand } from './about.js';

/**
 * Registers each command module individually so yargs can infer each command's
 * own argv type (`U`) at the call site, rather than forcing all six modules
 * into one heterogeneous array type (which would require `any`/`unknown` due
 * to CommandModule's handler being contravariant in `U`).
 */
export function registerCommands(yargsInstance: Argv<GlobalArgv>): Argv<GlobalArgv> {
  return yargsInstance
    .command(configCommand)
    .command(inspectCommand)
    .command(lsCommand)
    .command(execCommand)
    .command(runCommand)
    .command(aboutCommand);
}
