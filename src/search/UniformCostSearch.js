class UniformCostSearch extends SearchAlgorithm {
    constructor(grid, start, goal) {
        super(grid, start, goal);
        this.priorityQueue = new PriorityQueue();
        this.costSoFar = new Map();

        this.init();
    }

    init() {
        if (this.start) {
            // O custo inicial é zero: só cobramos a entrada nos vizinhos.
            this.costSoFar.set(this.start, 0);
            this.priorityQueue.enqueue(this.start, 0);
            this.frontier = this.priorityQueue.toArray();
        }
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
        this.frontier = this.priorityQueue.toArray();
        this.visited.push(current);

        if (current === this.goal) {
            this.finish(true);
            return;
        }

        const currentCost = this.costSoFar.get(current);
        const neighbors = this.grid.getNeighbors(current);

        for (const neighbor of neighbors) {
            // Com custos não negativos, um nó expandido já tem custo mínimo.
            if (this.visited.includes(neighbor)) {
                continue;
            }

            const newCost = currentCost + neighbor.cost;
            const knownCost = this.costSoFar.get(neighbor);

            if (!this.costSoFar.has(neighbor) || newCost < knownCost) {
                this.costSoFar.set(neighbor, newCost);
                this.cameFrom.set(neighbor, current);
                this.priorityQueue.enqueue(neighbor, newCost);
            }
        }

        this.frontier = this.priorityQueue.toArray();
    }

    reset() {
        super.reset();
        this.priorityQueue.clear();
        this.costSoFar.clear();
        this.init();
    }
}
