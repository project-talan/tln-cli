import { promises as fs } from 'node:fs';
import os from 'node:os';
import path from 'node:path';
import { Component, create, hasConfig } from './component.js';
import type { GlobalArgv } from './util/globalOptions.js';

export interface ConfigOptions {
  repo: string | undefined;
  update: boolean;
  folder: string | undefined;
  force: boolean;
  terse: boolean;
  depend: string[];
  inherit: string[];
}

export interface InspectOptions {
  json: boolean;
}

export interface LsOptions {
  limit: number;
  parents: boolean;
  installedOnly: boolean;
}

export interface ExecOptions {
  command: string | undefined;
  input: string | undefined;
}

/**
 * Orchestrates a single `tln` invocation: resolves the project's `home` (walking
 * up from `cwd` to the topmost folder with a `.tln.tjs`/`.tln` config), builds the
 * component tree from `home` down to `cwd`, and dispatches every top-level command
 * onto the components resolved from CLI arguments. Port of old/src/appl.js's `Appl`.
 *
 * Detached mode (--detach/--local-repo/TLN_DETACHED_MODE) and the `tln` builder
 * context object (old Appl#init's filter/utils-backed helpers) are not ported yet —
 * `init()` always resolves `home` from `cwd` directly, and Component builders keep
 * receiving `undefined` for `tln`, as they do today.
 */
export class App {
  readonly cwd: string;
  /** Root of the tln-cli package itself, i.e. `path.join(catalogHome, 'components')` is the built-in component catalog. */
  readonly catalogHome: string;
  home!: string;
  localRepo!: string;
  rootComponent!: Component;
  currentComponent!: Component;

  constructor(cwd: string, catalogHome: string) {
    this.cwd = cwd;
    this.catalogHome = catalogHome;
  }

  /**
   * Port of the non-detached branch of Appl#init (old/src/appl.js:66-92): finds the
   * topmost ancestor of `cwd` with a tln config and uses it as `home`/`localRepo`
   * (falling back to `cwd` itself if none is found anywhere — old code's detached-mode
   * tmp-folder fallback isn't ported), then builds the component chain from `home`
   * down to `cwd`.
   */
  async init(): Promise<void> {
    let home = this.cwd;
    let p = home;
    while (!this.isRootPath(p)) {
      p = path.dirname(p);
      if (await hasConfig(p)) {
        home = p;
      }
    }
    this.home = home;
    this.localRepo = this.home;
    await fs.mkdir(this.localRepo, { recursive: true });

    this.rootComponent = await create(this.localRepo);

    const relative = path.relative(this.home, this.cwd);
    const folders = relative ? relative.split(path.sep) : [];
    let current = this.rootComponent;
    for (const folder of folders) {
      current = await current.buildChild(folder);
    }
    this.currentComponent = current;
  }

  /** Direct port of Appl#isRootPath (old/src/appl.js:174-178). */
  isRootPath(p: string): boolean {
    const root = os.platform() === 'win32' ? `${this.cwd.split(path.sep)[0]}${path.sep}` : path.sep;
    return p === root;
  }

  /**
   * Port of Appl#resolve (old/src/appl.js:169-171). The empty-`components` case is
   * fully real. For non-empty `components`, only the `'/'` (root) shorthand is
   * resolvable today — anything else needs Component#find/resolve's tree search
   * across declared child components, which isn't ported, so it's warned about and
   * dropped (same convention as run.ts's existing "not yet supported" warning).
   */
  async resolve(components: string[], resolveEmptyToThis = true, popup = true, force = false): Promise<Component[]> {
    if (!components.length) {
      return resolveEmptyToThis ? [this.currentComponent] : [];
    }

    const results: Component[] = [];
    for (const id of components) {
      if (id === '/') {
        results.push(this.rootComponent);
        continue;
      }
      console.warn(
        `Component "${id}" was not found (component tree search needs Component#find/resolve, see old/src/component.js; popup=${popup}, force=${force})`,
      );
    }
    return results;
  }

  /**
   * Port of Appl#run (old/src/appl.js:158-166), adapted to the new Component#run's
   * single-commandId signature: each resolved component runs every command in order.
   * `recursive`/`depth`/`depends` traversal stays unported, same as run.ts's TODO.
   */
  async run(components: string[], parallel: boolean, commands: string[], dryRun: boolean): Promise<void> {
    const resolved = await this.resolve(components);
    const runComponent = async (component: Component): Promise<void> => {
      for (const command of commands) {
        await component.run(command, dryRun);
      }
    };
    for (const component of resolved) {
      if (parallel) {
        void runComponent(component);
      } else {
        await runComponent(component);
      }
    }
  }

  async config(components: string[], options: ConfigOptions): Promise<void> {
    throw new Error(
      `Not implemented: App#config — needs Component#config (see old/src/component.js) [components=${components.join(':')}, options=${JSON.stringify(options)}]`,
    );
  }

  async inspect(components: string[], options: InspectOptions): Promise<void> {
    throw new Error(
      `Not implemented: App#inspect — needs Component#inspect (see old/src/component.js) [components=${components.join(':')}, options=${JSON.stringify(options)}]`,
    );
  }

  async ls(components: string[], options: LsOptions): Promise<void> {
    throw new Error(
      `Not implemented: App#ls — needs Component#ls (see old/src/component.js) [components=${components.join(':')}, options=${JSON.stringify(options)}]`,
    );
  }

  async exec(components: string[], parallel: boolean, recursive: boolean, depth: number, options: ExecOptions): Promise<void> {
    throw new Error(
      `Not implemented: App#exec — needs Component#exec (see old/src/component.js) [components=${components.join(':')}, parallel=${parallel}, recursive=${recursive}, depth=${depth}, options=${JSON.stringify(options)}]`,
    );
  }
}

/** Builds and initializes an App from a command handler's argv (see build()'s cwd/catalogHome middleware). */
export async function createApp(argv: GlobalArgv): Promise<App> {
  const app = new App(argv.cwd, argv.catalogHome);
  await app.init();
  return app;
}
