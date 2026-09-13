import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';

const { buildMock } = vi.hoisted(() => ({ buildMock: vi.fn() }));

vi.mock('./util/cli.js', () => ({
  build: buildMock,
}));

describe('index (CLI entrypoint)', () => {
  const originalArgv = process.argv;
  const originalPath = process.env['Path'];
  const originalPATH = process.env['PATH'];
  const originalExitCode = process.exitCode;

  beforeEach(() => {
    vi.resetModules();
    buildMock.mockReset();
    delete process.env['Path'];
  });

  afterEach(() => {
    process.argv = originalArgv;
    if (originalPath === undefined) delete process.env['Path'];
    else process.env['Path'] = originalPath;
    if (originalPATH === undefined) delete process.env['PATH'];
    else process.env['PATH'] = originalPATH;
    process.exitCode = originalExitCode;
    vi.restoreAllMocks();
  });

  async function flush(): Promise<void> {
    await new Promise((resolve) => setImmediate(resolve));
  }

  it('normalizes a Windows-style "Path" env var to "PATH"', async () => {
    delete process.env['PATH'];
    process.env['Path'] = 'C:\\Windows';
    buildMock.mockReturnValue({ parseAsync: vi.fn().mockResolvedValue(undefined) });

    await import('./index.js');
    await flush();

    expect(process.env['Path']).toBeUndefined();
    expect(process.env['PATH']).toBe('C:\\Windows');
  });

  it('leaves PATH untouched when "Path" is not set', async () => {
    process.env['PATH'] = '/usr/bin';
    buildMock.mockReturnValue({ parseAsync: vi.fn().mockResolvedValue(undefined) });

    await import('./index.js');
    await flush();

    expect(process.env['PATH']).toBe('/usr/bin');
  });

  it('calls build() with argv (minus node/script), cwd, catalogHome, and userHome, then parses', async () => {
    const parseAsync = vi.fn().mockResolvedValue(undefined);
    buildMock.mockReturnValue({ parseAsync });
    process.argv = ['/usr/bin/node', '/path/to/tln', 'about'];

    await import('./index.js');
    await flush();

    expect(buildMock).toHaveBeenCalledWith(['about'], process.cwd(), expect.any(String), expect.any(String));
    expect(parseAsync).toHaveBeenCalledTimes(1);
  });

  it('logs the error message and sets exitCode=1 when parseAsync rejects with an Error', async () => {
    buildMock.mockReturnValue({ parseAsync: vi.fn().mockRejectedValue(new Error('boom')) });
    const errorSpy = vi.spyOn(console, 'error').mockImplementation(() => undefined);
    process.exitCode = undefined;

    await import('./index.js');
    await flush();

    expect(errorSpy).toHaveBeenCalledWith('boom');
    expect(process.exitCode).toBe(1);
  });

  it('logs the raw rejection value and sets exitCode=1 when parseAsync rejects with a non-Error', async () => {
    buildMock.mockReturnValue({ parseAsync: vi.fn().mockRejectedValue('raw-failure') });
    const errorSpy = vi.spyOn(console, 'error').mockImplementation(() => undefined);
    process.exitCode = undefined;

    await import('./index.js');
    await flush();

    expect(errorSpy).toHaveBeenCalledWith('raw-failure');
    expect(process.exitCode).toBe(1);
  });
});
