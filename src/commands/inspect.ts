import type { ArgumentsCamelCase, CommandModule } from 'yargs';
import type { GlobalArgv } from '../cli/globalOptions.js';
import { splitComponents } from '../component.js';

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
    const components = splitComponents(argv.components);
    // TODO: port Appl#inspect / Component#inspect from old/src/appl.js, old/src/component.js
    console.log(`[stub] inspect: components=${components.join(':')} json=${argv.json}`);
    throw new Error('Not implemented: inspect command');
  },
};
