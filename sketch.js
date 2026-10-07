let simulation;

function setup() {
    const options = {
        cols: 40,
        rows: 30,
        cellSize: 20
    };
    createCanvas(options.cols * options.cellSize, options.rows * options.cellSize);

    simulation = new Simulation(options);
    simulation.generateNewMap();
}

function draw() {
    background(245);

    simulation.update();
    simulation.display();
}
