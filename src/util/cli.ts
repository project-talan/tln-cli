import { readFileSync } from 'node:fs';
import type { Argv } from 'yargs';
import yargs from 'yargs/yargs';
import { findUpSync } from 'find-up';
import { registerCommands } from '../commands/index.js';
import { resolveEnvOverrides, parseCliOverrides } from '../env.js';
import { globalOptions, type GlobalArgv } from './globalOptions.js';

const USAGE =
  'Multi-component management system\n' +
  'Usage:\n' +
  ' $0 <command[:command[...]]> [component[:component[:...]]] [options] -- [options]';

/**
 * Builds (but does not parse) the top-level yargs instance: usage/help text,
 * shared global options, `.tlnrc` config defaults (closest one found walking
 * up from cwd), `--` passthrough capture, and all command registrations.
 */
export function build(args: readonly string[], cwd: string, catalogHome: string, userHome: string): Argv<GlobalArgv> {
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

  // --env/-e and --env-file are resolved once, here, into envOverrides
  // (resolveEnvOverrides) — env-file paths are resolved relative to cwd. yargs
  // only sets argv['--'] when at least one token follows `--`; normalize it to
  // always be an array so command handlers never see `undefined`, then parse
  // those tokens the same way, via yargs-parser (parseCliOverrides), into an
  // immutable object stashed as cliOverrides — every component's own options()
  // reads from this same shared, frozen object (see Component#resolveEnv),
  // rather than each one re-parsing the raw tokens; it's the highest-priority
  // override, resolved last. Also stash cwd/catalogHome/userHome on argv (not
  // exposed as CLI options) so every command handler can build an App without
  // recomputing them.
  instance.middleware(async (argv) => {
    argv.envOverrides = await resolveEnvOverrides(argv.env, argv.envFile, cwd);
    argv['--'] = argv['--'] ?? [];
    argv.cliOverrides = parseCliOverrides(argv['--']);
    argv.cwd = cwd;
    argv.catalogHome = catalogHome;
    argv.userHome = userHome;
  });

  return registerCommands(instance);
}
