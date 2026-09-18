/* Read-only, keyboard-accessible 2.5D viewer. Local SVG/PNG export; no service.
 * The modal deliberately does not reuse top-down editing hit coordinates.
 */
(function(root,factory){const api=factory(root);if(typeof module==='object'&&module.exports)module.exports=api;else{root.MegamapCityView=api;root.MegamapI18n?.register(api.IT);}})(typeof globalThis!=='undefined'?globalThis:this,function(root){
'use strict';
const IT={
 '2.5D city preview':'Anteprima città 2.5D','Open 2.5D view':'Apri vista 2.5D','Read-only perspective. Edit the top-down map.':'Prospettiva di sola lettura. Modifica la mappa dall’alto.',
 'Rotate left':'Ruota a sinistra','Rotate right':'Ruota a destra','Fit view':'Adatta vista','Export 2.5D SVG':'Esporta SVG 2.5D','Export 2.5D PNG':'Esporta PNG 2.5D','Back to map':'Torna alla mappa',
 '2.5D city viewport':'Area di visualizzazione città 2.5D','Drag to pan; scroll or +/− to zoom; arrow keys pan; Home fits.':'Trascina per spostare; scorri o usa +/− per lo zoom; le frecce spostano; Home adatta.',
 'Schematic terrain and building heights. No geometry is changed.':'Terreno e altezze degli edifici schematici. La geometria non cambia.',
 'Preparing image…':'Preparazione immagine…','Image exported.':'Immagine esportata.','The image could not be exported. Try SVG instead.':'Impossibile esportare l’immagine. Prova il formato SVG.'
};
let state=null,installed=false,drag=null;
const $=id=>root.document.getElementById(id),t=text=>root.MegamapI18n?.t(text)||text;
function fit(){if(!state)return;state.box=state.full.slice();update();}
function update(){const svg=$('city25Host').querySelector('svg');if(svg&&state)svg.setAttribute('viewBox',state.box.join(' '));}
function draw(){if(!state)return;state.svg=root.MegamapCityPerspective.render(state.scene,state.view,state.bearing);$('city25Host').innerHTML=state.svg;const svg=$('city25Host').querySelector('svg');state.full=svg.getAttribute('viewBox').split(/\s+/).map(Number);fit();}
function zoom(factor){if(!state)return;const b=state.box,scale=Math.max(.08,Math.min(4,b[2]*factor/state.full[2])),w=state.full[2]*scale,h=state.full[3]*scale;state.box=[b[0]+(b[2]-w)/2,b[1]+(b[3]-h)/2,w,h];update();}
function save(blob,suffix,title=state?.scene.title){const url=URL.createObjectURL(blob),a=root.document.createElement('a');a.href=url;a.download=String(title||'city').replace(/[^a-z0-9_-]+/gi,'-').slice(0,80)+'-2.5D.'+suffix;root.document.body.append(a);a.click();a.remove();setTimeout(()=>URL.revokeObjectURL(url),2000);}
async function png(){if(!state)return;const current=state,title=current.scene.title,button=$('city25Png'),message=$('city25Status');button.disabled=true;message.textContent=t('Preparing image…');let url;
 try{
  // Export the complete projection, not a transient panned/cropped viewport.
  const markup=current.svg,probe=new DOMParser().parseFromString(markup,'image/svg+xml').documentElement,w=Number(probe.getAttribute('width')),h=Number(probe.getAttribute('height')),scale=Math.min(2048/w,4096/h),canvas=root.document.createElement('canvas');canvas.width=Math.round(w*scale);canvas.height=Math.round(h*scale);
  probe.setAttribute('width',canvas.width);probe.setAttribute('height',canvas.height);url=URL.createObjectURL(new Blob([new XMLSerializer().serializeToString(probe)],{type:'image/svg+xml'}));const image=new Image();
  await new Promise((resolve,reject)=>{image.onload=resolve;image.onerror=reject;image.src=url;});const ctx=canvas.getContext('2d');if(!ctx)throw Error('Canvas unavailable');ctx.drawImage(image,0,0,canvas.width,canvas.height);
  const blob=await new Promise(resolve=>canvas.toBlob(resolve,'image/png'));if(!blob)throw Error('Image export unavailable');save(blob,'png',title);if(state===current)message.textContent=t('Image exported.');
 }catch{if(state===current)message.textContent=t('The image could not be exported. Try SVG instead.');}
 finally{if(url)URL.revokeObjectURL(url);button.disabled=false;}
}
function install(){if(installed)return;installed=true;const host=$('city25Host'),dialog=$('city25Dialog');
 $('city25Left').onclick=()=>{state.bearing=(state.bearing+270)%360;draw();};$('city25Right').onclick=()=>{state.bearing=(state.bearing+90)%360;draw();};$('city25Fit').onclick=fit;
 $('city25Close').onclick=()=>dialog.close();$('city25Svg').onclick=()=>save(new Blob([state.svg],{type:'image/svg+xml'}),'svg');$('city25Png').onclick=png;
 dialog.addEventListener('close',()=>{drag=null;});
 host.addEventListener('wheel',e=>{e.preventDefault();zoom(e.deltaY>0?1.12:1/1.12);},{passive:false});
 host.addEventListener('pointerdown',e=>{if(e.button!==0||!state)return;host.focus();drag={x:e.clientX,y:e.clientY,box:state.box.slice()};host.setPointerCapture(e.pointerId);});
 host.addEventListener('pointermove',e=>{if(!drag||!state)return;const bounds=host.getBoundingClientRect(),scale=Math.min(bounds.width/drag.box[2],bounds.height/drag.box[3]);state.box=[drag.box[0]-(e.clientX-drag.x)/scale,drag.box[1]-(e.clientY-drag.y)/scale,...drag.box.slice(2)];update();});
 host.addEventListener('pointerup',()=>{drag=null;});host.addEventListener('pointercancel',()=>{drag=null;});
 host.addEventListener('keydown',e=>{if(!state)return;const b=state.box;if(e.key==='+'||e.key==='=')zoom(1/1.15);else if(e.key==='-')zoom(1.15);else if(e.key==='Home')fit();else if(e.key.startsWith('Arrow')){if(e.key==='ArrowLeft')b[0]-=b[2]*.06;if(e.key==='ArrowRight')b[0]+=b[2]*.06;if(e.key==='ArrowUp')b[1]-=b[3]*.06;if(e.key==='ArrowDown')b[1]+=b[3]*.06;update();}else return;e.preventDefault();});
}
function open(scene,view={}){if(!scene?.cityStudio)return;install();state={scene,view:{...view},bearing:0,svg:'',box:[],full:[]};$('city25Status').textContent=t('Schematic terrain and building heights. No geometry is changed.');draw();$('city25Dialog').showModal();$('city25Host').focus();}
return{open,IT};
});
