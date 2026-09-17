/* Megamap renderer and original vector symbols. GPL-3.0. */
(function(root,factory){const e=typeof module==='object'&&module.exports?require('./engine.js'):root.MegamapEngine;const a=typeof module==='object'&&module.exports?require('./assets.js'):root.MegamapAssets,c=typeof module==='object'&&module.exports?require('./editor-core.js'):root.MegamapCore;const b=typeof module==='object'&&module.exports?require('./battle-render.js'):root.MegamapBattleRender;const hq=typeof module==='object'&&module.exports?require('./battle-hq.js'):root.MegamapBattleHQ;const city=typeof module==='object'&&module.exports?require('./city-render.js'):root.MegamapCityRender;const api=factory(e,a,c,b,hq,city);if(typeof module==='object'&&module.exports)module.exports=api;else root.MegamapRender=api;})(typeof globalThis!=='undefined'?globalThis:this,function(E,A,C,B,HQ,City){
'use strict';
const palettes={atlas:{paper:'#eee8d7',land:'#d8d9b4',water:'#92bdc3',deep:'#72a4b3',sand:'#e6dab1',grass:'#c5ce9b',forest:'#96ad81',hill:'#b9b29a',mountain:'#a39d90',snow:'#e9e7dc',ink:'#334a40',road:'#e6ca97',roof:['#b1aa91','#bb9677','#a2a091','#b9ae94','#c0b398'],district:'#dbcfb0'},parchment:{paper:'#f1e6c9',land:'#e3d6b0',water:'#aabfc0',deep:'#91a9ad',sand:'#eadfbe',grass:'#d4cfab',forest:'#bdc4a0',hill:'#c8bea3',mountain:'#b6ad98',snow:'#e9e1cb',ink:'#514d3b',road:'#f0e3bd',roof:['#c3b18d','#b9a481','#cbb895','#ae9e7f','#c5bba1'],district:'#e4d6b1'},ink:{paper:'#faf8ef',land:'#ecebdf',water:'#cbd5d8',deep:'#b4c3c9',sand:'#eeeee4',grass:'#deded2',forest:'#bfc6b8',hill:'#cdccc4',mountain:'#b3b4af',snow:'#f8f7f1',ink:'#353f3d',road:'#f6f2e5',roof:['#d1d0c7','#c0c2b9','#d8d6cb','#b9beb8','#d9dbd0'],district:'#eeece1'}};
palettes.night={paper:'#34434e',land:'#354d51',water:'#284852',deep:'#20363f',sand:'#637474',grass:'#46615a',forest:'#324d49',hill:'#637270',mountain:'#80898a',snow:'#d5dfe1',ink:'#c1d1cd',road:'#927f64',roof:['#6b7c80','#7b8785','#5d7078','#807f71','#5e7d7b'],district:'#536669'};
palettes.desert={paper:'#f3e7c9',land:'#dfc499',water:'#91b6b0',deep:'#6c9e9d',sand:'#e8cf9d',grass:'#d4c398',forest:'#a7b38b',hill:'#c5a986',mountain:'#a38d78',snow:'#f0e5d2',ink:'#5e4b3c',road:'#f0ddb4',roof:['#c49673','#b78967','#d4ac7e','#b29a7a','#c4ad8e'],district:'#d6bb8f'};
palettes.frost={paper:'#f2f4ef',land:'#dce4df',water:'#98bfcb',deep:'#6996b0',sand:'#d4dcda',grass:'#c0d2c9',forest:'#839f94',hill:'#bbc8c9',mountain:'#91a6b0',snow:'#fafbf6',ink:'#3b535e',road:'#e8e4d4',roof:['#a2aebb','#acb9bc','#92a8ae','#bdc2be','#a2b6bc'],district:'#cfd8d1'};

const esc=v=>String(v??'').replace(/[&<>"']/g,c=>({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&apos;'}[c]));
const num=v=>Number(Number(v).toFixed(2));
const pts=p=>p.map(p=>num(p[0])+','+num(p[1])).join(' ');
function symbols(p,only=null,prefix="asset-"){const ink=p.ink,tree=p.forest,roof=p.roof[1];const m={
 tree:`<path d="M0 4v10"/><path d="M-8 5Q-15 0-9-6Q-12-14-4-15Q1-23 7-15Q17-14 12-5Q19 4 9 8Z" fill="${tree}"/>`,
 pine:`<path d="M0 5v10"/><path d="M0-19L-10-3H-6L-14 9H14L6-3H10Z" fill="${tree}"/>`,
 oak:`<path d="M0 3v12m0-6L-7 0m7 3l7-6"/><path d="M-12 0Q-19-11-8-13Q-6-22 3-16Q17-21 15-9Q23 4 10 5Q0 13-12 0Z" fill="${tree}"/>`,
 palm:`<path d="M0 13Q5 0 0-11M0-11Q-16-17-18-3M0-11Q16-21 18-4M0-11Q-4-25-13-19M0-11Q11-25 14-17" fill="none" stroke-width="3"/>`,
 'dead-tree':`<path d="M0 14V-17M0-2L-10-9V-17M0 5L10-5V-15M0-10L6-18" fill="none" stroke-width="2.6"/>`,
 bush:`<path d="M-12 6Q-19-4-9-8Q-4-17 4-8Q16-13 15 0Q19 10 8 9Z" fill="${tree}"/>`,
 rock:`<path d="M-13 6L-7-7L4-12L14 1L10 9Z" fill="${p.hill}"/><path d="M-7-7L3 1L14 1M3 1L10 9" fill="none"/>`,
 mountain:`<path d="M-21 12L0-20L22 12Z" fill="${p.hill}"/><path d="M0-20L-2-2L8 6M-7-8L-1-5L3-10L7-8" fill="none"/><path d="M0-20L-7-8L-1-5L3-10L7-8Z" fill="${p.snow}"/>`,
 hill:`<path d="M-22 9Q-6-17 13 4Q20 0 25 10" fill="${p.hill}"/>`,
 house:`<path d="M-13-4L0-14L13-4V13H-13Z" fill="${p.paper}"/><path d="M-16-3L0-17L16-3M-4 13V3H4V13" fill="${roof}"/>`,
 cottage:`<path d="M-12 0L0-12L12 0V11H-12Z" fill="${p.paper}"/><path d="M-15 0L0-15L15 0M0 11V3" fill="none"/>`,
 tower:`<path d="M-10 13L-8-8H-12V-17H-6V-12H-2V-17H3V-12H7V-17H12V-8H8L10 13Z" fill="${p.paper}"/><path d="M-3 13V4Q0-1 3 4V13" fill="${p.hill}"/>`,
 castle:`<path d="M-14 12V-8H-18V-17H-12V-13H-7V-17H-2V-8H2V-17H7V-13H12V-17H18V-8H14V12Z" fill="${p.paper}"/><path d="M-4 12V4Q0-3 4 4V12" fill="${p.hill}"/>`,
 ruin:`<path d="M-16 13V-10L-10-5L-6-12V0L2-6L6-1V-14L13-9V13ZM-19 14H20" fill="${p.hill}"/>`,
 temple:`<path d="M-16-5L0-17L16-5ZM-14 12H14M-9-3V11M0-3V11M9-3V11" fill="${p.paper}" stroke-width="2.2"/>`,
 inn:`<path d="M-13 13V-4L0-15L13-4V13ZM-16-4H16M-8 2H-3V7H-8M3 13V2H8V13" fill="${p.paper}"/><path d="M14-5H23V4H16" fill="${roof}"/>`,
 mill:`<path d="M-9 14L-6-8H6L9 14Z" fill="${p.paper}"/><path d="M-16-19L14 6M-14 5L16-19" stroke-width="4"/>`,
 bridge:`<path d="M-22-7H22V7H-22Z" fill="${p.road}"/><path d="M-22-10H22M-22 10H22M-15-7V7M-8-7V7M0-7V7M8-7V7M15-7V7"/>`,
 cave:`<path d="M-19 13L-14-4L-2-15L13-8L20 13Z" fill="${p.hill}"/><path d="M-9 13V2Q0-12 9 2V13Z" fill="${ink}"/>`,
 mine:`<path d="M-16 13L-9-12H10L18 13Z" fill="${p.hill}"/><path d="M-8 13V-2H8V13M-12-4H12" stroke-width="3" fill="${ink}"/>`,
 camp:`<path d="M-21 10L-9-13L5 10ZM-9-13L-4 10M0 11L10-9L22 11Z" fill="${p.paper}"/><path d="M-5 16L3 10M-5 10L3 16"/>`,
 tent:`<path d="M-20 13L-4-16L19 13ZM-4-16L3 13M-1 13L1 5L6 13" fill="${p.paper}"/>`,
 boat:`<path d="M-18 6H18L10 15H-8ZM0 5V-19L14 2H0" fill="${p.paper}"/>`,
 well:`<ellipse cy="4" rx="12" ry="8" fill="${p.hill}"/><ellipse cy="0" rx="12" ry="7" fill="${p.water}"/><path d="M-12 4V-13H12V4M-16-13H16M0-13V0"/>`,
 fountain:`<circle r="15" fill="${p.hill}"/><circle r="11" fill="${p.water}"/><circle r="4" fill="${p.paper}"/><path d="M0-3Q-8-14-11-6M0-3Q8-14 11-6" fill="none"/>`,
 statue:`<path d="M-12 14H12V7H-12ZM-5 6L-3-9H3L6 6Z" fill="${p.hill}"/><circle cy="-14" r="5" fill="${p.paper}"/>`,
 crate:`<rect x="-12" y="-12" width="24" height="24" rx="1" fill="${roof}"/><path d="M-10-10L10 10M10-10L-10 10M-12-8H12M-12 8H12"/>`,
 barrel:`<ellipse rx="10" ry="14" fill="${roof}"/><path d="M-9-7H9M-9 7H9M-3-13V13M3-13V13"/>`,
 table:`<rect x="-18" y="-10" width="36" height="20" rx="3" fill="${roof}"/><path d="M-13-15H-6M6-15H13M-13 15H-6M6 15H13" stroke-width="4"/>`,
 bed:`<rect x="-10" y="-17" width="20" height="34" rx="2" fill="${p.paper}"/><path d="M-10-5H10V15H-10Z" fill="${p.water}"/><rect x="-7" y="-14" width="14" height="7" rx="2" fill="${p.snow}"/>`,
 chest:`<rect x="-14" y="-9" width="28" height="18" rx="3" fill="${roof}"/><path d="M-8-9V9M8-9V9M-14-2H14"/><rect x="-2" y="-3" width="4" height="6" fill="${p.sand}"/>`,
 bones:`<path d="M-13-9L12 10M-11 10L12-11" stroke-width="4"/><circle cx="-3" cy="-4" r="8" fill="${p.paper}"/><circle cx="-6" cy="-5" r="2" fill="${ink}"/><circle cx="0" cy="-5" r="2" fill="${ink}"/>`,
 fire:`<circle cy="5" r="13" fill="${p.hill}"/><path d="M-8 8Q-12-2 0-17Q-3-5 6-7Q16 8 1 12Z" fill="#ce8e55"/>`,
 crystal:`<path d="M-4 13L-10-6L-3-18L5-8L4 13ZM4 13L7-5L15-9L18 0L9 14" fill="${p.water}"/><path d="M-3-18L-1-6L-4 13M-1-6L5-8"/>`,
 stairs:`<path d="M-15-16H15V16H-15ZM-15-10H15M-15-4H15M-15 2H15M-15 8H15M-15 14H15" fill="${p.hill}"/>`,
 door:`<rect x="-13" y="-4" width="26" height="8" fill="${roof}"/><path d="M-13-10V10M13-10V10" stroke-width="3"/>`,
 boulder:`<path d="M-17 2L-9-13L7-15L19-2L12 13L-7 15Z" fill="${p.hill}"/><path d="M-9-13L-3-2L7-15M-3-2L12 13" fill="none"/>`,
 mushroom:`<path d="M-3 13V-2H3V13Z" fill="${p.paper}"/><path d="M-14-2Q-12-20 0-19Q13-17 15-2Z" fill="${roof}"/><circle cx="-5" cy="-8" r="2" fill="${p.paper}"/><circle cx="5" cy="-11" r="2" fill="${p.paper}"/>`,
 reeds:`<path d="M-9 12L-13-10M-3 12V-16M4 12L8-13M11 12L17-5" fill="none"/><path d="M-13-10L-15-17M-3-16V-23M8-13L10-20" stroke-width="4"/>`,
 gravestone:`<path d="M-9 13V-8Q0-19 9-8V13Z" fill="${p.hill}"/><path d="M0-8V5M-5-3H5M-13 13H14"/>`
};
 for(const a of A.catalog)if(a.body)m[a.id]=A.body(a.id,p);
 return Object.entries(m).filter(([id])=>!only||only.has(id)).map(([id,body])=>`<symbol id="${prefix}${id}" viewBox="-28 -28 56 56" preserveAspectRatio="${id.startsWith('roof-')?'none':'xMidYMid meet'}"><g stroke="${ink}" stroke-width="1.2" stroke-linejoin="round" stroke-linecap="round">${body}</g></symbol>`).join('');
}

function color(h,m,sea,p,forest){return h<sea-.09?p.deep:h<sea?p.water:h<sea+.025?p.sand:h>.84?p.snow:h>.73?p.mountain:h>.63?p.hill:m>.65-forest*.29?p.forest:p.grass;}
const cache=new WeakMap();
function localTerrainSVG(s,p,palette,view){
 const t=s.terrain,key=palette+':local:'+t.revision+':'+view.terrainDisplay+':'+view.contours+':'+view.hillshade+':'+s.options.forest;
 const old=cache.get(t);if(old?.key===key)return old.svg;
 const {n,elevationM:heights,moisture,minM,maxM}=t,range=maxM-minM,biome=s.options.biome;
 const make=(v,level)=>C.contours(v,n,level,s.width,s.height).map(poly=>'M'+pts(poly)+'Z').join('');
 const desert=['desert','badlands'].includes(biome),cold=['alpine','tundra'].includes(biome);
 let out=`<rect width="${s.width}" height="${s.height}" fill="${desert?p.sand:cold?p.snow:biome==='volcanic'?p.mountain:p.grass}"/>`;
 const bands=view.terrainDisplay==='elevation'?[p.deep,p.forest,p.grass,p.sand,p.hill,p.mountain,p.snow]:desert?[p.sand,p.land,p.hill]:cold?[p.land,p.hill,p.snow]:biome==='volcanic'?[p.hill,p.mountain,p.ink]:[p.grass,p.land,p.hill,p.mountain,p.snow];
 if(range>.01)for(let i=0;i<bands.length;i++){
  const fraction=view.terrainDisplay==='elevation'?i/bands.length:(i+1)/(bands.length+1),level=minM+range*fraction;
  out+=`<path d="${make(heights,level)}" fill="${bands[i]}" fill-rule="evenodd" opacity="${view.terrainDisplay==='elevation'?1:desert?.35:.32}"/>`;
 }
 if(view.terrainDisplay!=='elevation'&&s.options.forest>0&& !['desert','volcanic'].includes(biome)){
  const threshold=.68-s.options.forest*.36,vegetation=moisture.map((m,i)=>Math.min(m-threshold,t.waterMode==='coast'?heights[i]/100:1));
  out+=`<path d="${make(vegetation,0)}" fill="${p.forest}" fill-rule="evenodd" opacity="${biome==='woodland'?.65:.4}"/>`;
 }
 if(view.hillshade!==false&&range>.01){
  out+=`<defs><filter id="survey-softshade" x="-5%" y="-5%" width="110%" height="110%"><feGaussianBlur stdDeviation="${num(s.width/n*.75)}"/></filter></defs><g filter="url(#survey-softshade)">`;
  const shadeGroups=new Map(),cell=s.width/n,step=2,light=[-.53,-.58,.62],baseline=.62;
  for(let y=1;y<n-1;y+=step)for(let x=1;x<n-1;x+=step){
   const i=y*n+x,dx=(heights[i+1]-heights[i-1])/(2*t.cellMeters)*3,dy=(heights[i+n]-heights[i-n])/(2*t.cellMeters)*3,norm=Math.hypot(dx,dy,1),lit=(-dx*light[0]-dy*light[1]+light[2])/norm;
   const shade=Math.round(E.clamp(lit-baseline,-.8,.5)*12);if(shade===0)continue;
   if(!shadeGroups.has(shade))shadeGroups.set(shade,[]);
   shadeGroups.get(shade).push(`M${num((x-.5)*cell)} ${num((y-.5)*cell)}h${num(step*cell+.1)}v${num(step*cell+.1)}h-${num(step*cell+.1)}Z`);
  }
  for(const [shade,paths]of shadeGroups)out+=`<path d="${paths.join('')}" fill="${shade<0?p.ink:p.paper}" opacity="${num(Math.abs(shade)/12*.45)}" stroke="none"/>`;
  out+='</g>';
 }
 if(t.waterMode==='coast'){
  const submerged=heights.map(v=>-v);out+=`<path d="${make(submerged,0)}" fill="${p.water}" fill-rule="evenodd"/><path d="${make(heights,0)}" fill="none" stroke="${p.deep}" stroke-width="1.2"/>`;
 }
 let interval=0;
 if(view.contours&&range>.01){
  const target=range/12,power=10**Math.floor(Math.log10(target));interval=[1,2,5,10].find(k=>k*power>=target)*power;
  for(let level=Math.ceil(minM/interval)*interval;level<maxM;level+=interval){
   const major=Math.abs(Math.round(level/interval))%5===0;
   out+=`<path d="${make(heights,level)}" fill="none" stroke="${p.ink}" stroke-width="${major?.85:.5}" opacity="${major?.4:.21}"/>`;
  }
 }
 out+=`<g id="elevation-legend" pointer-events="none"><rect x="26" y="26" width="275" height="${view.terrainDisplay==='elevation'?82:62}" rx="5" fill="${p.paper}" opacity=".9"/><text x="38" y="45" font-family="system-ui,sans-serif" font-size="10" fill="${p.ink}">LOCAL SURVEY · ${s.scale} × ${s.scale} km</text><text x="38" y="62" font-family="system-ui,sans-serif" font-size="10" fill="${p.ink}">${Math.round(minM)}–${Math.round(maxM)} m · mean ${Math.round(t.meanM)} m</text><text x="38" y="78" font-family="system-ui,sans-serif" font-size="9" fill="${p.ink}">${interval?'Contours '+Number(interval.toPrecision(3))+' m · ':''}Samples ${Number(t.cellMeters.toPrecision(4))} m</text>`;
 if(view.terrainDisplay==='elevation')for(let i=0;i<bands.length;i++)out+=`<rect x="${38+i*35}" y="88" width="35" height="8" fill="${bands[i]}"/>`;
 out+='</g>';cache.set(t,{key,svg:out});return out;
}

function terrainSVG(s,p,palette,showContours=false){
 if(!s.terrain)return'';const t=s.terrain,key=palette+':'+(t.revision||0)+':'+s.options.forest+':'+showContours;
 let obj=cache.get(t);if(obj?.key===key)return obj.svg;
 const {n,heights,moisture,sea}=t,make=(values,level)=>C.contours(values,n,level,s.width,s.height).map(poly=>'M'+pts(poly)+'Z').join('');
 let out=`<rect width="${s.width}" height="${s.height}" fill="${p.deep}"/>`;
 const bands=[[heights,sea-.09,p.water],[heights,sea,p.sand],[heights,sea+.025,p.grass]];
 const forest=heights.map((h,i)=>Math.min(h-sea-.028,moisture[i]-(.65-s.options.forest*.29),.66-h));
 if(s.options.forest>0)bands.push([forest,0,p.forest]);
 bands.push([heights,.63,p.hill],[heights,.73,p.mountain],[heights,.84,p.snow]);
 for(const [field,level,fill]of bands){const d=make(field,level);out+=`<path d="${d}" fill="${fill}" fill-rule="evenodd"/>`;}
 const shoreline=make(heights,sea);out+=`<path d="${shoreline}" fill="none" stroke="${p.deep}" stroke-width="1" opacity=".65"/>`;
 if(showContours)for(let v=Math.max(.42,sea+.07);v<.91;v+=.065)out+=`<path d="${make(heights,v)}" fill="none" stroke="${p.ink}" stroke-width=".7" opacity=".21"/>`;
 cache.set(t,{key,svg:out});return out;
}

function icon(f,p=palettes.atlas){const topDown=B.prop(f,p);if(topDown!==null)return topDown;const size=f.size||15,x=f.x||0,y=f.y||0;return `<use href="#asset-${E.ASSETS.includes(f.asset)?f.asset:'rock'}" x="${num(x-size)}" y="${num(y-size)}" width="${num(size*2)}" height="${num(size*2)}" transform="rotate(${num(f.rotation||0)} ${num(x)} ${num(y)})"/>`;}
function layer(f){return ['road','wall','portal'].includes(f.type)?'roads':['area','paint'].includes(f.type)?'terrain':['river','water'].includes(f.type)?'water':f.type==='building'?'buildings':f.type==='district'?'districts':f.type==='decoration'?'vegetation':['label','room'].includes(f.type)?'labels':'assets';}
function render(s,view={}){view={...C.appearance(s),...view};const palette=view.palette||'atlas',high=HQ.enabled(s,view),p=high?HQ.palette(palettes[palette]||palettes.atlas,palette):palettes[palette]||palettes.atlas,layers={terrain:true,water:true,roads:true,buildings:true,districts:false,vegetation:true,assets:true,labels:true,...view.layers},hide=f=>f.hidden||view.player&&f.gmOnly||!layers[layer(f)]||City.hidden(f,s,view),w=s.width,h=s.height;
 const symbolDefs=symbols(p,new Set(s.features.filter(f=>!hide(f)).flatMap(f=>[f.asset||'rock',f.roofAsset||'rock'])));
 let out=`<svg xmlns="http://www.w3.org/2000/svg" xmlns:xlink="http://www.w3.org/1999/xlink" width="${w}" height="${h}" viewBox="${esc(view.viewBox||`0 0 ${w} ${h}`)}" role="img" aria-label="${esc(s.title)}"><defs>${City.defs(s,p,view)}${high?HQ.defs(s,p):''}${s.battle?B.defs(s,p):''}${high?HQ.enrich(symbolDefs,s,p).replaceAll('stroke-width="1.2"','stroke-width=".6"'):symbolDefs}<pattern id="floor-stone" width="50" height="36" patternUnits="userSpaceOnUse"><path d="M0 0H50V36H0ZM0 18H50M25 0V18M12 18V36M40 18V36" fill="none" stroke="${p.ink}" stroke-width=".6" opacity=".13"/></pattern><pattern id="floor-wood" width="64" height="14" patternUnits="userSpaceOnUse"><path d="M0 0H64V14H0ZM20 0V14M0 5H16M26 9H59" fill="none" stroke="${p.ink}" stroke-width=".6" opacity=".22"/></pattern><pattern id="paper-hatch" width="8" height="8" patternUnits="userSpaceOnUse"><path d="M0 8L8 0" stroke="${p.ink}" stroke-opacity=".08" stroke-width=".5"/></pattern><clipPath id="map-clip">${s.mode==='battle'&&s.options.mapShape!=='rectangle'?`<polygon points="${pts(E.mapBoundary(s))}"/>`:`<rect width="${w}" height="${h}"/>`}</clipPath></defs><g clip-path="url(#map-clip)"><rect width="${w}" height="${h}" fill="${s.mode==='battle'&&!['forest','desert','bridge'].includes(s.options.theme)?(palette==='night'?'#202930':'#58605a'):p.paper}"/>`;
 if(s.mode==='region'&&layers.terrain)out+=terrainSVG(s,p,palette,view.contours);
 if(s.mode==='local'&&layers.terrain)out+=localTerrainSVG(s,p,palette,view);
 if(s.cityStudio&&layers.terrain)out+=City.terrain(s,p,view,C.contours);
 else if(s.mode==='city'&&layers.terrain){out+=`<rect width="${w}" height="${h}" fill="${p.land}"/><rect x="45" y="45" width="910" height="910" fill="url(#paper-hatch)" opacity=".4"/>`;}
 if(s.battle&&high&&layers.terrain)out+=HQ.floor(s,p,view);
 else if(s.battle?.generatorVersion===2&&layers.terrain)out+=B.floor(s,p,view);
 else if(s.battle&&layers.terrain){const {cols,rows,cells}=s.battle,g=s.gridSize;for(let y=0;y<rows;y++){let x=0;while(x<cols){if(!cells[y*cols+x]){x++;continue;}const start=x;while(x<cols&&cells[y*cols+x])x++;out+=`<rect x="${num(start*g)}" y="${num(y*g)}" width="${num((x-start)*g+.12)}" height="${num(g+.12)}" fill="${['forest','bridge'].includes(s.options.theme)?p.grass:s.options.theme==='desert'?p.sand:['cave','ice-cave'].includes(s.options.theme)?p.hill:s.options.theme==='tavern'?p.sand:p.paper}"/>`;}}}
 if(s.battle&&!high&&s.battle.generatorVersion!==2&&view.textures!==false&&!['forest','bridge','desert'].includes(s.options.theme)){
   const {cols,rows,cells}=s.battle,g=s.gridSize;let d='';for(let y=0;y<rows;y++){let x=0;while(x<cols){if(!cells[y*cols+x]){x++;continue;}const start=x;while(x<cols&&cells[y*cols+x])x++;d+=`M${num(start*g)},${num(y*g)}h${num((x-start)*g)}v${num(g)}h-${num((x-start)*g)}Z`;}}
   out+=`<path d="${d}" fill="url(#${s.options.theme==='tavern'?'floor-wood':'floor-stone'})"/>`;
 }
 const order={area:4,portal:15,light:16,district:0,plaza:1,water:2,river:3,paint:4,building:5,road:6,wall:7,decoration:8,asset:9,image:10,settlement:11,poi:12,room:13,label:14};const fs=s.features.slice().sort((a,b)=>((order[a.type]??10)+(a.z||0)*.01)-((order[b.type]??10)+(b.z||0)*.01)||(a.y||0)-(b.y||0));
 let cityRoadBed=false;for(const f of fs){if(hide(f))continue;if(s.cityStudio&&!cityRoadBed&&(order[f.type]??10)>=5){out+=City.roadUnderlay(s,p,view,hide);cityRoadBed=true;}let shape='',poly=f.polygon?pts(f.polygon):'',line=f.points?pts(f.points):'';
 const detailed=s.cityStudio?City.feature(f,s,p,view):high?HQ.feature(f,s,p):null;
 if(detailed!==null)shape=detailed;else switch(f.type){case'district':{const colors=['#ccb89b','#c3cba8','#d6b79b','#b7c9ba','#cfc3a5'];shape=`<polygon points="${poly}" fill="${colors[E.hash(f.ward||f.label)%colors.length]}" fill-opacity=".65" stroke="${p.ink}" stroke-opacity=".45" stroke-width=".8" stroke-dasharray="4 3"/>`;break;}
 case'plaza':shape=`<polygon points="${poly}" fill="${p.sand}" stroke="${p.ink}" stroke-opacity=".25" stroke-width="1"/>`;break;
 case'area':shape=`<polygon points="${poly}" fill="${({stone:p.hill,slate:p.mountain,flagstone:p.paper,wood:p.roof[0]})[f.material]||p[f.material]||p.grass}" stroke="${p.ink}" stroke-width=".6" stroke-opacity=".3"/>`;break;
 case'water':shape=`<polygon points="${poly}" fill="${p.water}" stroke="${p.deep}" stroke-width="2"/>`;break;
 case'river':shape=`<polyline points="${line}" fill="none" stroke="${p.deep}" stroke-width="${num(f.width+2)}"/><polyline points="${line}" fill="none" stroke="${p.water}" stroke-width="${num(f.width)}"/>`;break;
 case'paint':shape=`<polyline points="${line}" fill="none" stroke="${esc({forest:p.forest,water:p.water,land:p.grass,mountain:p.mountain,sand:p.sand}[f.paint]||p.grass)}" stroke-width="${num(f.width)}"/>`;break;
 case'building':shape=`<polygon points="${poly}" fill="${p.roof[(f.roof||0)%5]}" stroke="${p.ink}" stroke-opacity=".8" stroke-width=".7"/>`;if(view.textures!==false&&f.roofAsset&&f.roofWidth>0&&f.roofHeight>0){const c=E.center(f.polygon),fx=Number.isFinite(f.roofCx)?f.roofCx:c[0],fy=Number.isFinite(f.roofCy)?f.roofCy:c[1],id='roof-clip-'+E.hash(f.id);shape+=`<clipPath id="${id}"><polygon points="${poly}"/></clipPath><g clip-path="url(#${id})" pointer-events="none"><use href="#asset-${esc(f.roofAsset)}" x="${num(fx-f.roofWidth/2)}" y="${num(fy-f.roofHeight/2)}" width="${num(f.roofWidth)}" height="${num(f.roofHeight)}" transform="rotate(${num(f.roofAngle||0)} ${num(fx)} ${num(fy)})" opacity=".86"/></g>`;}else if(view.textures!==false&&f.polygon.length>=3){const mid=E.center(f.polygon);let a=f.polygon[0],b=f.polygon[1];for(let i=0;i<f.polygon.length;i++)if(E.dist(f.polygon[i],f.polygon[(i+1)%f.polygon.length])>E.dist(a,b)){a=f.polygon[i];b=f.polygon[(i+1)%f.polygon.length];}const dx=(b[0]-a[0])*.23,dy=(b[1]-a[1])*.23;shape+=`<path d="M${num(mid[0]-dx)},${num(mid[1]-dy)}L${num(mid[0]+dx)},${num(mid[1]+dy)}" fill="none" stroke="${p.ink}" stroke-width=".45" opacity=".42"/>`;}break;
 case'road':shape=`<polyline points="${line}" fill="none" stroke="${p.ink}" stroke-opacity=".42" stroke-width="${num(f.width+1.2)}"/><polyline points="${line}" fill="none" stroke="${p.road}" stroke-width="${num(f.width)}" ${f.roadType==='trail'?'stroke-dasharray="6 3"':''}/>`;if(f.roadType==='cobble')shape+=`<polyline points="${line}" fill="none" stroke="${p.ink}" stroke-opacity=".25" stroke-width="${num(f.width)}" stroke-dasharray="1 5"/>`;if(f.roadType==='highway')shape+=`<polyline points="${line}" fill="none" stroke="${p.paper}" stroke-width="1" stroke-dasharray="7 6"/>`;break;
 case'wall':shape=`<polyline points="${line}" fill="none" stroke="${p.ink}" stroke-width="${num(f.width+2.8)}"/><polyline points="${line}" fill="none" stroke="${p.hill}" stroke-width="${num(f.width)}"/><polyline points="${line}" fill="none" stroke="${p.ink}" stroke-width="${num(f.width+3.8)}" stroke-dasharray="2 9"/>`;break;
 case'portal':if(s.battle?.generatorVersion===2){shape=B.door(f,s,p);break;}shape=`<polyline points="${line}" fill="none" stroke="${p.ink}" stroke-width="6"/><polyline points="${line}" fill="none" stroke="${p.roof[1]}" stroke-width="4"/>`;break;
 case'light':shape=view.editor?`<circle cx="${num(f.x)}" cy="${num(f.y)}" r="${num((f.range||6)*(s.gridSize||10))}" fill="${esc(f.color||'#ffc477')}" fill-opacity=".1" stroke="${esc(f.color||'#ffc477')}" stroke-dasharray="4 5"/><circle cx="${num(f.x)}" cy="${num(f.y)}" r="7" fill="${esc(f.color||'#ffc477')}"/>`:'';break;
 case'room':break;
 case'label':shape=`<text x="${num(f.x)}" y="${num(f.y)}" text-anchor="middle" font-family="Georgia,serif" font-size="${num(f.size||16)}" transform="rotate(${num(f.rotation||0)} ${num(f.x)} ${num(f.y)})" fill="${p.ink}" stroke="${p.paper}" stroke-width="3" paint-order="stroke">${esc(f.label)}</text>`;break;
 case'image':shape=`<image href="${esc(f.data)}" x="${num(f.x-f.size)}" y="${num(f.y-f.size/(f.aspect||1))}" width="${num(f.size*2)}" height="${num(f.size*2/(f.aspect||1))}" transform="rotate(${num(f.rotation||0)} ${num(f.x)} ${num(f.y)})"/>`;break;
 default:shape=high?HQ.prop(f,s,p,icon(f,p)):icon(f,p);}
 if(high&&!['area','water','road','wall','paint','river','image'].includes(f.type))shape=HQ.enrich(shape,s,p);
 out+=`<g data-id="${esc(f.id)}" stroke-linecap="round" stroke-linejoin="round" opacity="${num(E.clamp(f.opacity??1,.05,1))}" ${f.flipX?`transform="translate(${num(2*C.center(f)[0])} 0) scale(-1 1)"`:""}>${shape}</g>`;
 }
 if(s.battle&&layers.roads){let walls=C.mergeWalls(E.wallSegments(s));for(const f of fs.filter(f=>f.type==='portal'&&!hide(f)))walls=walls.flatMap(l=>C.cutDoor(l,f.points,s.gridSize*.04));out+=high?HQ.walls(s,p,walls):s.battle.generatorVersion===2?B.walls(s,p,walls):`<path d="${walls.map(l=>`M${pts([l[0]])}L${pts([l[1]])}`).join('')}" stroke="${p.ink}" stroke-width="${num(s.gridSize*.12)}" fill="none" pointer-events="none"/>`;}

 if(high)for(const f of fs)if(!hide(f))out+=HQ.lighting(f,s,p);
 if(view.grid&&view.grid!=='none'){
  let grid='';const gridScene={...s,appearance:{...s.appearance,gridSpacingKm:view.gridSpacingKm}},spec=C.gridSpec(gridScene,view.grid);
  if(spec.hex){for(const cell of C.hexCenters(gridScene,view.grid))grid+=`M${pts(C.hexPolygon(cell.x,cell.y,spec.radius,spec.pointy))}Z`;}
  else{for(let x=0;x<=w+.1;x+=spec.spacing)grid+=`M${num(x)},0V${h}`;for(let y=0;y<=h+.1;y+=spec.spacing)grid+=`M0,${num(y)}H${w}`;}
  out+=`<path data-grid="${esc(view.grid)}" d="${grid}" fill="none" stroke="${p.ink}" stroke-width=".65" opacity=".3" pointer-events="none"/>`;
 }
 if(layers.labels){for(const f of fs){if(hide(f)||!f.label||['building','asset','label','decoration','image'].includes(f.type)&&!(s.cityStudio&&f.cityRole==='civic'))continue;if(f.type==='district'&&(!layers.districts||!s.cityStudio&&parseInt(f.id.slice(1),10)%3!==0))continue;if(s.cityStudio&&['road','area','wall'].includes(f.type))continue;const anchor=C.center(f);const size=f.type==='room'&&s.battle?.generatorVersion===2?E.clamp(s.gridSize*.34,5,13):f.type==='district'?10:s.mode==='region'?13:12;out+=`<text data-id="${esc(f.id)}" x="${num(anchor[0])}" y="${num(anchor[1]+(f.type==='room'||f.type==='district'?0:(f.size||10)+11))}" font-size="${size}" text-anchor="middle" font-family="Georgia,serif" fill="${p.ink}" stroke="${p.paper}" stroke-width="2.6" stroke-opacity=".88" paint-order="stroke">${esc(f.label)}</text>`;}}
 if(view.selected){const ids=Array.isArray(view.selected)?view.selected:[view.selected];for(const id of ids){const f=s.features.find(f=>f.id===id);if(!f)continue;const outline=f.polygon?`<polygon points="${pts(f.polygon)}"/>`:f.points?`<polyline points="${pts(f.points)}"/>`:`<circle cx="${num(f.x)}" cy="${num(f.y)}" r="${num((f.size||15)+5)}"/>`;out+=`<g fill="none" stroke="#d7823b" stroke-width="2.5" stroke-dasharray="6 3" pointer-events="none">${outline}</g>`;
 if(view.editNodes&&ids.length===1&&!f.locked&&(f.points||f.polygon||[]).length<=250)for(const [i,pt]of (f.points||f.polygon||[]).entries())out+=`<circle data-node="${i}" data-id="${esc(f.id)}" cx="${num(pt[0])}" cy="${num(pt[1])}" r="4" fill="#fff2ce" stroke="#875522" stroke-width="1.5" style="cursor:move"/>`;
 }}

 if(view.draft?.length){out+=`<polyline points="${pts(view.draft)}" fill="none" stroke="#cb693e" stroke-width="3" stroke-dasharray="7 5" pointer-events="none"/>`;for(const p of view.draft)out+=`<circle cx="${num(p[0])}" cy="${num(p[1])}" r="4" fill="#cb693e" pointer-events="none"/>`;}
 out+='</g>';
 if(view.furniture!==false){const target=s.scale*.2,power=Math.pow(10,Math.floor(Math.log10(target))),step=[1,2,5,10].filter(k=>k*power<=target).at(-1)*power,unit=s.mode==='battle'?s.gridSize:w/s.scale*step,label=s.mode==='battle'?'5 ft':step<1?Math.round(step*1000)+' m':Number(step.toPrecision(4))+' km' ;out+=`<g pointer-events="none" fill="${p.ink}" font-family="Georgia,serif"><path d="M${w-48} 38L${w-55} 63L${w-48} 58L${w-41} 63Z"/><text x="${w-48}" y="30" text-anchor="middle" font-size="13">N</text><rect x="25" y="${h-45}" width="${num(unit+22)}" height="30" fill="${p.paper}" fill-opacity=".86" rx="3"/><path d="M35 ${h-28}v-7m0 4h${num(unit)}m0-4v7" fill="none" stroke="${p.ink}" stroke-width="1.5"/><text x="${num(35+unit/2)}" y="${h-18}" text-anchor="middle" font-size="9">${label}</text></g><rect x="8" y="8" width="${w-16}" height="${h-16}" fill="none" stroke="${p.ink}" stroke-opacity=".42" stroke-width="1" pointer-events="none"/>`;}
 out+='</svg>';return out;
}
function assetPreview(asset,palette='atlas',size=52){const p=palettes[palette]||palettes.atlas,id='preview-'+asset+'-';return`<svg xmlns="http://www.w3.org/2000/svg" width="${size}" height="${size}" viewBox="0 0 56 56" aria-hidden="true"><defs>${symbols(p,new Set([asset]),id)}</defs><use href="#${id+esc(asset)}" x="0" y="0" width="56" height="56"/></svg>`;}
function assetFile(asset,palette='atlas'){return assetPreview(asset,palette,256);}

return{render,assetPreview,assetFile,symbols,palettes,esc,pts};
});
