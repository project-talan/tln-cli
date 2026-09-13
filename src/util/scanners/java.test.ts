import { describe, expect, it } from 'vitest';
import { SourceKind } from './types.js';
import { javaConfig, parseJavaPage } from './java.js';

describe('javaConfig', () => {
  it('scans the jdk.java.net archive page, prefixed with java@', () => {
    expect(javaConfig.source).toEqual({ kind: SourceKind.Html, urlSegment: 'https://jdk.java.net/archive/' });
    expect(javaConfig.relativePath).toBe('java');
    expect(javaConfig.componentId).toBe('java');
  });
});

describe('parseJavaPage', () => {
  it('reads only the single-<th> version-heading rows, ignoring per-platform download rows and the non-version "Source" row', () => {
    const html = `
      <table class="builds" summary="Downloads">
        <tr><th>17.0.2 (build 17.0.2+8)</th></tr>
        <tr><th>Windows</th><th>64-bit</th><td><a href="#">zip</a></td></tr>
        <tr><td></td><th><a href="#">Source</a></th><td>Tag jdk-17.0.2-ga</td></tr>
        <tr><th>16.0.1 (build 16.0.1+9)</th></tr>
      </table>
    `;
    expect(parseJavaPage(html)).toEqual(['17.0.2', '16.0.1']);
  });
});
