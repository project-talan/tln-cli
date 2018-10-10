#!/usr/bin/env node


// tln2 inspect
// tln2 <set|get> <name> <value> - work with different configuration parameters
// tln2 --home
// tln tree

const argv = require('yargs')
    .usage('Multi-component management system\nUsage:\n $0 <command> [parameters] [options]')
    .help('help').alias('help', 'h')
    .option('verbose', {
      alias: 'v',
      count: true
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
      }
    )
    .command('init [-f]', 'initialize configuration file in current folder',
      (yargs) => {
        yargs
          .option('f', {
            alias: 'force',
            default: false,
            describe: 'force override',
            type: 'boolean'
          })
      },
      (argv) => {
        console.log('init');
        console.log(argv);
      }
    )
    .command('checkout <repo>', 'get configuration from git repository',
      (yargs) => {
        yargs
          .positional('repo', {
            describe: 'git repository url',
            type: 'string'
          })
      },
      (argv) => {
        console.log('checkout');
        console.log(argv);
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
        console.log('exec:');
        console.log(argv);
      }
    )
//    .epilog('Vladyslav Kurmaz, mailto:vladislav.kurmaz@gmail.com')
    .argv
;
console.log(__dirname);
console.log(__filename);
console.log(process.cwd());
