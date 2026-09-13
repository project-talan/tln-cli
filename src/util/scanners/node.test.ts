import { describe, expect, it } from 'vitest';
import { SourceKind } from './types.js';
import { nodeConfig } from './node.js';

describe('nodeConfig', () => {
  it('fetches nodejs.org\'s release index, prefixed with node@', () => {
    expect(nodeConfig.relativePath).toBe('node');
    expect(nodeConfig.componentId).toBe('node');
    expect(nodeConfig.source).toEqual({ kind: SourceKind.Json, urlSegment: 'https://nodejs.org/dist/index.json' });
  });

  it('strips the v prefix from each release', () => {
    const raw = [{ version: 'v20.0.0' }, { version: 'v22.1.0' }];
    expect(nodeConfig.parse(raw)).toEqual(['20.0.0', '22.1.0']);
  });
});
