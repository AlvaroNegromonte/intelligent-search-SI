class AStar extends SearchAlgorithm {
    constructor(grid, start, goal) {
        super(grid, start, goal);
        this.priorityQueue = new PriorityQueue();
        this.costSoFar = new Map();
        this.closed = new Set();
        this.minimumStepCost = AStar.getMinimumStepCost();

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
        // Manhattan conta passos; cada passo custa pelo menos o terreno mais barato.
        // Multiplicar por esse custo mantém a heurística admissível e consistente,
        // mas na mesma escala dos custos, o que deixa a A* bem mais focada que a UCS.
        return Heuristics.manhattan(cell, this.goal) * this.minimumStepCost;
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
            // Com heurística consistente, um nó expandido já tem custo mínimo.
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

    static getMinimumStepCost() {
        let minimum = Infinity;

        for (const type of Object.keys(Terrain.TYPES)) {
            if (Terrain.isWalkable(type)) {
                minimum = Math.min(minimum, Terrain.getCost(type));
            }
        }

        return minimum;
    }
}

AStar.TIE_BREAK = 1e-6;
