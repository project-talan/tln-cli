import { promises as fs } from 'node:fs';
import os from 'node:os';
import path from 'node:path';

export const CONFIG_FILE_NAME = '.tln.tjs';
export const CONFIG_FOLDER_NAME = '.tln';
export const SCRIPT_TEMP_DIR = path.join(os.tmpdir(), 'talan', 'cli');

/**
 * Splits a colon-delimited id list into its parts, e.g. "maven:boost:bootstrap" or
 * "build:test" — used uniformly for both the `commands` and `components` CLI arguments.
 * A single segment may itself be slash-nested (e.g. "parent/child") — resolving that nesting
 * is the responsibility of the (not yet ported) component resolution logic, see
 * old/src/component.js's `resolve()`/`find()` methods and their `component.split('/')` call site.
 */
export function splitIds(ids: string): string[] {
  return ids ? ids.split(':') : [];
}

async function pathExists(target: string): Promise<boolean> {
  try {
    await fs.stat(target);
    return true;
  } catch {
    return false;
  }
}

/** True if `dir` has a .tln.tjs file or a .tln folder. Port of old/src/utils.js's `isConfigPresent`. */
export async function hasConfig(dir: string): Promise<boolean> {
  const [file, folder] = await Promise.all([pathExists(path.join(dir, CONFIG_FILE_NAME)), pathExists(path.join(dir, CONFIG_FOLDER_NAME))]);
  return file || folder;
}

/**
 * True when `p` is the filesystem root relative to `cwd` (used to bound App#init's
 * walk-up search). Direct port of Appl#isRootPath (old/src/appl.js:174-178).
 */
export function isRootPath(cwd: string, p: string): boolean {
  const root = os.platform() === 'win32' ? `${cwd.split(path.sep)[0]}${path.sep}` : path.sep;
  return p === root;
}
