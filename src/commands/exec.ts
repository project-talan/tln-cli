import type { ArgumentsCamelCase, CommandModule } from 'yargs';
import type { GlobalArgv } from '../util/globalOptions.js';
import { createApp } from '../app.js';
import { splitComponents } from '../util/misc.js';

export interface ExecArgv extends GlobalArgv {
  components: string;
  command: string | undefined;
  input: string | undefined;
}

export const execCommand: CommandModule<GlobalArgv, ExecArgv> = {
  command: 'exec [components] [-r] [-p] [-c] [-i]',
  describe: 'Execute specified command or script',
  builder: (yargs) =>
    yargs
      .positional('components', {
        describe: 'delimited by colon components, i.e. maven:boost:bootstrap',
        default: '',
        type: 'string',
      })
      .option('command', { alias: 'c', describe: 'Shell command to execute', type: 'string' })
      .option('input', { alias: 'i', describe: 'Script name to execute', type: 'string' })
      .conflicts('command', 'input')
      .check((argv: ArgumentsCamelCase<ExecArgv>) => {
        if (!(argv.command || argv.input)) {
          throw new Error('command or input option is required');
        }
        return true;
      }),
  handler: async (argv: ArgumentsCamelCase<ExecArgv>): Promise<void> => {
    const components = splitComponents(argv.components);
    const app = await createApp(argv);
    await app.exec(components, argv.parallel, argv.recursive, argv.depth, { command: argv.command, input: argv.input });
  },
};
