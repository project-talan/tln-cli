import { createRequire } from 'node:module';
import { promises as fs } from 'node:fs';
import { execSync } from 'node:child_process';
import { randomUUID } from 'node:crypto';
import os from 'node:os';
import path from 'node:path';

/**
 * Splits a colon-delimited components argument, e.g. "maven:boost:bootstrap", into its parts.
 * A single segment may itself be slash-nested (e.g. "parent/child") — resolving that nesting
 * is the responsibility of the (not yet ported) component resolution logic, see
 * old/src/component.js's `resolve()`/`find()` methods and their `component.split('/')` call site.
 */
export function splitComponents(components: string): string[] {
  return components ? components.split(':') : [];
}

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
  components?: (tln: unknown) => unknown;
}

export interface ComponentDescription extends RawComponentDescription {
  /** Absolute path to the .tln.tjs file this description was loaded from. */
  source: string;
}

/**
 * A single node in the component tree. Construction is cheap and synchronous;
 * `init()` performs the (async) work of loading this component's own .tln.tjs
 * config file and any override configs nested under a .tln folder, merging
 * them onto the descriptions inherited from the parent.
 */
export class Component {
  private static readonly CONFIG_FILE_NAME = '.tln.tjs';
  private static readonly CONFIG_FOLDER_NAME = '.tln';
  private static readonly SCRIPT_TEMP_DIR = path.join(os.tmpdir(), 'talan', 'cli');

  // package.json/.tln.tjs live outside tsconfig's rootDir ("./src"), and .tln.tjs files
  // are CommonJS (`module.exports = {...}`) despite this package being "type": "module" —
  // createRequire gives us a runtime require() that loads them regardless of extension.
  private static readonly requireFromHere = createRequire(import.meta.url);

  readonly parent: Component | null;
  readonly id: string;
  readonly home: string;
  readonly descriptions: ComponentDescription[];
  private readonly children: Component[] = [];

  constructor(parent: Component | null, id: string, home: string, descriptions: ComponentDescription[] = []) {
    this.parent = parent;
    this.id = id;
    this.home = home;
    this.descriptions = [...descriptions];
  }

  async init(): Promise<void> {
    const ownDescription = await Component.loadConfigFile(this.home);
    if (ownDescription) this.descriptions.push(ownDescription);

    const folderDescriptions = await Component.loadConfigFolder(this.home);
    this.descriptions.push(...folderDescriptions);
  }

  /**
   * Returns the child component with the given `id`, building it (at
   * `path.join(this.home, id)`, inheriting this component's descriptions) and
   * caching it on first access. Simplified port of old/src/component.js's
   * `buildChild` — it doesn't resolve dynamically-declared child components
   * from a parent's `components` description field (`getComponentsFromDesc`
   * in the old code); that stays unported, same as the cross-component
   * command reference gap noted in resolveCommandLines below.
   */
  async buildChild(id: string): Promise<Component> {
    const existing = this.children.find((child) => child.id === id);
    if (existing) return existing;

    const child = new Component(this, id, path.join(this.home, id), this.descriptions);
    await child.init();
    this.children.push(child);
    return child;
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
    console.log(scriptPath);
    execSync(scriptPath, { cwd: this.home, stdio: 'inherit', env: process.env });
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
    await fs.mkdir(Component.SCRIPT_TEMP_DIR, { recursive: true });
    const scriptPath = path.join(Component.SCRIPT_TEMP_DIR, `${randomUUID()}.sh`);
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

  /** True if `dir` has a .tln.tjs file or a .tln folder. Port of old/src/utils.js's `isConfigPresent`. */
  static async hasConfig(dir: string): Promise<boolean> {
    const [file, folder] = await Promise.all([
      Component.pathExists(path.join(dir, Component.CONFIG_FILE_NAME)),
      Component.pathExists(path.join(dir, Component.CONFIG_FOLDER_NAME)),
    ]);
    return file || folder;
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
    const filePath = path.join(dir, Component.CONFIG_FILE_NAME);
    if (!(await Component.pathExists(filePath))) return null;
    return Component.requireDescription(filePath);
  }

  private static async loadConfigFolder(dir: string): Promise<ComponentDescription[]> {
    const folderPath = path.join(dir, Component.CONFIG_FOLDER_NAME);
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
 * Creates the root component (id '/', no parent) at `home` and loads its config.
 * Port of old/src/component.js's `createRoot` factory, minus the built-in catalog
 * folder scan (no `source`/catalog-folder concept ported yet).
 */
export async function create(home: string): Promise<Component> {
  const root = new Component(null, '/', home);
  await root.init();
  return root;
}

/** True if `dir` has a .tln.tjs file or a .tln folder. Port of old/src/utils.js's `isConfigPresent`. */
export async function hasConfig(dir: string): Promise<boolean> {
  return Component.hasConfig(dir);
}
