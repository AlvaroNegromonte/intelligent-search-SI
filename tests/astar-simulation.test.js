const fs = require("fs");
const path = require("path");
const vm = require("vm");
const assert = require("assert");

// Carrega os scripts no contexto global na mesma ordem do index.html.
function loadScript(relativePath) {
    const fullPath = path.resolve(__dirname, "..", relativePath);
    const code = fs.readFileSync(fullPath, "utf-8");
    vm.runInThisContext(code, { filename: fullPath });
}

// Mocks das funções de desenho do p5.js. Sem createDiv, a UI não cria controles.
for (const name of ["stroke", "strokeWeight", "fill", "rect", "noStroke", "noFill", "circle",
    "push", "pop", "line", "point"]) {
    global[name] = () => {};
}

// Ruído determinístico e variado para gerar mapas com todos os terrenos.
let seed = 1;
function seededRandom() {
    seed = (seed * 16807) % 2147483647;
    return (seed - 1) / 2147483646;
}
global.noise = (x, y) => (Math.sin(x * 1.7 + y * 2.3) + 1) / 2;

const sources = [
    "src/world/Terrain.js",
    "src/world/Cell.js",
    "src/world/Grid.js",
    "src/search/SearchAlgorithm.js",
    "src/search/PriorityQueue.js",
    "src/search/Heuristics.js",
    "src/search/BFS.js",
    "src/search/DFS.js",
    "src/search/UniformCostSearch.js",
    "src/search/GreedySearch.js",
    "src/search/AStar.js",
    "src/agent/Agent.js",
    "src/entities/Food.js",
    "src/ui/UI.js",
    "src/ui/SearchVisualizer.js",
    "src/core/SimulationState.js",
    "src/core/Simulation.js"
];

for (const source of sources) {
    loadScript(source);
}

console.log("=== Executando Testes de A*, UI e Simulação ===");

let passed = 0;
let failed = 0;

function test(name, fn) {
    try {
        fn();
        console.log(`  [PASS] ${name}`);
        passed++;
    } catch (err) {
        console.error(`  [FAIL] ${name}`);
        console.error(err);
        failed++;
    }
}

function runToEnd(search, limit = 5000) {
    let steps = 0;

    while (!search.isFinished() && steps < limit) {
        search.step();
        steps++;
    }

    return steps;
}

function pathCost(pathCells) {
    return pathCells.slice(1).reduce((total, cell) => total + cell.cost, 0);
}

function withSeededRandom(fn) {
    const originalRandom = Math.random;
    Math.random = seededRandom;

    try {
        return fn();
    } finally {
        Math.random = originalRandom;
    }
}

function runSimulation(simulation, maxFrames = 20000) {
    let frames = 0;

    while (frames < maxFrames
        && (simulation.state === SimulationState.SEARCHING || simulation.state === SimulationState.MOVING)) {
        simulation.update();
        frames++;
    }

    return frames;
}

// 1. A*
test("AStar processa no máximo um nó por step() e mantém Cells na fronteira", () => {
    const grid = new Grid(5, 5, 40);
    const astar = new AStar(grid, grid.getCell(0, 0), grid.getCell(4, 4));

    assert.deepStrictEqual(astar.frontier, [grid.getCell(0, 0)]);
    astar.step();
    assert.strictEqual(astar.visited.length, 1);
    astar.step();
    assert.strictEqual(astar.visited.length, 2);
    assert.ok(astar.frontier.every((cell) => cell instanceof Cell));
});

test("AStar usa o custo do terreno mais barato para escalar a Manhattan", () => {
    assert.strictEqual(AStar.getMinimumStepCost(), Terrain.getCost(Terrain.SAND));

    const grid = new Grid(5, 5, 40);
    const astar = new AStar(grid, grid.getCell(0, 0), grid.getCell(3, 4));
    assert.strictEqual(astar.heuristic(grid.getCell(0, 0)), 7 * Terrain.getCost(Terrain.SAND));
});

test("AStar desvia da água quando contornar é mais barato", () => {
    const grid = new Grid(5, 3, 40);

    for (let col = 1; col < 4; col++) {
        grid.setTerrain(col, 1, Terrain.WATER);
    }

    const start = grid.getCell(0, 1);
    const goal = grid.getCell(4, 1);
    const astar = new AStar(grid, start, goal);
    runToEnd(astar);

    assert.strictEqual(astar.found, true);
    // Contornar: 6 passos de areia (60) contra 3 águas + 1 areia (310).
    assert.strictEqual(pathCost(astar.getPath()), 60);
    assert.ok(astar.getPath().every((cell) => cell.terrainType === Terrain.SAND));
});

test("AStar encontra o mesmo custo ótimo da UCS visitando no máximo os mesmos nós", () => {
    withSeededRandom(() => {
        for (let trial = 0; trial < 25; trial++) {
            const grid = new Grid(20, 15, 40);
            grid.generateProcedural();
            const start = grid.getCell(0, 0);
            const goal = grid.getCell(19, 14);

            const ucs = new UniformCostSearch(grid, start, goal);
            const astar = new AStar(grid, start, goal);
            runToEnd(ucs);
            runToEnd(astar);

            assert.strictEqual(astar.found, ucs.found);
            assert.strictEqual(pathCost(astar.getPath()), pathCost(ucs.getPath()));
            assert.ok(astar.visited.length <= ucs.visited.length);
        }
    });
});

test("AStar termina sem caminho quando o objetivo é inalcançável", () => {
    const grid = new Grid(5, 5, 40);
    grid.setTerrain(3, 4, Terrain.OBSTACLE);
    grid.setTerrain(4, 3, Terrain.OBSTACLE);

    const astar = new AStar(grid, grid.getCell(0, 0), grid.getCell(4, 4));
    runToEnd(astar);

    assert.strictEqual(astar.isFinished(), true);
    assert.strictEqual(astar.found, false);
    assert.deepStrictEqual(astar.getPath(), []);
});

test("AStar.reset() restaura o estado inicial", () => {
    const grid = new Grid(5, 5, 40);
    const start = grid.getCell(0, 0);
    const astar = new AStar(grid, start, grid.getCell(4, 4));

    runToEnd(astar);
    astar.reset();

    assert.deepStrictEqual(astar.frontier, [start]);
    assert.strictEqual(astar.visited.length, 0);
    assert.strictEqual(astar.isFinished(), false);

    runToEnd(astar);
    assert.strictEqual(astar.found, true);
});

// 2. UI
test("UI enfileira ações e as entrega uma única vez", () => {
    const ui = new UI();
    ui.requestAction(UI.ACTIONS.START);
    ui.requestAction(UI.ACTIONS.NEW_MAP);

    assert.deepStrictEqual(ui.consumeActions(), [UI.ACTIONS.START, UI.ACTIONS.NEW_MAP]);
    assert.deepStrictEqual(ui.consumeActions(), []);
});

test("UI aceita apenas os identificadores de algoritmo da Simulation", () => {
    const ui = new UI();
    assert.strictEqual(ui.setSelectedAlgorithm("ASTAR"), true);
    assert.strictEqual(ui.getSelectedAlgorithm(), "ASTAR");
    assert.strictEqual(ui.setSelectedAlgorithm("XYZ"), false);
    assert.strictEqual(ui.getSelectedAlgorithm(), "ASTAR");

    for (const name of ui.availableAlgorithms) {
        assert.ok(UI.ALGORITHM_LABELS[name]);
    }
});

// 3. Simulação
test("Simulation começa em WAITING sem busca", () => {
    const simulation = new Simulation();
    assert.strictEqual(simulation.state, SimulationState.WAITING);
    assert.strictEqual(simulation.search, null);
    assert.strictEqual(simulation.agent.position, simulation.grid.getCell(0, 0));
});

test("Simulation percorre WAITING → SEARCHING → MOVING → COLLECTING com todos os algoritmos", () => {
    withSeededRandom(() => {
        const simulation = new Simulation();
        simulation.generateNewMap();

        for (const name of simulation.ui.availableAlgorithms) {
            simulation.ui.setSelectedAlgorithm(name);
            simulation.ui.requestAction(UI.ACTIONS.START);
            simulation.update();
            assert.strictEqual(simulation.state, SimulationState.SEARCHING, name);

            const seenStates = new Set([simulation.state]);

            while (simulation.state === SimulationState.SEARCHING
                || simulation.state === SimulationState.MOVING) {
                simulation.update();
                seenStates.add(simulation.state);
            }

            assert.ok(seenStates.has(SimulationState.MOVING), name);
            assert.strictEqual(simulation.state, SimulationState.COLLECTING, name);
            assert.strictEqual(simulation.agent.position, simulation.food.position, name);
            assert.ok(simulation.results.get(name).found, name);
        }

        assert.strictEqual(simulation.score, simulation.ui.availableAlgorithms.length);
        assert.strictEqual(simulation.results.size, 5);

        // Os algoritmos ótimos em custo devem empatar; nenhum outro pode ser mais barato.
        const ucsCost = simulation.results.get("UCS").pathCost;
        assert.strictEqual(simulation.results.get("ASTAR").pathCost, ucsCost);

        for (const result of simulation.results.values()) {
            assert.ok(result.pathCost >= ucsCost);
        }

        // BFS minimiza passos.
        const bfsSteps = simulation.results.get("BFS").pathSteps;

        for (const result of simulation.results.values()) {
            assert.ok(result.pathSteps >= bfsSteps);
        }
    });
});

test("Simulation avança um step() por quadro em 1x e vários em velocidade maior", () => {
    const simulation = new Simulation();
    simulation.startSearch();
    simulation.update();
    assert.strictEqual(simulation.search.visited.length, 1);

    simulation.ui.speed = 4;
    simulation.update();
    assert.strictEqual(simulation.search.visited.length, 5);

    simulation.ui.speed = 0.25;
    simulation.update();
    simulation.update();
    simulation.update();
    assert.strictEqual(simulation.search.visited.length, 5);
    simulation.update();
    assert.strictEqual(simulation.search.visited.length, 6);
});

test("Simulation registra o custo do caminho como custo de entrada nas células", () => {
    const simulation = new Simulation();
    const grid = simulation.grid;
    const pathCells = [grid.getCell(0, 0), grid.getCell(1, 0), grid.getCell(2, 0)];
    grid.setTerrain(1, 0, Terrain.MUD);

    assert.strictEqual(simulation.getPathCost(pathCells), 50 + 10);
    assert.strictEqual(simulation.getPathCost([]), 0);
});

test("Reiniciar gera outro mapa e limpa a busca em qualquer estado", () => {
    withSeededRandom(() => {
        for (const state of Object.values(SimulationState)) {
            const simulation = new Simulation();
            simulation.generateNewMap();
            simulation.ui.setSelectedAlgorithm("ASTAR");
            simulation.ui.speed = 0.25;

            if (state !== SimulationState.WAITING) {
                simulation.startSearch();

                for (let frame = 0; simulation.state !== state && frame < 20000; frame += 1) {
                    simulation.update();
                }
            }

            assert.strictEqual(simulation.state, state);
            const terrain = JSON.stringify(simulation.grid.cells.map((row) => row.map((cell) => cell.terrainType)));
            const score = simulation.score;
            simulation.ui.requestAction(UI.ACTIONS.RESET);
            simulation.update();

            assert.strictEqual(simulation.state, SimulationState.WAITING);
            assert.strictEqual(simulation.search, null);
            assert.strictEqual(simulation.searchAlgorithmName, null);
            assert.strictEqual(simulation.stepBudget, 0);
            assert.strictEqual(simulation.agent.position, simulation.grid.getCell(0, 0));
            assert.strictEqual(simulation.agent.isMoving, false);
            assert.deepStrictEqual(simulation.agent.path, []);
            assert.strictEqual(simulation.results.size, 0);
            assert.strictEqual(simulation.resultsStart, null);
            assert.strictEqual(simulation.resultsGoal, null);
            assert.strictEqual(simulation.score, score);
            assert.strictEqual(simulation.ui.getSelectedAlgorithm(), "ASTAR");
            assert.strictEqual(simulation.ui.getSpeed(), 0.25);
            assert.ok(simulation.food.position.walkable);
            assert.notStrictEqual(simulation.food.position, simulation.agent.position);
            assert.ok(simulation.grid.isReachable(simulation.agent.position, simulation.food.position));
            assert.notStrictEqual(JSON.stringify(simulation.grid.cells.map((row) => row.map((cell) => cell.terrainType))), terrain);
        }
    });
});

test("Novo mapa limpa a busca e a comparação", () => {
    withSeededRandom(() => {
        const simulation = new Simulation();
        simulation.startSearch();
        runSimulation(simulation);

        simulation.ui.requestAction(UI.ACTIONS.NEW_MAP);
        simulation.update();

        assert.strictEqual(simulation.state, SimulationState.WAITING);
        assert.strictEqual(simulation.search, null);
        assert.strictEqual(simulation.results.size, 0);
        assert.ok(simulation.food.position);
    });
});

test("Simulation volta para WAITING quando a busca falha", () => {
    const simulation = new Simulation({ cols: 3, rows: 3 });
    const food = simulation.food.position;

    // Cerca a comida com obstáculos depois do sorteio.
    for (const neighbor of food.neighbors) {
        neighbor.setTerrain(Terrain.OBSTACLE);
    }

    simulation.startSearch();
    runSimulation(simulation);

    assert.strictEqual(simulation.state, SimulationState.WAITING);
    assert.strictEqual(simulation.results.get("BFS").found, false);
    assert.strictEqual(simulation.agent.isMoving, false);
});

test("Simulation.getStatus expõe os dados que a UI exibe", () => {
    const simulation = new Simulation();
    simulation.startSearch();
    simulation.update();

    const status = simulation.getStatus();
    assert.strictEqual(status.state, SimulationState.SEARCHING);
    assert.strictEqual(status.algorithm, "BFS");
    assert.strictEqual(status.visited, 1);
    assert.ok(status.frontier > 0);

    const html = simulation.ui.buildStatusHtml(status);
    assert.ok(html.includes(UI.STATE_LABELS.SEARCHING));
    assert.ok(html.includes(UI.ALGORITHM_LABELS.BFS));
});

// Resumo dos testes
if (failed > 0) {
    console.error(`\nTestes finalizados: ${passed} passaram, ${failed} falharam.`);
    process.exit(1);
} else {
    console.log(`\nTodos os testes finalizados com sucesso: ${passed} passaram.`);
}
