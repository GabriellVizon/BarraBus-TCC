'use strict';
const fs=require('fs'),path=require('path'),vm=require('vm'),assert=require('node:assert/strict');
const {test}=require('node:test');const root=path.join(__dirname,'..');global.window=global;
for(const f of ['js/utils.js','js/horarios.js','js/circular-ui.js'])vm.runInThisContext(fs.readFileSync(path.join(root,f),'utf8'));
const pontos=JSON.parse(fs.readFileSync(path.join(root,'dados/pontos.json')));setPontosCircular(pontos);
const date=(h,m,day=11)=>new Date(2026,8,day,h,m),trip=(id,ref,route='B')=>calcularPassagensDoPonto(id,'uteis').find(p=>p.saida===ref&&p.rota===route);
test('preserva relatos da tarde e usa 18:03 como centro do intervalo',()=>{
 for(const [id,time] of [[5,'17:20'],[36,'17:40'],[37,'17:43'],[38,'17:46'],[16,'18:03']])assert.equal(trip(id,'17:15').horario,time);
 assert.equal(trip(16,'17:15').faixa,null);
});
test('média do Jaú é obtida dos dois relatos e transferida às saídas da tarde',()=>{
 for(const ref of ['12:00','13:15','15:15','17:15','18:15'])assert.equal(trip(5,ref).minutos-horarioParaMinutos(ref),5);
});
test('manhã preserva Bar do Amaral e aplica o trecho até Hospital às três voltas',()=>{
 for(const [ref,bar,hospital] of [['06:15','06:30','07:00'],['07:15','07:30','08:00'],['08:15','08:30','09:00']]){
  assert.equal(trip(16,ref,'A').horario,bar);assert.equal(trip(29,ref,'A').horario,hospital);
 }
});
test('todo ponto da sequência tem horário em todas as viagens que o atendem',()=>{
 for(const rota of ['A','B'])for(const ref of obterSaidasDoDia(CONFIG_HORARIOS.rotas[rota],'uteis')){
  const v=construirViagemCircular(rota,ref);assert.equal(v.tempos.length,v.sequencia.length);
  v.tempos.forEach((t,i)=>{assert.ok(Number.isFinite(t.de));assert.ok(t.de>=0);if(i)assert.ok(t.de>=v.tempos[i-1].de);});
 }
});
test('trechos antes e depois dos relatos têm previsões completas',()=>{
 for(const id of [4,33,39,40,41,42,43,44,45,46,47,48,49,50,51,52,17,18,14,19,20,21,22,23,24,10,25,26,27,28,29]){
  assert.equal(calcularPassagensDoPonto(id,'uteis').filter(p=>p.rota==='B').length,5);
 }
});
test('rotina da manhã fecha a volta em 60 min e a última termina na Rodoviária',()=>{
 const v=construirViagemCircular('A','07:15');assert.ok(v.tempos.at(-1).de<60);assert.equal(v.sequencia.at(-1),55);
 assert.equal(construirViagemCircular('A','08:15').sequencia.at(-1),1);
});
test('pontos 13 e 12 só são atendidos uma vez na entrada inicial',()=>{
 for(const id of [13,12]){const times=calcularPassagensDoPonto(id,'uteis');assert.equal(times.length,1);assert.equal(times[0].saida,'06:15');}
});
test('segunda ocorrência do Jaú tem horário próprio e a ordem é preservada',()=>{
 const list=calcularPassagensDoPonto(5,'uteis').filter(p=>p.saida==='17:15');assert.equal(list.length,2);
 assert.deepEqual(list.map(p=>p.ocorrencia),[1,2]);assert.ok(list[1].minutos>list[0].minutos);
});
test('chegada final na Rodoviária não é oferecida como novo embarque',()=>{
 const arrivals=calcularPassagensDoPonto(1,'uteis').filter(p=>!p.embarque);assert.equal(arrivals.length,6);
 assert.equal(encontrarPassagens(1,date(18,16)).encontrado,false);
 assert.doesNotMatch(CircularUI.schedule(1,'uteis',true,date(18,16)),/19:35/);
});
test('projeção da cauda usa média global da tarde e evita duração de três horas',()=>{
 const v=construirViagemCircular('B','17:15');assert.ok(v.tempos.at(-1).de>60);assert.ok(v.tempos.at(-1).de<100);
});
test('sábado e domingo respeitam calendário',()=>{
 assert.deepEqual(obterSaidasDoDiaCircular('sabado'),['06:15','07:15','08:15','15:15','17:15']);
 assert.deepEqual(calcularPassagensDoPonto(16,'domingo'),[]);
 assert.equal(encontrarPassagens(16,date(8,0,13)).encontrado,false);
});
test('após 17:40 Igreja avança para a viagem seguinte sem afirmar presença',()=>{
 assert.equal(encontrarPassagens(36,date(17,39)).label,'17:40');
 assert.equal(encontrarPassagens(36,date(17,41)).label,'18:40');
 assert.equal(encontrarPassagens(36,date(17,40)).situacao,'referencia');
});
test('tabela completa, compacta, sem símbolos e sem avisos repetidos',()=>{
 const html=CircularUI.schedule(17,'uteis',true,date(5,0));
 // Coordenadas do ponto 39 corrigidas pelo responsável em 15/09/2026.
 // A média por distância altera a cauda estimada em um minuto; relatos fixos permanecem iguais.
 for(const time of ['06:32','07:32','08:32','12:50','14:05','16:05','18:05','19:05'])assert.ok(html.includes(time));
 assert.doesNotMatch(html,/≈|±|Cobertura parcial|ESTIMADO ENTRE|No ponto|Agora/);
});

test('tabela geral da Circular usa cards compactos e separa horários futuros dos anteriores',()=>{
 const html=CircularUI.schedule(null,'uteis',false,date(8,0));
 assert.match(html,/circular-general/);
 assert.match(html,/circular-general-title">Manhã/);
 assert.match(html,/circular-general-title">Tarde · Rodoviária/);
 assert.match(html,/circular-time is-next/);
 assert.match(html,/Horários anteriores/);
 assert.match(html,/history-count">2</);
 assert.doesNotMatch(html,/circular-general"><div><strong>Manhã<\/strong><p>/);
});
test('após a última saída da Circular, os horários ficam recolhidos em anteriores',()=>{
 const html=CircularUI.schedule(null,'uteis',false,date(19,0));
 assert.match(html,/Não há mais horários previstos para hoje/);
 assert.match(html,/Horários anteriores/);
 assert.match(html,/history-count">8</);
 assert.doesNotMatch(html,/circular-time is-next/);
});
test('outro dia da Circular mostra todos os horários em cards sem classificá-los como anteriores',()=>{
 const html=CircularUI.schedule(null,'sabado',false,date(22,0));
 assert.match(html,/circular-general/);
 assert.match(html,/06:15/);
 assert.match(html,/17:15/);
 assert.doesNotMatch(html,/Horários anteriores/);
 assert.doesNotMatch(html,/circular-time is-next/);
});
test('outra seleção de dia não perde horários pelo relógio atual',()=>{
 const html=CircularUI.schedule(16,'sabado',true,date(22,0));assert.match(html,/06:30/);assert.match(html,/18:03/);
});
test('domingo tem estado claro; horários anteriores seguem consultáveis',()=>{
 assert.match(CircularUI.schedule(16,'domingo',true,date(8,0,13)),/não opera/);
 assert.match(CircularUI.schedule(16,'uteis',true,date(22,0)),/Horários anteriores/);
});
test('ausência de coordenadas usa distância média por trecho sem NaN',()=>{
 try{setPontosCircular(pontos.map(p=>({...p,lat:null,lng:null})));const v=construirViagemCircular('B','17:15');v.tempos.forEach(t=>assert.ok(Number.isFinite(t.de)));assert.equal(v.tempos[v.sequencia.indexOf(16)].de,48);}finally{setPontosCircular(pontos);}
});
test('calendário de configuração coincide com JSON do projeto',()=>{
 const json=JSON.parse(fs.readFileSync(path.join(root,'dados/horarios.json')));for(const d of ['uteis','sabado','domingo'])assert.deepEqual(obterSaidasDoDiaCircular(d),json[d]);
});
test('todos os pontos cadastrados possuem horários, incluindo as correspondências informadas',()=>{
 for(const p of pontos)assert.ok(obterHorariosDoPonto(p.id,'uteis').length,'Ponto sem horário: '+p.id);
 assert.deepEqual(obterHorariosDoPonto(15,'uteis'),obterHorariosDoPonto(45,'uteis'));
 assert.deepEqual(obterHorariosDoPonto(11,'uteis'),obterHorariosDoPonto(10,'uteis'));
});
