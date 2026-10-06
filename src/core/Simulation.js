class Simulation {
    constructor(options = {}) {
        const cols = options.cols || 40;
        const rows = options.rows || 30;
        const cellSize = options.cellSize || 20;

        this.grid = new Grid(cols, rows, cellSize);
        this.initialAgentCell = this.grid.getRandomWalkableCell();
        this.agent = new Agent(this.initialAgentCell);
        this.food = new Food(null);
        this.food.relocate(this.grid, this.agent.position);
        this.ui = new UI();
        this.searchVisualizer = new SearchVisualizer(cellSize);
        this.search = null;
        this.searchAlgorithmName = null;
        this.stepBudget = 0;
        this.score = 0;
        this.message = "Gere um novo mapa ou inicie uma busca.";
        // Só compare resultados com o mesmo início e objetivo no mapa atual.
        this.results = new Map();
        this.resultsStart = null;
        this.resultsGoal = null;
        this.state = SimulationState.WAITING;

        this.ui.initialize();
    }

    generateNewMap() {
        this.grid.generateProcedural();

        const startCell = this.grid.getRandomWalkableCell();
        this.initialAgentCell = startCell;
        this.agent.setPosition(startCell);
        this.agent.clearPath();
        this.food.relocate(this.grid, startCell);
        this.search = null;
        this.searchAlgorithmName = null;
        this.stepBudget = 0;
        this.results.clear();
        this.resultsStart = null;
        this.resultsGoal = null;
        this.message = "Novo mapa gerado. Escolha um algoritmo e inicie a busca.";
        this.setState(SimulationState.WAITING);
    }

    resetSimulation() {
        this.generateNewMap();
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
        if (this.state === SimulationState.COLLECTING) {
            return;
        }

        if (!this.food.position || this.agent.position !== this.food.position) {
            this.message = "O agente parou antes de alcançar a comida.";
            this.setState(SimulationState.WAITING);
            return;
        }

        this.score += 1;
        this.message = "Comida coletada! A próxima busca começará da posição atual.";
        this.setState(SimulationState.COLLECTING);
    }

    updateCollecting() {
        this.food.relocate(this.grid, this.agent.position);
        this.results.clear();
        this.search = null;
        this.searchAlgorithmName = null;
        this.startSearch({ resetAgent: false });
    }

    startSearch(options = {}) {
        if (!this.food.position) {
            this.message = "Não há comida alcançável neste mapa.";
            this.setState(SimulationState.WAITING);
            return;
        }

        // O início manual preserva a comparação; a coleta continua da célula atual.
        if (options.resetAgent !== false) {
            this.agent.setPosition(this.initialAgentCell);
        }

        this.agent.clearPath();

        if (this.resultsStart !== this.agent.position || this.resultsGoal !== this.food.position) {
            this.results.clear();
        }

        this.resultsStart = this.agent.position;
        this.resultsGoal = this.food.position;
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
