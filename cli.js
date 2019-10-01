#!/usr/bin/env node
'use strict';

const os = require('os');
const path = require('path');
const logger = require('./src/logger');
const context = require('./src/context');
const utils = require('./src/utils');
const filter = require('./src/filter');
const tln = require('./src/tln');
const appl = require('./src/appl');

// workaround for windows Path definition
const cwd = process.cwd();
if (process.env['Path']) {
  const p = process.env['Path'];
  delete process.env['Path'];
  process.env['PATH'] = p;
}

const scope = async(verbose, presetsDest) => {
  const l = logger.create(verbose);
  const f = filter.create(l);
  await f.configure();
  const t = tln.create(l, f);
  const a = appl.create(l, t, process.cwd(), __dirname, presetsDest);
  return {l: l, f: f, t: t, a: a};
}

const argv = require('yargs')
    .usage('Multi-component management system\nUsage:\n $0 <step[:step[...]]> [component[:component[:...]]] [parameters] [options]')
    .help('help').alias('help', 'h')
    .option('verbose', { alias: 'v', count: true, default: 0 })
    .option('r', { describe: 'Execute commands recursively for all direct child components', alias: 'recursive', default: false, type: 'boolean' })
    .option('p', { describe: 'Execute commands for multiple components in parallel', alias: 'parallel', default: false, type: 'boolean' })
    .option('l', { describe: 'validate generated scripts without execution by dumping sources to the console', alias: 'validate', default: false, type: 'boolean' })
    .option('e', { describe: 'Set environment variables', alias: 'env', default: [], type: 'array' })
    .option('env-file', { describe: 'Read in a file of environment variables', default: [], type: 'array' })
    .option('detach-presets', { describe: 'Presets will be deployed using path, defined by this option. Special option for CI configuration', default: null })
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
      'init-config [repo] [-f] [-l]', 'Generate initial configuration file in current folder or checkout git repo with shared configuration',
      (yargs) => {
        yargs
          .option('repo', { describe: 'Git repository url', default: '', type: 'string' })
          .option('f', { describe: 'Force override config file, if exists', alias: 'force', default: false, type: 'boolean' })
          .option('l', { describe: 'Remove help information from the template', alias: 'lightweight', default: false, type: 'boolean' })
      },
      async (argv) => {
        const {/*l, f, t,*/ a} = await scope(argv.verbose, argv.detachPresets);
        a.initComponentConfiguration({repo: argv.repo, force: argv.force, lightweight: argv.lightweight});
      }
    )
    .command(
      'update-config', 'Simply refresh git repository insode .tln foclder with component description',
      (yargs) => {
      },
      async (argv) => {
        const {/*l, f, t,*/ a} = await scope(argv.verbose, argv.detachPresets);
        a.updateComponentConfiguration();
      }
    )
    .command(
      'filter [--pattern]', 'Display current platform definition, which will be used during steps filtering',
      (yargs) => {
        yargs
          .option('pattern', { describe: 'Match pattern will filter baseline', default: null, type: 'string' })
      },
      async (argv) => {
        const {l, f/*, t, a*/} = await scope(argv.verbose, argv.detachPresets);
        l.con(f.filter);
        if (argv.pattern) {
          l.con(argv.pattern, f.validate(argv.pattern)?'match':'not match');
        }
      }
    )
    .command(
      'inspect [components] [-y]', 'Display component internal structure',
      (yargs) => {
        yargs
          .positional('components', { describe: 'Delimited by colon components, i.e. maven:boost:bootstrap', default: '', type: 'string' })
          .option('y', { describe: 'Output using yaml format instead of json', alias: 'yaml', default: false, type: 'boolean' })
      },
      async (argv) => {
        const {/*l,*/ f, /*t,*/ a} = await scope(argv.verbose, argv.detachPresets);
        a.resolve(argv.components).forEach( (component) => {
            const cntx = context.create(argv, utils.parseEnv(argv.env), argv.envFile, false, false);
            component.inspectComponent(f, cntx, argv.yaml, (...args) => { component.logger.con.apply(component.logger, args); });
        });
      }
    )
    .command(
      'ls [components] [-d]', 'Display components hierarchy',
      (yargs) => {
        yargs
          .positional('components', { describe: 'Delimited by colon components, i.e. maven:boost:bootstrap', default: '', type: 'string' })
          .option('d', { describe: 'depth level', alias: 'depth', default: -1, type: 'number' })
      },
      async (argv) => {
        const {/*l, f, t,*/ a} = await scope(argv.verbose, argv.detachPresets);
        a.resolve(argv.components).forEach( (component) => {
            component.print(function(...args) { component.logger.con.apply(component.logger, args); }, argv.depth);
        });
      }
    )
    .command(
      'exec [components] [-r] [-p] [-c] [-i]', 'Execute specified command or script',
      (yargs) => {
        yargs
          .positional('components', { describe: 'delimited by colon components, i.e. maven:boost:bootstrap', default: '', type: 'string' })
          .option('c', { describe: 'Shell command to execute', alias: 'command', type: 'string' })
          .option('i', { describe: 'Script name to execute', alias: 'input', type: 'string' })
          .conflicts('c', 'i')
      }, 
      async (argv) => {
        const {/*l, f, t,*/ a} = await scope(argv.verbose, argv.detachPresets);
        const input = (argv.input)?(path.join(a.currentComponent.home, argv.input)):(argv.input);
        for(const component of a.resolve(argv.components)) {
          const cntx = context.create(argv, utils.parseEnv(argv.env), argv.envFile, false, argv.validate);
          if (argv.parallel) {
            component.execute(argv.command, input, argv.recursive, cntx);
          } else {
            await component.execute(argv.command, input, argv.recursive, cntx);
          }
        }
      }
    )
    // TODO add ability to define additional env files and environment variables
    .command(
      ['$0 <steps> [components] [-r] [-p] [-s] [-l]'], 'execute set of steps over set of components',
      (yargs) => {
        yargs
          .positional('steps', { describe: 'delimited by colon steps, i.e build:test', type: 'string' })
          .positional('components', { describe: 'delimited by colon components, i.e. maven:boost:bootstrap', default: '', type: 'string' })
          .option('s', { describe: 'generate and save scripts inside component folder, otherwise temp folder will be used', alias: 'save', default: false, type: 'boolean' })
          .option('depends', { describe: 'Execute steps for all components from depends list too', default: false, type: 'boolean' })
          .demandOption(['steps'], 'Please provide steps(s) you need to run')
      },
      async (argv) => {
        const {/*l,*/ f, /*t,*/ a} = await scope(argv.verbose, argv.detachPresets);
        for (const component of a.resolve(argv.components)) {
          const cntx = context.create(argv, utils.parseEnv(argv.env), argv.envFile, argv.save, argv.validate);
          const steps = argv.steps.split(':');
          if (argv.parallel) {
            if (argv.depends) {
              component.unfold(steps, f, argv.recursive, cntx);
            } else {
              component.run(steps, f, argv.recursive, cntx);
            }
          } else {
            if (argv.depends) {
              await component.unfold(steps, f, argv.recursive, cntx);
            } else {
              await component.run(steps, f, argv.recursive, cntx);
            }
          }
        }
      }
    )
    .argv;
