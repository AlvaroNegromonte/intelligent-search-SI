let simulation;

function setup() {
    createCanvas(800, 600);

    simulation = new Simulation({
        cols: 40,
        rows: 30,
        cellSize: 20
    });
    simulation.generateNewMap();
}

function draw() {
    background(245);

    simulation.update();
    simulation.display();
}
