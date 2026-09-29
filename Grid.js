class Grid {
    constructor(cols, rows, cellSize) {
        this.cols = cols;
        this.rows = rows;
        this.cellSize = cellSize;
        this.cells = [];

        this.createCells();
        this.connectNeighbors();
    }

    createCells() {
        for (let row = 0; row < this.rows; row += 1) {
            const currentRow = [];

            for (let col = 0; col < this.cols; col += 1) {
                currentRow.push(new Cell(col, row, Terrain.SAND));
            }

            this.cells.push(currentRow);
        }
    }

    connectNeighbors() {
        const directions = [
            { col: 0, row: -1 },
            { col: 1, row: 0 },
            { col: 0, row: 1 },
            { col: -1, row: 0 }
        ];

        for (let row = 0; row < this.rows; row += 1) {
            for (let col = 0; col < this.cols; col += 1) {
                const cell = this.getCell(col, row);
                cell.clearNeighbors();

                for (const direction of directions) {
                    const neighbor = this.getCell(
                        col + direction.col,
                        row + direction.row
                    );

                    if (neighbor) {
                        cell.addNeighbor(neighbor);
                    }
                }
            }
        }
    }

    getCell(col, row) {
        if (!this.isInside(col, row)) {
            return null;
        }

        return this.cells[row][col];
    }

    isInside(col, row) {
        return col >= 0 && col < this.cols && row >= 0 && row < this.rows;
    }

    getNeighbors(cell) {
        return cell.neighbors.filter((neighbor) => neighbor.walkable);
    }

    setTerrain(col, row, terrainType) {
        const cell = this.getCell(col, row);

        if (!cell) {
            return false;
        }

        cell.setTerrain(terrainType);
        return true;
    }

    generateProcedural() {
        // TODO: distribuir terrenos e obstáculos de forma procedural.
        // TODO: garantir que agente e comida permaneçam em posições válidas.
    }

    display() {
        for (const row of this.cells) {
            for (const cell of row) {
                cell.display(this.cellSize);
            }
        }
    }
}
