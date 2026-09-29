class AStar extends SearchAlgorithm {
    constructor(grid, start, goal) {
        super(grid, start, goal);
        this.priorityQueue = new PriorityQueue();
        this.costSoFar = new Map();
    }

    step() {
        // TODO: retirar somente o nó com menor custo total estimado.
        // TODO: somar custo acumulado e Heuristics.manhattan(vizinho, goal).
        // TODO: atualizar fronteira, cameFrom e costSoFar quando houver melhora.
    }
}
