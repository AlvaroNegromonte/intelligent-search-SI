# Instruções Gerais e Divisão da Equipe

Este documento consolida as diretrizes operacionais, a divisão de responsabilidades entre os cinco integrantes e as práticas de governança do Git para o desenvolvimento colaborativo do **Intelligent Search Grid**.

> [!NOTE]
> Os contratos de código e detalhes arquiteturais específicos do p5.js encontram-se documentados em [`AGENTS.md`](./AGENTS.md) e [`README.md`](./README.md).

---

## 1. Visão Geral do Ciclo de Vida do Projeto

```text
DESENVOLVIMENTO
  src/  ──►  branches feature/*  ──►  Pull Requests  ──►  main

EXECUÇÃO PRINCIPAL (Entrega)
  main  ──►  GitHub Pages  ──►  Link direto no navegador para o professor

PLANO B (Alternativa de Emergência)
  src/  ──►  ./scripts/build-web-editor.sh  ──►  web-editor/  ──►  p5.js Web Editor
```

* **Desenvolvimento oficial:** Ocorre exclusivamente dentro de `src/`, `sketch.js` e `style.css`.
* **Nunca edite `web-editor/sketch.js` manualmente:** Esse arquivo é gerado automaticamente pelo script `./scripts/build-web-editor.sh`.

---

## 2. Divisão de Responsabilidades (5 Integrantes)

Para minimizar conflitos de mesclagem (*merge conflicts*), cada integrante possui uma frente de trabalho primária com arquivos dedicados:

### Integrante 1 (Você)
* **Arquivos principais:**
  * `src/world/Terrain.js`
  * `src/world/Cell.js`
  * `src/world/Grid.js`
  * `src/search/BFS.js`
* **Principais tarefas:**
  * Representação e custos dos terrenos e células.
  * Estrutura da grade 20×15 e conectividade ortogonal.
  * Geração procedural com garantia de solubilidade (caminho viável).
  * Busca em Largura (BFS) incremental.

### Integrante 2
* **Arquivos principais:**
  * `src/search/DFS.js`
  * `src/ui/SearchVisualizer.js`
* **Principais tarefas:**
  * Busca em Profundidade (DFS) incremental.
  * Visualização gráfica dos nós visitados e fronteira.
  * Visualização do caminho final encontrado.
  * Animação visual da busca passo a passo.

### Integrante 3
* **Arquivos principais:**
  * `src/search/PriorityQueue.js`
  * `src/search/UniformCostSearch.js`
* **Principais tarefas:**
  * Fila de prioridade de menor custo.
  * Leitura e aplicação dos custos de entrada dos terrenos.
  * Busca de Custo Uniforme (UCS) com atualização de nós aprimorados.

### Integrante 4
* **Arquivos principais:**
  * `src/agent/Agent.js`
  * `src/search/Heuristics.js`
  * `src/search/GreedySearch.js`
* **Principais tarefas:**
  * Heurística de Manhattan ($|\Delta\text{col}| + |\Delta\text{row}|$).
  * Busca Gulosa (*Greedy Best-First Search*).
  * Movimentação gradual do agente e velocidade dependente do terreno.

### Integrante 5
* **Arquivos principais:**
  * `src/search/AStar.js`
  * `src/ui/UI.js`
  * `src/core/SimulationState.js`
  * `src/core/Simulation.js`
* **Principais tarefas:**
  * Algoritmo A* ($f = g + h$).
  * Controles de interface (seleção de algoritmo, botões de ação e velocidade).
  * Máquina de estados (`WAITING`, `SEARCHING`, `MOVING`, `COLLECTING`).
  * Coordenação e integração geral dos componentes da simulação.

---

## 3. Governança e Arquivos Compartilhados Sensíveis

A ideia central é que cada integrante trabalhe em seus arquivos e evite alterar arquivos de outra frente sem alinhar antes.

Os **5 arquivos mais sensíveis** a alterações compartilhadas são:

1. `src/search/SearchAlgorithm.js` *(classe base de todos os algoritmos)*
2. `src/world/Grid.js` *(fornece nós e vizinhos para todos os algoritmos e para a simulação)*
3. `src/core/Simulation.js` *(coordena todas as entidades e telas)*
4. `src/core/SimulationState.js` *(define os estados do ciclo de vida)*
5. `index.html` *(ordem estrita de carregamento de scripts)*

> [!WARNING]
> Se qualquer tarefa exigir alterar a assinatura pública ou o comportamento desses arquivos (ex.: `getNeighbors()`, `getPath()`, `frontier`, `visited`, `SimulationState`), **o integrante deve comunicar e alinhar com o grupo antes de realizar a mudança**.

---

## 4. Fluxo de Trabalho no Git

A branch `main` deve sempre representar uma versão integrada, estável e funcional. Ninguém deve comitar diretamente nela.

### Fluxo para cada nova tarefa:

1. **Atualizar a base:**
   * Se estiver usando repositório único compartilhado:
     ```bash
     git checkout main
     git pull origin main
     ```
   * Se estiver trabalhando via Fork:
     ```bash
     git checkout main
     git pull upstream main
     git push origin main
     ```

2. **Criar uma branch específica (`feature/nome-da-feature`):**
   ```bash
   git checkout -b feature/nome-da-feature
   ```
   *Exemplos de branches padronizadas:*
   * `feature/grid-bfs`
   * `feature/dfs-visualization`
   * `feature/ucs`
   * `feature/agent-greedy`
   * `feature/astar-integration`

3. **Desenvolver com commits atômicos e descritivos:**
   Utilizar mensagens no imperativo com escopo do módulo:
   ```bash
   git add <arquivos>
   git commit -m "search: implementa passo incremental da BFS"
   ```

4. **Enviar a branch e abrir o Pull Request:**
   ```bash
   git push -u origin feature/nome-da-feature
   ```
   Abrir o Pull Request no GitHub apontando para a `main`.

### Checklist obrigatório antes do merge do PR:
- [ ] O projeto continua executando normalmente sem quebras.
- [ ] O console do navegador não apresenta erros nem exceções.
- [ ] Nenhum contrato público compartilhado foi modificado sem aviso.
- [ ] A alteração não impactou negativamente o trabalho dos colegas.
- [ ] O fallback foi atualizado com `./scripts/build-web-editor.sh` e verificado com `git diff --check`.
