class SearchVisualizer {
    constructor(cellSize) {
        this.cellSize = cellSize;

        // Estado apenas visual: não altera a busca nem o ciclo da simulação.
        this.trackedSearch = null;
        this.pathFrames = 0;
    }

    display(search) {
        if (!search) {
            return;
        }

        this.updatePathAnimation(search);

        this.drawVisited(search.visited);
        this.drawFrontier(search.frontier);
        this.drawCurrent(search);
        this.drawPath(search.finalPath);
    }

    updatePathAnimation(search) {
        // Reinicia a animação quando uma nova busca começa ou a atual é reiniciada.
        if (search !== this.trackedSearch || search.finalPath.length === 0) {
            this.trackedSearch = search;
            this.pathFrames = 0;
        } else {
            this.pathFrames += 1;
        }
    }

    drawVisited(visited) {
        const colors = SearchVisualizer.COLORS;
        const trailLength = SearchVisualizer.TRAIL_LENGTH;
        const trailStart = visited.length - trailLength;

        push();
        noStroke();

        for (let i = 0; i < visited.length; i += 1) {
            // Os nós visitados mais recentemente ficam mais intensos,
            // formando um rastro que mostra o avanço da busca passo a passo.
            const recency = i >= trailStart ? (i - trailStart + 1) / trailLength : 0;
            const alpha = colors.visitedAlpha + (colors.trailAlpha - colors.visitedAlpha) * recency;

            fill(...colors.visited, alpha);
            this.drawCell(visited[i], 1);
        }

        pop();
    }

    drawFrontier(frontier) {
        const colors = SearchVisualizer.COLORS;

        push();
        stroke(...colors.frontierStroke);
        strokeWeight(2);
        fill(...colors.frontier);

        for (const cell of frontier) {
            this.drawCell(cell, this.cellSize * 0.25);
        }

        pop();
    }

    drawCurrent(search) {
        // O último nó visitado é o que acabou de ser expandido.
        if (search.isFinished() || search.visited.length === 0) {
            return;
        }

        const current = search.visited[search.visited.length - 1];

        push();
        noFill();
        stroke(...SearchVisualizer.COLORS.current);
        strokeWeight(3);
        this.drawCell(current, 2);
        pop();
    }

    drawPath(path) {
        if (!path || path.length === 0) {
            return;
        }

        const colors = SearchVisualizer.COLORS;
        const visibleCells = this.getVisiblePathLength(path);

        push();
        noFill();

        // O contorno escuro deixa o caminho legível sobre qualquer terreno.
        stroke(...colors.pathOutline);
        strokeWeight(this.cellSize * 0.3);
        this.drawPathSegments(path, visibleCells);

        stroke(...colors.path);
        strokeWeight(this.cellSize * 0.16);
        this.drawPathSegments(path, visibleCells);

        pop();
    }

    drawPathSegments(path, visibleCells) {
        if (visibleCells === 1) {
            const center = this.getCenter(path[0]);
            point(center.x, center.y);
            return;
        }

        for (let i = 1; i < visibleCells; i += 1) {
            const from = this.getCenter(path[i - 1]);
            const to = this.getCenter(path[i]);
            line(from.x, from.y, to.x, to.y);
        }
    }

    getVisiblePathLength(path) {
        // O caminho é revelado do início ao objetivo, uma célula a cada poucos quadros.
        const revealed = 1 + Math.floor(this.pathFrames / SearchVisualizer.PATH_FRAMES_PER_CELL);
        return Math.min(path.length, revealed);
    }

    getCenter(cell) {
        return {
            x: cell.col * this.cellSize + this.cellSize / 2,
            y: cell.row * this.cellSize + this.cellSize / 2
        };
    }

    drawCell(cell, inset) {
        rect(
            cell.col * this.cellSize + inset,
            cell.row * this.cellSize + inset,
            this.cellSize - inset * 2,
            this.cellSize - inset * 2
        );
    }
}

SearchVisualizer.TRAIL_LENGTH = 12;
SearchVisualizer.PATH_FRAMES_PER_CELL = 2;

SearchVisualizer.COLORS = Object.freeze({
    visited: Object.freeze([155, 89, 182]),
    visitedAlpha: 100,
    trailAlpha: 210,
    frontier: Object.freeze([255, 140, 0, 200]),
    frontierStroke: Object.freeze([150, 70, 0]),
    current: Object.freeze([255, 255, 255]),
    path: Object.freeze([255, 221, 0]),
    pathOutline: Object.freeze([40, 40, 40, 220])
});
