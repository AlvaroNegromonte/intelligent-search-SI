const fs = require("fs");
const path = require("path");
const vm = require("vm");
const assert = require("assert");

// Exercita os mesmos contratos nas fontes e no fallback concatenado.
for (const entry of ["index.html", "web-editor/index.html"]) {
    const canvasSizes = [];
    const context = vm.createContext({
        createCanvas: (width, height) => canvasSizes.push([width, height]),
        resizeCanvas: (width, height, noRedraw) => {
            assert.strictEqual(noRedraw, true);
            canvasSizes.push([width, height]);
        },
        noise: () => 0.6,
        deltaTime: 1000 / 60
    });
    const htmlPath = path.resolve(__dirname, "..", entry);
    const html = fs.readFileSync(htmlPath, "utf8");

    for (const match of html.matchAll(/<script src="\.\/([^"]+)"/g)) {
        vm.runInContext(fs.readFileSync(path.resolve(path.dirname(htmlPath), match[1]), "utf8"), context);
    }

    const { Simulation, SimulationState, UI, setup, SearchVisualizer, getSimulation } = vm.runInContext(
        "({ Simulation, SimulationState, UI, setup, SearchVisualizer, getSimulation: () => simulation })",
        context
    );
    vm.runInContext("let seed = 42; Math.random = () => ((seed = seed * 16807 % 2147483647) - 1) / 2147483646;", context);

    setup();
    assert.deepStrictEqual(canvasSizes[0], [800, 600]);
    assert.deepStrictEqual({ ...getSimulation().ui.getGridDimensions() }, { cols: 40, rows: 30 });
    const simulation = new Simulation({ cols: 8, rows: 6 });
    assert.deepStrictEqual({ ...simulation.ui.getGridDimensions() }, { cols: 8, rows: 6 });
    simulation.score = 9;
    simulation.ui.setSelectedAlgorithm("UCS");
    simulation.ui.speed = 0.25;

    for (const state of Object.values(SimulationState)) {
        const oldGrid = simulation.grid;
        simulation.startSearch();
        simulation.agent.setPath([oldGrid.getCell(0, 0), oldGrid.getCell(1, 0)]);
        simulation.results.set("BFS", { found: true });
        simulation.setState(state);
        simulation.paused = true;
        simulation.ui.gridDimensions = { cols: 12, rows: 9 };
        simulation.ui.requestAction(UI.ACTIONS.APPLY_GRID);
        simulation.update();
        assert.notStrictEqual(simulation.grid, oldGrid);
        assert.strictEqual(simulation.grid.cells.length, 9);
        assert.ok(simulation.grid.cells.every((row) => row.length === 12));
        assert.deepStrictEqual(canvasSizes.at(-1), [240, 180]);
        assert.strictEqual(simulation.state, SimulationState.WAITING);
        assert.strictEqual(simulation.paused, false);
        assert.strictEqual(simulation.search, null);
        assert.strictEqual(simulation.searchAlgorithmName, null);
        assert.strictEqual(simulation.stepBudget, 0);
        assert.strictEqual(simulation.results.size, 0);
        assert.strictEqual(simulation.resultsStart, null);
        assert.strictEqual(simulation.resultsGoal, null);
        assert.strictEqual(simulation.agent.path.length, 0);
        assert.strictEqual(simulation.agent.isMoving, false);
        assert.strictEqual(simulation.agent.position, simulation.initialAgentCell);
        assert.strictEqual(simulation.grid.getCell(simulation.agent.position.col, simulation.agent.position.row), simulation.agent.position);
        assert.strictEqual(simulation.grid.getCell(simulation.food.position.col, simulation.food.position.row), simulation.food.position);
        assert.ok(simulation.grid.isReachable(simulation.agent.position, simulation.food.position));
        assert.notStrictEqual(simulation.agent.position, simulation.food.position);
        assert.strictEqual(simulation.score, 9);
        assert.strictEqual(simulation.ui.getSelectedAlgorithm(), "UCS");
        assert.strictEqual(simulation.ui.getSpeed(), 0.25);
    }

    const grid = simulation.grid;
    const resizeCount = canvasSizes.length;
    for (const invalid of [null, {}, { cols: 0, rows: 9 }, { cols: 12, rows: -1 },
        { cols: 101, rows: 9 }, { cols: 12, rows: 101 }, { cols: 1.5, rows: 9 },
        { cols: "12", rows: 9 }, { cols: NaN, rows: 9 }, { cols: 12, rows: Infinity }]) {
        assert.strictEqual(simulation.applyGridSize(invalid), false);
        assert.strictEqual(simulation.grid, grid);
        assert.strictEqual(canvasSizes.length, resizeCount);
    }

    simulation.ui.gridDimensions = { cols: 20, rows: 15 };
    for (const action of [UI.ACTIONS.RESET, UI.ACTIONS.NEW_MAP]) {
        simulation.ui.requestAction(action);
        simulation.update();
        assert.strictEqual(simulation.grid.cols, 12);
        assert.strictEqual(simulation.grid.rows, 9);
    }

    for (const dimensions of [{ cols: 1, rows: 1 }, { cols: 1, rows: 10 },
        { cols: 10, rows: 1 }, { cols: 100, rows: 100 }]) {
        assert.strictEqual(simulation.applyGridSize(dimensions), true);
        assert.deepStrictEqual(canvasSizes.at(-1), [dimensions.cols * 20, dimensions.rows * 20]);
        if (dimensions.cols === 1 && dimensions.rows === 1) {
            simulation.startSearch();
            assert.strictEqual(simulation.food.position, null);
            assert.strictEqual(simulation.search, null);
            assert.strictEqual(simulation.state, SimulationState.WAITING);
        } else {
            assert.ok(simulation.grid.isReachable(simulation.agent.position, simulation.food.position));
        }
    }

    // Um corredor permite verificar todos os algoritmos e estados sem sorteio de obstáculos.
    for (const name of simulation.ui.availableAlgorithms) {
        const corridor = new Simulation({ cols: 6, rows: 1 });
        corridor.agent.setPosition(corridor.grid.getCell(0, 0));
        corridor.initialAgentCell = corridor.agent.position;
        corridor.food.setPosition(corridor.grid.getCell(5, 0));
        corridor.ui.setSelectedAlgorithm(name);
        corridor.startSearch();
        corridor.update();
        corridor.ui.requestAction(UI.ACTIONS.TOGGLE_PAUSE);
        corridor.update();
        const visited = corridor.search.visited.length;
        const budget = corridor.stepBudget;
        for (let frame = 0; frame < 10; frame += 1) {
            corridor.update();
        }
        assert.strictEqual(corridor.search.visited.length, visited);
        assert.strictEqual(corridor.stepBudget, budget);
        assert.strictEqual(corridor.getStatus().paused, true);
        assert.ok(corridor.ui.buildStatusHtml(corridor.getStatus()).includes("Pausado"));
        corridor.ui.requestAction(UI.ACTIONS.TOGGLE_PAUSE);
        corridor.update();
        assert.ok(corridor.search.visited.length > visited);
        while (corridor.state === SimulationState.SEARCHING) {
            corridor.update();
        }
        corridor.ui.requestAction(UI.ACTIONS.TOGGLE_PAUSE);
        corridor.update();
        const position = corridor.agent.position;
        const progress = corridor.agent.stepProgress;
        for (let frame = 0; frame < 10; frame += 1) {
            corridor.update();
        }
        assert.strictEqual(corridor.agent.position, position);
        assert.strictEqual(corridor.agent.stepProgress, progress);
        const visualizer = corridor.searchVisualizer;
        visualizer.updatePathAnimation(corridor.search);
        visualizer.updatePathAnimation(corridor.search);
        const pathFrames = visualizer.pathFrames;
        visualizer.updatePathAnimation(corridor.search, corridor.paused);
        assert.strictEqual(visualizer.pathFrames, pathFrames);
        corridor.ui.requestAction(UI.ACTIONS.TOGGLE_PAUSE);
        corridor.update();
        assert.ok(corridor.agent.stepProgress > progress);
        visualizer.updatePathAnimation(corridor.search, corridor.paused);
        assert.strictEqual(visualizer.pathFrames, pathFrames + 1);
        while (corridor.state === SimulationState.MOVING) {
            corridor.update();
        }
        assert.strictEqual(corridor.score, 1);
        corridor.ui.requestAction(UI.ACTIONS.TOGGLE_PAUSE);
        corridor.update();
        const food = corridor.food.position;
        corridor.update();
        assert.strictEqual(corridor.state, SimulationState.COLLECTING);
        assert.strictEqual(corridor.food.position, food);
        corridor.ui.requestAction(UI.ACTIONS.TOGGLE_PAUSE);
        corridor.update();
        assert.strictEqual(corridor.state, SimulationState.SEARCHING);
        assert.strictEqual(corridor.search.start, food);
    }

    simulation.paused = true;
    simulation.ui.requestAction(UI.ACTIONS.START);
    simulation.update();
    assert.strictEqual(simulation.paused, false);
    for (const action of [UI.ACTIONS.RESET, UI.ACTIONS.NEW_MAP, UI.ACTIONS.APPLY_GRID]) {
        simulation.paused = true;
        simulation.ui.requestAction(action);
        simulation.update();
        assert.strictEqual(simulation.paused, false);
    }
    console.log(`[PASS] ${entry}: dimensoes, validacao, reinicio, limites e pausa com cinco algoritmos`);
}
