#!/usr/bin/env node


const path = require('path');
// tln2 inspect
// tln2 <set|get> <name> <value> - work with different configuration parameters
// tln2 --home
// tln tree
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
        console.log(String.raw`     _____           _           _     _______    _             `)
        console.log(String.raw`    |  __ \         (_)         | |   |__   __|  | |            `)
        console.log(String.raw`    | |__) | __ ___  _  ___  ___| |_     | | __ _| | __ _ _ __  `)
        console.log(String.raw`    |  ___/ '__/ _ \| |/ _ \/ __| __|    | |/ _' | |/ _' | '_ \ `)
        console.log(String.raw`    | |   | | | (_) | |  __/ (__| |_     | | (_| | | (_| | | | |`)
        console.log(String.raw`    |_|   |_|  \___/| |\___|\___|\__|    |_|\__,_|_|\__,_|_| |_|`)
        console.log(String.raw`                   _/ |                                         `)
        console.log(String.raw`                  |__/                                          `)
        //console.log(String.raw` ¯\_(ツ)_/¯                                                     `)
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
          component.print(function(...args) { console.log.apply(console, args); });
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
            describe: 'execute commands recursively for all direct child component',
            type: 'boolean'
          })
          .option('s', {
            alias: 'save',
            default: false,
            describe: 'generate and save scripts only, don\'t execute',
            type: 'boolean'
          })
      }, (argv) => {
        const logger = require('./src/logger').create(argv.verbose);
        //logger.trace(argv);
        //
        let cwd = process.cwd();
        // find local dev env projects root
        let projectsHome = process.env.PROJECTS_HOME;
        if (!projectsHome) {
          // otherwise use current folder as root
          projectsHome = cwd;
        }
        // build chain of entities from projects home to the current folder
        let folders = [];
        if (cwd.startsWith(projectsHome)) {
          const rel = path.relative(projectsHome, cwd);
          if (rel) {
            folders = rel.split(path.sep);
          }
        } else {
          // running tln outside the projects home - use cwd
          projectsHome = cwd;
        }
        logger.info('projects home:', projectsHome);
        logger.info('cwd:', cwd);
        logger.info('folders:', folders);
        //
        let id = path.basename(projectsHome);
        if (!id) {
          id = '/';
        }
        let root = require('./src/entity').createRoot(projectsHome, id, logger);
        root.loadDescsFromSource(__dirname);
        root.loadDescs();
        //
        let entity = root;
        folders.forEach(function(folder) {
          entity = entity.dive(folder);
        });
        root.dive('docker');
        root.dive('project-talan');
        //
        root.print(function(...args) { logger.trace.apply(logger, args); });
        //logger.trace('root', root);
        //logger.trace('entity', entity);
        if (root && entity) {
        } else {
          logger.fatal('Could\'t create root or/and base entity');
        }
        if (argv.components) {
          // locate components from command line
        } else {
          // use component from current folder
        }
      }
    )
//    .epilog('Vladyslav Kurmaz, mailto:vladislav.kurmaz@gmail.com')
    .argv
;
// console.log(__dirname);
// console.log(__filename);
// console.log(process.cwd());
