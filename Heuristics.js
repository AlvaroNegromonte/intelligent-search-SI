class Heuristics {
    static manhattan(cellA, cellB) {
        return Math.abs(cellA.col - cellB.col) + Math.abs(cellA.row - cellB.row);
    }
}
