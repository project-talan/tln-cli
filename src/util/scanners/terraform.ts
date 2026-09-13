import * as cheerio from 'cheerio';
import { html } from './builder.js';

/**
 * releases.hashicorp.com/terraform/ lists one `<li><a>` per release, with link text
 * like `terraform_1.16.2` or `terraform_1.17.0-beta1` — everything after the first
 * `_` is the version (which may itself contain a `-` for a pre-release suffix).
 */
export function parseTerraformPage(pageHtml: string): string[] {
  const $ = cheerio.load(pageHtml);
  const versions: string[] = [];
  $('ul > li > a').each((_i, el) => {
    const text = $(el).text().trim();
    const separatorIndex = text.indexOf('_');
    if (separatorIndex === -1) return;
    versions.push(text.slice(separatorIndex + 1));
  });
  return versions;
}

export const terraformConfig = html('https://releases.hashicorp.com/terraform/').at('terraform').id('terraform').parse(parseTerraformPage).build();
