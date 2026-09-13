import { describe, expect, it } from 'vitest';
import { SourceKind } from './types.js';
import { awsCliConfig } from './aws-cli.js';

describe('awsCliConfig', () => {
  it('scans aws/aws-cli tags, prefixed with aws-cli@', () => {
    expect(awsCliConfig.source).toEqual({ kind: SourceKind.GithubTags, urlSegment: 'aws/aws-cli' });
    expect(awsCliConfig.relativePath).toBe('aws-cli');
    expect(awsCliConfig.componentId).toBe('aws-cli');
  });
});
