class Agent {
    constructor(position) {
        this.position = position;
        this.path = [];
        this.currentPathIndex = 0;
        this.isMoving = false;
        // Fração (0 a 1) já percorrida entre a célula atual e a próxima do caminho.
        this.stepProgress = 0;
    }

    setPosition(cell) {
        this.position = cell;
        this.stepProgress = 0;
    }

    setPath(path) {
        this.path = path;
        this.currentPathIndex = 0;
        this.stepProgress = 0;
        this.isMoving = path.length > 1;

        if (path.length > 0) {
            this.position = path[0];
        }
    }

    clearPath() {
        this.path = [];
        this.currentPathIndex = 0;
        this.stepProgress = 0;
        this.isMoving = false;
    }

    getTerrainSpeedMultiplier() {
        if (!this.position) {
            return 0;
        }

        return Terrain.getSpeedMultiplier(this.position.terrainType);
    }

    getNextCell() {
        return this.path[this.currentPathIndex + 1] || null;
    }

    hasReachedEnd() {
        return this.path.length > 0 && this.currentPathIndex === this.path.length - 1;
    }

    update(deltaMs = Agent.getFrameDelta()) {
        if (!this.isMoving) {
            return;
        }

        let remainingSeconds = Math.min(deltaMs, Agent.MAX_FRAME_DELTA_MS) / 1000;

        while (remainingSeconds > 0 && this.isMoving) {
            const nextCell = this.getNextCell();

            // A velocidade vem do terreno em que o agente está entrando,
            // coerente com o custo de entrada usado pelas buscas.
            const multiplier = Terrain.getSpeedMultiplier(nextCell.terrainType);
            const cellsPerSecond = Agent.BASE_SPEED * multiplier;

            if (cellsPerSecond <= 0) {
                this.isMoving = false;
                return;
            }

            const secondsToNextCell = (1 - this.stepProgress) / cellsPerSecond;

            if (remainingSeconds < secondsToNextCell) {
                this.stepProgress += remainingSeconds * cellsPerSecond;
                return;
            }

            remainingSeconds -= secondsToNextCell;
            this.currentPathIndex += 1;
            this.position = nextCell;
            this.stepProgress = 0;

            if (this.hasReachedEnd()) {
                this.isMoving = false;
            }
        }
    }

    display(cellSize) {
        if (!this.position) {
            return;
        }

        let col = this.position.col;
        let row = this.position.row;
        const nextCell = this.isMoving ? this.getNextCell() : null;

        // Interpola entre as células para o movimento parecer contínuo.
        if (nextCell) {
            col += (nextCell.col - col) * this.stepProgress;
            row += (nextCell.row - row) * this.stepProgress;
        }

        const centerX = col * cellSize + cellSize / 2;
        const centerY = row * cellSize + cellSize / 2;

        noStroke();
        fill(220, 50, 50);
        circle(centerX, centerY, cellSize * 0.55);
    }

    static getFrameDelta() {
        // deltaTime é fornecido pelo p5.js; fora do navegador assume 60 FPS.
        return typeof deltaTime === "number" ? deltaTime : 1000 / 60;
    }
}

// Células por segundo em areia; lama e água reduzem pelo multiplicador do terreno.
Agent.BASE_SPEED = 5;
// Evita saltos de várias células quando a aba fica em segundo plano.
Agent.MAX_FRAME_DELTA_MS = 100;
