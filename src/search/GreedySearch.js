class GreedySearch extends SearchAlgorithm {
    constructor(grid, start, goal) {
        super(grid, start, goal);
        this.priorityQueue = new PriorityQueue();
    }

    step() {
        // TODO: retirar somente o nó com menor heurística Manhattan.
        // TODO: adicionar vizinhos usando Heuristics.manhattan(vizinho, goal).
        // TODO: finalizar ao encontrar o objetivo ou esvaziar a fronteira.
    }
}
