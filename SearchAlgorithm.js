class SearchAlgorithm {
    constructor(grid, start, goal) {
        this.grid = grid;
        this.start = start;
        this.goal = goal;

        this.frontier = [];
        this.visited = [];
        this.finalPath = [];
        this.finished = false;
        this.found = false;
        this.cameFrom = new Map();
    }

    step() {
        // TODO: sobrescrever para processar somente um nó da busca.
    }

    isFinished() {
        return this.finished;
    }

    getPath() {
        return this.finalPath;
    }

    reconstructPath() {
        if (!this.found) {
            this.finalPath = [];
            return this.finalPath;
        }

        const path = [];
        let current = this.goal;

        while (current) {
            path.push(current);

            if (current === this.start) {
                break;
            }

            current = this.cameFrom.get(current);
        }

        if (path[path.length - 1] !== this.start) {
            this.finalPath = [];
            return this.finalPath;
        }

        this.finalPath = path.reverse();
        return this.finalPath;
    }

    finish(found) {
        this.finished = true;
        this.found = found;
        this.finalPath = found ? this.reconstructPath() : [];
    }

    reset() {
        this.frontier = [];
        this.visited = [];
        this.finalPath = [];
        this.finished = false;
        this.found = false;
        this.cameFrom = new Map();
    }
}
