class Simulation {
    constructor(options = {}) {
        const cols = options.cols || 20;
        const rows = options.rows || 15;
        const cellSize = options.cellSize || 40;

        this.grid = new Grid(cols, rows, cellSize);
        this.agent = new Agent(this.grid.getCell(0, 0));
        this.food = new Food(this.grid.getCell(cols - 1, rows - 1));
        this.ui = new UI();
        this.search = null;
        this.score = 0;
        this.state = SimulationState.WAITING;

        this.ui.initialize();
    }

    update() {
        this.ui.update();

        if (this.state === SimulationState.WAITING) {
            this.updateWaiting();
        } else if (this.state === SimulationState.SEARCHING) {
            this.updateSearching();
        } else if (this.state === SimulationState.MOVING) {
            this.updateMoving();
        } else if (this.state === SimulationState.COLLECTING) {
            this.updateCollecting();
        }
    }

    updateWaiting() {
        // A simulação aguarda o usuário iniciar uma busca.
    }

    updateSearching() {
        if (!this.search || this.search.isFinished()) {
            return;
        }

        this.search.step();

        // TODO: quando a busca terminar, enviar o caminho ao agente e mudar o estado.
    }

    updateMoving() {
        this.agent.update();

        // TODO: mudar para COLLECTING quando o agente alcançar a comida.
    }

    updateCollecting() {
        // TODO: atualizar a pontuação, reposicionar a comida e voltar para WAITING.
    }

    startSearch() {
        const algorithmName = this.ui.getSelectedAlgorithm();

        this.search = this.createSearchAlgorithm(
            algorithmName,
            this.agent.position,
            this.food.position
        );

        this.setState(SimulationState.SEARCHING);
    }

    createSearchAlgorithm(algorithmName, start, goal) {
        if (algorithmName === "BFS") {
            return new BFS(this.grid, start, goal);
        }

        if (algorithmName === "DFS") {
            return new DFS(this.grid, start, goal);
        }

        if (algorithmName === "UCS") {
            return new UniformCostSearch(this.grid, start, goal);
        }

        if (algorithmName === "GREEDY") {
            return new GreedySearch(this.grid, start, goal);
        }

        if (algorithmName === "ASTAR") {
            return new AStar(this.grid, start, goal);
        }

        throw new Error(`Algoritmo desconhecido: ${algorithmName}`);
    }

    display() {
        this.grid.display();
        this.displaySearchData();
        this.food.display(this.grid.cellSize);
        this.agent.display(this.grid.cellSize);
        this.ui.display();
    }

    displaySearchData() {
        if (!this.search) {
            return;
        }

        // TODO: desenhar this.search.visited.
        // TODO: desenhar this.search.frontier.
        // TODO: desenhar this.search.finalPath.
    }

    setState(state) {
        if (!Object.values(SimulationState).includes(state)) {
            throw new Error(`Estado de simulação inválido: ${state}`);
        }

        this.state = state;
    }
}
