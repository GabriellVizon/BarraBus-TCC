// Circular: referências de operação e observações aproximadas do passageiro.
// As referências A não significam novas saídas da garagem a cada hora.
const CONFIG_HORARIOS = {
    rotas: {
        A: {
            nome: 'Manhã',
            saidas: { uteis: ['06:15', '07:15', '08:15'], sabado: ['06:15', '07:15', '08:15'], domingo: [] },
            inicioEspecial: [13, 12],
            circuito: [33,34,35,36,37,38,39,40,41,42,43,44,45,46,47,48,49,50,51,52,16,17,18,14,19,20,21,22,23,24,10,25,26,27,28,5,29,1,4,5,6,7,8,9,53,54,55]
        },
        B: {
            nome: 'Tarde',
            saidas: { uteis: ['12:00', '13:15', '15:15', '17:15', '18:15'], sabado: ['15:15', '17:15'], domingo: [] },
            circuito: [1,4,5,6,7,8,9,53,54,55,33,34,35,36,37,38,39,40,41,42,43,44,45,46,47,48,49,50,51,52,16,17,18,14,19,20,21,22,23,24,10,25,26,27,28,5,29,1]
        }
    },
    // Correspondências informadas pelo proprietário; 11 → 10 é provisória.
    correspondencias: { 11: 10, 15: 45 },
    // Minutos relativos à referência da viagem. Ocorrências repetidas são distintas.
    // Sem datas/amostra suficientes para calcular um intervalo estatístico de confiança.
    observacoes: {
        'A_06:15': [{ pontoId: 16, ocorrencia: 1, de: 15, ate: 15 }],
        'A_07:15': [{ pontoId: 16, ocorrencia: 1, de: 15, ate: 15 }],
        'A_08:15': [{ pontoId: 16, ocorrencia: 1, de: 15, ate: 15 }, { pontoId: 29, ocorrencia: 1, de: 45, ate: 45 }],
        'B_15:15': [{ pontoId: 5, ocorrencia: 1, de: 5, ate: 5 }],
        'B_17:15': [
            { pontoId: 5, ocorrencia: 1, de: 5, ate: 5 },
            { pontoId: 36, ocorrencia: 1, de: 25, ate: 25 },
            { pontoId: 37, ocorrencia: 1, de: 28, ate: 28 },
            { pontoId: 38, ocorrencia: 1, de: 31, ate: 31 },
            { pontoId: 16, ocorrencia: 1, de: 45, ate: 51 }
        ]
    }
};

var PONTOS_CIRCULAR = [];
function setPontosCircular(pontos) { PONTOS_CIRCULAR = Array.isArray(pontos) ? pontos : []; VIAGENS_CIRCULAR = {}; }
function getPontoCircular(id) { return PONTOS_CIRCULAR.find(function (p) { return String(p.id) === String(id); }) || null; }
function horarioParaMinutos(h) { var p = h.split(':').map(Number); return p[0] * 60 + p[1]; }
function minutosParaHorario(m) {
    var total = ((Math.round(m) % 1440) + 1440) % 1440;
    return String(Math.floor(total / 60)).padStart(2, '0') + ':' + String(total % 60).padStart(2, '0');
}
function diaCircular(agora) {
    var dia = (agora || new Date()).getDay();
    return dia === 0 ? 'domingo' : dia === 6 ? 'sabado' : 'uteis';
}
function obterSaidasDoDia(rota, dia) { return (rota && rota.saidas[dia || diaCircular()]) || []; }
function obterSaidasDoDiaCircular(dia) {
    var lista = [];
    Object.values(CONFIG_HORARIOS.rotas).forEach(function (r) { lista = lista.concat(obterSaidasDoDia(r, dia)); });
    return Array.from(new Set(lista)).sort();
}
function diasComHorariosCircular() {
    return [{ id: 'uteis', nome: 'Dias Úteis' }, { id: 'sabado', nome: 'Sábado' }, { id: 'domingo', nome: 'Domingo · não opera' }];
}
function sequenciaViagemCircular(codigo, referencia) {
    var rota = CONFIG_HORARIOS.rotas[codigo];
    if (!rota) return [];
    var seq = rota.circuito.slice();
    if (codigo === 'A' && referencia === '06:15') seq = rota.inicioEspecial.concat(seq);
    // A última viagem da manhã encerra na Rodoviária, sem continuar até a Kivertron.
    if (codigo === 'A' && referencia === '08:15') seq = seq.slice(0, seq.indexOf(1) + 1);
    return seq;
}
function indiceOcorrenciaCircular(seq, id, ocorrencia) {
    var vistos = 0;
    return seq.findIndex(function (p) { if (p === id) vistos++; return p === id && vistos === ocorrencia; });
}
// Média dos relatos disponíveis por período, preservando a visita específica.
function mediasObservadasCircular(codigo) {
    var grupos = {};
    Object.keys(CONFIG_HORARIOS.observacoes).filter(function (key) { return key.startsWith(codigo + '_'); }).forEach(function (key) {
        CONFIG_HORARIOS.observacoes[key].forEach(function (r) {
            var chave = r.pontoId + ':' + r.ocorrencia;
            if (!grupos[chave]) grupos[chave] = { pontoId: r.pontoId, ocorrencia: r.ocorrencia, soma: 0, n: 0 };
            grupos[chave].soma += (r.de + r.ate) / 2;
            grupos[chave].n++;
        });
    });
    return Object.values(grupos).map(function (g) { return { pontoId: g.pontoId, ocorrencia: g.ocorrencia, minuto: g.soma / g.n }; });
}
var VIAGENS_CIRCULAR = {};
function construirViagemCircular(codigo, referencia) {
    var chave = codigo + '_' + referencia;
    if (VIAGENS_CIRCULAR[chave]) return VIAGENS_CIRCULAR[chave];
    var seq = sequenciaViagemCircular(codigo, referencia);
    if (!seq.length) return { sequencia: [], tempos: [] };
    // Fechamento do circuito da manhã na mesma fase da volta seguinte (60 min).
    // A referência da manhã é uma fase de cálculo, não nova saída da garagem.
    var completa = seq.slice();
    if (codigo === 'A' && referencia !== '08:15') completa.push(33);
    var distancias = [0], pesos = [];
    for (var i = 1; i < completa.length; i++) {
        var p = getPontoCircular(completa[i - 1]), q = getPontoCircular(completa[i]);
        var d = p && q && hasCoords(p) && hasCoords(q) ? distanceKm(+p.lat, +p.lng, +q.lat, +q.lng) : 0;
        pesos.push(Number.isFinite(d) && d > 0 ? d : null);
    }
    var validos = pesos.filter(function (v) { return v !== null; });
    var mediaDistancia = validos.length ? validos.reduce(function (a,b) { return a+b; },0)/validos.length : 1;
    pesos.forEach(function (p) { distancias.push(distancias[distancias.length-1] + (p || mediaDistancia)); });
    var ancoras = mediasObservadasCircular(codigo).map(function (r) {
        return { indice: indiceOcorrenciaCircular(completa,r.pontoId,r.ocorrencia), minuto:r.minuto, tipo:'media' };
    }).filter(function (a) { return a.indice >= 0; });
    ancoras.unshift({ indice:0, minuto:0, tipo:codigo === 'B' ? 'informado' : 'fase' });
    if (codigo === 'A') {
        if (referencia === '08:15') {
            // Usa o mesmo tempo Hospital → Rodoviária do circuito padrão.
            var padrao = construirViagemCircular('A','07:15');
            ancoras.push({ indice:completa.length-1, minuto:padrao.tempos[padrao.sequencia.indexOf(1)].de, tipo:'estimado' });
        } else ancoras.push({ indice:completa.length-1, minuto:60, tipo:'ciclo' });
    }
    ancoras.sort(function (a,b) { return a.indice-b.indice; });
    var tempos = completa.map(function () { return null; });
    ancoras.forEach(function (a,i) {
        if (i && (a.indice <= ancoras[i-1].indice || a.minuto <= ancoras[i-1].minuto)) throw Error('Âncoras fora de ordem: '+chave);
        tempos[a.indice]={de:a.minuto,ate:a.minuto,tipo:a.tipo};
    });
    for (var a=0; a<ancoras.length-1; a++) {
        var inicio=ancoras[a],fim=ancoras[a+1];
        for (var j=inicio.indice+1;j<fim.indice;j++) {
            var proporcao=(distancias[j]-distancias[inicio.indice])/(distancias[fim.indice]-distancias[inicio.indice]);
            var valor=inicio.minuto+(fim.minuto-inicio.minuto)*proporcao;
            tempos[j]={de:valor,ate:valor,tipo:'estimado'};
        }
    }
    // Cauda da tarde: ritmo médio ponderado de TODO o trecho observado,
    // evitando projetar uma volta inteira pela velocidade de um trecho curto.
    var primeira=ancoras[0],ultima=ancoras[ancoras.length-1];
    var minutosPorKm=(ultima.minuto-primeira.minuto)/(distancias[ultima.indice]-distancias[primeira.indice]);
    for (var k=ultima.indice+1;k<completa.length;k++) {
        var estimado=ultima.minuto+(distancias[k]-distancias[ultima.indice])*minutosPorKm;
        tempos[k]={de:estimado,ate:estimado,tipo:'estimado'};
    }
    var resultado={sequencia:seq,tempos:tempos.slice(0,seq.length)};
    VIAGENS_CIRCULAR[chave]=resultado;
    return resultado;
}

function calcularPassagensDoPonto(pontoId, dia) {
    var passagens = [];
    var idTrajeto = CONFIG_HORARIOS.correspondencias[pontoId] || pontoId;
    Object.keys(CONFIG_HORARIOS.rotas).forEach(function (codigo) {
        obterSaidasDoDia(CONFIG_HORARIOS.rotas[codigo], dia).forEach(function (referencia) {
            var viagem = construirViagemCircular(codigo, referencia), ocorrencias = {};
            viagem.sequencia.forEach(function (id, posicao) {
                ocorrencias[id] = (ocorrencias[id] || 0) + 1;
                var t = viagem.tempos[posicao];
                if (String(id) !== String(idTrajeto) || !t) return;
                var base = horarioParaMinutos(referencia);
                var de = Math.round(base + t.de), ate = Math.round(base + t.ate);
                var faixa = de === ate ? null : { de: minutosParaHorario(de), ate: minutosParaHorario(ate) };
                if (faixa) faixa.label = faixa.de + '–' + faixa.ate;
                passagens.push({
                    linha: 'circular', nomeLinha: 'Circular', rota: codigo,
                    nomeRota: CONFIG_HORARIOS.rotas[codigo].nome, saida: referencia,
                    pontoId: pontoId, posicao: posicao, ocorrencia: ocorrencias[id],
                    embarque: !(id === 1 && posicao === viagem.sequencia.length - 1),
                    horario: minutosParaHorario(de), minutos: de, minutosFim: ate,
                    tipo: t.tipo, faixa: faixa, aproximado: t.tipo !== 'informado'
                });
            });
        });
    });
    return passagens.sort(function (a, b) { return a.minutos - b.minutos; });
}
function obterHorariosDoPonto(id, dia) {
    return Array.from(new Set(calcularPassagensDoPonto(id, dia).filter(function(p) { return p.embarque; }).map(function (p) { return p.horario; })));
}
function rotuloPassagemCircular(p) { return p.horario; }
function origemPassagemCircular(p) {
    return p.tipo === 'informado' ? 'Saída da Rodoviária' : 'Horário estimado';
}
function encontrarPassagens(id, agora, dia) {
    agora = agora || new Date();
    dia = dia || diaCircular(agora);
    if (dia === 'domingo') return { encontrado: false, situacao: 'sem_operacao', estado: 'sem_operacao', mensagem: 'Não opera aos domingos', pontoId: id };
    var passagens = calcularPassagensDoPonto(id, dia);
    if (!passagens.length) return { encontrado: false, situacao: 'sem_trajeto', estado: 'sem_trajeto', mensagem: 'A confirmar', pontoId: id };
    var agoraMin = agora.getHours() * 60 + agora.getMinutes();
    var proxima = passagens.find(function (p) { return p.embarque && p.minutosFim >= agoraMin; });
    if (!proxima) return {
        encontrado: false, situacao: 'sem_estimativa', estado: 'sem_estimativa', pontoId: id,
        mensagem: 'Fim dos horários',
        aviso: ''
    };
    return Object.assign({}, proxima, {
        encontrado: true, esperado: proxima.horario,
        minutos: Math.max(0, proxima.minutos - agoraMin), minutosRestantes: Math.max(0, proxima.minutos - agoraMin),
        situacao: 'referencia', estado: 'referencia', label: rotuloPassagemCircular(proxima),
        aviso: ''
    });
}
function apresentarProximaCircular(id, agora, dia) {
    var p = encontrarPassagens(id, agora, dia);
    return Object.assign({}, p, { time: p.encontrado ? p.horario : '--', label: p.encontrado ? p.label : p.mensagem,
        minutes: p.encontrado ? p.minutosRestantes : Infinity });
}
function obterTextoProximoOnibus(id) {
    var p = apresentarProximaCircular(id);
    return { texto: p.label, horario: p.time === '--' ? null : p.time, estado: p.estado };
}
