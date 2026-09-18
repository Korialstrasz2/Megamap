/* Wizard-only semantic brush editor. GPL-3.0-only. No editor/sidebar controls,
 * pointer data or draft plan is used outside an explicit wizard generation.
 */
(function(root,factory){const api=factory(root);if(typeof module==='object'&&module.exports)module.exports=api;else root.MegamapCityPaint=api;})(typeof globalThis!=='undefined'?globalThis:this,function(root){
'use strict';
const IT={
 'Paint a city plan':'Dipingi una pianta urbana','Use my painted plan':'Usa la mia pianta dipinta','Terrain':'Terreno','Districts':'Quartieri','Routes and walls':'Strade e mura','River':'Fiume','Sea / lake':'Mare / lago','Road':'Strada','Wall':'Muro','Mixed homes':'Abitazioni miste','Modest homes':'Abitazioni modeste','Villas / wealthy homes':'Ville / abitazioni benestanti','Old town':'Città vecchia','Market':'Mercato','Merchants':'Mercanti','Artisans':'Artigiani','Docks':'Banchine','Temple precinct':'Area dei templi','Military':'Militare','Scholars':'Studiosi','Industry':'Industria','Gardens / park':'Giardini / parco','Farmsteads':'Fattorie','Memorial gardens':'Giardini commemorativi','Public square':'Piazza pubblica','Brush size':'Dimensione pennello','Paint':'Dipingi','Erase this layer':'Cancella questo livello','Undo stroke':'Annulla tratto','Redo stroke':'Ripeti tratto','Clear plan':'Svuota pianta','Example plan':'Pianta di esempio','Load current map plan':'Carica la pianta della mappa','Preview city':'Anteprima città','Back to painting':'Torna a dipingere','Generating preview…':'Generazione anteprima…','Painted plan canvas':'Tela della pianta dipinta','Plan disabled; the selected preset will generate normally.':'Pianta disabilitata; il modello selezionato verrà generato normalmente.',
 'Paint districts where you want buildings. River and sea override district paint. Unpainted land stays open. Roads across short water gaps become bridges; roads crossing walls create gates.':'Dipingi i quartieri dove vuoi gli edifici. Fiume e mare prevalgono sui quartieri. Il terreno non dipinto resta libero. Le strade su brevi tratti d’acqua diventano ponti; le strade che attraversano le mura creano porte.',
 'Choose a labeled brush, then drag. Eraser affects only the selected brush layer. Keyboard: arrows move the cursor, Space paints, Ctrl/Cmd+Z undoes.':'Scegli un pennello etichettato e trascina. La gomma agisce solo sul livello del pennello scelto. Tastiera: frecce per muovere il cursore, Spazio per dipingere, Ctrl/Cmd+Z per annullare.',
 'Draft retained when you go Back or change presets. It is not used by sidebar generation.':'La bozza resta tornando Indietro o cambiando modello. Non viene usata dalla generazione laterale.',
 'Clear all painted strokes?':'Cancellare tutti i tratti dipinti?','Replace the draft with the example plan?':'Sostituire la bozza con la pianta di esempio?',
 'Paint at least one buildable district before generating.':'Dipingi almeno un quartiere edificabile prima di generare.',
 'strokes':'tratti','buildings':'edifici','No plan on the current map.':'La mappa attuale non ha una pianta dipinta.',
 'Plan limits reached. Erase or simplify the draft.':'Limiti della pianta raggiunti. Cancella o semplifica la bozza.',
 'Preview uses the current preset, size and climate; it does not add a map.':'L’anteprima usa modello, dimensione e clima attuali; non aggiunge una mappa.'
};
let instance=null;
function mount(doc,I){if(instance)return instance;const P=root.MegamapCityPlan,win=doc.defaultView,t=x=>I?.getLang()==='it'?(IT[x]||I.t(x)):x;
 I?.register(IT);
 const node=doc.createElement('section');node.id='cityPaintStep';node.dataset.cityPaint='';node.hidden=true;
 const el=(tag,cls)=>{const x=doc.createElement(tag);if(cls)x.className=cls;return x;};
 const button=(text,fn,id)=>{const b=el('button');b.type='button';b.dataset.copy=text;b.textContent=t(text);if(id)b.id=id;b.onclick=fn;return b;};
 const heading=el('div','paint-heading'),enableLabel=el('label','check'),enable=el('input');enable.type='checkbox';enable.id='cityPaintEnabled';const enableText=el('span');enableText.dataset.copy='Use my painted plan';enableText.textContent=t(enableText.dataset.copy);enableLabel.append(enable,enableText);heading.append(enableLabel);node.append(heading);
 const intro=el('p','micro');intro.dataset.copy='Paint districts where you want buildings. River and sea override district paint. Unpainted land stays open. Roads across short water gaps become bridges; roads crossing walls create gates.';intro.textContent=t(intro.dataset.copy);node.append(intro);
 const panel=el('div','paint-workspace'),palette=el('div','paint-palette'),stage=el('div','paint-stage'),toolbar=el('div','paint-toolbar');node.append(panel);panel.append(palette,stage);
 const canvas=el('canvas');canvas.width=1000;canvas.height=1000;canvas.id='cityPaintCanvas';canvas.tabIndex=0;canvas.setAttribute('role','application');canvas.setAttribute('aria-label',t('Painted plan canvas'));canvas.setAttribute('aria-describedby','cityPaintHelp');const ctx=canvas.getContext('2d'),maskCanvas=el('canvas');maskCanvas.width=P.N;maskCanvas.height=P.N;const maskCtx=maskCanvas.getContext('2d');
 const preview=el('div','paint-preview');preview.id='cityPaintPreview';preview.hidden=true;stage.append(toolbar,canvas,preview);
 const sizeLabel=el('label'),sizeText=el('span');sizeText.dataset.copy='Brush size';sizeText.textContent=t('Brush size');const size=el('input');size.id='cityPaintSize';size.type='range';size.min=12;size.max=260;size.step=2;size.value=140;size.setAttribute('aria-label',t('Brush size'));sizeLabel.append(sizeText,size);
 const eraser=button('Erase this layer',()=>{erase=!erase;eraser.setAttribute('aria-pressed',String(erase));render();},'cityPaintEraser');eraser.setAttribute('aria-pressed','false');
 const undo=button('Undo stroke',()=>{endStroke();if(strokes.length){redo.push(strokes.pop());change();}},'cityPaintUndo'),redoButton=button('Redo stroke',()=>{if(redo.length){strokes.push(redo.pop());change();}},'cityPaintRedo');
 toolbar.append(sizeLabel,eraser,undo,redoButton);
 const actions=el('div','paint-actions'),sample=button('Example plan',()=>{if(strokes.length&&!win.confirm(t('Replace the draft with the example plan?')))return;load(P.example());enable.checked=true;change();},'cityPaintExample'),clear=button('Clear plan',()=>{if(!strokes.length||win.confirm(t('Clear all painted strokes?'))){if(strokes.length)clearBackup=strokes.slice();strokes=[];redo=[];change();}},'cityPaintClear');
 const restore=button('Load current map plan',()=>{const data=root.MegamapApp?.getScene()?.options?.cityPlan;if(data){load(data);enable.checked=true;change();}else status.textContent=t('No plan on the current map.');},'cityPaintLoad');
 const previewButton=button('Preview city',makePreview,'cityPaintPreviewButton'),back=button('Back to painting',()=>{preview.hidden=true;canvas.hidden=false;back.hidden=true;render();},'cityPaintBack');back.hidden=true;actions.append(sample,clear,restore,previewButton,back);stage.append(actions);
 const help=el('p','micro');help.id='cityPaintHelp';help.dataset.copy='Choose a labeled brush, then drag. Eraser affects only the selected brush layer. Keyboard: arrows move the cursor, Space paints, Ctrl/Cmd+Z undoes.';help.textContent=t(help.dataset.copy);node.append(help);
 const status=el('p','paint-status');status.id='cityPaintStatus';status.setAttribute('role','status');status.setAttribute('aria-live','polite');node.append(status);
 const foot=el('p','micro');foot.dataset.copy='Draft retained when you go Back or change presets. It is not used by sidebar generation.';foot.textContent=t(foot.dataset.copy);node.append(foot);
 let strokes=[],redo=[],active=null,selected='commons',erase=false,compiled=null,previewScene=null,previewing=false,revision=0,clearBackup=null,cursor=[500,500],raf=0;
 const buttons=[];
 for(const [label,roles]of [['Terrain',P.ROLES.filter(r=>r.layer==='terrain')],['Routes and walls',P.ROLES.filter(r=>['roads','walls'].includes(r.layer))],['Districts',P.ROLES.filter(r=>r.layer==='districts')]]){
  const group=el('fieldset'),legend=el('legend');legend.dataset.copy=label;legend.textContent=t(label);group.append(legend);
  for(const role of roles){const b=button(role.name,()=>{endStroke();selected=role.id;erase=false;eraser.setAttribute('aria-pressed','false');const line=['roads','walls'].includes(role.layer);size.min=line?2:12;size.max=line?(role.layer==='walls'?16:32):260;size.value=line?(role.layer==='walls'?6:12):140;for(const x of buttons)x.setAttribute('aria-pressed',String(x.dataset.brush===selected));render();});b.dataset.brush=role.id;b.style.setProperty('--brush',role.color);b.setAttribute('aria-pressed',String(role.id===selected));group.append(b);buttons.push(b);}palette.append(group);
 }
 function plan(){return P.normalize({version:1,strokes});}
 function change(){revision++;compiled=null;previewScene=null;preview.hidden=true;canvas.hidden=false;back.hidden=true;render();}
 function load(data){strokes=P.normalize(data).strokes;redo=[];active=null;change();}
 function render(){if(raf)return;raf=win.requestAnimationFrame(()=>{raf=0;const all=active?[...strokes,active]:strokes;let data;try{data=active?P.compile({version:1,strokes:all}):(compiled||(compiled=P.compile(plan())));}catch(e){status.textContent=e.message;return;}
  ctx.clearRect(0,0,1000,1000);ctx.fillStyle='#f2eddf';ctx.fillRect(0,0,1000,1000);
  const pixels=maskCtx.createImageData(P.N,P.N),rgb=c=>[1,3,5].map(i=>parseInt(c.slice(i,i+2),16)),colors=[[],...P.DISTRICTS.map(r=>rgb(r.color))],waterColors=[[],rgb('#6fc7ed'),rgb('#306caf')];
  for(let i=0;i<data.zones.length;i++){const zone=data.zones[i],water=data.terrain[i],color=water?waterColors[water]:zone?colors[zone]:null;if(color){pixels.data.set([...color,255],i*4);}}maskCtx.putImageData(pixels,0,0);ctx.imageSmoothingEnabled=false;ctx.drawImage(maskCanvas,0,0,1000,1000);
  ctx.strokeStyle='#44504a22';ctx.lineWidth=1;ctx.beginPath();for(let x=0;x<=1000;x+=100){ctx.moveTo(x,0);ctx.lineTo(x,1000);ctx.moveTo(0,x);ctx.lineTo(1000,x);}ctx.stroke();
  for(const [key,color]of [['walls','#59606e'],['roads','#d49a47']])for(const s of data[key]){ctx.beginPath();s.points.forEach((p,i)=>i?ctx.lineTo(...p):ctx.moveTo(...p));ctx.lineWidth=s.width;ctx.lineCap='round';ctx.lineJoin='round';ctx.strokeStyle=color;ctx.stroke();}
  ctx.strokeStyle=erase?'#ab3535':'#263d46';ctx.setLineDash(erase?[5,5]:[]);ctx.lineWidth=2;ctx.beginPath();ctx.arc(cursor[0],cursor[1],Number(size.value)/2,0,Math.PI*2);ctx.stroke();ctx.setLineDash([]);
  undo.disabled=!strokes.length&&!clearBackup;redoButton.disabled=!redo.length;panel.classList.toggle('paint-disabled',!enable.checked);
  status.textContent=enable.checked?strokes.length+' / '+P.MAX_STROKES+' '+t('strokes')+' · '+t(P.ROLES.find(r=>r.id===selected).name)+(erase?' · '+t('Erase this layer'):''):t('Plan disabled; the selected preset will generate normally.');
 });}
 // Clear is also undoable as a single action, not hundreds of synthetic strokes.
 const oldUndo=undo.onclick;undo.onclick=e=>{if(!strokes.length&&clearBackup){strokes=clearBackup;clearBackup=null;change();}else oldUndo(e);};
 function toPoint(e){const b=canvas.getBoundingClientRect();return[Math.max(0,Math.min(1000,(e.clientX-b.left)/b.width*1000)),Math.max(0,Math.min(1000,(e.clientY-b.top)/b.height*1000))];}
 function begin(p){if(previewing)return;enable.checked=true;if(strokes.length>=P.MAX_STROKES||strokes.reduce((n,s)=>n+s.points.length,0)>=P.MAX_TOTAL-256){status.textContent=t('Plan limits reached. Erase or simplify the draft.');return;}
  const brush=P.ROLES.find(r=>r.id===selected);active={role:erase?'erase-'+brush.layer:selected,width:Number(size.value),points:[p]};cursor=p;render();}
 function append(p){cursor=p;if(active){if(Math.hypot(p[0]-active.points.at(-1)[0],p[1]-active.points.at(-1)[1])>=3){if(active.points.length<P.MAX_POINTS)active.points.push(p);else{active.points=P.simplify(active.points,1.3);if(active.points.length<P.MAX_POINTS)active.points.push(p);}}}render();}
 function endStroke(){if(!active)return;active.points=P.simplify(active.points,.7);strokes.push(active);active=null;redo=[];clearBackup=null;change();}
 canvas.onpointerdown=e=>{if(e.button!==0)return;e.preventDefault();canvas.focus();canvas.setPointerCapture(e.pointerId);begin(toPoint(e));};canvas.onpointermove=e=>{if(e.buttons&&active||!active)append(toPoint(e));};canvas.onpointerup=e=>{if(active){append(toPoint(e));endStroke();}if(canvas.hasPointerCapture(e.pointerId))canvas.releasePointerCapture(e.pointerId);};canvas.onpointercancel=()=>{active=null;render();};canvas.onlostpointercapture=()=>endStroke();
 canvas.onkeydown=e=>{const steps={ArrowLeft:[-12,0],ArrowRight:[12,0],ArrowUp:[0,-12],ArrowDown:[0,12]};if(steps[e.key]){e.preventDefault();cursor=cursor.map((x,i)=>Math.max(0,Math.min(1000,x+steps[e.key][i]*(e.shiftKey?3:1))));render();}if(e.code==='Space'){e.preventDefault();if(!e.repeat){begin(cursor.slice());endStroke();}}if((e.ctrlKey||e.metaKey)&&e.key.toLowerCase()==='z'){e.preventDefault();(e.shiftKey?redoButton:undo).click();}};
 size.oninput=render;enable.onchange=change;
 function options(){const app=root.MegamapApp;return app?.getGeneratorOptions?.()||{preset:doc.getElementById('preset').value};}
 function makePreview(){if(previewing)return;endStroke();if(!enable.checked)enable.checked=true;const before=revision,opts=options();opts.cityPlan=plan();previewing=true;previewButton.disabled=true;status.textContent=t('Generating preview…');
  win.setTimeout(()=>{try{const scene=root.MegamapEngine.generate('fantasy',doc.getElementById('seed').value||'city-plan',opts);root.MegamapEngine.validateScene(scene);if(before!==revision)return;previewScene=scene;preview.innerHTML=root.MegamapRender.render(scene,{labels:false});preview.hidden=false;canvas.hidden=true;back.hidden=false;status.textContent=scene.cityStudio.statistics.buildings+' '+t('buildings')+' · '+t('Preview uses the current preset, size and climate; it does not add a map.')+(scene.cityStudio.warnings.length?' '+scene.cityStudio.warnings.join(' '):'');}catch(e){status.textContent=t(e.message);canvas.hidden=false;preview.hidden=true;}finally{previewing=false;previewButton.disabled=false;}},30);
 }
 function language(){node.querySelectorAll('[data-copy]').forEach(x=>x.textContent=t(x.dataset.copy));canvas.setAttribute('aria-label',t('Painted plan canvas'));size.setAttribute('aria-label',t('Brush size'));render();}
 function selectedPlan(){endStroke();return enable.checked?plan():null;}
 instance={node,show:()=>{node.hidden=false;language();},hide:()=>{node.hidden=true;endStroke();},getPlan:selectedPlan,load,language,isPreviewing:()=>previewing};
 render();return instance;
}
function currentPlan(){return root.document?.getElementById('newWizardDialog')?.open?instance?.getPlan()||null:null;}
return{mount,currentPlan,IT};
});
