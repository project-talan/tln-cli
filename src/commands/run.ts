import type { ArgumentsCamelCase, CommandModule } from 'yargs';
import type { GlobalArgv } from '../util/globalOptions.js';
import { createApp } from '../app.js';
import { splitIds } from '../util/misc.js';
import { componentsPositional } from '../util/positionals.js';

export interface RunArgv extends GlobalArgv {
  commands: string;
  components: string;
  save: boolean;
  depends: boolean;
}

export const runCommand: CommandModule<GlobalArgv, RunArgv> = {
  command: '$0 <commands> [components] [-r] [-p] [-s] [-u] [--depends]',
  describe: 'Execute set of commands over a set of components',
  builder: (yargs) =>
    yargs
      .positional('commands', { describe: 'delimited by colon commands, i.e. build:test', type: 'string' })
      .positional('components', componentsPositional)
      .option('save', { alias: 's', describe: "generate and save scripts inside component folder, otherwise temp folder will be used", default: false, type: 'boolean' })
      .option('depends', { describe: 'Execute commands for all components from depends list too', default: false, type: 'boolean' })
      .demandOption(['commands'], 'Please provide command(s) you need to run'),
  handler: async (argv: ArgumentsCamelCase<RunArgv>): Promise<void> => {
    // TODO: port Appl#run / Component#run's recursive/depends/save traversal from old/src/appl.js, old/src/component.js
    const app = await createApp(argv);
    await app.run(splitIds(argv.commands), splitIds(argv.components), argv.parallel, argv.dryRun);
  },
};
