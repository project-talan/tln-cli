import { describe, expect, it } from 'vitest';
import { parseEnv } from './env.js';

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
