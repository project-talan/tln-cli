#!/usr/bin/env node
'use strict';

const fs = require('fs');
const findUp = require('find-up')

// workaround for windows Path definition
if (process.env['Path']) {
  const p = process.env['Path'];
  delete process.env['Path'];
  process.env['PATH'] = p;
}

const appl = async (cfgPath, verbose, cwd, cliHome, detach, localRepo, fn) => {
  const a = require('./src/appl').create(cfgPath, verbose, cwd, cliHome, detach, localRepo);
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
/*
Rename
--catalog --repo
--local-repo ???
*/
const configPath = findUp.sync(['.tlnrc'])
const config = configPath ? JSON.parse(fs.readFileSync(configPath)) : {}
const argv = require('yargs')
  .config(config)
  .usage('Multi-component management system\nUsage:\n $0 <step[:step[...]]> [component[:component[:...]]] [options] -- [options]')
  .help('help').alias('help', 'h')
  .option('verbose', { alias: 'v', count: true, default: 0 })
  .option('p', { describe: 'Execute commands for multiple components in parallel', alias: 'parallel', default: false, type: 'boolean' })
  .option('r', { describe: 'Execute commands recursively for all direct child components', alias: 'recursive', default: false, type: 'boolean' })
  .option('a', { describe: 'Show all components', alias: 'all', default: false, type: 'boolean' })
  .option('u', { describe: 'Don\'t do anything, just print generated scripts', alias: 'dry-run', default: false, type: 'boolean' })
  .option('e', { describe: 'Set environment variables', alias: 'env', default: [], type: 'array' })
  .option('d', { describe: 'Max depth level', alias: 'depth', default: 1, type: 'number' })
  .option('fail-on-stderr', { describe: 'Stop execution when script returns an error', default: true, type: 'boolean' })
  .option('parent-first', { describe: 'During recursive execution, parent will be processed first and then nested components', default: false, type: 'boolean' })
  .option('catalog', { describe: 'URL to the external components description', default: [], type: 'array' })
  .option('env-file', { describe: 'Read in a file of environment variables', default: [], type: 'array' })
  .option('local-repo', { describe: 'Shared components will be deployed using this path or project\'s root otherwise, if parameter is not defined', default: null })
  .option('detach', { describe: 'Shared components will be deployed inside tmp folder', default: false, type: 'boolean'  })
  /**************************************************************************/
  .command(
    'config [components]', 'Create tln config in current folder, or clone/pull git repo with shared configuration',
    (yargs) => {
      yargs
        .positional('components', { describe: 'Delimited by colon components, i.e. maven:boost:bootstrap', default: '', type: 'string' })
        .option('repo', { describe: 'Git repository url', default: null, type: 'string' })
        .option('update', { describe: 'Update catalog inside .tln folder', default: false, type: 'boolean' })
        .option('folder', { describe: 'Additional subfolder to extract repository to', default: null, type: 'string' })
        .option('force', { describe: 'Force override config file, if exists', default: false, type: 'boolean' })
        .option('terse', { describe: 'Remove help information from the config', default: false, type: 'boolean' })
        .option('depend', { describe: 'Component to insert into depends list', default: [], type: 'array' })
        .option('inherit', { describe: 'Component to insert into inherits list', default: [], type: 'array' })
        .check(({ repo, update }) => {
          if ( repo && update) {
            throw new Error('repo and update parameters are conflicting. Please use only one: repo or update');
          }
          return true;
        })
    },
    async (argv) => {
      await appl(configPath, argv.verbose, process.cwd(), __dirname, argv.detach, argv.localRepo, async (a) => {
        await a.config(splitComponents(argv.components), {
          envFromCli: parseEnv(argv.env),
          repository: argv.repo,
          update: argv.update,
          folder: argv.folder,
          force: argv.force,
          terse: argv.terse,
          depend: argv.depend,
          inherit: argv.inherit,
        });
      });
    }
  )
  /**************************************************************************/
  .command(
    'dotenv [--upstream=<uint>] [--downstream=<uint>] [--input=<string>] [--output=<string>] [--prefix=<string>]', "Generate dotenv file from templates",
    (yargs) => {
      yargs
      .option('i', { describe: 'Input template name', alias: 'input', default: '.env.template', type: 'string' })
      .option('o', { describe: 'Output template name', alias: 'output', default: '.env', type: 'string' })
      .option('prefix', { describe: 'Prefix for every environment variable name', default: null, type: 'string' })
      .option('upstream', { describe: 'Number of upper layers', default: 0, type: 'number' })
      .option('downstream', { describe: 'Number of upper layers', default: 0, type: 'number' });
    },
    async (argv) => {
      await appl(configPath, argv.verbose, process.cwd(), __dirname, argv.detach, argv.localRepo, async (a) => {
        await a.dotenv(splitComponents(argv.components), {
          envFromCli: parseEnv(argv.env),
          prefixes: (argv.prefix)?([argv.prefix]):([]),
          input: argv.input,
          output: argv.output,
          upstream: argv.upstream,
          downstream: argv.downstream,
          catalogs: argv.catalog
        });
      });
    }
  )
  /**************************************************************************/
  .command(
    'inspect [components] [-j]', 'Display component(s) internal structure',
    (yargs) => {
      yargs
        .positional('components', { describe: 'Delimited by colon components, i.e. maven:boost:bootstrap', default: '', type: 'string' })
        .option('j', { describe: 'Output using json format instead of yaml', alias: 'json', default: false, type: 'boolean' })
    },
    async (argv) => {
      await appl(configPath, argv.verbose, process.cwd(), __dirname, argv.detach, argv.localRepo, async (a) => {
        await a.inspect(splitComponents(argv.components), {
          envFromCli: parseEnv(argv.env),
          outputAsJson: argv.json,
          _: argv._,
          catalogs: argv.catalog
        });
      });
    }
  )
  /**************************************************************************/
  .command(
    'ls [components] [-d depth] [-l] [--parents] [--installed-only]', 'Display components hierarchy',
    (yargs) => {
      yargs
        .positional('components', { describe: 'Delimited by colon components, i.e. maven:boost:bootstrap', default: '', type: 'string' })
        .option('l', { describe: 'Limit of children to show', alias: 'limit', default: 5, type: 'number' })
        .option('parents', { describe: 'Show all component parents', default: false, type: 'boolean' })
        .option('installed-only', { describe: 'Show installed components only', default: false, type: 'boolean' })
    },
    async (argv) => {
      await appl(configPath, argv.verbose, process.cwd(), __dirname, argv.detach, argv.localRepo, async (a) => {
        await a.ls(splitComponents(argv.components), {
          parents: argv.parents,
          depth: argv.depth,
          limit: (argv.all ? -1 : argv.limit),
          installedOnly: argv.installedOnly,
          catalogs: argv.catalog
        });
      });
    }
  )
  /**************************************************************************/
  .command(
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
      const {failOnStderr} = argv;
      await appl(configPath, argv.verbose, process.cwd(), __dirname, argv.detach, argv.localRepo, async (a) => {
        await a.exec(splitComponents(argv.components), argv.parallel, argv.recursive, argv.depth, {
          envFromCli: parseEnv(argv.env),
          dryRun: argv.dryRun,
          failOnStderr,
          command: argv.command,
          input: argv.input,
          _: argv._,
          catalogs: argv.catalog,
          parentFirst: argv.parentFirst
          });
      });
    }
  )
  /**************************************************************************/
  .command(
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
      const {failOnStderr} = argv;
      await appl(configPath, argv.verbose, process.cwd(), __dirname, argv.detach, argv.localRepo, async (a) => {
        await a.run(splitComponents(argv.components), argv.parallel, argv.steps.split(':'), argv.recursive, argv.depth, {
          envFromCli: parseEnv(argv.env),
          save: argv.save,
          dryRun: argv.dryRun,
          failOnStderr,
          depends: argv.depends,
          _: argv._,
          catalogs: argv.catalog,
          parentFirst: argv.parentFirst
        });
      });
    }
  )
  /**************************************************************************/
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
      console.log();
      console.log(String.raw`  version : ${require('./package.json').version}             `);
      console.log(String.raw`   author : vladislav.kurmaz@gmail.com                       `);
      console.log(String.raw`     site : http://tln.sh                                    `);
      console.log(String.raw`   github : https://github.com/project-talan/tln-cli.git     `);
      console.log();
    }
  )
  .argv;
