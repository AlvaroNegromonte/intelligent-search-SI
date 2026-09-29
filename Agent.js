class Agent {
    constructor(position) {
        this.position = position;
        this.path = [];
        this.currentPathIndex = 0;
        this.isMoving = false;
    }

    setPosition(cell) {
        this.position = cell;
    }

    setPath(path) {
        this.path = path;
        this.currentPathIndex = 0;
        this.isMoving = path.length > 1;
    }

    clearPath() {
        this.path = [];
        this.currentPathIndex = 0;
        this.isMoving = false;
    }

    getTerrainSpeedMultiplier() {
        if (!this.position) {
            return 0;
        }

        return Terrain.getSpeedMultiplier(this.position.terrainType);
    }

    update() {
        // TODO: avançar pelo caminho aos poucos, respeitando o tempo entre frames.
        // TODO: usar o multiplicador do terreno para definir a velocidade.
        // TODO: encerrar o movimento ao chegar à última célula do caminho.
    }

    display(cellSize) {
        if (!this.position) {
            return;
        }

        const centerX = this.position.col * cellSize + cellSize / 2;
        const centerY = this.position.row * cellSize + cellSize / 2;

        noStroke();
        fill(220, 50, 50);
        circle(centerX, centerY, cellSize * 0.55);
    }
}
