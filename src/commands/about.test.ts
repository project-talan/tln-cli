import { describe, expect, it, vi } from 'vitest';
import { createRequire } from 'node:module';
import { aboutCommand } from './about.js';

const requireFromHere = createRequire(import.meta.url);
const pkg = requireFromHere('../../package.json') as { version: string };

describe('aboutCommand', () => {
  it('is registered as the "about" command', () => {
    expect(aboutCommand.command).toBe('about');
    expect(aboutCommand.describe).toBe('Display project information');
  });

  it('prints the banner and package metadata', async () => {
    const logSpy = vi.spyOn(console, 'log').mockImplementation(() => undefined);

    await aboutCommand.handler!({} as any);

    const lines = logSpy.mock.calls.map((call) => call[0]);
    expect(lines.some((line) => typeof line === 'string' && line.includes('_____'))).toBe(true);
    expect(lines).toContainEqual(`  version : ${pkg.version}`);
    expect(lines).toContainEqual(`   author : vladislav.kurmaz@gmail.com`);
    expect(lines).toContainEqual(`     site : http://tln.sh`);
    expect(lines).toContainEqual(`   github : https://github.com/project-talan/tln-cli.git`);

    logSpy.mockRestore();
  });
});
