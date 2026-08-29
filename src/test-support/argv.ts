import type { GlobalArgv } from '../util/globalOptions.js';

/** Base GlobalArgv + yargs' required `_`/`$0` fields, for building command argv fixtures in tests. */
export function baseArgv(): GlobalArgv & { _: (string | number)[]; $0: string } {
  return {
    verbose: 0,
    dryRun: false,
    all: false,
    depth: 1,
    parallel: false,
    recursive: false,
    env: [],
    envFile: [],
    failOnStderr: true,
    '--': [],
    cwd: '/fake/cwd',
    catalogHome: '/fake/catalog-home',
    userHome: '/fake/user-home',
    _: [],
    $0: 'tln',
  };
}
