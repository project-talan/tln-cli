#!/usr/bin/env node

/*
Add ability to defien external catalog url, something similar to
tln install --repo https://github.com/company/catalog

recursive execution parent first than children or children first than parent
*/
'use strict';

// workaround for windows Path definition
if (process.env['Path']) {
  const p = process.env['Path'];
  delete process.env['Path'];
  process.env['PATH'] = p;
}

const appl = async (verbose, cwd, cliHome, sharedDest, fn) => {
  const a = require('./src/appl').create(verbose, cwd, cliHome, sharedDest);
  await a.init();
  await fn(a);
}
const splitComponents = (components) => {
  return components?components.split(':'):[];
}
const parseEnv = (env) => {
  const obj = {};
  env.map(e => {const kv = e.split('='); obj[kv[0]] = kv[1];});
  return obj;

}

const argv = require('yargs')
  .usage('Multi-component management system\nUsage:\n $0 <step[:step[...]]> [component[:component[:...]]] [options] -- [options]')
  .help('help').alias('help', 'h')
  .option('verbose', { alias: 'v', count: true, default: 0 })
  .option('p', { describe: 'Execute commands for multiple components in parallel', alias: 'parallel', default: false, type: 'boolean' })
  .option('r', { describe: 'Execute commands recursively for all direct child components', alias: 'recursive', default: false, type: 'boolean' })
  .option('a', { describe: 'Show all components', alias: 'all', default: false, type: 'boolean' })
  .option('u', { describe: 'Don\'t do anything, just print generated scripts', alias: 'dry-run', default: false, type: 'boolean' })
  .option('e', { describe: 'Set environment variables', alias: 'env', default: [], type: 'array' })
  .option('env-file', { describe: 'Read in a file of environment variables', default: [], type: 'array' })
  .option('shared-dest', { describe: 'Shared components will be deployed using this path or project\'s root otherwise, if parameter is not defined', default: null })
  .command(
    /**************************************************************************/
    'config', 'Create tln config in current folder, or clone/pull git repo with shared configuration',
    (yargs) => {
      yargs
        .option('repo', { describe: 'Git repository url', alias:'repository', default: null, type: 'string' })
        .option('prefix', { describe: 'Additional subfolder to extract repository to', default: null, type: 'string' })
        .option('force', { describe: 'Force override config file, if exists', default: false, type: 'boolean' })
        .option('terse', { describe: 'Remove help information from the config', default: false, type: 'boolean' })
    },
    async (argv) => {
      await appl(argv.verbose, process.cwd(), __dirname, argv.sharedDest, async (a) => {
        await a.config(splitComponents(argv.components), argv.repo, argv.prefix, argv.force, argv.terse);
      });
    }
  )
  .command(
    /**************************************************************************/
    'inspect [components] [-j]', 'Display component(s) internal structure',
    (yargs) => {
      yargs
        .positional('components', { describe: 'Delimited by colon components, i.e. maven:boost:bootstrap', default: '', type: 'string' })
        .option('j', { describe: 'Output using json format instead of yaml', alias: 'json', default: false, type: 'boolean' })
    },
    async (argv) => {
      await appl(argv.verbose, process.cwd(), __dirname, argv.sharedDest, async (a) => {
        await a.inspect(splitComponents(argv.components), parseEnv(argv.env), argv, argv.json);
      });
    }
  )
  .command(
    /**************************************************************************/
    'ls [components] [-d depth] [-l]', 'Display components hierarchy',
    (yargs) => {
      yargs
        .positional('components', { describe: 'Delimited by colon components, i.e. maven:boost:bootstrap', default: '', type: 'string' })
        .option('d', { describe: 'depth level', alias: 'depth', default: 1, type: 'number' })
        .option('l', { describe: 'depth level', alias: 'limit', default: 5, type: 'number' })
        .option('parents', { describe: 'Show all component parents', default: false, type: 'boolean' })
    },
    async (argv) => {
      await appl(argv.verbose, process.cwd(), __dirname, argv.sharedDest, async (a) => {
        await a.ls(splitComponents(argv.components), argv.parents, argv.depth, (argv.all ? -1 : argv.limit));
      });
    }
  )
  .command(
    /**************************************************************************/
    'exec [components] [-r] [-p] [-c] [-i]', 'Execute specified command or script',
    (yargs) => {
      yargs
        .positional('components', { describe: 'delimited by colon components, i.e. maven:boost:bootstrap', default: '', type: 'string' })
        .option('c', { describe: 'Shell command to execute', alias: 'command', type: 'string' })
        .option('i', { describe: 'Script name to execute', alias: 'input', type: 'string' })
        .conflicts('c', 'i')
        .check(({ command, input }) => {
          if (!(command || input)) {
            throw new Error('command or input option is required');
          }
          return true;
        })
    },
    async (argv) => {
      await appl(argv.verbose, process.cwd(), __dirname, argv.sharedDest, async (a) => {
        await a.exec(splitComponents(argv.components), argv.parallel, argv.recursive, parseEnv(argv.env), argv, argv.dryRun, argv.command, argv.input);
      });
    }
  )
  .command(
    /**************************************************************************/
    ['$0 <steps> [components] [-r] [-p] [-s] [-u] [--depends]'], 'Execute set of steps over a set of components',
    (yargs) => {
      yargs
        .positional('steps', { describe: 'delimited by colon steps, i.e build:test', type: 'string' })
        .positional('components', { describe: 'delimited by colon components, i.e. maven:boost:bootstrap', default: '', type: 'string' })
        .option('s', { describe: 'generate and save scripts inside component folder, otherwise temp folder will be used', alias: 'save', default: false, type: 'boolean' })
        .option('depends', { describe: 'Execute steps for all components from depends list too', default: false, type: 'boolean' })
        .demandOption(['steps'], 'Please provide steps(s) you need to run')
    },
    async (argv) => {
      await appl(argv.verbose, process.cwd(), __dirname, argv.sharedDest, async (a) => {
        await a.run(splitComponents(argv.components), argv.parallel, argv.steps.split(':'), argv.recursive, parseEnv(argv.env), argv, argv.save, argv.dryRun, argv.depends);
      });
    }
  )
  .command(
    'about', 'Dislay project information',
    (yargs) => {
    },
    async (argv) => {
      console.log(String.raw`  _____           _           _     _______    _             `);
      console.log(String.raw` |  __ \         (_)         | |   |__   __|  | |            `);
      console.log(String.raw` | |__) | __ ___  _  ___  ___| |_     | | __ _| | __ _ _ __  `);
      console.log(String.raw` |  ___/ '__/ _ \| |/ _ \/ __| __|    | |/ _' | |/ _' | '_ \ `);
      console.log(String.raw` | |   | | | (_) | |  __/ (__| |_     | | (_| | | (_| | | | |`);
      console.log(String.raw` |_|   |_|  \___/| |\___|\___|\__|    |_|\__,_|_|\__,_|_| |_|`);
      console.log(String.raw`                _/ |                                         `);
      console.log(String.raw`               |__/                                          `);
      console.log(String.raw`  mailto: vladislav.kurmaz@gmail.com                         `);
      console.log(String.raw`  github: https://github.com/project-talan/tln-cli.git       `);
    }
  )
  .argv;
