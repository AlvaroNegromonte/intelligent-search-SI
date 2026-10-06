const fs = require("fs");
const path = require("path");
const vm = require("vm");
const assert = require("assert");

// Usa a ordem real da página, sem DOM. O navegador valida o p5.js real.
const root = path.resolve(__dirname, "..");
const context = vm.createContext({
    createCanvas: (width, height) => assert.deepStrictEqual([width, height], [800, 600]),
    noise: (x, y) => (Math.sin(x * 1.7 + y * 2.3) + 1) / 2,
    deltaTime: 1000 / 60
});
const html = fs.readFileSync(path.join(root, "index.html"), "utf8");

for (const match of html.matchAll(/<script src="\.\/([^"]+)"/g)) {
    vm.runInContext(fs.readFileSync(path.join(root, match[1]), "utf8"), context);
}

vm.runInContext("let seed = 7; Math.random = () => ((seed = seed * 16807 % 2147483647) - 1) / 2147483646;", context);
const { Simulation, SimulationState, UI, Terrain, setup, getSimulation } = vm.runInContext(
    "({ Simulation, SimulationState, UI, Terrain, setup, getSimulation: () => simulation })", context
);

function terrainSnapshot(simulation) {
    return JSON.stringify(simulation.grid.cells.map((row) => row.map((cell) => cell.terrainType)));
}

function assertValidFood(simulation) {
    const { grid, agent, food } = simulation;
    assert.ok(food.position.walkable);
    assert.notStrictEqual(food.position, agent.position);
    assert.ok(grid.isReachable(agent.position, food.position));

    const distance = (cell) => Math.abs(cell.col - agent.position.col)
        + Math.abs(cell.row - agent.position.row);
    const minimum = Math.ceil(((grid.cols - 1) + (grid.rows - 1)) * 0.45);

    if (distance(food.position) < minimum) {
        // Em componentes pequenos, a regra existente usa a maior distância possível.
        for (const row of grid.cells) {
            for (const cell of row) {
                if (grid.isReachable(agent.position, cell)) {
                    assert.ok(distance(cell) <= distance(food.position));
                }
            }
        }
    }
}

function reachCollection(simulation) {
    const states = new Set();

    for (let frame = 0; frame < 200000; frame += 1) {
        states.add(simulation.state);

        if (simulation.state === SimulationState.COLLECTING) {
            assert.ok(states.has(SimulationState.SEARCHING));
            assert.ok(states.has(SimulationState.MOVING));
            return;
        }

        simulation.update();
    }

    assert.fail("A coleta não terminou dentro do limite de quadros.");
}

setup();
const startup = getSimulation();
assert.strictEqual(startup.state, SimulationState.WAITING);
assert.strictEqual(startup.search, null);
assert.strictEqual(startup.score, 0);
assert.strictEqual(startup.agent.position, startup.grid.getCell(0, 0));
assert.ok(startup.grid.cells.some((row) => row.some((cell) => cell.terrainType === Terrain.OBSTACLE)));
assertValidFood(startup);
console.log("[PASS] startup procedural em WAITING, sem busca, com comida válida");

for (const algorithm of ["BFS", "DFS", "UCS", "GREEDY", "ASTAR"]) {
    for (const speed of [0.25, 1, 4]) {
        const simulation = new Simulation();
        simulation.generateNewMap();
        simulation.ui.setSelectedAlgorithm(algorithm);
        simulation.ui.speed = speed;
        const terrain = terrainSnapshot(simulation);
        const cells = simulation.grid.cells.map((row) => row.slice());
        simulation.startSearch();

        for (let score = 1; score <= 3; score += 1) {
            const collectedCell = simulation.food.position;
            reachCollection(simulation);
            assert.strictEqual(simulation.score, score);
            assert.strictEqual(simulation.agent.position, collectedCell);
            assert.ok(simulation.ui.buildStatusHtml(simulation.getStatus()).includes("<table>"));
            simulation.collectFood();
            assert.strictEqual(simulation.score, score, "A mesma coleta não pontua duas vezes.");
            simulation.update();

            assert.strictEqual(simulation.state, SimulationState.SEARCHING);
            assert.strictEqual(simulation.agent.position, collectedCell);
            assert.strictEqual(simulation.search.start, collectedCell);
            assert.strictEqual(simulation.search.goal, simulation.food.position);
            assert.strictEqual(simulation.searchAlgorithmName, algorithm);
            assert.strictEqual(simulation.results.size, 0);
            assertValidFood(simulation);
            assert.strictEqual(terrainSnapshot(simulation), terrain);
            for (let row = 0; row < simulation.grid.rows; row += 1) {
                for (let col = 0; col < simulation.grid.cols; col += 1) {
                    assert.strictEqual(simulation.grid.getCell(col, row), cells[row][col]);
                }
            }
        }

        // Reiniciar interrompe a continuação e gera outro mapa, mantendo a pontuação.
        simulation.ui.requestAction(UI.ACTIONS.RESET);
        for (let frame = 0; frame < 10; frame += 1) {
            simulation.update();
        }
        assert.strictEqual(simulation.state, SimulationState.WAITING);
        assert.strictEqual(simulation.search, null);
        assert.strictEqual(simulation.agent.isMoving, false);
        assert.strictEqual(simulation.agent.position, simulation.grid.getCell(0, 0));
        assert.strictEqual(simulation.score, 3);
        assert.notStrictEqual(terrainSnapshot(simulation), terrain);
        assert.strictEqual(simulation.results.size, 0);
        assertValidFood(simulation);

        const restartedTerrain = terrainSnapshot(simulation);

        simulation.startSearch();
        simulation.ui.requestAction(UI.ACTIONS.NEW_MAP);
        simulation.update();
        assert.strictEqual(simulation.state, SimulationState.WAITING);
        assert.strictEqual(simulation.search, null);
        assert.strictEqual(simulation.results.size, 0);
        assert.strictEqual(simulation.score, 3);
        assert.notStrictEqual(terrainSnapshot(simulation), restartedTerrain);
        assertValidFood(simulation);
        console.log(`[PASS] ${algorithm} em ${speed}x: 3 coletas, continuação, Reiniciar e Novo mapa`);
    }
}

const comparison = new Simulation();
comparison.generateNewMap();
comparison.startSearch();
reachCollection(comparison);
comparison.update();
reachCollection(comparison);
assert.ok(comparison.resultsStart !== comparison.grid.getCell(0, 0));
comparison.resetSimulation();
assert.strictEqual(comparison.results.size, 0, "Reiniciar não exibe resultados com outro início.");
comparison.startSearch();
reachCollection(comparison);
comparison.ui.setSelectedAlgorithm("UCS");
comparison.startSearch();
assert.strictEqual(comparison.results.size, 1, "Início e objetivo iguais preservam a comparação.");
reachCollection(comparison);
assert.strictEqual(comparison.results.size, 2);
comparison.ui.setSelectedAlgorithm("ASTAR");
comparison.update();
assert.strictEqual(comparison.searchAlgorithmName, "ASTAR", "A continuação respeita a seleção atual.");
assert.strictEqual(comparison.results.size, 0);
console.log("[PASS] comparação consistente e seleção explícita respeitada na continuação");

const blocked = new Simulation({ cols: 3, rows: 3 });
for (const neighbor of blocked.food.position.neighbors) {
    neighbor.setTerrain(Terrain.OBSTACLE);
}
blocked.startSearch();
for (let frame = 0; frame < 100; frame += 1) {
    blocked.update();
}
assert.strictEqual(blocked.state, SimulationState.WAITING);
assert.strictEqual(blocked.search.found, false);
assert.strictEqual(blocked.score, 0);
const failedSearch = blocked.search;
blocked.update();
assert.strictEqual(blocked.search, failedSearch);

const noFood = new Simulation({ cols: 1, rows: 1 });
noFood.startSearch();
assert.strictEqual(noFood.state, SimulationState.WAITING);
assert.strictEqual(noFood.search, null);

const isolatedAfterCollection = new Simulation({ cols: 2, rows: 1 });
isolatedAfterCollection.startSearch();
reachCollection(isolatedAfterCollection);
isolatedAfterCollection.grid.getCell(0, 0).setTerrain(Terrain.OBSTACLE);
isolatedAfterCollection.update();
assert.strictEqual(isolatedAfterCollection.food.position, null);
assert.strictEqual(isolatedAfterCollection.state, SimulationState.WAITING);
assert.strictEqual(isolatedAfterCollection.search, null);
assert.strictEqual(isolatedAfterCollection.score, 1);
isolatedAfterCollection.update();
assert.strictEqual(isolatedAfterCollection.score, 1);

const stopped = new Simulation();
stopped.setState(SimulationState.MOVING);
stopped.update();
assert.strictEqual(stopped.state, SimulationState.WAITING);
assert.strictEqual(stopped.score, 0);
console.log("[PASS] falha, ausência de comida e parada antes do objetivo não iniciam loop nem pontuam");
