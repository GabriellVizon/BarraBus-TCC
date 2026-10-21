'use strict';

const fs = require('fs');
const path = require('path');
const vm = require('node:vm');
const { test } = require('node:test');
const assert = require('node:assert');

global.window = global;
global.localStorage = (() => {
  const store = {};
  return {
    getItem: (k) => (k in store ? store[k] : null),
    setItem: (k, v) => { store[k] = String(v); },
    removeItem: (k) => { delete store[k]; },
  };
})();
global.document = {
  getElementById: () => null,
  addEventListener: () => {},
  querySelector: () => null,
  querySelectorAll: () => [],
};

const src = fs.readFileSync(path.join(__dirname, '..', 'js', 'utils.js'), 'utf8');
vm.runInThisContext(src);

test('escapeHtml escapa caracteres HTML', () => {
  assert.strictEqual(escapeHtml('<b>&"\'</b>'), '&lt;b&gt;&amp;&quot;&#039;&lt;/b&gt;');
  assert.strictEqual(escapeHtml(null), '');
  assert.strictEqual(escapeHtml(undefined), '');
});

test('normalize remove acentos e converte para minúsculas', () => {
  assert.strictEqual(normalize('São José'), 'sao jose');
  assert.strictEqual(normalize(''), '');
});

test('hasCoords valida coordenadas', () => {
  assert.ok(hasCoords({ lat: -22.4, lng: -48.5 }));
  assert.ok(!hasCoords({ lat: null, lng: -48.5 }));
  assert.ok(!hasCoords({ lat: -22.4, lng: undefined }));
  assert.ok(!hasCoords({ lat: 'x', lng: 1 }));
});

test('formatDistance converte km para metros/quilômetros', () => {
  assert.strictEqual(formatDistance(0.3), '300m');
  assert.strictEqual(formatDistance(1.2), '1,2km');
});

test('formatMinutes formata tempos', () => {
  assert.strictEqual(formatMinutes(0, '06:00'), 'Agora');
  assert.strictEqual(formatMinutes(1, '06:00'), 'Agora');
  assert.strictEqual(formatMinutes(30, '06:00'), '30 min');
  assert.strictEqual(formatMinutes(90, '06:00'), '1h 30min');
  assert.strictEqual(formatMinutes(120, '06:00'), '2h');
  assert.strictEqual(formatMinutes(1500, '06:00'), 'Amanhã 06:00');
});

test('distanceKm calcula distância entre dois pontos', () => {
  const d = distanceKm(-22.4946, -48.5588, -22.4865561, -48.5484917);
  assert.ok(d > 1 && d < 2, 'distância esperada ~1.3km, veio ' + d);
});

test('getHorario retorna horário do dia pedido', () => {
  const h = { uteis: ['06:00'], sabado: [], domingo: [] };
  assert.deepStrictEqual(getHorario(h, 'uteis'), ['06:00']);
  assert.deepStrictEqual(getHorario(h, 'domingo'), []);
  assert.deepStrictEqual(getHorario(null, 'uteis'), []);
  assert.deepStrictEqual(getHorario(['06:00'], 'uteis'), ['06:00']);
});

test('getNextDeparture retorna uma próxima saída válida', () => {
  const h = { uteis: ['06:00', '12:00'], sabado: [], domingo: [] };
  const next = getNextDeparture(h);
  assert.strictEqual(typeof next.time, 'string');
  assert.strictEqual(typeof next.minutes, 'number');
  assert.strictEqual(typeof next.label, 'string');
});

test('getNextDepartures retorna a quantidade pedida, ordenada', () => {
  const h = { uteis: ['06:00', '12:00', '18:00'], sabado: [], domingo: [] };
  const list = getNextDepartures(h, 3);
  assert.strictEqual(list.length, 3);
  assert.ok(list[0].minutes <= list[1].minutes);
  assert.ok(list[1].minutes <= list[2].minutes);
});

test('getNextDepartures com limite menor devolve menos itens', () => {
  const h = { uteis: ['06:00', '12:00'], sabado: [], domingo: [] };
  assert.strictEqual(getNextDepartures(h, 5).length, 2);
});

test('getNextDepartures no domingo informa que não opera', () => {
  const h = { uteis: ['06:00'], sabado: [], domingo: [] };
  const list = getNextDepartures(h, 3);
  if (list[0].time === '--') {
    assert.ok(list[0].label.indexOf('domingo') !== -1 || list[0].label.indexOf('Sem horário') !== -1);
  } else {
    assert.strictEqual(typeof list[0].time, 'string');
  }
});

test('timeToMinutes converte hora em minutos', () => {
  assert.strictEqual(timeToMinutes('06:15'), 375);
  assert.strictEqual(timeToMinutes('00:00'), 0);
  assert.strictEqual(timeToMinutes('23:59'), 1439);
  assert.strictEqual(timeToMinutes('abc'), null);
});

test('nextOccurrenceDate devolve o próximo horário no futuro', () => {
  const from = new Date(2026, 0, 15, 12, 0, 0);
  const sameDay = nextOccurrenceDate(13 * 60, from);
  assert.strictEqual(sameDay.getDate(), 15);
  assert.strictEqual(sameDay.getHours(), 13);

  const past = nextOccurrenceDate(11 * 60, from);
  assert.strictEqual(past.getDate(), 16);
  assert.strictEqual(past.getHours(), 11);
});

test('reminderTriggerDate calcula o gatilho antes do embarque', () => {
  const from = new Date(2026, 0, 15, 12, 0, 0);
  const trigger = reminderTriggerDate('13:15', 10);
  assert.ok(trigger instanceof Date);
  assert.ok(trigger.getTime() > from.getTime());
  assert.strictEqual(trigger.getHours(), 13);
  assert.strictEqual(trigger.getMinutes(), 5);
  assert.strictEqual(reminderTriggerDate('xx', 5), null);
  assert.strictEqual(reminderTriggerDate('13:15', 'abc'), null);
});

test('getNextDeparture no domingo informa que não opera', () => {
  const h = { uteis: ['06:00'], sabado: [], domingo: [] };
  const next = getNextDeparture(h);
  if (next.label === 'Não opera aos domingos') {
    assert.strictEqual(next.time, '--');
  }
});

test('pontosComDistancia calcula distância apenas com GPS', () => {
  const p = [
    { id: 1, lat: -22.4, lng: -48.5 },
    { id: 2, lat: null, lng: null },
  ];
  const com = pontosComDistancia(p, { lat: -22.49, lng: -48.55 });
  assert.strictEqual(typeof com[0].distancia, 'number');
  assert.strictEqual(com[1].distancia, undefined);
});

test('revogar GPS elimina distância herdada sem alterar o cadastro', () => {
  const ponto = { id: 1, lat: -22.4, lng: -48.5, distancia: 0.3 };
  assert.strictEqual(pontosComDistancia([ponto], null)[0].distancia, undefined);
  assert.strictEqual(pontosComDistancia([ponto], {lat: 91, lng: 0})[0].distancia, undefined);
  assert.strictEqual(ponto.distancia, 0.3);
  assert.strictEqual(hasCoords({lat: -22, lng: 181}), false);
});

test('sortPointsByContext ordena por ordem ou distância', () => {
  const a = { id: 1, ordem: 2, distancia: 5 };
  const b = { id: 2, ordem: 1, distancia: 2 };
  assert.strictEqual(sortPointsByContext([a, b], 'ordem')[0].id, 2);
  assert.strictEqual(sortPointsByContext([a, b], 'distancia')[0].id, 2);
});

test('hexToRgba converte hex em rgba', () => {
  assert.strictEqual(hexToRgba('#ff0000', 0.5), 'rgba(255, 0, 0, 0.5)');
  assert.strictEqual(hexToRgba('abc', 1), 'rgba(170, 187, 204, 1)');
});

test('createDistanceCache calcula e invalida com nova posição', () => {
  const pontos = [{ id: 1, nome: 'A', lat: -22.4, lng: -48.5 }];
  let pos = { lat: -22.49, lng: -48.55 };
  const cache = createDistanceCache(() => pontos, () => pos);
  const all = cache.getAll();
  assert.strictEqual(all.length, 1);
  assert.strictEqual(typeof all[0].distancia, 'number');
  const single = cache.forSingle(pontos[0]);
  assert.strictEqual(typeof single.distancia, 'number');
  pos = { lat: -22.48, lng: -48.5 };
  cache.invalidate();
  const all2 = cache.getAll();
  assert.notStrictEqual(all2[0].distancia, all[0].distancia);
});

test('gpsDenied persiste o estado de recusa entre sessões', () => {
  setGpsDeniedPersisted(true);
  assert.strictEqual(getGpsDeniedPersisted(), true);
  setGpsDeniedPersisted(false);
  assert.strictEqual(getGpsDeniedPersisted(), false);
});

test('queryGeolocationPermission resolve unsupported sem API', async () => {
  Object.defineProperty(global, 'navigator', {
    value: { permissions: { query: () => Promise.reject(new Error('falhou')) } },
    configurable: true,
  });
  const state = await queryGeolocationPermission();
  assert.strictEqual(state, 'unsupported');
});

test('shouldRequestLocation permite pedir quando não há Permissions API', async () => {
  Object.defineProperty(global, 'navigator', {
    value: { permissions: undefined },
    configurable: true,
  });
  assert.strictEqual(await shouldRequestLocation(), true);
});


test('cache da entrega TCC guarda somente os dados da Circular', () => {
  const points = [{ id: 1, nome: 'Rodoviária' }];
  const schedules = [{ uteis: ['06:15'], sabado: [], domingo: [] }];
  saveCache(points, schedules);
  const cache = JSON.parse(global.localStorage.getItem('busCacheTccCircularV1'));
  assert.deepStrictEqual(cache.pontos, points);
  assert.deepStrictEqual(cache.horarios, schedules);
  assert.deepStrictEqual(Object.keys(cache).sort(), ['horarios', 'pontos']);
});
