const fs = require("fs");
const path = require("path");
const vm = require("vm");
const assert = require("assert");
const crypto = require("crypto");

const noisePath = process.argv[2];
if (!noisePath) {
    console.log("Benchmark opcional: node tests/astar-benchmark.test.js <p5-src/math/noise.js> [resultado.json]");
    process.exit(0);
}

const noiseSource = fs.readFileSync(noisePath, "utf8");
const noiseHash = crypto.createHash("sha256").update(noiseSource).digest("hex");
assert.strictEqual(noiseHash, "c3daba022b86be70898d2cf8bc6cfaad5148d777213ad75fcd34e53acc0bc9e1",
    "Use o modulo noise.js oficial do p5.js v1.11.10, sem alteracoes.");
const context = vm.createContext({ p5: { prototype: {} } });
// Executa o modulo oficial sem seu wrapper ESM, mantendo as funcoes de ruido intactas.
const compatibleNoise = noiseSource.split(/\r?\n/).filter((line) =>
    !line.startsWith("import ") && !line.startsWith("export default ")
).join("\n");
vm.runInContext(compatibleNoise, context, { filename: "p5-noise.js" });
vm.runInContext("noise = p5.prototype.noise; noiseSeed = p5.prototype.noiseSeed;", context);
const root = path.resolve(__dirname, "..");
for (const match of fs.readFileSync(path.join(root, "index.html"), "utf8").matchAll(/<script src="\.\/([^"]+)"/g)) {
    vm.runInContext(fs.readFileSync(path.join(root, match[1]), "utf8"), context);
}

const { Grid, Food, AStar, UniformCostSearch, setSeed } = vm.runInContext(`
    let benchmarkSeed;
    Math.random = () => ((benchmarkSeed = benchmarkSeed * 16807 % 2147483647) - 1) / 2147483646;
    ({ Grid, Food, AStar, UniformCostSearch, setSeed: seed => {
        benchmarkSeed = seed;
        noiseSeed(seed);
    } })
`, context);
const weights = Array.from({ length: 17 }, (_, index) => 1 + index * 0.25);
const records = [];
const criteria = { meanExcessLimit: 5, p95ExcessLimit: 15 };
const groups = [
    { cols: 40, rows: 30, count: 120, seedBase: 170001 },
    { cols: 20, rows: 15, count: 30, seedBase: 270001 },
    { cols: 60, rows: 45, count: 30, seedBase: 370001 }
];

function solve(search) {
    let calls = 0;
    while (!search.isFinished() && calls < 500000) {
        search.step();
        calls += 1;
    }
    assert.ok(search.isFinished(), "A busca nao terminou dentro do limite.");
    assert.ok(search.found, "A comida sorteada deve ser alcancavel.");
    const cells = search.getPath();
    assert.strictEqual(cells[0], search.start);
    assert.strictEqual(cells.at(-1), search.goal);
    assert.strictEqual(new Set(cells).size, cells.length);
    for (let index = 1; index < cells.length; index += 1) {
        assert.ok(search.grid.getNeighbors(cells[index - 1]).includes(cells[index]));
    }
    return {
        expansions: search.expansions,
        visited: search.visited.length,
        reopened: search.reopened || 0,
        steps: cells.length - 1,
        cost: cells.slice(1).reduce((total, cell) => total + cell.cost, 0)
    };
}

for (const group of groups) {
    for (let trial = 0; trial < group.count; trial += 1) {
        const seed = group.seedBase + trial * 7919;
        setSeed(seed);
        const grid = new Grid(group.cols, group.rows, 20);
        grid.generateProcedural();
        const start = grid.getRandomWalkableCell();
        const food = new Food(null);
        const goal = food.relocate(grid, start);
        assert.ok(goal);
        const terrainCounts = {};
        for (const row of grid.cells) {
            for (const cell of row) {
                terrainCounts[cell.terrainType] = (terrainCounts[cell.terrainType] || 0) + 1;
            }
        }
        const ucs = solve(new UniformCostSearch(grid, start, goal));
        const results = weights.map((weight) => {
            const result = solve(new AStar(grid, start, goal, weight));
            assert.ok(result.cost >= ucs.cost);
            assert.ok(result.cost <= weight * ucs.cost);
            if (weight === 1) {
                assert.strictEqual(result.cost, ucs.cost);
            }
            return { weight, ...result, excessPercent: (result.cost / ucs.cost - 1) * 100 };
        });
        records.push({
            seed,
            split: trial < group.count / 2 ? "tuning" : "validation",
            cols: group.cols,
            rows: group.rows,
            start: [start.col, start.row],
            goal: [goal.col, goal.row],
            terrainCounts,
            ucs,
            results
        });
        if (records.length % 10 === 0) {
            console.log(`Mapas verificados: ${records.length}/180`);
        }
    }
}

const mean = (values) => values.reduce((sum, value) => sum + value, 0) / values.length;
const quantile = (values, fraction) => [...values].sort((a, b) => a - b)[Math.ceil(fraction * values.length) - 1];
function summarize(subset) {
    return weights.map((weight) => {
        const results = subset.map((record) => record.results.find((result) => result.weight === weight));
        return {
            weight,
            maps: subset.length,
            meanExpansions: mean(results.map((result) => result.expansions)),
            meanVisited: mean(results.map((result) => result.visited)),
            meanReopened: mean(results.map((result) => result.reopened)),
            meanExpansionRatio: mean(subset.map((record, index) => results[index].expansions / record.results[0].expansions)),
            meanExcess: mean(results.map((result) => result.excessPercent)),
            p95Excess: quantile(results.map((result) => result.excessPercent), 0.95),
            maxExcess: Math.max(...results.map((result) => result.excessPercent)),
            optimalPercent: 100 * results.filter((result) => result.excessPercent === 0).length / results.length
        };
    });
}
const tuning = summarize(records.filter((record) => record.split === "tuning"));
const validation = summarize(records.filter((record) => record.split === "validation"));
const eligible = tuning.filter((result) => result.meanExcess <= criteria.meanExcessLimit
    && result.p95Excess <= criteria.p95ExcessLimit);
eligible.sort((a, b) => a.meanExpansionRatio - b.meanExpansionRatio || a.weight - b.weight);
const chosenWeight = eligible[0].weight;
const chosenValidation = validation.find((result) => result.weight === chosenWeight);
const report = {
    noiseVersion: "p5.js 1.11.10",
    noiseSha256: noiseHash,
    criteria,
    chosenWeight,
    validationPassed: chosenValidation.meanExcess <= criteria.meanExcessLimit
        && chosenValidation.p95Excess <= criteria.p95ExcessLimit,
    tuning,
    validation,
    standardGridValidation: summarize(records.filter((record) => record.split === "validation" && record.cols === 40)),
    records
};
if (process.argv[3]) {
    fs.writeFileSync(process.argv[3], JSON.stringify(report, null, 4) + "\n");
}
console.log(JSON.stringify({ chosenWeight, validationPassed: report.validationPassed, tuning, validation }, null, 2));
