import { readFileSync } from 'node:fs';
import type { Argv } from 'yargs';
import yargs from 'yargs/yargs';
import { findUpSync } from 'find-up';
import { registerCommands } from '../commands/index.js';
import { globalOptions, type GlobalArgv } from './globalOptions.js';

const USAGE =
  'Multi-component management system\n' +
  'Usage:\n' +
  ' $0 <step[:step[...]]> [component[:component[:...]]] [options] -- [options]';

/**
 * Builds (but does not parse) the top-level yargs instance: usage/help text,
 * shared global options, `.tlnrc` config defaults (closest one found walking
 * up from cwd), `--` passthrough capture, and all command registrations.
 */
export function build(args: readonly string[], cwd: string): Argv<GlobalArgv> {
  const configPath = findUpSync(['.tlnrc'], { cwd });
  const config = configPath ? JSON.parse(readFileSync(configPath, 'utf-8')) : {};

  const instance = yargs(args, cwd)
    .scriptName('tln')
    .usage(USAGE)
    .help('help')
    .alias('help', 'h')
    .parserConfiguration({ 'populate--': true })
    .options(globalOptions)
    .config(config) as unknown as Argv<GlobalArgv>;

  // yargs only sets argv['--'] when at least one token follows `--`; normalize
  // it to always be an array so command handlers never see `undefined`.
  instance.middleware((argv) => {
    argv['--'] = argv['--'] ?? [];
  });

  return registerCommands(instance);
}
