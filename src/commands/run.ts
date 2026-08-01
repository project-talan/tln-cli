import type { ArgumentsCamelCase, CommandModule } from 'yargs';
import type { GlobalArgv } from '../cli/globalOptions.js';
import { splitComponents } from '../component.js';
import { parseEnv } from '../env.js';

export interface RunArgv extends GlobalArgv {
  steps: string;
  components: string;
  save: boolean;
  depends: boolean;
}

export const runCommand: CommandModule<GlobalArgv, RunArgv> = {
  command: '$0 <steps> [components] [-r] [-p] [-s] [-u] [--depends]',
  describe: 'Execute set of steps over a set of components',
  builder: (yargs) =>
    yargs
      .positional('steps', { describe: 'delimited by colon steps, i.e build:test', type: 'string' })
      .positional('components', {
        describe: 'delimited by colon components, i.e. maven:boost:bootstrap',
        default: '',
        type: 'string',
      })
      .option('save', { alias: 's', describe: "generate and save scripts inside component folder, otherwise temp folder will be used", default: false, type: 'boolean' })
      .option('depends', { describe: 'Execute steps for all components from depends list too', default: false, type: 'boolean' })
      .demandOption(['steps'], 'Please provide steps(s) you need to run'),
  handler: async (argv: ArgumentsCamelCase<RunArgv>): Promise<void> => {
    const components = splitComponents(argv.components);
    const steps = splitComponents(argv.steps).length ? argv.steps.split(':') : [];
    const envFromCli = parseEnv(argv.env);
    // TODO: port Appl#run / Component#run from old/src/appl.js, old/src/component.js
    console.log(
      `[stub] run: steps=${steps.join(':')} components=${components.join(':')} parallel=${argv.parallel} recursive=${argv.recursive} depth=${argv.depth} save=${argv.save} dryRun=${argv.dryRun} depends=${argv.depends} passthrough=${JSON.stringify(argv['--'])} env=${JSON.stringify(envFromCli)}`,
    );
    throw new Error('Not implemented: run (default) command');
  },
};
