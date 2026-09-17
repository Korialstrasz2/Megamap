/* Megamap 1.2 — pure editor operations and export geometry. GPL-3.0-only. */
(function(root,factory){const E=typeof module==='object'&&module.exports?require('./engine.js'):root.MegamapEngine;const api=factory(E);if(typeof module==='object'&&module.exports)module.exports=api;else root.MegamapCore=api;})(typeof globalThis!=='undefined'?globalThis:this,function(E){
'use strict';
const clone=x=>JSON.parse(JSON.stringify(x));
const DEFAULT_LAYERS={terrain:true,water:true,roads:true,buildings:true,districts:false,vegetation:true,assets:true,labels:true};
const PALETTES=['atlas','parchment','ink','night','desert','frost'];
function appearance(s){const a=s.appearance||{};return {
 palette:PALETTES.includes(a.palette)?a.palette:'atlas',
 grid:['none','square','hex','hex-pointy','hex-flat'].includes(a.grid)?a.grid:(s.mode==='battle'?(s.options.gridType||'square'):'none'),
 gridSpacingKm:Number.isFinite(a.gridSpacingKm)?E.clamp(a.gridSpacingKm,Math.max(.05,s.scale/150),10):1,
 terrainDisplay:['landcover','elevation'].includes(a.terrainDisplay)?a.terrainDisplay:'landcover',hillshade:a.hillshade!==false,
 hq:s.mode==='battle'&&(typeof a.hq==='boolean'?a.hq:s.options?.hq===true),
 contours:a.contours===true,textures:a.textures!==false,labels:a.labels!==false,
 layers:Object.fromEntries(Object.entries(DEFAULT_LAYERS).map(([k,v])=>[k,typeof a.layers?.[k]==='boolean'?a.layers[k]:v]))
};}
function validateAtlas(data){
 if(data?.format==='megamap')data={format:'megamap-atlas',version:1,active:0,maps:[data]};
 if(!data||data.format!=='megamap-atlas'||data.version!==1||!Array.isArray(data.maps)||data.maps.length<1||data.maps.length>30)throw Error('Not a supported atlas (1–30 maps required).');
 data.maps.forEach(s=>{E.validateScene(s);s.appearance=appearance(s);if(s.mode==='city'&&String(s.engineVersion).startsWith('0.1')&&!s.metadata.wardLinksMigrated){const ds=s.features.filter(f=>f.type==='district');for(const f of s.features.filter(f=>f.type==='building')){const d=ds.find(d=>E.inside(center(f),d.polygon));if(d)f.ward=d.id;}s.metadata.wardLinksMigrated=true;}});
 const library=Array.isArray(data.library)?data.library:[];
 if(library.length>80)throw Error('Imported asset library is limited to 80 images.');
 const seen=new Set();for(const a of library){if(!a||typeof a.id!=='string'||seen.has(a.id)||typeof a.name!=='string'||a.name.length>200||!/^data:image\/(png|jpeg|webp);base64,[A-Za-z0-9+/=]+$/.test(a.data||'')||a.data.length>6e6||!Number.isFinite(a.aspect)||a.aspect<.01||a.aspect>100)throw Error('Invalid imported image library.');seen.add(a.id);}
 return {format:'megamap-atlas',version:1,appVersion:E.VERSION,active:E.clamp(Number.isInteger(data.active)?data.active:0,0,data.maps.length-1),maps:data.maps,library};
}
function center(f){return Number.isFinite(f.x)&&Number.isFinite(f.y)?[f.x,f.y]:E.center(f.polygon||f.points||[[0,0]]);}
function refreshBattleProp(f){if(!f.battleProp)return;
 const scale=f.size/(Math.max(f.propWidth,f.propHeight)*.55),w=f.propWidth*scale,h=f.propHeight*scale,a=(f.rotation||0)*Math.PI/180,cs=Math.cos(a),sn=Math.sin(a);
 f.battleFootprint=[[-w/2,-h/2],[w/2,-h/2],[w/2,h/2],[-w/2,h/2]].map(([x,y])=>[f.x+x*cs-y*sn,f.y+x*sn+y*cs]);
}
function translate(f,dx,dy){if(f.x!=null)f.x+=dx;if(f.y!=null)f.y+=dy;if(Number.isFinite(f.roofCx))f.roofCx+=dx;if(Number.isFinite(f.roofCy))f.roofCy+=dy;for(const k of ['polygon','points'])if(f[k])f[k]=f[k].map(p=>[p[0]+dx,p[1]+dy]);refreshBattleProp(f);}
function rotate(f,degrees){if(Number.isFinite(f.roofAngle))f.roofAngle=(f.roofAngle+degrees)%360;const c=center(f),a=degrees*Math.PI/180,cs=Math.cos(a),sn=Math.sin(a);if(Number.isFinite(f.roofCx)&&Number.isFinite(f.roofCy)){const x=f.roofCx-c[0],y=f.roofCy-c[1];f.roofCx=c[0]+x*cs-y*sn;f.roofCy=c[1]+x*sn+y*cs;}if(f.polygon||f.points){for(const k of ['polygon','points'])if(f[k])f[k]=f[k].map(p=>{const x=p[0]-c[0],y=p[1]-c[1];return [c[0]+x*cs-y*sn,c[1]+x*sn+y*cs];});}else f.rotation=((f.rotation||0)+degrees)%360;refreshBattleProp(f);}
function scale(f,factor){const c=center(f);for(const k of ['polygon','points'])if(f[k])f[k]=f[k].map(p=>[c[0]+(p[0]-c[0])*factor,c[1]+(p[1]-c[1])*factor]);if(Number.isFinite(f.roofCx))f.roofCx=c[0]+(f.roofCx-c[0])*factor;if(Number.isFinite(f.roofCy))f.roofCy=c[1]+(f.roofCy-c[1])*factor;if(f.size)f.size*=factor;if(f.width)f.width*=factor;if(f.roofWidth)f.roofWidth*=factor;if(f.roofHeight)f.roofHeight*=factor;refreshBattleProp(f);}
function smooth(points){if(points.length<3)return clone(points);const out=[points[0].slice()];for(let i=0;i<points.length-1;i++){const a=points[i],b=points[i+1];out.push([a[0]*.75+b[0]*.25,a[1]*.75+b[1]*.25],[a[0]*.25+b[0]*.75,a[1]*.25+b[1]*.75]);}out.push(points.at(-1).slice());return out;}
function canPlace(s,p,radius=0){if(p[0]<radius||p[1]<radius||p[0]>s.width-radius||p[1]>s.height-radius)return false;
 if(s.battle?.boundary&&!E.pointOnOrInside(p,s.battle.boundary))return false;
 if(s.battle){const x=Math.floor(p[0]/s.gridSize),y=Math.floor(p[1]/s.gridSize);if(!s.battle.cells[y*s.battle.cols+x])return false;}
 if(s.terrain){const t=s.terrain,i=Math.min(t.n-1,Math.floor(p[1]/s.height*t.n))*t.n+Math.min(t.n-1,Math.floor(p[0]/s.width*t.n));if(t.heights[i]<t.sea+(s.mode==='local'?0:.012))return false;}
 return !s.features.some(f=>!f.hidden&&((f.type==='water'&&E.inside(p,f.polygon))||(['road','river'].includes(f.type)&&E.nearPolyline(p,f.points)<(f.width||2)/2+radius*.4)||f.type==='building'&&E.inside(p,f.polygon)));
}
/** Marching squares with an explicit outside ring and consistent saddle resolution.
 * Returns closed, interpolated loops. Even-odd fill retains holes and islands. */
function contours(values,n,threshold,width=1000,height=1000){
 const edges=[],adj=new Map(),key=p=>p[0].toFixed(5)+','+p[1].toFixed(5);
 const val=(x,y)=>x<0||y<0||x>=n||y>=n?threshold-1:values[y*n+x];
 const point=(x,y)=>[(x+.5)*width/n,(y+.5)*height/n];
 const add=(a,b)=>{const i=edges.length;edges.push([a,b]);for(const p of [a,b]){const k=key(p);if(!adj.has(k))adj.set(k,[]);adj.get(k).push(i);}};
 for(let y=-1;y<n;y++)for(let x=-1;x<n;x++){
  const vs=[val(x,y),val(x+1,y),val(x+1,y+1),val(x,y+1)],ps=[point(x,y),point(x+1,y),point(x+1,y+1),point(x,y+1)],cross=[];
  for(let i=0;i<4;i++){const j=(i+1)%4;if((vs[i]>=threshold)===(vs[j]>=threshold))continue;const t=(threshold-vs[i])/(vs[j]-vs[i]);cross.push({edge:i,p:[ps[i][0]+t*(ps[j][0]-ps[i][0]),ps[i][1]+t*(ps[j][1]-ps[i][1])]});}
  if(cross.length===2)add(cross[0].p,cross[1].p);
  else if(cross.length===4){const middle=(vs[0]+vs[1]+vs[2]+vs[3])/4;if((vs[0]>=threshold)===(middle>=threshold)){add(cross[0].p,cross[1].p);add(cross[2].p,cross[3].p);}else{add(cross[0].p,cross[3].p);add(cross[1].p,cross[2].p);}}
 }
 const used=new Uint8Array(edges.length),loops=[];
 for(let i=0;i<edges.length;i++){if(used[i])continue;used[i]=1;const line=edges[i].map(p=>p.slice()),first=key(line[0]);let k=key(line[1]),limit=edges.length+1;
  while(k!==first&&limit-->0){const next=(adj.get(k)||[]).find(j=>!used[j]);if(next===undefined)break;used[next]=1;const pair=edges[next],p=key(pair[0])===k?pair[1]:pair[0];line.push(p.slice());k=key(p);}
  if(line.length>3&&k===first){line[line.length-1]=line[0].slice();loops.push(line);}
 }
 return loops;
}
function mergeWalls(lines){const groups=new Map(),other=[];for(const l of lines){const [a,b]=l;if(Math.abs(a[0]-b[0])<1e-6||Math.abs(a[1]-b[1])<1e-6){const v=Math.abs(a[0]-b[0])<1e-6,k=(v?'v:':'h:')+(v?a[0]:a[1]).toFixed(5);if(!groups.has(k))groups.set(k,[]);groups.get(k).push([Math.min(v?a[1]:a[0],v?b[1]:b[0]),Math.max(v?a[1]:a[0],v?b[1]:b[0])]);}else other.push(clone(l));}
 for(const [key,segments] of groups){segments.sort((a,b)=>a[0]-b[0]);const merged=[];for(const seg of segments){const last=merged.at(-1);if(last&&seg[0]<=last[1]+1e-5)last[1]=Math.max(last[1],seg[1]);else merged.push(seg.slice());}const vertical=key.startsWith('v'),c=Number(key.slice(2));for(const [a,b] of merged)other.push(vertical?[[c,a],[c,b]]:[[a,c],[b,c]]);}
 return other;
}
// Cut door openings only where a door lies on a collinear wall; no whole wall is discarded.
function cutDoor(line,door,tolerance=1){const [a,b]=line,[c,d]=door,v=[b[0]-a[0],b[1]-a[1]],len=Math.hypot(...v);if(len<1e-9)return[];const distance=p=>Math.abs(v[0]*(p[1]-a[1])-v[1]*(p[0]-a[0]))/len;
 if(distance(c)>tolerance||distance(d)>tolerance)return[line];const t=p=>((p[0]-a[0])*v[0]+(p[1]-a[1])*v[1])/(len*len),lo=Math.max(0,Math.min(t(c),t(d))),hi=Math.min(1,Math.max(t(c),t(d)));if(hi<=lo)return[line];const at=t=>[a[0]+v[0]*t,a[1]+v[1]*t],out=[];if(lo>1e-6)out.push([a,at(lo)]);if(hi<1-1e-6)out.push([at(hi),b]);return out;
}
function vttData(s,pixelsPerGrid,image,player=true){if(s.mode!=='battle')throw Error('VTT export requires a battle map.');const visible=f=>!f.hidden&&!(player&&f.gmOnly),features=s.features.filter(visible),g=s.gridSize;
 let lines=E.wallSegments(s);for(const f of features.filter(f=>f.type==='wall'))for(let i=1;i<f.points.length;i++)lines.push([f.points[i-1],f.points[i]]);
 lines=mergeWalls(lines);const portals=features.filter(f=>f.type==='portal');for(const f of portals)lines=lines.flatMap(l=>cutDoor(l,f.points,g*.04));
 if(s.options.mapShape&&s.options.mapShape!=='rectangle')lines=lines.map(l=>clipSegmentToBoundary(l,E.mapBoundary(s))).filter(Boolean);
 const xy=p=>({x:p[0]/g,y:p[1]/g});
 return {format:.2,megamap:gridMetadata(s),resolution:{map_origin:{x:0,y:0},map_size:{x:s.battle.cols,y:s.battle.rows},pixels_per_grid:pixelsPerGrid},line_of_sight:lines.map(l=>l.map(xy)),portals:portals.map(f=>({position:xy(E.center(f.points)),bounds:f.points.map(xy),rotation:Math.atan2(f.points[1][1]-f.points[0][1],f.points[1][0]-f.points[0][0]),closed:true})),lights:features.filter(f=>f.type==='light').map(f=>({position:xy([f.x,f.y]),range:f.range||6,intensity:f.intensity||1,color:'ff'+(f.color||'#ffc477').slice(1),shadows:true})),environment:{baked_lighting:false,ambient_light:'ffffffff'},image};
}
function history(limit=40,byteLimit=16e6){const past=[],future=[];return {push(value){past.push(value);let size=past.reduce((n,x)=>n+x.length,0);while(past.length>1&&(past.length>limit||size>byteLimit))size-=past.shift().length;future.length=0;},undo(value){if(!past.length)return null;future.push(value);return past.pop();},redo(value){if(!future.length)return null;past.push(value);return future.pop();},get canUndo(){return !!past.length;},get canRedo(){return !!future.length;}};}
/** Hex size means center-to-center distance across a shared edge.
 * Pointy: width=spacing. Flat: height=spacing. Both use radius=spacing/sqrt(3).
 * Rectangular dungeon raster and tactical movement grid are intentionally separate.
 */
function gridSpec(s,grid){
 const selected=grid||s.appearance?.grid||s.options.gridType||'square';
 const type=selected==='none'&&s.mode==='battle'?(s.options.gridType||'square'):selected;
 const spacing=s.mode==='battle'?s.gridSize:['region','local'].includes(s.mode)?s.width/s.scale*(s.appearance?.gridSpacingKm||1):s.width/24;
 const pointy=type==='hex-pointy',hex=['hex','hex-pointy','hex-flat'].includes(type),radius=spacing/Math.sqrt(3);
 return {type,hex,pointy,spacing,radius,origin:pointy?[spacing/2,radius]:hex?[radius,spacing/2]:[0,0],distance:s.mode==='battle'?5:['region','local'].includes(s.mode)?(s.appearance?.gridSpacingKm||1):s.scale/24,units:s.units};
}
function hexCenters(s,grid,margin=true){
 const spec=gridSpec(s,grid);if(!spec.hex)return[];const {spacing:g,radius:r,pointy,origin}=spec,out=[];
 const rows=Math.ceil(s.height/(pointy?1.5*r:g))+2,cols=Math.ceil(s.width/(pointy?g:1.5*r))+2;
 for(let row=margin?-1:0;row<=rows;row++)for(let col=margin?-1:0;col<=cols;col++){
  const x=origin[0]+(pointy?col*g+(Math.abs(row)%2)*g/2:col*1.5*r),y=origin[1]+(pointy?row*1.5*r:row*g+(Math.abs(col)%2)*g/2);
  if(x< -r||x>s.width+r||y< -r||y>s.height+r)continue;
  out.push({x,y,row,col});
 }return out;
}
function hexPolygon(x,y,radius,pointy){return Array.from({length:6},(_,i)=>{const a=(pointy?-Math.PI/2:0)+i*Math.PI/3;return[x+Math.cos(a)*radius,y+Math.sin(a)*radius];});}
function snapPoint(s,p,grid){const spec=gridSpec(s,grid);
 if(!spec.hex)return p.map(v=>Math.round(v/spec.spacing)*spec.spacing);
 const {pointy,spacing:g,radius:r,origin}=spec;let best=p.slice(),distance=Infinity;
 const row=Math.round((p[1]-origin[1])/(pointy?1.5*r:g)),col=Math.round((p[0]-origin[0])/(pointy?g:1.5*r));
 for(let y=row-2;y<=row+2;y++)for(let x=col-2;x<=col+2;x++){
  const candidate=[origin[0]+(pointy?x*g+(Math.abs(y)%2)*g/2:x*1.5*r),origin[1]+(pointy?y*1.5*r:x%2===0?y*g:y*g+g/2)];
  const d=E.dist(p,candidate);if(d<distance){distance=d;best=candidate;}
 }return best;
}
function heightCSV(s){if(s.mode!=='local'||!s.terrain?.elevationM)throw Error('Height data export requires a local-region survey.');const t=s.terrain,lines=['column,row,easting_m,northing_m,elevation_m'];
 for(let y=0;y<t.n;y++)for(let x=0;x<t.n;x++)lines.push([x,y,((x+.5)*t.cellMeters).toFixed(3),((t.n-y-.5)*t.cellMeters).toFixed(3),t.elevationM[y*t.n+x].toFixed(3)].join(','));
 return lines.join('\r\n');
}
function gridMetadata(s){const a=appearance(s),spec=gridSpec(s,a.grid);return{format:'megamap-grid',version:1,mapTitle:s.title,mapSizeUnits:{width:s.scale,height:s.scale*s.height/s.width,units:s.units},grid:{type:spec.type,units:spec.units,distance:spec.distance,spacingMapUnits:spec.spacing,radiusMapUnits:spec.hex?spec.radius:null,originMapUnits:{x:spec.origin[0],y:spec.origin[1]}},mapShape:s.options.mapShape||'rectangle',note:'SVG/PNG use this grid. Universal VTT importers may require manual grid-type and offset setup.'};}
function clipSegmentToBoundary(line,poly){let a=line[0].slice(),b=line[1].slice();const c=E.center(poly);for(let i=0;i<poly.length;i++){
 const p=poly[i],q=poly[(i+1)%poly.length],n=[q[1]-p[1],p[0]-q[0]];let offset=n[0]*p[0]+n[1]*p[1];if(n[0]*c[0]+n[1]*c[1]>offset){n[0]*=-1;n[1]*=-1;offset*=-1;}
 const da=n[0]*a[0]+n[1]*a[1]-offset,db=n[0]*b[0]+n[1]*b[1]-offset;if(da>1e-6&&db>1e-6)return null;
 if((da>0)!==(db>0)){const t=da/(da-db),p=[a[0]+t*(b[0]-a[0]),a[1]+t*(b[1]-a[1])];if(da>0)a=p;else b=p;}
 }return E.dist(a,b)>.001?[a,b]:null;
}

return {gridSpec,hexCenters,hexPolygon,snapPoint,heightCSV,gridMetadata,clipSegmentToBoundary,clone,appearance,validateAtlas,center,translate,rotate,scale,refreshBattleProp,smooth,canPlace,contours,mergeWalls,cutDoor,vttData,history,DEFAULT_LAYERS,PALETTES};
});
