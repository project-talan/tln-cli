import { createRequire } from 'node:module';
import type { CommandModule } from 'yargs';
import type { GlobalArgv } from '../util/globalOptions.js';

// package.json lives outside tsconfig's rootDir ("./src"), so a static import isn't
// legal here; createRequire gives us a runtime-only require() that tsc's rootDir
// enclosure check never inspects. import.meta.url is the ESM equivalent of __filename.
const requireFromHere = createRequire(import.meta.url);
const pkg = requireFromHere('../../package.json') as { version: string };

const BANNER = String.raw`  _____           _           _     _______    _
 |  __ \         (_)         | |   |__   __|  | |
 | |__) | __ ___  _  ___  ___| |_     | | __ _| | __ _ _ __
 |  ___/ '__/ _ \| |/ _ \/ __| __|    | |/ _\` | |/ _\` | '_\
 | |   | | | (_) | |  __/ (__| |_     | | (_| | | (_| | | | |
 |_|   |_|  \___/| |\___|\___|\__|    |_|\__,_|_|\__,_|_| |_|
                _/ |
               |__/`;

export const aboutCommand: CommandModule<GlobalArgv, GlobalArgv> = {
  command: 'about',
  describe: 'Display project information',
  handler: async (): Promise<void> => {
    console.log(BANNER);
    console.log();
    console.log(`  version : ${pkg.version}`);
    console.log(`   author : vladislav.kurmaz@gmail.com`);
    console.log(`     site : http://tln.sh`);
    console.log(`   github : https://github.com/project-talan/tln-cli.git`);
    console.log();
  },
};
