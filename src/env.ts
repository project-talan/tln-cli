import { promises as fs } from 'node:fs';
import { parse as parseDotenv } from 'dotenv';
import yargsParser from 'yargs-parser';
import type { ExecutionContext } from './util/misc.js';

/**
 * Parses one "-e KEY=VALUE" style CLI entry, dotenv-style:
 * - A line that's empty or starts with `#` (after trimming) is a comment — `null`.
 * - Whitespace around `=`, and around an unquoted value, is trimmed.
 * - A single- or double-quoted value keeps everything between the matching quotes
 *   verbatim (including `#` or extra `=` characters) — no trailing-comment stripping.
 * - An unquoted value ends at a `#` that starts the value or is preceded by
 *   whitespace, so `FOO=bar#baz` stays literal but `FOO=bar # comment` doesn't.
 * - No `=` at all means the whole line is the key, with an empty value (matches
 *   plain `-e FOO` usage).
 */
function parseEnvLine(line: string): [string, string] | null {
  const trimmed = line.trim();
  if (!trimmed || trimmed.startsWith('#')) return null;

  const eq = trimmed.indexOf('=');
  if (eq === -1) return [trimmed, ''];

  const key = trimmed.slice(0, eq).trim();
  if (!key) return null;

  const rawValue = trimmed.slice(eq + 1);
  const quote = rawValue.trimStart()[0];
  if (quote === '"' || quote === "'") {
    const afterQuote = rawValue.trimStart().slice(1);
    const closing = afterQuote.indexOf(quote);
    if (closing !== -1) return [key, afterQuote.slice(0, closing)];
  }

  const commentAt = rawValue.search(/(^|\s)#/);
  const value = commentAt === -1 ? rawValue : rawValue.slice(0, commentAt);
  return [key, value.trim()];
}

/**
 * Parses "-e KEY=VALUE" style CLI entries into a flat env-var object — see `parseEnvLine`
 * for the per-entry format. Port of old/cli.js's parseEnv helper.
 */
export function parseEnv(entries: readonly string[]): Record<string, string> {
  const obj: Record<string, string> = {};
  for (const entry of entries) {
    const parsed = parseEnvLine(entry);
    if (parsed) obj[parsed[0]] = parsed[1];
  }
  return obj;
}

/** What one `--key` token after `--` can parse to — see `parseCliOverrides`. */
export type CliOptionValue = string | string[] | boolean;

/** Flat `{ key: value }` map of every `--key`/`--key=value` token after `--` — see `parseCliOverrides`. */
export type CliOverrides = Record<string, CliOptionValue>;

/**
 * Parses the raw tokens captured after a literal `--` (see `GlobalArgv['--']`) using
 * `yargs-parser` — the same engine `yargs` itself uses, so `--key value`, `--key=value`,
 * quoted multi-word values (already a single token by the time the shell hands them to
 * us), a repeated `--key` becoming a `string[]`, and a bare `--key`/`--no-key` becoming a
 * boolean, are all handled the same way the rest of the CLI's own flags are. Number
 * auto-coercion and camelCase aliasing are both turned off — a value like `--context 007`
 * must stay the literal string `'007'`, and `--two-words` must not gain a spurious
 * `twoWords` alias — since a `.tln.tjs` description's `options()` looks entries up by the
 * exact dashed `key` it declares (see `Component#resolveEnv`). Called once, at CLI
 * bootstrap (`build`), and the result is frozen and threaded down the whole component
 * tree unchanged from there.
 */
export function parseCliOverrides(tokens: readonly string[]): CliOverrides {
  const { _, ...rest } = yargsParser(tokens as string[], {
    configuration: { 'parse-numbers': false, 'parse-positional-numbers': false, 'camel-case-expansion': false },
  });
  const options: Record<string, CliOptionValue> = rest;
  for (const value of Object.values(options)) {
    if (Array.isArray(value)) Object.freeze(value);
  }
  return Object.freeze(options);
}

/**
 * Renders one resolved option value as the string an env var needs: a `string[]` (e.g.
 * from a repeated `--key`) joins with `,`; a `boolean` (a bare `--key`/`--no-key`) becomes
 * `'true'`/`'false'`; a plain string passes through as-is. See `Component#resolveEnv`.
 */
export function stringifyOptionValue(value: CliOptionValue): string {
  if (Array.isArray(value)) return value.join(',');
  if (typeof value === 'boolean') return String(value);
  return value;
}

/**
 * Builds the env var name for one `options()` entry: `key` with every `-` replaced by `_`
 * and upper-cased, prefixed with `${prefix}_` (also upper-cased) when a prefix is given —
 * e.g. `envVarNameForOption('TPM', 'two-words')` → `'TPM_TWO_WORDS'`. See
 * `Component#resolveEnv` and `RawComponentDescription.options`.
 */
export function envVarNameForOption(prefix: string | undefined, key: string): string {
  const normalizedKey = key.replace(/-/g, '_').toUpperCase();
  return prefix ? `${prefix.toUpperCase()}_${normalizedKey}` : normalizedKey;
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
