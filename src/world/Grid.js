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

    generateProcedural(options = {}) {
        const obstacleChance = options.obstacleChance === undefined || options.obstacleChance === null
            ? 0.15 : options.obstacleChance;
        const noiseScale = options.noiseScale === undefined || options.noiseScale === null
            ? 0.10 : options.noiseScale;
        // As opções antigas continuam aceitas como limites/faixas do campo de ruído.
        const waterThreshold = options.waterThreshold === undefined || options.waterThreshold === null
            ? (options.waterChance === undefined || options.waterChance === null
                ? 0.32 : options.waterChance) : options.waterThreshold;
        const mudThreshold = options.mudThreshold === undefined || options.mudThreshold === null
            ? waterThreshold + (options.mudChance === undefined || options.mudChance === null
                ? 0.12 : options.mudChance) : options.mudThreshold;
        const ensureSolvable = options.ensureSolvable === undefined || options.ensureSolvable === null
            ? true : options.ensureSolvable;

        const maxAttempts = 10;
        let attempt = 0;
        let solvable = false;

        const startCell = this.getCell(0, 0);
        const goalCell = this.getCell(this.cols - 1, this.rows - 1);

        while (attempt < maxAttempts && !solvable) {
            attempt += 1;
            const noiseOffsetX = Math.random() * 1000;
            const noiseOffsetY = Math.random() * 1000;

            for (let row = 0; row < this.rows; row += 1) {
                for (let col = 0; col < this.cols; col += 1) {
                    // Células próximas amostram valores parecidos, formando regiões.
                    const terrainValue = noise(
                        noiseOffsetX + col * noiseScale,
                        noiseOffsetY + row * noiseScale
                    );

                    // Obstáculos são sorteados separadamente do terreno contínuo.
                    if (Math.random() < obstacleChance) {
                        this.setTerrain(col, row, Terrain.OBSTACLE);
                    } else if (terrainValue < waterThreshold) {
                        this.setTerrain(col, row, Terrain.WATER);
                    } else if (terrainValue < mudThreshold) {
                        this.setTerrain(col, row, Terrain.MUD);
                    } else {
                        this.setTerrain(col, row, Terrain.SAND);
                    }
                }
            }

            if (startCell) {
                startCell.setTerrain(Terrain.SAND);
            }

            if (goalCell) {
                goalCell.setTerrain(Terrain.SAND);
            }

            if (!ensureSolvable || this.isReachable(startCell, goalCell)) {
                solvable = true;
            }
        }

        if (ensureSolvable && !solvable && startCell && goalCell) {
            this.carveSolvablePath(startCell, goalCell);
        }
    }

    isReachable(startCell, goalCell) {
        if (!startCell || !goalCell || !startCell.walkable || !goalCell.walkable) {
            return false;
        }

        const queue = [startCell];
        const visited = new Set([startCell]);

        while (queue.length > 0) {
            const current = queue.shift();

            if (current === goalCell) {
                return true;
            }

            for (const neighbor of this.getNeighbors(current)) {
                if (!visited.has(neighbor)) {
                    visited.add(neighbor);
                    queue.push(neighbor);
                }
            }
        }

        return false;
    }

    carveSolvablePath(startCell, goalCell) {
        let currentCol = startCell.col;
        let currentRow = startCell.row;

        while (currentCol !== goalCell.col || currentRow !== goalCell.row) {
            const cell = this.getCell(currentCol, currentRow);
            if (cell && cell.terrainType === Terrain.OBSTACLE) {
                cell.setTerrain(Terrain.SAND);
            }

            const moveCol = currentCol < goalCell.col && (currentRow === goalCell.row || Math.random() < 0.5);

            if (moveCol) {
                currentCol += 1;
            } else if (currentRow < goalCell.row) {
                currentRow += 1;
            } else if (currentCol < goalCell.col) {
                currentCol += 1;
            }
        }

        goalCell.setTerrain(Terrain.SAND);
    }

    display() {
        for (const row of this.cells) {
            for (const cell of row) {
                cell.display(this.cellSize);
            }
        }
    }
}
