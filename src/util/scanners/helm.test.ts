import { describe, expect, it } from 'vitest';
import { SourceKind } from './types.js';
import { helmConfig } from './helm.js';

describe('helmConfig', () => {
  it('scans helm/helm releases, prefixed with helm@', () => {
    expect(helmConfig.source).toEqual({ kind: SourceKind.GithubReleases, urlSegment: 'helm/helm' });
    expect(helmConfig.relativePath).toBe('helm');
    expect(helmConfig.componentId).toBe('helm');
  });
});
