import { describe, expect, it } from 'vitest';
import { SourceKind } from './types.js';
import { mavenConfig, parseMavenPage } from './maven.js';

describe('mavenConfig', () => {
  it('scans the maven-3 directory listing, prefixed with maven@', () => {
    expect(mavenConfig.source).toEqual({ kind: SourceKind.Html, urlSegment: 'https://archive.apache.org/dist/maven/maven-3/' });
    expect(mavenConfig.relativePath).toBe('maven');
    expect(mavenConfig.componentId).toBe('maven');
  });
});

describe('parseMavenPage', () => {
  it('reads directory-listing anchors starting with a digit, strips the trailing slash', () => {
    const html = `
      <pre>
        <a href="?C=N;O=D">Name</a>
        <a href="/dist/maven/">Parent Directory</a>
        <a href="3.0.4/">3.0.4/</a>
        <a href="3.1.0-alpha-1/">3.1.0-alpha-1/</a>
      </pre>
    `;
    expect(parseMavenPage(html)).toEqual(['3.0.4', '3.1.0-alpha-1']);
  });
});
