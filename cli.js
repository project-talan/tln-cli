#!/usr/bin/env node

'use strict';

const os = require('os');
const path = require('path');
const fs = require('fs');
const findUp = require('find-up')

// use local config file
const configPath = findUp.sync(['.tlnrc'])
const config = configPath ? JSON.parse(fs.readFileSync(configPath)) : {}
//
const createAppl = async(argv) => {
  const {verbose, detached, destPath, env, envFile} = argv;
  const logger = require('./src/logger').create(verbose);
  // workaround for windows Path definition
  const pEnv = {...process.env};
  if (pEnv['Path']) {
    const p = pEnv['Path'];
    delete pEnv['Path'];
    pEnv['PATH'] = p;
  }
  return await (require('./src/appl').create(logger, require('./src/component'),
    {
      configPath,
      detached,
      destPath,
      env: pEnv, 
      envVars: env,
      envFiles: envFile,
      cwd: process.cwd(),
      tlnHome: __dirname
    }
  ).init());
}

const argv = require('yargs')
  .version()
  .config(config)
  .usage('Component management system\nUsage:\n $0 <command[:command[...]]> [component[:component[:...]]] [options] -- [command-specific-options]')
  .help('help').alias('help', 'h')
  .option('verbose',              { describe: 'Output details mode', alias: 'v', count: true, default: 0 })
  .option('detached',             { describe: 'In detached mode current component will be a root components of hierarchy', default: false, type: 'boolean' })
  .option('dest-path',            { describe: 'In detached mode, pth where all third parties components will be installed', default: null, type: 'string' })
  .option('u',                    { describe: 'Don\'t do anything, just print generated scripts', alias: 'dry-run', default: false, type: 'boolean' })
  .option('e',                    { describe: 'Set environment variable', alias: 'env', default: [], type: 'array' })
  .option('env-file',             { describe: 'Read in a file of environment variables', default: [], type: 'array' })
  .option('a',                    { describe: 'Apply command to all available items', alias: 'all', default: false, type: 'boolean' })
  .option('force',                { describe: 'Force override operation', default: false, type: 'boolean' })
  .option('depend',               { describe: 'Component to insert into depends list', default: [], type: 'array' })
  .option('inherit',              { describe: 'Component to insert into inherits list', default: [], type: 'array' })
  .option('continue-on-stderr',   { describe: 'Continue execution even when script returns an error', default: false, type: 'boolean' })
  /**************************************************************************/
  .command(
    'inspect [components] [-j]', 'Display component(s) internal structure',
    (yargs) => {
      yargs
        .positional('components', { describe: 'delimited by colon components, i.e. maven:kubectl:java', default: '', type: 'string' })
        .option('cmds',           { describe: 'Show available commands for component', default: true, type: 'boolean' })
        .option('env',            { describe: 'Show execution environment for component', default: false, type: 'boolean' })
        .option('graph',          { describe: 'Show hierarchy graphs for component', default: false, type: 'boolean' })
        .option('j',              { describe: 'Output using json format instead of yaml', alias: 'json', default: false, type: 'boolean' })
    },
    async (argv) => {
      const appl = await createAppl(argv);
      //
      const {components, all, cmds, env, graph, json} = argv;
      await appl.inspect(components, {cmds: cmds || all, env: env || all, graph: graph || all, json});
    }
  )
  /**************************************************************************/
  .command(
    'ls [components] [-d depth] [-l] [--parents] [--installed-only]', 'Display components hierarchy',
    (yargs) => {
      yargs
        .positional('components', { describe: 'delimited by colon components, i.e. maven:kubectl:java', default: '', type: 'string' })
        .option('d',              { describe: 'Max depth level', alias: 'depth', default: 1, type: 'number' })
        .option('l',              { describe: 'Limit of children to show', alias: 'limit', default: 5, type: 'number' })
        .option('parents',        { describe: 'Show all component parents', default: false, type: 'boolean' })
        .option('installed-only', { describe: 'Show installed components only', default: false, type: 'boolean' })
    },
    async (argv) => {
      const appl = await createAppl(argv);
      //
      const {components, depth, limit, parents, installedOnly} = argv;
      await appl.ls(components, {depth, limit, parents, installedOnly});
    }
  )
  /**************************************************************************/
  // #233
  .command(
    'get-hierarchy [components] [-d depth] [--parents]', 'Generate onboarding script to configure local dev environment',
    (yargs) => {
      yargs
        .positional('components', { describe: 'delimited by colon components, i.e. maven:kubectl:java', default: '', type: 'string' })
        .option('d',              { describe: 'Max depth level (-1 scan whole hierarchy)', alias: 'depth', default: 1, type: 'number' })
        .option('parents',        { describe: 'Include hierarchy of parent components', default: false, type: 'boolean' })
    },
    async (argv) => {
      const appl = await createAppl(argv);
      //
      const {components, depth, parents} = argv;
      await appl.getHierarchy(components, {depth, parents});
    }
  )
  /**************************************************************************/
  .command(
    ['$0 <commands> [components] [-r] [-p] [-s] [-u] [--depends]'], 'Execute set of commands over a set of components',
    (yargs) => {
      yargs
        .positional('commands',   { describe: 'delimited by colon commands, i.e build:test', type: 'string' })
        .positional('components', { describe: 'delimited by colon components, i.e. maven:kubectl:java', default: '', type: 'string' })
        .option('p',              { describe: 'Execute commands for multiple components in parallel', alias: 'parallel', default: false, type: 'boolean' })
        .option('r',              { describe: 'Execute commands recursively for all direct child components', alias: 'recursive', default: false, type: 'boolean' })
        .option('parent-first',   { describe: 'During recursive execution, parent will be processed first and then nested components', default: false, type: 'boolean' })
        .option('save',           { describe: 'Generate and save scripts inside component folder, otherwise temp folder will be used', default: false, type: 'boolean' })
        .option('catalog',        { describe: 'Execute catalog related commands: create | add | update | ls', default: false, type: 'boolean' })
        .option('name',           { describe: 'Catalog name', default: null, type: 'string' })
        .option('src',            { describe: 'Catalog repository URL', default: null, type: 'string' })
        .option('brief',          { describe: 'Remove help information from .tln catalog file', default: false, type: 'boolean' })
        .option('depends',        { describe: 'Execute commands for all components from depends list too', default: false, type: 'boolean' })
        .check(({ catalog, depends }) => {
          if (depends && catalog) {
            throw new Error('Arguments depends and catalog are mutually exclusive');
          }
          return true;
        })
        .option('c',              { describe: 'Input will be interpreted as explicit shell command', alias: 'command', default: false, type: 'boolean' })
        .option('f',              { describe: 'Script name to execute', alias: 'file', default: false, type: 'boolean' })
        .check(({ command, file }) => {
          if (command && file) {
            throw new Error('Arguments command and file are mutually exclusive');
          }
          return true;
        })
        .demandOption(['commands'], 'Please provide command(s) to execute')
    },
    async (argv) => {
      const appl = await createAppl(argv);
      //
      const {commands, depends, catalog} = argv;
      // execute catalogs specfic commads
      if (catalog) {
        const {name, src, brief} = argv;
        switch (commands) {
          case "create":    await appl.createCatalog(brief); break;
          case "ls":        await appl.lsCatalogs(); break;
          case "add":       await appl.addCatalog(name, src); break;
          case "update":    await appl.updateCatalog(name); break;
          default: appl.logger.error(`'${commands}' was not recognised, available commands are: 'create | add | update | ls'`); break;
        }
      } else {
        const {components, parallel, recursive, parentFirst, dryRun, env, envFile, all, force, depend, inherit, continueOnStderr} = argv;
        const {command, file} = argv;
        await appl.run(commands, components, {parallel, recursive, parentFirst, dryRun, env, envFile, all, force, depend, inherit, continueOnStderr}, command, file);
      }
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
      console.log(String.raw`     site : https://tln.sh                                    `);
      console.log(String.raw`   github : https://github.com/project-talan/tln-cli.git     `);
      console.log();
    }
  )
  .argv;
/*
  .command(
    'dotenv [--upstream=<uint>] [--downstream=<uint>] [--input=<string>] [--output=<string>] [--prefix=<string>]', "Generate dotenv file from templates",
    (yargs) => {
      yargs
      .option('i',                { describe: 'Input template name', alias: 'input', default: '.env.template', type: 'string' })
      .option('o',                { describe: 'Output template name', alias: 'output', default: '.env', type: 'string' })
      .option('prefix',           { describe: 'Prefix for every environment variable name', default: null, type: 'string' })
      .option('upstream',         { describe: 'Number of upper layers', default: 0, type: 'number' })
      .option('downstream',       { describe: 'Number of upper layers', default: 0, type: 'number' });
    },
    async (argv) => {
    }
  )
*/
