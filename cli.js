#!/usr/bin/env node

'use strict';

const os = require('os');
const path = require('path');
// tln2 --home
// tln update - pull externl configurations

const argv = require('yargs')
    .usage('Multi-component management system\nUsage:\n $0 <command> [parameters] [options]')
    .help('help').alias('help', 'h')
    .option('verbose', {
      alias: 'v',
      count: true,
      default: 0
    })
    .command('about', 'dislay project information',
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
      }
    )
    .command('init [repo] [-f]', 'initialize configuration file in current folder or read config from git repo',
      (yargs) => {
        yargs
          .positional('repo', {
            describe: 'git repository url',
            default: '',
            type: 'string'
          })
          .option('f', {
            alias: 'force',
            default: false,
            describe: 'force override',
            type: 'boolean'
          })
      },
      (argv) => {
        const e = require(path.join(process.cwd(), '.tln.conf'));
        console.log(e.steps);
        e.steps.prereq();
      }
    )
    .command('inspect [components]', 'display component internal structure',
      (yargs) => {
        yargs
          .positional('components', {
            describe: 'delimited by colon components, i.e. boost:bootstrap',
            default: '',
            type: 'string'
          })
      },
      (argv) => {
        const logger = require('./src/logger').create(argv.verbose);
        const appl = require('./src/appl').create(logger, __dirname);
        let mark = ''
        appl.resolve(argv.components).forEach(function(component) {
          logger.trace('resolved', component.getId());
          if (mark) console.log(mark);
          mark = '*';
          component.inspect(function(...args) { console.log.apply(console, args); });
        });
      }
    )
    .command('ls [components] [-d]', 'display components hierarchy',
      (yargs) => {
        yargs
          .positional('components', {
            describe: 'delimited by colon components, i.e. boost:bootstrap',
            default: '',
            type: 'string'
          })
          .option('d', {
            alias: 'depth',
            default: -1,
            describe: 'depth level',
            type: 'number'
          })
      },
      (argv) => {
        const logger = require('./src/logger').create(argv.verbose);
        const appl = require('./src/appl').create(logger, __dirname);
        appl.resolve(argv.components).forEach(function(component) {
          logger.trace('resolved', component.getId());
          component.print(function(...args) { console.log.apply(console, args); }, argv.depth);
        });
      }
    )
    .command(
      ['exec <steps> [components] [-r] [-s]', '$0'],
      'execute set of steps over set of components',
      (yargs) => {
        yargs
          .positional('steps', {
            describe: 'delimited by colon steps, i.e build:test',
            type: 'string'
          })
          .positional('components', {
            describe: 'delimited by colon components, i.e. boost:bootstrap',
            default: '',
            type: 'string'
          })
          .option('r', {
            alias: 'recursive',
            default: false,
            describe: 'execute commands recursively for all direct child components',
            type: 'boolean'
          })
          .option('s', {
            alias: 'save',
            default: false,
            describe: 'generate and save scripts inside component folder, otherwise temp folder will be used',
            type: 'boolean'
          })
          .option('k', {
            alias: 'skip',
            default: false,
            describe: 'skip execution, dump scripts to the console',
            type: 'boolean'
          })
      }, (argv) => {
        const logger = require('./src/logger').create(argv.verbose);
        const appl = require('./src/appl').create(logger, __dirname);

        appl.configure()
          .then(async (filter) => {
            for(const component of appl.resolve(argv.components)) {
              await component.execute(argv.steps.split(':'), filter, argv.save, argv.skip);
            }
          });
/*
        appl.configure()
          .then(filter => {
            appl.resolve(argv.components).forEach(function(component) {
              component.execute(argv.steps.split(':'), filter, argv.save, argv.skip);
            });
          });
*/
      }
    )
    .argv
;
