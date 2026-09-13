import { afterEach, describe, expect, it, vi } from 'vitest';
import { isValidVersion, normalizeTag, sortVersionsDescending } from './version.js';

describe('isValidVersion', () => {
  afterEach(() => {
    vi.restoreAllMocks();
  });

  it('accepts semver-ish strings', () => {
    expect(isValidVersion('1.2.3', 'gcloud')).toBe(true);
    expect(isValidVersion('1.2.3-rc.1', 'gcloud')).toBe(true);
  });

  it('rejects and warns on garbage, naming the componentId so the skip can be traced to its scanner', () => {
    const warnSpy = vi.spyOn(console, 'warn').mockImplementation(() => undefined);
    expect(isValidVersion('Breaking Changes', 'gcloud')).toBe(false);
    expect(warnSpy).toHaveBeenCalledWith(expect.stringContaining('gcloud'));
    expect(warnSpy).toHaveBeenCalledWith(expect.stringContaining('Breaking Changes'));
  });
});

describe('sortVersionsDescending', () => {
  it('drops invalid entries and sorts the rest newest-first', () => {
    vi.spyOn(console, 'warn').mockImplementation(() => undefined);
    expect(sortVersionsDescending(['1.2.0', 'not-a-version', '1.10.0', '1.2.0-rc.1'], 'gcloud')).toEqual(['1.10.0', '1.2.0', '1.2.0-rc.1']);
    vi.restoreAllMocks();
  });
});

describe('normalizeTag', () => {
  it('strips a leading v/V and lowercases', () => {
    expect(normalizeTag('v1.2.3')).toBe('1.2.3');
    expect(normalizeTag('V1.2.3')).toBe('1.2.3');
    expect(normalizeTag('9.8.0-RC1')).toBe('9.8.0-rc1');
  });

  it('leaves a tag with no v prefix alone (besides lowercasing)', () => {
    expect(normalizeTag('2.36.44')).toBe('2.36.44');
  });
});
