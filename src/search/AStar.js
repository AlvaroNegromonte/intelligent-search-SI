class AStar extends SearchAlgorithm {
    constructor(grid, start, goal) {
        super(grid, start, goal);
        this.priorityQueue = new PriorityQueue();
        this.costSoFar = new Map();
        this.closed = new Set();

        this.init();
    }

    init() {
        if (this.start) {
            this.costSoFar.set(this.start, 0);
            this.priorityQueue.enqueue(this.start, this.getPriority(this.start, 0));
            this.frontier = this.priorityQueue.toArray();
        }
    }

    heuristic(cell) {
        // O peso 50 favorece a proximidade do objetivo, mas pode superestimar
        // o custo restante e não garante um caminho de custo mínimo.
        return Heuristics.manhattan(cell, this.goal) * AStar.HEURISTIC_WEIGHT;
    }

    getPriority(cell, costToCell) {
        const estimate = this.heuristic(cell);

        // Em empates de f = g + h, prefere o nó mais perto do objetivo.
        // O desempate é menor que qualquer diferença de custo, então não muda a ordem por f.
        return costToCell + estimate + estimate * AStar.TIE_BREAK;
    }

    step() {
        if (this.finished) {
            return;
        }

        if (this.priorityQueue.isEmpty()) {
            this.finish(false);
            return;
        }

        const current = this.priorityQueue.dequeue();
        this.closed.add(current);
        this.visited.push(current);

        if (current === this.goal) {
            this.frontier = this.priorityQueue.toArray();
            this.finish(true);
            return;
        }

        const currentCost = this.costSoFar.get(current);
        const neighbors = this.grid.getNeighbors(current);

        for (const neighbor of neighbors) {
            // Esta versão ponderada não reabre nós já expandidos.
            if (this.closed.has(neighbor)) {
                continue;
            }

            const newCost = currentCost + neighbor.cost;

            if (!this.costSoFar.has(neighbor) || newCost < this.costSoFar.get(neighbor)) {
                this.costSoFar.set(neighbor, newCost);
                this.cameFrom.set(neighbor, current);
                this.priorityQueue.enqueue(neighbor, this.getPriority(neighbor, newCost));
            }
        }

        this.frontier = this.priorityQueue.toArray();
    }

    reset() {
        super.reset();
        this.priorityQueue.clear();
        this.costSoFar.clear();
        this.closed = new Set();
        this.init();
    }
}

AStar.HEURISTIC_WEIGHT = 50;
AStar.TIE_BREAK = 1e-6;
