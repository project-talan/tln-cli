import type { ArgumentsCamelCase, CommandModule } from 'yargs';
import type { GlobalArgv } from '../cli/globalOptions.js';
import { splitComponents } from '../component.js';

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
    // TODO: port Appl#ls / Component#ls from old/src/appl.js, old/src/component.js
    console.log(
      `[stub] ls: components=${components.join(':')} depth=${argv.depth} limit=${limit} parents=${argv.parents} installedOnly=${argv.installedOnly}`,
    );
    throw new Error('Not implemented: ls command');
  },
};
