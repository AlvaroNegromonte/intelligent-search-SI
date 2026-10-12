const fs = require("fs");
const path = require("path");
const vm = require("vm");
const assert = require("assert");

for (const entry of ["index.html", "web-editor/index.html"]) {
    const context = vm.createContext({ noise: () => 0.6, deltaTime: 1000 / 60 });
    const htmlPath = path.resolve(__dirname, "..", entry);
    for (const match of fs.readFileSync(htmlPath, "utf8").matchAll(/<script src="\.\/([^"]+)"/g)) {
        vm.runInContext(fs.readFileSync(path.resolve(path.dirname(htmlPath), match[1]), "utf8"), context);
    }
    const { Simulation, SimulationState, Terrain, UI, AStar } = vm.runInContext(
        "({ Simulation, SimulationState, Terrain, UI, AStar })", context
    );
    function scenario() {
        const simulation = new Simulation({ cols: 3, rows: 2 });
        simulation.grid.setTerrain(1, 0, Terrain.MUD);
        simulation.initialAgentCell = simulation.grid.getCell(0, 0);
        simulation.agent.setPosition(simulation.initialAgentCell);
        simulation.food.setPosition(simulation.grid.getCell(2, 0));
        simulation.ui.setSelectedAlgorithm("ASTAR");
        simulation.score = 7;
        return simulation;
    }

    for (const speed of [0.25, 1, 4]) {
        const simulation = scenario();
        const start = simulation.agent.position;
        const goal = simulation.food.position;
        const terrain = JSON.stringify(simulation.grid.cells.map((row) => row.map((cell) => cell.terrainType)));
        simulation.ui.speed = speed;
        simulation.ui.requestAction(UI.ACTIONS.COMPARE_ASTAR);
        simulation.update();
        assert.strictEqual(simulation.comparing, true);
        assert.strictEqual(simulation.searchAlgorithmName, "UCS");
        assert.strictEqual(simulation.search.visited.length, Math.floor(speed));
        simulation.ui.requestAction(UI.ACTIONS.TOGGLE_PAUSE);
        simulation.update();
        const pausedSearch = simulation.search;
        const pausedExpansions = simulation.search.expansions;
        const queueLength = simulation.comparisonQueue.length;
        for (let frame = 0; frame < 10; frame += 1) {
            simulation.update();
        }
        assert.strictEqual(simulation.search, pausedSearch);
        assert.strictEqual(simulation.search.expansions, pausedExpansions);
        assert.strictEqual(simulation.comparisonQueue.length, queueLength);
        simulation.ui.requestAction(UI.ACTIONS.TOGGLE_PAUSE);
        simulation.update();
        let frames = 0;
        while (simulation.comparing && frames < 1000) {
            assert.strictEqual(simulation.agent.position, start);
            assert.strictEqual(simulation.food.position, goal);
            assert.strictEqual(simulation.search.start, start);
            assert.strictEqual(simulation.search.goal, goal);
            assert.strictEqual(simulation.state, SimulationState.SEARCHING);
            simulation.update();
            frames += 1;
        }
        assert.ok(frames < 1000);
        assert.strictEqual(simulation.state, SimulationState.WAITING);
        assert.strictEqual(simulation.agent.position, start);
        assert.strictEqual(simulation.agent.isMoving, false);
        assert.strictEqual(simulation.score, 7);
        assert.strictEqual(simulation.food.position, goal);
        assert.strictEqual(simulation.results.size, UI.COMPARISON_WEIGHTS.length + 1);
        assert.strictEqual(simulation.results.get("UCS").pathCost, 40);
        assert.strictEqual(simulation.results.get("ASTAR:1").pathCost, 40);
        assert.strictEqual(simulation.results.get("ASTAR:5").pathCost, 60);
        assert.strictEqual(simulation.ui.getAStarWeight(), AStar.DEFAULT_WEIGHT);
        assert.ok(simulation.results.has(`ASTAR:${AStar.DEFAULT_WEIGHT}`));
        assert.strictEqual(simulation.ui.getSelectedAlgorithm(), "ASTAR");
        assert.strictEqual(JSON.stringify(simulation.grid.cells.map((row) => row.map((cell) => cell.terrainType))), terrain);
        for (const weight of UI.COMPARISON_WEIGHTS) {
            assert.strictEqual(simulation.results.get(`ASTAR:${weight}`).weight, weight);
        }
        const html = simulation.ui.buildResultsHtml(simulation.results);
        assert.ok(html.includes("50,0%"));
        assert.ok(html.includes("A* padrão (1x)"));
        assert.ok(html.includes("A* ponderado (5x)"));
        assert.ok(html.includes("Expansões"));
    }

    // O slider afeta apenas a proxima busca, inclusive durante uma comparacao.
    const manual = scenario();
    assert.strictEqual(manual.ui.setAStarWeight(1.5), true);
    manual.startSearch();
    assert.strictEqual(manual.search.weight, 1.5);
    manual.ui.setAStarWeight(5);
    assert.strictEqual(manual.getStatus().weight, 1.5);
    while (manual.state === SimulationState.SEARCHING) {
        manual.update();
    }
    assert.strictEqual(manual.results.get("ASTAR:1.5").weight, 1.5);
    manual.startSearch();
    assert.strictEqual(manual.search.weight, 5);
    while (manual.state === SimulationState.SEARCHING) {
        manual.update();
    }
    assert.strictEqual(manual.results.size, 2);
    assert.ok(!manual.ui.buildResultsHtml(manual.results).includes("50,0%"), "Sem UCS nao ha percentual de referencia.");
    for (const invalid of [0, 6, Infinity, NaN, "2"]) {
        assert.strictEqual(manual.ui.setAStarWeight(invalid), false);
        assert.strictEqual(manual.ui.getAStarWeight(), 5);
    }
    manual.startComparison();
    manual.ui.setAStarWeight(3);
    while (manual.comparing) {
        manual.update();
    }
    assert.strictEqual(manual.results.get("ASTAR:2").weight, 2);
    assert.strictEqual(manual.ui.getAStarWeight(), 3);

    for (const action of [UI.ACTIONS.START, UI.ACTIONS.RESET, UI.ACTIONS.NEW_MAP, UI.ACTIONS.APPLY_GRID]) {
        const simulation = scenario();
        simulation.startComparison();
        simulation.paused = true;
        simulation.ui.requestAction(action);
        simulation.update();
        assert.strictEqual(simulation.comparing, false);
        assert.strictEqual(simulation.comparisonQueue.length, 0);
        assert.strictEqual(simulation.paused, false);
        assert.strictEqual(simulation.score, 7);
        if (action === UI.ACTIONS.START) {
            assert.strictEqual(simulation.searchAlgorithmName, "ASTAR");
            assert.strictEqual(simulation.search.weight, AStar.DEFAULT_WEIGHT);
        } else {
            assert.strictEqual(simulation.results.size, 0);
            assert.strictEqual(simulation.state, SimulationState.WAITING);
        }
    }

    const blocked = new Simulation({ cols: 3, rows: 1 });
    blocked.initialAgentCell = blocked.grid.getCell(0, 0);
    blocked.food.setPosition(blocked.grid.getCell(2, 0));
    blocked.grid.setTerrain(1, 0, Terrain.OBSTACLE);
    blocked.startComparison();
    while (blocked.comparing) {
        blocked.update();
    }
    assert.strictEqual(blocked.results.size, UI.COMPARISON_WEIGHTS.length + 1);
    assert.ok([...blocked.results.values()].every((result) => !result.found));
    assert.ok(blocked.ui.buildResultsHtml(blocked.results).includes("sem caminho"));
    assert.strictEqual(blocked.state, SimulationState.WAITING);
    const noFood = new Simulation({ cols: 1, rows: 1 });
    noFood.startComparison();
    assert.strictEqual(noFood.comparing, false);
    assert.strictEqual(noFood.search, null);

    const zeroCost = scenario();
    zeroCost.food.setPosition(zeroCost.initialAgentCell);
    zeroCost.startComparison();
    while (zeroCost.comparing) {
        zeroCost.update();
    }
    assert.ok(zeroCost.ui.buildResultsHtml(zeroCost.results).includes("0,0%"));
    assert.ok(!zeroCost.ui.buildResultsHtml(zeroCost.results).includes("NaN"));
    assert.strictEqual(zeroCost.results.get("UCS").expansions, 0);
    console.log(`[PASS] ${entry}: comparacao incremental, pesos, percentual, pausa, cancelamento e falhas`);
}
