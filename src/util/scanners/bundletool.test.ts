import { describe, expect, it } from 'vitest';
import { SourceKind } from './types.js';
import { bundletoolConfig } from './bundletool.js';

describe('bundletoolConfig', () => {
  it('scans google/bundletool releases, flat at root, prefixed with bundletool@', () => {
    expect(bundletoolConfig.source).toEqual({ kind: SourceKind.GithubReleases, urlSegment: 'google/bundletool' });
    expect(bundletoolConfig.relativePath).toBe('bundletool');
    expect(bundletoolConfig.componentId).toBe('bundletool');
  });
});
