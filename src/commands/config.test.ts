import { beforeEach, describe, expect, it, vi } from 'vitest';
import type { ArgumentsCamelCase } from 'yargs';

const { createAppMock } = vi.hoisted(() => ({ createAppMock: vi.fn() }));

vi.mock('../app.js', () => ({ createApp: createAppMock }));

import { configCommand, type ConfigArgv } from './config.js';
import { baseArgv } from '../test-support/argv.js';

function createFakeYargs() {
  const checks: Array<(argv: unknown) => boolean> = [];
  const fake = {
    positional: vi.fn(() => fake),
    option: vi.fn(() => fake),
    check: vi.fn((fn: (argv: unknown) => boolean) => {
      checks.push(fn);
      return fake;
    }),
  };
  return { fake, checks };
}

describe('configCommand', () => {
  it('is registered as "config [components]"', () => {
    expect(configCommand.command).toBe('config [components]');
  });

  describe('builder validation', () => {
    it('throws when both repo and update are set', () => {
      const { fake, checks } = createFakeYargs();
      (configCommand.builder as (y: unknown) => unknown)(fake);

      expect(() => checks[0]!({ repo: 'https://example.com/x.git', update: true })).toThrow(
        'repo and update parameters are conflicting. Please use only one: repo or update',
      );
    });

    it('passes when only one (or neither) of repo/update is set', () => {
      const { fake, checks } = createFakeYargs();
      (configCommand.builder as (y: unknown) => unknown)(fake);

      expect(checks[0]!({ repo: 'https://example.com/x.git', update: false })).toBe(true);
      expect(checks[0]!({ repo: undefined, update: true })).toBe(true);
      expect(checks[0]!({ repo: undefined, update: false })).toBe(true);
    });
  });

  describe('handler', () => {
    let configMock: ReturnType<typeof vi.fn>;

    beforeEach(() => {
      configMock = vi.fn().mockRejectedValue(new Error('Not implemented: App#config'));
      createAppMock.mockReset();
      createAppMock.mockResolvedValue({ config: configMock });
    });

    it('creates an App and delegates to App#config, propagating its rejection', async () => {
      const argv: ArgumentsCamelCase<ConfigArgv> = {
        ...baseArgv(),
        components: 'maven:boost',
        repo: undefined,
        update: false,
        folder: undefined,
        force: false,
        terse: false,
        depend: ['openjdk'],
        inherit: ['git'],
      };

      await expect(configCommand.handler!(argv)).rejects.toThrow('Not implemented: App#config');

      expect(createAppMock).toHaveBeenCalledWith(argv);
      expect(configMock).toHaveBeenCalledWith(['maven', 'boost'], {
        repo: undefined,
        update: false,
        folder: undefined,
        force: false,
        terse: false,
        depend: ['openjdk'],
        inherit: ['git'],
      });
    });
  });
});
