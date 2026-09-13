import { describe, expect, it } from 'vitest';
import { SourceKind } from './types.js';
import { gcloudConfig, parseGcloudPage } from './gcloud.js';

describe('gcloudConfig', () => {
  it('scans the gcloud release-notes page, prefixed with gcloud@', () => {
    expect(gcloudConfig.source).toEqual({ kind: SourceKind.Html, urlSegment: 'https://docs.cloud.google.com/sdk/docs/release-notes' });
    expect(gcloudConfig.relativePath).toBe('gcloud');
    expect(gcloudConfig.componentId).toBe('gcloud');
  });
});

describe('parseGcloudPage', () => {
  it('returns every h2[data-text] heading as a candidate (non-versions are dropped later by the shared version validation)', () => {
    const html = `
      <h2 data-text="584.0.0 (2026-09-09)">584.0.0 (2026-09-09)</h2>
      <h2 data-text="Breaking Changes">Breaking Changes</h2>
      <h2 data-text="583.0.0 (2026-09-01)">583.0.0 (2026-09-01)</h2>
    `;
    expect(parseGcloudPage(html)).toEqual(['584.0.0', 'Breaking', '583.0.0']);
  });
});
