# Intelligent Search Grid

Intelligent Search Grid é um projeto acadêmico em JavaScript e p5.js para visualizar buscas de caminhos em uma grade 2D ponderada. O objetivo é mostrar, passo a passo, como um agente procura comida em um mundo com areia, lama, água e obstáculos. Este guia explica como executar o projeto e contribuir mantendo o código simples e os componentes compatíveis.

Os algoritmos planejados são:

- Busca em Largura (BFS)
- Busca em Profundidade (DFS)
- Busca de Custo Uniforme (UCS)
- Busca Gulosa pelo Melhor Primeiro
- Busca A*

Atualmente, o projeto fornece a grade, as definições de terreno, as entidades, os estados da simulação e as interfaces de busca. A execução da busca, a movimentação, os controles, a geração procedural de terreno e as sobreposições de visualização ainda estão estruturados com comentários `TODO`.

Ao executar, aparece uma grade de 20 × 15 células de areia em um canvas de 800 × 600 pixels, com o agente no canto superior esquerdo e a comida no canto inferior direito. A simulação começa em `SimulationState.WAITING`, sem iniciar uma busca automaticamente.

## Executando o projeto

O GitHub Pages é a forma principal de disponibilizar a simulação. Depois da publicação, o professor precisa apenas abrir a URL do site: `index.html` carrega o p5.js e os arquivos da aplicação, que inicia em `setup()` e continua em `draw()`. O p5.js é carregado por uma CDN, portanto é necessária uma conexão com a internet.

### GitHub Pages: publicação principal

O projeto é um site estático, servido diretamente da raiz do repositório. Não há instalação de pacotes, compilação ou etapa de build da aplicação.

Para configurar a publicação no GitHub:

1. Abra **Settings → Pages** no repositório.
2. Em **Build and deployment → Source**, selecione **Deploy from a branch**.
3. Selecione a branch que contém o projeto, por exemplo `main`, e a pasta **/(root)**. Clique em **Save**.
4. Após a publicação, abra a URL informada pelo GitHub e compartilhe esse endereço com o professor.

Esses passos seguem a [documentação oficial de configuração do GitHub Pages](https://docs.github.com/en/pages/getting-started-with-github-pages/configuring-a-publishing-source-for-your-github-pages-site).

Em um site de projeto, o endereço normalmente segue o formato `https://usuario.github.io/nome-do-repositorio/`. Por isso, mantenha caminhos relativos como `./src/world/Terrain.js`, sem uma barra inicial como em `/src/world/Terrain.js`.

### Execução local

Abra o `index.html` da raiz diretamente no navegador. Não é necessário servidor local, Node.js ou npm. Os arquivos em `src/` são carregados por scripts comuns, no modo global do p5.js.

### p5.js Web Editor: alternativa para a apresentação

A pasta `web-editor/` contém uma versão independente com apenas `index.html`, `style.css` e `sketch.js`. Ela serve como alternativa caso haja problemas com o GitHub Pages perto da apresentação.

Depois de alterar o código-fonte ou o CSS, regenere essa versão executando, em um terminal com shell compatível com POSIX:

```sh
./scripts/build-web-editor.sh
```

O script concatena os arquivos de `src/` e o `sketch.js` da raiz na ordem de dependência, com comentários identificando cada arquivo, e copia o `style.css` da raiz. Se um arquivo esperado estiver ausente, informa o caminho e encerra antes de sobrescrever a versão existente.

Para executar a alternativa:

1. Abra <https://editor.p5js.org/> e crie um sketch.
2. Substitua os três arquivos padrão pelos arquivos correspondentes de `web-editor/`.
3. Pressione **Run ▶**. Não é necessário adicionar os arquivos de `src/` ao editor.

O código-fonte continua em `src/` e no `sketch.js` da raiz. Faça as alterações nesses arquivos e regenere a alternativa; não mantenha uma segunda implementação editando o `web-editor/sketch.js` manualmente. O script é exclusivo dessa alternativa e não participa da execução ou publicação principal no GitHub Pages.

## Estrutura do repositório

```text
.
├── index.html          # Carrega p5.js, CSS e scripts na ordem correta
├── style.css           # Estilos básicos da página e do canvas
├── sketch.js           # Entrada do p5.js: setup() e draw()
├── src/
│   ├── world/
│   │   ├── Terrain.js          # Propriedades e custos dos terrenos
│   │   ├── Cell.js             # Célula da grade
│   │   └── Grid.js             # Criação, vizinhança e desenho da grade
│   ├── search/
│   │   ├── SearchAlgorithm.js  # Contrato compartilhado das buscas
│   │   ├── PriorityQueue.js    # Fila de prioridade baseada em array
│   │   ├── Heuristics.js       # Distância de Manhattan
│   │   ├── BFS.js              # Busca em largura (TODO)
│   │   ├── DFS.js              # Busca em profundidade (TODO)
│   │   ├── UniformCostSearch.js # Busca de custo uniforme (TODO)
│   │   ├── GreedySearch.js     # Busca gulosa (TODO)
│   │   └── AStar.js            # Busca A* (TODO)
│   ├── agent/
│   │   └── Agent.js            # Posição, caminho e desenho do agente
│   ├── entities/
│   │   └── Food.js             # Posição e desenho da comida
│   ├── ui/
│   │   ├── UI.js              # Estrutura dos futuros controles
│   │   └── SearchVisualizer.js # Visualização das buscas (TODO)
│   └── core/
│       ├── SimulationState.js  # Estados da simulação
│       └── Simulation.js       # Coordenação dos componentes
├── scripts/
│   └── build-web-editor.sh     # Gera a alternativa para o Web Editor
├── web-editor/
│   ├── index.html             # Carrega apenas p5.js e sketch.js
│   ├── style.css              # Cópia gerada do CSS da raiz
│   └── sketch.js              # Código concatenado e gerado
├── AGENTS.md           # Convenções do repositório
└── README.md           # Guia de execução e contribuição
```

As classes ficam organizadas por responsabilidade em `src/`, com uma classe por arquivo. `index.html`, `style.css` e `sketch.js` permanecem na raiz. `sketch.js` deve apenas criar a simulação em `setup()` e chamar `update()` e `display()` em `draw()`.

`Simulation` coordena os componentes e delega a visualização dos dados da busca a `SearchVisualizer`. Os métodos de desenho dessa classe permanecem como `TODO`, permitindo trabalhar na visualização sem concentrar esse código em `Simulation.js`.

## Como contribuir

1. Escolha uma tarefa pequena e bem definida, como implementar um `TODO` de um algoritmo. Combine o escopo com os demais colaboradores para evitar alterações sobrepostas.
2. Crie uma branch com um nome descritivo, por exemplo `search/bfs`.
3. Leia a classe que será alterada, seus consumidores e os contratos abaixo. Faça a mudança no componente responsável e preserve o código existente que já funciona.
4. Altere os arquivos de `src/`, o `sketch.js` ou o CSS da raiz e execute o projeto localmente. Regenere a alternativa com `./scripts/build-web-editor.sh` e verifique também `web-editor/index.html`.
5. Rode `git diff --check` e revise o diff. Inclua a alternativa atualizada de `web-editor/` quando alterar suas fontes, para mantê-la pronta para a apresentação. Não inclua configurações pessoais de editor nem outros artefatos gerados sem necessidade.
6. Use commits curtos no imperativo, como `search: adiciona passo incremental da BFS`, e abra um pull request focado.

No pull request, descreva o comportamento alterado e as verificações realizadas. Vincule a issue relacionada, se houver, e inclua uma captura de tela ou gravação curta quando a mudança afetar a visualização. Atualize este guia se mudar a estrutura ou algum contrato público.

## Contratos de desenvolvimento

Os contratos a seguir mantêm os componentes compatíveis e orientam a implementação dos `TODOs`; eles não indicam que todas as funcionalidades já estão prontas. Alterações que modifiquem intencionalmente um contrato devem atualizar todos os seus consumidores e este documento na mesma mudança.

### Ambiente de execução e carregamento do código-fonte

- Mantenha a aplicação exclusiva para navegador e o p5.js no modo global.
- Não introduza `import`, `export`, `require`, `type="module"`, TypeScript, frameworks, backend, `package.json` ou bundlers. A aplicação principal deve funcionar como site estático sem build; o script de concatenação é exclusivo da alternativa para o Web Editor.
- Cada classe é disponibilizada por meio de sua tag `<script>` em `index.html`. Um script deve ser listado depois de todas as suas dependências.
- Use caminhos relativos nos scripts, estilos e futuros assets para preservar a compatibilidade com GitHub Project Pages.
- `sketch.js` permanece como o último script do projeto, pois cria a `Simulation` de nível superior a partir do `setup()` do p5.js e a controla a partir de `draw()`.

Preserve esta ordem de carregamento em `index.html`:

```text
p5.js
src/world/Terrain.js
src/world/Cell.js
src/world/Grid.js
src/search/SearchAlgorithm.js
src/search/PriorityQueue.js
src/search/Heuristics.js
src/search/BFS.js
src/search/DFS.js
src/search/UniformCostSearch.js
src/search/GreedySearch.js
src/search/AStar.js
src/agent/Agent.js
src/entities/Food.js
src/ui/UI.js
src/ui/SearchVisualizer.js
src/core/SimulationState.js
src/core/Simulation.js
sketch.js
```

Ao adicionar um arquivo, carregue-o depois de suas dependências e antes de quem o utiliza. Atualize também a lista de fontes em `scripts/build-web-editor.sh`, mantendo a mesma ordem, e regenere a alternativa.

### Mundo e terreno

- As coordenadas da grade começam em zero e são representadas como `{ col, row }`. As células são armazenadas como `grid.cells[row][col]`.
- Use `grid.getCell(col, row)` em vez de indexar a matriz a partir de outros componentes. O método retorna `null` para uma coordenada fora dos limites.
- A movimentação é somente ortogonal. `Grid.connectNeighbors()` conecta as células nas direções para cima, direita, baixo e esquerda; o movimento diagonal não faz parte do modelo atual.
- O código de busca deve obter os vizinhos transitáveis por meio de `grid.getNeighbors(cell)`. Ele não deve ler nem reconstruir a adjacência de forma independente.
- As células são comparadas por identidade de objeto. Os mapas e as coleções de busca devem conter as instâncias de `Cell` existentes retornadas pela grade, e não cópias de coordenadas ou células recém-construídas.
- Todas as propriedades de terreno devem ficar em `Terrain.js`. Adicione ou altere custo, velocidade, transitabilidade, rótulo ou cor do terreno nesse arquivo, em vez de espalhar condições específicas de terreno pelo código. As buscas devem consultar `cell.cost`, sem repetir os valores dos terrenos.
- Obstáculos não são transitáveis, têm custo de busca infinito e devem ser excluídos por `Grid.getNeighbors()`.
- Um custo de movimento é o custo de entrar na célula vizinha. Essa convenção deve ser usada pela UCS e pela A*. Os valores atuais de terreno são:

| Terreno | Custo | Multiplicador de velocidade | Transitável |
| --- | ---: | ---: | :---: |
| Areia | 10 | 1.0 | Sim |
| Lama | 50 | 0.6 | Sim |
| Água | 100 | 0.3 | Sim |
| Obstáculo | Infinito | 0 | Não |

### Algoritmos de busca

- Toda implementação de busca deve estender `SearchAlgorithm` e aceitar `(grid, start, goal)` em seu construtor.
- Uma chamada a `step()` pode processar, no máximo, um nó de busca. Ela nunca deve executar a busca completa em um laço. A simulação depende dessa regra para animar a exploração.
- `frontier`, `visited` e `finalPath` são dados públicos de visualização e devem permanecer como arrays de objetos `Cell`. Um algoritmo pode manter internamente uma fila, pilha, fila de prioridade, conjunto ou mapa adicional, mas os arrays públicos devem refletir seu estado atual.
- Uma célula deve entrar em `visited` quando for removida da fronteira para processamento, e não quando for apenas descoberta.
- Use `grid.getNeighbors(cell)` para a expansão e `cameFrom` para registrar o predecessor de cada célula descoberta ou aprimorada.
- Finalize com sucesso quando a célula processada for o objetivo. Finalize sem sucesso quando não restarem nós para processar. Chame `finish(found)` para que `finished`, `found` e `finalPath` permaneçam consistentes.
- `getPath()` retorna `finalPath`, ordenado do início ao objetivo e incluindo ambas as extremidades quando houver sucesso. Uma busca malsucedida possui um caminho vazio.
- `reset()` deve restaurar todo o estado de busca compartilhado. As subclasses de algoritmos que possuam filas, pilhas, conjuntos ou mapas de custo adicionais também devem limpar essas estruturas.
- A BFS usa ordenação FIFO; a DFS usa ordenação LIFO; a UCS prioriza o custo de entrada acumulado; a Busca Gulosa prioriza apenas a heurística; e a A* prioriza o custo de entrada acumulado somado à heurística.
- A Busca Gulosa e a A* usam `Heuristics.manhattan(cell, goal)`. A distância de Manhattan corresponde ao contrato de movimento ortogonal da grade.
- Se um custo acumulado menor alcançar uma célula na UCS ou na A*, atualize sua prioridade, `cameFrom` e `costSoFar`. Não trate a primeira descoberta como permanentemente ótima.

### Fila de prioridade

- `PriorityQueue` armazena elementos arbitrários com prioridades numéricas e remove primeiro o elemento com o menor valor numérico de prioridade.
- Mantenha a implementação simples, baseada em array.
- As visualizações de busca não devem depender dos registros privados `{ element, priority }` da fila. Use `toArray()` quando for necessário um array de elementos da fronteira.
- Preserve o comportamento baseado em referência de `contains(element)` para que ele continue compatível com os objetos `Cell` pertencentes à grade.

### Agente, comida e simulação

- `Agent.position` e `Food.position` são referências a objetos `Cell`, não coordenadas brutas.
- `Agent.setPath(path)` recebe um array de células ordenado do início ao objetivo e define `isMoving` como verdadeiro se houver mais de uma célula. O avanço da posição em `Agent.update()` ainda é um `TODO`.
- O movimento do agente deve avançar gradualmente, em vez de consumir um caminho inteiro em um único quadro. A velocidade do terreno vem de `Terrain.getSpeedMultiplier()`.
- A `Simulation` é responsável pela coordenação entre a grade, a busca, as entidades, a interface, a pontuação e o ciclo de vida. Os componentes não devem criar nem controlar uns aos outros diretamente.
- `SearchVisualizer.display(search)` recebe a busca e delega o desenho de `visited`, `frontier` e `finalPath` aos seus métodos. Mantenha as sobreposições de busca nessa classe; `Simulation.display()` apenas coordena as chamadas de desenho dos componentes.
- Os estados válidos do ciclo de vida são `WAITING`, `SEARCHING`, `MOVING` e `COLLECTING`. Use `simulation.setState()` para que estados inválidos sejam rejeitados.
- A simulação deve começar em `WAITING`. Mantenha o início de buscas em `startSearch()`, acionado explicitamente; não inicie algoritmos incompletos no construtor ou em `setup()`.
- Durante `SEARCHING`, `updateSearching()` chama um `step()` por quadro enquanto houver uma busca não finalizada. Ao implementar o tratamento do resultado, envie o caminho ao agente com `agent.setPath(path)` antes de entrar em `MOVING`; uma falha deve retornar a um estado sem movimento.
- Ao implementar a coleta, faça-a ocorrer somente depois que o agente alcançar a comida. Atualize a pontuação, reposicione a comida em uma célula válida e transitável, diferente da célula do agente, e retorne a simulação para `WAITING`.
- `Simulation` e `UI` devem usar o contrato público da busca, sem depender de `queue`, `stack`, `priorityQueue` ou `costSoFar`.
- Mantenha as mudanças de estado nos métodos de atualização e a renderização nos métodos `display()`. O código de desenho não deve avançar a simulação.
- Os identificadores de algoritmos expostos pela interface e aceitos por `Simulation.createSearchAlgorithm()` devem permanecer sincronizados: `BFS`, `DFS`, `UCS`, `GREEDY` e `ASTAR`.

## Adicionando um algoritmo de busca

1. Para implementar uma busca planejada, edite sua classe existente em `src/search/`. Para uma nova busca, crie nessa pasta um arquivo `PascalCase.js` com uma classe que estenda `SearchAlgorithm`.
2. Implemente a inicialização incremental e um `step()` que processe, no máximo, um nó.
3. Mantenha os arrays de visualização compartilhados e o contrato de reconstrução do caminho.
4. Se criou um arquivo, adicione seu script a `index.html` e à lista de fontes em `scripts/build-web-editor.sh`, depois de suas dependências e antes de `src/core/Simulation.js`.
5. Para uma nova busca, adicione o mesmo identificador a `UI.availableAlgorithms` e `Simulation.createSearchAlgorithm()`.
6. Regenere a alternativa e verifique nas duas versões o conteúdo da fronteira, a ordem de visita, a ordem do caminho final, o comportamento em caso de falha e a execução de um passo por chamada.

## Estilo e verificação

- Use indentação de quatro espaços, ponto e vírgula e strings com aspas duplas.
- Use `PascalCase` para classes e seus nomes de arquivo, `camelCase` para variáveis e métodos e nomes em letras maiúsculas para identificadores fixos, como `SimulationState.WAITING`.
- Prefira métodos pequenos e focados e mantenha as chamadas de desenho do p5.js dentro de métodos voltados à exibição.
- Use nomes diretos, como `getNeighbors()`, `setPath()` e `updateSearching()`, e comentários curtos que expliquem decisões. Preserve `TODOs` das funcionalidades fora do escopo da contribuição.
- Coloque futuros testes automatizados em um diretório `tests/` na raiz e nomeie-os como `*.test.js`. Não adicione um framework de testes, a menos que o repositório adote um deliberadamente.

Antes de enviar uma alteração, execute:

```sh
./scripts/build-web-editor.sh
git diff --check
```

Abra `index.html` e `web-editor/index.html` no navegador e verifique se:

- o console do navegador não contém erros;
- a grade de 20 × 15 é renderizada em 800 × 600 pixels;
- o agente começa no canto superior esquerdo e a comida no canto inferior direito;
- a grade inicial usa areia e a simulação permanece em `WAITING`, sem executar buscas automaticamente.

Confira também se a ordem de dependências em `index.html` corresponde à lista do script, se os caminhos continuam relativos e se a alternativa usa somente seus três arquivos e o p5.js da CDN. Quando publicar no GitHub Pages, abra a URL do site para verificar a versão disponibilizada.

Quando a contribuição implementar ou alterar uma busca, verifique também:

- cada chamada de `step()` processa, no máximo, um nó;
- `frontier`, `visited` e `finalPath` contêm objetos `Cell` da grade;
- `getPath()` retorna o caminho do início ao objetivo, ou um array vazio em caso de falha;
- a busca termina tanto ao encontrar o objetivo quanto ao esgotar a fronteira;
- `reset()` limpa o estado compartilhado e as estruturas internas do algoritmo;
- UCS e A* usam corretamente o custo de entrar na célula vizinha;
- Gulosa e A* usam `Heuristics.manhattan()`; e
- as sobreposições de fronteira, visitados e caminho correspondem aos dados da busca, caso essa visualização já esteja implementada.
