import { promises as fs } from 'node:fs';
import { GITHUB_TOKEN_FILE } from '../../config.js';

/**
 * Resolves the GitHub token to authenticate scanner requests with, most explicit
 * source first: an explicit value (`tln catalog refresh --github-token ...`),
 * then the `GITHUB_TOKEN` env var, then `GITHUB_TOKEN_FILE` on disk. `undefined`
 * when none of those provide one — requests just go out unauthenticated (a much
 * lower GitHub API rate limit).
 */
export async function resolveGithubToken(explicitToken?: string): Promise<string | undefined> {
  if (explicitToken) return explicitToken;

  const envToken = process.env['GITHUB_TOKEN'];
  if (envToken) return envToken;

  try {
    const fileToken = (await fs.readFile(GITHUB_TOKEN_FILE, 'utf-8')).trim();
    return fileToken || undefined;
  } catch {
    return undefined;
  }
}
