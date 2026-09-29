class SearchVisualizer {
    constructor(cellSize) {
        this.cellSize = cellSize;
    }

    display(search) {
        if (!search) {
            return;
        }

        this.drawVisited(search.visited);
        this.drawFrontier(search.frontier);
        this.drawPath(search.finalPath);
    }

    drawVisited(visited) {
        // TODO: desenhar as células visitadas.
    }

    drawFrontier(frontier) {
        // TODO: desenhar as células da fronteira.
    }

    drawPath(path) {
        // TODO: desenhar o caminho final, do início ao objetivo.
    }
}
