import type { ArgumentsCamelCase, CommandModule } from 'yargs';
import type { GlobalArgv } from '../util/globalOptions.js';
import { create, splitComponents } from '../component.js';

export interface RunArgv extends GlobalArgv {
  steps: string;
  components: string;
  save: boolean;
  depends: boolean;
}

export const runCommand: CommandModule<GlobalArgv, RunArgv> = {
  command: '$0 <steps> [components] [-r] [-p] [-s] [-u] [--depends]',
  describe: 'Execute set of commands over a set of components',
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

    if (components.length) {
      // Targeting a specific component in the tree needs the resolve()/find() logic
      // ported from old/src/component.js, which isn't in place yet.
      console.warn(
        `Targeting specific components (${components.join(':')}) is not yet supported; running against the root component.`,
      );
    }

    // TODO: port Appl#run / Component#run's recursive/parallel/depends/save traversal from old/src/appl.js, old/src/component.js
    const root = await create(process.cwd());
    for (const step of steps) {
      await root.run(step, argv.dryRun);
    }
  },
};
