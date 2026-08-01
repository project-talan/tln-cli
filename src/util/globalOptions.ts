import type { Options } from 'yargs';

/**
 * Argv shape shared by every command. Port of the global option set defined in
 * old/cli.js:35-51. `'--'` captures everything after a literal `--` separator
 * (see buildCli.ts's parserConfiguration + middleware) and is always an array,
 * never undefined, once middleware normalization has run.
 */
export interface GlobalArgv {
  verbose: number;
  parallel: boolean;
  recursive: boolean;
  all: boolean;
  dryRun: boolean;
  env: string[];
  depth: number;
  failOnStderr: boolean;
  parentFirst: boolean;
  catalog: string[];
  envFile: string[];
  localRepo: string | undefined;
  detach: boolean;
  '--': string[];
}

export const globalOptions = {
  verbose: { alias: 'v', count: true, default: 0, describe: 'Increase logging verbosity' },
  parallel: { alias: 'p', type: 'boolean', default: false, describe: 'Execute commands for multiple components in parallel' },
  recursive: { alias: 'r', type: 'boolean', default: false, describe: 'Execute commands recursively for all direct child components' },
  all: { alias: 'a', type: 'boolean', default: false, describe: 'Show all components' },
  'dry-run': { alias: 'u', type: 'boolean', default: false, describe: "Don't do anything, just print generated scripts" },
  env: { alias: 'e', type: 'array', string: true, default: [], describe: 'Set environment variables' },
  depth: { alias: 'd', type: 'number', default: 1, describe: 'Max depth level' },
  'fail-on-stderr': { type: 'boolean', default: true, describe: 'Stop execution when script returns an error' },
  'parent-first': { type: 'boolean', default: false, describe: 'During recursive execution, parent will be processed first and then nested components' },
  catalog: { type: 'array', string: true, default: [], describe: 'URL to the external components description' },
  'env-file': { type: 'array', string: true, default: [], describe: 'Read in a file of environment variables' },
  'local-repo': { type: 'string', describe: "Shared components will be deployed using this path or project's root otherwise, if parameter is not defined" },
  detach: { type: 'boolean', default: false, describe: 'Shared components will be deployed inside tmp folder' },
} satisfies Record<string, Options>;
