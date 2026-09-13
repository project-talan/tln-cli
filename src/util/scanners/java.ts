import * as cheerio from 'cheerio';
import { html } from './builder.js';

/**
 * jdk.java.net/archive/ lists OpenJDK builds as a table where each version's row
 * has exactly one `<th>` (e.g. "26.0.2 (build 26.0.2+10)"), followed by one `<tr>`
 * per platform download (two `<th>`s + a `<td>`) and a lone-`<th>` "Source" row.
 * Only the version-heading rows are relevant here — the per-platform download
 * links belong to the separate, not-yet-ported install/download feature
 * (`old/src/utils.js`'s `getDownloadScript`).
 */
export function parseJavaPage(pageHtml: string): string[] {
  const $ = cheerio.load(pageHtml);
  const versions: string[] = [];
  $('table.builds tr').each((_i, row) => {
    const headers = $(row).find('th');
    if (headers.length !== 1) return;
    const heading = headers.first().text().trim();
    const version = heading.split(' ')[0];
    if (version && /^\d/.test(version)) versions.push(version);
  });
  return versions;
}

export const javaConfig = html('https://jdk.java.net/archive/').at('java').id('java').parse(parseJavaPage).build();
