/* Original procedural city cartography, normal + HQ. GPL-3.0-only.
 * Detail is vector art, never a changed footprint or a network service.
 */
(function(root,factory){const city=typeof module==='object'&&module.exports?require('./city-studio.js'):root.MegamapCityStudio;const api=factory(city);if(typeof module==='object'&&module.exports)module.exports=api;else root.MegamapCityRender=api;})(typeof globalThis!=='undefined'?globalThis:this,function(C){
'use strict';
const num=v=>Number((Number.isFinite(Number(v))?Number(v):0).toFixed(3));
const pts=p=>p.map(q=>q.map(num).join(',')).join(' ');
const esc=v=>String(v??'').replace(/[&<>"']/g,c=>({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&apos;'}[c]));
const clamp=(x,a,b)=>Math.max(a,Math.min(b,x));
function color(a,b,t){const parts=s=>[1,3,5].map(i=>parseInt(s.slice(i,i+2),16));return '#'+parts(a).map((x,i)=>Math.round(x+(parts(b)[i]-x)*t).toString(16).padStart(2,'0')).join('');}
const MATERIALS=['tile','slate','shingle','thatch','turf','plaster','weathered'];
function roofColor(f,p){const code=C.hash(f.id),base=color(p.roof[clamp(Math.round(f.roof||0),0,4)],code%3===0?p.ink:p.paper,(code%7)*.018+(f.cityAge==='old'?.03:0));
 const t={slate:[p.mountain,.48],shingle:[p.roof[1],.4],thatch:[p.sand,.46],turf:[p.forest,.48],plaster:[p.paper,.38],weathered:[p.hill,.4],tile:[p.roof[1],.23]};
 const tint=t[f.cityMaterial];return tint?color(base,...tint):f.cityCulture==='nordic'?color(base,p.forest,.32):f.cityCulture==='desert'?color(base,p.sand,.4):base;
}
function materialDefs(p){const drawings={tile:'M0 0H6M0 3H6M1.5 0V3M4.5 3V6',slate:'M0 0H6M0 2H6M0 4H6M2 0V2M5 2V4M1 4V6',shingle:'M0 0H6M0 3H6M2 0V3M5 3V6M.8 .5V2.5M3.5 3.5V5.5',thatch:'M1 0l.5 3M3 1l.5 4M5 0l-.5 3M1 4l.5 2',turf:'M1 2l1-1 1 1M4 5l1-1 1 1',plaster:'M1 2h.3M4 4h.3',weathered:'M0 0H6M0 3H6M2 .5V2M5 4V6M3 3l1 1'};
 return MATERIALS.map(key=>`<pattern id="city-mat-${key}" width="6" height="6" patternUnits="userSpaceOnUse"><path d="${drawings[key]}" fill="none" stroke="${key==='turf'?p.forest:p.ink}" stroke-width=".23" opacity=".24"/></pattern>`).join('');
}
function hidden(f,s,v){if(!s.cityStudio)return false;return f.cityRole==='roof-route'&&(v.cityLevel!=='rooftops'||!s.options.rooftops)||f.cityRole==='tunnel'&&(v.cityLevel!=='underground'||!s.options.underground);}
function defs(s,p,v){if(!s.cityStudio)return '';return materialDefs(p)+`<pattern id="city-roof-lines" width="3" height="3" patternUnits="userSpaceOnUse"><path d="M0 0H3M1.5 0V1.5M0 1.5H3M0 1.5V3" fill="none" stroke="${p.ink}" stroke-width=".18" opacity=".25"/></pattern><pattern id="city-paving" width="8" height="6" patternUnits="userSpaceOnUse"><path d="M0 0H8V6H0ZM0 3H8M4 0V3M2 3V6" fill="none" stroke="${p.ink}" stroke-width=".25" opacity=".15"/></pattern><pattern id="city-ripple" width="31" height="19" patternUnits="userSpaceOnUse"><path d="M2 4q4-2 8 0m8 8q5-2 10 0" fill="none" stroke="${p.paper}" stroke-width=".7" opacity=".32"/></pattern><pattern id="city-ground-grain" width="43" height="37" patternUnits="userSpaceOnUse"><path d="M2 4l2-1m18 12l3 1m10-10l1 2m-25 19l2-1m18 5l3-1" stroke="${p.ink}" stroke-width=".5" opacity=".10"/></pattern><radialGradient id="city-crater"><stop stop-color="${p.ink}"/><stop offset=".65" stop-color="${p.mountain}"/><stop offset="1" stop-color="${p.hill}"/></radialGradient><radialGradient id="city-canopy" cx="35%" cy="30%"><stop stop-color="${color(p.forest,p.paper,.25)}"/><stop offset="1" stop-color="${color(p.forest,p.ink,.2)}"/></radialGradient>`;}
function terrain(s,p,v,contours){if(!s.cityStudio)return '';const st=s.cityStudio,g=st.ground,hq=v.hq===true;let out=`<g data-city-ground="${hq?'hq':'standard'}" pointer-events="none"><rect width="1000" height="1000" fill="${p.land}"/>`;
 const elevations=g.relief>0?[.14,.22,.30,.38,.46,.54,.62,.70,.78]:[];for(let i=0;i<elevations.length;i++){const loops=contours(g.heights,g.n,elevations[i],1000,1000),path=loops.map(l=>'M'+pts(l)+'Z').join('');if(!path)continue;out+=`<path d="${path}" fill="${color(p.land,p.hill,(i+1)*.055)}" fill-rule="evenodd"${(v.contours||g.relief>90)?` stroke="${p.ink}" stroke-opacity="${hq?.16:.10}" stroke-width=".55"`:''}/>`;}
 if(hq&&g.relief>35){let strokes='';for(let y=70;y<940;y+=25)for(let x=70;x<940;x+=25){const z=C.heightAt(g,[x,y]),dx=C.heightAt(g,[x+8,y])-z,dy=C.heightAt(g,[x,y+8])-z,length=Math.hypot(dx,dy);if(length>.7&&!C.waterAt(g,[x,y],15))strokes+=`M${x},${y}l${num(dx/length*4)},${num(dy/length*4)}`;}out+=`<path d="${strokes}" fill="none" stroke="${p.ink}" stroke-opacity=".075" stroke-width=".6"/>`;}
 if(hq)out+='<rect width="1000" height="1000" fill="url(#city-ground-grain)"/>';
 return out+'</g>';
}
function roadUnderlay(s,p,v,hide){if(!s.cityStudio)return '';let out='<g data-city-road-bed="true" fill="none" stroke-linecap="round" stroke-linejoin="round" pointer-events="none">';for(const f of s.features)if(f.type==='road'&&!hide(f)&&!['roof-route','tunnel','pier','bridge'].includes(f.cityRole)){out+=`<polyline points="${pts(f.points)}" stroke="${color(p.ink,p.land,.63)}" stroke-width="${num(f.width+.8)}" opacity=".7"/>`;}return out+'</g>';}
function frame(poly){let a=poly[0],b=poly[1];for(let i=0;i<poly.length;i++)if(C.distance(poly[i],poly[(i+1)%poly.length])>C.distance(a,b)){a=poly[i];b=poly[(i+1)%poly.length];}const angle=Math.atan2(b[1]-a[1],b[0]-a[0]),cs=Math.cos(angle),sn=Math.sin(angle),center=C.center(poly),local=poly.map(p=>[(p[0]-center[0])*cs+(p[1]-center[1])*sn,-(p[0]-center[0])*sn+(p[1]-center[1])*cs]),bb=C.bounds(local);return{center,angle:angle*180/Math.PI,bb};}
/** Rectilinear concave roofs are decomposed in their own edge frame, using
 * current vertices instead of stale cached artwork after an editor transform. */
function roofWings(poly){const f=frame(poly),ang=f.angle*Math.PI/180,cs=Math.cos(ang),sn=Math.sin(ang),local=poly.map(p=>[(p[0]-f.center[0])*cs+(p[1]-f.center[1])*sn,-(p[0]-f.center[0])*sn+(p[1]-f.center[1])*cs]);
 const unique=a=>[...new Set(a.map(x=>Math.round(x*1000)/1000))].sort((a,b)=>a-b),xs=unique(local.map(p=>p[0])),ys=unique(local.map(p=>p[1]));if(xs.length>8||ys.length>8)return[];
 const map=p=>[f.center[0]+p[0]*cs-p[1]*sn,f.center[1]+p[0]*sn+p[1]*cs],out=[];
 for(let y=1;y<ys.length;y++){let begin=null;for(let x=1;x<=xs.length;x++){const yes=x<xs.length&&C.inside([(xs[x-1]+xs[x])/2,(ys[y-1]+ys[y])/2],local);if(yes&&begin===null)begin=xs[x-1];if(!yes&&begin!==null){out.push([[begin,ys[y-1]],[xs[x-1],ys[y-1]],[xs[x-1],ys[y]],[begin,ys[y]]].map(map));begin=null;}}}return out;
}
function building(f,s,p,v){const poly=f.polygon; if(poly.length>4&&!f.cityWing){const parts=roofWings(poly);if(parts.length>1)return parts.map((polygon,i)=>building({...f,id:f.id+'-wing'+i,polygon,cityWing:true,cityFront:null},s,p,v)).join('')+`<polygon points="${pts(poly)}" fill="none" stroke="${p.ink}" stroke-width=".45"/>`;}const hq=v.hq===true,code=C.hash(f.id),roof=roofColor(f,p),stroke=hq?.42:.55,shadow=clamp((f.cityFloors||1)*.45,.5,2.2),id='city-roof-'+C.hash(f.id);let out='';
 if(hq)out+=`<polygon points="${pts(poly)}" transform="translate(${num(shadow)} ${num(shadow*1.25)})" fill="${p.ink}" opacity=".19"/>`;
 out+=`<polygon points="${pts(poly)}" fill="${roof}" stroke="${p.ink}" stroke-width="${stroke}" stroke-opacity=".85"/>`;
 if(v.textures!==false){const {center,angle,bb}=frame(poly),w=bb.x1-bb.x0,h=bb.y1-bb.y0,mx=(bb.x0+bb.x1)/2,my=(bb.y0+bb.y1)/2;out+=`<clipPath id="${id}"><polygon points="${pts(poly)}"/></clipPath><g clip-path="url(#${id})" pointer-events="none"><g transform="translate(${num(center[0])} ${num(center[1])}) rotate(${num(angle)})">`;
 if(f.cityRoof==='flat'){out+=`<rect x="${num(bb.x0+1)}" y="${num(bb.y0+1)}" width="${num(Math.max(0,w-2))}" height="${num(Math.max(0,h-2))}" fill="${color(roof,p.paper,.20)}" stroke="${p.ink}" stroke-opacity=".35" stroke-width=".45"/>`;if(hq)out+=`<rect x="${num(bb.x0)}" y="${num(bb.y0)}" width="${num(w)}" height="${num(h)}" fill="url(#city-paving)"/>`;}
 else{out+=`<path d="M${num(bb.x0)} ${num(bb.y0)}H${num(bb.x1)}V${num(my)}H${num(bb.x0)}Z" fill="${color(roof,p.paper,.22)}"/><path d="M${num(bb.x0)} ${num(my)}H${num(bb.x1)}V${num(bb.y1)}H${num(bb.x0)}Z" fill="${color(roof,p.ink,.15)}"/>`;
 const inset=f.cityRoof==='hip'?Math.min(h*.43,w*.22):0;out+=`<path d="M${num(bb.x0+inset)} ${num(my)}H${num(bb.x1-inset)}${inset?`M${num(bb.x0)} ${num(bb.y0)}L${num(bb.x0+inset)} ${num(my)}L${num(bb.x0)} ${num(bb.y1)}M${num(bb.x1)} ${num(bb.y0)}L${num(bb.x1-inset)} ${num(my)}L${num(bb.x1)} ${num(bb.y1)}`:''}" fill="none" stroke="${p.ink}" stroke-width=".42" opacity=".7"/>`;
 if(hq)out+=`<rect x="${num(bb.x0)}" y="${num(bb.y0)}" width="${num(w)}" height="${num(h)}" fill="url(#${MATERIALS.includes(f.cityMaterial)?'city-mat-'+f.cityMaterial:'city-roof-lines'})"/>`;
 if(f.cityRoof==='longhouse')out+=`<path d="M${num(bb.x0)} ${num(my)}h${num(w)}" stroke="${color(p.roof[1],p.ink,.3)}" stroke-width=".9"/>`;
 }
 if(hq&&w>9&&h>5&&f.cityCulture!=='desert')out+=`<rect x="${num(bb.x0+w*.72)}" y="${num(bb.y0+h*.27)}" width="${num(Math.min(1.4,w*.09))}" height="${num(Math.min(1.8,h*.19))}" fill="${p.paper}" stroke="${p.ink}" stroke-width=".3"/>`;
 if(f.cityHousingVersion===1){
  const x=bb.x0+w*.12,y=bb.y0+h*.12;
  out+=`<g data-housing-detail="${esc(f.cityHousingDetail)}" data-housing-wealth="${esc(f.cityWealth)}" data-housing-climate="${esc(f.cityClimate)}">`;
  if(f.cityHousingDetail==='patched')out+=`<path d="M${num(x)} ${num(y)}h${num(w*.23)}v${num(h*.24)}h${num(-w*.23)}Z" fill="${color(roof,p.sand,.34)}" stroke="${p.ink}" stroke-width=".25" opacity=".85"/>`;
  if(f.cityHousingDetail==='shade'||f.cityHousingDetail==='veranda'){
   out+=`<rect x="${num(bb.x0+w*.08)}" y="${num(bb.y0+h*.73)}" width="${num(w*.84)}" height="${num(h*.19)}" fill="${color(p.sand,p.paper,.3)}" stroke="${p.ink}" stroke-width=".4"/>`;
   if(hq)for(let i=1;i<6;i++)out+=`<path d="M${num(bb.x0+w*(.08+.14*i))} ${num(bb.y0+h*.73)}v${num(h*.19)}" stroke="${p.roof[1]}" stroke-width=".55"/>`;
  }
  if(f.cityHousingDetail==='dormer'||f.cityHousingDetail==='formal'){
   for(const t of [.3,.7])out+=`<path d="M${num(bb.x0+w*t-w*.07)} ${num(bb.y0+h*.17)}l${num(w*.07)} ${num(-h*.09)}l${num(w*.07)} ${num(h*.09)}v${num(h*.16)}h${num(-w*.14)}Z" fill="${color(roof,p.paper,.15)}" stroke="${p.ink}" stroke-width=".4"/>`;
  }
  if(f.cityClimate==='cold')out+=`<rect x="${num(bb.x0+w*.65)}" y="${num(bb.y0+h*.34)}" width="${num(w*.095)}" height="${num(h*.18)}" fill="${p.hill}" stroke="${p.ink}" stroke-width=".55"/>`;
  out+='</g>';
 }
 out+='</g></g>';}
 if(hq&&Number.isInteger(f.cityFront)){const i=clamp(f.cityFront,0,poly.length-1),a=poly[i],b=poly[(i+1)%poly.length],mid=[(a[0]+b[0])/2,(a[1]+b[1])/2],len=C.distance(a,b),dx=(b[0]-a[0])/(len||1),dy=(b[1]-a[1])/(len||1),size=Math.min(1,len*.17);out+=`<path d="M${num(mid[0]-dx*size)} ${num(mid[1]-dy*size)}l${num(dx*size*2)} ${num(dy*size*2)}" stroke="${p.ink}" stroke-width="1"/>`;}
 return out;
}
function ship(f,p,hq){const l=f.size*2,b=l*clamp(Number(f.cityBeam)||.25,.15,.5),war=f.cityShip==='warship',long=f.cityShip==='longship',small=f.cityShip==='skiff',a=l/2,w=b/2;let art=`<path d="M${-a} 0Q${num(-a*.55)} ${num(-w)} ${num(a*.55)} ${num(-w)}L${a} 0Q${num(a*.55)} ${num(w)} ${num(-a*.55)} ${num(w)}Z" fill="${p.roof[1]}" stroke="${p.ink}" stroke-width="${num(l*.013)}"/>`;
 art+=`<path d="M${num(-a*.77)} 0Q${num(-a*.3)} ${num(-w*.65)} ${num(a*.7)} ${num(-w*.45)}L${num(a*.87)} 0Q${num(a*.2)} ${num(w*.62)} ${num(-a*.77)} 0Z" fill="${p.sand}" stroke="${p.ink}" stroke-width="${num(l*.006)}"/>`;
 if(hq){let lines='';for(let x=-a*.55;x<a*.66;x+=l*.07)lines+=`M${num(x)} ${num(-w*.64)}v${num(w*1.28)}`;art+=`<path d="${lines}" stroke="${p.ink}" stroke-width="${num(l*.004)}" opacity=".38"/>`;}
 if(!small){for(const x of(war?[-a*.25,a*.3]:[a*.1]))art+=`<path d="M${num(x)} ${num(-w*.86)}V${num(w*.86)}" stroke="${p.ink}" stroke-width="${num(l*.025)}"/><path d="M${num(x)} ${num(-w*.8)}Q${num(x+l*.09)} 0 ${num(x)} ${num(w*.8)}L${num(x-l*.075)} ${num(w*.55)}V${num(-w*.55)}Z" fill="${p.paper}" stroke="${p.ink}" stroke-width="${num(l*.007)}"/>`;
 if(war)art+=`<rect x="${num(-a*.7)}" y="${num(-w*.48)}" width="${num(l*.13)}" height="${num(w*.96)}" fill="${p.roof[0]}" stroke="${p.ink}" stroke-width="${num(l*.006)}"/>`;
 if(long){let oars='';for(let x=-a*.5;x<a*.6;x+=l*.10)oars+=`M${num(x)} ${num(-w*.5)}l${num(-l*.025)} ${num(-w*.85)}M${num(x)} ${num(w*.5)}l${num(-l*.025)} ${num(w*.85)}`;art+=`<path d="${oars}" stroke="${p.roof[1]}" stroke-width="${num(l*.009)}"/>`;}}
 else art+=`<path d="M${num(-a*.28)} ${num(-w*.7)}V${num(w*.7)}M${num(a*.24)} ${num(-w*.7)}V${num(w*.7)}" stroke="${p.roof[0]}" stroke-width="${num(l*.045)}"/>`;
 return `<g transform="translate(${num(f.x)} ${num(f.y)}) rotate(${num(f.rotation||0)})">${hq?`<path d="M${-a-2} ${num(w+1)}Q0 ${num(w+4)} ${a} ${num(w+1)}" fill="none" stroke="${p.paper}" stroke-opacity=".65" stroke-width=".55"/>`:''}${art}</g>`;
}
function symbol(f,p,v){const hq=v.hq===true,size=f.size||8,type=f.citySymbol,scale=size/20,local=body=>`<g transform="translate(${num(f.x)} ${num(f.y)}) rotate(${num(f.rotation||0)}) scale(${num(scale)})" stroke="${p.ink}" stroke-width=".7">${body}</g>`;
 if(type==='ship')return ship(f,p,hq);
 if(['tree','great-tree'].includes(type)){const r=C.rng(f.id+'canopy');let art=hq?'<ellipse cx="4" cy="5" rx="20" ry="18" fill="'+p.ink+'" opacity=".14" stroke="none"/>':'';for(let i=0;i<9;i++){const a=i*Math.PI*2/9,cx=Math.cos(a)*(7+r()*4),cy=Math.sin(a)*(7+r()*4);art+=`<circle cx="${num(cx)}" cy="${num(cy)}" r="${num(7+r()*4)}" fill="${hq?'url(#city-canopy)':p.forest}" stroke="${p.ink}" stroke-opacity=".3"/>`;}art+=`<circle r="9" fill="${hq?'url(#city-canopy)':p.forest}" stroke-opacity=".15"/>`;if(type==='great-tree')art+=`<path d="M-8 4Q0-9 9 3M1-7L-4-13M1-7L11-10M0 2V12" fill="none" stroke="${p.roof[1]}" stroke-width="2" opacity=".6"/>`;return local(art);}
 if(type==='pine')return local(`<path d="M0-22L5-11L11-14L10-5L19-5L13 3L19 12L8 10L5 20L0 13L-10 19L-10 8L-20 10L-13 0L-19-8L-7-8Z" fill="${hq?'url(#city-canopy)':p.forest}"/><path d="M0-15V12M0-8L7-5M0 0L-7 3" fill="none" stroke-opacity=".28"/>`);
 if(type==='palm'){let leaves='';for(let i=0;i<7;i++)leaves+=`<path d="M0 0Q-5-12 0-22Q8-13 0 0Z" transform="rotate(${i*360/7})" fill="${p.forest}"/>`;return local(leaves+`<circle r="3" fill="${p.roof[1]}"/>`);}
 if(type==='fountain')return local(`<circle r="20" fill="${p.paper}"/><circle r="15" fill="${p.water}"/><circle r="5" fill="${p.hill}"/><path d="M0 0Q-16-9-10 8M0 0Q16-9 10 8M0 0Q9 16-8 10" fill="none" stroke="${p.paper}" stroke-width="1.1"/>`);
 if(type==='statue')return local(`<rect x="-15" y="-15" width="30" height="30" fill="${p.paper}"/><path d="M-7 8L-3-10L5-12L10 7Z" fill="${p.hill}"/><path d="M-3-10L2 6L10 7" fill="none" stroke-width="1.5"/>`);
 if(type==='colossus')return local(`<path d="M-12-17L-4-23L2-12L-1-5L14 4L11 13L1 10L-7 21L-13 17L-7 4L-14-4L-20-1L-22-8Z" fill="${p.hill}"/><path d="M-14-4L-4-2L-1-5M-7 4L2 3L1 10M-4-16L-11-12M4 7L9 8" fill="none" stroke-width=".9"/><circle cx="6" cy="-16" r="6" fill="${p.mountain}"/><path d="M-18 15l-4 4m35-32l4-3" opacity=".7"/>`);
 if(type==='crystal')return local(`<path d="M-9 17L-16-5L-9-20L1-8L-1 17ZM0 16L4-9L12-20L18 3L10 20Z" fill="${p.water}"/><path d="M-9-20L-6-4L-9 17M12-20L10 1L10 20M10 1L18 3" fill="none"/>`);
 if(type==='wall-tower')return local(`<rect x="-17" y="-17" width="34" height="34" fill="${p.hill}" stroke-width="3"/><rect x="-10" y="-10" width="20" height="20" fill="${p.paper}"/><path d="M-20-10h6m-6 10h6m-6 10h6m34-20h-6m6 10h-6m6 10h-6M-10-20v6m10-6v6m10-6v6m-20 34v-6m10 6v-6m10 6v-6" stroke-width="3"/>`);
 return null;
}
function feature(f,s,p,v){if(!s.cityStudio)return null;const hq=v.hq===true,poly=f.polygon?pts(f.polygon):'',line=f.points?pts(f.points):'';
 if(f.type==='building')return building(f,s,p,v);
 if(f.citySymbol)return symbol(f,p,v);
 if(f.type==='water'&&f.cityPaintBand)return `<polygon points="${poly}" fill="${f.cityWaterKind==='sea'?color(p.water,p.deep,.75):p.water}" stroke="none"/>${hq?`<polygon points="${poly}" fill="url(#city-ripple)"/>`:''}`;
 if(f.cityRole==='paint-open')return `<polygon points="${poly}" fill="${f.citySurface==='garden'?p.grass:p.sand}" stroke="none"/>${hq&&f.citySurface==='paving'?`<polygon points="${poly}" fill="url(#city-paving)"/>`:''}`;
 if(f.type==='water')return `<polygon points="${poly}" fill="${p.water}" stroke="${p.deep}" stroke-width="1.8"/>${hq?`<polygon points="${poly}" fill="url(#city-ripple)"/>`:''}`;
 if(f.type==='river')return `<polyline points="${line}" fill="none" stroke="${p.deep}" stroke-width="${num(f.width+2)}"/><polyline points="${line}" fill="none" stroke="${p.water}" stroke-width="${num(f.width)}"/>${hq?`<polyline points="${line}" fill="none" stroke="url(#city-ripple)" stroke-width="${num(f.width-2)}"/>`:''}`;
 if(f.cityRole==='crater')return `<polygon points="${poly}" fill="url(#city-crater)" stroke="${p.hill}" stroke-width="6"/><polygon points="${poly}" fill="none" stroke="${p.ink}" stroke-width=".9" stroke-dasharray="2 5" opacity=".5"/>`;
 if(f.cityRole==='yard'||f.cityRole==='court'){
 const garden=f.cityRole==='yard',id='city-court-'+C.hash(f.id),frameData=frame(f.polygon),b=frameData.bb,w=b.x1-b.x0,h=b.y1-b.y0;
 let out=`<polygon points="${poly}" fill="${garden?color(p.grass,p.paper,.12):p.sand}" stroke="${p.ink}" stroke-opacity=".35" stroke-width=".5"/>`;
 if(hq){out+=`<clipPath id="${id}"><polygon points="${poly}"/></clipPath><g clip-path="url(#${id})"><g transform="translate(${pts([frameData.center])}) rotate(${num(frameData.angle)})">`;
 if(garden&&w>4&&h>3){const inset=Math.min(1.7,h*.15);out+=`<rect x="${num(b.x0+inset)}" y="${num(b.y0+inset)}" width="${num(w-2*inset)}" height="${num(h-2*inset)}" fill="none" stroke="${p.forest}" stroke-width=".7"/><path d="M${num(b.x0)} 0H${num(b.x1)}M0 ${num(b.y0)}V${num(b.y1)}" stroke="${p.sand}" stroke-width="1.2"/>`;}
 else out+=`<rect x="${num(b.x0)}" y="${num(b.y0)}" width="${num(w)}" height="${num(h)}" fill="url(#city-paving)"/>`;
 out+='</g></g>';}
 return out;
 }
 if(f.cityRole==='ruin')return `<polygon points="${poly}" fill="${p.hill}" fill-opacity=".25" stroke="${p.hill}" stroke-width="2.5" stroke-dasharray="6 3 10 5"/><polygon points="${poly}" fill="url(#city-ground-grain)" stroke="${p.ink}" stroke-width=".5" stroke-dasharray="6 3 10 5"/>`;
 if(f.cityRole==='special-ground')return `<polygon points="${poly}" fill="${f.citySurface==='garden'?p.grass:p.sand}" stroke="${p.ink}" stroke-opacity=".3" stroke-width=".7"/>${hq?`<polygon points="${poly}" fill="url(#city-paving)"/>`:''}`;
 if(f.type==='plaza')return `<polygon points="${poly}" fill="${p.sand}" stroke="${p.ink}" stroke-opacity=".28" stroke-width=".7"/>${hq?`<polygon points="${poly}" fill="url(#city-paving)"/>`:''}`;
 if(f.type==='wall'&&f.cityRole==='retaining')return `<polyline points="${line}" fill="none" stroke="${p.ink}" stroke-opacity=".5" stroke-width="${num(f.width+1)}"/><polyline points="${line}" fill="none" stroke="${p.paper}" stroke-width="${num(f.width)}" stroke-dasharray="2 1"/>`;
 if(f.type==='wall'&&f.cityRole==='old-wall')return `<polyline points="${line}" fill="none" stroke="${p.ink}" stroke-opacity=".6" stroke-width="${num(f.width+1)}" stroke-dasharray="8 3 5 2"/><polyline points="${line}" fill="none" stroke="${p.hill}" stroke-width="${num(f.width)}" stroke-dasharray="8 3 5 2"/>`;
 if(f.type==='road'){
 if(f.cityRole==='roof-route'||f.cityRole==='tunnel')return `<polyline points="${line}" fill="none" stroke="${f.cityRole==='tunnel'?p.deep:p.ink}" stroke-width="${num(f.width+1.3)}" stroke-dasharray="4 3"/><circle cx="${num(f.points[0][0])}" cy="${num(f.points[0][1])}" r="2" fill="${p.paper}" stroke="${p.ink}" stroke-width=".6"/>`;
 if(f.cityDeck){let art=`<polyline points="${line}" fill="none" stroke="${p.ink}" stroke-width="${num(f.width+1.6)}"/><polyline points="${line}" fill="none" stroke="${f.cityRole==='bridge'?p.paper:p.roof[0]}" stroke-width="${num(f.width)}"/>`;if(hq)art+=`<polyline points="${line}" fill="none" stroke="${p.ink}" stroke-opacity=".27" stroke-width="${num(f.width)}" stroke-dasharray=".5 3"/>`;return art;}
 let art=`<polyline points="${line}" fill="none" stroke="${f.cityRole==='access'?color(p.road,p.land,.3):p.road}" stroke-width="${num(f.width)}"/>`;
 if(hq&&f.cityRole==='avenue')art+=`<polyline points="${line}" fill="none" stroke="url(#city-paving)" stroke-width="${num(f.width*.88)}"/>`;
 const steep=f.points.some((a,i)=>i&&Math.abs(C.heightAt(s.cityStudio.ground,a)-C.heightAt(s.cityStudio.ground,f.points[i-1]))/(C.distance(a,f.points[i-1])*s.scale)>.13);if(steep&&f.width<6)art+=`<polyline points="${line}" fill="none" stroke="${p.ink}" stroke-opacity=".33" stroke-width="${num(f.width)}" stroke-dasharray=".55 2.5"/>`;return art;
 }
 return null;
}
return{MATERIALS,roofColor,color,hidden,defs,terrain,roadUnderlay,feature,frame,roofWings,building,num,pts};
});
