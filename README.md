# Architecture as Code

<img alt="tln" align="right" src="https://raw.githubusercontent.com/project-talan/tln-cli/tlnv2/tln.png" width="300">

Talan CLI (tln)
* is an open-source framework designed to manage third-party components across diverse ecosystems like Java, Node.js, C++, Golang etc.
* it enables the creation of fully isolated, nested development, environments, streamlines the management complex development setups and facilitates a seamless onboarding experience.
* effectively bridges gaps between local development environments and CI/CD setups, maximizing the benefits of Polyglot Programming and Polyglot Persistence (4Ps) design.

## Similar or related projects
[Brew](https://brew.sh/), [Conan](https://conan.io/), [Meta](https://github.com/mateodelnorte/meta), [Lerna](https://github.com/lerna/lerna), [SDKMAN](https://sdkman.io), [jEnv](https://www.jenv.be/), [Chocolatey](https://chocolatey.org/)

## Prerequisites
* Install `Nodejs 24.x` or higher (https://nodejs.org)
* Install tln-cli
  ```
  npm i -g tln-cli && tln --version
  ```

## Key concepts

### What is a component?

A **component** is any part of a software system that serves a structural or functional role:

* Is your projects home a component (`~/projects`)?  
  **Yes** — it holds all your projects.
* Is a company folder a component (`~/projects/petramco`)?  
  **Yes** — it holds that company's own git user/email, access keys, etc., so different companies' projects stay isolated from each other.
* Is a specific project folder a component (`~/projects/petramco/saas`)?  
  **Yes** — it's your git repository, whether mono-repo or multi-repo.
* Are `backend`, `web`, `mobile`, and `platform` — the folders splitting `saas` by part of the system — components too?  
  **Yes** — however you've divided your repo internally, every part of that split is covered by the same component concept.

Components follow the folder structure, so they nest as deep as your repo does:

```
~/projects
├ petramco
│ └ saas
│   ├ backend
│   │ └ services
│   │   └ apps
│   │     └ iam
│   │       └ src
│   │         └ main.ts
│   ├ web
│   │ └ apps
│   │   └ admin
│   │     └ src
│   │       └ index.tsx
│   ├ mobile
│   │ └ ...
│   └ platform
│     └ ...
└ acme
  └ ...
```

A folder becomes a component `tln` actually knows about once it has a `.tln.tjs` config file (or a `.tln/` folder of them) — you don't need one in every folder, only at the boundaries where you want to attach commands, env vars, or dependencies (here, that's likely `~/projects/petramco`, `saas`, `backend`, and `iam`, not every folder down to `src/`).

### How the component model works

```js
// .tln.tjs
module.exports = {
  dotenvs: async (tln) => ['.env'],
  options: async (tln, env) => ({
    prefix: 'MY_APP',
    options: [{ key: 'context', desc: 'Environment id', type: 'string', default: 'dev' }],
  }),
  env: async (tln, env) => { env.BUILT_AT = new Date().toISOString(); },
  inherits: async (tln) => ['docker'],
  depends: async (tln) => [],
  commands: async (tln) => ({
    hi: { builder: async (tln, env) => [`echo Hi from ${env.MY_APP_CONTEXT}`], access: 'public' },
  }),
  components: async (tln) => [],
};
```

* **Structure and inheritance are separate.** A component's `parent` chain is its literal folder nesting; its `inherits` list is independent — name another catalog component as a "base class" (C++-style multiple inheritance) without it being a structural ancestor.
* **Commands have real visibility.** Each command declares `access: 'public' | 'protected' | 'private'` — private stays callable only on the component that defines it, public/protected flows down to every descendant and every `inherits` link, and a descendant's own command runs alongside (not instead of) an inherited one of the same name.
* **One env-var pipeline, same order every time.** Per command run: parent chain → `inherits` → each config's `dotenvs` files → `--` CLI flags (mapped through that config's `options()`) → its `env()` function, then the global `-e`/`--env-file` overrides win over all of it.

## Quick start <sub><sup>~3 min</sup></sub>
* Create a project folder and drop in the `.tln.tjs` from [Key concepts](#key-concepts) above
  ```
  mkdir hellotalan && cd hellotalan
  ```
* Run the `hi` command, passing `context` through `--`
  ```
  tln hi -- --context staging
  ```
  ```
  echo Hi from staging
  ```
* Inspect the component — every command it can run, where each came from, its resolved env vars
  ```
  tln inspect
  ```
* List the component tree
  ```
  tln ls
  ```

## Command reference
* `tln <commands>[:<commands>...] [<components>[:<components>...]] [options] -- [command-specific options]` — run one or more commands against one or more components (the default command)
* `tln inspect [components] [-j]` — show a component's resolved structure: commands, `inherits`, `depends`, env
* `tln ls [components] [-d depth] [-l limit] [--parents] [--installed-only]` — show the component tree
* `tln about` — version and project info

## Local Development Setup
* Clone the repo and install dependencies
  ```
  git clone https://github.com/project-talan/tln-cli.git
  cd tln-cli
  npm install
  ```
* Build once — compiles `src/*.ts` to `dist/`, then marks the emitted entry point executable
  ```
  npm run build
  ```
* Develop with auto-restart on save (runs TS directly, no manual rebuild needed)
  ```
  npm run dev
  ```
* Debug with breakpoints — starts the process paused, waiting for a debugger to attach
  ```
  npm run dev:debug
  ```
  Attach via VS Code's built-in debugger (see the "Debug CLI (src/index.ts)" config in `.vscode/launch.json`, just hit F5), or via `chrome://inspect` if you're not using VS Code.
* Try it as a real installed CLI — exercises the actual `bin` entry, shebang and file permissions, not just the logic (the package currently exposes its bin as `tln2`, not `tln`, until this branch is published)
  ```
  npm run build && npm link
  tln2 --some-flag
  npm unlink -g tln-cli   # when done
  ```
* Publish (maintainers only)
  ```
  ./publish.sh
  ```
