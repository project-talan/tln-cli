import { DEFAULT_CONCURRENCY } from '../../config.js';
import { awsCliConfig } from './aws-cli.js';
import { bundletoolConfig } from './bundletool.js';
import { catalogFilePath, runScanner, runWithConcurrency, writeCatalogFile } from './engine.js';
import { gcloudConfig } from './gcloud.js';
import { gradleConfig } from './gradle.js';
import { gruntConfig } from './grunt.js';
import { resolveGithubToken } from './githubToken.js';
import { helmConfig } from './helm.js';
import { javaConfig } from './java.js';
import { knativeConfig } from './knative.js';
import { kubectlConfig } from './kubectl.js';
import { mavenConfig } from './maven.js';
import { nodeConfig } from './node.js';
import { terraformConfig } from './terraform.js';
import type { ScannerConfig, ScanOptions, ScanResult } from './types.js';

export type { ScanOptions, ScanResult } from './types.js';

/** Every catalog component `scan` knows how to refresh. Add a new one by adding one data file (see node.ts/knative.ts/terraform.ts for the three source shapes) and one entry here. */
const registry: ScannerConfig[] = [
  nodeConfig,
  gradleConfig,
  mavenConfig,
  helmConfig,
  gruntConfig,
  javaConfig,
  knativeConfig,
  kubectlConfig,
  terraformConfig,
  awsCliConfig,
  bundletoolConfig,
  gcloudConfig,
];

/**
 * Refreshes the given catalog components — by `componentId` (e.g.
 * `scan(['knative'])`, even though that component's file lives at the relative
 * path `k8s/knative`) — or, when `ids` is `null`, every registered component.
 * This is the only export callers need (see `commands/catalog.ts`): plain
 * component-id strings in, structured results out. Nothing about
 * `ScannerConfig`/`Source`/the builder ever needs to leave this module.
 */
export async function scan(ids: string[] | null, options: ScanOptions): Promise<ScanResult[]> {
  const results: ScanResult[] = [];
  const configs: ScannerConfig[] = [];

  if (ids === null) {
    configs.push(...registry);
  } else {
    const known = registry.map((config) => config.componentId).join(', ');
    for (const id of ids) {
      const config = registry.find((candidate) => candidate.componentId === id);
      if (config) configs.push(config);
      else results.push({ componentId: id, ok: false, error: `unknown catalog component (known: ${known})` });
    }
  }

  const concurrency = options.concurrency ?? DEFAULT_CONCURRENCY;
  const githubToken = await resolveGithubToken(options.githubToken);
  await runWithConcurrency(configs, concurrency, async (config) => {
    const filePath = catalogFilePath(options.catalogHome, config.relativePath);
    try {
      const entries = await runScanner(config, githubToken);
      if (!options.dryRun) await writeCatalogFile(filePath, entries);
      results.push({ componentId: config.componentId, ok: true, count: entries.length, filePath });
    } catch (error) {
      results.push({ componentId: config.componentId, ok: false, error: error instanceof Error ? error.message : String(error) });
    }
  });

  return results;
}
