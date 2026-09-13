import type { ArgumentsCamelCase, CommandModule } from 'yargs';
import { DEFAULT_CONCURRENCY, GITHUB_TOKEN_FILE } from '../config.js';
import type { GlobalArgv } from '../util/globalOptions.js';
import { splitIds } from '../util/misc.js';
import { scan } from '../util/scanners/index.js';

export interface CatalogRefreshArgv extends GlobalArgv {
  targets: string;
  concurrency: number;
  githubToken: string | undefined;
}

export const catalogRefreshCommand: CommandModule<GlobalArgv, CatalogRefreshArgv> = {
  command: 'refresh [targets]',
  describe: "Rescan upstream sources and rewrite each catalog component's available versions",
  builder: (yargs) =>
    yargs
      .positional('targets', { describe: 'Delimited by colon component ids to refresh, i.e. helm:node (default: all)', default: '', type: 'string' })
      .option('concurrency', { describe: 'How many components to scan at once', default: DEFAULT_CONCURRENCY, type: 'number' })
      .option('githubToken', { alias: 'github-token', describe: `GitHub token for API requests (else GITHUB_TOKEN env var, else ${GITHUB_TOKEN_FILE})`, type: 'string' }),
  handler: async (argv: ArgumentsCamelCase<CatalogRefreshArgv>): Promise<void> => {
    const ids = splitIds(argv.targets);
    const results = await scan(ids.length ? ids : null, {
      catalogHome: argv.catalogHome,
      dryRun: argv.dryRun,
      concurrency: argv.concurrency,
      ...(argv.githubToken !== undefined ? { githubToken: argv.githubToken } : {}),
    });

    let failureCount = 0;
    for (const result of results) {
      if (!result.ok) {
        failureCount++;
        console.error(`${result.componentId}: failed — ${result.error}`);
      } else if (argv.dryRun) {
        console.log(`[dry-run] ${result.componentId}: ${result.count} version(s) -> ${result.filePath}`);
      } else {
        console.log(`${result.componentId}: wrote ${result.count} version(s) -> ${result.filePath}`);
      }
    }
    if (failureCount > 0) process.exitCode = 1;
  },
};

export const catalogCommand: CommandModule<GlobalArgv, GlobalArgv> = {
  command: 'catalog',
  describe: 'Manage the built-in third-party component catalog',
  builder: (yargs) => yargs.command(catalogRefreshCommand).demandCommand(1, 'Please provide a catalog subcommand, e.g. "refresh"'),
  handler: (): void => {},
};
