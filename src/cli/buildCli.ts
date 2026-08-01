import type { Argv } from 'yargs';
import yargs from 'yargs/yargs';
import { loadConfig } from '../util/config.js';
import { registerCommands } from '../commands/index.js';
import { globalOptions, type GlobalArgv } from './globalOptions.js';

const USAGE =
  'Multi-component management system\n' +
  'Usage:\n' +
  ' $0 <step[:step[...]]> [component[:component[:...]]] [options] -- [options]';

/**
 * Builds (but does not parse) the top-level yargs instance: usage/help text,
 * shared global options, `.tlnrc` config defaults (home + project, merged),
 * `--` passthrough capture, and all command registrations.
 */
export function buildCli(args: readonly string[], cwd: string): Argv<GlobalArgv> {
  const { merged } = loadConfig(cwd);

  const instance = yargs(args, cwd)
    .scriptName('tln')
    .usage(USAGE)
    .help('help')
    .alias('help', 'h')
    .parserConfiguration({ 'populate--': true })
    .options(globalOptions)
    .config(merged) as unknown as Argv<GlobalArgv>;

  // yargs only sets argv['--'] when at least one token follows `--`; normalize
  // it to always be an array so command handlers never see `undefined`.
  instance.middleware((argv) => {
    argv['--'] = argv['--'] ?? [];
  });

  return registerCommands(instance);
}
