let simulation;

function setup() {
    createCanvas(800, 600);

    simulation = new Simulation({
        cols: 20,
        rows: 15,
        cellSize: 40
    });
}

function draw() {
    background(245);

    simulation.update();
    simulation.display();
}
