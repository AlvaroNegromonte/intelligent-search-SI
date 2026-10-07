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
        this.visitedCells = new Set();
        this.currentCell = null;
        this.expansions = 0;
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

    recordVisit(cell) {
        this.currentCell = cell;

        if (!this.visitedCells.has(cell)) {
            this.visitedCells.add(cell);
            this.visited.push(cell);
        }

        // O objetivo termina a busca sem examinar seus vizinhos.
        if (cell !== this.goal) {
            this.expansions += 1;
        }
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
        this.visitedCells.clear();
        this.currentCell = null;
        this.expansions = 0;
    }
}
