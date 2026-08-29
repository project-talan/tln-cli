import { promises as fs } from 'node:fs';
import path from 'node:path';
import { stringify as stringifyYaml } from 'yaml';
import { Component, create, type ComponentLsNode } from './component.js';
import { Env, type CliOverrides } from './env.js';
import type { GlobalArgv } from './util/globalOptions.js';
import { createExecutionContext, hasConfig, isRootPath, type ExecutionContext } from './util/misc.js';
import type { ConfigOptions, InspectOptions, LsOptions, ExecOptions } from './util/options.js';

/**
 * Orchestrates a single `tln` invocation: resolves the project's `home` (walking
 * up from `cwd` to the topmost folder with a `.tln.tjs`/`.tln` config), builds the
 * component tree — root at (catalogHome, userHome), with `home` attached beneath
 * it as an explicit anchor and the chain descending from there down to `cwd` — and
 * dispatches every top-level command onto the components resolved from CLI
 * arguments. Port of old/src/appl.js's `Appl`.
 *
 * Detached mode (--detach/--local-repo/TLN_DETACHED_MODE) isn't ported yet — `init()`
 * always resolves `home` from `cwd` directly. The `tln` builder context passed to
 * every .tln.tjs-defined function is `executionContext` (see util/misc.js), built once
 * here at construction time and threaded down the whole component tree. `env` (see
 * env.js) is built here too, from `process.env`, and seeds the root component's base
 * environment — every other component's effective environment is resolved on demand
 * from there (see `Component#resolveEnv`), not threaded through construction. `cliOverrides`
 * is already-parsed by the time it reaches `App` — `build()` (util/cli.ts) runs `argv['--']`
 * through `parseCliOverrides` once, at CLI bootstrap, and `App` just threads that same
 * frozen object down; every `.tln.tjs` description's `options()` mapping reads from it.
 */
export class App {
  readonly cwd: string;
  /** The tln-cli package's built-in component catalog folder (see index.ts). */
  readonly catalogHome: string;
  /** Per-user install root (`~/.talan/cli`) where tln installs third-party components (see index.ts). */
  readonly userHome: string;
  readonly verbose: number;
  /** Passed (as a fresh clone per call) as `tln` to every .tln.tjs-defined function — see util/misc.js. */
  readonly executionContext: ExecutionContext;
  /** Seeds the root component's base environment (see `Component#resolveEnv`) with `process.env`. */
  readonly env: Env;
  /** Parsed `argv['--']` (see `parseCliOverrides`, run once by `build()`) — read by every `.tln.tjs` description's `options()` mapping. */
  readonly cliOverrides: CliOverrides;
  home!: string;
  rootComponent!: Component;
  currentComponent!: Component;

  constructor(cwd: string, catalogHome: string, userHome: string, verbose: number, cliOverrides: CliOverrides = {}) {
    this.cwd = cwd;
    this.catalogHome = catalogHome;
    this.userHome = userHome;
    this.verbose = verbose;
    this.executionContext = createExecutionContext();
    this.env = Env.fromProcessEnv();
    this.cliOverrides = cliOverrides;
  }

  /**
   * Port of the non-detached branch of Appl#init (old/src/appl.js:66-92): finds the
   * topmost ancestor of `cwd` with a tln config and uses it as `home` (falling back
   * to `cwd` itself if none is found anywhere — old code's detached-mode tmp-folder
   * fallback isn't ported). Builds the root component at (catalogHome, userHome),
   * attaches `home` beneath it as an explicit anchor (Component#createChild — its
   * sourcePath/homePath are `home` itself, not joined from the root's), then
   * descends from that anchor down to `cwd` via Component#buildChild, which does
   * join each step onto its parent's paths. Creates `userHome` if it doesn't
   * exist yet, since that's where tln installs third-party components.
   */
  async init(): Promise<void> {
    let home = this.cwd;
    let p = home;
    while (!isRootPath(this.cwd, p)) {
      p = path.dirname(p);
      if (await hasConfig(p)) {
        home = p;
      }
    }
    this.home = home;

    await fs.mkdir(this.userHome, { recursive: true });

    this.rootComponent = await create(this.catalogHome, this.userHome, this.executionContext, this.env, this.cliOverrides);

    const relative = path.relative(this.home, this.cwd);
    const folders = relative ? relative.split(path.sep) : [];
    let current = await this.rootComponent.createChild(this.home);
    for (const folder of folders) {
      current = await current.buildChild(folder);
    }
    this.currentComponent = current;

    if (this.verbose > 0) {
      console.log('* cwd:', this.cwd);
      console.log('* catalogHome:', this.catalogHome);
      console.log('* userHome:', this.userHome);
      console.log('* home:', this.home);
      console.log('');
    }
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
  async run(commands: string[], components: string[], parallel: boolean, dryRun: boolean): Promise<void> {
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
    const resolved = await this.resolve(components);
    for (const component of resolved) {
      const inspection = await component.inspect();
      console.log(options.json ? JSON.stringify(inspection, null, 2) : stringifyYaml(inspection));
    }
  }

  async ls(components: string[], options: LsOptions): Promise<void> {
    const resolved = await this.resolve(components);
    for (const component of resolved) {
      const tree = await component.ls(options);
      if (tree) {
        for (const line of App.formatLsTree(tree)) console.log(line);
      }
    }
  }

  /** Renders a `Component#ls` tree as box-drawn lines (standard per-level tree printing, not old code's — see the `ls` command plan for why). */
  private static formatLsTree(node: ComponentLsNode, prefix = ''): string[] {
    const lines = [`${node.id}${node.installed ? '' : ' *'}`];
    App.formatLsChildren(node, prefix, lines);
    return lines;
  }

  private static formatLsChildren(node: ComponentLsNode, prefix: string, lines: string[]): void {
    node.children.forEach((child, index) => {
      const isLast = index === node.children.length - 1 && !node.more;
      lines.push(`${prefix}${isLast ? '└─ ' : '├─ '}${child.id}${child.installed ? '' : ' *'}`);
      App.formatLsChildren(child, `${prefix}${isLast ? '   ' : '│  '}`, lines);
    });
    if (node.more) {
      lines.push(`${prefix}└─ ... ${node.more} more`);
    }
  }

  async exec(components: string[], parallel: boolean, recursive: boolean, depth: number, options: ExecOptions): Promise<void> {
    throw new Error(
      `Not implemented: App#exec — needs Component#exec (see old/src/component.js) [components=${components.join(':')}, parallel=${parallel}, recursive=${recursive}, depth=${depth}, options=${JSON.stringify(options)}]`,
    );
  }
}

/** Builds and initializes an App from a command handler's argv (see build()'s cwd/catalogHome/userHome middleware). */
export async function createApp(argv: GlobalArgv): Promise<App> {
  const app = new App(argv.cwd, argv.catalogHome, argv.userHome, argv.verbose, argv.cliOverrides);
  await app.init();
  return app;
}
