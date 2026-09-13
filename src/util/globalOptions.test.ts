import { describe, expect, it } from 'vitest';
import { globalOptions } from './globalOptions.js';

describe('globalOptions', () => {
  it('defines verbose as a count option aliased to -v, default 0', () => {
    expect(globalOptions.verbose).toMatchObject({ alias: 'v', count: true, default: 0 });
  });

  it('defines dry-run as a boolean option aliased to -u, default false', () => {
    expect(globalOptions['dry-run']).toMatchObject({ alias: 'u', type: 'boolean', default: false });
  });

  it('defines all as a boolean option aliased to -a, default false', () => {
    expect(globalOptions.all).toMatchObject({ alias: 'a', type: 'boolean', default: false });
  });

  it('defines depth as a number option aliased to -d, default 1', () => {
    expect(globalOptions.depth).toMatchObject({ alias: 'd', type: 'number', default: 1 });
  });

  it('defines parallel and recursive as boolean options defaulting to false', () => {
    expect(globalOptions.parallel).toMatchObject({ alias: 'p', type: 'boolean', default: false });
    expect(globalOptions.recursive).toMatchObject({ alias: 'r', type: 'boolean', default: false });
  });

  it('defines env as a string array option aliased to -e, default []', () => {
    expect(globalOptions.env).toMatchObject({ alias: 'e', type: 'array', string: true });
    expect(globalOptions.env.default).toEqual([]);
  });

  it('defines env-file as a string array option, default []', () => {
    expect(globalOptions['env-file']).toMatchObject({ type: 'array', string: true });
    expect(globalOptions['env-file'].default).toEqual([]);
  });

  it('defines fail-on-stderr as a boolean option defaulting to true', () => {
    expect(globalOptions['fail-on-stderr']).toMatchObject({ type: 'boolean', default: true });
  });
});
