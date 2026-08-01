/**
 * Splits a colon-delimited components argument, e.g. "maven:boost:bootstrap", into its parts.
 * A single segment may itself be slash-nested (e.g. "parent/child") — resolving that nesting
 * is the responsibility of the (not yet ported) component resolution logic, see
 * old/src/component.js's `resolve()`/`find()` methods and their `component.split('/')` call site.
 */
export function splitComponents(components: string): string[] {
  return components ? components.split(':') : [];
}
