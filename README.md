# Intelligent Search Grid

Intelligent Search Grid is a browser-based visualization of pathfinding algorithms on a weighted 2D grid. An agent searches for food while navigating sand, mud, water, and obstacles. The project is intended to make the behavior of uninformed and informed search algorithms visible one step at a time.

The planned algorithms are:

- Breadth-First Search (BFS)
- Depth-First Search (DFS)
- Uniform-Cost Search (UCS)
- Greedy Best-First Search
- A* Search

The project currently provides the grid, terrain definitions, entities, simulation states, and search interfaces. Search execution, movement, controls, procedural terrain, and visualization overlays are still scaffolded with `TODO` comments.

## Running the project

There is no build step or package installation. The application uses p5.js in global mode, loaded from a CDN.

Open `index.html` directly for a quick run, or serve the repository locally:

```sh
python3 -m http.server 8000
```

Then visit <http://localhost:8000>. An internet connection is required to load p5.js.

## Repository structure

```text
.
├── index.html              # Script loading and dependency order
├── sketch.js               # p5.js setup() and draw() entry points
└── src
    ├── agent/              # Agent path following and rendering
    ├── core/               # Simulation coordination and state machine
    ├── entities/           # Food and future world entities
    ├── search/             # Search contract, algorithms, and utilities
    ├── ui/                 # Algorithm selection and controls
    └── world/              # Terrain, cells, and grid connectivity
```

## Development contracts

The following contracts keep the components compatible. Changes that intentionally alter one of them should update every consumer and this document in the same change.

### Runtime and source loading

- Keep the application browser-only and keep p5.js in global mode.
- Do not introduce `import`, `export`, `require`, TypeScript, a bundler, or a framework.
- Every class is made available through its `<script>` tag in `index.html`. A script must be listed after all of its dependencies.
- `sketch.js` remains the final project script because it creates the top-level `Simulation` from p5.js `setup()` and drives it from `draw()`.

The current dependency flow is:

```text
Terrain -> Cell -> Grid
SearchAlgorithm + PriorityQueue + Heuristics -> search implementations
Grid + search implementations + Agent + Food + UI + SimulationState -> Simulation
Simulation -> sketch.js
```

### World and terrain

- Grid coordinates are zero-based and represented as `{ col, row }`. Cells are stored as `grid.cells[row][col]`.
- Use `grid.getCell(col, row)` instead of indexing the matrix from other components. It returns `null` for an out-of-bounds coordinate.
- Movement is orthogonal only. `Grid.connectNeighbors()` connects cells in the up, right, down, and left directions; diagonal movement is not part of the current model.
- Search code must obtain traversable neighbors through `grid.getNeighbors(cell)`. It must not read or rebuild adjacency independently.
- Cells are compared by object identity. Search maps and collections must contain the existing `Cell` instances returned by the grid, not coordinate copies or newly constructed cells.
- All terrain properties belong in `src/world/Terrain.js`. Add or change terrain cost, speed, walkability, label, or color there rather than scattering terrain-specific conditions through the codebase.
- Obstacles are not walkable, have infinite search cost, and must be excluded by `Grid.getNeighbors()`.
- A movement cost is the cost of entering the neighboring cell. This convention must be used by UCS and A*.

Current terrain values are:

| Terrain | Cost | Speed multiplier | Walkable |
| --- | ---: | ---: | :---: |
| Sand | 10 | 1.0 | Yes |
| Mud | 50 | 0.6 | Yes |
| Water | 100 | 0.3 | Yes |
| Obstacle | Infinity | 0 | No |

### Search algorithms

- Every search implementation must extend `SearchAlgorithm` and accept `(grid, start, goal)` in its constructor.
- One call to `step()` may process at most one search node. It must never run the full search in a loop. The simulation relies on this rule to animate the exploration.
- `frontier`, `visited`, and `finalPath` are public visualization data and must remain arrays of `Cell` objects. An algorithm may keep an additional queue, stack, priority queue, set, or map internally, but the public arrays must reflect its current state.
- A cell should enter `visited` when it is removed from the frontier for processing, not when it is merely discovered.
- Use `grid.getNeighbors(cell)` for expansion and `cameFrom` to record the predecessor of each discovered or improved cell.
- Finish successfully when the processed cell is the goal. Finish unsuccessfully when no nodes remain to process. Call `finish(found)` so `finished`, `found`, and `finalPath` stay consistent.
- A successful `finalPath` is ordered from start to goal and includes both endpoints. A failed search has an empty path.
- `reset()` must restore all shared search state. Algorithm subclasses that own additional queues, stacks, sets, or cost maps must clear those structures too.
- BFS uses FIFO ordering; DFS uses LIFO ordering; UCS prioritizes accumulated entry cost; Greedy Search prioritizes only the heuristic; A* prioritizes accumulated entry cost plus the heuristic.
- Greedy Search and A* use `Heuristics.manhattan(cell, goal)`. Manhattan distance matches the grid's orthogonal movement contract.
- If a lower accumulated cost reaches a cell in UCS or A*, update its priority, `cameFrom`, and `costSoFar`. Do not treat the first discovery as permanently optimal.

### Priority queue

- `PriorityQueue` stores arbitrary elements with numeric priorities and dequeues the lowest numeric priority first.
- Search visualizations must not depend on the queue's private `{ element, priority }` records. Use `toArray()` when an array of frontier elements is needed.
- Preserve reference-based behavior for `contains(element)` so it remains compatible with grid-owned `Cell` objects.

### Agent, food, and simulation

- `Agent.position` and `Food.position` are `Cell` references, not raw coordinates.
- `Agent.setPath(path)` receives a start-to-goal array of cells. Paths with more than one cell begin movement; empty and single-cell paths do not.
- Agent movement must advance gradually rather than consume an entire path in one frame. Terrain speed comes from `Terrain.getSpeedMultiplier()`.
- The `Simulation` owns coordination between the grid, search, entities, UI, score, and lifecycle. Components should not create or control one another directly.
- Valid lifecycle states are `WAITING`, `SEARCHING`, `MOVING`, and `COLLECTING`. Use `simulation.setState()` so invalid states are rejected.
- During `SEARCHING`, `Simulation.update()` invokes exactly one search `step()` per frame. A successful result is passed to the agent before entering `MOVING`; failure returns to a non-moving state.
- Collection occurs only after the agent reaches the food. Collection updates the score, relocates food to a valid walkable cell distinct from the agent, and returns the simulation to `WAITING`.
- Keep state changes in update methods and rendering in `display()` methods. Drawing code must not advance the simulation.
- Algorithm identifiers exposed by the UI and accepted by `Simulation.createSearchAlgorithm()` must stay synchronized: `BFS`, `DFS`, `UCS`, `GREEDY`, and `ASTAR`.

## Adding a search algorithm

1. Create a `PascalCase.js` class in `src/search/` that extends `SearchAlgorithm`.
2. Implement incremental initialization and a `step()` that processes no more than one node.
3. Maintain the shared visualization arrays and path reconstruction contract.
4. Add its script to `index.html` after its dependencies and before `Simulation.js`.
5. Add the same stable identifier to `UI.availableAlgorithms` and `Simulation.createSearchAlgorithm()`.
6. Manually verify frontier contents, visit order, final path order, failure behavior, and one-step-per-call execution.

## Style and verification

- Use four-space indentation, semicolons, and double-quoted strings.
- Use `PascalCase` for classes and their filenames, `camelCase` for variables and methods, and uppercase names for fixed identifiers such as `SimulationState.WAITING`.
- Prefer small, focused methods and keep p5.js drawing calls inside display-oriented methods.
- Place future automated tests in a root-level `tests/` directory and name them `*.test.js`. Do not add a test framework unless the repository deliberately adopts one.

Before submitting a change, run:

```sh
git diff --check
```

Also verify manually that:

- the browser console contains no errors;
- the 20 x 15 grid renders at 800 x 600 pixels;
- the agent starts at the top-left and food at the bottom-right;
- each search call processes at most one node;
- frontier, visited cells, and the final path are displayed in the expected order; and
- weighted algorithms use terrain entry costs correctly.
