'use strict';
const { test } = require('node:test');
const assert = require('node:assert/strict');
const fs = require('node:fs');
const path = require('node:path');
const root = path.join(__dirname, '..');
const read = (file) => fs.readFileSync(path.join(root, file), 'utf8');

test('a entrega TCC usa somente os dados da Circular', () => {
  assert.ok(fs.existsSync(path.join(root, 'dados/pontos.json')));
  assert.ok(fs.existsSync(path.join(root, 'dados/horarios.json')));
  const removedLineToken = ['ple', 'na'].join('');
  const removedDataFiles = ['pontos', 'horarios'].map((name) => name + '-' + removedLineToken + '.json');
  for (const file of removedDataFiles) assert.ok(!fs.existsSync(path.join(root, 'dados', file)));
  for (const file of ['index.html', 'pontos.html', 'script.js', 'js/pontos.js', 'js/modal.js', 'js/horarios.js', 'sw.js', 'manifest.json', 'pontos.css', 'css/shared.css', 'README.md', 'ENTREGA-1.0.md', 'AJUSTES-CIRCULAR.md', 'INTERFACE-V3.md', 'REVISAO-DOS-PONTOS.md']) {
    assert.doesNotMatch(read(file), new RegExp(removedLineToken, 'i'), 'referência inesperada em ' + file);
  }
  const jsonFiles = fs.readdirSync(path.join(root, 'dados')).filter((name) => name.endsWith('.json')).sort();
  assert.deepEqual(jsonFiles, ['horarios.json', 'pontos.json']);
});
