#!/usr/bin/env node
'use strict';

const os = require('os');
const path = require('path');

const cwd = process.cwd();
const argv = require('yargs')
    .usage('Multi-component management system\nUsage:\n $0 <step[:step[...]]> [component[:component[:...]]] [parameters] [options]')
    .help('help').alias('help', 'h')
    .option('verbose', { alias: 'v', count: true, default: 0 })
    .option('presets-dest', { describe: 'Presets will be deployed using path, defined by this option', default: null })
    .command(
      'about', 'Dislay project information',
      (yargs) => {
      },
      (argv) => {
        console.log(String.raw`  _____           _           _     _______    _             `)
        console.log(String.raw` |  __ \         (_)         | |   |__   __|  | |            `)
        console.log(String.raw` | |__) | __ ___  _  ___  ___| |_     | | __ _| | __ _ _ __  `)
        console.log(String.raw` |  ___/ '__/ _ \| |/ _ \/ __| __|    | |/ _' | |/ _' | '_ \ `)
        console.log(String.raw` | |   | | | (_) | |  __/ (__| |_     | | (_| | | (_| | | | |`)
        console.log(String.raw` |_|   |_|  \___/| |\___|\___|\__|    |_|\__,_|_|\__,_|_| |_|`)
        console.log(String.raw`                _/ |                                         `)
        console.log(String.raw`               |__/                                          `)
        console.log(String.raw`  mailto: vladislav.kurmaz@gmail.com                         `)
        console.log(String.raw`  github: https://github.com/project-talan/tln-cli.git       `)
      }
    )
    .command(
      'init-conf [repo] [-f] [-l]', 'Generate initial configuration file in current folder or checkout git repo with shared configuration',
      (yargs) => {
        yargs
          .option('repo', { describe: 'Git repository url', default: '', type: 'string' })
          .option('f', { describe: 'Force override config file, if exists', alias: 'force', default: false, type: 'boolean' })
          .option('l', { describe: 'Remove help information from the template', alias: 'lightweight', default: false, type: 'boolean' })
      },
      (argv) => {
        require('./src/appl').create(argv.verbose, cwd, __dirname, argv.presetsDest)
          .initComponentConfiguration({repo: argv.repo, force: argv.force, lightweight: argv.lightweight});
      }
    )
    .command(
      'inspect [components] [-y]', 'Display component internal structure',
      (yargs) => {
        yargs
          .positional('components', { describe: 'Delimited by colon components, i.e. boost:bootstrap', default: '', type: 'string' })
          .option('y', { describe: 'Output using yaml format instead of json', alias: 'yaml', default: false, type: 'boolean' })
      },
      (argv) => {
        require('./src/appl').create(argv.verbose, cwd, __dirname, argv.presetsDest)
          .resolve(argv.components).forEach( (component) => {
            component.inspectComponent({/*filter, */ yaml: argv.yaml}, (...args) => { component.logger.con.apply(component.logger, args); });
          });
      }
    )
    .command(
      'ls [components] [-d]', 'Display components hierarchy',
      (yargs) => {
        yargs
          .positional('components', { describe: 'Delimited by colon components, i.e. boost:bootstrap', default: '', type: 'string' })
          .option('d', { describe: 'depth level', alias: 'depth', default: -1, type: 'number' })
      },
      (argv) => {
        require('./src/appl').create(argv.verbose, cwd, __dirname, argv.presetsDest)
          .resolve(argv.components).forEach( (component) => {
            component.print(function(...args) { component.logger.con.apply(component.logger, args); }, argv.depth);
          });
      }
    )
    .command(
      'exec [components] [-r] [-c] [-i]', 'Execute specified command or script',
      (yargs) => {
        yargs
          .positional('components', { describe: 'delimited by colon components, i.e. boost:bootstrap', default: '', type: 'string' })
          .option('r', { describe: 'execute commands recursively for all direct child components', alias: 'recursive', default: false, type: 'boolean' })
          .option('c', { describe: 'define shell command to execute', alias: 'command', type: 'string' })
          .option('i', { describe: 'define input script to execute', alias: 'input', type: 'string' })
          .conflicts('c', 'i')
      }, (argv) => {
        const appl = require('./src/appl').create(argv.verbose, cwd, __dirname, argv.presetsDest);
        appl.resolve(argv.components).forEach( async (component) => {
            let input = argv.input;
            if (input) {
              input = path.join(appl.currentComponent.home, argv.input);
            }
            await component.execute(argv.command, input, argv.recursive);
          });
      }
    )
    // TODO add ability to define additional env files and environment variables
    .command(
      ['$0', '<steps> [components] [-r] [-p] [-s] [-l]'], 'execute set of steps over set of components',
    (yargs) => {
        yargs
          .positional('steps', { describe: 'delimited by colon steps, i.e build:test', type: 'string' })
          .positional('components', { describe: 'delimited by colon components, i.e. boost:bootstrap', default: '', type: 'string' })
          .option('r', { describe: 'execute commands recursively for all direct child components', alias: 'recursive', default: false, type: 'boolean' })
          .option('p', { describe: 'execute commands for multiple components in parallel', alias: 'parallel', default: false, type: 'boolean' })
          .option('s', { describe: 'generate and save scripts inside component folder, otherwise temp folder will be used', alias: 'save', default: false, type: 'boolean' })
          .option('l', { describe: 'validate generated scripts without execution by dumping sources to the console', alias: 'validate', default: false, type: 'boolean' })
          .demandOption(['steps'], 'Please provide steps(s) you need to run')
        }, (argv) => {
        console.log('default');
        /*
        const logger = require('./src/logger').create(argv.verbose);
        const appl = require('./src/appl').create(logger, __dirname);
        const parameters = require('./src/parameters');
        //
        appl.configure()
          .then(async (filter) => {
            for(const component of appl.resolve(argv.components)) {
              await component.execute(argv.steps.split(':'), filter, argv.recursive, argv.parallel, parameters.create("", argv.save, argv.validate, argv, [], []));
            }
          });
        */
      }
    )
    .argv;
