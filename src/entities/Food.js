class Food {
    constructor(position) {
        this.position = position;
    }

    setPosition(cell) {
        this.position = cell;
    }

    relocate(grid, agentCell) {
        const previousPosition = this.position;
        const maxDistance = (grid.cols - 1) + (grid.rows - 1);
        const minimumDistance = Math.ceil(maxDistance * 0.45);
        const reachableCells = [];
        const pendingCells = [];
        const seen = new Set();

        if (agentCell && agentCell.walkable) {
            pendingCells.push(agentCell);
            seen.add(agentCell);
        }

        // Uma única travessia encontra o componente alcançável do agente.
        while (pendingCells.length > 0) {
            const currentCell = pendingCells.pop();

            if (currentCell !== agentCell) {
                reachableCells.push(currentCell);
            }

            for (const neighbor of grid.getNeighbors(currentCell)) {
                if (neighbor.walkable && !seen.has(neighbor)) {
                    seen.add(neighbor);
                    pendingCells.push(neighbor);
                }
            }
        }

        const distanceFromAgent = (cell) => Math.abs(cell.col - agentCell.col)
            + Math.abs(cell.row - agentCell.row);
        let candidates = reachableCells.filter((cell) => distanceFromAgent(cell) >= minimumDistance);

        // Se a distância preferida for impossível, use as células mais distantes.
        if (candidates.length === 0) {
            let farthestDistance = 0;

            for (const cell of reachableCells) {
                farthestDistance = Math.max(farthestDistance, distanceFromAgent(cell));
            }

            candidates = reachableCells.filter((cell) => distanceFromAgent(cell) === farthestDistance);
        }

        if (previousPosition && candidates.length > 1) {
            candidates = candidates.filter((cell) => cell.col !== previousPosition.col
                || cell.row !== previousPosition.row);
        }

        // Uma grade sem outra célula alcançável não tem um objetivo válido.
        if (candidates.length === 0) {
            this.position = null;
            return null;
        }

        const selectedCell = candidates[Math.floor(Math.random() * candidates.length)];
        this.setPosition(selectedCell);
        return selectedCell;
    }

    display(cellSize) {
        if (!this.position) {
            return;
        }

        const centerX = this.position.col * cellSize + cellSize / 2;
        const centerY = this.position.row * cellSize + cellSize / 2;

        noStroke();
        fill(60, 170, 75);
        circle(centerX, centerY, cellSize * 0.4);
    }
}
