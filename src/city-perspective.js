/* City Studio 2.5D: offline axonometric presentation of the SAME stored map.
 * GPL-3.0-only. Footprints are extruded, roofs are pitched, and streets follow
 * sampled terrain. No regeneration, WebGL, external renderer or input mutation.
 * Painter ordering is schematic, not a general-purpose 3D visibility solver.
 */
(function(root,factory){const node=typeof module==='object'&&module.exports;
 const api=factory(node?require('./city-studio.js'):root.MegamapCityStudio,node?require('./city-render.js'):root.MegamapCityRender,node?require('./assets.js'):root.MegamapAssets,node?require('./editor-core.js'):root.MegamapCore,node?require('./render.js'):root.MegamapRender);
 if(node)module.exports=api;else root.MegamapCityPerspective=api;
})(typeof globalThis!=='undefined'?globalThis:this,function(C,CR,A,Core,R){
'use strict';
const n=CR.num,pts=CR.pts,esc=R.esc,clamp=(x,a,b)=>Math.max(a,Math.min(b,x));
const lerp=(a,b,t)=>a.map((v,i)=>v+(b[i]-v)*t);
function camera(bearing=0){bearing=Number.isFinite(bearing)?((bearing%360)+360)%360:0;const a=(45+bearing)*Math.PI/180,cs=Math.cos(a),sn=Math.sin(a),tilt=.62,lift=.80;
 return{bearing,depth:p=>(p[0]-500)*sn+(p[1]-500)*cs,
  project:(p,z=0)=>[(p[0]-500)*cs-(p[1]-500)*sn,((p[0]-500)*sn+(p[1]-500)*cs)*tilt-z*lift],
  matrix:z=>`${n(cs)} ${n(sn*tilt)} ${n(-sn)} ${n(cs*tilt)} ${n(500*(sn-cs))} ${n(-500*(sn+cs)*tilt-z*lift)}`,
  facing:(a,b,sign=1)=>((b[1]-a[1])*sn-(b[0]-a[0])*cs)*sign>0};
}
function layer(f){return ['road','wall','portal'].includes(f.type)?'roads':['area','paint'].includes(f.type)?'terrain':['river','water'].includes(f.type)?'water':f.type==='building'?'buildings':f.type==='district'?'districts':f.type==='decoration'?'vegetation':['label','room'].includes(f.type)?'labels':'assets';}
function elevation(s,p){return C.heightAt(s.cityStudio.ground,p)/s.scale;}
function buildingHeight(f,s){return clamp(Number(f.cityFloors)||1,1,12)*3.1/s.scale;}
function clipMap(poly){let out=poly;for(const [axis,bound,direction]of [[0,0,1],[0,1000,-1],[1,0,1],[1,1000,-1]]){const next=[];for(let i=0;i<out.length;i++){const a=out[i],b=out[(i+1)%out.length],da=(a[axis]-bound)*direction,db=(b[axis]-bound)*direction;if(da>=0)next.push(a);if((da>=0)!==(db>=0))next.push(lerp(a,b,da/(da-db)));}out=next;}return out;}
function render(s,view={},bearing=0){
 if(!s?.cityStudio)throw Error('2.5D preview requires a City Studio map.');
 const v={...Core.appearance(s),...view},p=R.palettes[v.palette]||R.palettes.atlas,cam=camera(bearing),g=s.cityStudio.ground,hq=v.hq===true,layers={...Core.DEFAULT_LAYERS,...v.layers};
 const visible=f=>!f.hidden&&!(v.player&&f.gmOnly)&&layers[layer(f)]!==false&&!CR.hidden(f,s,v);
 const fs=s.features.filter(visible),extent={x0:Infinity,y0:Infinity,x1:-Infinity,y1:-Infinity},ground=[],surface=[],objects=[],labels=[];
 const include=q=>{extent.x0=Math.min(extent.x0,q[0]);extent.x1=Math.max(extent.x1,q[0]);extent.y0=Math.min(extent.y0,q[1]);extent.y1=Math.max(extent.y1,q[1]);return q;};
 const project=(p,z=0)=>include(cam.project(p,z));
 const poly=(ps,fill,attrs='',stroke=p.ink,sw=.45)=>`<polygon points="${pts(ps)}" fill="${fill}" stroke="${stroke}" stroke-width="${sw}" stroke-linejoin="round" ${attrs}/>`;
 const line=(ps,color,width=1,attrs='')=>`<polyline points="${pts(ps)}" fill="none" stroke="${color}" stroke-width="${n(width)}" stroke-linecap="round" stroke-linejoin="round" ${attrs}/>`;
 const surfacePoly=(ps,fill,attrs='',z=null)=>poly(ps.map(q=>project(q,z===null?elevation(s,q):z)),fill,attrs,fill,.28);
 const matrixArt=(art,z,anchor,size=0)=>{project(anchor,z);if(size)for(const q of C.rect(anchor,size*2,size*2))project(q,z);return `<g transform="matrix(${cam.matrix(z)})">${art}</g>`;};
 const signOf=ps=>Math.sign(ps.reduce((sum,a,i)=>{const b=ps[(i+1)%ps.length];return sum+a[0]*b[1]-b[0]*a[1];},0))||1;
 // Terrain is deliberately bounded to a 40 x 40 display mesh. The authoritative
 // 64 x 64 field and editable plan are untouched. No unseen districts are drawn.
 if(layers.terrain!==false){const count=hq?40:28,step=1000/count;
  for(let y=0;y<count;y++)for(let x=0;x<count;x++){
   const corners=[[x*step,y*step],[(x+1)*step,y*step],[(x+1)*step,(y+1)*step],[x*step,(y+1)*step]],mid=[(x+.5)*step,(y+.5)*step],z=C.heightAt(g,mid),t=g.relief?z/g.relief:0;
   const slope=C.heightAt(g,[mid[0]+8,mid[1]])-C.heightAt(g,[mid[0],mid[1]+8]);let fill=CR.color(p.land,p.hill,t*.32);
   if(hq)fill=CR.color(fill,slope>0?p.paper:p.ink,Math.min(.1,Math.abs(slope)*.012));
   ground.push({d:cam.depth(mid),art:poly(corners.map(q=>project(q,elevation(s,q))),fill,'data-terrain-face="true"',fill,1.1)});
  }
 }else for(const q of [[0,0],[1000,0],[1000,1000],[0,1000]])project(q,0);
 // Water and paths are surface geometry, not flattened screen-space strokes.
 for(const f of fs){let art='';
  if(f.type==='water'&&f.polygon)art=surfacePoly(clipMap(f.polygon),f.cityWaterKind==='sea'?CR.color(p.water,p.deep,.75):p.water,'data-surface-water="true"',0);
  else if(f.type==='river'&&f.points){for(let i=1;i<f.points.length;i++)art+=surfacePoly(clipMap(C.corridor(f.points[i-1],f.points[i],f.width)),p.water,'',0);}
  else if(f.type==='road'){
   const layerRoute=['roof-route','tunnel'].includes(f.cityRole);
   if(layerRoute){const z=f.cityRole==='roof-route'?Math.max(...f.points.map(q=>elevation(s,q)))+7/s.scale:null;art=line(f.points.map(q=>project(q,z??elevation(s,q)+.3)),p.deep,1.4,'stroke-dasharray="4 3"');}
   else{const samples=C.pathSamples(f.points,9);for(let i=1;i<samples.length;i++){
    const footprint=C.corridor(samples[i-1],samples[i],f.width),deck=!!f.cityDeck,z=deck?Math.max(elevation(s,f.points[0]),elevation(s,f.points.at(-1)),1/s.scale)+.8/s.scale:null;
    art+=surfacePoly(footprint,f.cityRole==='pier'?p.roof[0]:f.cityRole==='bridge'?p.paper:p.road,'',z);
    if(deck&&hq&&i%2===0)art+=line([project(footprint[0],z),project(footprint[3],z)],p.ink,.45,'opacity=".3"');
   }}
  }
  else if(f.polygon&&['area','plaza','district'].includes(f.type)){
   const fill=f.cityRole==='crater'?p.mountain:f.cityRole==='ruin'?p.hill:f.cityRole==='yard'||f.citySurface==='garden'?p.grass:f.type==='plaza'||f.cityRole==='court'?p.sand:f.type==='district'?p.district:(p[f.material]||p.grass);
   art=surfacePoly(f.polygon,fill,f.type==='district'?'opacity=".25"':'');
  }
  if(art)surface.push(`<g data-id="${esc(f.id)}">${art}</g>`);
 }
 function wallFaces(f,footprint,base,top,windows=false){const sign=signOf(footprint);let out='';
  for(let i=0;i<footprint.length;i++){
   const a=footprint[i],b=footprint[(i+1)%footprint.length];if(!cam.facing(a,b,sign))continue;
   const dx=b[0]-a[0],dy=b[1]-a[1],len=Math.hypot(dx,dy),shade=clamp(.12+((dx-dy)/(len||1))*.10,.03,.3),fill=CR.color(f.cityWealth==='modest'?(f.cityClimate==='hot-dry'?p.sand:p.roof[0]):f.cityWealth==='affluent'?p.paper:f.cityCulture==='nordic'||f.cityCulture==='woodland'?p.roof[0]:p.paper,p.ink,shade);
   out+=poly([project(a,elevation(s,a)),project(b,elevation(s,b)),project(b,top),project(a,top)],fill,'data-wall-face="true"',p.ink,hq?.42:.6);
   if(hq&&windows&&len*s.scale>4){
    const floors=clamp(Math.round(f.cityFloors||1),1,7),cols=clamp(Math.floor(len*s.scale/(f.cityWealth==='modest'?7:5)),1,6);
    for(let k=0;k<floors;k++)for(let j=0;j<cols;j++){
     const t=(j+.5)/cols,half=Math.min(.10,.6/(len*s.scale)),u=lerp(a,b,t-half),w=lerp(a,b,t+half),z=base+(k*3.1+1)/s.scale;
     out+=poly([project(u,z),project(w,z),project(w,z+(f.cityClimate==='cold'?.85:1.2)/s.scale),project(u,z+(f.cityClimate==='cold'?.85:1.2)/s.scale)],CR.color(p.ink,p.paper,.14),'data-window="true"',p.ink,.14);
    }
    if(Number.isInteger(f.cityFront)&&i===f.cityFront){const u=lerp(a,b,.5-.65/(len*s.scale)),w=lerp(a,b,.5+.65/(len*s.scale));out+=poly([project(u,base),project(w,base),project(w,base+2.2/s.scale),project(u,base+2.2/s.scale)],p.roof[1],'data-door="true"',p.ink,.3);}
   }
  }return out;
 }
 function roof(f,footprint,top){const fill=CR.roofColor(f,p);let out='';
  if(f.cityRoof==='flat'){
   out+=poly(footprint.map(q=>project(q,top)),CR.color(fill,p.paper,.16),'data-roof-face="flat"',p.ink,.5);
   if(hq)out+=line([...footprint,footprint[0]].map(q=>project(q,top+.5/s.scale)),p.paper,.8);return out;
  }
  const wings=footprint.length>4?CR.roofWings(footprint):[footprint];
  // Arbitrary hand-edited polygons have no guaranteed rectangular roof frame.
  // Keep their exact concavity as a flat cap instead of inventing outlying roofs.
  if(!wings.length)return poly(footprint.map(q=>project(q,top)),fill,'data-roof-face="custom"');
  for(const wing of wings){
   const fr=CR.frame(wing),bb=fr.bb,angle=fr.angle*Math.PI/180,cs=Math.cos(angle),sn=Math.sin(angle),w=bb.x1-bb.x0,d=bb.y1-bb.y0,world=(u,v)=>[fr.center[0]+u*cs-v*sn,fr.center[1]+u*sn+v*cs],a=world(bb.x0,bb.y0),b=world(bb.x1,bb.y0),c=world(bb.x1,bb.y1),e=world(bb.x0,bb.y1),hip=f.cityRoof==='hip'?Math.min(d*.4,w*.22):0,r0=world(bb.x0+hip,(bb.y0+bb.y1)/2),r1=world(bb.x1-hip,(bb.y0+bb.y1)/2),rise=Math.min(d*(Number.isFinite(f.cityPitch)?f.cityPitch:f.cityRoof==='longhouse'?.48:.36),5/s.scale);
   if(Math.abs(C.area(wing)-w*d)>.15){out+=poly(wing.map(q=>project(q,top)),fill,'data-roof-face="custom"');continue;}
   const faces=[{ps:[a,b,r1,r0],zs:[top,top,top+rise,top+rise],tone:.18},{ps:[e,c,r1,r0],zs:[top,top,top+rise,top+rise],tone:-.13},
    {ps:[a,e,r0],zs:[top,top,top+rise],tone:-.05},{ps:[b,c,r1],zs:[top,top,top+rise],tone:.08}];
   faces.sort((a,b)=>cam.depth(C.center(a.ps))-cam.depth(C.center(b.ps)));
   for(const face of faces){out+=poly(face.ps.map((q,i)=>project(q,face.zs[i])),CR.color(fill,face.tone>0?p.paper:p.ink,Math.abs(face.tone)),'data-roof-face="pitched"',p.ink,.35);
    if(hq&&v.textures!==false&&face.ps.length===4){const rows=clamp(Math.floor(d*s.scale/1.2),2,9);for(let k=1;k<rows;k++){const t=k/rows,u=lerp(face.ps[0],face.ps[3],t),w=lerp(face.ps[1],face.ps[2],t);out+=line([project(u,top+rise*t),project(w,top+rise*t)],p.ink,.22,'opacity=".24"');}}
   }
   if(hq)out+=line([project(r0,top+rise+.2),project(r1,top+rise+.2)],f.cityRoof==='longhouse'?p.roof[1]:p.paper,.6);
  }return out;
 }
 function raisedObject(f){const footprint=f.polygon,base=Math.max(...footprint.map(q=>elevation(s,q))),top=base+buildingHeight(f,s);let art='';
  if(hq){const shadow=footprint.map(q=>project([q[0]+buildingHeight(f,s)*.38,q[1]+buildingHeight(f,s)*.24],elevation(s,q)));art+=poly(shadow,p.ink,'opacity=".12"',p.ink,0);}
  art+=wallFaces(f,footprint,base,top,true)+roof(f,footprint,top);
  return{art,d:Math.max(...footprint.map(cam.depth)),z:top,center:C.center(footprint)};
 }
 function vessel(f){const a=(f.rotation||0)*Math.PI/180,cs=Math.cos(a),sn=Math.sin(a),l=f.size*2,w=l*(f.cityBeam||.25),map=(x,y)=>[f.x+x*cs-y*sn,f.y+x*sn+y*cs],polyWorld=[map(-l/2,0),map(-l*.3,-w*.45),map(l*.35,-w*.45),map(l/2,0),map(l*.35,w*.45),map(-l*.3,w*.45)],top=1/s.scale;
  let art=poly(polyWorld.map(q=>project(q,top)),p.roof[1],'data-vessel="true"',p.ink,.5);art+=line([project(map(-l*.32,0),top),project(map(l*.35,0),top)],p.sand,Math.max(1,w*.32));
  if(f.cityShip!=='skiff'){const height=(f.cityShip==='warship'?18:11)/s.scale;
   for(const x of(f.cityShip==='warship'?[-l*.18,l*.22]:[0])){const b=map(x,0),tip=project(b,top+height);art+=line([project(b,top),tip],p.ink,.8);
    const left=map(x,-w*.82),right=map(x,w*.82);art+=poly([project(left,top+height*.9),project(right,top+height*.9),project(right,top+height*.4),project(left,top+height*.3)],p.paper,'data-sail="true"',p.ink,.4);
   }
  }return art;
 }
 for(const f of fs){let item=null;const at=Core.center(f),z=elevation(s,at);
  if(f.type==='building'&&f.polygon)item=raisedObject(f);
  else if(f.cityRole==='vessel')item={art:vessel(f),d:cam.depth(at),center:at,z:15/s.scale};
  else if(f.type==='wall'&&f.points){let art='';const height=(f.cityRole==='retaining'?1.5:f.cityRole==='old-wall'?2.2:6)/s.scale;
   for(let i=1;i<f.points.length;i++){const ps=C.corridor(f.points[i-1],f.points[i],f.width),base=Math.max(...ps.map(q=>elevation(s,q))),top=base+height;art+=wallFaces(f,ps,base,top)+poly(ps.map(q=>project(q,top)),p.hill,'data-wall-top="true"',p.ink,.35);}
   item={art,d:Math.max(...f.points.map(cam.depth)),center:at,z:z+height};
  }
  else if(['asset','poi','decoration','image'].includes(f.type)){
   let art='';const tree=['tree','pine','palm','great-tree'].includes(f.citySymbol)||['tree','oak','pine','palm'].includes(f.asset),hint=A.byId[f.asset]?.heightM;
   const height=tree?(f.citySymbol==='great-tree'?48:8)/s.scale:f.citySymbol==='wall-tower'?10/s.scale:hint?hint/s.scale:0;
   if(tree){
    art+=line([project(at,z),project(at,z+height*.82)],p.roof[1],Math.max(.7,f.size*.13));
    if(f.citySymbol==='palm')art+=matrixArt(CR.feature(f,s,p,v)||'',z+height,at,f.size||8);
    else{const q=project(at,z+height*.78),size=f.size||8;include([q[0]-size*1.15,q[1]-size*1.2]);include([q[0]+size*1.15,q[1]+size]);
     if(f.citySymbol==='pine'){
      for(let k=0;k<3;k++){const w=size*(1-k*.23),y=q[1]-k*size*.46;art+=poly([[q[0]-w,y+size*.65],[q[0],y-size*.8],[q[0]+w,y+size*.65]],CR.color(p.forest,k?p.paper:p.ink,k?.06*k:.12),'',p.ink,.35);}
     }else{const random=C.rng(f.id+'-volume');for(let k=0;k<6;k++){const a=k*Math.PI/3,x=q[0]+Math.cos(a)*size*.42,y=q[1]+Math.sin(a)*size*.36,radius=size*(.52+random()*.15);art+=`<ellipse cx="${n(x)}" cy="${n(y)}" rx="${n(radius)}" ry="${n(radius*.85)}" fill="${hq?'url(#city-canopy)':p.forest}" stroke="${p.ink}" stroke-opacity=".25" stroke-width=".35"/>`;}art+=`<ellipse cx="${n(q[0]-size*.08)}" cy="${n(q[1]-size*.13)}" rx="${n(size*.62)}" ry="${n(size*.59)}" fill="${hq?'url(#city-canopy)':p.forest}"/>`;}
    }
   }
   else if(f.citySymbol==='wall-tower'){const ps=C.rect(at,f.size*1.5,f.size*1.5);art+=wallFaces(f,ps,z,z+height)+matrixArt(CR.feature(f,s,p,v)||'',z+height,at,f.size);}
   else{
    let body=f.citySymbol?CR.feature(f,s,p,v):null;
    if(body===null&&f.type==='image'&&/^data:image\/(png|jpeg|webp);base64,[A-Za-z0-9+/=]+$/.test(f.data||''))body=`<image href="${esc(f.data)}" x="${n(f.x-f.size)}" y="${n(f.y-f.size/(f.aspect||1))}" width="${n(f.size*2)}" height="${n(f.size*2/(f.aspect||1))}" transform="rotate(${n(f.rotation||0)} ${n(f.x)} ${n(f.y)})"/>`;
    if(body===null&&A.byId[f.asset])body=`<use href="#asset-${esc(f.asset)}" x="${n(f.x-f.size)}" y="${n(f.y-f.size)}" width="${n(f.size*2)}" height="${n(f.size*2)}" transform="rotate(${n(f.rotation||0)} ${n(f.x)} ${n(f.y)})"/>`;
    if(body){const elevated=['city-pergola','city-net-racks','city-arcade-court'].includes(f.asset)?height:0;
     if(elevated)for(const q of C.rect(at,f.size*1.5,f.size*1.5,(f.rotation||0)*Math.PI/180))art+=line([project(q,z),project(q,z+elevated)],p.roof[1],.8);
     if(f.asset==='city-runestone'){const ps=C.rect(at,f.size*.9,f.size*.5,(f.rotation||0)*Math.PI/180);art+=wallFaces(f,ps,z,z+height);}
     art+=matrixArt(body,z+elevated+.12,at,f.size||8);
    }
   }
   item={art,d:cam.depth(at)+(f.size||0)*.4,center:at,z:z+height};
  }
  if(item?.art){objects.push({...item,id:f.id});
   if(layers.labels!==false&&v.labels!==false&&f.label&&f.cityRole==='civic'){const q=project(item.center,item.z+12/s.scale);labels.push(`<text x="${n(q[0])}" y="${n(q[1])}" text-anchor="middle" font-size="10" font-family="Georgia,serif" fill="${p.ink}" stroke="${p.paper}" stroke-width="2" paint-order="stroke">${esc(f.label)}</text>`);}
  }
  if(f.type==='label'&&f.label&&layers.labels!==false&&v.labels!==false){const q=project(at,z+1);labels.push(`<text x="${n(q[0])}" y="${n(q[1])}" fill="${p.ink}" font-family="Georgia,serif" font-size="11">${esc(f.label)}</text>`);}
 }
 ground.sort((a,b)=>a.d-b.d);objects.sort((a,b)=>a.d-b.d||a.id.localeCompare(b.id));
 const minX=extent.x0-35,maxX=extent.x1+35,minY=extent.y0-45,maxY=extent.y1+35,w=maxX-minX,h=maxY-minY;
 const definitions=CR.defs(s,p,v)+R.symbols(p,new Set(fs.filter(f=>f.asset).map(f=>f.asset)));
 return `<svg xmlns="http://www.w3.org/2000/svg" xmlns:xlink="http://www.w3.org/1999/xlink" width="1600" height="${Math.round(1600*h/w)}" viewBox="${n(minX)} ${n(minY)} ${n(w)} ${n(h)}" role="img" aria-label="${esc(s.title)} · 2.5D" data-city-perspective="true" data-bearing="${n(cam.bearing)}"><title>${esc(s.title)} — 2.5D</title><desc>Read-only axonometric city view. Building heights and terrain are schematic; edit the authoritative top-down map.</desc><defs>${definitions}</defs><rect x="${n(minX)}" y="${n(minY)}" width="${n(w)}" height="${n(h)}" fill="${p.paper}"/><g data-perspective-terrain="true">${ground.map(x=>x.art).join('')}</g><g data-perspective-surface="true">${surface.join('')}</g><g data-perspective-objects="true">${objects.map(x=>`<g data-id="${esc(x.id)}">${x.art}</g>`).join('')}</g><g pointer-events="none">${labels.join('')}</g></svg>`;
}
return{render,camera,elevation,buildingHeight,clipMap};
});
