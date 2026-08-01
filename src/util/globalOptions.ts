import type { Options } from 'yargs';

/**
 * Argv shape shared by every command. Port of the global option set defined in
 * old/cli.js:35-51. `'--'` captures everything after a literal `--` separator
 * (see buildCli.ts's parserConfiguration + middleware) and is always an array,
 * never undefined, once middleware normalization has run.
 */
export interface GlobalArgv {
  verbose: number;
  dryRun: boolean;
  all: boolean;
  depth: number;
  parallel: boolean;
  recursive: boolean;
  env: string[];
  envFile: string[];
  failOnStderr: boolean;
  '--': string[];
}

export const globalOptions = {
  verbose: { alias: 'v', count: true, default: 0, describe: 'Increase logging verbosity' },
  'dry-run': { alias: 'u', type: 'boolean', default: false, describe: "Don't do anything, just print generated scripts" },
  all: { alias: 'a', type: 'boolean', default: false, describe: 'Show all components' },
  depth: { alias: 'd', type: 'number', default: 1, describe: 'Depth level' },
  parallel: { alias: 'p', type: 'boolean', default: false, describe: 'Execute commands for multiple components in parallel' },
  recursive: { alias: 'r', type: 'boolean', default: false, describe: 'Execute commands recursively for all direct child components' },
  env: { alias: 'e', type: 'array', string: true, default: [], describe: 'Set environment variables' },
  'env-file': { type: 'array', string: true, default: [], describe: 'Read in a file of environment variables' },
  'fail-on-stderr': { type: 'boolean', default: true, describe: 'Stop execution when script returns an error' },
} satisfies Record<string, Options>;
