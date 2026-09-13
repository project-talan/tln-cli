import * as cheerio from 'cheerio';
import { html } from './builder.js';

/** archive.apache.org's Apache-style directory listing: one `<pre> <a>` per subfolder, e.g. `3.9.9/`. */
export function parseMavenPage(pageHtml: string): string[] {
  const $ = cheerio.load(pageHtml);
  const versions: string[] = [];
  $('pre > a').each((_i, el) => {
    const text = $(el).text().trim();
    if (/^\d/.test(text)) versions.push(text.replace(/\/$/, ''));
  });
  return versions;
}

export const mavenConfig = html('https://archive.apache.org/dist/maven/maven-3/').at('maven').id('maven').parse(parseMavenPage).build();
