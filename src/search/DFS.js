class DFS extends SearchAlgorithm {
    constructor(grid, start, goal) {
        super(grid, start, goal);
        this.stack = [];
        this.discovered = new Set();

        this.init();
    }

    init() {
        if (this.start) {
            this.stack.push(this.start);
            this.frontier.push(this.start);
            this.discovered.add(this.start);
        }
    }

    step() {
        if (this.finished) {
            return;
        }

        if (this.stack.length === 0) {
            this.finish(false);
            return;
        }

        // LIFO: o último nó empilhado é o próximo a ser processado.
        const current = this.stack.pop();
        this.frontier = [...this.stack];
        this.visited.push(current);

        if (current === this.goal) {
            this.finish(true);
            return;
        }

        const neighbors = this.grid.getNeighbors(current);

        // Empilha em ordem reversa para que o primeiro vizinho de getNeighbors()
        // fique no topo da pilha e seja explorado primeiro.
        for (let i = neighbors.length - 1; i >= 0; i -= 1) {
            const neighbor = neighbors[i];

            if (!this.discovered.has(neighbor)) {
                this.discovered.add(neighbor);
                this.cameFrom.set(neighbor, current);
                this.stack.push(neighbor);
                this.frontier.push(neighbor);
            }
        }
    }

    reset() {
        super.reset();
        this.stack = [];
        this.discovered = new Set();
        this.init();
    }
}
