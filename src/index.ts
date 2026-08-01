#!/usr/bin/env node

// Windows workaround: 'Path' (case-insensitive on Windows) must be normalized to 'PATH'
// (Node's process.env is case-sensitive, so code reading process.env.PATH silently
// fails on Windows without this). Ported verbatim from old/cli.js:9-13.
// Note: this is unrelated to the `--` passthrough handling in cli/buildCli.ts; `--`
// itself is passed through unmodified by both cmd.exe (%*) and PowerShell ($args)
// shims — only PowerShell's distinct `--%` token has special parsing behavior, not
// a bare `--`.
if (process.env['Path']) {
  const p = process.env['Path'];
  delete process.env['Path'];
  process.env['PATH'] = p;
}

import { buildCli } from './cli/buildCli.js';

buildCli(process.argv.slice(2), process.cwd())
  .parseAsync()
  .catch((err: unknown) => {
    console.error(err instanceof Error ? err.message : err);
    process.exitCode = 1;
  });
