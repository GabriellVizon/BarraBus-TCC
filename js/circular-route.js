(function () {
  'use strict';
  var variants = [
    {id:'primeira',rota:'A',ref:'06:15',nome:'Primeira volta',nota:'Começa nos pontos 13 e 12; depois segue o circuito.'},
    {id:'circuito',rota:'A',ref:'07:15',nome:'Volta seguinte',nota:'Após Kivertron, o circuito continua por Ana Mara.'},
    {id:'ultima',rota:'A',ref:'08:15',nome:'Última volta',nota:'Esta volta termina na Rodoviária.'},
    {id:'tarde',rota:'B',ref:'17:15',nome:'Tarde',nota:'Sai da Rodoviária e retorna à Rodoviária.'}
  ];
  function mount(el, data, saved, onSelect) {
    var state=saved||{},pointId=Number(data.ponto.id);
    var canonical=CONFIG_HORARIOS.correspondencias[pointId]||pointId;
    if(!state.variant)state.variant=(canonical===13||canonical===12)?'primeira':new Date().getHours()<12?'circuito':'tarde';
    function render(focusId,reset) {
      var variant=variants.find(function(v){return v.id===state.variant;});
      var seq=sequenciaViagemCircular(variant.rota,variant.ref);
      if(variant.rota==='A'&&variant.id!=='ultima')seq=seq.concat(33);
      var matches=[];seq.forEach(function(id,i){if(id===canonical)matches.push(i);});
      if(reset||!Number.isInteger(state.index))state.index=matches.length?matches[0]:0;
      state.index=Math.max(0,Math.min(seq.length-1,state.index));
      var start=Math.max(0,Math.min(seq.length-3,state.index-1)),visible=seq.slice(start,start+3);
      var morning=variant.rota==='A';
      function name(id){var p=getPontoCircular(id);return p?p.nome:'Ponto '+id;}
      function visitLabel(i){return (i+1)+'. '+name(seq[i])+(seq.filter(function(id){return id===seq[i];}).length>1?' · '+(seq.slice(0,i+1).filter(function(id){return id===seq[i];}).length)+'ª passagem':'');}
      el.innerHTML='<section class="route-explorer" aria-label="Explorar percurso">'+
        '<div class="route-period" role="group" aria-label="Período do percurso">'+
        '<button type="button" id="routeMorning" aria-pressed="'+morning+'">Manhã</button>'+
        '<button type="button" id="routeAfternoon" aria-pressed="'+!morning+'">Tarde</button></div>'+
        (morning?'<label class="route-field" for="routeVariant">Volta da manhã<select id="routeVariant">'+variants.filter(function(v){return v.rota==='A';}).map(function(v){return '<option value="'+v.id+'"'+(v.id===state.variant?' selected':'')+'>'+v.nome+'</option>';}).join('')+'</select></label>':'')+
        '<p class="route-caption">'+escapeHtml(variant.nota)+'</p>'+
        (!matches.length?'<p class="route-service-note">'+(canonical===13||canonical===12?'Este ponto é atendido apenas na primeira volta da manhã.':'Este ponto não faz parte desta volta.')+'</p>':'')+
        '<label class="route-field" for="routeJump">Ir para um ponto<select id="routeJump">'+seq.map(function(id,i){return '<option value="'+i+'"'+(i===state.index?' selected':'')+'>'+escapeHtml(visitLabel(i))+'</option>';}).join('')+'</select></label>'+
        '<ol class="route-window" start="'+(start+1)+'" aria-label="Sequência do percurso">'+visible.map(function(id,k){var i=start+k,current=i===state.index;return '<li class="route-node'+(current?' is-focused':'')+'"><span class="route-node-dot" aria-hidden="true">'+(i+1)+'</span><button type="button" data-route-index="'+i+'"'+(current?' aria-current="step"':'')+'>'+escapeHtml(name(id))+'</button>'+(id===canonical?'<small>Ponto consultado</small>':'')+'</li>';}).join('')+'</ol>'+
        '<div class="route-navigation"><button type="button" id="routePrevious" aria-label="Ponto anterior"'+(state.index===0?' disabled':'')+'>← Anterior</button>'+
        '<span id="routePosition" role="status" aria-live="polite">'+(state.index+1)+' de '+seq.length+'</span>'+
        '<button type="button" id="routeNext" aria-label="Próximo ponto"'+(state.index===seq.length-1?' disabled':'')+'>Próximo →</button></div>'+
        (matches.length?'<button type="button" id="routeReturn" class="route-return"'+(state.index===matches[0]?' disabled':'')+'>Voltar ao ponto consultado</button>':'')+'</section>';
      function listen(id,event,fn){var target=el.querySelector('#'+id);if(target)target.addEventListener(event,fn);}
      listen('routeMorning','click',function(){state.variant=canonical===13||canonical===12?'primeira':'circuito';render('routeMorning',true);});
      listen('routeAfternoon','click',function(){state.variant='tarde';render('routeAfternoon',true);});
      listen('routeVariant','change',function(e){state.variant=e.target.value;render('routeVariant',true);});
      function choose(index){state.index=index;if(onSelect){onSelect(seq[index]);var jump=el.querySelector('#routeJump');if(jump)jump.focus({preventScroll:true});}else render('routeJump');}
      listen('routeJump','change',function(e){choose(Number(e.target.value));});
      listen('routePrevious','click',function(){state.index--;render('routePrevious');});
      listen('routeNext','click',function(){state.index++;render('routeNext');});
      listen('routeReturn','click',function(){state.index=matches[0];render('routeReturn');});
      el.querySelectorAll('[data-route-index]').forEach(function(b){b.addEventListener('click',function(){choose(Number(b.dataset.routeIndex));});});
      // Troca de período preserva o foco no controle; nos extremos, usa o seletor.
      if(focusId){var target=el.querySelector('#'+focusId);if(target&&target.disabled)target=el.querySelector('#routeJump');if(target)target.focus({preventScroll:true});}
    }
    render();return state;
  }
  window.CircularRoute={mount:mount};
})();
