import { describe, expect, it } from 'vitest';
import { githubReleases, githubTags, html, json } from './builder.js';
import { SourceKind } from './types.js';

describe('githubReleases', () => {
  it('builds a github-releases source (urlSegment is the plain owner/repo) and strips/lowercases tag_name by default', () => {
    const config = githubReleases('helm/helm').at('helm').id('helm').build();
    expect(config.source).toEqual({ kind: SourceKind.GithubReleases, urlSegment: 'helm/helm' });
    expect(config.relativePath).toBe('helm');
    expect(config.componentId).toBe('helm');
    expect(config.parse([{ tag_name: 'V1.2.3-RC.1' }])).toEqual(['1.2.3-rc.1']);
  });

  it('lets a custom parse() override the default extraction', () => {
    const config = githubReleases('knative/client')
      .at('k8s/knative')
      .id('knative')
      .parse((releases) => releases.map((r) => `custom-${r.tag_name}`))
      .build();
    expect(config.parse([{ tag_name: 'v1.0.0' }])).toEqual(['custom-v1.0.0']);
  });
});

describe('githubTags', () => {
  it('builds a github-tags source (urlSegment is the plain owner/repo) and strips/lowercases name by default', () => {
    const config = githubTags('aws/aws-cli').at('aws-cli').id('aws-cli').build();
    expect(config.source).toEqual({ kind: SourceKind.GithubTags, urlSegment: 'aws/aws-cli' });
    expect(config.parse([{ name: '2.36.44' }])).toEqual(['2.36.44']);
  });
});

describe('json/html builders', () => {
  it('requires an explicit parse() (no default extraction shape to assume)', () => {
    expect(() => json('https://example.test/x.json').at('x').id('x').build()).toThrow(/parse\(fn\) was never called/);
    expect(() => html('https://example.test/x').at('x').id('x').build()).toThrow(/parse\(fn\) was never called/);
  });

  it('builds json/html sources with urlSegment as the full URL and the given parse()', () => {
    const jsonConfig = json<{ v: string }[]>('https://example.test/x.json')
      .at('x')
      .id('x')
      .parse((raw) => raw.map((e) => e.v))
      .build();
    expect(jsonConfig.source).toEqual({ kind: SourceKind.Json, urlSegment: 'https://example.test/x.json' });
    expect(jsonConfig.parse([{ v: '1.0.0' }])).toEqual(['1.0.0']);

    const htmlConfig = html('https://example.test/x')
      .at('x')
      .id('x')
      .parse((raw) => [raw])
      .build();
    expect(htmlConfig.source).toEqual({ kind: SourceKind.Html, urlSegment: 'https://example.test/x' });
  });
});

describe('build() validation', () => {
  it('requires at(relativePath)', () => {
    expect(() =>
      githubReleases('a/b')
        .id('a')
        .parse(() => [])
        .build(),
    ).toThrow(/at\(relativePath\) was never called/);
  });

  it('requires id(componentId)', () => {
    expect(() =>
      githubReleases('a/b')
        .at('a')
        .parse(() => [])
        .build(),
    ).toThrow(/id\(componentId\) was never called/);
  });
});
