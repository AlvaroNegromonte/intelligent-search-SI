class BFS extends SearchAlgorithm {
    constructor(grid, start, goal) {
        super(grid, start, goal);
        this.queue = [];
        this.discovered = new Set();

        this.init();
    }

    init() {
        if (this.start) {
            this.queue.push(this.start);
            this.frontier.push(this.start);
            this.discovered.add(this.start);
        }
    }

    step() {
        if (this.finished) {
            return;
        }

        if (this.queue.length === 0) {
            this.finish(false);
            return;
        }

        const current = this.queue.shift();
        this.frontier = [...this.queue];
        this.visited.push(current);

        if (current === this.goal) {
            this.finish(true);
            return;
        }

        const neighbors = this.grid.getNeighbors(current);

        for (const neighbor of neighbors) {
            if (!this.discovered.has(neighbor)) {
                this.discovered.add(neighbor);
                this.cameFrom.set(neighbor, current);
                this.queue.push(neighbor);
                this.frontier.push(neighbor);
            }
        }
    }

    reset() {
        super.reset();
        this.queue = [];
        this.discovered = new Set();
        this.init();
    }
}
