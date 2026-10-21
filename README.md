# BarraBus — versão TCC (Circular de Barra Bonita)

Aplicação web responsiva para consultar pontos, horários estimados e percurso da Circular de Barra Bonita (SP). Esta entrega é focada exclusivamente nessa linha e não inclui dados de outras linhas.

O projeto usa HTML, CSS e JavaScript puro, com Leaflet para o mapa e uma PWA para permitir consultar os dados já carregados mesmo sem conexão. **Não há rastreamento em tempo real dos ônibus**: os horários são previsões calculadas a partir das referências operacionais disponíveis.

## Funcionalidades

- Consulta e pesquisa dos pontos cadastrados.
- Horários por dia da semana, com destaque para a próxima previsão e acesso aos horários anteriores.
- Percurso da Circular e seleção de pontos pelo mapa ou pela interface.
- Localização do usuário e ordenação por proximidade, quando o GPS é permitido.
- Abertura de destino/rota no Google Maps, serviço externo que pode exigir internet.
- Favoritos e lembretes de horário.
- Tema claro/escuro, layout responsivo e instalação como PWA.
- Cache dos arquivos essenciais para consulta offline após o primeiro carregamento.

## Como executar

O projeto precisa ser servido por HTTP/HTTPS; abrir `index.html` diretamente com `file://` impede o carregamento dos arquivos JSON.

Com Node.js instalado:

```bash
npx serve .
```

Também é possível usar a extensão **Live Server** do VS Code. Para publicar, envie os arquivos estáticos completos para uma hospedagem HTTPS e confirme o domínio configurado no HTML antes da entrega pública.

## Testes

```bash
npm test
npm run lint
```

Os testes verificam cálculos de horários, utilitários, lembretes, dados e o escopo desta versão. Execute-os novamente após qualquer alteração.

## Estrutura principal

- `index.html` e `pontos.html`: páginas da aplicação.
- `script.js` e `js/pontos.js`: comportamento da página inicial e da tela de pontos.
- `js/horarios.js` e `js/circular-ui.js`: cálculo e apresentação dos horários da Circular.
- `js/circular-route.js` e `js/modal.js`: percurso e detalhes dos pontos.
- `js/reminders.js`: lembretes locais.
- `dados/pontos.json` e `dados/horarios.json`: dados utilizados pela aplicação.
- `sw.js` e `manifest.json`: instalação e cache da PWA.
- `test/`: testes automatizados.

## Limitações conhecidas

- Os horários são estimados e não representam a posição real do ônibus.
- Os lembretes usam recursos locais do navegador. Eles não são notificações push de servidor e podem não disparar se a aplicação/aba for encerrada ou suspensa pelo sistema.
- O Google Maps é externo ao BarraBus; a abertura da rota depende do dispositivo, do navegador e da conectividade.
- A consulta offline preserva dados já carregados, mas novas imagens cartográficas dependem da conexão ou do cache do navegador.
- As correspondências de horário documentadas em `AJUSTES-CIRCULAR.md` devem continuar identificadas como aproximações quando aplicável.

## Documentação complementar

- `ENTREGA-1.0.md`: escopo e validações da versão para TCC.
- `AJUSTES-CIRCULAR.md`: metodologia e hipóteses do cálculo.
- `HORARIOS-CALCULADOS.md`: tabela de referência dos horários calculados.
- `REVISAO-DOS-PONTOS.md`: revisão do cadastro dos pontos.
