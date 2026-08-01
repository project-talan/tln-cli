import type { ArgumentsCamelCase, CommandModule } from 'yargs';
import type { GlobalArgv } from '../util/globalOptions.js';
import { splitComponents } from '../component.js';
import { parseEnv } from '../env.js';

export interface ConfigArgv extends GlobalArgv {
  components: string;
  repo: string | undefined;
  update: boolean;
  folder: string | undefined;
  force: boolean;
  terse: boolean;
  depend: string[];
  inherit: string[];
}

export const configCommand: CommandModule<GlobalArgv, ConfigArgv> = {
  command: 'config [components]',
  describe: 'Create tln config in current folder, or clone/pull git repo with shared configuration',
  builder: (yargs) =>
    yargs
      .positional('components', {
        describe: 'Delimited by colon components, i.e. maven:boost:bootstrap',
        default: '',
        type: 'string',
      })
      .option('repo', { describe: 'Git repository url', type: 'string' })
      .option('update', { describe: 'Update catalog inside .tln folder', default: false, type: 'boolean' })
      .option('folder', { describe: 'Additional subfolder to extract repository to', type: 'string' })
      .option('force', { describe: 'Force override config file, if exists', default: false, type: 'boolean' })
      .option('terse', { describe: 'Remove help information from the config', default: false, type: 'boolean' })
      .option('depend', { describe: 'Component to insert into depends list', default: [], type: 'array', string: true })
      .option('inherit', { describe: 'Component to insert into inherits list', default: [], type: 'array', string: true })
      .check((argv: ArgumentsCamelCase<ConfigArgv>) => {
        if (argv.repo && argv.update) {
          throw new Error('repo and update parameters are conflicting. Please use only one: repo or update');
        }
        return true;
      }),
  handler: async (argv: ArgumentsCamelCase<ConfigArgv>): Promise<void> => {
    const components = splitComponents(argv.components);
    const envFromCli = parseEnv(argv.env);
    // TODO: port Appl#config / Component#config from old/src/appl.js, old/src/component.js
    console.log(
      `[stub] config: components=${components.join(':')} repo=${argv.repo ?? '(none)'} update=${argv.update} force=${argv.force} terse=${argv.terse} depend=${argv.depend.join(',')} inherit=${argv.inherit.join(',')} env=${JSON.stringify(envFromCli)}`,
    );
    throw new Error('Not implemented: config command');
  },
};
