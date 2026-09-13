import { githubReleases } from './builder.js';

// Same upstream repo as knative.ts (kubectl tracks Kubernetes' own release cadence) —
// a second, independent fetch of the same GitHub releases list, by design: every
// component is defined uniformly, with no derive-from-a-sibling's-file special case.
// If the duplicate network call ever matters, that's a caching concern to add later,
// not a reason to couple these two components' configs together now.
export const kubectlConfig = githubReleases('kubernetes/kubernetes').at('k8s/kubectl').id('kubectl').build();
