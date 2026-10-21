'use strict';
const {test}=require('node:test'),assert=require('node:assert/strict');
const fs=require('fs'),path=require('path'),vm=require('node:vm');
const root=path.join(__dirname,'..');
function setup(){
 let stored='[]',timers=[];
 const ctx=vm.createContext({window:{},Date,console,
  localStorage:{getItem:()=>stored,setItem:(_k,v)=>stored=v},
  setTimeout:(fn,delay)=>{timers.push({fn,delay});return timers.length;},clearTimeout:()=>{}});
 for(const f of ['js/utils.js','js/horarios.js','js/reminders.js'])vm.runInContext(fs.readFileSync(path.join(root,f),'utf8'),ctx);
 return {ctx,reminders:ctx.window.Reminders,timers,store:v=>stored=JSON.stringify(v),read:()=>JSON.parse(stored)};
}
test('sincronização mantém lembretes futuros da Circular e descarta registros de linha não suportada',()=>{
 const s=setup();const future=Date.now()+3600000;
 s.store([{id:'circular',stopId:36,line:'circular',triggerAt:future},{id:'legacy',stopId:999,line:'legacy',triggerAt:future}]);
 s.reminders.init();assert.deepEqual(s.read().map(r=>r.id),['circular']);assert.equal(s.timers.length,1);
});
test('Circular agenda lembrete usando os minutos restantes do próximo ônibus',()=>{
 const s=setup();
 const reminder=s.reminders.add({stopId:16,stopName:'Teste',line:'circular',departure:'18:00',minutesBefore:5,minutesUntil:20});
 assert.ok(reminder);assert.equal(reminder.line,'circular');assert.equal(s.timers.length,1);assert.ok(s.timers[0].delay>=14*60000&&s.timers[0].delay<=15*60000+1000);
});
test('não agenda aviso maior que o tempo restante até o ônibus',()=>{
 const s=setup();assert.equal(s.reminders.add({stopId:16,line:'circular',departure:'18:00',minutesBefore:15,minutesUntil:8}),null);
 assert.equal(s.timers.length,0);assert.deepEqual(s.read(),[]);
});
test('cancelamento remove o lembrete do ponto selecionado',()=>{
 const s=setup();const future=Date.now()+3600000;
 s.store([{id:'a',stopId:1,line:'circular',triggerAt:future},{id:'b',stopId:2,line:'circular',triggerAt:future}]);
 s.reminders.cancelForStop(1,'circular');assert.deepEqual(s.read().map(r=>r.id),['b']);
});
