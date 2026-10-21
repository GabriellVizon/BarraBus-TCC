(function () {
    'use strict';

    var aviso = 'Horários aproximados. Chegue alguns minutos antes.';
    var LIMITE_INICIAL = 10;

    function cards(lista, proxima) {
        return '<div class="circular-times">' + lista.map(function (p) {
            var primeiro = p === proxima;
            return '<div class="circular-time' + (primeiro ? ' is-next' : '') + '">' +
                '<span class="circular-time-caption">' + (primeiro ? 'Próximo' : p.nomeRota) + '</span>' +
                '<strong>' + escapeHtml(p.horario) + '</strong>' +
                (p.pontoId == 5 ? '<small>' + (p.rota === 'B' && p.ocorrencia === 1 || p.rota === 'A' && p.ocorrencia === 2 ? 'Após Fernandes Max' : 'Após Igreja Matriz') + '</small>' : '') +
                '</div>';
        }).join('') + '</div>';
    }

    function generalCards(lista, proxima, isToday, anteriores) {
        return '<div class="circular-times">' + lista.map(function (item) {
            var primeiro = item === proxima;
            var legenda = anteriores ? 'Anterior' : primeiro ? 'Próximo' : isToday ? 'Mais tarde' : 'Horário';
            return '<div class="circular-time' + (primeiro ? ' is-next' : '') + '">' +
                '<span class="circular-time-caption">' + legenda + '</span>' +
                '<strong>' + escapeHtml(item.horario) + '</strong>' +
                '</div>';
        }).join('') + '</div>';
    }

    function generalGroup(grupo, lista, proxima, isToday, anteriores) {
        if (!lista.length) return '';
        return '<section class="circular-general-group">' +
            '<h3 class="circular-general-title">' + escapeHtml(grupo.nome) + '</h3>' +
            generalCards(lista, proxima, isToday, anteriores) +
            '</section>';
    }

    function generalSchedule(dia, expanded, agora) {
        agora = agora || new Date();
        var hoje = dia === diaCircular(agora);
        var minutoAtual = agora.getHours() * 60 + agora.getMinutes();
        var grupos = [
            { id: 'A', nome: 'Manhã', saidas: obterSaidasDoDia(CONFIG_HORARIOS.rotas.A, dia) },
            { id: 'B', nome: 'Tarde · Rodoviária', saidas: obterSaidasDoDia(CONFIG_HORARIOS.rotas.B, dia) }
        ].map(function (grupo) {
            grupo.horarios = grupo.saidas.map(function (horario) {
                return {
                    horario: horario,
                    minutos: horarioParaMinutos(horario),
                    rota: grupo.id
                };
            });
            return grupo;
        });
        var todos = grupos.reduce(function (lista, grupo) {
            return lista.concat(grupo.horarios);
        }, []).sort(function (a, b) { return a.minutos - b.minutos; });
        var futuros = todos.filter(function (item) { return !hoje || item.minutos >= minutoAtual; });
        var anteriores = hoje ? todos.filter(function (item) { return item.minutos < minutoAtual; }) : [];
        var visiveis = expanded ? futuros : futuros.slice(0, LIMITE_INICIAL);
        var ocultos = Math.max(0, futuros.length - visiveis.length);
        var proxima = hoje && futuros.length ? futuros[0] : null;
        var html = '';

        if (visiveis.length) {
            html += '<div class="circular-general">';
            grupos.forEach(function (grupo) {
                var horariosVisiveis = visiveis.filter(function (item) { return item.rota === grupo.id; });
                html += generalGroup(grupo, horariosVisiveis, proxima, hoje, false);
            });
            html += '</div>';
        } else {
            html += '<p class="circular-notice">' + (hoje ? 'Não há mais horários previstos para hoje.' : 'Não há horários disponíveis para este dia.') + '</p>';
        }

        if (futuros.length > visiveis.length) {
            html += '<button type="button" class="schedule-toggle-btn" id="scheduleFutureToggle"><i class="ti ti-plus"></i>Ver mais ' + ocultos + ' horários</button>';
        } else if (expanded && futuros.length > LIMITE_INICIAL) {
            html += '<button type="button" class="schedule-toggle-btn" id="scheduleFutureToggle"><i class="ti ti-minus"></i>Mostrar menos horários</button>';
        }

        if (anteriores.length) {
            html += '<details class="passed-details schedule-history"><summary>' +
                '<svg class="history-icon" viewBox="0 0 24 24" width="22" height="22" fill="none" stroke="currentColor" stroke-width="1.8" aria-hidden="true"><path d="M3 11a9 9 0 1 1 2.6 7M3 5v6h6M12 7v5l3 2" stroke-linecap="round" stroke-linejoin="round"/></svg>' +
                '<span class="history-title">Horários anteriores</span><span class="history-count">' + anteriores.length + '</span>' +
                '<span class="history-action" aria-hidden="true"><span class="history-show">Ver</span><span class="history-hide">Ocultar</span><span class="history-chevron"></span></span>' +
                '</summary><div class="circular-general-history">';
            grupos.forEach(function (grupo) {
                var horariosAnteriores = anteriores.filter(function (item) { return item.rota === grupo.id; });
                html += generalGroup(grupo, horariosAnteriores, null, hoje, true);
            });
            html += '</div></details>';
        }

        return html;
    }

    function schedule(pontoId, dia, expanded, agora) {
        agora = agora || new Date();
        if (dia === 'domingo') return '<p class="circular-notice">A Circular não opera aos domingos.</p>';
        if (!pontoId) return generalSchedule(dia, expanded, agora);

        var horarios = calcularPassagensDoPonto(pontoId, dia).filter(function (p) { return p.embarque; });
        var hoje = dia === diaCircular(agora);
        var minuto = agora.getHours() * 60 + agora.getMinutes();
        if (!horarios.length) return '<p class="circular-notice">Atendimento deste ponto a confirmar.</p>';

        var futuros = horarios.filter(function (p) { return !hoje || p.minutos >= minuto; });
        var anteriores = horarios.filter(function (p) { return hoje && p.minutos < minuto; });
        var visiveis = expanded ? futuros : futuros.slice(0, LIMITE_INICIAL);
        var ocultos = Math.max(0, futuros.length - visiveis.length);
        var html = visiveis.length ? cards(visiveis, hoje ? futuros[0] : null) : '<p class="circular-notice">Não há mais horários previstos para hoje.</p>';

        if (futuros.length > visiveis.length) html += '<button type="button" class="schedule-toggle-btn" id="scheduleFutureToggle"><i class="ti ti-plus"></i>Ver mais ' + ocultos + ' horários</button>';
        else if (expanded && futuros.length > LIMITE_INICIAL) html += '<button type="button" class="schedule-toggle-btn" id="scheduleFutureToggle"><i class="ti ti-minus"></i>Mostrar menos horários</button>';

        if (anteriores.length) html += '<details class="passed-details schedule-history"><summary>' +
            '<svg class="history-icon" viewBox="0 0 24 24" width="22" height="22" fill="none" stroke="currentColor" stroke-width="1.8" aria-hidden="true"><path d="M3 11a9 9 0 1 1 2.6 7M3 5v6h6M12 7v5l3 2" stroke-linecap="round" stroke-linejoin="round"/></svg>' +
            '<span class="history-title">Horários anteriores</span><span class="history-count">' + anteriores.length + '</span>' +
            '<span class="history-action" aria-hidden="true"><span class="history-show">Ver</span><span class="history-hide">Ocultar</span><span class="history-chevron"></span></span>' +
            '</summary>' + cards(anteriores, null) + '</details>';

        return html;
    }

    window.CircularUI = { schedule: schedule, aviso: aviso, initialLimit: LIMITE_INICIAL };
})();
