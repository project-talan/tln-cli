import { createRequire } from 'node:module';
import { promises as fs } from 'node:fs';
import { execSync } from 'node:child_process';
import { randomUUID } from 'node:crypto';
import path from 'node:path';
import { CONFIG_FILE_NAME, CONFIG_FOLDER_NAME, SCRIPT_TEMP_DIR } from './util/misc.js';

export interface CommandDescriptor {
  // variant1: an async builder returning bash command lines to execute.
  // variant2: a batch/alias — a list of other command ids to resolve and run in sequence.
  builder: ((tln: unknown, env: unknown) => unknown) | string[];
  access?: 'public' | 'protected';
}

// There is no ported `tln` context object yet (see old/src/appl.js), so builder
// function parameters are left untyped until that context is designed.
export interface RawComponentDescription {
  dotenvs?: (tln: unknown) => unknown;
  options?: (tln: unknown, env: unknown) => unknown;
  env?: (tln: unknown, env: Record<string, string>) => unknown;
  inherits?: (tln: unknown) => unknown;
  depends?: (tln: unknown) => unknown;
  commands?: (tln: unknown) => Promise<Record<string, CommandDescriptor>> | Record<string, CommandDescriptor>;
  /** Inline-declared child components, keyed by id — see Component#matchingDescriptions. */
  components?: (tln: unknown) => Promise<Record<string, RawComponentDescription>> | Record<string, RawComponentDescription>;
}

export interface ComponentDescription extends RawComponentDescription {
  /** Absolute path to the .tln.tjs file this description was loaded from. */
  source: string;
}

/**
 * A single node in the component tree. `descriptions` is seeded at construction
 * time — either empty (the root, see `create`) or with whatever the parent's own
 * descriptions declare for this child's id (see `matchingDescriptions`) — and then
 * `init()` appends this component's own .tln.tjs config file and any override
 * configs nested under a .tln folder found under `sourcePath`. There is no
 * live parent-chain composition on read; each component's `descriptions` is a
 * plain, fully-formed array once construction + `init()` have run.
 */
export class Component {
  // package.json/.tln.tjs live outside tsconfig's rootDir ("./src"), and .tln.tjs files
  // are CommonJS (`module.exports = {...}`) despite this package being "type": "module" —
  // createRequire gives us a runtime require() that loads them regardless of extension.
  private static readonly requireFromHere = createRequire(import.meta.url);

  readonly parent: Component | null;
  readonly id: string;
  /** Where this component's own .tln.tjs/.tln config is loaded from. */
  readonly sourcePath: string;
  /** Where this component runs commands (execSync's cwd) — its deploy/working location. */
  readonly homePath: string;
  readonly descriptions: ComponentDescription[];
  private readonly children: Component[] = [];

  constructor(parent: Component | null, id: string, sourcePath: string, homePath: string, descriptions: ComponentDescription[] = []) {
    this.parent = parent;
    this.id = id;
    this.sourcePath = sourcePath;
    this.homePath = homePath;
    this.descriptions = [...descriptions];
  }

  async init(): Promise<void> {
    const folderDescriptions = await Component.loadConfigFolder(this.sourcePath);
    this.descriptions.push(...folderDescriptions);

    const ownDescription = await Component.loadConfigFile(this.sourcePath);
    if (ownDescription) this.descriptions.push(ownDescription);
  }

  /**
   * Returns the child component with the given `id`, building it (with
   * `sourcePath`/`homePath` computed by joining this component's own onto `id`,
   * seeded with any of this component's own descriptions that declare `id` as
   * an inline child via `matchingDescriptions`, then layered with its own real
   * .tln.tjs/.tln config via `init()`) and caching it on first access. Port of
   * old/src/component.js's `buildChild`.
   */
  async buildChild(id: string): Promise<Component> {
    const existing = this.children.find((child) => child.id === id);
    if (existing) return existing;

    const seed = await this.matchingDescriptions(id);
    const child = new Component(this, id, path.join(this.sourcePath, id), path.join(this.homePath, id), seed);
    await child.init();
    this.children.push(child);
    return child;
  }

  /**
   * Returns the child component anchored at the real, absolute `location` —
   * `sourcePath` and `homePath` are both set to `location` directly (not
   * joined onto this component's own paths), `id` is `path.basename(location)`,
   * seeded the same way as `buildChild` (matched inline declarations, then its
   * own real config layered on top via `init()`). Used to attach an unrelated
   * real filesystem location (e.g. a project's home directory) onto the tree.
   * Port of old/src/component.js's `createChild`.
   */
  async createChild(location: string): Promise<Component> {
    const id = path.basename(location);
    const existing = this.children.find((child) => child.id === id);
    if (existing) return existing;

    const seed = await this.matchingDescriptions(id);
    const child = new Component(this, id, location, location, seed);
    await child.init();
    this.children.push(child);
    return child;
  }

  /**
   * Scans this component's own descriptions for inline-declared child components
   * (each description's `components` field, keyed by id — see old/src/component.js's
   * `getComponentsFromDesc`) and collects every one that declares `childId`, tagging
   * each with a synthetic `source` that traces back to the declaring description.
   */
  private async matchingDescriptions(childId: string): Promise<ComponentDescription[]> {
    const matches: ComponentDescription[] = [];
    for (const description of this.descriptions) {
      if (!description.components) continue;
      const declared = await description.components(undefined);
      const match = declared[childId];
      if (match) {
        matches.push({ ...match, source: `${description.source}#components/${childId}` });
      }
    }
    return matches;
  }

  /**
   * Finds `commandId` among this component's descriptions, resolves its bash command
   * lines (following string[] batch/alias builders, e.g. `{ builder: ['docker:exec', 'prereq'] }`),
   * and either prints them (dryRun) or writes them to a temp shell script and executes it
   * in this component's home directory.
   */
  async run(commandId: string, dryRun = false): Promise<void> {
    const lines = (await this.resolveCommandLines(commandId)).filter(Boolean);

    if (dryRun) {
      for (const line of lines) console.log(line);
      return;
    }

    const scriptPath = await Component.writeScript(lines);
    console.log(this.id, scriptPath);

    execSync(scriptPath, { cwd: this.homePath, stdio: 'inherit', env: process.env });
  }

  private async resolveCommandLines(commandId: string): Promise<string[]> {
    const descriptor = await this.findCommand(commandId);
    if (!descriptor) {
      throw new Error(`Command "${commandId}" not found in component "${this.id}"`);
    }

    if (typeof descriptor.builder === 'function') {
      const result = await descriptor.builder(undefined, {});
      return Array.isArray(result) ? (result as string[]) : [];
    }

    const lines: string[] = [];
    for (const ref of descriptor.builder) {
      if (ref.includes(':')) {
        // Cross-component command references (e.g. "docker:exec") need the tree
        // resolution logic (resolve()/find()) that isn't ported yet.
        console.warn(`Skipping cross-component command reference "${ref}" (not yet supported)`);
        continue;
      }
      lines.push(...(await this.resolveCommandLines(ref)));
    }
    return lines;
  }

  private async findCommand(commandId: string): Promise<CommandDescriptor | undefined> {
    for (const description of this.descriptions) {
      if (!description.commands) continue;
      const commands = await description.commands(undefined);
      const descriptor = commands[commandId];
      if (descriptor) return descriptor;
    }
    return undefined;
  }

  private static async writeScript(lines: string[]): Promise<string> {
    await fs.mkdir(SCRIPT_TEMP_DIR, { recursive: true });
    const scriptPath = path.join(SCRIPT_TEMP_DIR, `${randomUUID()}.sh`);
    const content = ['#!/usr/bin/env bash', 'set -e', ...lines, ''].join('\n');
    await fs.writeFile(scriptPath, content, { mode: 0o755 });
    return scriptPath;
  }

  private static async pathExists(target: string): Promise<boolean> {
    try {
      await fs.stat(target);
      return true;
    } catch {
      return false;
    }
  }

  private static requireDescription(filePath: string): ComponentDescription {
    let exported: RawComponentDescription;
    try {
      exported = Component.requireFromHere(filePath) as RawComponentDescription;
    } catch (error) {
      throw new Error(`Failed to load component config at ${filePath}`, { cause: error });
    }
    return { ...exported, source: filePath };
  }

  private static async loadConfigFile(dir: string): Promise<ComponentDescription | null> {
    const filePath = path.join(dir, CONFIG_FILE_NAME);
    if (!(await Component.pathExists(filePath))) return null;
    return Component.requireDescription(filePath);
  }

  private static async loadConfigFolder(dir: string): Promise<ComponentDescription[]> {
    const folderPath = path.join(dir, CONFIG_FOLDER_NAME);
    if (!(await Component.pathExists(folderPath))) return [];

    const entries = await fs.readdir(folderPath, { withFileTypes: true });
    const subfolders = entries
      .filter((entry) => entry.isDirectory())
      .map((entry) => entry.name)
      .sort((a, b) => a.localeCompare(b));

    const descriptions: ComponentDescription[] = [];
    for (const name of subfolders) {
      const description = await Component.loadConfigFile(path.join(folderPath, name));
      if (description) descriptions.push(description);
    }
    return descriptions;
  }
}

/**
 * Creates the root component (id '/', no parent) and loads its config from
 * `sourcePath`. Port of old/src/component.js's `createRoot` factory, minus the
 * built-in catalog folder scan (no `source`/catalog-folder concept ported yet).
 */
export async function create(sourcePath: string, homePath: string): Promise<Component> {
  const root = new Component(null, '/', sourcePath, homePath);
  await root.init();
  return root;
}
