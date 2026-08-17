import { promises as fs } from 'node:fs';
import { parse as parseDotenv } from 'dotenv';
import type { ExecutionContext } from './util/misc.js';

/**
 * Parses "-e KEY=VALUE" style CLI entries into a flat env-var object.
 * Port of old/cli.js's parseEnv helper.
 */
export function parseEnv(entries: readonly string[]): Record<string, string> {
  const obj: Record<string, string> = {};
  for (const entry of entries) {
    const [key, value] = entry.split('=');
    if (key) {
      obj[key] = value ?? '';
    }
  }
  return obj;
}

/**
 * An immutable snapshot of environment variables. Every "mutating" operation (`merge`,
 * `mergeDotenvFile`, `mergeEnvFunction`) returns a brand-new `Env` instead of changing
 * this one in place, so a reference to an `Env` can be handed out and merged from
 * repeatedly (e.g. by sibling components sharing the same ancestor) without one caller's
 * merge affecting another's. `toRecord()` likewise always returns a fresh plain object,
 * never the instance's own internal storage, so a caller that mutates the returned
 * record (as `.tln.tjs`'s `env(tln, env)` convention does) can't corrupt this `Env`.
 */
export class Env {
  private readonly vars: Record<string, string>;

  constructor(vars: Record<string, string> = {}) {
    this.vars = { ...vars };
  }

  /** Builds the initial `Env` from the current process's environment (`undefined` values dropped). */
  static fromProcessEnv(): Env {
    const vars: Record<string, string> = {};
    for (const [key, value] of Object.entries(process.env)) {
      if (value !== undefined) vars[key] = value;
    }
    return new Env(vars);
  }

  /** Returns a new `Env` with `vars` merged on top of this one (matching keys are overridden). */
  merge(vars: Record<string, string>): Env {
    return new Env({ ...this.vars, ...vars });
  }

  /** Returns a new `Env` with the parsed contents of the dotenv file at `filePath` merged on top. A missing file is a no-op (returns this same `Env`). */
  async mergeDotenvFile(filePath: string): Promise<Env> {
    let content: string;
    try {
      content = await fs.readFile(filePath, 'utf-8');
    } catch {
      return this;
    }
    return this.merge(parseDotenv(content));
  }

  /**
   * Calls a `.tln.tjs`-defined `env(tln, env)` function against a mutable plain-object
   * clone of this `Env`'s vars (matching its established mutation convention — see
   * `RawComponentDescription.env`) and returns a new `Env` built from the result.
   */
  async mergeEnvFunction(fn: (tln: ExecutionContext, env: Record<string, string>) => unknown, tln: ExecutionContext): Promise<Env> {
    const draft = this.toRecord();
    await fn(tln, draft);
    return new Env(draft);
  }

  /** A fresh, independent plain-object copy of this `Env`'s vars. */
  toRecord(): Record<string, string> {
    return { ...this.vars };
  }
}
