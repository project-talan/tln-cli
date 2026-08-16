import { createRequire } from 'node:module';
import { promises as fs } from 'node:fs';
import { execSync } from 'node:child_process';
import { randomUUID } from 'node:crypto';
import path from 'node:path';
import { CONFIG_FILE_NAME, CONFIG_FOLDER_NAME, SCRIPT_TEMP_DIR, cloneExecutionContext, type ExecutionContext } from './util/misc.js';
import type { LsOptions } from './util/options.js';

export interface CommandDescriptor {
  // variant1: an async builder returning bash command lines to execute.
  // variant2: a batch/alias — a list of other command ids to resolve and run in sequence.
  builder: ((tln: ExecutionContext, env: unknown) => unknown) | string[];
  /**
   * Visibility when this command is found somewhere other than the component actually
   * being executed (an ancestor via `parent`, or a component named in `inherits`):
   * - `'private'` — never visible there; only callable when its own component is the
   *   one being executed (i.e. found via the initial self-search).
   * - `'protected'` / `'public'` / unset — visible to any derived component (child,
   *   descendant, or a component that `inherits` this one). See `Component#findAllCommands`.
   */
  access?: 'public' | 'protected' | 'private';
}

export interface RawComponentDescription {
  dotenvs?: (tln: ExecutionContext) => unknown;
  options?: (tln: ExecutionContext, env: unknown) => unknown;
  env?: (tln: ExecutionContext, env: Record<string, string>) => unknown;
  /**
   * Ids of other top-level catalog components (children of the tree's root) whose
   * `protected`/`public` commands become visible to this component too — multiple
   * inheritance by name, independent of the `parent` tree structure (the same idea as
   * C++ multiple inheritance: a base class named here needn't be a structural ancestor).
   * See `Component#findAllCommands`/`resolveInheritedComponents`.
   */
  inherits?: (tln: ExecutionContext) => Promise<string[]> | string[];
  /** Component ids this description depends on. Single-list for now — will grow into a fuller dependencies feature later. */
  depends?: (tln: ExecutionContext) => Promise<string[]> | string[];
  commands?: (tln: ExecutionContext) => Promise<Record<string, CommandDescriptor>> | Record<string, CommandDescriptor>;
  /** Inline-declared child components — see Component#matchingDescriptions. */
  components?: (tln: ExecutionContext) => Promise<ComponentDeclaration[]> | ComponentDeclaration[];
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
  /** Passed (as a fresh clone per call — see `cloneExecutionContext`) as `tln` to every .tln.tjs-defined function. Built once by `App` at construction time and threaded down the whole tree. */
  readonly executionContext: ExecutionContext;
  readonly descriptions: ComponentDescription[];
  private readonly children: Component[] = [];

  constructor(
    parent: Component | null,
    id: string,
    sourcePath: string,
    homePath: string,
    executionContext: ExecutionContext,
    descriptions: ComponentDescription[] = [],
  ) {
    this.parent = parent;
    this.id = id;
    this.sourcePath = sourcePath;
    this.homePath = homePath;
    this.executionContext = executionContext;
    this.descriptions = [...descriptions];
  }

  getUUID(uuid: string = ''): string {
    if (this.parent) {
      const suffix = uuid ? `/${uuid}` : '';
      return this.parent.getUUID(`${this.id}${suffix}`);
    }
    return uuid ? path.posix.join(this.id, uuid) : this.id;
  }

  /** Walks up `parent` to the tree's root (the component with no parent). */
  getRoot(): Component {
    return this.parent ? this.parent.getRoot() : this;
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
    const child = new Component(this, id, path.join(this.sourcePath, id), path.join(this.homePath, id), this.executionContext, seed);
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
    const child = new Component(this, id, location, location, this.executionContext, seed);
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
      const declared = await description.components(cloneExecutionContext(this.executionContext));
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
      const declared = await description.components(cloneExecutionContext(this.executionContext));
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
   * RawComponentDescription's inherits/depends docs), every command available for
   * execution — formatted `"<id>"` for one of this component's own, or
   * `"<id>@<originUUID>"` when it's only reachable via `parent`/`inherits` (see
   * `collectCommands`) — and the final env var set (each description's
   * `env(tln, env)` mutates a shared accumulator in `descriptions` order, so later
   * descriptions can override earlier ones).
   */
  async inspect(): Promise<ComponentInspection> {
    const inherits: string[] = [];
    const depends: string[] = [];
    const env: Record<string, string> = {};

    for (const description of this.descriptions) {
      if (description.inherits) inherits.push(...(await description.inherits(cloneExecutionContext(this.executionContext))));
      if (description.depends) depends.push(...(await description.depends(cloneExecutionContext(this.executionContext))));
      if (description.env) await description.env(cloneExecutionContext(this.executionContext), env);
    }

    const commands = (await this.collectCommands()).map(([commandId, origin]) =>
      origin === this ? commandId : `${commandId}@${origin.getUUID()}`,
    );

    return {
      parent: this.parent ? this.parent.getUUID() : '',
      id: this.id,
      sourcePath: this.sourcePath,
      homePath: this.homePath,
      descriptions: this.descriptions.map((description) => description.source),
      inherits,
      depends,
      commands,
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

  /**
   * Resolves `commandId` to every visible descriptor (see `findAllCommands`) and runs
   * each one's bash command lines in order — ancestors/inherited components first, this
   * component's own last — concatenating the results. This lets a component's own command
   * extend rather than silently shadow a same-named one from `parent`/`inherits`.
   */
  private async resolveCommandLines(commandId: string): Promise<string[]> {
    const descriptors = await this.findAllCommands(commandId);
    if (descriptors.length === 0) {
      throw new Error(`Command "${commandId}" not found in component "${this.id}"`);
    }

    const lines: string[] = [];
    for (const descriptor of descriptors) {
      lines.push(...(await this.resolveDescriptorLines(descriptor)));
    }
    return lines;
  }

  private async resolveDescriptorLines(descriptor: CommandDescriptor): Promise<string[]> {
    if (typeof descriptor.builder === 'function') {
      const result = await descriptor.builder(cloneExecutionContext(this.executionContext), {});
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

  /**
   * Finds every descriptor for `commandId` visible to this component, searching (in
   * order): every component named in this component's own `inherits` lists, and their
   * `inherits`, transitively (C++-style multiple inheritance, independent of the `parent`
   * tree — see `resolveInheritedComponents`); then `parent`, applying this same search
   * there; then every one of this component's own descriptions that defines `commandId`
   * (every access level counts here — a component can always call its own commands,
   * `'private'` included) last, in `descriptions` order (e.g. an inline seed from a
   * parent's `components` list, then any `.tln`-folder overrides, then the component's
   * own `.tln.tjs` — see `init`). A component with more than one description defining
   * the same id (own descriptions, or more than one `inherits`/`parent` branch reaching
   * it) contributes one descriptor per definition, not just the first — so the returned
   * order is outermost-ancestor-first, own-last, ALL definitions included, not just the
   * nearest — see `resolveCommandLines`. Everywhere except the own-search, only
   * `'protected'`/`'public'`/unset commands are visible — `'private'` ones are excluded,
   * since by then this is no longer "the component being executed". `visited` guards
   * against `inherits` cycles (A inherits B inherits A) and against the same origin
   * contributing twice when reachable via more than one path (e.g. a diamond `inherits`).
   */
  private async findAllCommands(commandId: string, allowPrivate = true, visited: Set<Component> = new Set()): Promise<CommandDescriptor[]> {
    if (visited.has(this)) return [];
    visited.add(this);

    const ancestors: CommandDescriptor[] = [];
    for (const inherited of await this.resolveInheritedComponents()) {
      ancestors.push(...(await inherited.findAllCommands(commandId, false, visited)));
    }

    if (this.parent) {
      ancestors.push(...(await this.parent.findAllCommands(commandId, false, visited)));
    }

    const own: CommandDescriptor[] = [];
    for (const description of this.descriptions) {
      if (!description.commands) continue;
      const commands = await description.commands(cloneExecutionContext(this.executionContext));
      const descriptor = commands[commandId];
      if (descriptor && (allowPrivate || descriptor.access !== 'private')) {
        own.push(descriptor);
      }
    }

    return [...ancestors, ...own];
  }

  /**
   * Every command available for execution on this component, paired with the `Component`
   * that actually defines it (itself, for its own commands; otherwise whichever
   * `inherits`-named or `parent` component the search (mirroring `findAllCommands`'s
   * inherits (transitively) → parent → self search, same `'private'`-past-self exclusion,
   * same cycle guard) found it on). Ids are NOT deduplicated at all — a same-named command
   * defined more than once for the same origin (e.g. one from a parent's inline `components`
   * seed and another from that same component's own `.tln.tjs`, or several from different
   * `.tln`-folder descriptions) each get their own entry, same as a same-named command from
   * `this` and from an ancestor/inherited component both being reported — matching
   * `findAllCommands`, which likewise runs every one of them when this id is executed.
   * `visited` still guards against `inherits` cycles and against the same origin
   * contributing twice when reachable via more than one path (e.g. a diamond `inherits`).
   */
  private async collectCommands(allowPrivate = true, visited: Set<Component> = new Set()): Promise<Array<[string, Component]>> {
    const found: Array<[string, Component]> = [];
    if (visited.has(this)) return found;
    visited.add(this);

    for (const description of this.descriptions) {
      if (!description.commands) continue;
      const commands = await description.commands(cloneExecutionContext(this.executionContext));
      for (const [commandId, descriptor] of Object.entries(commands)) {
        if (allowPrivate || descriptor.access !== 'private') {
          found.push([commandId, this]);
        }
      }
    }

    for (const inherited of await this.resolveInheritedComponents()) {
      found.push(...(await inherited.collectCommands(false, visited)));
    }

    if (this.parent) {
      found.push(...(await this.parent.collectCommands(false, visited)));
    }

    return found;
  }

  /**
   * Resolves this component's own `inherits` lists into their target `Component`s —
   * each id is looked up as a child of the tree's root (`getRoot`), i.e. a top-level
   * catalog component, matching how `inherits: async () => ['docker']` names another
   * "base class" by its catalog id rather than by structural position in the tree.
   */
  private async resolveInheritedComponents(): Promise<Component[]> {
    const root = this.getRoot();
    const resolved: Component[] = [];
    for (const description of this.descriptions) {
      if (!description.inherits) continue;
      const ids = await description.inherits(cloneExecutionContext(this.executionContext));
      for (const id of ids) {
        resolved.push(await root.buildChild(id));
      }
    }
    return resolved;
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
export async function create(sourcePath: string, homePath: string, executionContext: ExecutionContext): Promise<Component> {
  const root = new Component(null, '/', sourcePath, homePath, executionContext);
  await root.init();
  return root;
}
