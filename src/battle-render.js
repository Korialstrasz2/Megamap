/* Top-down architectural surfaces and furnishings. Original SVG artwork, GPL-3.0. */
(function(root,factory){const api=factory();if(typeof module==='object'&&module.exports)module.exports=api;else root.MegamapBattleRender=api;})(typeof globalThis!=='undefined'?globalThis:this,function(){
'use strict';
const n=v=>Number(Number(v).toFixed(2));
const points=ps=>ps.map(p=>p.map(n).join(',')).join(' ');
function floorPath(s){const {cols,rows,cells}=s.battle,g=s.gridSize;let d='';for(let y=0;y<rows;y++){let x=0;while(x<cols){if(!cells[y*cols+x]){x++;continue;}const first=x;while(x<cols&&cells[y*cols+x])x++;d+=`M${n(first*g)} ${n(y*g)}h${n((x-first)*g)}v${n(g)}h-${n((x-first)*g)}Z`;}}return d;}
function defs(s,p){if(s.battle?.generatorVersion!==2)return '';const g=s.gridSize;
 return `<clipPath id="battle-floor-clip"><path d="${floorPath(s)}"/></clipPath>
 <pattern id="battle-stone" width="${n(g*2)}" height="${n(g*1.5)}" patternUnits="userSpaceOnUse"><path d="M0 0H${n(g*2)}V${n(g*1.5)}H0Z M0 ${n(g*.75)}H${n(g*2)}M${n(g)} 0V${n(g*.75)}M${n(g*.5)} ${n(g*.75)}V${n(g*1.5)}M${n(g*1.5)} ${n(g*.75)}V${n(g*1.5)}" fill="none" stroke="${p.ink}" stroke-width="${n(g*.025)}" opacity=".22"/><path d="M${n(g*.12)} ${n(g*.18)}l${n(g*.22)} ${n(g*.06)}m${n(g*.8)} ${n(g*.69)}l${n(g*.32)} ${n(g*.03)}" stroke="${p.paper}" stroke-width="${n(g*.02)}" opacity=".6"/></pattern>
 <pattern id="battle-wood" width="${n(g*2.4)}" height="${n(g*.65)}" patternUnits="userSpaceOnUse"><path d="M0 0H${n(g*2.4)}V${n(g*.65)}H0Z M${n(g*.8)} 0V${n(g*.325)}M${n(g*1.9)} ${n(g*.325)}V${n(g*.65)}M0 ${n(g*.325)}H${n(g*2.4)}" fill="none" stroke="${p.ink}" stroke-width="${n(g*.02)}" opacity=".28"/><path d="M${n(g*.12)} ${n(g*.14)}q${n(g*.3)} ${n(g*.1)} ${n(g*.52)} 0m${n(g*.4)} ${n(g*.33)}q${n(g*.42)} ${n(-g*.12)} ${n(g*.8)} 0" fill="none" stroke="${p.ink}" stroke-width="${n(g*.012)}" opacity=".18"/></pattern>
 <pattern id="battle-tile" width="${n(g)}" height="${n(g)}" patternUnits="userSpaceOnUse"><path d="M0 0H${n(g)}V${n(g)}H0Z" fill="none" stroke="${p.ink}" stroke-width="${n(g*.03)}" opacity=".18"/><path d="M${n(g*.5)} ${n(g*.35)}l${n(g*.15)} ${n(g*.15)}-${n(g*.15)} ${n(g*.15)}-${n(g*.15)}-${n(g*.15)}Z" fill="${p.ink}" opacity=".13"/></pattern>
 <pattern id="battle-ground" width="${n(g*3)}" height="${n(g*3)}" patternUnits="userSpaceOnUse"><path d="M${n(g*.2)} ${n(g*.7)}l${n(g*.13)}-${n(g*.18)}m0 ${n(g*.2)}l${n(g*.18)}-${n(g*.12)}M${n(g*1.9)} ${n(g*1.9)}l${n(g*.08)}-${n(g*.18)}m${n(g*.1)} ${n(g*.2)}l${n(g*.14)}-${n(g*.12)}" fill="none" stroke="${p.ink}" stroke-width="${n(g*.025)}" opacity=".12"/><ellipse cx="${n(g*1.2)}" cy="${n(g*2.5)}" rx="${n(g*.34)}" ry="${n(g*.07)}" fill="${p.hill}" opacity=".15"/></pattern>
 <pattern id="battle-rock" width="${n(g*2)}" height="${n(g*2)}" patternUnits="userSpaceOnUse"><path d="M0 ${n(g)}L${n(g*.6)} ${n(g*.8)} ${n(g)} 0M${n(g*.6)} ${n(g*.8)}l${n(g*.8)} ${n(g*.8)} ${n(g*.6)}-${n(g*.2)}M${n(g*1.4)} ${n(g*1.6)}L${n(g)} ${n(g*2)}" fill="none" stroke="${p.paper}" stroke-opacity=".07" stroke-width="${n(g*.035)}"/></pattern>`;
}
function floor(s,p,view){const b=s.battle,g=s.gridSize,theme=s.options.theme,open=!!b.landscape||['forest','desert','bridge','tavern','dwelling','stronghold','mansion','castle'].includes(theme),cave=['cave','ice-cave'].includes(theme),base=b.landscape?p[b.landscape.ground]:open?(theme==='desert'?p.sand:p.grass):p.hill;
 let out=`<rect width="${s.width}" height="${s.height}" fill="${open?base:'#434943'}"/>`;
 if(view.textures!==false)out+=`<rect width="${s.width}" height="${s.height}" fill="url(#${open?'battle-ground':'battle-rock'})"/>`;
 const ground=cave?(theme==='ice-cave'?p.snow:p.hill):open?base:p.paper;
 if(['dwelling','tavern','stronghold','mansion','castle'].includes(theme)){
  const solid=b.cells.map((v,i)=>v?'':`M${n(i%b.cols*g)} ${n(Math.floor(i/b.cols)*g)}h${n(g)}v${n(g)}h-${n(g)}Z`).join('');
  if(solid)out+=`<path data-painted-solid="true" d="${solid}" fill="#434d47"/>`;
 }
 out+=`<g clip-path="url(#battle-floor-clip)"><path d="${floorPath(s)}" fill="${ground}"/>`;
 if(view.textures!==false)out+=`<path d="${floorPath(s)}" fill="url(#${open||cave?'battle-ground':'battle-stone'})"/>`;
 const colors={stone:p.paper,slate:p.hill,flagstone:p.sand,wood:p.roof[2],tile:p.paper,grass:p.grass};
 for(const surface of b.surfaces||[]){const mat=surface.material,poly=points(surface.polygon),texture=mat==='wood'?'battle-wood':mat==='tile'?'battle-tile':mat==='grass'?'battle-ground':'battle-stone';out+=`<polygon points="${poly}" fill="${colors[mat]||p.paper}"/>`;if(view.textures!==false)out+=`<polygon points="${poly}" fill="url(#${texture})"/>`;}
 for(const q of b.rooms){if(open&&['forest','desert','bridge'].includes(theme)||cave)break;out+=`<rect x="${n((q.x+.15)*g)}" y="${n((q.y+.15)*g)}" width="${n(Math.max(.1,q.w-.3)*g)}" height="${n(Math.max(.1,q.h-.3)*g)}" fill="none" stroke="${p.ink}" stroke-opacity=".08" stroke-width="${n(g*.035)}"/>`;}
 return out+'</g>';
}
function walls(s,p,segments){const g=s.gridSize,d=segments.map(l=>`M${points([l[0]])}L${points([l[1]])}`).join('');if(!d)return '';
 return `<g data-battle-walls="architectural" fill="none" stroke-linejoin="round" pointer-events="none"><path d="${d}" stroke="#17201c" stroke-opacity=".25" stroke-width="${n(g*.37)}" transform="translate(${n(g*.08)} ${n(g*.11)})"/><path d="${d}" stroke="${p.ink}" stroke-width="${n(g*.25)}"/><path d="${d}" stroke="${p.hill}" stroke-width="${n(g*.14)}"/><path d="${d}" stroke="${p.paper}" stroke-opacity=".3" stroke-width="${n(g*.025)}"/></g>`;
}
function door(f,s,p){const [a,b]=f.points,dx=b[0]-a[0],dy=b[1]-a[1],length=Math.hypot(dx,dy),angle=Math.atan2(dy,dx)*180/Math.PI,g=s.gridSize;
 const color=f.doorKind==='iron'?p.hill:p.roof[0];return `<g transform="translate(${n(a[0])} ${n(a[1])}) rotate(${n(angle)})"><path d="M0 0H${n(length)}" stroke="${p.ink}" stroke-width="${n(g*.16)}"/><path d="M0 0H${n(length)}" stroke="${color}" stroke-width="${n(g*.095)}"/><path d="M0 ${n(-g*.16)}V${n(g*.16)}M${n(length)} ${n(-g*.16)}V${n(g*.16)}" stroke="${p.ink}" stroke-width="${n(g*.065)}"/><path d="M${n(length)} 0A${n(length)} ${n(length)} 0 0 0 0 ${n(-length)}L0 0" fill="none" stroke="${p.ink}" stroke-width="${n(g*.02)}" stroke-opacity=".35" stroke-dasharray="${n(g*.07)} ${n(g*.05)}"/></g>`;
}
function prop(f,p){
 if(!f.battleProp)return null;
 const scale=f.size/(Math.max(f.propWidth,f.propHeight)*.55),w=f.propWidth*scale,h=f.propHeight*scale,ink=p.ink,wood=p.roof[0],dark=p.roof[1],paper=p.paper,cloth=p.water;
 const rect=(x,y,w,h,fill,rx=0)=>`<rect x="${n(x)}" y="${n(y)}" width="${n(w)}" height="${n(h)}" rx="${n(rx)}" fill="${fill}"/>`,ellipse=(x,y,rx,ry,fill)=>`<ellipse cx="${n(x)}" cy="${n(y)}" rx="${n(rx)}" ry="${n(ry)}" fill="${fill}"/>`,path=(d,fill='none')=>`<path d="${d}" fill="${fill}"/>`;
 let body='',shape='',radius=Math.min(w,h),stroke=Math.max(.35,radius*.035),id=f.asset;
 if(['bed','bunk-bed','bedroll'].includes(id)){
  body=rect(-w/2,-h/2,w,h,wood,w*.04)+rect(-w*.44,-h*.44,w*.88,h*.87,paper,w*.05)+rect(-w*.42,-h*.12,w*.84,h*.52,cloth,w*.04)+rect(-w*.32,-h*.37,w*.64,h*.2,p.snow,w*.05)+path(`M${n(-w*.42)} ${n(-h*.08)}H${n(w*.42)}M${n(-w*.36)} ${n(h*.1)}V${n(h*.3)}`);
  if(id==='bunk-bed')body+=path(`M${n(w*.31)} ${n(-h*.44)}V${n(h*.44)}M${n(w*.42)} ${n(-h*.44)}V${n(h*.44)}M${n(w*.31)} 0H${n(w*.42)}M${n(w*.31)} ${n(h*.17)}H${n(w*.42)}`);
 }else if(['table','long-table','desk','counter','bench','chair','throne'].includes(id)){
  body=rect(-w/2,-h/2,w,h,wood,radius*.05)+path(`M${n(-w*.43)} ${n(-h*.3)}H${n(w*.4)}M${n(-w*.4)} ${n(h*.28)}H${n(w*.43)}`);
  if(['chair','throne'].includes(id))body+=rect(-w*.5,-h*.5,w,h*.18,dark,radius*.03)+rect(-w*.5,-h*.3,w*.13,h*.7,dark)+rect(w*.37,-h*.3,w*.13,h*.7,dark);
  else if(['table','long-table'].includes(id))body+=ellipse(-w*.25,0,radius*.15,radius*.15,paper)+ellipse(w*.25,0,radius*.15,radius*.15,paper)+ellipse(0,-h*.14,radius*.08,radius*.08,p.sand);
  else if(id==='desk')body+=rect(-w*.22,-h*.32,w*.4,h*.46,paper)+path(`M${n(-w*.16)} ${n(-h*.21)}H${n(w*.13)}M${n(-w*.16)} ${n(-h*.1)}H${n(w*.13)}`);
 }else if(id==='round-table'){body=ellipse(0,0,w*.49,h*.49,wood)+ellipse(-w*.19,-h*.12,w*.13,h*.13,paper)+ellipse(w*.18,h*.14,w*.13,h*.13,paper);
 }else if(['crate','chest','treasure-pile','weapon-rack','bookshelf','timber-rack'].includes(id)){
  body=rect(-w/2,-h/2,w,h,wood,radius*.04);
  if(id==='crate')body+=path(`M${n(-w*.43)} ${n(-h*.43)}L${n(w*.43)} ${n(h*.43)}M${n(w*.43)} ${n(-h*.43)}L${n(-w*.43)} ${n(h*.43)}`);
  else if(id==='chest'||id==='treasure-pile')body+=path(`M${n(-w*.3)} ${n(-h*.48)}V${n(h*.48)}M${n(w*.3)} ${n(-h*.48)}V${n(h*.48)}M${n(-w*.5)} 0H${n(w*.5)}`)+rect(-w*.07,-h*.13,w*.14,h*.24,p.sand);
  else for(let i=0;i<7;i++){const x=-w*.42+i*w*.13;body+=rect(x,-h*.32,w*.075,h*.64,id==='weapon-rack'?p.hill:[p.water,p.sand,dark,p.hill][i%4]);}
 }else if(['barrel','well','brazier','campfire-ring','fire','stump','column','fountain','lantern'].includes(id)){
  body=ellipse(0,0,w*.48,h*.48,['well','fountain'].includes(id)?p.hill:id==='column'?p.paper:wood);
  if(['well','fountain'].includes(id))body+=ellipse(0,0,w*.33,h*.33,p.deep)+ellipse(0,0,w*.22,h*.22,p.water);
  else if(['brazier','campfire-ring','fire','lantern'].includes(id))body+=ellipse(0,0,w*.34,h*.34,ink)+path(`M${n(-w*.2)} ${n(h*.12)}Q${n(-w*.25)} ${n(-h*.08)} 0 ${n(-h*.3)}Q${n(w*.08)} ${n(-h*.02)} ${n(w*.23)} ${n(h*.07)}Q0 ${n(h*.29)} ${n(-w*.2)} ${n(h*.12)}Z`,'#cd9856');
  else if(id==='barrel')body+=ellipse(0,0,w*.36,h*.36,wood)+path(`M${n(-w*.3)} ${n(-h*.2)}H${n(w*.3)}M${n(-w*.3)} ${n(h*.2)}H${n(w*.3)}`);
  else body+=ellipse(0,0,w*.31,h*.31,id==='column'?p.snow:dark);
 }else if(['fireplace','stove','cauldron','anvil','altar','sarcophagus','statue','stairs','cage','animal-pen','rug'].includes(id)){
  body=rect(-w/2,-h/2,w,h,['rug'].includes(id)?cloth:['cage','animal-pen'].includes(id)?p.sand:p.hill,radius*.05);
  if(id==='stairs')for(let i=0;i<8;i++)body+=path(`M${n(-w*.47)} ${n(-h*.45+i*h*.12)}H${n(w*.47)}`);
  else if(['cage','animal-pen'].includes(id)){body+=rect(-w*.4,-h*.4,w*.8,h*.8,p.paper);for(let i=0;i<5;i++)body+=path(`M${n(-w*.4+i*w*.2)} ${n(-h*.4)}V${n(h*.4)}`);}
  else if(id==='stove'||id==='cauldron')body+=ellipse(-w*.18,0,w*.18,h*.24,ink)+ellipse(w*.22,-h*.12,w*.15,h*.18,ink);
  else if(id==='fireplace')body+=rect(-w*.37,-h*.19,w*.74,h*.6,ink)+path(`M${n(-w*.24)} ${n(h*.23)}L0 ${n(-h*.16)} ${n(w*.22)} ${n(h*.23)}Z`,'#cd9856');
  else if(id==='sarcophagus')body+=rect(-w*.38,-h*.44,w*.76,h*.88,p.paper,radius*.1)+ellipse(0,-h*.25,w*.13,h*.1,p.hill)+path(`M0 ${n(-h*.12)}V${n(h*.25)}M${n(-w*.19)} 0H${n(w*.19)}`);
  else if(id==='altar')body+=rect(-w*.43,-h*.4,w*.86,h*.8,p.paper)+rect(-w*.12,-h*.4,w*.24,h*.8,cloth)+ellipse(-w*.3,0,w*.04,w*.04,p.sand)+ellipse(w*.3,0,w*.04,w*.04,p.sand);
  else if(id==='rug')body+=rect(-w*.4,-h*.4,w*.8,h*.8,'none')+path(`M0 ${n(-h*.3)}L${n(w*.3)} 0 0 ${n(h*.3)} ${n(-w*.3)} 0Z`);
  else body+=ellipse(0,0,w*.3,h*.3,p.paper);
 }else if(['tree','oak','pine','bush','fern','palm'].includes(id)){
  const shade=p.forest;body=ellipse(0,0,w*.44,h*.46,shade);
  for(let i=0;i<7;i++){const t=i*Math.PI*2/7;body+=ellipse(Math.cos(t)*w*.24,Math.sin(t)*h*.24,w*.22,h*.22,i%3===0?p.grass:shade);}
  body+=ellipse(-w*.05,-h*.08,w*.24,h*.25,p.forest);
 }else if(['boulder','rock','rock-cluster','crystal','ice-shards','broken-column','dunes'].includes(id)){
  body=path(`M${n(-w*.47)} ${n(h*.06)}L${n(-w*.24)} ${n(-h*.4)} ${n(w*.2)} ${n(-h*.47)} ${n(w*.47)} ${n(-h*.12)} ${n(w*.35)} ${n(h*.38)} ${n(-w*.13)} ${n(h*.47)}Z`,['crystal','ice-shards'].includes(id)?p.water:p.hill)+path(`M${n(-w*.24)} ${n(-h*.4)}L${n(-w*.08)} ${n(-h*.05)} ${n(w*.2)} ${n(-h*.47)}M${n(-w*.08)} ${n(-h*.05)}L${n(w*.35)} ${n(h*.38)}`);
 }else if(['tent','camp','wagon','bridge','fallen-log'].includes(id)){
  body=rect(-w/2,-h/2,w,h,id==='tent'||id==='camp'?paper:wood,radius*.03);
  if(id==='tent'||id==='camp')body+=path(`M0 ${n(-h*.5)}V${n(h*.5)}M${n(-w*.5)} ${n(-h*.5)}L0 ${n(-h*.3)} ${n(w*.5)} ${n(-h*.5)}M${n(-w*.5)} ${n(h*.5)}L0 ${n(h*.3)} ${n(w*.5)} ${n(h*.5)}`);
  else if(id==='bridge'){for(let y=-h*.48;y<h*.5;y+=Math.max(2,w*.16))body+=path(`M${n(-w*.48)} ${n(y)}H${n(w*.48)}`);body+=rect(-w*.5,-h*.5,w*.09,h,dark)+rect(w*.41,-h*.5,w*.09,h,dark);}
  else body+=path(`M${n(-w*.35)} ${n(-h*.42)}V${n(h*.42)}M${n(w*.35)} ${n(-h*.42)}V${n(h*.42)}`);
 }else return null;
 shape=rect(-w*.5,-h*.5,w,h,'#14211b',radius*.08);
 return `<g transform="translate(${n(f.x)} ${n(f.y)}) rotate(${n(f.rotation||0)})" stroke="${ink}" stroke-width="${n(stroke)}" stroke-linejoin="round"><g opacity=".17" stroke="none" transform="translate(${n(radius*.08)} ${n(radius*.1)})">${shape}</g>${body}</g>`;
}
return {defs,floor,walls,door,prop};
});
