# CLAUDE.md

This file provides guidance to Claude Code (claude.ai/code) when working with code in this repository.

## What this is

`tln-cli` (npm package `tln-cli`, bin `tln`) is "Architecture as Code" — a CLI that manages third-party components (Java, Node.js, Go, etc.) and orchestrates SDLC steps (build/test/install/...) across mono- and multi-repo project layouts. It creates fully isolated, nested development environments and bridges local dev with CI/CD. See `README.md` for the full conceptual walkthrough and `docs/*.md` for in-depth topics (`component.md`, `dotenv.md`, `mvt.md`, `repos.md`, `sdlc.md`, `versioning.md`).

## Concepts

### Component
A component is an autonomous, modular element of a software system that implements structural or functional role, or both.

### Command line format
tln commands expect next format
```
tln <command>[:<command>:...] [<compinent>:[<component>:...]] [options] -- [command_specific_options]
```

## Prerequisites
Always read index.md files, they are containing technical details about project in OKF (Open Knowledge Format)