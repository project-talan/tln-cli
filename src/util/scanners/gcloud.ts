import * as cheerio from 'cheerio';
import { html } from './builder.js';

/**
 * docs.cloud.google.com/sdk/docs/release-notes (old/update.js pointed at the
 * pre-rename cloud.google.com host, which now just redirects here) renders every
 * section heading — release versions, "Breaking Changes", per-product change logs
 * like "AlloyDB" — as an `<h2 data-text="...">`. There's no reliable container class
 * to scope to any more, so every candidate is returned as-is; the engine's shared
 * version validation drops non-version headings harmlessly.
 */
export function parseGcloudPage(pageHtml: string): string[] {
  const $ = cheerio.load(pageHtml);
  const versions: string[] = [];
  $('h2[data-text]').each((_i, el) => {
    const dataText = $(el).attr('data-text');
    const version = dataText?.split(' ')[0];
    if (version) versions.push(version);
  });
  return versions;
}

export const gcloudConfig = html('https://docs.cloud.google.com/sdk/docs/release-notes').at('gcloud').id('gcloud').parse(parseGcloudPage).build();
