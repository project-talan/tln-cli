import { describe, expect, it } from 'vitest';
import { SourceKind } from './types.js';
import { parseTerraformPage, terraformConfig } from './terraform.js';

describe('terraformConfig', () => {
  it('scans the terraform releases page, prefixed with terraform@', () => {
    expect(terraformConfig.source).toEqual({ kind: SourceKind.Html, urlSegment: 'https://releases.hashicorp.com/terraform/' });
    expect(terraformConfig.relativePath).toBe('terraform');
    expect(terraformConfig.componentId).toBe('terraform');
  });
});

describe('parseTerraformPage', () => {
  it('extracts the version after the first underscore, pre-releases included', () => {
    const html = `
      <ul>
        <li><a href="/">../</a></li>
        <li><a href="/terraform/1.16.2/">terraform_1.16.2</a></li>
        <li><a href="/terraform/1.17.0-beta1/">terraform_1.17.0-beta1</a></li>
      </ul>
    `;
    expect(parseTerraformPage(html)).toEqual(['1.16.2', '1.17.0-beta1']);
  });
});
