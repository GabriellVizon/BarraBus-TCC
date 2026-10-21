# BarraBus — versão TCC: Circular de Barra Bonita

Data da preparação: 21/10/2026.

## Escopo da entrega

Esta versão é dedicada exclusivamente à Circular de Barra Bonita. A interface, os dados, a pesquisa, os favoritos, os horários, os lembretes e os mapas utilizam apenas os pontos cadastrados dessa linha.

## Funcionalidades preservadas

- Página inicial com pesquisa, favoritos, pontos próximos e mapa.
- Página Pontos com seleção de ponto, tabela de horários por dia e percurso.
- Cálculo de previsões por referência de viagem, sem simular rastreamento ao vivo.
- GPS opcional, distância aproximada e abertura do Google Maps.
- Lembretes locais por ponto, com opções limitadas ao tempo restante até a previsão.
- Tema claro/escuro, responsividade e instalação PWA.
- Cache exclusivo desta entrega para evitar reutilizar dados antigos armazenados no navegador.

## Validações realizadas nesta preparação

- 50/50 testes automatizados passaram (`npm test`).
- Todos os arquivos JavaScript próprios passaram em `node --check`.
- Verificação estática confirmou 50 pontos com IDs únicos, apenas os dois JSON necessários e 38 arquivos existentes no pré-cache da PWA.
- A busca em arquivos da aplicação, estilos e documentação não encontrou referências à linha removida. Os testes mantêm verificações negativas para impedir regressões.
- O ESLint não foi executado nesta sessão porque a dependência `eslint` não estava instalada e a instalação de pacotes não concluiu.
- A navegação automatizada no navegador não pôde ser validada neste ambiente; por isso, a conferência final no Chrome e em celular permanece necessária.

## Validações finais antes da apresentação

- Se necessário, instalar as dependências com `npm ci`; depois executar `npm test` e `npm run lint`.
- Abrir as duas páginas por servidor local e verificar pesquisa, favoritos, horários, percurso, mapa e lembretes.
- Testar GPS permitido, negado e indisponível.
- Conferir em celular a responsividade, instalação PWA e abertura do Google Maps.
- Testar a consulta offline após carregar o site uma vez.
- Confirmar que o mapa e a busca exibem somente pontos da Circular.

## Limitações a declarar no TCC

- Os horários são estimados a partir de referências disponíveis; o aplicativo não acompanha a posição do veículo em tempo real.
- O Google Maps é um serviço externo e pode exigir internet.
- Os lembretes são locais e não têm garantia de disparo com o navegador totalmente encerrado.
- A disponibilidade de mapas offline depende do cache do navegador; o BarraBus mantém os dados e a estrutura da aplicação em cache.

## Execução e publicação

Execute `npx serve .` ou use Live Server. Para publicação, hospede a pasta completa em HTTPS, defina a URL pública real nos metadados e valide a versão publicada em computador e celular. Esta documentação não indica que o site tenha sido publicado automaticamente.
