/* Wizard-painted city plans. GPL-3.0-only. Input is a bounded stroke program,
 * never executable SVG or an image requiring recognition. Terrain and district
 * paint are separate 256x256 semantic masks; roads/walls retain vector paths.
 * The visible brush preview uses the same compiled masks as generation.
 */
(function(root,factory){const api=factory();if(typeof module==='object'&&module.exports)module.exports=api;else root.MegamapCityPlan=api;})(typeof globalThis!=='undefined'?globalThis:this,function(){
'use strict';
const N=256,STEP=1000/N,MAX_STROKES=240,MAX_POINTS=256,MAX_TOTAL=16000;
const ROLES=[
 ['river','River','#6fc7ed','terrain'],['sea','Sea / lake','#306caf','terrain'],
 ['road','Road','#d49a47','roads'],['wall','Wall','#59606e','walls'],
 ['commons','Mixed homes','#d6b477','districts'],['slums','Modest homes','#bc806d','districts'],['noble','Villas / wealthy homes','#b492db','districts'],
 ['oldtown','Old town','#bf9862','districts'],['market','Market','#e4c551','districts'],['merchants','Merchants','#d991bd','districts'],
 ['artisans','Artisans','#cf975e','districts'],['docks','Docks','#559f9c','districts'],['temple','Temple precinct','#a2a2de','districts'],
 ['military','Military','#ba727c','districts'],['university','Scholars','#99aedd','districts'],['industrial','Industry','#969789','districts'],
 ['gardens','Gardens / park','#78ac73','districts'],['farming','Farmsteads','#bdc675','districts'],['cemetery','Memorial gardens','#a0a9a5','districts'],['square','Public square','#eadb99','districts']
].map(([id,name,color,layer])=>({id,name,color,layer}));
const DISTRICTS=ROLES.filter(r=>r.layer==='districts'),CODES=Object.fromEntries(DISTRICTS.map((r,i)=>[r.id,i+1]));
const OPEN=new Set([CODES.gardens,CODES.square]);
const clamp=(x,a,b)=>Math.max(a,Math.min(b,x));
const role=id=>ROLES.find(r=>r.id===id);
function normalize(raw){
 if(!raw||typeof raw!=='object'||raw.version!==1||!Array.isArray(raw.strokes)||raw.strokes.length>MAX_STROKES)throw Error('Invalid painted city plan.');
 let total=0;const strokes=raw.strokes.map(s=>{
  if(!s||!role(s.role)&&!['erase-terrain','erase-districts','erase-roads','erase-walls'].includes(s.role))throw Error('Unknown city brush.');
  if(!Number.isFinite(s.width)||s.width<2||s.width>300||!Array.isArray(s.points)||!s.points.length||s.points.length>MAX_POINTS)throw Error('Invalid city brush stroke.');
  total+=s.points.length;if(total>MAX_TOTAL)throw Error('City plan is too detailed; simplify the sketch.');
  return{role:s.role,width:s.width,points:s.points.map(p=>{if(!Array.isArray(p)||p.length!==2||p.some(x=>!Number.isFinite(x)||x<0||x>1000))throw Error('Invalid city brush coordinates.');return p.slice();})};
 });return{version:1,strokes};
}
const layerOf=s=>s.role.startsWith('erase-')?s.role.slice(6):role(s.role).layer;
function segmentDistance(p,a,b){const dx=b[0]-a[0],dy=b[1]-a[1],t=clamp(((p[0]-a[0])*dx+(p[1]-a[1])*dy)/(dx*dx+dy*dy||1),0,1);return Math.hypot(p[0]-a[0]-t*dx,p[1]-a[1]-t*dy);}
function distance(p,s){let d=Infinity;if(s.points.length===1)return Math.hypot(p[0]-s.points[0][0],p[1]-s.points[0][1]);for(let i=1;i<s.points.length;i++)d=Math.min(d,segmentDistance(p,s.points[i-1],s.points[i]));return d;}
function compile(raw){const plan=normalize(raw),terrain=new Uint8Array(N*N),zones=new Uint8Array(N*N),lines={roads:[],walls:[]};let rasterWork=0;
 for(let si=0;si<plan.strokes.length;si++){
  const s=plan.strokes[si],layer=layerOf(s),erase=s.role.startsWith('erase-');
  if(layer==='roads'||layer==='walls'){
   if(erase)continue;if(s.points.length<2)continue;
   // Erasing a line cuts only the earlier lines in that layer, not future paint.
   const erasers=plan.strokes.slice(si+1).filter(e=>e.role==='erase-'+layer);let runs=[],run=[];
   const pts=[];for(let i=1;i<s.points.length;i++){const a=s.points[i-1],b=s.points[i],n=Math.max(1,Math.ceil(Math.hypot(b[0]-a[0],b[1]-a[1])/3));for(let k=0;k<n;k++)pts.push([a[0]+(b[0]-a[0])*k/n,a[1]+(b[1]-a[1])*k/n]);}pts.push(s.points.at(-1));
   for(const p of pts){if(erasers.some(e=>distance(p,e)<=e.width/2)){if(run.length>1)runs.push(run);run=[];}else run.push(p);}if(run.length>1)runs.push(run);
   for(const points of runs)lines[layer].push({points:simplify(points,.7),width:clamp(s.width,2,layer==='roads'?32:16),stroke:si});continue;
  }
  const data=layer==='terrain'?terrain:zones,value=erase?0:layer==='terrain'?(s.role==='river'?1:2):CODES[s.role],radius=s.width/2;
  // Paint a segment at a time, bounding raster work even for long diagonal paths.
  for(let i=0;i<Math.max(1,s.points.length-1);i++){const a=s.points[i],b=s.points[Math.min(s.points.length-1,i+1)],x0=clamp(Math.floor((Math.min(a[0],b[0])-radius)/STEP),0,N-1),x1=clamp(Math.floor((Math.max(a[0],b[0])+radius)/STEP),0,N-1),y0=clamp(Math.floor((Math.min(a[1],b[1])-radius)/STEP),0,N-1),y1=clamp(Math.floor((Math.max(a[1],b[1])+radius)/STEP),0,N-1);
   if((rasterWork+=(x1-x0+1)*(y1-y0+1))>35000000)throw Error('City plan is too detailed; simplify the sketch.');for(let y=y0;y<=y1;y++)for(let x=x0;x<=x1;x++)if(segmentDistance([(x+.5)*STEP,(y+.5)*STEP],a,b)<=radius)data[y*N+x]=value;
  }
 }
 return{n:N,terrain:Array.from(terrain),zones:Array.from(zones),...lines};
}
function simplify(points,tolerance=.7){if(points.length<3)return points.map(p=>p.slice());let max=tolerance,at=-1;for(let i=1;i<points.length-1;i++){const d=segmentDistance(points[i],points[0],points.at(-1));if(d>max){max=d;at=i;}}if(at<0)return[points[0].slice(),points.at(-1).slice()];return simplify(points.slice(0,at+1),tolerance).slice(0,-1).concat(simplify(points.slice(at),tolerance));}
function cell(p){if(p[0]<0||p[1]<0||p[0]>=1000||p[1]>=1000)return-1;return Math.floor(p[1]/STEP)*N+Math.floor(p[0]/STEP);}
function waterAt(g,p,margin=0){const data=g.paintWater.cells,ix=cell(p);if(ix<0)return false;const wet=!!data[ix];if(!margin)return wet;
 const r=Math.abs(margin),x0=clamp(Math.floor((p[0]-r)/STEP),0,N-1),x1=clamp(Math.floor((p[0]+r)/STEP),0,N-1),y0=clamp(Math.floor((p[1]-r)/STEP),0,N-1),y1=clamp(Math.floor((p[1]+r)/STEP),0,N-1);
 if(margin<0&&!wet)return false;
 for(let y=y0;y<=y1;y++)for(let x=x0;x<=x1;x++){const isWet=!!data[y*N+x];if(isWet===(margin<0))continue;const dx=Math.max(x*STEP-p[0],0,p[0]-(x+1)*STEP),dy=Math.max(y*STEP-p[1],0,p[1]-(y+1)*STEP);if(dx*dx+dy*dy<=r*r)return margin>0;}
 return margin<0;
}
const distances=new WeakMap();
function bankDistance(g,p){let field=distances.get(g.paintWater);if(!field){const a=g.paintWater.cells;field=new Float64Array(N*N).fill(1e6);for(let i=0;i<a.length;i++)if(a[i])field[i]=0;
 for(let y=0;y<N;y++)for(let x=0;x<N;x++){const i=y*N+x;if(x)field[i]=Math.min(field[i],field[i-1]+1);if(y)field[i]=Math.min(field[i],field[i-N]+1);if(x&&y)field[i]=Math.min(field[i],field[i-N-1]+Math.SQRT2);if(y&&x<N-1)field[i]=Math.min(field[i],field[i-N+1]+Math.SQRT2);}
 for(let y=N-1;y>=0;y--)for(let x=N-1;x>=0;x--){const i=y*N+x;if(x<N-1)field[i]=Math.min(field[i],field[i+1]+1);if(y<N-1)field[i]=Math.min(field[i],field[i+N]+1);if(x<N-1&&y<N-1)field[i]=Math.min(field[i],field[i+N+1]+Math.SQRT2);if(y<N-1&&x)field[i]=Math.min(field[i],field[i+N-1]+Math.SQRT2);}distances.set(g.paintWater,field);}
 const i=cell(p);return i<0||field[i]>N*2?Infinity:Math.max(0,field[i]*STEP-STEP/2);
}
// Merge horizontal runs vertically, preserving islands and erased holes. These
// exact rectangles are also editable water/open-space geometry in the scene.
function rectangles(data){const done=[],active=new Map();for(let y=0;y<=N;y++){const row=new Map();let x=0;while(y<N&&x<N){const code=data[y*N+x];if(!code){x++;continue;}const start=x++;while(x<N&&data[y*N+x]===code)x++;const key=start+':'+x+':'+code;let b=active.get(key);if(b){b.y1=y+1;active.delete(key);}else b={x0:start,x1:x,y0:y,y1:y+1,code};row.set(key,b);}done.push(...active.values());active.clear();for(const [k,v]of row)active.set(k,v);}return done.map(b=>({...b,polygon:[[b.x0*STEP,b.y0*STEP],[b.x1*STEP,b.y0*STEP],[b.x1*STEP,b.y1*STEP],[b.x0*STEP,b.y1*STEP]]}));}
function touches(poly,data,predicate,C){const b=C.bounds(poly);for(let y=clamp(Math.floor(b.y0/STEP),0,N-1);y<=clamp(Math.floor(b.y1/STEP),0,N-1);y++)for(let x=clamp(Math.floor(b.x0/STEP),0,N-1);x<=clamp(Math.floor(b.x1/STEP),0,N-1);x++)if(predicate(data[y*N+x],y*N+x)&&C.overlaps(poly,[[x*STEP,y*STEP],[(x+1)*STEP,y*STEP],[(x+1)*STEP,(y+1)*STEP],[x*STEP,(y+1)*STEP]]))return true;return false;}
function fits(s,poly,C,ward=null){const st=s.cityStudio,plan=st.paintPlan;if(!plan)return true;if(poly.some(p=>cell(p)<0))return false;
 return!touches(poly,plan.cellWard,(id,i)=>id<0||ward&&id!==ward.paintIndex||OPEN.has(plan.zones[i])||st.ground.paintWater.cells[i],C);
}
function at(s,p){const i=cell(p),index=i<0?-1:s.cityStudio.paintPlan.cellWard[i];return index<0?null:s.cityStudio.neighborhoods[index];}
function buildable(s,p){const i=cell(p);return i>=0&&s.cityStudio.paintPlan.zones[i]>0&&!OPEN.has(s.cityStudio.paintPlan.zones[i])&&!s.cityStudio.ground.paintWater.cells[i];}
function outline(cells){const set=new Set(cells),edges=[];for(const i of cells){const x=i%N,y=Math.floor(i/N);if(y===0||!set.has(i-N))edges.push([[x,y],[x+1,y]]);if(x===N-1||!set.has(i+1))edges.push([[x+1,y],[x+1,y+1]]);if(y===N-1||!set.has(i+N))edges.push([[x+1,y+1],[x,y+1]]);if(x===0||!set.has(i-1))edges.push([[x,y+1],[x,y]]);}
 const starts=new Map();edges.forEach((e,i)=>{const k=e[0].join(',');if(!starts.has(k))starts.set(k,[]);starts.get(k).push(i);});const used=new Set(),loops=[];
 for(let k=0;k<edges.length;k++){if(used.has(k))continue;let j=k,loop=[];while(j!=null&&!used.has(j)){used.add(j);loop.push(edges[j][0]);j=(starts.get(edges[j][1].join(','))||[]).find(i=>!used.has(i));}if(loop.length>2)loops.push(loop);}
 const area=p=>Math.abs(p.reduce((v,a,i)=>{const b=p[(i+1)%p.length];return v+a[0]*b[1]-b[0]*a[1];},0));loops.sort((a,b)=>area(b)-area(a));let p=loops[0]||[];
 p=p.filter((b,i)=>{const a=p[(i+p.length-1)%p.length],c=p[(i+1)%p.length];return(a[0]-b[0])*(c[1]-b[1])!==(a[1]-b[1])*(c[0]-b[0]);});return p.map(p=>p.map(x=>x*STEP));
}
function prepare(s,C){const st=s.cityStudio,plan=compile(s.options.cityPlan),g=st.ground;st.paintPlan={version:1,n:N,zones:plan.zones,cellWard:Array(N*N).fill(-1)};g.paintWater={n:N,cells:plan.terrain};g.landscape='plain';g.canals=[];st.bridges=[];st.neighborhoods=[];
 // Water lowers its own terrain and adjacent banks, without inventing another
 // preset river, sea, palace or central landmark over the user's sketch.
 g.heights=g.heights.map((z,i)=>z*clamp(bankDistance(g,[(i%64+.5)*1000/64,(Math.floor(i/64)+.5)*1000/64])/40,0,1));
 for(const band of rectangles(plan.terrain))C.emit(s,'water',{polygon:band.polygon,cityRole:'water',cityPaintBand:true,cityWaterKind:band.code===2?'sea':'river'});
 const visited=new Uint8Array(N*N),components=[];
 for(let i=0;i<visited.length;i++){if(visited[i]||!plan.zones[i]||plan.terrain[i])continue;const cells=[i],code=plan.zones[i];visited[i]=1;for(let j=0;j<cells.length;j++){const u=cells[j],x=u%N,y=Math.floor(u/N);for(const k of [x?u-1:-1,x<N-1?u+1:-1,y?u-N:-1,y<N-1?u+N:-1])if(k>=0&&!visited[k]&&plan.zones[k]===code&&!plan.terrain[k]){visited[k]=1;cells.push(k);}}if(cells.length>=3)components.push({code,cells});}
 if(components.length>48)throw Error('Too many disconnected districts (maximum 48). Join or erase small patches.');
 if(!components.some(c=>!OPEN.has(c.code)))throw Error('Paint at least one buildable district before generating.');
 for(const component of components){const index=st.neighborhoods.length,cells=component.cells,mean=cells.reduce((p,i)=>[p[0]+(i%N+.5)*STEP/cells.length,p[1]+(Math.floor(i/N)+.5)*STEP/cells.length],[0,0]),cellCenter=i=>[(i%N+.5)*STEP,(Math.floor(i/N)+.5)*STEP],best=cells.reduce((a,b)=>C.distance(cellCenter(a),mean)<C.distance(cellCenter(b),mean)?a:b),center=cellCenter(best),brush=DISTRICTS[component.code-1],quarter=brush.id==='square'?'gardens':brush.id;
  const ward={id:'paint'+index,center,quarter,seed:C.hash(s.seed+'paint'+index),revision:0,target:0,planAngle:0,paintIndex:index,paintRole:brush.id};ward.profile=C.Refine.profile(s,quarter);ward.profile.name=brush.name;
  const f=C.emit(s,'district',{polygon:outline(cells),x:center[0],y:center[1],ward:brush.name,quarter,label:brush.name,cityWard:ward.id,cityPaintRole:brush.id});ward.feature=f.id;st.neighborhoods.push(ward);cells.forEach(i=>st.paintPlan.cellWard[i]=index);
 }
 const first=st.neighborhoods.find(w=>!OPEN.has(CODES[w.paintRole]));st.origin=first.center.slice();st.networkRoot=first.center.slice();st.planAngle=0;st.refinementVersion=1;
 // Open ground is physically present, not a request for buildings painted green.
 const open=plan.zones.map((code,i)=>!plan.terrain[i]&&OPEN.has(code)?code:0);for(const b of rectangles(open)){const w=at(s,C.center(b.polygon));if(w)C.emit(s,'area',{polygon:b.polygon,ward:w.feature,cityRole:'paint-open',citySurface:b.code===CODES.gardens?'garden':'paving',material:b.code===CODES.gardens?'grass':'sand'});}
 return plan;
}
function paintRoads(s,plan,C){const st=s.cityStudio,g=st.ground;
 for(const road of plan.roads){const ps=C.pathSamples(road.points,3);let start=0;
  while(start<ps.length-1){const wet=C.waterAt(g,ps[start],road.width/2+1);let end=start+1;while(end<ps.length-1&&C.waterAt(g,ps[end],road.width/2+1)===wet)end++;
   const run=ps.slice(start,end+1),length=run.reduce((a,p,i)=>a+(i?C.distance(p,run[i-1]):0),0);
   if(wet){if(start>0&&end<ps.length-1&&length*s.scale<=180){C.street(s,run,'bridge',road.width,{cityDeck:true,cityPainted:true});st.bridges.push([run[0],run.at(-1)]);}else st.warnings.push('A painted road enters open water or exceeds the 180 m bridge limit; that wet section was left open.');}
   else C.street(s,run,'street',road.width,{cityPainted:true});start=end;
  }
 }
}
function paintWalls(s,plan,C){const st=s.cityStudio;for(const wall of plan.walls){let run=[];const ps=C.pathSamples(wall.points,3),flush=()=>{if(run.length>1){const f=C.emit(s,'wall',{points:simplify(run,.5),width:wall.width,cityRole:'city-wall',cityPainted:true});for(let i=1;i<f.points.length;i++)st.reservations.push({polygon:C.corridor(f.points[i-1],f.points[i],f.width+1),blockRoad:true,feature:f.id});}run=[];};
 for(const p of ps){const near=C.nearestRoad(s,p),gate=near&&near.distance<near.road.width/2+wall.width/2+2;
  if(C.waterAt(st.ground,p,wall.width/2)||gate)flush();else run.push(p);
 }flush();}}
function network(s,C){const st=s.cityStudio,g=st.ground;
 for(const ward of st.neighborhoods){if(OPEN.has(CODES[ward.paintRole]))continue;const p=ward.center,near=C.nearestRoad(s,p),width=Math.max(2,5/s.scale);
  if(near&&near.distance<5)continue;
  const route=near&&C.route(s,near.point,p,width);if(route)C.street(s,route,'street',width);
  else{const ix=ward.paintIndex,candidates=[];for(let k=0;k<st.paintPlan.cellWard.length;k++)if(st.paintPlan.cellWard[k]===ix)candidates.push([(k%N+.5)*STEP,(Math.floor(k/N)+.5)*STEP]);let made=false;for(const q of candidates.sort((a,b)=>C.distance(b,p)-C.distance(a,p)).slice(0,12)){const line=C.route(s,p,q,width);if(line){C.street(s,line,'street',width);made=true;break;}}if(!made)st.warnings.push('A small painted district could not fit a usable street.');}
 }
 // Join disjoint painted-road groups only through traversable dry land. Never
 // fabricate a crossing across a sea or force a gate through a painted wall.
 for(let pass=0;pass<6;pass++){const graph=C.buildGraph(s);if(graph.components.length<2)break;const main=graph.components.slice().sort((a,b)=>b.length-a.length)[0],pool=graph.nodes,mainSet=new Set(main);let joined=false;
  for(const component of graph.components){if(component===main||component.some(i=>mainSet.has(i)))continue;let best=null;
   const sample=a=>a.filter((_,i)=>i%Math.max(1,Math.floor(a.length/24))===0);for(const u of sample(component))for(const v of sample(main)){const a=[pool[u].x,pool[u].y],b=[pool[v].x,pool[v].y],d=C.distance(a,b);if(!best||d<best.d)best={a,b,d};}
   if(best){const line=C.route(s,best.a,best.b,Math.max(2,4/s.scale));if(line){C.street(s,line,'street',Math.max(2,4/s.scale));joined=true;}}
  }if(!joined)break;
 }
}
function finish(s,C){const st=s.cityStudio,graph=C.buildGraph(s);st.paintPlan.components=graph.components.length;
 if(graph.components.length>1)st.warnings.push('The sketch has '+graph.components.length+' disconnected street groups. Paint connecting roads and bridge/gate crossings to join them.');
 for(const w of st.neighborhoods){if(OPEN.has(CODES[w.paintRole]))continue;const count=s.features.filter(f=>f.type==='building'&&f.ward===w.feature).length;if(!count)st.warnings.push('No buildings fit '+DISTRICTS.find(d=>d.id===w.paintRole).name+' patch '+(w.paintIndex+1)+'; enlarge it or add a road.');}
 st.warnings=[...new Set(st.warnings)].slice(0,150);
}
function validate(s){const st=s.cityStudio;if(!st.paintPlan&&!st.ground.paintWater)return;
 const plan=st.paintPlan,g=st.ground.paintWater;if(!plan||plan.version!==1||plan.n!==N||!g||g.n!==N)throw Error('Invalid painted city masks.');normalize(s.options.cityPlan);
 for(const [a,min,max]of [[g.cells,0,2],[plan.zones,0,DISTRICTS.length],[plan.cellWard,-1,st.neighborhoods.length-1]])if(!Array.isArray(a)||a.length!==N*N||a.some(x=>!Number.isInteger(x)||x<min||x>max))throw Error('Invalid painted city mask cells.');
 for(const [i,w]of st.neighborhoods.entries())if(w.paintIndex!==i||!CODES[w.paintRole])throw Error('Invalid painted district index.');
}
function example(){return{version:1,strokes:[{role:'sea',width:280,points:[[975,70],[975,960]]},{role:'river',width:54,points:[[570,0],[555,240],[650,460],[610,690],[850,790]]},{role:'slums',width:235,points:[[235,650],[445,650]]},{role:'commons',width:240,points:[[230,380],[455,390]]},{role:'noble',width:210,points:[[225,155],[425,160]]},{role:'market',width:125,points:[[490,490]]},{role:'docks',width:135,points:[[752,450],[754,595]]},{role:'gardens',width:110,points:[[360,845],[535,850]]},{role:'road',width:11,points:[[95,490],[790,490]]},{role:'road',width:9,points:[[325,80],[325,900]]},{role:'wall',width:5,points:[[100,290],[480,290]]}]};}
return{N,STEP,MAX_STROKES,MAX_POINTS,MAX_TOTAL,ROLES,DISTRICTS,CODES,OPEN,normalize,compile,simplify,cell,waterAt,bankDistance,rectangles,touches,fits,at,buildable,prepare,paintRoads,paintWalls,network,finish,validate,example};
});
