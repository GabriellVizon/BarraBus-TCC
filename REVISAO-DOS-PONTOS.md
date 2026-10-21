# Revisão do cadastro de pontos — Circular de Barra Bonita

A revisão verifica a consistência dos dados do projeto; ela não substitui uma vistoria física de cada parada.

## Resultado

- O cadastro contém 50 registros da Circular, com IDs próprios.
- Nome, endereço, bairro e coordenadas são verificados como campos do cadastro; coordenadas numéricas válidas não comprovam, por si só, a posição exata na rua.
- Os pontos utilizados nas sequências de viagem precisam existir no cadastro.
- O Jaú Serve aparece duas vezes no circuito, em passagens diferentes, intencionalmente.
- O ponto 39 foi corrigido para **-22.4678526, -48.5619391**, conforme coordenadas fornecidas pelo responsável. Referência: casa do portão vermelho, de frente para a Rua Célso Sebastião.
- No ponto 43, o nº 669 é a casa de referência; o nº 678 permanece no endereço cadastrado, conforme esclarecimento do responsável. O modal distingue os dois.
- Nomes antigos permanecem em `apelidos` quando necessário, permitindo que a pesquisa encontre referências anteriores.

## Correspondências e observações

- **15 / 45:** Banca de Calçados e Divinitos compartilham coordenadas. A correspondência de horários foi informada pelo responsável. Os IDs foram mantidos para compatibilidade com favoritos e referências existentes.
- **11 / 10:** Prédio da Marinha utiliza os horários de Boca Rica por uma correspondência provisória. Os registros e as posições permanecem distintos; confirmar em campo antes de fundir cadastros.
- Pontos 13 e 12: atendidos apenas na entrada inicial da manhã, conforme a sequência configurada.

## Efeito das coordenadas nos horários

A lógica de médias foi preservada. A correção geográfica do ponto 39 altera as distâncias usadas pela fórmula e pode modificar algumas previsões entre registros. Os relatos usados como âncoras permanecem os mesmos. Não há GPS dos veículos: as projeções continuam aproximadas.
