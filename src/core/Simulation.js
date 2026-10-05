class Simulation {
    constructor(options = {}) {
        const cols = options.cols || 20;
        const rows = options.rows || 15;
        const cellSize = options.cellSize || 40;

        this.grid = new Grid(cols, rows, cellSize);
        this.agent = new Agent(this.grid.getCell(0, 0));
        this.food = new Food(null);
        this.food.relocate(this.grid, this.agent.position);
        this.ui = new UI();
        this.searchVisualizer = new SearchVisualizer(cellSize);
        this.search = null;
        this.searchAlgorithmName = null;
        this.stepBudget = 0;
        this.score = 0;
        this.message = "Gere um novo mapa ou inicie uma busca.";
        // Resultado de cada algoritmo no mapa atual, para comparação.
        this.results = new Map();
        this.state = SimulationState.WAITING;

        this.ui.initialize();
    }

    generateNewMap() {
        this.grid.generateProcedural();

        const startCell = this.grid.getCell(0, 0);
        this.agent.setPosition(startCell);
        this.agent.clearPath();
        this.food.relocate(this.grid, startCell);
        this.search = null;
        this.searchAlgorithmName = null;
        this.results.clear();
        this.message = "Novo mapa gerado. Escolha um algoritmo e inicie a busca.";
        this.setState(SimulationState.WAITING);
    }

    resetSimulation() {
        this.agent.setPosition(this.grid.getCell(0, 0));
        this.agent.clearPath();
        this.search = null;
        this.searchAlgorithmName = null;
        this.message = "";
        this.setState(SimulationState.WAITING);
    }

    update() {
        this.ui.update();
        this.handleUIActions();

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

    handleUIActions() {
        for (const action of this.ui.consumeActions()) {
            if (action === UI.ACTIONS.START) {
                this.startSearch();
            } else if (action === UI.ACTIONS.RESET) {
                this.resetSimulation();
            } else if (action === UI.ACTIONS.NEW_MAP) {
                this.generateNewMap();
            }
        }
    }

    updateWaiting() {
        // A simulação aguarda o usuário iniciar uma busca.
    }

    updateSearching() {
        if (!this.search) {
            return;
        }

        // A velocidade define quantos step() rodam por quadro; abaixo de 1x,
        // o orçamento acumula e a busca avança um nó a cada poucos quadros.
        this.stepBudget += this.ui.getSpeed();

        while (this.stepBudget >= 1 && !this.search.isFinished()) {
            this.search.step();
            this.stepBudget -= 1;
        }

        if (this.search.isFinished()) {
            this.handleSearchFinished();
        }
    }

    handleSearchFinished() {
        this.recordResult();

        if (!this.search.found) {
            this.message = "Nenhum caminho até a comida foi encontrado.";
            this.setState(SimulationState.WAITING);
            return;
        }

        this.agent.setPath(this.search.getPath());

        if (this.agent.isMoving) {
            this.message = "";
            this.setState(SimulationState.MOVING);
        } else {
            this.collectFood();
        }
    }

    updateMoving() {
        this.agent.update(Agent.getFrameDelta() * this.ui.getSpeed());

        if (!this.agent.isMoving) {
            this.collectFood();
        }
    }

    collectFood() {
        this.score += 1;
        this.message = "Troque o algoritmo e inicie de novo para comparar no mesmo mapa.";
        this.setState(SimulationState.COLLECTING);
    }

    updateCollecting() {
        // A comida permanece fixa neste cenário; coleta contínua fica para trabalho futuro.
    }

    startSearch() {
        if (!this.food.position) {
            this.message = "Não há comida alcançável neste mapa.";
            return;
        }

        this.agent.setPosition(this.grid.getCell(0, 0));
        this.agent.clearPath();
        const algorithmName = this.ui.getSelectedAlgorithm();

        this.search = this.createSearchAlgorithm(
            algorithmName,
            this.agent.position,
            this.food.position
        );
        this.searchAlgorithmName = algorithmName;
        this.stepBudget = 0;
        this.message = "";

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

    recordResult() {
        const path = this.search.getPath();

        this.results.set(this.searchAlgorithmName, {
            found: this.search.found,
            visited: this.search.visited.length,
            pathSteps: Math.max(path.length - 1, 0),
            pathCost: this.getPathCost(path)
        });
    }

    getPathCost(path) {
        // O custo de um passo é o custo de entrar na célula; o início não é cobrado.
        let total = 0;

        for (let i = 1; i < path.length; i += 1) {
            total += path[i].cost;
        }

        return total;
    }

    getStatus() {
        const search = this.search;
        const path = search ? search.getPath() : [];

        return {
            state: this.state,
            algorithm: this.searchAlgorithmName || this.ui.getSelectedAlgorithm(),
            visited: search ? search.visited.length : 0,
            frontier: search ? search.frontier.length : 0,
            pathSteps: Math.max(path.length - 1, 0),
            pathCost: this.getPathCost(path),
            score: this.score,
            message: this.message,
            results: this.results
        };
    }

    display() {
        this.grid.display();
        this.searchVisualizer.display(this.search);
        this.food.display(this.grid.cellSize);
        this.agent.display(this.grid.cellSize);
        this.ui.display(this.getStatus());
    }

    setState(state) {
        if (!Object.values(SimulationState).includes(state)) {
            throw new Error(`Estado de simulação inválido: ${state}`);
        }

        this.state = state;
    }
}
