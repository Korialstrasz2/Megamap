/* Button-led map creation. GPL-3.0-only.
 * Move, never clone, the existing generator controls: their event handlers,
 * validation, planner and sidebar state remain the single source of truth.
 * This optional enhancement has no network or runtime dependencies.
 */
(function(root,factory){
 'use strict';
 const api=factory();
 if(typeof module==='object'&&module.exports)module.exports=api;
 else {root.MegamapWizard=api;api.mount(document,root.MegamapI18n);}
})(typeof globalThis!=='undefined'?globalThis:this,function(){
 'use strict';
 const IT={
  'New wizard':'Nuova procedura guidata',
  'New map wizard':'Creazione guidata della mappa',
  'Map and seed':'Mappa e seme',
  'Choose with buttons, adjust exact values, then generate. Your settings stay in the sidebar.':'Scegli con i pulsanti, regola i valori esatti e genera. Le impostazioni restano nella barra laterale.',
  'Close wizard':'Chiudi la procedura guidata',
  'Back':'Indietro','Next':'Avanti','Skip section':'Salta sezione',
  'Generate map':'Genera mappa','Generating…':'Generazione…',
  'Random':'Casuale','Randomize section':'Rendi casuale la sezione',
  'Random selection':'Selezione casuale','Map type':'Tipo di mappa',
  'Sections':'Sezioni','Step':'Passaggio','of':'di',
  'Yes':'Sì','No':'No','Exact value':'Valore esatto','Allowed range':'Intervallo consentito',
  'Settings retained. No map was generated.':'Impostazioni conservate. Nessuna mappa è stata generata.',
  'Correct the highlighted value before continuing.':'Correggi il valore evidenziato prima di continuare.',
  'Generation did not finish. Your settings are retained; try again.':'La generazione non è stata completata. Le impostazioni sono conservate; riprova.',
  'The atlas is full. Close the wizard and remove a map in Atlas, or start a new atlas after saving a backup.':'L’atlante è pieno. Chiudi la procedura e rimuovi una mappa in Atlante, oppure salva una copia e inizia un nuovo atlante.'
 };
 function limits(control){
  const min=Number(control.min),max=Number(control.max),step=Number(control.step||1);
  if(control.min===''||control.max===''||!Number.isFinite(min)||!Number.isFinite(max)||max<min||!Number.isFinite(step)||step<=0)return null;
  return {min,max,step,count:Math.floor((max-min)/step+1e-8)};
 }
 function at(l,index){return Number((l.min+Math.max(0,Math.min(l.count,index))*l.step).toFixed(10));}
 function numericChoices(control){
  const l=limits(control);if(!l)return [];
  const values=[0,.25,.5,.75,1].map(f=>at(l,Math.round(l.count*f)));
  const current=Number(control.value),index=Math.round((current-l.min)/l.step);
  if(control.value!==''&&current>=l.min&&current<=l.max&&Math.abs(at(l,index)-current)<1e-8)values.push(current);
  return [...new Set(values)].sort((a,b)=>a-b);
 }
 function randomNumber(control,rng=Math.random){const l=limits(control);return l?at(l,Math.floor(rng()*(l.count+1))):null;}
 function choose(values,rng=Math.random){return values.length?values[Math.min(values.length-1,Math.floor(rng()*values.length))]:undefined;}
 function mount(doc,I){
  const $=id=>doc.getElementById(id),options=$('generatorOptions'),setup=doc.querySelector('.create-head'),launch=$('newWizard');
  if(!options||!setup||!launch)return;
  const win=doc.defaultView,t=s=>I?.getLang()==='it'?(IT[s]||I.t(s)):(s);
  const button=(text,fn,cls='')=>{const b=doc.createElement('button');b.type='button';b.textContent=t(text);b.className=cls;b.addEventListener('click',e=>{e.preventDefault();fn(e);});return b;};
  const dialog=doc.createElement('dialog');dialog.id='newWizardDialog';dialog.className='new-map-wizard';dialog.setAttribute('aria-labelledby','wizardTitle');
  dialog.innerHTML='<header class="wizard-header"><div><p class="eyebrow" id="wizardEyebrow"></p><h1 id="wizardTitle" tabindex="-1"></h1><p id="wizardIntro"></p></div><button type="button" id="wizardClose"></button></header><div class="wizard-navigation"><span id="wizardProgress" role="status" aria-live="polite"></span><progress id="wizardMeter"></progress><details id="wizardSections"><summary></summary><nav></nav></details><button type="button" id="wizardRandomSection"></button></div><div class="wizard-body" id="wizardBody"></div><p id="wizardError" class="wizard-error" role="alert" hidden></p><footer class="wizard-footer"><button type="button" id="wizardBack"></button><button type="button" id="wizardSkip"></button><button type="button" id="wizardNext" class="primary"></button></footer>';
  doc.body.append(dialog);
  const body=$('wizardBody'),records=new Map();let current='setup',markers=[],frame=0,generating=false,previousFocus=null,lastMode='',oldTab=null;
  const fields='#preset,#seed,[data-opt],[data-subset],[data-zone],[data-zone-template],[data-zone-size],[data-zone-access],[data-zone-near],[data-zone-label],[data-zone-group]';
  const tabs=()=>[...options.querySelectorAll('[data-opt-tab]')];
  const steps=()=>[{id:'setup',name:t('Map and seed')},...tabs().map(b=>({id:b.dataset.optTab,name:b.textContent.trim()}))];
  const mode=()=>setup.querySelector('[data-mode].active')?.dataset.mode;
  function name(x){
   const label=x.closest('label');
   if(label){const copy=label.cloneNode(true);copy.querySelectorAll('input,select,button,output,[data-wizard-ui]').forEach(n=>n.remove());return copy.textContent.trim();}
   return x.getAttribute('aria-label')||x.dataset.opt||x.id;
  }
  function key(x){return x.id||Object.entries(x.dataset).filter(([k])=>k!=='wizardNative').map(([k,v])=>k+':'+v).join('|');}
  function emit(x){x.dispatchEvent(new win.Event('input',{bubbles:true}));if(x.isConnected)x.dispatchEvent(new win.Event('change',{bubbles:true}));schedule();}
  function set(x,value){if(!x?.isConnected||x.disabled)return;if(x.type==='checkbox')x.checked=!!value;else x.value=String(value);const exact=records.get(x)?.exact;if(exact&&doc.activeElement!==exact)exact.value=x.value;emit(x);}
  function randomize(x){
   if(!x?.isConnected||x.disabled)return;
   if(x.tagName==='SELECT'){
    const values=[...x.options].filter(o=>!o.disabled&&!o.hidden&&!o.parentElement.disabled&&o.value!==''&&o.value!=='custom').map(o=>o.value);
    // An empty value can be a real option (e.g. automatic room adjacency).
    if(x.hasAttribute('data-zone-near'))values.unshift('');
    const value=choose(values);if(value!==undefined)set(x,value);
   }else if(x.type==='checkbox')set(x,Math.random()<.5);
   else if(['number','range'].includes(x.type)){const value=randomNumber(x);if(value!==null)set(x,value);}
   else if(x.id==='seed'){$('randomSeed').click();schedule();}
   else if(x.hasAttribute('data-zone-label')){
    const row=x.closest('[data-zone-card]'),role=row?.querySelector('[data-zone]');
    const base=role?.selectedOptions[0]?.textContent.trim()||t('Map type');
    set(x,(base+' '+(1+Math.floor(Math.random()*99))).slice(0,x.maxLength>0?x.maxLength:80));
   }
  }
  function buildField(x){
   const anchor=x.closest('label')||x,wrap=doc.createElement('div'),ui=doc.createElement('div');
   wrap.className='wizard-field';wrap.dataset.wizardField=key(x);wrap.setAttribute('role','group');wrap.setAttribute('aria-label',name(x));
   anchor.before(wrap);wrap.append(anchor);ui.className='wizard-field-controls';ui.dataset.wizardUi='';wrap.append(ui);
   const r={x,anchor,wrap,ui,signature:'',required:x.required};records.set(x,r);
   if(x.type==='number')x.required=true;
   return r;
  }
  function renderField(r){
   const {x,ui,wrap}=r,title=name(x),values=x.tagName==='SELECT'?[...x.options].map(o=>[o.value,o.textContent.trim(),o.disabled||o.hidden||o.parentElement.disabled]):null;
   wrap.hidden=Boolean(r.anchor.hidden);
   const signature=JSON.stringify([I?.getLang(),x.value,x.checked,x.disabled,values,x.min,x.max,x.step,title]);
   // Do not recreate the focused exact-value editor on each keystroke.
   if(r.signature===signature)return;r.signature=signature;wrap.setAttribute('aria-label',title);
   if(r.exact&&(doc.activeElement===r.exact||!r.exact.checkValidity())){r.signature='';return;}
   ui.replaceChildren();r.exact=null;
   const random=button('Random',()=>randomize(x),'wizard-random');random.dataset.wizardRandom=key(x);random.setAttribute('aria-label',t('Random')+': '+title);random.disabled=x.disabled;
   const group=doc.createElement('div');group.className='wizard-choices';group.setAttribute('role','group');group.setAttribute('aria-label',title);
   const addChoice=(value,label,selected)=>{const b=button(label,()=>set(x,value),'wizard-choice');b.dataset.wizardValue=String(value);b.setAttribute('aria-pressed',String(selected));b.disabled=x.disabled;group.append(b);};
   if(values){
    x.classList.add('wizard-native-choice');
    for(const [value,label,disabled]of values)if(!disabled)addChoice(value,label,x.value===value);
    if(x.hasAttribute('data-zone')||values.length>15){const details=doc.createElement('details'),summary=doc.createElement('summary');summary.textContent=x.selectedOptions[0]?.textContent.trim()||title;details.className='wizard-more-choices';details.append(summary,group);ui.append(details);}else ui.append(group);
   }else if(x.type==='checkbox'){
    x.classList.add('wizard-native-choice');addChoice(true,t('Yes'),x.checked);addChoice(false,t('No'),!x.checked);ui.append(group);
   }else if(['range','number'].includes(x.type)){
    for(const value of numericChoices(x))addChoice(value,String(value),Number(x.value)===value);
    ui.append(group);
    if(x.type==='range'){
     x.classList.add('wizard-native-choice');const label=doc.createElement('label'),exact=doc.createElement('input');label.textContent=t('Exact value');exact.type='number';exact.min=x.min;exact.max=x.max;exact.step=x.step||'1';exact.value=x.value;exact.required=true;exact.disabled=x.disabled;exact.setAttribute('aria-label',t('Exact value')+': '+title);
     exact.addEventListener('input',()=>{if(exact.checkValidity())set(x,exact.value);});exact.addEventListener('change',schedule);exact.addEventListener('blur',()=>{r.signature='';schedule();});label.append(exact);ui.append(label);r.exact=exact;
    }
    const hint=doc.createElement('small');hint.className='wizard-range';hint.textContent=t('Allowed range')+': '+x.min+' – '+x.max+' · '+t('Step')+' '+(x.step||1);ui.append(hint);
   }
   ui.append(random);
  }
  function extras(){
   if(!setup.querySelector('[data-wizard-mode-random]')){const b=button('Random',()=>{choose([...setup.querySelectorAll('[data-mode]')])?.click();schedule();},'wizard-random');b.dataset.wizardUi='';b.dataset.wizardModeRandom='';b.setAttribute('aria-label',t('Random')+': '+t('Map type'));setup.querySelector('.mode-tabs').after(b);}
   for(const actions of options.querySelectorAll('.program-actions'))if(!actions.querySelector('[data-wizard-ui]')){
    const subset=actions.querySelector('[data-program]')?.dataset.program;
    const b=button('Random selection',()=>options.querySelectorAll('[data-subset="'+subset+'"]').forEach(randomize),'wizard-random');b.dataset.wizardUi='';actions.append(b);
   }
  }
  function observe(){observer.observe(body,{childList:true,subtree:true});}
  function refresh(){
   frame=0;if(!dialog.open||generating)return;observer.disconnect();
   try{
    const m=mode();if(m!==lastMode){lastMode=m;current='setup';}
    for(const [x,r]of records)if(!body.contains(x)){r.x.required=r.required;records.delete(x);}
    for(const x of body.querySelectorAll(fields))renderField(records.get(x)||buildField(x));
    extras();paint();
   }finally{observe();}
  }
  function schedule(){if(dialog.open&&!frame&&!generating)frame=win.requestAnimationFrame(refresh);}
  const observer=new win.MutationObserver(changes=>{
   if(changes.some(r=>!r.target.parentElement?.closest('[data-wizard-ui],#shapePreview,[data-zone-preview],[data-zone-report],[data-zone-catalog]')))schedule();
  });
  function paint(){
   const list=steps();let index=list.findIndex(s=>s.id===current);if(index<0){current='setup';index=0;}
   setup.hidden=index!==0;options.hidden=index===0;
   if(index)for(const pane of options.querySelectorAll('[data-opt-pane]'))pane.hidden=pane.dataset.optPane!==current;
   $('wizardEyebrow').textContent=t('New map wizard');$('wizardTitle').textContent=list[index].name;$('wizardIntro').textContent=t('Choose with buttons, adjust exact values, then generate. Your settings stay in the sidebar.');
   $('wizardClose').textContent=t('Close wizard');$('wizardBack').textContent=t('Back');$('wizardBack').disabled=!index;
   $('wizardSkip').textContent=t('Skip section');$('wizardSkip').hidden=index===list.length-1;
   $('wizardNext').textContent=t(generating?'Generating…':index===list.length-1?'Generate map':'Next');
   $('wizardRandomSection').textContent=t('Randomize section');$('wizardProgress').textContent=t('Step')+' '+(index+1)+' '+t('of')+' '+list.length;
   $('wizardMeter').max=list.length;$('wizardMeter').value=index+1;$('wizardMeter').setAttribute('aria-label',$('wizardProgress').textContent);
   const menu=$('wizardSections');menu.querySelector('summary').textContent=t('Sections');const nav=menu.querySelector('nav');nav.setAttribute('aria-label',t('Sections'));nav.replaceChildren();
   list.forEach((s,i)=>{const b=button((i+1)+'. '+s.name,()=>{if(valid()){go(s.id);menu.open=false;}});if(s.id===current)b.setAttribute('aria-current','step');nav.append(b);});
  }
  function valid(all=false){
   const scope=all?body:current==='setup'?setup:options.querySelector('[data-opt-pane="'+current+'"]');
   const invalid=[...scope.querySelectorAll('input[type=number]')].find(x=>!x.disabled&&!(all?x.closest('label[hidden]'):x.closest('[hidden]'))&&!x.checkValidity());
   if(!invalid){$('wizardError').hidden=true;return true;}
   if(all){const pane=invalid.closest('[data-opt-pane]');go(pane?.dataset.optPane||'setup');}error(t('Correct the highlighted value before continuing.'));invalid.reportValidity();invalid.focus();return false;
  }
  function error(message){$('wizardError').textContent=message;$('wizardError').hidden=false;}
  function go(id){current=id;tabs().find(b=>b.dataset.optTab===id)?.click();paint();body.scrollTop=0;$('wizardTitle').focus();}
  function randomSection(){
   if(current==='setup'){
    choose([...setup.querySelectorAll('[data-mode]')])?.click();randomize($('preset'));randomize($('seed'));
   }else{
    // Theme/template changes rebuild the controls. Re-query after each such
    // dependency, then randomize the remaining live fields, never stale nodes.
    let pane=options.querySelector('[data-opt-pane="'+current+'"]');
    const theme=pane?.querySelector('[data-opt="theme"]');if(theme)randomize(theme);
    pane=options.querySelector('[data-opt-pane="'+current+'"]');
    const template=pane?.querySelector('[data-zone-template]');if(template)randomize(template);
    pane=options.querySelector('[data-opt-pane="'+current+'"]');
    pane?.querySelectorAll(fields).forEach(x=>{if(x.dataset.opt!=='theme'&&!x.hasAttribute('data-zone-template')&&!x.hasAttribute('data-zone-group'))randomize(x);});
   }
   schedule();
  }
  function open(){
   if(dialog.open||!$('busy').hidden)return;
   previousFocus=doc.activeElement;current='setup';lastMode=mode();oldTab=tabs().find(b=>b.classList.contains('active'))?.dataset.optTab;
   // Close the existing expanded planner before moving its containing controls.
   doc.querySelector('.zone-planner-dialog header button')?.click();
   markers=[setup,options].map(node=>{const marker=doc.createComment('wizard return point');node.before(marker);body.append(node);return {node,marker};});
   $('wizardError').hidden=true;dialog.showModal();refresh();$('wizardTitle').focus();
  }
  function close(created=false){
   if(generating)return;observer.disconnect();if(frame)win.cancelAnimationFrame(frame);frame=0;
   for(const {x,anchor,wrap,required}of records.values()){
    x.classList.remove('wizard-native-choice');x.required=required;
    if(wrap.isConnected){wrap.before(anchor);wrap.remove();}
   }
   records.clear();body.querySelectorAll('[data-wizard-ui]').forEach(n=>n.remove());
   for(const {node,marker}of markers){node.hidden=false;marker.replaceWith(node);}markers=[];
   tabs().find(b=>b.dataset.optTab===(current==='setup'?oldTab:current))?.click();
   dialog.close();previousFocus?.focus();
   if(created){doc.querySelector('[data-left="build"]')?.click();const panel=$('leftPanel');if(panel.hidden||!panel.getBoundingClientRect().width)$('toggleLeft')?.click();}
   else {$('status').textContent=t('Settings retained. No map was generated.');}
  }
  function finish(){
   if(generating||!valid(true))return;
   if($('generate').classList.contains('atlas-full')){error(t('The atlas is full. Close the wizard and remove a map in Atlas, or start a new atlas after saving a backup.'));return;}
   const before=$('mapCount').textContent;generating=true;observer.disconnect();
   body.inert=true;$('wizardNext').textContent=t('Generating…');for(const id of ['wizardNext','wizardBack','wizardSkip','wizardClose','wizardRandomSection'])$(id).disabled=true;
   $('wizardSections').hidden=true;
   const complete=()=>{
    const created=$('mapCount').textContent!==before;generating=false;body.inert=false;for(const id of ['wizardNext','wizardBack','wizardSkip','wizardClose','wizardRandomSection'])$(id).disabled=false;$('wizardSections').hidden=false;
    if(created)close(true);else {refresh();error($('status').textContent||t('Generation did not finish. Your settings are retained; try again.'));}
   };
   const watch=new win.MutationObserver(()=>{if($('busy').hidden){watch.disconnect();complete();}});
   watch.observe($('busy'),{attributes:true,attributeFilter:['hidden']});
   $('generate').click();
   if($('busy').hidden){watch.disconnect();complete();}
  }
  launch.addEventListener('click',open);$('wizardClose').onclick=()=>close();
  $('wizardBack').onclick=()=>{const list=steps(),i=list.findIndex(s=>s.id===current);if(i>0&&valid())go(list[i-1].id);};
  $('wizardSkip').onclick=()=>{const list=steps(),i=list.findIndex(s=>s.id===current);if(i<list.length-1&&valid())go(list[i+1].id);};
  $('wizardNext').onclick=()=>{const list=steps(),i=list.findIndex(s=>s.id===current);if(!valid())return;if(i===list.length-1)finish();else go(list[i+1].id);};
  $('wizardRandomSection').onclick=randomSection;
  dialog.addEventListener('cancel',e=>{e.preventDefault();close();});
  dialog.addEventListener('keydown',e=>{e.stopPropagation();});
  body.addEventListener('input',schedule);body.addEventListener('change',schedule);body.addEventListener('click',schedule);
  function language(){launch.textContent=t('New wizard');launch.setAttribute('aria-label',t('New map wizard'));if(dialog.open){for(const r of records.values())r.signature='';body.querySelectorAll('[data-wizard-mode-random],.program-actions>[data-wizard-ui]').forEach(n=>n.remove());schedule();}}
  new win.MutationObserver(language).observe(doc.documentElement,{attributes:true,attributeFilter:['lang']});language();
  return {open,close};
 }
 return {numericChoices,randomNumber,limits,mount,translations:IT};
});
