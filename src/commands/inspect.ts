import type { ArgumentsCamelCase, CommandModule } from 'yargs';
import type { GlobalArgv } from '../util/globalOptions.js';
import { createApp } from '../app.js';
import { splitIds } from '../util/misc.js';
import { componentsPositional } from '../util/positionals.js';

export interface InspectArgv extends GlobalArgv {
  components: string;
  json: boolean;
}

export const inspectCommand: CommandModule<GlobalArgv, InspectArgv> = {
  command: 'inspect [components] [-j]',
  describe: 'Display component(s) internal structure',
  builder: (yargs) =>
    yargs
      .positional('components', componentsPositional)
      .option('json', {
        alias: 'j',
        describe: 'Output using json format instead of yaml',
        default: false,
        type: 'boolean',
      }),
  handler: async (argv: ArgumentsCamelCase<InspectArgv>): Promise<void> => {
    const app = await createApp(argv);
    await app.inspect(splitIds(argv.components), { json: argv.json });
  },
};
