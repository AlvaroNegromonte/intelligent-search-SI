class AStar extends SearchAlgorithm {
    constructor(grid, start, goal, weight = AStar.DEFAULT_WEIGHT) {
        super(grid, start, goal);
        if (!Number.isFinite(weight) || weight < AStar.MIN_WEIGHT || weight > AStar.MAX_WEIGHT) {
            throw new Error("Peso do A* deve estar entre 1 e 5.");
        }

        this.weight = weight;
        this.minimumStepCost = Math.min(...Object.keys(Terrain.TYPES)
            .filter((type) => Terrain.isWalkable(type)).map((type) => Terrain.getCost(type)));
        this.priorityQueue = new PriorityQueue();
        this.costSoFar = new Map();
        this.closed = new Set();
        this.reopened = 0;

        this.init();
    }

    init() {
        if (this.start) {
            this.costSoFar.set(this.start, 0);
            this.priorityQueue.enqueue(this.start, this.getPriority(this.start, 0), this.heuristic(this.start));
            this.frontier = this.priorityQueue.toArray();
        }
    }

    heuristic(cell) {
        return Heuristics.manhattan(cell, this.goal) * this.minimumStepCost;
    }

    getPriority(cell, costToCell) {
        return costToCell + this.weight * this.heuristic(cell);
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
        this.recordVisit(current);

        if (current === this.goal) {
            this.frontier = this.priorityQueue.toArray();
            this.finish(true);
            return;
        }

        const currentCost = this.costSoFar.get(current);
        const neighbors = this.grid.getNeighbors(current);

        for (const neighbor of neighbors) {
            const newCost = currentCost + neighbor.cost;

            if (!this.costSoFar.has(neighbor) || newCost < this.costSoFar.get(neighbor)) {
                this.costSoFar.set(neighbor, newCost);
                this.cameFrom.set(neighbor, current);
                if (this.closed.delete(neighbor)) {
                    this.reopened += 1;
                }

                // O menor h desempata apenas prioridades f exatamente iguais.
                this.priorityQueue.enqueue(neighbor, this.getPriority(neighbor, newCost), this.heuristic(neighbor));
            }
        }

        this.frontier = this.priorityQueue.toArray();
    }

    reset() {
        super.reset();
        this.priorityQueue.clear();
        this.costSoFar.clear();
        this.closed = new Set();
        this.reopened = 0;
        this.init();
    }
}

AStar.DEFAULT_WEIGHT = 2;
AStar.MIN_WEIGHT = 1;
AStar.MAX_WEIGHT = 5;
