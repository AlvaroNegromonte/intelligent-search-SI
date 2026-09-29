class Cell {
    constructor(col, row, terrainType = Terrain.SAND) {
        this.position = { col, row };
        this.terrainType = terrainType;
        this.neighbors = [];
    }

    get col() {
        return this.position.col;
    }

    get row() {
        return this.position.row;
    }

    get cost() {
        return Terrain.getCost(this.terrainType);
    }

    get walkable() {
        return Terrain.isWalkable(this.terrainType);
    }

    setTerrain(terrainType) {
        Terrain.getProperties(terrainType);
        this.terrainType = terrainType;
    }

    addNeighbor(cell) {
        if (!this.neighbors.includes(cell)) {
            this.neighbors.push(cell);
        }
    }

    clearNeighbors() {
        this.neighbors = [];
    }

    display(cellSize) {
        const terrainColor = Terrain.getColor(this.terrainType);
        const x = this.col * cellSize;
        const y = this.row * cellSize;

        stroke(180);
        strokeWeight(1);
        fill(...terrainColor);
        rect(x, y, cellSize, cellSize);
    }
}
