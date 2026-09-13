import { afterEach, describe, expect, it, vi } from 'vitest';
import { fetchJson, fetchText } from './http.js';

function fakeResponse(ok: boolean, body: unknown): Response {
  return {
    ok,
    status: ok ? 200 : 404,
    statusText: ok ? 'OK' : 'Not Found',
    json: async () => body,
    text: async () => body as string,
  } as Response;
}

describe('fetchJson', () => {
  afterEach(() => vi.unstubAllGlobals());

  it('returns the parsed body on a 2xx response', async () => {
    vi.stubGlobal('fetch', vi.fn().mockResolvedValue(fakeResponse(true, { a: 1 })));
    expect(await fetchJson('https://example.test')).toEqual({ a: 1 });
  });

  it('throws a descriptive error on a non-2xx response', async () => {
    vi.stubGlobal('fetch', vi.fn().mockResolvedValue(fakeResponse(false, null)));
    await expect(fetchJson('https://example.test')).rejects.toThrow(/Request failed \(404 Not Found\)/);
  });
});

describe('fetchText', () => {
  afterEach(() => vi.unstubAllGlobals());

  it('returns the body text on a 2xx response', async () => {
    vi.stubGlobal('fetch', vi.fn().mockResolvedValue(fakeResponse(true, '<html></html>')));
    expect(await fetchText('https://example.test')).toBe('<html></html>');
  });

  it('throws a descriptive error on a non-2xx response', async () => {
    vi.stubGlobal('fetch', vi.fn().mockResolvedValue(fakeResponse(false, null)));
    await expect(fetchText('https://example.test')).rejects.toThrow(/Request failed \(404 Not Found\)/);
  });
});
