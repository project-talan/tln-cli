import { describe, expect, it } from 'vitest';
import { SourceKind } from './types.js';
import { gradleConfig } from './gradle.js';

describe('gradleConfig', () => {
  it('scans gradle/gradle releases, prefixed with gradle@', () => {
    expect(gradleConfig.source).toEqual({ kind: SourceKind.GithubReleases, urlSegment: 'gradle/gradle' });
    expect(gradleConfig.relativePath).toBe('gradle');
    expect(gradleConfig.componentId).toBe('gradle');
  });
});
