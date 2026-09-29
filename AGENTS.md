# Repository Guidelines

## Project Structure & Module Organization

This is a browser-only JavaScript and p5.js project. `index.html` loads all scripts; `sketch.js` contains the global-mode `setup()` and `draw()` entry points.

Keep `index.html`, `style.css`, and the small p5.js entry point `sketch.js` at the repository root. Application classes belong in `src/`, organized by responsibility:

- `src/world/`: `Terrain.js`, `Cell.js`, and `Grid.js` define terrain, cells, connectivity, and grid display.
- `src/search/`: `SearchAlgorithm.js`, `PriorityQueue.js`, `Heuristics.js`, and the algorithm classes define the shared search contract and search utilities.
- `src/agent/Agent.js` and `src/entities/Food.js`: the agent and food objects.
- `src/ui/`: `UI.js` owns controls and algorithm selection; `SearchVisualizer.js` owns search visualization.
- `src/core/`: `SimulationState.js` defines states; `Simulation.js` coordinates the components and delegates drawing to them.

Keep responsibilities in these existing classes. Avoid unnecessary Factory, Manager, Controller, Service, event bus, or dependency injection layers. Preserve unfinished TODOs when working on structure alone.

`scripts/build-web-editor.sh` generates the optional `web-editor/sketch.js` by concatenating the modular sources in dependency order and copies the root CSS to `web-editor/style.css`. The self-contained fallback contains only `index.html`, `style.css`, and `sketch.js`. Edit application logic in `src/` or the root `sketch.js` and styles in the root CSS, then regenerate; do not maintain independent copies of the application logic.

No test or asset directories exist yet. Add root-level `tests/` or `assets/` only when needed.

## Build, Test, and Development Commands

GitHub Pages is the primary deployment method. Serve the repository directly from the publishing branch's root; no application build step, package manager, server-side code, or dependency installation is required. Do not add Node.js, npm, `package.json`, bundlers, or `node_modules`.

- Open the published GitHub Pages URL for normal use; the simulation should start immediately.
- Open `index.html` directly in a browser for a quick local run; no local server is required.
- Run `./scripts/build-web-editor.sh` after source or CSS changes to refresh the emergency fallback. The generator uses POSIX shell utilities only and must report missing inputs before overwriting the fallback.
- For the p5.js Web Editor fallback, replace its three default files with the files from `web-editor/` and press Run. Do not upload the individual `src/` files.
- Run `git diff --check` before submitting changes to detect whitespace errors.

p5.js comes from a CDN, so running either version requires internet access. The main page must never depend on running the fallback generator. Keep `README.md` in Brazilian Portuguese and update it when execution instructions or public contracts change.

## Coding Style & Naming Conventions

Use four-space indentation, semicolons, double-quoted strings, and focused methods. Use `PascalCase` for classes and filenames (`PriorityQueue.js`), `camelCase` for variables and methods, and uppercase fixed identifiers such as `SimulationState.WAITING`.

Keep p5.js in global mode with ordinary scripts. Do not introduce `import`, `export`, `require`, `type="module"`, TypeScript, or framework code. Use relative script, style, and asset paths such as `./src/world/Terrain.js`, so the site works under a GitHub Project Pages repository path. Do not fetch local source files at runtime. Centralize terrain costs and movement properties in `src/world/Terrain.js`.

Load scripts in this order in the root `index.html`, and keep the generator's source list in the same order after p5.js:

```text
p5.js
src/world/Terrain.js
src/world/Cell.js
src/world/Grid.js
src/search/SearchAlgorithm.js
src/search/PriorityQueue.js
src/search/Heuristics.js
src/search/BFS.js
src/search/DFS.js
src/search/UniformCostSearch.js
src/search/GreedySearch.js
src/search/AStar.js
src/agent/Agent.js
src/entities/Food.js
src/ui/UI.js
src/ui/SearchVisualizer.js
src/core/SimulationState.js
src/core/Simulation.js
sketch.js
```

When adding a class, put it in the appropriate `src/` folder, load it after its dependencies and before its consumers, update both lists, and regenerate the fallback. `web-editor/index.html` loads p5.js and only its generated `sketch.js`; it must not reference `../src/`.

Search algorithms must extend `SearchAlgorithm`. Preserve `frontier`, `visited`, `finalPath`, `finished`, `found`, `step()`, `isFinished()`, and `getPath()`. A call to `step()` processes at most one search node; it must not run an entire search. Obtain neighbors through `grid.getNeighbors(cell)` and keep `frontier`, `visited`, and `finalPath` as arrays of `Cell` objects. Paths are ordered from start to goal and passed to the agent using `setPath(path)`. Read terrain costs through Cell/Terrain; Greedy and A* use `Heuristics.manhattan()`.

## Testing Guidelines

No automated test framework is configured. Check both the root `index.html` and `web-editor/index.html`: the console should have no errors, the 20×15 grid should render on an 800×600 canvas, and agent and food should appear at opposite corners. The simulation starts in `SimulationState.WAITING`. Check the published GitHub Pages URL after deployment.

Verify relative paths, script dependency order, no stale root copies of application classes, and an up-to-date generated fallback. For search changes, check frontier, visited nodes, path order, and one-step-per-call behavior. Keep search rendering in `SearchVisualizer`, loaded before `Simulation`. Place future tests in `tests/` as `*.test.js`.

## Commit & Pull Request Guidelines

Use short imperative messages, optionally scoped, such as `search: add BFS step logic`.

Pull requests should describe the behavior changed, list manual checks performed, link related issues, and include a screenshot or short recording for visible simulation changes. Keep each PR focused and avoid committing personal editor files or unrelated generated artifacts. The generated files in `web-editor/` are an intentional exception: keep them versioned and synchronized with their sources so the emergency fallback is ready to use.
