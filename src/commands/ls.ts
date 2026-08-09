import type { ArgumentsCamelCase, CommandModule } from 'yargs';
import type { GlobalArgv } from '../util/globalOptions.js';
import { createApp } from '../app.js';
import { splitComponents } from '../util/misc.js';

export interface LsArgv extends GlobalArgv {
  components: string;
  limit: number;
  parents: boolean;
  installedOnly: boolean;
}

export const lsCommand: CommandModule<GlobalArgv, LsArgv> = {
  command: 'ls [components] [-d depth] [-l] [--parents] [--installed-only]',
  describe: 'Display components hierarchy',
  builder: (yargs) =>
    yargs
      .positional('components', {
        describe: 'Delimited by colon components, i.e. maven:boost:bootstrap',
        default: '',
        type: 'string',
      })
      .option('limit', { alias: 'l', describe: 'Limit of children to show', default: 5, type: 'number' })
      .option('parents', { describe: 'Show all component parents', default: false, type: 'boolean' })
      .option('installedOnly', { alias: 'installed-only', describe: 'Show installed components only', default: false, type: 'boolean' }),
  handler: async (argv: ArgumentsCamelCase<LsArgv>): Promise<void> => {
    const components = splitComponents(argv.components);
    const limit = argv.all ? -1 : argv.limit;
    const app = await createApp(argv);
    await app.ls(components, { limit, parents: argv.parents, installedOnly: argv.installedOnly });
  },
};
