import os from 'node:os';
import path from 'node:path';

/** A folder is a component once it has this file (see `util/misc.ts`'s `hasConfig`). */
export const CONFIG_FILE_NAME = '.tln.tjs';
/** Or this folder of override configs (see `Component#init`, `util/misc.ts`'s `hasConfig`). */
export const CONFIG_FOLDER_NAME = '.tln';
/** Where a component's generated run scripts get written (see `Component#run`). */
export const SCRIPT_TEMP_DIR = path.join(os.tmpdir(), 'talan', 'cli');

/** GitHub REST API base — every catalog scanner's `github-releases`/`github-tags` source expands its `owner/repo` against this (see `util/scanners/engine.ts`). */
export const GITHUB_API = 'https://api.github.com';

/** Last-resort on-disk GitHub token location, checked when neither `--github-token` nor `GITHUB_TOKEN` is set (see `util/scanners/githubToken.ts`) — old/update.js's checked-in `token` file, moved out of the repo into the user's own config dir. */
export const GITHUB_TOKEN_FILE = path.join(os.homedir(), '.talan', 'github-token');

/** Default `ScanOptions.concurrency` when the caller doesn't specify one — also the `tln catalog refresh` CLI's `--concurrency` default (see `commands/catalog.ts`), so the two stay in sync from one definition. */
export const DEFAULT_CONCURRENCY = 4;
