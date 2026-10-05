class GreedySearch extends SearchAlgorithm {
    constructor(grid, start, goal) {
        super(grid, start, goal);
        this.priorityQueue = new PriorityQueue();
        this.discovered = new Set();

        this.init();
    }

    init() {
        if (this.start) {
            this.discovered.add(this.start);
            this.priorityQueue.enqueue(this.start, Heuristics.manhattan(this.start, this.goal));
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

        // A gulosa ignora o custo acumulado: expande o nó que parece mais perto do objetivo.
        const current = this.priorityQueue.dequeue();
        this.visited.push(current);

        if (current === this.goal) {
            this.frontier = this.priorityQueue.toArray();
            this.finish(true);
            return;
        }

        const neighbors = this.grid.getNeighbors(current);

        for (const neighbor of neighbors) {
            if (!this.discovered.has(neighbor)) {
                this.discovered.add(neighbor);
                this.cameFrom.set(neighbor, current);
                this.priorityQueue.enqueue(neighbor, Heuristics.manhattan(neighbor, this.goal));
            }
        }

        this.frontier = this.priorityQueue.toArray();
    }

    reset() {
        super.reset();
        this.priorityQueue.clear();
        this.discovered = new Set();
        this.init();
    }
}
