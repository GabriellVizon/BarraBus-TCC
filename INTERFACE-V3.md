# BarraBus — interface e percurso da Circular

## Correções

- Página inicial: “Próximo ônibus” e horário voltaram a ocupar a mesma linha. Foi removida a altura mínima que criava espaço vazio. A regra foi limitada aos cards da página inicial.
- Percurso da Circular: as quatro listas expansíveis foram substituídas por um percurso horizontal com três pontos visíveis por vez. Ao abrir, o ponto consultado já fica em destaque.
- Controles explícitos de anterior/próximo, seleção direta de qualquer visita e retorno ao ponto consultado. O retorno fica desativado quando já se está no ponto.
- Manhã/tarde usam botões com estado selecionado visível. Na manhã, um seletor compacto diferencia primeira volta, volta seguinte e última volta.
- A continuação Kivertron → Ana Mara aparece no final das voltas que continuam. A última volta da manhã e a tarde terminam na Rodoviária. As duas visitas ao Jaú Serve têm opções distintas.
- “Horários / Percurso” ficou no topo do modal. Ao consultar o percurso, mapa e resumo dos horários não empurram a rota para baixo. A aba Horários conserva essas informações.
- Abas com setas do teclado, foco visível, seleção anunciada e retorno de foco ao fechar. Os controles principais têm altura mínima de 44 pixels.

O cálculo dos horários, o calendário e as correspondências entre pontos permanecem iguais aos da v2. Consulte `AJUSTES-CIRCULAR.md` para as hipóteses e limitações do cálculo.

## Pesquisa e decisão

O [NN/g discute o custo adicional dos acordeões](https://www.nngroup.com/articles/accordions-complex-content/): abrir vários grupos acrescenta decisões e cliques, e o conteúdo oculto pode passar despercebido. Isso ajuda a explicar o problema da versão anterior, mas não determina sozinho uma solução universal.

Para este modal, a prioridade adotada foi permitir identificar o ponto anterior e o seguinte e saltar diretamente para outro ponto, preservando a ideia original de uma linha horizontal. A seleção direta mantém acesso a toda a sequência sem exigir dezenas de avanços. O compromisso é mostrar apenas um trecho por vez, em vez de comparar todos os pontos simultaneamente.

A navegação das abas segue as orientações de [Tabs do W3C APG](https://www.w3.org/WAI/ARIA/apg/patterns/tabs/). A correção de foco considera o padrão de [diálogo modal do W3C](https://www.w3.org/WAI/ARIA/apg/patterns/dialog-modal/).

## Verificação

- Os testes automatizados da versão histórica cobriram horários e funções auxiliares; a validação mais recente está registrada em `ENTREGA-1.0.md`.
- 17 arquivos JavaScript verificados quanto à sintaxe. Arquivo do cálculo comparado com a v2: idêntico.
- Cards da página inicial verificados em 320, 360, 390, 768, 1024, 1440 e 1920 pixels: rótulo e relógio alinhados lado a lado, sem quebra do relógio.
- Percurso da tarde verificado em 320, 360, 390, 768 e 1440 pixels, com viewport de 844 pixels de altura: conteúdo da rota entre 408 e 420 pixels de altura, sem rolagem do corpo do modal nesses cenários.
- Primeira, seguinte e última volta da manhã verificadas em 320 pixels, também no tema claro.
- Exercitados: seleção direta, limites anterior/próximo, retorno ao ponto consultado, visitas repetidas ao Jaú, atendimento especial dos pontos 13/12, correspondência Banca/Divinitos, manutenção da posição durante atualização de horários, abas por teclado, Escape e retorno de foco fora do modal.
- Sem erros de execução JavaScript nos cenários exercitados.

São testes locais de interface e revisão visual, não um estudo de usabilidade com passageiros. Recursos externos de ícones, fontes e mapas foram bloqueados nessa rodada; seu funcionamento online não foi avaliado por esses testes.

## Instalação

Extraia `BarraBus-v3-interface-percurso.zip` e use a pasta `Pontos-Onibus-Barra` no lugar da versão anterior. Ela inclui o novo `js/circular-route.js` e o cache `barrabus-v18-percurso-compacto` no `sw.js`. Ao atualizar a hospedagem, envie a pasta completa.

Nenhuma publicação foi feita automaticamente. O ZIP original e as versões anteriores foram preservados.
