import type { ArgumentsCamelCase, CommandModule } from 'yargs';
import type { GlobalArgv } from '../util/globalOptions.js';
import { createApp } from '../app.js';
import { splitIds } from '../util/misc.js';

export interface InspectArgv extends GlobalArgv {
  components: string;
  json: boolean;
}

export const inspectCommand: CommandModule<GlobalArgv, InspectArgv> = {
  command: 'inspect [components] [-j]',
  describe: 'Display component(s) internal structure',
  builder: (yargs) =>
    yargs
      .positional('components', {
        describe: 'Delimited by colon components, i.e. maven:boost:bootstrap',
        default: '',
        type: 'string',
      })
      .option('json', {
        alias: 'j',
        describe: 'Output using json format instead of yaml',
        default: false,
        type: 'boolean',
      }),
  handler: async (argv: ArgumentsCamelCase<InspectArgv>): Promise<void> => {
    const components = splitIds(argv.components);
    const app = await createApp(argv);
    await app.inspect(components, { json: argv.json });
  },
};
