import { describe, expect, it } from 'vitest';
import { SourceKind } from './types.js';
import { kubectlConfig } from './kubectl.js';

describe('kubectlConfig', () => {
  it('scans kubernetes/kubernetes releases, selectable and prefixed via componentId "kubectl", stored under k8s/kubectl', () => {
    expect(kubectlConfig.source).toEqual({ kind: SourceKind.GithubReleases, urlSegment: 'kubernetes/kubernetes' });
    expect(kubectlConfig.relativePath).toBe('k8s/kubectl');
    expect(kubectlConfig.componentId).toBe('kubectl');
  });
});
