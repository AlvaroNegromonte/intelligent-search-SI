class UI {
    constructor(gridDimensions = { cols: 40, rows: 30 }) {
        this.availableAlgorithms = ["BFS", "DFS", "UCS", "GREEDY", "ASTAR"];
        this.selectedAlgorithm = "BFS";
        this.speed = 1;
        this.pendingActions = [];
        this.controls = null;
        this.lastStatusHtml = "";
        this.gridDimensions = { ...gridDimensions };
    }

    initialize() {
        // Fora do navegador (testes em Node) não há funções de DOM do p5.js.
        if (typeof createDiv !== "function") {
            return;
        }

        const panel = createDiv();
        panel.addClass("panel");
        createElement("h1", "Busca Inteligente em Grid").parent(panel);

        this.controls = {
            algorithmSelect: null,
            colsInput: null,
            rowsInput: null,
            pauseButton: null,
            speedSlider: null,
            speedLabel: null,
            status: null
        };

        this.createGridControls(panel);
        this.controls.algorithmSelect = this.createAlgorithmSelect(panel);
        this.createActionButtons(panel);
        this.createSpeedControl(panel);

        this.controls.status = createDiv();
        this.controls.status.addClass("status");
        this.controls.status.parent(panel);

        this.createLegend(panel);
    }

    createGridControls(panel) {
        const group = this.createGroup(panel, "Tamanho da grade");
        const form = createElement("form");
        form.parent(group);
        const dimensions = createDiv();
        dimensions.addClass("grid-dimensions");
        dimensions.parent(form);

        for (const [key, label] of [["cols", "Colunas"], ["rows", "Linhas"]]) {
            const field = createDiv();
            field.parent(dimensions);
            const id = `grid-${key}`;
            createElement("label", label).attribute("for", id).parent(field);
            const input = createInput(String(this.gridDimensions[key]), "number");
            input.id(id);
            input.attribute("min", UI.MIN_GRID_DIMENSION);
            input.attribute("max", UI.MAX_GRID_DIMENSION);
            input.attribute("step", 1);
            input.attribute("required", "");
            input.parent(field);
            this.controls[`${key}Input`] = input;
        }

        const applyButton = createButton("Aplicar tamanho");
        applyButton.attribute("type", "submit");
        applyButton.addClass("apply-grid");
        applyButton.parent(form);
        form.elt.addEventListener("submit", (event) => {
            event.preventDefault();
            this.requestAction(UI.ACTIONS.APPLY_GRID);
        });
    }

    getGridDimensions() {
        if (!this.controls) {
            return { ...this.gridDimensions };
        }

        return {
            cols: Number(this.controls.colsInput.value()),
            rows: Number(this.controls.rowsInput.value())
        };
    }

    setGridDimensions(dimensions) {
        this.gridDimensions = { ...dimensions };

        if (this.controls) {
            this.controls.colsInput.value(dimensions.cols);
            this.controls.rowsInput.value(dimensions.rows);
        }
    }

    static isValidGridDimensions(dimensions) {
        return dimensions && [dimensions.cols, dimensions.rows].every((value) =>
            Number.isInteger(value) && value >= UI.MIN_GRID_DIMENSION && value <= UI.MAX_GRID_DIMENSION
        );
    }

    createAlgorithmSelect(panel) {
        const group = this.createGroup(panel, "Algoritmo");
        const select = createSelect();

        for (const name of this.availableAlgorithms) {
            select.option(UI.ALGORITHM_LABELS[name], name);
        }

        select.selected(this.selectedAlgorithm);
        select.parent(group);
        return select;
    }

    createActionButtons(panel) {
        const group = createDiv();
        group.addClass("buttons");
        group.parent(panel);

        const buttons = [
            { label: "Iniciar busca", action: UI.ACTIONS.START, primary: true },
            { label: "Pausar", action: UI.ACTIONS.TOGGLE_PAUSE },
            { label: "Reiniciar", action: UI.ACTIONS.RESET },
            { label: "Novo mapa", action: UI.ACTIONS.NEW_MAP }
        ];

        for (const definition of buttons) {
            const button = createButton(definition.label);
            button.parent(group);
            button.mousePressed(() => this.requestAction(definition.action));

            if (definition.action === UI.ACTIONS.TOGGLE_PAUSE) {
                this.controls.pauseButton = button;
                button.attribute("aria-pressed", "false");
            }

            if (definition.primary) {
                button.addClass("primary");
            }
        }
    }

    createSpeedControl(panel) {
        const group = this.createGroup(panel, "Velocidade");
        const row = createDiv();
        row.addClass("speed");
        row.parent(group);

        this.controls.speedSlider = createSlider(UI.MIN_SPEED, UI.MAX_SPEED, this.speed, UI.SPEED_STEP);
        this.controls.speedSlider.parent(row);

        this.controls.speedLabel = createSpan(this.formatSpeed(this.speed));
        this.controls.speedLabel.parent(row);
    }

    createLegend(panel) {
        const legend = createDiv();
        legend.addClass("legend");
        legend.parent(panel);

        let html = "<h2>Terrenos</h2><ul>";

        for (const properties of Object.values(Terrain.TYPES)) {
            const cost = properties.walkable ? `custo ${properties.cost}` : "intransponível";
            html += this.legendItem(properties.color, `${properties.label} (${cost})`);
        }

        const colors = SearchVisualizer.COLORS;
        html += "</ul><h2>Busca</h2><ul>";
        html += this.legendItem(colors.visited, "Visitados");
        html += this.legendItem(colors.frontier, "Fronteira");
        html += this.legendItem(colors.path, "Caminho final");
        html += this.legendItem(UI.AGENT_COLOR, "Agente");
        html += this.legendItem(UI.FOOD_COLOR, "Comida");
        html += "</ul>";

        legend.html(html);
    }

    createGroup(panel, title) {
        const group = createDiv();
        group.addClass("group");
        group.parent(panel);
        createSpan(title).addClass("group-title").parent(group);
        return group;
    }

    legendItem(color, label) {
        return `<li><span class="swatch" style="background: rgb(${color[0]}, ${color[1]}, ${color[2]})"></span>${label}</li>`;
    }

    setSelectedAlgorithm(name) {
        if (this.availableAlgorithms.includes(name)) {
            this.selectedAlgorithm = name;

            if (this.controls) {
                this.controls.algorithmSelect.selected(name);
            }

            return true;
        }

        return false;
    }

    getSelectedAlgorithm() {
        return this.selectedAlgorithm;
    }

    getSpeed() {
        return this.speed;
    }

    requestAction(action) {
        this.pendingActions.push(action);
    }

    consumeActions() {
        const actions = this.pendingActions;
        this.pendingActions = [];
        return actions;
    }

    update() {
        if (!this.controls) {
            return;
        }

        const selected = this.controls.algorithmSelect.value();

        if (this.availableAlgorithms.includes(selected)) {
            this.selectedAlgorithm = selected;
        }

        this.speed = Number(this.controls.speedSlider.value());
    }

    display(status) {
        if (!this.controls || !status) {
            return;
        }

        this.controls.speedLabel.html(this.formatSpeed(this.speed));
        this.controls.pauseButton.html(status.paused ? "Retomar" : "Pausar");
        this.controls.pauseButton.attribute("aria-pressed", String(status.paused));

        // Só reescreve o painel quando algo muda, para não refazer o DOM a cada quadro.
        const html = this.buildStatusHtml(status);

        if (html !== this.lastStatusHtml) {
            this.controls.status.html(html);
            this.lastStatusHtml = html;
        }
    }

    buildStatusHtml(status) {
        const stateLabel = status.paused ? "Pausado" : UI.STATE_LABELS[status.state];
        let html = `<p class="state state-${status.state.toLowerCase()}">${stateLabel}</p>`;

        if (status.message) {
            html += `<p class="message">${status.message}</p>`;
        }

        html += "<dl>";
        html += `<dt>Algoritmo</dt><dd>${UI.ALGORITHM_LABELS[status.algorithm]}</dd>`;
        html += `<dt>Nós visitados</dt><dd>${status.visited}</dd>`;
        html += `<dt>Fronteira</dt><dd>${status.frontier}</dd>`;
        html += `<dt>Passos do caminho</dt><dd>${status.pathSteps}</dd>`;
        html += `<dt>Custo do caminho</dt><dd>${status.pathCost}</dd>`;
        html += `<dt>Comidas coletadas</dt><dd>${status.score}</dd>`;
        html += "</dl>";

        return html + this.buildResultsHtml(status.results);
    }

    buildResultsHtml(results) {
        if (!results || results.size === 0) {
            return "";
        }

        let html = "<h2>Comparação neste mapa</h2><table><thead><tr>";
        html += "<th>Algoritmo</th><th>Visitados</th><th>Passos</th><th>Custo</th>";
        html += "</tr></thead><tbody>";

        for (const name of this.availableAlgorithms) {
            const result = results.get(name);

            if (!result) {
                continue;
            }

            const steps = result.found ? result.pathSteps : "—";
            const cost = result.found ? result.pathCost : "sem caminho";
            html += `<tr><td>${name === "ASTAR" ? "A*" : name}</td><td>${result.visited}</td>`;
            html += `<td>${steps}</td><td>${cost}</td></tr>`;
        }

        return html + "</tbody></table>";
    }

    formatSpeed(speed) {
        return `${speed}x`;
    }
}

UI.ACTIONS = Object.freeze({
    START: "START",
    RESET: "RESET",
    NEW_MAP: "NEW_MAP",
    APPLY_GRID: "APPLY_GRID",
    TOGGLE_PAUSE: "TOGGLE_PAUSE"
});

UI.ALGORITHM_LABELS = Object.freeze({
    BFS: "Busca em Largura (BFS)",
    DFS: "Busca em Profundidade (DFS)",
    UCS: "Custo Uniforme (UCS)",
    GREEDY: "Gulosa (Melhor Primeiro)",
    ASTAR: "A*"
});

UI.STATE_LABELS = Object.freeze({
    WAITING: "Aguardando",
    SEARCHING: "Buscando…",
    MOVING: "Agente a caminho da comida",
    COLLECTING: "Comida alcançada!"
});

UI.MIN_SPEED = 0.25;
UI.MAX_SPEED = 4;
UI.SPEED_STEP = 0.25;
UI.MIN_GRID_DIMENSION = 1;
UI.MAX_GRID_DIMENSION = 100;

// Mesmas cores usadas em Agent.display() e Food.display().
UI.AGENT_COLOR = Object.freeze([220, 50, 50]);
UI.FOOD_COLOR = Object.freeze([60, 170, 75]);
