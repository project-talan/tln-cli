import { createRequire } from 'node:module';
import { promises as fs } from 'node:fs';
import { execSync } from 'node:child_process';
import { randomUUID } from 'node:crypto';
import path from 'node:path';
import { CONFIG_FILE_NAME, CONFIG_FOLDER_NAME, SCRIPT_TEMP_DIR } from './util/misc.js';
import type { LsOptions } from './util/options.js';

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
  /** Component ids this description inherits from. Single-parent for now — will grow into multiple inheritance later. */
  inherits?: (tln: unknown) => Promise<string[]> | string[];
  /** Component ids this description depends on. Single-list for now — will grow into a fuller dependencies feature later. */
  depends?: (tln: unknown) => Promise<string[]> | string[];
  commands?: (tln: unknown) => Promise<Record<string, CommandDescriptor>> | Record<string, CommandDescriptor>;
  /** Inline-declared child components — see Component#matchingDescriptions. */
  components?: (tln: unknown) => Promise<ComponentDeclaration[]> | ComponentDeclaration[];
}

/** One inline-declared child component within a `components` list — its `id` plus its own description fields. */
export interface ComponentDeclaration extends RawComponentDescription {
  id: string;
}

export interface ComponentDescription extends RawComponentDescription {
  /** Absolute path to the .tln.tjs file this description was loaded from. */
  source: string;
}

/** Snapshot of a component's resolved structure, for the `inspect` command. */
export interface ComponentInspection {
  parent: string;
  id: string;
  sourcePath: string;
  homePath: string;
  /** Sources of every description that contributed to this component, in resolution order. */
  descriptions: string[];
  inherits: string[];
  depends: string[];
  commands: string[];
  env: Record<string, string>;
}

/** A node in the tree returned by `Component#ls`, for the `ls` command. */
export interface ComponentLsNode {
  id: string;
  installed: boolean;
  children: ComponentLsNode[];
  /** Count of additional children beyond `limit` that were not included. */
  more: number;
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

  getUUID(uuid: string = ''): string {
    if (this.parent){
      const suffix = uuid ? `/${uuid}` : ''
      return this.parent.getUUID(`${this.id}${suffix}`);
    }
    return `${this.id}${uuid}`;
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
   * (each description's `components` list — see old/src/component.js's
   * `getComponentsFromDesc`) and collects every one that declares `childId`, tagging
   * each with a synthetic `source` that traces back to the declaring description.
   */
  private async matchingDescriptions(childId: string): Promise<ComponentDescription[]> {
    const matches: ComponentDescription[] = [];
    for (const description of this.descriptions) {
      if (!description.components) continue;
      const declared = await description.components(undefined);
      const match = declared.find((component) => component.id === childId);
      if (match) {
        const { id: _id, ...rest } = match;
        matches.push({ ...rest, source: `${description.source}#components/${childId}` });
      }
    }
    return matches;
  }

  /**
   * Collects every id this component could have a child for: already-built (cached)
   * children, ids inline-declared via any of this component's own descriptions'
   * `components` list, and real subfolders found under `sourcePath` (excluding
   * `.git` and the `.tln` override folder). Port of old/src/component.js's
   * `getIDs`/`enumFolders` (minus the never-ported `catalogs` parameter).
   */
  private async discoverChildIds(): Promise<string[]> {
    const ids = new Set<string>();
    for (const child of this.children) ids.add(child.id);
    for (const description of this.descriptions) {
      if (!description.components) continue;
      const declared = await description.components(undefined);
      for (const component of declared) ids.add(component.id);
    }
    try {
      const entries = await fs.readdir(this.sourcePath, { withFileTypes: true });
      for (const entry of entries) {
        if (entry.isDirectory() && entry.name !== '.git' && entry.name !== CONFIG_FOLDER_NAME) ids.add(entry.name);
      }
    } catch {
      // sourcePath doesn't exist — nothing on disk to add.
    }
    return [...ids];
  }

  /**
   * Resolves this component's structure for the `inspect` command: identity/paths,
   * where each contributing description came from, the declared inherits/depends
   * lists (concatenated across descriptions, as-is — no dedup/resolution yet, see
   * RawComponentDescription's inherits/depends docs), every available command id,
   * and the final env var set (each description's `env(tln, env)` mutates a shared
   * accumulator in `descriptions` order, so later descriptions can override earlier ones).
   */
  async inspect(): Promise<ComponentInspection> {
    const inherits: string[] = [];
    const depends: string[] = [];
    const commands = new Set<string>();
    const env: Record<string, string> = {};

    for (const description of this.descriptions) {
      if (description.inherits) inherits.push(...(await description.inherits(undefined)));
      if (description.depends) depends.push(...(await description.depends(undefined)));
      if (description.commands) {
        const resolved = await description.commands(undefined);
        for (const commandId of Object.keys(resolved)) commands.add(commandId);
      }
      if (description.env) await description.env(undefined, env);
    }

    return {
      parent: this.parent ? this.parent.getUUID() : '',
      id: this.id,
      sourcePath: this.sourcePath,
      homePath: this.homePath,
      descriptions: this.descriptions.map((description) => description.source),
      inherits,
      depends,
      commands: [...commands],
      env,
    };
  }

  /**
   * Builds the tree used by the `ls` command: this component (and, when `depth`
   * hasn't been exhausted, up to `limit` of its children, recursively — anything
   * beyond `limit` is counted in `more` instead of included). `installed` is
   * whether `homePath` exists; when `installedOnly` is set, a non-installed
   * component (and its whole subtree) is dropped entirely. When `parents` is set,
   * walks up via `presetChildren` instead, wrapping the already-built node as the
   * sole child at each ancestor level, so the result is the path down to this
   * component rather than a sibling-inclusive subtree. Port of old/src/component.js's
   * `filterComponents`, minus its version-aware sort (via `compareVersions`/`unpackId`)
   * — children are kept in `discoverChildIds`'s discovery order instead (cached
   * children, then declaration order from `components`, then filesystem order for
   * real subfolders), so a `components` list's own ordering is preserved as-is.
   */
  async ls(options: LsOptions, presetChildren: ComponentLsNode[] = []): Promise<ComponentLsNode | null> {
    const installed = await Component.pathExists(this.homePath);
    if (!installed && options.installedOnly) return null;

    const node: ComponentLsNode = { id: this.id, installed, children: [...presetChildren], more: 0 };

    if (options.depth !== 0) {
      const childIds = await this.discoverChildIds();
      let cnt = childIds.length;
      if (options.limit > 0 && options.limit < cnt) cnt = options.limit;
      const nextDepth = options.depth === -1 ? -1 : options.depth - 1;

      for (const childId of childIds) {
        const child = await this.buildChild(childId);
        const childNode = await child.ls({ ...options, parents: false, depth: nextDepth });
        if (childNode) {
          node.children.push(childNode);
          if (node.children.length >= cnt) {
            node.more = childIds.length - node.children.length;
            break;
          }
        }
      }
    }

    if (options.parents && this.parent) {
      return this.parent.ls({ ...options, depth: 0, limit: 0 }, [node]);
    }

    return node;
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
