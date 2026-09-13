import { describe, expect, it } from 'vitest';
import { SourceKind } from './types.js';
import { knativeConfig } from './knative.js';

describe('knativeConfig', () => {
  it('scans knative/client releases, nested under k8s/knative, prefixed with knative@', () => {
    expect(knativeConfig.source).toEqual({ kind: SourceKind.GithubReleases, urlSegment: 'knative/client' });
    expect(knativeConfig.relativePath).toBe('k8s/knative');
    expect(knativeConfig.componentId).toBe('knative');
  });

  it("extracts the version from 'knative-v1.2.3'-style tags", () => {
    expect(knativeConfig.parse([{ tag_name: 'knative-v1.23.0' }, { tag_name: 'knative-v1.22.1' }])).toEqual(['1.23.0', '1.22.1']);
  });

  it('falls back to the whole tag when there is no dash', () => {
    expect(knativeConfig.parse([{ tag_name: 'v1.20.0' }])).toEqual(['1.20.0']);
  });
});
