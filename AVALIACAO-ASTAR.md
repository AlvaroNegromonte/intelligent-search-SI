# Escolha do peso padrão do A*

Avaliação realizada em 2026-10-07. O peso padrão escolhido é **1,75**, equivalente a multiplicar a distância de Manhattan por **17,5** na prioridade `f = g + weight * h`, com `h = Manhattan * 10`.

## Objetivo e critério

O objetivo da entrega é reduzir o trabalho de busca mantendo caminhos próximos do custo mínimo da UCS. Antes da medição, foram definidos estes limites empíricos:

- Custo adicional médio de até 5% em relação à UCS.
- Percentil 95 do custo adicional de até 15%.
- Entre os pesos que atendem aos limites, escolher a menor média da razão de expansões em relação ao A* padrão, calculada mapa a mapa.

Esses limites são uma decisão de compromisso para a entrega; não foram especificados pelo professor e não são garantias matemáticas do algoritmo.

## Método

Foram comparados 17 pesos, de 1 a 5 em passos de 0,25, em 180 mapas independentes: 120 grades 40x30, 30 grades 20x15 e 30 grades 60x45. Metade de cada grupo foi usada na escolha (90 mapas) e a outra metade somente na validação (90 mapas).

O benchmark executa o código atual de `Grid`, `Food`, UCS e A*. Os mapas usam `Grid.generateProcedural()` sem opções, e agente e comida são posicionados por `getRandomWalkableCell()` e `Food.relocate()`. O campo de terreno vem do módulo oficial de ruído do p5.js 1.11.10, com quatro oitavas e queda de amplitude de 0,5. Não é usado o ruído simulado dos testes unitários nem sorteio independente dos tipos de terreno.

Todos os pesos compartilham mapa, início e objetivo. Custos são calculados pelo caminho retornado, cobrando a entrada nas células. Expansões incluem reexpansões e excluem o objetivo terminal. Todos os caminhos são verificados quanto à adjacência, transitabilidade e ausência de ciclos. O A* de peso 1 precisa produzir o mesmo custo da UCS em todos os casos.

As sementes de cada grupo são `seedBase + trial * 7919`, com bases 170001 (40x30), 270001 (20x15) e 370001 (60x45). Cada semente inicializa `noiseSeed()` e um gerador Park-Miller para os sorteios de `Math.random()`. A primeira metade dos índices de cada grupo pertence à seleção, e a segunda à validação.

## Resultados de validação

Os valores abaixo vêm somente dos 90 mapas que não participaram da escolha. Redução de expansões é a média das reduções percentuais mapa a mapa, comparando com A* de peso 1. Custo adicional é calculado mapa a mapa em relação à UCS; P95 usa o método de posição mais próxima (`ceil(0,95 * n)`).

| Peso | Fator efetivo | Redução média de expansões | Custo adicional médio | Custo adicional P95 | Maior custo adicional | Caminhos de custo mínimo |
| --- | --- | --- | --- | --- | --- | --- |
| 1 | 10 | 0,0% | 0,0% | 0,0% | 0,0% | 100,0% |
| 1,25 | 12,5 | 11,5% | 0,5% | 4,4% | 10,0% | 88,9% |
| 1,5 | 15 | 18,4% | 1,7% | 10,3% | 20,0% | 73,3% |
| **1,75** | **17,5** | **23,2%** | **2,4%** | **11,1%** | **20,0%** | **60,0%** |
| 2 | 20 | 27,1% | 4,2% | 15,8% | 24,2% | 51,1% |
| 2,25 | 22,5 | 32,2% | 6,4% | 24,2% | 59,6% | 50,0% |
| 3 | 30 | 41,8% | 11,4% | 42,4% | 118,2% | 28,9% |
| 5 | 50 | 62,1% | 32,1% | 122,8% | 169,7% | 13,3% |

Na seleção, o peso 1,75 reduziu expansões em média 20,7%, com custo adicional médio de 1,8% e P95 de 9,6%. Foi o peso de menor esforço entre os que atenderam aos limites definidos. O peso 2 já excedeu o limite P95 na seleção (18,9%), e esse resultado se repetiu na validação (15,8%).

Considerando apenas os 60 mapas de validação no tamanho padrão 40x30, o peso 1,75 reduziu expansões em média 18,0%, com custo adicional médio de 2,3%, P95 de 9,1% e máximo observado de 15,0%.

## Interpretação para a entrega

O peso 1,75 fornece mais direcionamento que o A* padrão, reduzindo aproximadamente um quarto das expansões na amostra de validação, com acréscimo médio de custo pequeno. O peso 2 economiza cerca de quatro pontos percentuais adicionais de expansões, mas aumenta o custo médio e o P95. Pesos 3 e 5 favorecem mais a direção do objetivo e aceitam caminhos substancialmente mais caros.

O padrão permanece ajustável. Com peso 1, é A* padrão e garante custo mínimo nesta grade. Com peso 1,75, é A* ponderado, considerando tanto `g` quanto `h`; não garante custo mínimo. A escolha é a melhor segundo o critério e os mapas avaliados, não um peso universal. As porcentagens observadas não limitam o custo de mapas futuros. A medição avalia expansões, não tempo de CPU nem tempo de deslocamento do agente.

## Reprodução

O código da avaliação está em `tests/astar-benchmark.test.js`. O módulo de ruído utilizado é o [noise.js oficial do p5.js v1.11.10](https://raw.githubusercontent.com/processing/p5.js/v1.11.10/src/math/noise.js), com SHA-256 `c3daba022b86be70898d2cf8bc6cfaad5148d777213ad75fcd34e53acc0bc9e1`.

```sh
node tests/astar-benchmark.test.js caminho/para/noise.js resultado.json
```

O benchmark valida a identidade do módulo e pode produzir um JSON com todas as sementes, pares de células, quantidades de terreno e métricas por peso. Sem o argumento do módulo, ele apenas informa a forma de execução. Essa avaliação é opcional e não altera os requisitos de execução da aplicação: navegador e p5.js da CDN.
