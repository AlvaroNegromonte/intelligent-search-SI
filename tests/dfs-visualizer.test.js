const fs = require("fs");
const path = require("path");
const vm = require("vm");
const assert = require("assert");
// Os testes de busca usam um campo constante; o Perlin real é validado no navegador.
global.noise = () => 0.6;

// Load project scripts into the global context in dependency order, mimicking index.html
function loadScript(relativePath) {
    const fullPath = path.resolve(__dirname, "..", relativePath);
    const code = fs.readFileSync(fullPath, "utf-8");
    vm.runInThisContext(code, { filename: fullPath });
}

// Mocks das funções de desenho do p5 que registram cada chamada
let drawCalls = [];

const p5Functions = [
    "push",
    "pop",
    "stroke",
    "strokeWeight",
    "fill",
    "noFill",
    "noStroke",
    "rect",
    "line",
    "point",
    "circle"
];

for (const name of p5Functions) {
    global[name] = (...args) => {
        drawCalls.push({ name, args });
    };
}

function callsOf(name) {
    return drawCalls.filter((call) => call.name === name);
}

loadScript("src/world/Terrain.js");
loadScript("src/world/Cell.js");
loadScript("src/world/Grid.js");
loadScript("src/search/SearchAlgorithm.js");
loadScript("src/search/DFS.js");
loadScript("src/ui/SearchVisualizer.js");

console.log("=== Executando Testes de DFS e SearchVisualizer ===");

let passed = 0;
let failed = 0;

function test(name, fn) {
    try {
        drawCalls = [];
        fn();
        console.log(`  [PASS] ${name}`);
        passed++;
    } catch (err) {
        console.error(`  [FAIL] ${name}`);
        console.error(err);
        failed++;
    }
}

function runToEnd(search, maxSteps = 10000) {
    let steps = 0;

    while (!search.isFinished() && steps < maxSteps) {
        search.step();
        steps++;
    }

    return steps;
}

function coords(cells) {
    return cells.map((cell) => `${cell.col},${cell.row}`);
}

// 1. Testes de DFS
test("DFS inicializa com start na pilha e na fronteira", () => {
    const grid = new Grid(5, 5, 40);
    const start = grid.getCell(0, 0);
    const goal = grid.getCell(4, 4);
    const dfs = new DFS(grid, start, goal);

    assert.ok(dfs instanceof SearchAlgorithm);
    assert.deepStrictEqual(dfs.frontier, [start]);
    assert.strictEqual(dfs.visited.length, 0);
    assert.strictEqual(dfs.finalPath.length, 0);
    assert.strictEqual(dfs.isFinished(), false);
});

test("DFS processa exatamente um nó por chamada a step()", () => {
    const grid = new Grid(6, 6, 40);
    const start = grid.getCell(0, 0);
    const goal = grid.getCell(5, 5);
    const dfs = new DFS(grid, start, goal);

    let previousVisited = 0;
    let steps = 0;

    while (!dfs.isFinished() && steps < 1000) {
        dfs.step();
        steps++;

        if (!dfs.isFinished() || dfs.found) {
            assert.strictEqual(dfs.visited.length, previousVisited + 1);
        }

        previousVisited = dfs.visited.length;
    }

    assert.strictEqual(dfs.found, true);
});

test("DFS usa ordem LIFO e explora primeiro o primeiro vizinho de getNeighbors()", () => {
    const grid = new Grid(3, 3, 40);
    const start = grid.getCell(0, 0);
    const goal = grid.getCell(2, 2);
    const dfs = new DFS(grid, start, goal);

    dfs.step();
    // Vizinhos de (0,0) em getNeighbors(): direita (1,0) e baixo (0,1).
    // O primeiro vizinho fica no topo da pilha, ou seja, no fim da fronteira.
    assert.deepStrictEqual(coords(dfs.frontier), ["0,1", "1,0"]);

    runToEnd(dfs);

    // A DFS mergulha pela borda superior antes de voltar; a BFS visitaria (0,1) cedo.
    assert.deepStrictEqual(coords(dfs.visited), ["0,0", "1,0", "2,0", "2,1", "2,2"]);
    assert.deepStrictEqual(coords(dfs.getPath()), ["0,0", "1,0", "2,0", "2,1", "2,2"]);
    assert.deepStrictEqual(coords(dfs.frontier), ["0,1", "1,1"]);
});

test("DFS marca visitado somente ao retirar da pilha e não duplica a fronteira", () => {
    const grid = new Grid(8, 8, 40);
    const start = grid.getCell(0, 0);
    const goal = grid.getCell(7, 7);
    const dfs = new DFS(grid, start, goal);
    let steps = 0;

    while (!dfs.isFinished() && steps < 1000) {
        dfs.step();
        steps++;

        const visitedSet = new Set(dfs.visited);
        const frontierSet = new Set(dfs.frontier);

        assert.strictEqual(visitedSet.size, dfs.visited.length, "visited não deve ter repetidos");
        assert.strictEqual(frontierSet.size, dfs.frontier.length, "frontier não deve ter repetidos");
        assert.ok(dfs.frontier.every((cell) => !visitedSet.has(cell)), "frontier e visited são disjuntos");
        assert.ok(dfs.frontier.every((cell) => cell instanceof Cell));
        assert.ok(dfs.visited.every((cell) => cell instanceof Cell));
    }
});

test("DFS encontra caminho válido contornando obstáculos", () => {
    const grid = new Grid(5, 5, 40);

    // Parede vertical na coluna 2, com passagem apenas em (2,4)
    grid.setTerrain(2, 0, Terrain.OBSTACLE);
    grid.setTerrain(2, 1, Terrain.OBSTACLE);
    grid.setTerrain(2, 2, Terrain.OBSTACLE);
    grid.setTerrain(2, 3, Terrain.OBSTACLE);
    grid.setTerrain(1, 1, Terrain.MUD);
    grid.setTerrain(3, 3, Terrain.WATER);

    const start = grid.getCell(0, 0);
    const goal = grid.getCell(4, 0);
    const dfs = new DFS(grid, start, goal);

    runToEnd(dfs);

    assert.strictEqual(dfs.found, true);

    const finalPath = dfs.getPath();
    assert.strictEqual(finalPath[0], start);
    assert.strictEqual(finalPath[finalPath.length - 1], goal);
    assert.ok(finalPath.some((cell) => cell === grid.getCell(2, 4)), "o caminho deve passar pela abertura");

    for (let i = 0; i < finalPath.length - 1; i++) {
        const dist = Math.abs(finalPath[i].col - finalPath[i + 1].col)
            + Math.abs(finalPath[i].row - finalPath[i + 1].row);
        assert.strictEqual(dist, 1, "Células consecutivas no caminho devem ser adjacentes ortogonalmente");
    }

    assert.ok(finalPath.every((cell) => cell.walkable));
    assert.ok(finalPath.every((cell) => dfs.visited.includes(cell) || cell === goal));
});

test("DFS termina com falha graciosa quando o objetivo é inalcançável", () => {
    const grid = new Grid(5, 5, 40);
    const start = grid.getCell(0, 0);
    const goal = grid.getCell(4, 4);

    grid.setTerrain(3, 4, Terrain.OBSTACLE);
    grid.setTerrain(4, 3, Terrain.OBSTACLE);

    const dfs = new DFS(grid, start, goal);
    runToEnd(dfs);

    assert.strictEqual(dfs.isFinished(), true);
    assert.strictEqual(dfs.found, false);
    assert.strictEqual(dfs.getPath().length, 0);
    assert.strictEqual(dfs.frontier.length, 0);
    // Todas as 22 células alcançáveis foram visitadas antes de desistir
    assert.strictEqual(dfs.visited.length, 22);
});

test("DFS com start igual ao goal termina no primeiro passo", () => {
    const grid = new Grid(5, 5, 40);
    const cell = grid.getCell(2, 2);
    const dfs = new DFS(grid, cell, cell);

    dfs.step();

    assert.strictEqual(dfs.isFinished(), true);
    assert.strictEqual(dfs.found, true);
    assert.deepStrictEqual(dfs.getPath(), [cell]);
});

test("DFS ignora chamadas a step() depois de finalizada", () => {
    const grid = new Grid(3, 3, 40);
    const dfs = new DFS(grid, grid.getCell(0, 0), grid.getCell(2, 2));

    runToEnd(dfs);
    const visitedCount = dfs.visited.length;
    const finalPath = dfs.getPath();

    dfs.step();

    assert.strictEqual(dfs.visited.length, visitedCount);
    assert.strictEqual(dfs.getPath(), finalPath);
});

test("DFS.reset restaura completamente o estado e repete a mesma busca", () => {
    const grid = new Grid(6, 6, 40);
    const start = grid.getCell(0, 0);
    const goal = grid.getCell(3, 4);
    const dfs = new DFS(grid, start, goal);

    runToEnd(dfs);
    const firstVisitOrder = coords(dfs.visited);
    const firstPath = coords(dfs.getPath());

    dfs.reset();
    assert.strictEqual(dfs.visited.length, 0);
    assert.deepStrictEqual(dfs.frontier, [start]);
    assert.deepStrictEqual(dfs.stack, [start]);
    assert.strictEqual(dfs.discovered.size, 1);
    assert.strictEqual(dfs.cameFrom.size, 0);
    assert.strictEqual(dfs.finalPath.length, 0);
    assert.strictEqual(dfs.isFinished(), false);
    assert.strictEqual(dfs.found, false);

    runToEnd(dfs);
    assert.deepStrictEqual(coords(dfs.visited), firstVisitOrder);
    assert.deepStrictEqual(coords(dfs.getPath()), firstPath);
});

test("DFS sempre encontra o objetivo em grades procedurais solucionáveis", () => {
    for (let i = 0; i < 20; i++) {
        const grid = new Grid(20, 15, 40);
        grid.generateProcedural({ obstacleChance: 0.3 });

        const start = grid.getCell(0, 0);
        const goal = grid.getCell(19, 14);
        const dfs = new DFS(grid, start, goal);
        runToEnd(dfs);

        assert.strictEqual(dfs.found, true);
        assert.strictEqual(dfs.getPath()[0], start);
        assert.strictEqual(dfs.getPath()[dfs.getPath().length - 1], goal);
    }
});

// 2. Testes de SearchVisualizer
function finishedSearch() {
    const grid = new Grid(3, 3, 40);
    const dfs = new DFS(grid, grid.getCell(0, 0), grid.getCell(2, 2));
    runToEnd(dfs);
    return dfs;
}

test("SearchVisualizer não desenha nada sem busca ativa", () => {
    const visualizer = new SearchVisualizer(40);
    visualizer.display(null);

    assert.strictEqual(drawCalls.length, 0);
});

test("SearchVisualizer desenha uma célula para cada nó visitado e da fronteira", () => {
    const grid = new Grid(5, 5, 40);
    const visualizer = new SearchVisualizer(40);
    const visited = [grid.getCell(0, 0), grid.getCell(1, 0), grid.getCell(2, 0)];
    const frontier = [grid.getCell(0, 1), grid.getCell(1, 1)];

    visualizer.drawVisited(visited);
    assert.strictEqual(callsOf("rect").length, visited.length);

    drawCalls = [];
    visualizer.drawFrontier(frontier);
    assert.strictEqual(callsOf("rect").length, frontier.length);

    // As coordenadas de desenho seguem { col, row } * cellSize
    const [x, y] = callsOf("rect")[1].args;
    assert.ok(x >= 40 && x < 80);
    assert.ok(y >= 40 && y < 80);
});

test("SearchVisualizer destaca o rastro dos nós visitados mais recentes", () => {
    const grid = new Grid(20, 15, 40);
    const visualizer = new SearchVisualizer(40);
    const visited = [];

    for (let col = 0; col < 20; col++) {
        visited.push(grid.getCell(col, 0));
    }

    visualizer.drawVisited(visited);

    const alphas = callsOf("fill").map((call) => call.args[3]);
    assert.strictEqual(alphas.length, visited.length);
    assert.ok(alphas[alphas.length - 1] > alphas[0], "o nó mais recente deve ser mais intenso");
    assert.strictEqual(alphas[0], alphas[1], "nós antigos usam a mesma intensidade base");
});

test("SearchVisualizer destaca o nó atual apenas durante a busca", () => {
    const grid = new Grid(5, 5, 40);
    const visualizer = new SearchVisualizer(40);
    const dfs = new DFS(grid, grid.getCell(0, 0), grid.getCell(4, 4));

    dfs.step();
    visualizer.drawCurrent(dfs);
    assert.strictEqual(callsOf("rect").length, 1);

    runToEnd(dfs);
    drawCalls = [];
    visualizer.drawCurrent(dfs);
    assert.strictEqual(callsOf("rect").length, 0);
});

test("SearchVisualizer anima o caminho final do início ao objetivo", () => {
    const search = finishedSearch();
    const visualizer = new SearchVisualizer(40);
    const finalPath = search.getPath();

    // Primeiro quadro: apenas a célula inicial do caminho (contorno + núcleo)
    visualizer.display(search);
    assert.strictEqual(callsOf("line").length, 0);
    assert.strictEqual(callsOf("point").length, 2);

    // Avança quadros até o caminho estar completo
    for (let frame = 0; frame < finalPath.length * SearchVisualizer.PATH_FRAMES_PER_CELL; frame++) {
        drawCalls = [];
        visualizer.display(search);
    }

    const lines = callsOf("line");
    assert.strictEqual(lines.length, (finalPath.length - 1) * 2);

    // O primeiro segmento sai do centro da célula inicial
    assert.deepStrictEqual(lines[0].args.slice(0, 2), [20, 20]);
    // O último segmento chega ao centro do objetivo (2,2)
    assert.deepStrictEqual(lines[lines.length - 1].args.slice(2, 4), [100, 100]);
});

test("SearchVisualizer reinicia a animação do caminho ao trocar ou reiniciar a busca", () => {
    const visualizer = new SearchVisualizer(40);
    const first = finishedSearch();

    for (let frame = 0; frame < 30; frame++) {
        visualizer.display(first);
    }

    assert.strictEqual(visualizer.getVisiblePathLength(first.finalPath), first.finalPath.length);

    const second = finishedSearch();
    visualizer.display(second);
    assert.strictEqual(visualizer.getVisiblePathLength(second.finalPath), 1);

    for (let frame = 0; frame < 30; frame++) {
        visualizer.display(second);
    }

    second.reset();
    visualizer.display(second);
    runToEnd(second);
    visualizer.display(second);
    assert.strictEqual(visualizer.getVisiblePathLength(second.finalPath), 1);
});

test("SearchVisualizer não altera a busca e mantém push/pop balanceados", () => {
    const grid = new Grid(5, 5, 40);
    const visualizer = new SearchVisualizer(40);
    const dfs = new DFS(grid, grid.getCell(0, 0), grid.getCell(4, 4));

    for (let i = 0; i < 5; i++) {
        dfs.step();
    }

    const before = {
        visited: [...dfs.visited],
        frontier: [...dfs.frontier],
        finalPath: [...dfs.finalPath],
        finished: dfs.finished
    };

    visualizer.display(dfs);
    runToEnd(dfs);
    visualizer.display(dfs);

    assert.strictEqual(callsOf("push").length, callsOf("pop").length);
    assert.ok(callsOf("push").length > 0);

    // Uma nova chamada a display() não avança a busca
    const visitedCount = dfs.visited.length;
    visualizer.display(dfs);
    assert.strictEqual(dfs.visited.length, visitedCount);
    assert.ok(before.visited.every((cell, i) => dfs.visited[i] === cell));
    assert.strictEqual(before.finished, false);
});

// Resumo dos testes
if (failed > 0) {
    console.error(`\nTestes finalizados: ${passed} passaram, ${failed} falharam.`);
    process.exit(1);
} else {
    console.log(`\nTodos os testes finalizados com sucesso: ${passed} passaram.`);
}
