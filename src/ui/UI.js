class UI {
    constructor() {
        this.availableAlgorithms = ["BFS", "DFS", "UCS", "GREEDY", "ASTAR"];
        this.selectedAlgorithm = "BFS";
    }

    initialize() {
        // TODO: criar o select de algoritmos.
        // TODO: criar os botões de iniciar e reiniciar.
        // TODO: criar o controle de velocidade da simulação.
    }

    setSelectedAlgorithm(name) {
        if (this.availableAlgorithms.includes(name)) {
            this.selectedAlgorithm = name;
            return true;
        }

        return false;
    }

    getSelectedAlgorithm() {
        return this.selectedAlgorithm;
    }

    update() {
        // TODO: ler as interações dos controles quando eles forem criados.
    }

    display() {
        // TODO: exibir informações e controles da simulação.
    }
}
