import { describe, expect, it } from 'vitest';
import { SourceKind } from './types.js';
import { gruntConfig } from './grunt.js';

describe('gruntConfig', () => {
  it('scans gruntjs/grunt releases, prefixed with grunt@', () => {
    expect(gruntConfig.source).toEqual({ kind: SourceKind.GithubReleases, urlSegment: 'gruntjs/grunt' });
    expect(gruntConfig.relativePath).toBe('grunt');
    expect(gruntConfig.componentId).toBe('grunt');
  });
});
