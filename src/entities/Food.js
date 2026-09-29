class Food {
    constructor(position) {
        this.position = position;
    }

    setPosition(cell) {
        this.position = cell;
    }

    relocate(grid) {
        // TODO: escolher uma célula transitável diferente da posição do agente.
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
