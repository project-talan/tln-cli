import { afterEach, describe, expect, it, vi } from 'vitest';

const { runScannerMock, writeCatalogFileMock, catalogFilePathMock, runWithConcurrencyMock } = vi.hoisted(() => ({
  runScannerMock: vi.fn(),
  writeCatalogFileMock: vi.fn(),
  catalogFilePathMock: vi.fn((catalogHome: string, relativePath: string) => `${catalogHome}/${relativePath}/components.cjs`),
  runWithConcurrencyMock: vi.fn(async (items: unknown[], _limit: number, task: (item: unknown) => Promise<void>) => {
    for (const item of items) await task(item);
  }),
}));
vi.mock('./engine.js', () => ({
  runScanner: runScannerMock,
  writeCatalogFile: writeCatalogFileMock,
  catalogFilePath: catalogFilePathMock,
  runWithConcurrency: runWithConcurrencyMock,
}));

import { scan } from './index.js';

const KNOWN_COMPONENT_IDS = ['node', 'gradle', 'maven', 'helm', 'grunt', 'java', 'knative', 'kubectl', 'terraform', 'aws-cli', 'bundletool', 'gcloud'];

describe('scan', () => {
  afterEach(() => vi.clearAllMocks());

  it('scans every registered component when ids is null', async () => {
    runScannerMock.mockResolvedValue([{ id: 'x' }]);

    const results = await scan(null, { catalogHome: '/catalog' });

    expect(results).toHaveLength(KNOWN_COMPONENT_IDS.length);
    expect(results.every((r) => r.ok)).toBe(true);
    expect(runScannerMock).toHaveBeenCalledTimes(KNOWN_COMPONENT_IDS.length);
  });

  it('scans only the requested ids and reports an error for an unknown one, without calling the engine for it', async () => {
    runScannerMock.mockResolvedValue([{ id: 'helm@1.0.0' }]);

    const results = await scan(['helm', 'bogus'], { catalogHome: '/catalog' });

    expect(runScannerMock).toHaveBeenCalledTimes(1);
    const helmResult = results.find((r) => r.componentId === 'helm');
    const bogusResult = results.find((r) => r.componentId === 'bogus');
    expect(helmResult).toMatchObject({ ok: true, count: 1 });
    expect(bogusResult).toMatchObject({ ok: false });
    expect(bogusResult && !bogusResult.ok && bogusResult.error).toMatch(/unknown catalog component/);
  });

  it('resolves by componentId, not by relativePath (e.g. knative lives at k8s/knative)', async () => {
    runScannerMock.mockResolvedValue([{ id: 'knative@1.0.0' }]);

    const results = await scan(['knative'], { catalogHome: '/catalog' });

    expect(runScannerMock).toHaveBeenCalledTimes(1);
    expect(results[0]).toMatchObject({ componentId: 'knative', ok: true });
    expect(writeCatalogFileMock).toHaveBeenCalledWith('/catalog/k8s/knative/components.cjs', [{ id: 'knative@1.0.0' }]);
  });

  it('writes the file on success when dryRun is not set', async () => {
    runScannerMock.mockResolvedValue([{ id: 'helm@1.0.0' }]);

    await scan(['helm'], { catalogHome: '/catalog' });

    expect(writeCatalogFileMock).toHaveBeenCalledWith('/catalog/helm/components.cjs', [{ id: 'helm@1.0.0' }]);
  });

  it('does not write the file when dryRun is set, but still reports the count', async () => {
    runScannerMock.mockResolvedValue([{ id: 'helm@1.0.0' }]);

    const results = await scan(['helm'], { catalogHome: '/catalog', dryRun: true });

    expect(writeCatalogFileMock).not.toHaveBeenCalled();
    expect(results[0]).toMatchObject({ ok: true, count: 1, filePath: '/catalog/helm/components.cjs' });
  });

  it('isolates a failing component: reports its error without touching the others', async () => {
    runScannerMock.mockImplementation(async (config: { componentId: string }) => {
      if (config.componentId === 'helm') throw new Error('boom');
      return [{ id: 'x' }];
    });

    const results = await scan(['helm', 'node'], { catalogHome: '/catalog' });

    const helmResult = results.find((r) => r.componentId === 'helm');
    const nodeResult = results.find((r) => r.componentId === 'node');
    expect(helmResult).toMatchObject({ ok: false, error: 'boom' });
    expect(nodeResult).toMatchObject({ ok: true });
  });

  it('passes the requested concurrency through to the scheduler', async () => {
    runScannerMock.mockResolvedValue([]);

    await scan(['helm'], { catalogHome: '/catalog', concurrency: 7 });

    expect(runWithConcurrencyMock).toHaveBeenCalledWith(expect.any(Array), 7, expect.any(Function));
  });
});
