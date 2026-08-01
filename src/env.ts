/**
 * Parses "-e KEY=VALUE" style CLI entries into a flat env-var object.
 * Port of old/cli.js's parseEnv helper.
 */
export function parseEnv(entries: readonly string[]): Record<string, string> {
  const obj: Record<string, string> = {};
  for (const entry of entries) {
    const [key, value] = entry.split('=');
    if (key) {
      obj[key] = value ?? '';
    }
  }
  return obj;
}
