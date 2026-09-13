import { compareVersions, validate } from 'compare-versions';

/** `true` when `version` is a valid semver-ish string `compareVersions` can sort. Logs (naming `componentId`, so a skipped entry can be traced back to which scanner produced it) and drops anything else, same as old/update.js's `validateVersion`. */
export function isValidVersion(version: string, componentId: string): boolean {
  if (validate(version)) return true;
  console.warn(`[scanners] ${componentId}: skipping version with invalid format: ${version}`);
  return false;
}

/** Filters out invalid versions, then sorts the rest newest-first. */
export function sortVersionsDescending(versions: readonly string[], componentId: string): string[] {
  return versions.filter((version) => isValidVersion(version, componentId)).sort(compareVersions).reverse();
}

/** Strips a leading 'v'/'V' (GitHub tags are typically `v1.2.3`) and lowercases — the common raw-tag shape across this project's GitHub-based scanners. */
export function normalizeTag(tag: string): string {
  const stripped = tag[0] === 'v' || tag[0] === 'V' ? tag.slice(1) : tag;
  return stripped.toLowerCase();
}
