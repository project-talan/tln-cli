import { githubReleases } from './builder.js';
import type { GithubRelease } from './github.js';
import { normalizeTag } from './version.js';

/** knative/client tags look like `knative-v1.23.0` (or plain `v1.23.0`) — take whatever follows the first `-`, if any. */
function parseKnativeReleases(releases: GithubRelease[]): string[] {
  return releases.map((release) => {
    const parts = release.tag_name.split('-');
    return normalizeTag(parts.length > 1 ? parts[1]! : release.tag_name);
  });
}

export const knativeConfig = githubReleases('knative/client').at('k8s/knative').id('knative').parse(parseKnativeReleases).build();
