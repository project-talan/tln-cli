import type { ArgumentsCamelCase, CommandModule } from 'yargs';
import type { GlobalArgv } from '../cli/globalOptions.js';
import { splitComponents } from '../component.js';
import { parseEnv } from '../env.js';

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
    const envFromCli = parseEnv(argv.env);
    // TODO: port Appl#exec / Component#exec from old/src/appl.js, old/src/component.js
    console.log(
      `[stub] exec: components=${components.join(':')} parallel=${argv.parallel} recursive=${argv.recursive} depth=${argv.depth} dryRun=${argv.dryRun} command=${argv.command ?? '(none)'} input=${argv.input ?? '(none)'} passthrough=${JSON.stringify(argv['--'])} env=${JSON.stringify(envFromCli)}`,
    );
    throw new Error('Not implemented: exec command');
  },
};
