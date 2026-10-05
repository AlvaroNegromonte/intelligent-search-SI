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

// Mocks das funções de desenho do p5.js.
let lastCircle = null;
global.stroke = () => {};
global.strokeWeight = () => {};
global.fill = () => {};
global.rect = () => {};
global.noStroke = () => {};
global.circle = (x, y, d) => {
    lastCircle = { x, y, d };
};
global.noise = () => 0.6;

loadScript("src/world/Terrain.js");
loadScript("src/world/Cell.js");
loadScript("src/world/Grid.js");
loadScript("src/search/SearchAlgorithm.js");
loadScript("src/search/PriorityQueue.js");
loadScript("src/search/Heuristics.js");
loadScript("src/search/GreedySearch.js");
loadScript("src/agent/Agent.js");

console.log("=== Executando Testes de Heurística, Gulosa e Agente ===");

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

function runToEnd(search, limit = 1000) {
    let steps = 0;

    while (!search.isFinished() && steps < limit) {
        search.step();
        steps++;
    }

    return steps;
}

function assertValidPath(grid, pathCells, start, goal) {
    assert.strictEqual(pathCells[0], start);
    assert.strictEqual(pathCells[pathCells.length - 1], goal);

    for (let i = 1; i < pathCells.length; i++) {
        const prev = pathCells[i - 1];
        const cell = pathCells[i];
        assert.ok(cell.walkable, "O caminho não pode passar por obstáculos");
        assert.ok(grid.getNeighbors(prev).includes(cell), "Células consecutivas devem ser vizinhas");
    }
}

// 1. Heurística
test("Heuristics.manhattan soma as diferenças absolutas de coluna e linha", () => {
    const grid = new Grid(10, 10, 40);
    assert.strictEqual(Heuristics.manhattan(grid.getCell(0, 0), grid.getCell(3, 4)), 7);
    assert.strictEqual(Heuristics.manhattan(grid.getCell(5, 2), grid.getCell(1, 6)), 8);
    assert.strictEqual(Heuristics.manhattan(grid.getCell(2, 2), grid.getCell(2, 2)), 0);
});

// 2. Busca Gulosa
test("GreedySearch inicia com o start na fronteira", () => {
    const grid = new Grid(5, 5, 40);
    const start = grid.getCell(0, 0);
    const greedy = new GreedySearch(grid, start, grid.getCell(4, 4));

    assert.deepStrictEqual(greedy.frontier, [start]);
    assert.strictEqual(greedy.visited.length, 0);
    assert.strictEqual(greedy.isFinished(), false);
});

test("GreedySearch processa no máximo um nó por step()", () => {
    const grid = new Grid(5, 5, 40);
    const greedy = new GreedySearch(grid, grid.getCell(0, 0), grid.getCell(4, 4));

    greedy.step();
    assert.strictEqual(greedy.visited.length, 1);
    greedy.step();
    assert.strictEqual(greedy.visited.length, 2);
    assert.ok(greedy.frontier.every((cell) => cell instanceof Cell));
});

test("GreedySearch expande primeiro o vizinho de menor heurística", () => {
    const grid = new Grid(5, 5, 40);
    const greedy = new GreedySearch(grid, grid.getCell(2, 2), grid.getCell(4, 2));

    greedy.step();
    greedy.step();
    assert.strictEqual(greedy.visited[1], grid.getCell(3, 2));
});

test("GreedySearch em grade aberta vai direto ao objetivo", () => {
    const grid = new Grid(10, 10, 40);
    const start = grid.getCell(0, 0);
    const goal = grid.getCell(6, 3);
    const greedy = new GreedySearch(grid, start, goal);

    runToEnd(greedy);

    assert.strictEqual(greedy.found, true);
    assertValidPath(grid, greedy.getPath(), start, goal);
    // Sem obstáculos, a gulosa só expande células do caminho Manhattan.
    assert.strictEqual(greedy.visited.length, Heuristics.manhattan(start, goal) + 1);
    assert.strictEqual(greedy.getPath().length, Heuristics.manhattan(start, goal) + 1);
});

test("GreedySearch contorna obstáculos e retorna caminho válido", () => {
    const grid = new Grid(7, 7, 40);

    // Parede vertical na coluna 3 com passagem apenas na última linha.
    for (let row = 0; row < 6; row++) {
        grid.setTerrain(3, row, Terrain.OBSTACLE);
    }

    const start = grid.getCell(0, 0);
    const goal = grid.getCell(6, 0);
    const greedy = new GreedySearch(grid, start, goal);

    runToEnd(greedy);

    assert.strictEqual(greedy.found, true);
    assertValidPath(grid, greedy.getPath(), start, goal);
    assert.ok(greedy.getPath().includes(grid.getCell(3, 6)));
});

test("GreedySearch ignora custo do terreno (atravessa água se for mais perto)", () => {
    const grid = new Grid(5, 3, 40);

    for (let col = 1; col < 4; col++) {
        grid.setTerrain(col, 1, Terrain.WATER);
    }

    const start = grid.getCell(0, 1);
    const goal = grid.getCell(4, 1);
    const greedy = new GreedySearch(grid, start, goal);

    runToEnd(greedy);

    assert.strictEqual(greedy.found, true);
    assert.strictEqual(greedy.getPath().length, 5);
    assert.ok(greedy.getPath().every((cell) => cell.row === 1));
});

test("GreedySearch termina sem caminho quando o objetivo é inalcançável", () => {
    const grid = new Grid(5, 5, 40);
    grid.setTerrain(3, 4, Terrain.OBSTACLE);
    grid.setTerrain(4, 3, Terrain.OBSTACLE);

    const greedy = new GreedySearch(grid, grid.getCell(0, 0), grid.getCell(4, 4));
    runToEnd(greedy);

    assert.strictEqual(greedy.isFinished(), true);
    assert.strictEqual(greedy.found, false);
    assert.deepStrictEqual(greedy.getPath(), []);
    // 25 células - 2 obstáculos - objetivo isolado = 22 expandidas.
    assert.strictEqual(greedy.visited.length, 22);
});

test("GreedySearch.reset() restaura o estado inicial", () => {
    const grid = new Grid(5, 5, 40);
    const start = grid.getCell(0, 0);
    const greedy = new GreedySearch(grid, start, grid.getCell(4, 4));

    runToEnd(greedy);
    greedy.reset();

    assert.deepStrictEqual(greedy.frontier, [start]);
    assert.strictEqual(greedy.visited.length, 0);
    assert.strictEqual(greedy.isFinished(), false);

    runToEnd(greedy);
    assert.strictEqual(greedy.found, true);
});

// 3. Agente
test("Agent.setPath só inicia movimento com caminho de duas ou mais células", () => {
    const grid = new Grid(5, 5, 40);
    const agent = new Agent(grid.getCell(0, 0));

    agent.setPath([grid.getCell(0, 0)]);
    assert.strictEqual(agent.isMoving, false);

    agent.setPath([grid.getCell(0, 0), grid.getCell(1, 0)]);
    assert.strictEqual(agent.isMoving, true);
});

test("Agent avança gradualmente e para na última célula", () => {
    const grid = new Grid(5, 5, 40);
    const pathCells = [grid.getCell(0, 0), grid.getCell(1, 0), grid.getCell(2, 0)];
    const agent = new Agent(pathCells[0]);
    agent.setPath(pathCells);

    // Em areia: BASE_SPEED células por segundo.
    const msPerSandCell = 1000 / Agent.BASE_SPEED;

    agent.update(msPerSandCell / 2);
    assert.strictEqual(agent.position, pathCells[0]);
    assert.ok(Math.abs(agent.stepProgress - 0.5) < 1e-9);

    agent.update(msPerSandCell / 2);
    assert.strictEqual(agent.position, pathCells[1]);
    assert.strictEqual(agent.isMoving, true);

    agent.update(msPerSandCell / 2);
    agent.update(msPerSandCell / 2);
    assert.strictEqual(agent.position, pathCells[2]);
    assert.strictEqual(agent.isMoving, false);
    assert.strictEqual(agent.hasReachedEnd(), true);

    // Depois de chegar, update() não muda mais a posição.
    agent.update(msPerSandCell);
    assert.strictEqual(agent.position, pathCells[2]);
});

test("Agent fica mais lento na água e na lama", () => {
    const grid = new Grid(5, 5, 40);
    grid.setTerrain(1, 0, Terrain.WATER);
    grid.setTerrain(1, 1, Terrain.MUD);

    const msPerSandCell = 1000 / Agent.BASE_SPEED;

    const sandAgent = new Agent(grid.getCell(0, 1));
    sandAgent.setPath([grid.getCell(0, 1), grid.getCell(0, 2)]);
    sandAgent.update(msPerSandCell / 2);

    const mudAgent = new Agent(grid.getCell(0, 1));
    mudAgent.setPath([grid.getCell(0, 1), grid.getCell(1, 1)]);
    mudAgent.update(msPerSandCell / 2);

    const waterAgent = new Agent(grid.getCell(0, 0));
    waterAgent.setPath([grid.getCell(0, 0), grid.getCell(1, 0)]);
    waterAgent.update(msPerSandCell / 2);

    assert.ok(Math.abs(sandAgent.stepProgress - 0.5) < 1e-9);
    assert.ok(Math.abs(mudAgent.stepProgress - 0.5 * 0.6) < 1e-9);
    assert.ok(Math.abs(waterAgent.stepProgress - 0.5 * 0.3) < 1e-9);
});

test("Agent limita o delta de um quadro para não pular células", () => {
    const grid = new Grid(10, 1, 40);
    const pathCells = [];

    for (let col = 0; col < 10; col++) {
        pathCells.push(grid.getCell(col, 0));
    }

    const agent = new Agent(pathCells[0]);
    agent.setPath(pathCells);
    agent.update(10000);

    assert.ok(agent.currentPathIndex <= 1);
    assert.strictEqual(agent.isMoving, true);
});

test("Agent.display interpola a posição entre células", () => {
    const grid = new Grid(5, 5, 40);
    const agent = new Agent(grid.getCell(0, 0));
    agent.setPath([grid.getCell(0, 0), grid.getCell(1, 0)]);
    agent.update(1000 / Agent.BASE_SPEED / 2);

    agent.display(40);
    assert.strictEqual(lastCircle.x, 40);
    assert.strictEqual(lastCircle.y, 20);
});

test("Agent.clearPath interrompe o movimento", () => {
    const grid = new Grid(5, 5, 40);
    const agent = new Agent(grid.getCell(0, 0));
    agent.setPath([grid.getCell(0, 0), grid.getCell(1, 0)]);
    agent.clearPath();

    assert.strictEqual(agent.isMoving, false);
    assert.strictEqual(agent.stepProgress, 0);
    agent.update(1000);
    assert.strictEqual(agent.position, grid.getCell(0, 0));
});

// Resumo dos testes
if (failed > 0) {
    console.error(`\nTestes finalizados: ${passed} passaram, ${failed} falharam.`);
    process.exit(1);
} else {
    console.log(`\nTodos os testes finalizados com sucesso: ${passed} passaram.`);
}
