import { existsSync, readFileSync } from 'node:fs';
import { homedir } from 'node:os';
import { join } from 'node:path';
import { findUpSync } from 'find-up';

export interface TlnConfig {
  [key: string]: unknown;
}

export interface LoadedConfig {
  merged: TlnConfig;
  projectConfigPath: string | undefined;
  homeConfigPath: string | undefined;
}

function readJsonIfExists(path: string | undefined): TlnConfig {
  if (!path) {
    return {};
  }
  return JSON.parse(readFileSync(path, 'utf-8')) as TlnConfig;
}

/**
 * Discovers and merges .tlnrc configuration.
 * Precedence (low -> high): built-in option defaults < home config (~/.tlnrc)
 * < project config (.tlnrc, found by walking up from cwd) < explicit CLI flags.
 * The CLI-flags precedence is enforced natively by yargs' `.config()`, which only
 * ever supplies default values; this function is only responsible for producing
 * the single merged defaults object handed to `.config()`.
 */
export function loadConfig(cwd: string): LoadedConfig {
  const homeConfigCandidate = join(homedir(), '.tlnrc');
  const homeConfigPath = existsSync(homeConfigCandidate) ? homeConfigCandidate : undefined;
  const projectConfigPath = findUpSync(['.tlnrc'], { cwd });

  const homeConfig = readJsonIfExists(homeConfigPath);
  const projectConfig = readJsonIfExists(projectConfigPath);

  // Shallow merge: project overrides home, key-by-key. Sufficient while .tlnrc
  // stays a flat object of scalars/arrays; switch to a deep merge if nested
  // objects are ever introduced.
  const merged: TlnConfig = { ...homeConfig, ...projectConfig };

  return { merged, projectConfigPath, homeConfigPath };
}
