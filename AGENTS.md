# Repository Guidelines

## Project Structure & Module Organization

This is a browser-only JavaScript and p5.js project. `index.html` loads all scripts; `sketch.js` contains the global-mode `setup()` and `draw()` entry points.

JavaScript files stay at the repository root so the same files can be uploaded directly to the p5.js Web Editor. Responsibilities remain separated by class:

- `Terrain.js`, `Cell.js`, and `Grid.js`: terrain definitions, cells, and grid connectivity.
- `SearchAlgorithm.js`, `PriorityQueue.js`, `Heuristics.js`, and the algorithm classes: the shared search contract and search utilities.
- `Agent.js` and `Food.js`: the agent and food objects.
- `UI.js`: user-interface state and future controls.
- `SimulationState.js` and `Simulation.js`: simulation states and component coordination.

No test or asset directories exist yet. Add root-level `tests/` or `assets/` only when needed.

## Build, Test, and Development Commands

No build step, package manager, or dependency installation is required. Do not add bundles or `node_modules`.

- Open the sketch files in the p5.js Web Editor and press Run for normal use.
- Open `index.html` directly in a browser for a quick local run; no local server is required.
- Run `git diff --check` before submitting changes to detect whitespace errors.

p5.js comes from a CDN, so running the project requires internet access.

## Coding Style & Naming Conventions

Use four-space indentation, semicolons, double-quoted strings, and focused methods. Use `PascalCase` for classes and filenames (`PriorityQueue.js`), `camelCase` for variables and methods, and uppercase fixed identifiers such as `SimulationState.WAITING`.

Keep p5.js in global mode. Do not introduce `import`, `export`, `require`, TypeScript, or framework code. When adding a class, place its `<script>` after its dependencies in `index.html`. Centralize terrain costs and movement properties in `Terrain.js`.

Search algorithms must extend `SearchAlgorithm`. A call to `step()` processes at most one search node; it must not run an entire search. Obtain neighbors through `grid.getNeighbors(cell)` and keep `frontier`, `visited`, and `finalPath` as arrays of `Cell` objects.

## Testing Guidelines

No automated test framework is configured. Verify that the console has no errors, the 20×15 grid renders, and agent and food appear at opposite corners. For search changes, check frontier, visited nodes, path order, and one-step-per-call behavior. Place future tests in `tests/` as `*.test.js`.

## Commit & Pull Request Guidelines

The history currently contains only `Initial commit`; no established message convention exists. Use short imperative messages, optionally scoped, such as `search: add BFS step logic`.

Pull requests should describe the behavior changed, list manual checks performed, link related issues, and include a screenshot or short recording for visible simulation changes. Keep each PR focused and avoid committing editor files or generated artifacts.
