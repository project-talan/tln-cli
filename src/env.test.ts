import { describe, expect, it, afterEach } from 'vitest';
import { promises as fs } from 'node:fs';
import os from 'node:os';
import path from 'node:path';
import { Env, envVarNameForOption, parseCliOverrides, parseEnv, stringifyOptionValue } from './env.js';
import type { ExecutionContext } from './util/misc.js';

const TEST_EXECUTION_CONTEXT: ExecutionContext = { platform: 'darwin', arch: 'arm64', type: 'Darwin', release: '99.0.0' };

describe('parseEnv', () => {
  it('parses KEY=VALUE entries into an object', () => {
    expect(parseEnv(['FOO=bar', 'BAZ=qux'])).toEqual({ FOO: 'bar', BAZ: 'qux' });
  });

  it('returns an empty object for an empty list', () => {
    expect(parseEnv([])).toEqual({});
  });

  it('defaults the value to an empty string when "=" is missing', () => {
    expect(parseEnv(['FOO'])).toEqual({ FOO: '' });
  });

  it('splits only on the first "=" — extra "=" segments stay part of the value, matching dotenv', () => {
    expect(parseEnv(['FOO=a=b'])).toEqual({ FOO: 'a=b' });
  });

  it('last entry wins when the same key repeats', () => {
    expect(parseEnv(['FOO=one', 'FOO=two'])).toEqual({ FOO: 'two' });
  });

  it('ignores entries with an empty key (e.g. "=value")', () => {
    expect(parseEnv(['=value'])).toEqual({});
  });

  it('treats an entry starting with "#" as a comment and skips it', () => {
    expect(parseEnv(['# a comment', 'FOO=bar', '  # indented comment too'])).toEqual({ FOO: 'bar' });
  });

  it('supports single- and double-quoted values, preserving special characters (including "#") verbatim', () => {
    expect(parseEnv([`FOO='my var with #'`])).toEqual({ FOO: 'my var with #' });
    expect(parseEnv([`FOO="MY VAR with SPECIAL SYmbols &^%$#"`])).toEqual({ FOO: 'MY VAR with SPECIAL SYmbols &^%$#' });
  });

  it('trims whitespace around "=" and around an unquoted value, but keeps internal spaces', () => {
    expect(parseEnv(['FOO = value'])).toEqual({ FOO: 'value' });
    expect(parseEnv([`FOO = 'value with spaces'`])).toEqual({ FOO: 'value with spaces' });
    expect(parseEnv(['FOO = value with spaces and no quotes'])).toEqual({ FOO: 'value with spaces and no quotes' });
  });

  it('cuts an unquoted value off at a trailing "#" comment', () => {
    expect(parseEnv(['FOO = my value with spaces and comment # this is comment'])).toEqual({
      FOO: 'my value with spaces and comment',
    });
  });

  it('does not treat a "#" inside an unquoted value as a comment unless preceded by whitespace', () => {
    expect(parseEnv(['FOO=bar#baz'])).toEqual({ FOO: 'bar#baz' });
  });
});

describe('parseCliOverrides', () => {
  it('pairs a "--key value" token with the following token', () => {
    expect(parseCliOverrides(['--var', 'value'])).toEqual({ var: 'value' });
  });

  it('keeps the dash-separated key as-is — no case/underscore transform, and no spurious camelCase alias', () => {
    expect(parseCliOverrides(['--two-words', 'value'])).toEqual({ 'two-words': 'value' });
  });

  it('supports "--key=value" form', () => {
    expect(parseCliOverrides(['--var=value', '--two-words=value2'])).toEqual({ var: 'value', 'two-words': 'value2' });
  });

  it('parses multiple pairs in sequence', () => {
    expect(parseCliOverrides(['--a', '1', '--b', '2'])).toEqual({ a: '1', b: '2' });
  });

  it('collects a repeated "--key" into a string[], in the order given', () => {
    expect(parseCliOverrides(['--tag', 'a', '--tag', 'b', '--tag', 'c'])).toEqual({ tag: ['a', 'b', 'c'] });
  });

  it('maps a bare trailing flag (no following value) to boolean true', () => {
    expect(parseCliOverrides(['--flag'])).toEqual({ flag: true });
  });

  it('maps "--no-key" to boolean false', () => {
    expect(parseCliOverrides(['--no-flag'])).toEqual({ flag: false });
  });

  it('never auto-coerces a numeric-looking value — it stays the literal string (e.g. leading zeros survive)', () => {
    expect(parseCliOverrides(['--context', '007'])).toEqual({ context: '007' });
  });

  it('drops the positional "_" bucket entirely — every token here is expected to be a "--" flag', () => {
    const result = parseCliOverrides(['--var', 'value']);
    expect(result).not.toHaveProperty('_');
  });

  it('returns an empty object for an empty list', () => {
    expect(parseCliOverrides([])).toEqual({});
  });

  it('freezes the returned object (and any array-valued entry) against mutation', () => {
    const result = parseCliOverrides(['--tag', 'a', '--tag', 'b']);

    expect(Object.isFrozen(result)).toBe(true);
    expect(Object.isFrozen(result.tag)).toBe(true);
  });
});

describe('stringifyOptionValue', () => {
  it('passes a plain string through unchanged', () => {
    expect(stringifyOptionValue('dev01')).toBe('dev01');
  });

  it('joins a string[] with commas', () => {
    expect(stringifyOptionValue(['a', 'b', 'c'])).toBe('a,b,c');
  });

  it('renders a boolean as the literal string "true"/"false"', () => {
    expect(stringifyOptionValue(true)).toBe('true');
    expect(stringifyOptionValue(false)).toBe('false');
  });
});

describe('envVarNameForOption', () => {
  it('upper-cases the key and prefixes it with the upper-cased prefix', () => {
    expect(envVarNameForOption('TPM', 'context')).toBe('TPM_CONTEXT');
  });

  it('replaces every dash in a multi-word key with an underscore', () => {
    expect(envVarNameForOption('TPM', 'two-words')).toBe('TPM_TWO_WORDS');
  });

  it('upper-cases a lowercase prefix too', () => {
    expect(envVarNameForOption('tpm', 'context')).toBe('TPM_CONTEXT');
  });

  it('omits the prefix segment entirely when no prefix is given', () => {
    expect(envVarNameForOption(undefined, 'two-words')).toBe('TWO_WORDS');
  });
});

describe('Env', () => {
  let tempDirs: string[] = [];

  afterEach(async () => {
    await Promise.all(tempDirs.map((dir) => fs.rm(dir, { recursive: true, force: true })));
    tempDirs = [];
  });

  async function makeTempDir(): Promise<string> {
    const dir = await fs.mkdtemp(path.join(os.tmpdir(), 'tln-env-test-'));
    tempDirs.push(dir);
    return dir;
  }

  it('starts empty when constructed with no arguments', () => {
    expect(new Env().toRecord()).toEqual({});
  });

  it('fromProcessEnv reflects the current process environment', () => {
    expect(new Env({ FOO: 'seed' }).toRecord()).toEqual({ FOO: 'seed' });
    const env = Env.fromProcessEnv();
    expect(env.toRecord().PATH).toBe(process.env.PATH);
  });

  it('toRecord returns a fresh copy each time — mutating the result never affects the Env', () => {
    const env = new Env({ FOO: 'bar' });
    const record = env.toRecord();
    record.FOO = 'mutated';
    record.NEW = 'added';

    expect(env.toRecord()).toEqual({ FOO: 'bar' });
  });

  it('merge returns a new Env with the given vars layered on top, leaving the original untouched', () => {
    const original = new Env({ FOO: 'bar' });

    const merged = original.merge({ FOO: 'override', BAZ: 'qux' });

    expect(merged.toRecord()).toEqual({ FOO: 'override', BAZ: 'qux' });
    expect(original.toRecord()).toEqual({ FOO: 'bar' });
  });

  it('mergeDotenvFile parses the file and merges its vars on top, later keys overriding earlier ones', async () => {
    const dir = await makeTempDir();
    await fs.writeFile(path.join(dir, '.env'), 'FOO=from-file\nBAZ=qux\n', 'utf-8');
    const original = new Env({ FOO: 'from-code', KEEP: 'me' });

    const merged = await original.mergeDotenvFile(path.join(dir, '.env'));

    expect(merged.toRecord()).toEqual({ FOO: 'from-file', BAZ: 'qux', KEEP: 'me' });
    expect(original.toRecord()).toEqual({ FOO: 'from-code', KEEP: 'me' });
  });

  it('mergeDotenvFile is a no-op (returns this same Env) when the file does not exist', async () => {
    const dir = await makeTempDir();
    const original = new Env({ FOO: 'bar' });

    const result = await original.mergeDotenvFile(path.join(dir, 'missing.env'));

    expect(result).toBe(original);
  });

  it('mergeEnvFunction runs the function against a mutable draft and returns a new Env built from it', async () => {
    const original = new Env({ FOO: 'bar' });

    const merged = await original.mergeEnvFunction(async (tln, env) => {
      expect(tln).toEqual(TEST_EXECUTION_CONTEXT);
      env.FOO = 'mutated';
      env.NEW = 'added';
    }, TEST_EXECUTION_CONTEXT);

    expect(merged.toRecord()).toEqual({ FOO: 'mutated', NEW: 'added' });
    expect(original.toRecord()).toEqual({ FOO: 'bar' });
  });
});
