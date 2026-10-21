> A interface atual é a v3. Leia `INTERFACE-V3.md` para os ajustes da página inicial e do percurso. O cálculo abaixo permanece o da v2.

# BarraBus v2 — horários completos e cards corrigidos

Versão de 11/09/2026. Substitui a entrega anterior com cobertura parcial. Não publicada.

## Resultado

- Todos os pontos cadastrados têm horários estimados para as viagens que os atendem. Os pontos 13 e 12 continuam com uma passagem na entrada inicial da manhã.
- Horários da manhã usam um perfil próprio, calibrado pelos relatos do Bar do Amaral e Hospital. O perfil da tarde usa Jaú Serve, Igreja, Orestes Gerin, Papa João e Bar do Amaral.
- A tabela mostra um horário por previsão, sem ≈, ± ou intervalos repetidos. O relato 18:00–18:06 vira 18:03.
- Cards exibem “Próximo horário” e o relógio em linhas separadas, sem espremer os números. Os avisos extensos foram retirados; permanece uma nota discreta por página e no detalhe do ponto.
- Os horários anteriores continuam consultáveis. A atualização avança para a próxima previsão, sem afirmar que o ônibus está presente.
- Calendário de sábado e domingo preservado. A chegada final à Rodoviária não vira uma nova possibilidade de embarque.

Veja todos os horários em [HORARIOS-CALCULADOS.md](HORARIOS-CALCULADOS.md).

## Cálculo das médias

As observações são agrupadas por período e pela ocorrência do ponto dentro da rota. Calcula-se o tempo médio desde a referência da viagem até cada ponto observado. Um intervalo relatado é representado pelo seu centro.

| Perfil | Ponto | Tempo desde a referência |
|---|---|---|
| Manhã | Bar do Amaral | 15 min, média dos relatos 06:30, 07:30 e 08:30 |
| Manhã | Hospital | 45 min, a partir do relato de 09:00 na volta 08:15 |
| Tarde | Rodoviária, saída | 0 min |
| Tarde | Jaú Serve, após Fernandes Max | 5 min, média dos relatos 15:20 e 17:20 |
| Tarde | Igreja | 25 min |
| Tarde | Orestes Gerin | 28 min |
| Tarde | Papa João | 31 min |
| Tarde | Bar do Amaral | 48 min, centro do intervalo 45–51 min |

Esses perfis são aplicados às demais viagens do mesmo período. Assim, não se exige uma observação em cada saída para preencher a tabela. Os dados são escassos: “média” aqui inclui referências baseadas em um único relato aproximado, não uma pesquisa de viagens em vários dias.

Entre os pontos de referência, os minutos são distribuídos conforme as distâncias entre pontos consecutivos. Usa-se distância geográfica como aproximação; não é um levantamento do trajeto viário real. Sem coordenadas válidas, usa-se a distância média dos trechos disponíveis.

Depois do último registro da tarde, o modelo usa o ritmo médio ponderado de todo o trecho conhecido da tarde: aproximadamente 48 minutos para 10,57 km de distância acumulada. Isso evita ampliar o ritmo de um trecho curto para todo o restante da volta. Os horários são arredondados para o minuto mais próximo.

## Hipóteses que precisam permanecer documentadas

**Manhã:** a repetição observada no Bar do Amaral a cada hora orienta o fechamento do circuito em 60 minutos. O início das voltas seguintes usa Ana Mara como fase de cálculo. Na primeira volta, a sequência começa em 13 e 12. Isso é uma convenção do modelo: não comprova que o ônibus sai de Ana Mara precisamente às 07:15 ou 08:15. A última volta termina na Rodoviária, por volta de 09:03 no modelo atual.

**Tarde:** o modelo completo resulta em aproximadamente 80 minutos por volta, com retorno da viagem de 17:15 por volta de 18:35. Isso ultrapassa o intervalo até a saída informada de 18:15. As saídas recebidas foram mantidas. Os dados atuais não permitem conciliar essa diferença com a operação de um único ônibus; o tempo do trecho final ainda precisa ser observado. O aplicativo estima passagens por viagem, não faz uma simulação confirmada da escala do veículo.

**Feriados:** não foram informados. O app distingue dias úteis, sábado e domingo.

Essas hipóteses ficam nesta documentação para permitir revisão do cálculo, sem repetir explicações técnicas em todos os cards.

## Pontos e correspondências

- Banca de Calçados (15): endereço atualizado para **R. João Morelato, 198 - Conj. Res. Cel. Jose V. Franca III**. Usa os horários de Divinitos (45), conforme informado. As coordenadas já coincidiam no cadastro. Os dois IDs foram preservados para manter os favoritos existentes.
- Prédio da Marinha (11): usa os horários de Boca Rica (10) como correspondência provisória, pois a identificação foi descrita como provável. Nome, endereço e coordenadas do ponto 11 permanecem cadastrados até confirmação; somente a correspondência de horários foi aplicada.
- Jaú Serve (5): suas duas visitas permanecem distintas. A tabela identifica “Após Fernandes Max” e “Após Igreja Matriz”.
- Pontos 13 e 12: somente na entrada inicial da manhã. Nas demais voltas, a sequência segue Kivertron → Ana Mara.

## Escopo e verificação da versão TCC

- Os testes automatizados atuais cobrem cálculo das previsões, calendário, percurso, pontos, utilitários, lembretes e escopo da entrega. O resultado mais recente é registrado em `ENTREGA-1.0.md`.
- A sintaxe dos arquivos JavaScript principais é verificada com `node --check`.
- Os horários continuam sendo previsões aproximadas, não medições de todas as viagens. Fontes externas e o ambiente de publicação precisam ser conferidos separadamente.
- Os lembretes locais estão disponíveis nos detalhes dos pontos. O agendamento respeita os minutos restantes até a previsão. Como usa recursos locais do navegador, não há garantia de disparo com a aplicação totalmente encerrada.

## Usar esta versão

Extraia o ZIP e abra a pasta `Pontos-Onibus-Barra` com um servidor local, como o Live Server. Use esta pasta no lugar da entrega anterior. Abrir o HTML diretamente pelo explorador pode impedir o carregamento dos dados.

Se for publicar, envie o conjunto completo de arquivos da pasta. O `sw.js` usa agora o cache **barrabus-tcc-circular-v1**. Isso ajuda a substituir os arquivos anteriores no app instalado. A publicação em subpasta deve ser validada quanto ao escopo e aos caminhos do service worker.

O ZIP original e a entrega anterior foram preservados. Nenhum site foi publicado ou atualizado automaticamente.
