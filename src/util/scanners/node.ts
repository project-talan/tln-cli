import { json } from './builder.js';
import { normalizeTag } from './version.js';

interface NodeRelease {
  version: string;
}

function parseNodeIndex(releases: NodeRelease[]): string[] {
  return releases.map((release) => normalizeTag(release.version));
}

export const nodeConfig = json<NodeRelease[]>('https://nodejs.org/dist/index.json').at('node').id('node').parse(parseNodeIndex).build();
