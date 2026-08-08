#!/usr/bin/env node

// Windows workaround: 'Path' (case-insensitive on Windows) must be normalized to 'PATH'
// (Node's process.env is case-sensitive, so code reading process.env.PATH silently
// fails on Windows without this).
if (process.env['Path']) {
  const p = process.env['Path'];
  delete process.env['Path'];
  process.env['PATH'] = p;
}

import { fileURLToPath } from 'url';
import { dirname } from 'path';
import { build } from './util/cli.js';

build(process.argv.slice(2), process.cwd(), dirname(fileURLToPath(import.meta.url)))
  .parseAsync()
  .catch((err: unknown) => {
    console.error(err instanceof Error ? err.message : err);
    process.exitCode = 1;
  });
