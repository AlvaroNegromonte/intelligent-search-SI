const fs = require("fs");
const path = require("path");
const vm = require("vm");
const assert = require("assert");

for (const entry of ["index.html", "web-editor/index.html"]) {
    const drawCalls = [];
    const context = vm.createContext({ rect: (...args) => drawCalls.push(args) });
    for (const name of ["push", "pop", "noFill", "stroke", "strokeWeight"]) {
        context[name] = () => {};
    }
    const htmlPath = path.resolve(__dirname, "..", entry);
    for (const match of fs.readFileSync(htmlPath, "utf8").matchAll(/<script src="\.\/([^"]+)"/g)) {
        vm.runInContext(fs.readFileSync(path.resolve(path.dirname(htmlPath), match[1]), "utf8"), context);
    }
    const { Grid, Terrain, AStar, UniformCostSearch, PriorityQueue, SearchVisualizer } = vm.runInContext(
        "({ Grid, Terrain, AStar, UniformCostSearch, PriorityQueue, SearchVisualizer })", context
    );
    const cost = (search) => search.getPath().slice(1).reduce((sum, cell) => sum + cell.cost, 0);
    function run(search) {
        let calls = 0;
        while (!search.isFinished() && calls < 20000) {
            const expansions = search.expansions;
            search.step();
            assert.ok(search.expansions - expansions <= 1);
            calls += 1;
        }
        assert.ok(search.isFinished(), "A busca deve terminar dentro do limite.");
        assert.strictEqual(new Set(search.visited).size, search.visited.length);
        assert.strictEqual(new Set(search.frontier).size, search.frontier.length);
        if (search.found) {
            const cells = search.getPath();
            assert.strictEqual(cells[0], search.start);
            assert.strictEqual(cells.at(-1), search.goal);
            assert.strictEqual(new Set(cells).size, cells.length);
            for (let i = 1; i < cells.length; i += 1) {
                assert.ok(search.grid.getNeighbors(cells[i - 1]).includes(cells[i]));
            }
        } else {
            assert.strictEqual(search.getPath().length, 0);
        }
    }

    // O desempate nunca pode inverter dois valores f distintos.
    const queue = new PriorityQueue();
    queue.enqueue("near", 10.00000001, 0);
    queue.enqueue("cheap", 10, 100000);
    assert.strictEqual(queue.dequeue(), "cheap");
    queue.clear();
    queue.enqueue("far", 10, 50);
    queue.enqueue("near", 10, 10);
    assert.strictEqual(queue.dequeue(), "near");
    queue.enqueue("far", 5, 50);
    assert.strictEqual(queue.size(), 1);
    assert.strictEqual(queue.dequeue(), "far");

    const small = new Grid(3, 2, 20);
    small.setTerrain(1, 0, Terrain.MUD);
    const optimal = new AStar(small, small.getCell(0, 0), small.getCell(2, 0), 1);
    const weighted = new AStar(small, optimal.start, optimal.goal, 5);
    run(optimal);
    run(weighted);
    assert.strictEqual(cost(optimal), 40);
    assert.strictEqual(cost(weighted), 60);
    for (const invalid of [0, -1, 5.01, NaN, Infinity, "2", null]) {
        assert.throws(() => new AStar(small, optimal.start, optimal.goal, invalid));
    }

    const fixture = new Grid(8, 6, 20);
    const terrainCodes = { S: Terrain.SAND, M: Terrain.MUD, W: Terrain.WATER, "#": Terrain.OBSTACLE };
    ["SSMSWWSW", "#MMS##SS", "W#SMMWWM", "SSW#SSWS", "WWWSSSSS", "#SSMWS#S"].forEach((row, y) => {
        [...row].forEach((type, x) => fixture.setTerrain(x, y, terrainCodes[type]));
    });
    const reopened = new AStar(fixture, fixture.getCell(0, 3), fixture.getCell(7, 3), 2);
    const changes = [];
    const visualizer = new SearchVisualizer(20);
    while (!reopened.isFinished()) {
        const closedCosts = new Map([...reopened.closed].map((cell) => [cell, reopened.costSoFar.get(cell)]));
        reopened.step();
        for (const [cell, previousCost] of closedCosts) {
            if (!reopened.closed.has(cell)) {
                assert.ok(reopened.frontier.includes(cell));
                assert.ok(reopened.costSoFar.get(cell) < previousCost);
                changes.push([cell.col, cell.row, previousCost, reopened.costSoFar.get(cell)]);
            }
        }
        if (!reopened.finished && reopened.currentCell !== reopened.visited.at(-1)) {
            drawCalls.length = 0;
            visualizer.drawCurrent(reopened);
            assert.deepStrictEqual(drawCalls[0].slice(0, 2), [reopened.currentCell.col * 20 + 2, reopened.currentCell.row * 20 + 2]);
        }
    }
    assert.deepStrictEqual(changes, [[4, 3, 230, 210], [5, 3, 240, 220]]);
    assert.strictEqual(reopened.reopened, 2);
    assert.strictEqual(reopened.expansions, 22);
    assert.strictEqual(reopened.visited.length, 21);
    run(reopened);
    reopened.reset();
    assert.strictEqual(reopened.weight, 2);
    assert.strictEqual(reopened.expansions, 0);
    assert.strictEqual(reopened.reopened, 0);
    assert.strictEqual(reopened.currentCell, null);
    assert.strictEqual(reopened.visited.length, 0);
    run(reopened);
    assert.strictEqual(reopened.reopened, 2);

    const sameCell = new AStar(small, optimal.start, optimal.start, 1);
    run(sameCell);
    assert.strictEqual(sameCell.visited.length, 1);
    assert.strictEqual(sameCell.expansions, 0);
    const blocked = new Grid(3, 1, 20);
    blocked.setTerrain(1, 0, Terrain.OBSTACLE);
    const failure = new AStar(blocked, blocked.getCell(0, 0), blocked.getCell(2, 0), 1);
    run(failure);
    assert.strictEqual(failure.found, false);
    assert.strictEqual(failure.expansions, 1);

    let seed = 314;
    const random = () => ((seed = seed * 16807 % 2147483647) - 1) / 2147483646;
    const totals = new Map([1, 1.5, 2, 3, 5].map((weight) => [weight, { expansions: 0, cost: 0 }]));
    let referenceCost = 0;
    let reachable = 0;
    for (let trial = 0; trial < 60; trial += 1) {
        const grid = new Grid(12, 9, 20);
        for (const row of grid.cells) {
            for (const cell of row) {
                const value = random();
                cell.setTerrain(value < 0.15 ? Terrain.OBSTACLE : value < 0.3 ? Terrain.WATER
                    : value < 0.5 ? Terrain.MUD : Terrain.SAND);
            }
        }
        const start = grid.getCell(Math.floor(random() * 12), Math.floor(random() * 9));
        const goal = grid.getCell(Math.floor(random() * 12), Math.floor(random() * 9));
        start.setTerrain(Terrain.SAND);
        goal.setTerrain(Terrain.SAND);
        const ucs = new UniformCostSearch(grid, start, goal);
        run(ucs);
        if (ucs.found) {
            reachable += 1;
            referenceCost += cost(ucs);
        }
        for (const [weight, total] of totals) {
            const astar = new AStar(grid, start, goal, weight);
            run(astar);
            assert.strictEqual(astar.found, ucs.found);
            if (ucs.found) {
                assert.ok(cost(astar) >= cost(ucs));
                assert.ok(cost(astar) <= weight * cost(ucs));
                if (weight === 1) {
                    assert.strictEqual(cost(astar), cost(ucs));
                }
                total.expansions += astar.expansions;
                total.cost += cost(astar);
            }
        }
    }
    console.log(`[PASS] ${entry}: A* padrao igual a UCS, reaberturas, desempate exato e 60 mapas`);
    if (entry === "index.html") {
        console.log(JSON.stringify({ reachable, referenceCost, weights: [...totals].map(([weight, total]) => ({ weight, ...total })) }));
    }
}
