import { describe, expect, it, afterEach } from 'vitest';
import { promises as fs } from 'node:fs';
import os from 'node:os';
import path from 'node:path';
import { Env, parseEnv } from './env.js';
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

  it('keeps only the text up to the first "=" as the value (extra "=" segments are dropped)', () => {
    expect(parseEnv(['FOO=a=b'])).toEqual({ FOO: 'a' });
  });

  it('last entry wins when the same key repeats', () => {
    expect(parseEnv(['FOO=one', 'FOO=two'])).toEqual({ FOO: 'two' });
  });

  it('ignores entries with an empty key (e.g. "=value")', () => {
    expect(parseEnv(['=value'])).toEqual({});
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
