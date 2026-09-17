/* HQ battle-map appearance. Original procedural materials and top-down art.
 * GPL-3.0-only. Rendering only: never adds geometry, consumes generator RNG,
 * changes movement/LOS, or fetches external resources. No full-scene filters.
 */
(function(root,factory){const M=typeof module==='object'&&module.exports?require('./battle-materials.js'):root.MegamapBattleMaterials;const api=factory(M);if(typeof module==='object'&&module.exports)module.exports=api;else root.MegamapBattleHQ=api;})(typeof globalThis!=='undefined'?globalThis:this,function(M){
'use strict';
const n=v=>Number(Number(v).toFixed(2)),pts=ps=>ps.map(p=>p.map(n).join(',')).join(' ');
function hash(s){let h=2166136261;for(const c of String(s))h=Math.imul(h^c.charCodeAt(0),16777619);return h>>>0;}
function rng(s){let a=hash(s);return()=>{a+=0x6d2b79f5;let t=a;t=Math.imul(t^(t>>>15),t|1);t^=t+Math.imul(t^(t>>>7),t|61);return((t^(t>>>14))>>>0)/4294967296;};}
const enabled=(s,v)=>s.mode==='battle'&&v.hq===true;
function palette(p,name){if(name!=='atlas')return p;return {...p,paper:'#c9bda5',land:'#727b4e',grass:'#687b42',forest:'#354e2b',hill:'#81796c',mountain:'#6f7169',sand:'#c9b082',road:'#a78b5e',water:'#507f79',deep:'#304e53',snow:'#dce3dd',ink:'#293025',roof:['#906846','#6f5037','#a3865d','#83684d','#b1966b']};}
function mix(a,b,t){const x=a.slice(1).match(/../g).map(v=>parseInt(v,16)),y=b.slice(1).match(/../g).map(v=>parseInt(v,16));return '#'+x.map((v,i)=>Math.round(v+(y[i]-v)*t).toString(16).padStart(2,'0')).join('');}
function id(s,p,key){return 'hq-'+hash(s.seed+':'+s.width+':'+s.height+':'+s.gridSize+':'+p.grass+':'+p.ink).toString(36)+'-'+key;}
const url=(s,p,k)=>'url(#'+id(s,p,k)+')';
function floorPath(s){let d='';const b=s.battle,g=s.gridSize;for(let y=0;y<b.rows;y++)for(let x=0;x<b.cols;){if(!b.cells[y*b.cols+x]){x++;continue;}const a=x;while(x<b.cols&&b.cells[y*b.cols+x])x++;d+=`M${n(a*g)} ${n(y*g)}h${n((x-a)*g)}v${n(g)}h-${n((x-a)*g)}Z`;}return d;}
const materialName=m=>{const k=({land:'grass',forest:'grass',mountain:'stone',hill:'stone',slate:'stone',flagstone:'pavers',tile:'pavers',wood:'planks'}[m]||m);return ['grass','earth','sand','stone','water','snow','planks','pavers'].includes(k)?k:'grass';};
const natureType=asset=>['tree','oak','battle-oak-canopy','willow','birch','cypress','cedar','jungle-tree'].includes(asset)?'tree':['pine'].includes(asset)?'pine':['palm'].includes(asset)?'palm':['bush','bramble-patch','fern','marsh-tussock','reeds'].includes(asset)?'bush':['rock','boulder','crag-spire','tidal-rocks','rock-cluster','scree-fan'].includes(asset)?'rock':null;
function natureArt(kind,variant,s,p){const r=rng(kind+variant),u=k=>url(s,p,k);let out='';
 if(kind==='tree'||kind==='bush'){
  const count=kind==='tree'?26:15,rad=kind==='tree'?19:20;
  let contour=[];for(let i=0;i<24;i++){const a=i*Math.PI/12,d=21+r()*3;contour.push([Math.cos(a)*d,Math.sin(a)*d]);}
  out+=`<polygon points="${pts(contour)}" fill="${mix(p.forest,'#101c11',.25)}" stroke="none"/>`;
  for(let i=0;i<count;i++){const a=r()*Math.PI*2,d=Math.sqrt(r())*rad,x=Math.cos(a)*d,y=Math.sin(a)*d,rr=4+r()*4;
   out+=`<circle cx="${n(x+.5)}" cy="${n(y+1)}" r="${n(rr)}" fill="#13200f" opacity=".25"/><circle cx="${n(x)}" cy="${n(y)}" r="${n(rr)}" fill="${u('leaf')}"/>`;
  }
  for(let i=0;i<180;i++){const a=r()*Math.PI*2,d=Math.sqrt(r())*22,x=Math.cos(a)*d,y=Math.sin(a)*d;out+=`<ellipse cx="${n(x)}" cy="${n(y)}" rx="${n(.35+r()*.65)}" ry="${n(.3+r()*.4)}" fill="${i%3?mix(p.grass,p.paper,.24):p.forest}" opacity="${n(.28+r()*.4)}" transform="rotate(${n(r()*180)} ${n(x)} ${n(y)})"/>`;}
 }else if(kind==='pine'){
  for(let tier=0;tier<6;tier++){const rad=25-tier*3.1,turn=r()*6,poly=[];for(let j=0;j<32;j++){const a=j*Math.PI/16+turn,d=rad*(j%2?.48:.88+r()*.12);poly.push([Math.cos(a)*d,Math.sin(a)*d]);}
   out+=`<polygon points="${pts(poly.map(([x,y])=>[x+.5,y+1]))}" fill="#172317" opacity=".4"/><polygon points="${pts(poly)}" fill="${mix(p.forest,p.grass,tier*.12)}"/>`;
   for(let j=0;j<12;j++){const a=j*Math.PI/6+turn;out+=`<path d="M0 0L${n(Math.cos(a)*rad*.88)} ${n(Math.sin(a)*rad*.88)}" stroke="${p.grass}" opacity=".48" stroke-width=".4"/>`;}
  }
 }else if(kind==='palm'){
  for(let i=0;i<10;i++){const a=i*36+r()*10;out+=`<g transform="rotate(${n(a)})"><path d="M0 0Q-11-12 0-26Q12-13 0 0" fill="${u('leaf')}"/><path d="M0 0Q-2-13 0-25" fill="none" stroke="${p.grass}" stroke-width=".6"/>`;
   for(let j=1;j<8;j++)out+=`<path d="M0 ${-j*3}l-${n(6-j*.4)} 4m${n(6-j*.4)}-4l${n(6-j*.4)} 4" stroke="${p.forest}" stroke-width=".7" opacity=".65"/>`;out+='</g>';
  }out+=`<circle r="2.5" fill="${p.roof[0]}"/>`;
 }else{
  const poly=Array.from({length:9},(_,i)=>{const a=i*2*Math.PI/9,d=18+r()*6;return [Math.cos(a)*d,Math.sin(a)*d];});
  out+=`<polygon points="${pts(poly)}" fill="${u('rock-light')}"/>`;
  for(let i=0;i<poly.length;i++){const a=poly[i],b=poly[(i+1)%poly.length];out+=`<polygon points="${pts([[-3,-5],a,b])}" fill="${mix(p.mountain,i<4?'#23251f':p.paper,.12+r()*.3)}" opacity=".6"/>`;}
  out+=`<polygon points="${pts(poly)}" fill="${u('stone')}" opacity=".2"/>`;
  for(let j=0;j<30;j++){const a=r()*6.28,d=r()*18;out+=`<circle cx="${n(Math.cos(a)*d)}" cy="${n(Math.sin(a)*d)}" r="${n(.25+r())}" fill="${j%3?p.paper:p.forest}" opacity=".25"/>`;}
  out+=`<path d="M-13-14L-8-5L-12 2M-8-5L-2-3M12 8L8 13L11 18" fill="none" stroke="${mix(p.mountain,'#151a17',.5)}" stroke-width=".65" opacity=".7"/>`;
 }
 return `<g stroke="none">${out}</g>`;
}
const defCache=new Map();
function defs(s,p){const key=id(s,p,'defs');let cached=defCache.get(key);if(cached)return cached+`<clipPath id="${id(s,p,'floor')}"><path d="${floorPath(s)}"/></clipPath>`;
 const g=s.gridSize,tag=(k,body)=>`<pattern id="${id(s,p,k)}" width="${n(g*4)}" height="${n(g*4)}" patternUnits="userSpaceOnUse">${body}</pattern>`,image=(m,c)=>`<image href="${M.texture(m,c)}" width="${n(g*4)}" height="${n(g*4)}" preserveAspectRatio="none"/>`;let out='';
 for(const [m,c]of Object.entries({grass:p.grass,earth:mix(p.roof[1],p.sand,.3),sand:p.sand,stone:p.mountain,water:p.water,snow:p.snow,wood:p.roof[0]}))out+=tag(m,image(m,c));
 let planks=image('wood',p.roof[0]),pavers=image('stone',mix(p.paper,p.hill,.38));
 for(let i=0;i<8;i++)planks+=`<path d="M0 ${n(i*g*.5)}H${n(g*4)}m${n(-(1+(i*7%3)) *g)} 0v${n(g*.5)}" fill="none" stroke="${mix(p.roof[0],'#1d1911',.6)}" stroke-width="${n(g*.025)}"/><path d="M0 ${n(i*g*.5+g*.04)}H${n(g*4)}" stroke="${p.paper}" opacity=".14" stroke-width="${n(g*.02)}"/>`;
 for(let y=0;y<4;y++)for(let x=0;x<3;x++){const xx=(x-(y%2)*.5)*g*1.6,yy=y*g; pavers+=`<rect x="${n(xx)}" y="${n(yy)}" width="${n(g*1.6)}" height="${n(g)}" fill="${(x+y)%2?p.paper:p.hill}" fill-opacity=".08" stroke="${p.ink}" stroke-opacity=".35" stroke-width="${n(g*.04)}"/><path d="M${n(xx+g*.06)} ${n(yy+g*.92)}V${n(yy+g*.06)}H${n(xx+g*1.53)}" fill="none" stroke="${p.paper}" stroke-opacity=".3" stroke-width="${n(g*.025)}"/>`;}
 out+=tag('planks',planks)+tag('pavers',pavers);
 const radial=(key,a,b,opacity=1)=>`<radialGradient id="${id(s,p,key)}" cx="32%" cy="27%" r="72%"><stop stop-color="${a}" stop-opacity="${opacity}"/><stop offset="1" stop-color="${b}"/></radialGradient>`;
 out+=radial('leaf',mix(p.grass,p.paper,.14),mix(p.forest,'#152112',.2))+radial('rock-light',mix(p.mountain,p.paper,.5),mix(p.hill,'#272d24',.32))+radial('cloth',mix(p.water,p.paper,.24),mix(p.water,'#162b28',.3));
 out+=`<radialGradient id="${id(s,p,'shadow')}"><stop stop-color="#10180e" stop-opacity=".4"/><stop offset=".55" stop-color="#16200d" stop-opacity=".22"/><stop offset="1" stop-color="#16200d" stop-opacity="0"/></radialGradient><radialGradient id="${id(s,p,'patch')}"><stop stop-color="${mix(p.grass,p.sand,.6)}" stop-opacity=".45"/><stop offset="1" stop-color="${p.grass}" stop-opacity="0"/></radialGradient><radialGradient id="${id(s,p,'glow')}"><stop stop-color="#ffe5a6" stop-opacity=".55"/><stop offset=".32" stop-color="#edb96e" stop-opacity=".18"/><stop offset="1" stop-color="#eb9b45" stop-opacity="0"/></radialGradient>`;
 for(const [k,c]of [['wood-finish',p.roof[0]],['stone-finish',p.hill],['metal',p.mountain]])out+=`<linearGradient id="${id(s,p,k)}" x1="0" y1="0" x2=".8" y2="1"><stop stop-color="${mix(c,p.paper,.36)}"/><stop offset=".4" stop-color="${c}"/><stop offset="1" stop-color="${mix(c,'#1c221b',.32)}"/></linearGradient>`;
 for(const kind of ['tree','pine','palm','bush','rock'])for(let v=0;v<3;v++)out+=`<symbol id="${id(s,p,kind+v)}" viewBox="-28 -28 56 56">${natureArt(kind,v,s,p)}</symbol>`;
 defCache.set(key,out);if(defCache.size>12)defCache.delete(defCache.keys().next().value);
 return out+`<clipPath id="${id(s,p,'floor')}"><path d="${floorPath(s)}"/></clipPath>`;
}
function floor(s,p,view={}){const b=s.battle,theme=s.options.theme,g=s.gridSize,residential=['dwelling','tavern','stronghold','mansion','castle'].includes(theme),outside=!!b.landscape||residential||['forest','desert','bridge','arena'].includes(theme),cave=['cave','ice-cave'].includes(theme);
 const mat=b.landscape?materialName(b.landscape.ground):theme==='arena'?'grass':theme==='desert'?'sand':theme==='ice-cave'?'snow':outside?'grass':'stone';
 let out=`<g data-hq="terrain" pointer-events="none"><rect width="${s.width}" height="${s.height}" fill="${url(s,p,mat)}"/>`;
 if(!outside&&!cave)out+=`<rect width="${s.width}" height="${s.height}" fill="#192019" opacity=".48"/>`;
 const r=rng(s.seed+'hq-ground');for(let i=0;i<90;i++)out+=`<ellipse cx="${n(r()*s.width)}" cy="${n(r()*s.height)}" rx="${n((1+r()*4)*g)}" ry="${n((1+r()*3)*g)}" fill="${url(s,p,'patch')}" opacity="${mat==='grass'?'.5':'.14'}"/>`;
 if(residential){let solid='';b.cells.forEach((v,i)=>{if(!v)solid+=`M${n(i%b.cols*g)} ${n(Math.floor(i/b.cols)*g)}h${n(g)}v${n(g)}h-${n(g)}Z`;});if(solid)out+=`<path data-painted-solid="true" d="${solid}" fill="${url(s,p,'stone')}"/>`;}
 out+=`<g clip-path="${url(s,p,'floor')}">`;
 const interior=cave?theme==='ice-cave'?'snow':'earth':outside?mat:'pavers';
 // Leave outdoor macro variation visible. Interiors get their own surfaces.
 if(!outside)out+=`<path d="${floorPath(s)}" fill="${view.textures===false&&!cave?p.paper:url(s,p,interior)}"/>`;
 for(const q of b.surfaces||[]){const m=q.material==='wood'?'planks':q.material==='grass'?'grass':'pavers';out+=`<polygon points="${pts(q.polygon)}" fill="${view.textures===false&&m!=='grass'?(m==='planks'?url(s,p,'wood-finish'):p.paper):url(s,p,m)}"/>`;if(q.material==='slate')out+=`<polygon points="${pts(q.polygon)}" fill="#161f20" opacity=".2"/>`;}
 return out+'</g></g>';
}
function enrich(body,s,p){for(const color of p.roof)body=body.split(`fill="${color}"`).join(`fill="${url(s,p,'wood-finish')}"`);return body.split(`fill="${p.hill}"`).join(`fill="${url(s,p,'stone-finish')}"`).split(`fill="${p.water}"`).join(`fill="${url(s,p,'cloth')}"`);}
function prop(f,s,p,fallback){const kind=natureType(f.asset),size=f.size||15,x=f.x||0,y=f.y||0;
 if(!kind)return enrich(fallback,s,p);
 const variant=hash(f.id+s.seed)%3,w=f.propWidth&&f.propHeight?f.propWidth*size/(Math.max(f.propWidth,f.propHeight)*.55):size*1.85,h=f.propWidth&&f.propHeight?f.propHeight*size/(Math.max(f.propWidth,f.propHeight)*.55):size*1.85;
 return `<g data-hq-prop="${kind}" transform="translate(${n(x)} ${n(y)}) rotate(${n(f.rotation||0)})"><ellipse cx="${n(w*.09)}" cy="${n(h*.12)}" rx="${n(w*.65)}" ry="${n(h*.58)}" fill="${url(s,p,'shadow')}" pointer-events="none"/><use href="#${id(s,p,kind+variant)}" x="${n(-w/2)}" y="${n(-h/2)}" width="${n(w)}" height="${n(h)}" preserveAspectRatio="none"/></g>`;
}
function offset(points,d){return points.map((p,i)=>{const a=points[Math.max(0,i-1)],b=points[Math.min(points.length-1,i+1)],len=Math.hypot(b[0]-a[0],b[1]-a[1])||1;return [p[0]-(b[1]-a[1])/len*d,p[1]+(b[0]-a[0])/len*d];});}
function road(f,s,p){const g=s.gridSize,w=f.width,line=pts(f.points),wood=f.roadType==='boardwalk',mat=wood?'planks':f.roadType==='cobble'?'pavers':'earth';let out='';
 for(const [extra,alpha]of [[g*.36,.08],[g*.2,.16],[g*.07,.22]])out+=`<polyline points="${line}" fill="none" stroke="${mix(p.roof[1],'#151b13',.4)}" stroke-width="${n(w+extra)}" opacity="${alpha}"/>`;
 out+=`<polyline points="${line}" fill="none" stroke="${url(s,p,mat)}" stroke-width="${n(w)}"/>`;
 if(!wood&&f.roadType!=='cobble'){for(const sign of [-1,1])out+=`<polyline points="${pts(offset(f.points,sign*w*.23))}" fill="none" stroke="${p.sand}" stroke-opacity=".18" stroke-width="${n(w*.12)}"/>`;}
 if(wood){for(let k=1;k<f.points.length;k++){const a=f.points[k-1],b=f.points[k],len=Math.hypot(b[0]-a[0],b[1]-a[1]);if(len<.01)continue;const dx=(b[0]-a[0])/len,dy=(b[1]-a[1])/len,steps=Math.min(400,Math.ceil(len/(g*.25)));for(let j=0;j<steps;j++){const t=j/steps,x=a[0]+(b[0]-a[0])*t,y=a[1]+(b[1]-a[1])*t;out+=`<path d="M${n(x-dy*w*.48)} ${n(y+dx*w*.48)}L${n(x+dy*w*.48)} ${n(y-dx*w*.48)}" stroke="${p.ink}" opacity=".48" stroke-width="${n(g*.04)}"/>`;}}}
 return `<g data-hq-road="${mat}" stroke-linecap="round" stroke-linejoin="round">${out}</g>`;
}
function feature(f,s,p){const g=s.gridSize,poly=f.polygon?pts(f.polygon):'';
 if(f.type==='road')return road(f,s,p);
 if(f.type==='area'||f.type==='plaza'){const mat=materialName(f.material||'sand');let out=`<polygon points="${poly}" fill="${url(s,p,['grass','sand','stone','pavers','water','snow','earth'].includes(mat)?mat:'grass')}"/>`;
  if(f.arenaTier){const mid=f.polygon.slice(0,13).map((pt,i)=>pt.map((v,j)=>(v+f.polygon[f.polygon.length-1-i][j])/2));out+=`<polyline points="${pts(mid)}" fill="none" stroke="${p.ink}" stroke-opacity=".38" stroke-width="${n(g*.42)}"/><polyline points="${pts(mid)}" fill="none" stroke="${p.paper}" stroke-opacity=".42" stroke-width="${n(g*.24)}"/>`;out+=`<polygon points="${poly}" fill="${f.arenaTier%2?p.paper:p.ink}" fill-opacity=".08" stroke="${p.ink}" stroke-opacity=".45" stroke-width="${n(g*.07)}"/><polyline points="${pts(f.polygon.slice(0,13))}" fill="none" stroke="${p.paper}" stroke-opacity=".3" stroke-width="${n(g*.045)}"/>`;}
  return out;
 }
 if(f.type==='water')return `<polygon points="${poly}" fill="${p.deep}" stroke="${mix(p.roof[1],p.deep,.6)}" stroke-width="${n(g*.3)}" stroke-opacity=".3"/><polygon points="${poly}" fill="${url(s,p,'water')}" stroke="${p.deep}" stroke-width="${n(g*.08)}"/><polygon points="${poly}" fill="none" stroke="${p.paper}" stroke-width="${n(g*.018)}" stroke-opacity=".5"/>`;
 if(f.type==='river')return `<polyline points="${pts(f.points)}" fill="none" stroke="${p.deep}" stroke-width="${n(f.width+g*.13)}"/><polyline points="${pts(f.points)}" fill="none" stroke="${url(s,p,'water')}" stroke-width="${n(f.width)}"/>`;
 if(f.type==='paint')return `<polyline points="${pts(f.points)}" fill="none" stroke="${url(s,p,materialName(f.paint))}" stroke-width="${n(f.width)}"/>`;
 if(f.type==='wall')return walls(s,p,f.points.slice(1).map((p,i)=>[f.points[i],p]),f.width);
 return null;
}
function walls(s,p,segments,width=s.gridSize*.25){const g=s.gridSize,d=segments.map(seg=>'M'+pts([seg[0]])+'L'+pts([seg[1]])).join('');if(!d)return '';let out='';
 for(const [w,alpha,dx,dy]of [[width+g*.7,.07,.09,.17],[width+g*.4,.1,.07,.12],[width+g*.12,.2,.04,.07]])out+=`<path d="${d}" stroke="#0c140c" stroke-width="${n(w)}" opacity="${alpha}" transform="translate(${n(dx*g)} ${n(dy*g)})"/>`;
 out+=`<path d="${d}" stroke="${p.ink}" stroke-width="${n(width+g*.06)}"/><path d="${d}" stroke="${url(s,p,'pavers')}" stroke-width="${n(width)}"/><path d="${d}" stroke="${p.paper}" stroke-width="${n(g*.025)}" stroke-opacity=".55" transform="translate(${n(-g*.035)} ${n(-g*.035)})"/>`;
 return `<g data-battle-walls="architectural" data-hq="walls" fill="none" stroke-linejoin="round" pointer-events="none">${out}</g>`;
}
function lighting(f,s,p){if(!['light','asset'].includes(f.type)||f.type==='asset'&&!['brazier','fire','fireplace','lantern','campfire-ring'].includes(f.asset))return '';const r=f.type==='light'?Math.min(12,f.range||6)*s.gridSize:Math.max(s.gridSize*1.5,(f.size||10)*3);return `<circle data-hq="light" cx="${n(f.x)}" cy="${n(f.y)}" r="${n(r)}" fill="${url(s,p,'glow')}" pointer-events="none"/>`;}
return {enabled,palette,defs,floor,prop,feature,walls,lighting,enrich,floorPath};
});
