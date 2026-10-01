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

// Resumo dos testes até o momento
if (failed > 0) {
    console.error(`\nTestes finalizados: ${passed} passaram, ${failed} falharam.`);
    process.exit(1);
} else {
    console.log(`\nTestes de base finalizados com sucesso: ${passed} passaram.`);
}
