const fs = require("fs");
const path = require("path");
const vm = require("vm");
const assert = require("assert");

// Load project scripts into the global context in dependency order, mimicking index.html
function loadScript(relativePath) {
    const fullPath = path.resolve(__dirname, "..", relativePath);
    const code = fs.readFileSync(fullPath, "utf-8");
    vm.runInThisContext(code, { filename: fullPath });
}

// Global mocks for p5 drawing functions in case display() is invoked
global.stroke = () => {};
global.strokeWeight = () => {};
global.fill = () => {};
global.rect = () => {};
global.noStroke = () => {};
global.circle = () => {};
// Os testes de busca usam um campo constante; o Perlin real é validado no navegador.
global.noise = () => 0.6;

loadScript("src/world/Terrain.js");
loadScript("src/world/Cell.js");
loadScript("src/world/Grid.js");
loadScript("src/search/SearchAlgorithm.js");
loadScript("src/search/BFS.js");

console.log("=== Executando Testes de Grid e BFS ===");

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

// 1. Testes de Terreno e Célula
test("Terrain possui custos, velocidades e transitabilidade corretos", () => {
    assert.strictEqual(Terrain.getCost(Terrain.SAND), 10);
    assert.strictEqual(Terrain.getCost(Terrain.MUD), 50);
    assert.strictEqual(Terrain.getCost(Terrain.WATER), 100);
    assert.strictEqual(Terrain.getCost(Terrain.OBSTACLE), Infinity);

    assert.strictEqual(Terrain.isWalkable(Terrain.SAND), true);
    assert.strictEqual(Terrain.isWalkable(Terrain.MUD), true);
    assert.strictEqual(Terrain.isWalkable(Terrain.WATER), true);
    assert.strictEqual(Terrain.isWalkable(Terrain.OBSTACLE), false);

    assert.strictEqual(Terrain.getSpeedMultiplier(Terrain.SAND), 1);
    assert.strictEqual(Terrain.getSpeedMultiplier(Terrain.MUD), 0.6);
    assert.strictEqual(Terrain.getSpeedMultiplier(Terrain.WATER), 0.3);
    assert.strictEqual(Terrain.getSpeedMultiplier(Terrain.OBSTACLE), 0);
});

test("Cell inicializa propriedades e conexões corretamente", () => {
    const cell = new Cell(3, 4, Terrain.SAND);
    assert.strictEqual(cell.col, 3);
    assert.strictEqual(cell.row, 4);
    assert.strictEqual(cell.cost, 10);
    assert.strictEqual(cell.walkable, true);

    cell.setTerrain(Terrain.OBSTACLE);
    assert.strictEqual(cell.cost, Infinity);
    assert.strictEqual(cell.walkable, false);
});

// 2. Testes de Grid
test("Grid cria dimensões corretas e conecta vizinhos ortogonais", () => {
    const grid = new Grid(20, 15, 40);
    assert.strictEqual(grid.cols, 20);
    assert.strictEqual(grid.rows, 15);
    assert.strictEqual(grid.cellSize, 40);

    // Canto superior esquerdo (0,0) deve ter 2 vizinhos ortogonais
    const cornerCell = grid.getCell(0, 0);
    assert.strictEqual(cornerCell.neighbors.length, 2);

    // Célula interna (1,1) deve ter 4 vizinhos
    const centerCell = grid.getCell(1, 1);
    assert.strictEqual(centerCell.neighbors.length, 4);

    // Limites de grade
    assert.strictEqual(grid.getCell(-1, 0), null);
    assert.strictEqual(grid.getCell(20, 15), null);
});

test("Grid.getNeighbors filtra vizinhos que são obstáculos", () => {
    const grid = new Grid(5, 5, 40);
    const center = grid.getCell(2, 2);
    assert.strictEqual(grid.getNeighbors(center).length, 4);

    // Transforma o vizinho de cima (2, 1) em obstáculo
    grid.setTerrain(2, 1, Terrain.OBSTACLE);
    const filteredNeighbors = grid.getNeighbors(center);
    assert.strictEqual(filteredNeighbors.length, 3);
    assert.ok(!filteredNeighbors.some(n => n.col === 2 && n.row === 1));
});

test("Grid.generateProcedural cria terrenos variados e garante caminho viável", () => {
    const grid = new Grid(20, 15, 40);
    grid.generateProcedural({ obstacleChance: 0.25, mudChance: 0.20, waterChance: 0.15 });

    const startCell = grid.getCell(0, 0);
    const goalCell = grid.getCell(19, 14);

    // Start e Goal devem ser transitáveis (Areia)
    assert.strictEqual(startCell.walkable, true);
    assert.strictEqual(startCell.terrainType, Terrain.SAND);
    assert.strictEqual(goalCell.walkable, true);
    assert.strictEqual(goalCell.terrainType, Terrain.SAND);

    // Deve existir caminho viável de (0,0) a (19,14)
    assert.strictEqual(grid.isReachable(startCell, goalCell), true);

    // Deve conter variedade de terrenos
    const terrains = new Set();
    for (let r = 0; r < grid.rows; r++) {
        for (let c = 0; c < grid.cols; c++) {
            terrains.add(grid.getCell(c, r).terrainType);
        }
    }
    assert.ok(terrains.size > 1, "A grade gerada deve conter mais de um tipo de terreno");
});

test("Grid classifica o campo Perlin pelos limites padrão sem argumentos", () => {
    const originalNoise = global.noise;
    const originalRandom = Math.random;
    const samples = [0.1, 0.319, 0.32, 0.439, 0.44, 0.9];
    let sampleIndex = 0;

    try {
        global.noise = () => samples[sampleIndex++];
        Math.random = () => 0.9;
        const grid = new Grid(6, 1, 40);
        grid.generateProcedural();

        assert.deepStrictEqual(grid.cells[0].map((cell) => cell.terrainType), [
            Terrain.SAND, Terrain.WATER, Terrain.MUD,
            Terrain.MUD, Terrain.SAND, Terrain.SAND
        ]);
    } finally {
        global.noise = originalNoise;
        Math.random = originalRandom;
    }
});

test("Grid amostra coordenadas próximas com escala configurável e novos offsets", () => {
    const originalNoise = global.noise;
    const originalRandom = Math.random;
    const samples = [];
    let rollIndex = 0;

    try {
        global.noise = (sampleX, sampleY) => {
            samples.push([sampleX, sampleY]);
            return 0.6;
        };
        Math.random = () => (rollIndex++ % 100) / 100;
        const grid = new Grid(3, 2, 40);
        grid.generateProcedural({ obstacleChance: 0, noiseScale: 0.12 });
        grid.generateProcedural({ obstacleChance: 0, noiseScale: 0.12 });

        assert.strictEqual(samples.length, 12);
        assert.ok(Math.abs(samples[1][0] - samples[0][0] - 0.12) < 1e-10);
        assert.strictEqual(samples[1][1], samples[0][1]);
        assert.strictEqual(samples[3][0], samples[0][0]);
        assert.ok(Math.abs(samples[3][1] - samples[0][1] - 0.12) < 1e-10);
        assert.notDeepStrictEqual(samples[6], samples[0]);
    } finally {
        global.noise = originalNoise;
        Math.random = originalRandom;
    }
});

test("Grid aceita opções antigas e prioriza os limiares explícitos", () => {
    const originalNoise = global.noise;

    try {
        global.noise = () => 0.3;
        const grid = new Grid(3, 1, 40);
        grid.generateProcedural({ obstacleChance: 0, waterChance: 0.2, mudChance: 0.2 });
        assert.strictEqual(grid.getCell(1, 0).terrainType, Terrain.MUD);
        grid.generateProcedural({
            obstacleChance: 0, waterChance: 0.2, mudChance: 0.2,
            waterThreshold: 0.4, mudThreshold: 0.5
        });
        assert.strictEqual(grid.getCell(1, 0).terrainType, Terrain.WATER);
        grid.generateProcedural({ obstacleChance: 0, waterChance: 0, mudChance: 0 });
        assert.strictEqual(grid.getCell(1, 0).terrainType, Terrain.SAND);
    } finally {
        global.noise = originalNoise;
    }
});

test("Grid mantém obstáculos independentes e abre caminho após tentativas esgotadas", () => {
    const grid = new Grid(20, 15, 40);
    grid.generateProcedural({ obstacleChance: 1, ensureSolvable: false });
    assert.strictEqual(grid.getCell(1, 0).terrainType, Terrain.OBSTACLE);
    assert.strictEqual(grid.isReachable(grid.getCell(0, 0), grid.getCell(19, 14)), false);

    grid.generateProcedural({ obstacleChance: 1 });
    assert.strictEqual(grid.isReachable(grid.getCell(0, 0), grid.getCell(19, 14)), true);
    assert.strictEqual(grid.getCell(0, 0).terrainType, Terrain.SAND);
    assert.strictEqual(grid.getCell(19, 14).terrainType, Terrain.SAND);
});

// 3. Testes de BFS
test("BFS inicializa com start na fila e na fronteira", () => {
    const grid = new Grid(5, 5, 40);
    const start = grid.getCell(0, 0);
    const goal = grid.getCell(4, 4);
    const bfs = new BFS(grid, start, goal);

    assert.strictEqual(bfs.frontier.length, 1);
    assert.strictEqual(bfs.frontier[0], start);
    assert.strictEqual(bfs.visited.length, 0);
    assert.strictEqual(bfs.isFinished(), false);
});

test("BFS executa exatamente um passo por chamada a step()", () => {
    const grid = new Grid(5, 5, 40);
    const start = grid.getCell(0, 0);
    const goal = grid.getCell(4, 4);
    const bfs = new BFS(grid, start, goal);

    bfs.step();
    // Após 1 passo: start foi processado, entrou em visited, vizinhos de start entraram na fronteira
    assert.strictEqual(bfs.visited.length, 1);
    assert.strictEqual(bfs.visited[0], start);
    assert.ok(bfs.frontier.length > 0);
    assert.strictEqual(bfs.isFinished(), false);
});

test("BFS encontra caminho ordenado do start ao goal em grid desobstruído", () => {
    const grid = new Grid(5, 5, 40);
    const start = grid.getCell(0, 0);
    const goal = grid.getCell(2, 2);
    const bfs = new BFS(grid, start, goal);

    let steps = 0;
    while (!bfs.isFinished() && steps < 1000) {
        bfs.step();
        steps++;
    }

    assert.strictEqual(bfs.found, true);
    assert.strictEqual(bfs.isFinished(), true);

    const path = bfs.getPath();
    assert.ok(path.length > 0);
    assert.strictEqual(path[0], start);
    assert.strictEqual(path[path.length - 1], goal);

    // Distância Manhattan entre (0,0) e (2,2) é 4 passos (5 células no caminho)
    assert.strictEqual(path.length, 5);

    // Valida adjacência entre células consecutivas do caminho
    for (let i = 0; i < path.length - 1; i++) {
        const c1 = path[i];
        const c2 = path[i + 1];
        const dist = Math.abs(c1.col - c2.col) + Math.abs(c1.row - c2.row);
        assert.strictEqual(dist, 1, "Células consecutivas no caminho devem ser adjacentes ortogonalmente");
    }
});

test("BFS termina com falha graciosa quando o objetivo é inalcançável", () => {
    const grid = new Grid(5, 5, 40);
    const start = grid.getCell(0, 0);
    const goal = grid.getCell(4, 4);

    // Bloqueia completamente o goal com obstáculos
    grid.setTerrain(3, 4, Terrain.OBSTACLE);
    grid.setTerrain(4, 3, Terrain.OBSTACLE);

    const bfs = new BFS(grid, start, goal);

    let steps = 0;
    while (!bfs.isFinished() && steps < 1000) {
        bfs.step();
        steps++;
    }

    assert.strictEqual(bfs.isFinished(), true);
    assert.strictEqual(bfs.found, false);
    assert.strictEqual(bfs.getPath().length, 0);
});

test("BFS.reset restaura completamente o estado de busca", () => {
    const grid = new Grid(5, 5, 40);
    const start = grid.getCell(0, 0);
    const goal = grid.getCell(2, 2);
    const bfs = new BFS(grid, start, goal);

    bfs.step();
    bfs.step();
    assert.ok(bfs.visited.length > 0);

    bfs.reset();
    assert.strictEqual(bfs.visited.length, 0);
    assert.strictEqual(bfs.frontier.length, 1);
    assert.strictEqual(bfs.frontier[0], start);
    assert.strictEqual(bfs.isFinished(), false);
    assert.strictEqual(bfs.found, false);
});

// Resumo dos testes
if (failed > 0) {
    console.error(`\nTestes finalizados: ${passed} passaram, ${failed} falharam.`);
    process.exit(1);
} else {
    console.log(`\nTodos os testes finalizados com sucesso: ${passed} passaram.`);
}
