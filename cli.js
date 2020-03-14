#!/usr/bin/env node

'use strict';

const appl = require('./src/appl');

const argv = require('yargs')
  .usage('Multi-component management system\nUsage:\n $0 <step[:step[...]]> [component[:component[:...]]] [options] -- [options]')
  .help('help').alias('help', 'h')
  .option('verbose', { alias: 'v', count: true, default: 0 })
  .option('r', { describe: 'Execute commands recursively for all direct child components', alias: 'recursive', default: false, type: 'boolean' })
  .option('p', { describe: 'Execute commands for multiple components in parallel', alias: 'parallel', default: false, type: 'boolean' })
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
        .option('repo', { describe: 'Git repository url', alias:'repository', default: '', type: 'string' })
        .option('f', { describe: 'Force override config file, if exists', alias: 'force', default: false, type: 'boolean' })
        .option('q', { describe: 'Remove help information from the template', alias: 'quite', default: false, type: 'boolean' })
    },
    async (argv) => {
      const a = appl.create(argv.verbose, process.cwd(), __dirname, argv.sharedDest);
      await a.init();
      await a.config(argv.repository, argv.force, argv.quite);
    }
  )
  .command(
    /**************************************************************************/
    'inspect [components] [-y]', 'Display component internal structure',
    (yargs) => {
    },
    async (argv) => {
      console.log(argv);
    }
  )
  .command(
    /**************************************************************************/
    'ls [components] [-d]', 'Display components hierarchy',
    (yargs) => {
    },
    async (argv) => {
      console.log(argv);
    }
  )
  .command(
    /**************************************************************************/
    'exec [components] [-r] [-p] [-c] [-i]', 'Execute specified command or script',
    (yargs) => {
    },
    async (argv) => {
      console.log(argv);
    }
  )
  .command(
    /**************************************************************************/
    ['$0 <steps> [components] [-r] [-p] [-s] [-l]'], 'Execute set of steps over a set of components',
    (yargs) => {
      yargs
        .positional('steps', { describe: 'delimited by colon steps, i.e build:test', type: 'string' })
        .positional('components', { describe: 'delimited by colon components, i.e. maven:boost:bootstrap', default: '', type: 'string' })
    },
    async (argv) => {
      console.log('run');
      console.log(argv);
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
