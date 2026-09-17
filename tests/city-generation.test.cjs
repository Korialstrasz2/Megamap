'use strict';
// City-generation repair (Steps A-C): geometry predicates with analytical
// oracles, convex difference fixtures, and scene-level placement guarantees.
const test=require('node:test'),assert=require('node:assert/strict'),fs=require('node:fs'),path=require('node:path');
const E=require('../src/engine.js'),R=require('../src/render.js'),C=require('../src/editor-core.js');

// ---- Independent test-side oracles (do not reuse the production helpers) ----
function satOverlap(a,b,tol=1e-6){
 const axes=[];
 for(const poly of [a,b])for(let i=0;i<poly.length;i++){const p=poly[i],q=poly[(i+1)%poly.length],ex=q[0]-p[0],ey=q[1]-p[1],l=Math.hypot(ex,ey);if(l>1e-9)axes.push([-ey/l,ex/l]);}
 for(const [ax,ay] of axes){
  let amin=Infinity,amax=-Infinity,bmin=Infinity,bmax=-Infinity;
  for(const p of a){const v=p[0]*ax+p[1]*ay;if(v<amin)amin=v;if(v>amax)amax=v;}
  for(const p of b){const v=p[0]*ax+p[1]*ay;if(v<bmin)bmin=v;if(v>bmax)bmax=v;}
  if(amax<bmin-tol||bmax<amin-tol)return false;
 }
 return true;
}
function pointSegDist(p,a,b){const ex=b[0]-a[0],ey=b[1]-a[1],l2=ex*ex+ey*ey;if(l2<1e-12)return Math.hypot(p[0]-a[0],p[1]-a[1]);const t=Math.max(0,Math.min(1,((p[0]-a[0])*ex+(p[1]-a[1])*ey)/l2));return Math.hypot(p[0]-a[0]-t*ex,p[1]-a[1]-t*ey);}
function crosses(a,b,c,d){const o=(p,q,r)=>(q[0]-p[0])*(r[1]-p[1])-(q[1]-p[1])*(r[0]-p[0]);const o1=o(a,b,c),o2=o(a,b,d),o3=o(c,d,a),o4=o(c,d,b);return((o1>0&&o2<0)||(o1<0&&o2>0))&&((o3>0&&o4<0)||(o3<0&&o4>0));}
function edgeDist(a,b,c,d){if(crosses(a,b,c,d))return 0;return Math.min(pointSegDist(a,c,d),pointSegDist(b,c,d),pointSegDist(c,a,b),pointSegDist(d,a,b));}
function polylineDist(poly,line){let d=Infinity;for(let i=0;i<poly.length;i++){const a=poly[i],b=poly[(i+1)%poly.length];for(let j=1;j<line.length;j++)d=Math.min(d,edgeDist(a,b,line[j-1],line[j]));}return d;}
function aabb(poly){const b={x0:Infinity,y0:Infinity,x1:-Infinity,y1:-Infinity};for(const v of poly){if(v[0]<b.x0)b.x0=v[0];if(v[1]<b.y0)b.y0=v[1];if(v[0]>b.x1)b.x1=v[0];if(v[1]>b.y1)b.y1=v[1];}return b;}
function aabbOverlap(a,b){return a.x0<=b.x1&&b.x0<=a.x1&&a.y0<=b.y1&&b.y0<=a.y1;}

// ---- Step A: segment and polygon predicates --------------------------------
test('segmentsIntersect handles crossing, contact, collinear overlap and zero-length',()=>{
 assert.equal(E.segmentsIntersect([0,0],[10,10],[0,10],[10,0]),true);   // proper crossing
 assert.equal(E.segmentsIntersect([0,0],[10,0],[10,0],[20,0]),true);   // endpoint contact
 assert.equal(E.segmentsIntersect([0,0],[10,0],[2,0],[8,0]),true);     // collinear overlap
 assert.equal(E.segmentsIntersect([0,0],[10,0],[5,0],[5,0]),true);     // zero-length on segment
 assert.equal(E.segmentsIntersect([0,0],[10,0],[5,5],[5,5]),false);    // zero-length off segment
 assert.equal(E.segmentsIntersect([0,0],[10,0],[0,1],[10,1]),false);   // parallel, disjoint
 assert.equal(E.segmentsIntersect([0,0],[10,0],[10.5,0],[20,0]),false);// gap
});
test('polygonsIntersect catches crossing without contained vertices',()=>{
 const a=[[0,4],[10,4],[10,6],[0,6]],b=[[4,0],[6,0],[6,10],[4,10]];
 assert.equal(E.polygonsIntersect(a,b),true);
 assert.equal(a.some(v=>E.pointOnOrInside(v,b)),false,'no contained vertex expected');
 assert.equal(b.some(v=>E.pointOnOrInside(v,a)),false,'no contained vertex expected');
});
test('polygon predicates handle containment, tangency and separation',()=>{
 const big=[[0,0],[100,0],[100,100],[0,100]],small=[[40,40],[60,40],[60,60],[40,60]];
 const touch=[[100,0],[120,0],[120,20],[100,20]],far=[[200,0],[220,0],[220,20],[200,20]];
 assert.equal(E.polygonsIntersect(big,small),true);
 assert.equal(E.polygonInsidePolygon(small,big),true);
 assert.equal(E.polygonsIntersect(big,touch),true);       // edge contact counts
 assert.equal(E.polygonsIntersect(big,far),false);
 assert.equal(E.polygonDistance(big,far),100);
 assert.equal(E.polygonsClearOf(small,[E.shapeOf(big)],0),false);
 assert.equal(E.polygonsClearOf(far,[E.shapeOf(big)],0),true);
});
test('polygonInsidePolygon rejects an edge crossing an L-shaped notch',()=>{
 const L=[[0,0],[100,0],[100,40],[40,40],[40,100],[0,100]];
 assert.equal(E.polygonInsidePolygon([[10,10],[30,10],[30,30],[10,30]],L),true);
 assert.equal(E.polygonInsidePolygon([[80,30],[30,80],[30,30]],L),false);  // vertices inside, edge exits
});
test('symbolFootprint matches the rendered square, rotation and mirror',()=>{
 assert.deepEqual(E.symbolFootprint({x:50,y:60,size:10,rotation:0}),[[40,50],[60,50],[60,70],[40,70]]);
 assert.equal(E.area(E.symbolFootprint({x:0,y:0,size:10,rotation:45}))-400<1e-9,true);
 const r=E.symbolFootprint({x:0,y:0,size:10,rotation:45}),xs=r.map(p=>p[0]),ys=r.map(p=>p[1]);
 assert(Math.abs(Math.max(...xs)-10*Math.SQRT2)<1e-9&&Math.abs(Math.min(...xs)+10*Math.SQRT2)<1e-9);
 assert(Math.abs(Math.max(...ys)-10*Math.SQRT2)<1e-9&&Math.abs(Math.min(...ys)+10*Math.SQRT2)<1e-9);
 assert.deepEqual(E.symbolFootprint({x:0,y:0,size:10,rotation:0,flipX:true}),[[10,-10],[-10,-10],[-10,10],[10,10]]);
});
test('convexQuality measures width, aspect, simplicity and pointed tips',()=>{
 const square=E.convexQuality([[0,0],[10,0],[10,10],[0,10]]);
 assert.equal(square.simple,true);assert(Math.abs(square.area-100)<1e-9);
 assert(Math.abs(square.width-10)<1e-9);assert(Math.abs(square.aspect-1)<1e-9);
 const bar=E.convexQuality([[0,0],[20,0],[20,2],[0,2]]);
 assert(Math.abs(bar.width-2)<1e-9);assert(Math.abs(bar.aspect-10)<1e-6);
 const needle=E.convexQuality([[0,0],[50,0],[25,1]]);
 assert(needle.width<1.1);assert(needle.minAngle<10);assert(needle.maxTip<.1);
 assert(E.convexQuality([[0,0],[100,0],[50,40]]).maxTip>.35);
 assert.equal(E.convexQuality([[0,0],[10,10],[10,0],[0,10]]).simple,false);
});

// ---- Step C: convex difference fixtures ------------------------------------
test('subtractConvex keeps both banks with the exact retained area',()=>{
 const square=[[0,0],[100,0],[100,100],[0,100]],strip=[[40,-10],[60,-10],[60,110],[40,110]];
 const pieces=E.subtractConvex(square,strip);
 const total=pieces.reduce((n,p)=>n+E.area(p),0);
 assert(Math.abs(total-8000)<.5,'retained area '+total);
 assert.equal(pieces.length,2);
 assert(pieces.some(p=>E.boundsOf(p).x1<=40.001),'no west bank piece');
 assert(pieces.some(p=>E.boundsOf(p).x0>=59.999),'no east bank piece');
 for(const p of pieces)for(const v of p)assert(!(v[0]>40.001&&v[0]<59.999),'retained vertex in the strip');
 for(const p of pieces)for(let y=0;y<=100;y+=10)assert(!E.inside([50,y],p),'retained land in the strip');
});
test('subtractConvex represents a contained obstacle as exterior pieces',()=>{
 const square=[[0,0],[100,0],[100,100],[0,100]],hole=[[40,40],[60,40],[60,60],[40,60]];
 const pieces=E.subtractConvex(square,hole);
 assert.equal(pieces.length,4);
 assert(Math.abs(pieces.reduce((n,p)=>n+E.area(p),0)-9600)<.5);
 assert(!pieces.some(p=>E.inside([50,50],p)));
});
test('subtractConvex is a no-op for a nonintersecting obstacle and empty when covered',()=>{
 const square=[[0,0],[100,0],[100,100],[0,100]];
 const miss=E.subtractConvex(square,[[200,200],[220,200],[220,220],[200,220]]);
 assert.equal(miss.length,1);assert.equal(E.area(miss[0]),10000);
 const cover=E.subtractConvex(square,[[-10,-10],[110,-10],[110,110],[-10,110]]);
 assert.deepEqual(cover,[]);
});
test('overlapping capsules subtract their union, not a strip',()=>{
 const square=[[0,0],[100,0],[100,100],[0,100]];
 const cap1=E.capsulePolygon([20,50],[80,50],15),cap2=E.capsulePolygon([50,20],[50,80],15);
 const {pieces,capped}=E.subtractAll(square,[E.shapeOf(cap1),E.shapeOf(cap2)]);
 assert.equal(capped,false);
 assert(pieces.length>0);
 assert(!pieces.some(p=>E.inside([50,50],p)),'overlap of the capsules must be removed');
 assert(!pieces.some(p=>E.inside([30,50],p)),'capsule 1 interior must be removed');
 assert(!pieces.some(p=>E.inside([50,30],p)),'capsule 2 interior must be removed');
 let wet=0,total=0;
 for(let x=.5;x<100;x++)for(let y=.5;y<100;y++){total++;if(E.inside([x,y],cap1)||E.inside([x,y],cap2))wet++;}
 const sampled=10000*(1-wet/total),retained=pieces.reduce((n,p)=>n+E.area(p),0);
 assert(Math.abs(retained-sampled)<120,'retained '+retained+' vs sampled '+sampled);
});
test('river bends and endpoint caps are fully covered by capsule obstacles',()=>{
 const square=[[0,0],[100,0],[100,100],[0,100]],line=[[10,50],[50,50],[90,70]],r=12;
 const obstacles=[];for(let i=1;i<line.length;i++)obstacles.push(E.shapeOf(E.capsulePolygon(line[i-1],line[i],r)));
 const {pieces}=E.subtractAll(square,obstacles);
 const distToLine=p=>Math.min(...line.slice(1).map((q,i)=>pointSegDist(p,line[i],q)));
 for(const pt of [[10,50],[50,50],[90,70],[5,50],[50,38],[90,82],[97.2,73.6]]){
  if(distToLine(pt)<r-.01)assert(!pieces.some(p=>E.inside(pt,p)),'point inside the true capsule was retained: '+pt);
 }
 assert(pieces.reduce((n,p)=>n+E.area(p),0)<10000-2000);
});
test('coastline subtraction removes the water polygon and keeps dry land',()=>{
 const water=[[780,0],[778,170],[808,390],[778,600],[792,800],[780,1000],[1000,1000],[1000,0]];
 const subject=[[700,0],[1000,0],[1000,1000],[700,1000]];
 const {pieces}=E.subtractAll(subject,E.convexParts(water).map(E.shapeOf));
 assert(pieces.length>0);
 assert(!pieces.some(p=>E.inside([900,500],p)),'water interior retained');
 let wet=0,total=0;
 for(let x=700.5;x<1000;x++)for(let y=.5;y<1000;y++){total++;if(E.inside([x,y],water))wet++;}
 const sampled=300000*(1-wet/total),retained=pieces.reduce((n,p)=>n+E.area(p),0);
 assert(Math.abs(retained-sampled)<2500,'retained '+retained+' vs sampled '+sampled);
});
test('a synthetic district divided by the river keeps land on both banks',()=>{
 const s={seed:'banks',options:E.options('city',{river:false,walls:false}),features:[{id:'r1',type:'river',points:[[500,0],[500,1000]],width:36}]};
 const d={id:'d1',type:'district',polygon:[[300,300],[700,300],[700,700],[300,700]],quarter:'commons',ward:'Commons'};
 const ctx=E.districtContext(s,d,E.sceneReservations(s));
 assert(ctx.dryArea>100000,'dry area '+ctx.dryArea);
 assert(ctx.pieces.some(p=>E.boundsOf(p).x1<500),'no west bank land');
 assert(ctx.pieces.some(p=>E.boundsOf(p).x0>500),'no east bank land');
 for(const p of ctx.pieces)for(const v of p)assert(Math.abs(v[0]-500)>=26-1e-3,'land inside the river corridor');
});

// ---- Step B: scene-level placement guarantees -------------------------------
const REPRO={sizeKm:2.4,shape:'random',shapeGuidance:44,rotation:0,districts:56,density:.1,chaos:.2,quarterDetail:.5,river:true,walls:true,coast:false,layout:'organic'};
const DENSE={...REPRO,districts:55,density:.7,chaos:.45,quarterDetail:.7};
const DETAIL={...REPRO,districts:40,density:.35,quarterDetail:1};
test('generated props clear every building, prop, road and water feature',()=>{
 for(const [name,opts] of Object.entries({repro:REPRO,dense:DENSE,detail:DETAIL})){
  const s=E.generate('city','silver-vale-42',opts);
  const buildings=s.features.filter(f=>f.type==='building'),props=s.features.filter(f=>f.quarterProp);
  assert(props.length>0,name+': no props were placed at all');
  const roads=s.features.filter(f=>f.type==='road'),rivers=s.features.filter(f=>f.type==='river'),waters=s.features.filter(f=>f.type==='water');
  const boxes=buildings.map(f=>({f,b:aabb(f.polygon)}));
  for(const p of props){
   const foot=E.symbolFootprint(p),fb=aabb(foot);
   for(const {f,b} of boxes){if(!aabbOverlap(fb,b))continue;assert(!satOverlap(foot,f.polygon),name+': prop '+p.id+' overlaps building '+f.id);}
   for(const rd of roads)assert(polylineDist(foot,rd.points)>=(rd.width+1.2)/2-1e-6,name+': prop '+p.id+' on road '+rd.id);
   for(const w of rivers)assert(polylineDist(foot,w.points)>=w.width/2+E.RIVER_BANK_GAP-1e-6,name+': prop '+p.id+' in river '+w.id);
   for(const w of waters)assert(!E.polygonsIntersect(foot,w.polygon),name+': prop '+p.id+' in water');
  }
  for(let i=0;i<props.length;i++)for(let j=i+1;j<props.length;j++){
   const a=E.symbolFootprint(props[i]),b=E.symbolFootprint(props[j]);
   if(aabbOverlap(aabb(a),aabb(b)))assert(!satOverlap(a,b),name+': props '+props[i].id+'/'+props[j].id+' overlap');
  }
 }
});
test('buildings are finite, simple, contained and clear of water, roads and each other',()=>{
 for(const [name,opts] of Object.entries({repro:REPRO,dense:DENSE})){
  const s=E.generate('city','silver-vale-42',opts);
  const buildings=s.features.filter(f=>f.type==='building');
  assert(buildings.length>0);
  const roads=s.features.filter(f=>f.type==='road'),rivers=s.features.filter(f=>f.type==='river');
  for(const b of buildings){
   const q=E.convexQuality(b.polygon);
   assert.equal(q.finite,true,name+': '+b.id+' not finite');
   assert.equal(q.simple,true,name+': '+b.id+' self-crossing');
   assert(q.area>0,name+': '+b.id+' has no area');
   assert(E.polygonInsidePolygon(b.polygon,s.city.boundary,.01),name+': '+b.id+' outside the envelope');
   for(const w of rivers)assert(polylineDist(b.polygon,w.points)>=w.width/2+E.RIVER_BANK_GAP-1e-3,name+': '+b.id+' in the river corridor');
   for(const rd of roads)assert(polylineDist(b.polygon,rd.points)>=(rd.width+1.2)/2-1e-3,name+': '+b.id+' on road '+rd.id);
  }
  const boxes=buildings.map(f=>({f,b:aabb(f.polygon)}));
  for(let i=0;i<boxes.length;i++)for(let j=i+1;j<boxes.length;j++){
   if(!aabbOverlap(boxes[i].b,boxes[j].b))continue;
   assert(!satOverlap(boxes[i].f.polygon,boxes[j].f.polygon),name+': buildings '+boxes[i].f.id+'/'+boxes[j].f.id+' overlap');
  }
  const river=s.features.find(f=>f.type==='river');
  assert(buildings.some(b=>b.x<E.boundsOf(river.points).x0),name+': no buildings west of the river');
  assert(buildings.some(b=>b.x>E.boundsOf(river.points).x1),name+': no buildings east of the river');
 }
});
test('props are placed when valid ground exists and suppressed at detail zero',()=>{
 const roomy=E.generate('city','roomy',{river:false,walls:false,quarters:['gardens','market','commons'],districts:36,density:.15,quarterDetail:1});
 assert(roomy.features.filter(f=>f.quarterProp).length>=10,'roomy fixture placed too few props');
 const bare=E.generate('city','roomy',{river:false,walls:false,quarters:['gardens'],districts:36,density:.15,quarterDetail:0});
 assert.equal(bare.features.filter(f=>f.quarterProp).length,0);
});
test('regeneration uses current scene geometry and replaces diagnostics',()=>{
 const s=E.generate('city','regen-scene',{river:false,walls:false,quarters:['commons','military'],buildings:['house','barracks','smithy'],districts:30});
 const d=s.features.find(f=>f.type==='district'&&f.quarter==='commons');
 const locked=s.features.find(f=>f.type==='building'&&f.ward===d.id);locked.locked=true;
 const snapshot=JSON.parse(JSON.stringify(locked)),c=E.center(d.polygon);
 const road=[[c[0]-15,c[1]],[c[0]+15,c[1]]];
 s.features.push({id:'edited-road',type:'road',points:road,width:4,roadType:'road'});
 E.regenerateDistrict(s,d.id,'military');
 E.validateScene(JSON.parse(JSON.stringify(s)));
 assert.deepEqual(s.features.find(f=>f.id===locked.id),snapshot,'locked building changed');
 assert.equal(new Set(s.features.map(f=>f.id)).size,s.features.length);
 const fresh=s.features.filter(f=>f.type==='building'&&f.ward===d.id&&!f.locked);
 assert(fresh.length>0,'regeneration produced no buildings');
 for(const b of fresh)assert(polylineDist(b.polygon,road)>=(4+1.2)/2-1e-3,'new building on the edited road');
 const first=s.city.generationDiagnostics[d.id];
 assert.equal(first.revision,d.revision);
 assert.equal(first.buildings.accepted,fresh.length);
 assert.equal(first.props.placed+first.props.unplaced,first.props.requested);
 E.regenerateDistrict(s,d.id,'military');
 const second=s.city.generationDiagnostics[d.id];
 assert.equal(second.revision,d.revision);
 assert.equal(second.buildings.accepted,s.features.filter(f=>f.type==='building'&&f.ward===d.id&&!f.locked).length);
 assert.equal(new Set(s.features.map(f=>f.id)).size,s.features.length);
});
test('city generation with diagnostics is deterministic and round-trips',()=>{
 const a=E.generate('city','silver-vale-42',REPRO),b=E.generate('city','silver-vale-42',REPRO);
 assert.deepEqual(a,b);
 assert.deepEqual(E.validateScene(JSON.parse(JSON.stringify(a))),a);
 assert(!JSON.stringify(a.city.generationDiagnostics).includes('Infinity'));
});

// ---- Step D: building geometry quality and roof fitting ---------------------
test('every generated building satisfies the named shape policy',()=>{
 for(const [name,opts] of Object.entries({repro:REPRO,dense:DENSE})){
  const s=E.generate('city','silver-vale-42',opts),buildings=s.features.filter(f=>f.type==='building');
  assert(buildings.length>0);
  for(const b of buildings){
   const q=E.convexQuality(b.polygon);
   assert.equal(q.finite,true,name+': '+b.id+' not finite');
   assert.equal(q.simple,true,name+': '+b.id+' self-crossing');
   assert(q.width>=E.MIN_BUILD_WIDTH-1e-6,name+': '+b.id+' width '+q.width);
   assert(q.aspect<=E.MAX_BUILD_ASPECT+1e-6,name+': '+b.id+' aspect '+q.aspect);
   assert(E.polygonInsidePolygon(b.polygon,s.city.boundary,.01),name+': '+b.id+' outside the envelope');
  }
 }
});
test('tip repair bevels an acute spike inside the original lot',()=>{
 const needle=[[0,0],[60,0],[30,6]];
 const fixed=E.repairBuildingFootprint(needle);
 assert(fixed.bevels>0,'no tip was beveled');
 assert(E.polygonInsidePolygon(fixed.polygon,needle,.001),'bevel left the original lot');
 assert(E.area(fixed.polygon)<E.area(needle));
 assert(E.convexQuality(fixed.polygon).minAngle>E.TIP_ANGLE,'acute tip survived');
 assert.equal(E.buildingShapeReason([[0,0],[10,0],[10,10],[0,10]]),null);
 assert.equal(E.buildingShapeReason([[0,0],[20,0],[20,2],[0,2]]),'width');
 assert.equal(E.buildingShapeReason([[0,0],[60,0],[60,3],[0,3]]),'aspect');
});
test('roof frame metadata keeps the fitted art inside the polygon',()=>{
 const s=E.generate('city','silver-vale-42',REPRO),buildings=s.features.filter(f=>f.type==='building');
 assert(buildings.length>0);
 for(const b of buildings){
  assert(Number.isFinite(b.roofCx)&&Number.isFinite(b.roofCy),b.id+' missing roof centre');
  const box=aabb(b.polygon);
  assert(b.roofCx>=box.x0-1e-6&&b.roofCx<=box.x1+1e-6&&b.roofCy>=box.y0-1e-6&&b.roofCy<=box.y1+1e-6,b.id+' roof centre outside its bounds');
  const th=(b.roofAngle||0)*Math.PI/180,cs=Math.cos(th),sn=Math.sin(th);
  for(const v of b.polygon){
   const u=(v[0]-b.roofCx)*cs+(v[1]-b.roofCy)*sn,w=-(v[0]-b.roofCx)*sn+(v[1]-b.roofCy)*cs;
   assert(Math.abs(u)<=b.roofWidth/2+1e-6&&Math.abs(w)<=b.roofHeight/2+1e-6,b.id+' vertex outside its roof frame');
  }
 }
 assert(buildings.some(b=>E.dist([b.roofCx,b.roofCy],[b.x,b.y])>.01),'no building needed an off-centre roof frame');
 const svg=R.render(s);
 assert(svg.includes('rotate(')&&!svg.includes('NaN'));
});
test('roof frame centre follows rotate, scale and translate',()=>{
 const s=E.generate('city','roof-transform',REPRO),f=s.features.find(f=>f.type==='building');
 const before=[f.roofCx,f.roofCy],angle=f.roofAngle,width=f.roofWidth,height=f.roofHeight,c=[f.x,f.y];
 const rad=15*Math.PI/180,cs=Math.cos(rad),sn=Math.sin(rad);
 const expected=[c[0]+(before[0]-c[0])*cs-(before[1]-c[1])*sn,c[1]+(before[0]-c[0])*sn+(before[1]-c[1])*cs];
 C.rotate(f,15);
 assert(Math.abs(f.roofAngle-(angle+15)%360)<1e-6);
 assert(E.dist([f.roofCx,f.roofCy],expected)<1e-9,'roof centre did not rotate with the polygon');
 C.scale(f,2);
 assert.equal(f.roofWidth,width*2);assert.equal(f.roofHeight,height*2);
 C.translate(f,5,-3);
 assert.equal(f.roofCx,2*expected[0]-c[0]+5);
 assert.equal(f.roofCy,2*expected[1]-c[1]-3);
});
test('imported legacy city geometry is preserved without quality repairs',()=>{
 const old=JSON.parse(fs.readFileSync(path.join(__dirname,'fixtures/v0.1-city.megamap.json'),'utf8'));
 const snapshot=JSON.parse(JSON.stringify(old));
 const loaded=C.validateAtlas(old),s=loaded.maps[0];
 assert.equal(s.features.filter(f=>f.type==='building').length,snapshot.features.filter(f=>f.type==='building').length);
 assert(s.features.filter(f=>f.type==='building').every(b=>Array.isArray(b.polygon)&&b.polygon.length>=3));
 assert(!s.features.some(f=>f.openSpace),'loading must not invent open space');
});

// ---- Step E: planned open space ---------------------------------------------
test('open programs plan coherent ground that buildings avoid',()=>{
 const quarters=['gardens','market','cemetery','farming'];
 const s=E.generate('city','open-space',{river:false,walls:false,quarters,buildings:['house'],districts:40,density:.3,quarterDetail:.8});
 const areas=s.features.filter(f=>f.openSpace),buildings=s.features.filter(f=>f.type==='building'),roads=s.features.filter(f=>f.type==='road');
 assert(areas.length>=4,'expected planned open space');
 assert.deepEqual(new Set(areas.map(a=>a.purpose)),new Set(quarters));
 for(const a of areas){
  assert.equal(a.type,'area');
  assert(a.polygon.length>=3&&E.area(a.polygon)>=E.MIN_OPEN_SPACE*.9);
  const d=s.features.find(f=>f.id===a.ward&&f.type==='district');
  assert(d,'open space without a district');
  assert(E.polygonInsidePolygon(a.polygon,d.polygon,.01),'open space leaves its district');
  assert(E.polygonsClearOf(a.polygon,roads.map(r=>E.shapeOf(r.points))),'open space covers a road');
  for(const b of buildings)assert(!E.polygonsIntersect(b.polygon,a.polygon),'building on reserved ground');
 }
 const props=s.features.filter(f=>f.quarterProp);
 assert(props.length>0,'no open-space detail was placed');
 for(const p of props){
  const own=areas.filter(a=>a.ward===p.ward);
  if(own.length)assert(own.some(a=>E.inside([p.x,p.y],a.polygon)),'open-space detail left its reservation');
 }
 // Detail density gates decoration, never the planned ground.
 const bare=E.generate('city','open-space',{river:false,walls:false,quarters,buildings:['house'],districts:40,density:.3,quarterDetail:0});
 assert.equal(bare.features.filter(f=>f.quarterProp).length,0);
 const bareAreas=bare.features.filter(f=>f.openSpace);
 assert(bareAreas.length>0,'open space disappeared at detail zero');
 const svg=R.render(bare,{layers:{districts:false,labels:false}});
 assert(svg.includes(R.pts(bareAreas[0].polygon)),'planned ground is not rendered with overlays off');
 // Non-open and unassigned plans reserve nothing.
 const closed=E.generate('city','closed-quarters',{river:false,walls:false,quarters:['military','noble'],buildings:['barracks'],districts:24,density:.3});
 assert.equal(closed.features.filter(f=>f.openSpace).length,0);
 const none=E.generate('city','no-quarters',{quarters:[]});
 assert.equal(none.features.filter(f=>f.openSpace).length,0);
 // An empty building whitelist keeps the ground surface.
 const noBuild=E.generate('city','open-nobuild',{river:false,walls:false,quarters:['gardens'],buildings:[],districts:24,density:.3});
 assert.equal(noBuild.features.filter(f=>f.type==='building').length,0);
 assert(noBuild.features.filter(f=>f.openSpace).length>0);
});
test('regeneration keeps planned open space and refreshes its diagnostics',()=>{
 const s=E.generate('city','regen-open',{river:false,walls:false,quarters:['gardens','military'],buildings:['greenhouse','barracks'],districts:26,density:.3,quarterDetail:.6});
 const d=s.features.find(f=>f.type==='district'&&f.quarter==='gardens');
 assert(s.features.some(f=>f.openSpace&&f.ward===d.id),'fixture planned no open space');
 E.regenerateDistrict(s,d.id,'gardens');
 const areas=s.features.filter(f=>f.openSpace&&f.ward===d.id);
 assert(areas.length>0,'regeneration dropped the planned ground');
 assert(s.features.filter(f=>f.quarterProp&&f.ward===d.id).length>0,'regeneration placed no detail');
 for(const b of s.features.filter(f=>f.type==='building'&&f.ward===d.id&&!f.locked))
  for(const a of areas)assert(!E.polygonsIntersect(b.polygon,a.polygon),'new building on reserved ground');
 assert.equal(s.city.generationDiagnostics[d.id].revision,d.revision);
});

// ---- Step F: waterfront assignment and content eligibility ------------------
test('water-dependent content requires actual water geometry',()=>{
 const dry=E.generate('city','ship-dry',{river:false,coast:false,walls:false,quarters:['docks'],buildings:['shipyard'],districts:26,density:.3,quarterDetail:.6});
 assert.equal(dry.features.filter(f=>f.type==='building').length,0,'inland shipyards must not exist');
 assert(!dry.features.some(f=>f.quarterProp&&E.WATER_PROPS.includes(f.asset)),'water-dependent detail was placed inland');
 assert(dry.city.warnings.some(w=>w.includes('Docks selected without water')));
 const wet=E.generate('city','ship-wet',{river:true,coast:false,walls:false,quarters:['docks'],buildings:['shipyard'],districts:26,density:.3,quarterDetail:.6});
 const ships=wet.features.filter(f=>f.buildingKind==='shipyard');
 assert(ships.length>0,'waterfront shipyards were not generated');
 for(const b of ships)assert(E.waterProximity(wet,b.polygon)<=E.WATERFRONT_GAP+1e-6,'shipyard away from water');
 for(const p of wet.features.filter(f=>f.quarterProp&&E.WATER_PROPS.includes(f.asset)))
  assert(E.waterProximity(wet,E.symbolFootprint(p))<=E.WATERFRONT_GAP+1e-6,'water-dependent detail away from water');
 const docksDistrict=wet.features.find(f=>f.type==='district'&&f.quarter==='docks');
 assert(wet.city.generationDiagnostics[docksDistrict.id].waterfront,'required docks district is not on the waterfront');
 // Open waterfront ground receives water-dependent detail, still inside the gap.
 const open=E.generate('city','dock-open',{river:true,coast:false,walls:false,quarters:['docks'],buildings:[],districts:26,density:.1,quarterDetail:1});
 const waterDetail=open.features.filter(f=>f.quarterProp&&E.WATER_PROPS.includes(f.asset));
 assert(waterDetail.length>0,'no water-dependent detail on open waterfront ground');
 for(const p of waterDetail)assert(E.waterProximity(open,E.symbolFootprint(p))<=E.WATERFRONT_GAP+1e-6,'water-dependent detail away from water');
 // Warehouses and storage detail remain legal inland.
 const ware=E.generate('city','ware-dry',{river:false,coast:false,walls:false,quarters:['docks'],buildings:['warehouse'],districts:26,density:.3,quarterDetail:.8});
 assert(ware.features.filter(f=>f.type==='building').length>0,'inland warehouses must exist');
 assert(ware.features.filter(f=>f.quarterProp).every(f=>!E.WATER_PROPS.includes(f.asset)));
 // Docks is still allocated exactly once when other programs are selected.
 const mixed=E.generate('city','mixed-quarters',{river:true,coast:false,walls:false,quarters:['docks','market','military'],buildings:['warehouse','shop','barracks'],districts:30,density:.3});
 assert(new Set(mixed.features.filter(f=>f.type==='district').map(f=>f.quarter)).size===3);
});
test('a river corridor crossing a building interior is rejected while its vertices are dry',()=>{
 const s={seed:'corridor',options:E.options('city',{river:false,walls:false}),city:{boundary:[[0,0],[1000,0],[1000,1000],[0,1000]],anchor:[500,500]},features:[{id:'r1',type:'river',points:[[500,0],[500,1000]],width:36}]};
 const d={id:'d1',type:'district',polygon:[[300,300],[700,300],[700,700],[300,700]],quarter:'commons',ward:'Commons'};
 const reservations=E.sceneReservations(s),occupancy=E.cityOccupancy(s),ctx=E.districtContext(s,d,reservations,occupancy);
 const straddle=[[460,400],[540,400],[540,430],[460,430]];
 assert(straddle.every(v=>E.waterProximity(s,[v,v],0)>0.5),'fixture vertices are not dry');
 assert.equal(E.buildingRejection(straddle,s,ctx,occupancy),'water');
 assert.equal(E.buildingRejection([[400,400],[460,400],[460,430],[400,430]],s,ctx,occupancy),null);
});
test('coastal water assigns docks to the shoreline and gates water-dependent kinds',()=>{
 const s=E.generate('city','coast-1',{river:false,coast:true,walls:false,quarters:['docks'],buildings:['shipyard','warehouse'],districts:30,density:.3,quarterDetail:.6});
 const docks=s.features.filter(f=>f.type==='district'&&f.quarter==='docks');
 assert(docks.length>0);
 assert(docks.some(d=>s.city.generationDiagnostics[d.id].waterfront),'no coastal docks fragment was found');
 const ships=s.features.filter(f=>f.buildingKind==='shipyard');
 assert(ships.length>0,'coastal shipyards were not generated');
 for(const b of ships)assert(E.waterProximity(s,b.polygon)<=E.WATERFRONT_GAP+1e-6,'coastal shipyard away from the shore');
});
test('regeneration preserves a locked rotated prop and keeps new detail clear of it',()=>{
 const s=E.generate('city','regen-props',{river:false,walls:false,quarters:['market','military'],buildings:['shop','barracks'],districts:26,density:.4,quarterDetail:1});
 const prop=s.features.find(f=>f.quarterProp);
 assert(prop,'fixture placed no prop to lock');
 prop.locked=true;prop.rotation=30;
 const snapshot=JSON.parse(JSON.stringify(prop)),d=s.features.find(f=>f.id===prop.ward);
 E.regenerateDistrict(s,d.id,d.quarter);
 assert.deepEqual(s.features.find(f=>f.id===prop.id),snapshot,'locked prop changed');
 assert(s.features.some(f=>f.openSpace&&f.ward===d.id),'regeneration dropped the open-space ground');
 const fresh=s.features.filter(f=>f.quarterProp&&f.ward===d.id&&f.id!==prop.id);
 assert(fresh.length>0,'regeneration placed no new detail');
 for(const p of fresh)assert(!E.polygonsIntersect(E.symbolFootprint(p),E.symbolFootprint(prop)),'new detail overlaps the locked prop');
 assert.equal(s.city.generationDiagnostics[d.id].revision,d.revision);
});
test('open-space detail respects the readable size floor and is placed when room exists',()=>{
 const s=E.generate('city','prop-fit',{river:false,walls:false,quarters:['gardens','market'],buildings:['house'],districts:36,density:.3,quarterDetail:1});
 let requested=0,placed=0;
 for(const k in s.city.generationDiagnostics){requested+=s.city.generationDiagnostics[k].props.requested;placed+=s.city.generationDiagnostics[k].props.placed;}
 assert(placed>=requested*.8,'open reservations should absorb most detail: '+placed+'/'+requested);
 const props=s.features.filter(f=>f.quarterProp);
 assert(props.length>0);
 for(const p of props)assert(p.size>=E.PROP_MIN_SIZE-1e-9,'prop below the readable size floor');
});
test('seed, layout, envelope and water matrix keeps every placement guarantee',()=>{
 const seeds=['silver-vale-42','ashford-7','briar-19','stone-watch-3','moon-ford-88'];
 const shapes=['random','square','l-shape','t-shape','ribbon'],layouts=['organic','planned','radial'];
 for(let i=0;i<seeds.length;i++){
  const opts={shape:shapes[i%shapes.length],shapeGuidance:i%2?55:100,rotation:i%3?0:75,districts:30+i*6,density:i%2?.85:.25,chaos:.4,quarterDetail:i%2?1:0,river:i%2===0,coast:i%3===0,walls:true,layout:layouts[i%3]};
  const s=E.generate('city',seeds[i],opts);
  E.validateScene(JSON.parse(JSON.stringify(s)));
  const svg=R.render(s);
  assert(!/NaN|Infinity|undefined/.test(svg),seeds[i]+': bad SVG');
  const ids=svg.match(/\sid="[^"]+"/g)||[];
  assert.equal(new Set(ids).size,ids.length,seeds[i]+': duplicate SVG ids');
  const buildings=s.features.filter(f=>f.type==='building'),roads=s.features.filter(f=>f.type==='road'),rivers=s.features.filter(f=>f.type==='river');
  const boxes=buildings.map(b=>({b:aabb(b.polygon),f:b}));
  for(const b of buildings){
   const q=E.convexQuality(b.polygon);
   assert(q.width>=E.MIN_BUILD_WIDTH-1e-6,seeds[i]+': narrow building '+b.id);
   assert(q.aspect<=E.MAX_BUILD_ASPECT+1e-6,seeds[i]+': pointed building '+b.id);
   assert(E.polygonInsidePolygon(b.polygon,s.city.boundary,.01),seeds[i]+': building outside the envelope');
   for(const w of rivers)assert(polylineDist(b.polygon,w.points)>=w.width/2+E.RIVER_BANK_GAP-1e-3,seeds[i]+': building in the river');
   for(const rd of roads)assert(polylineDist(b.polygon,rd.points)>=(rd.width+1.2)/2-1e-3,seeds[i]+': building on a road');
  }
  for(const p of s.features.filter(f=>f.quarterProp)){
   const foot=E.symbolFootprint(p),fb=aabb(foot);
   for(const {b,f} of boxes){if(!aabbOverlap(fb,b))continue;assert(!satOverlap(foot,f.polygon),seeds[i]+': prop on building');}
   for(const w of rivers)assert(polylineDist(foot,w.points)>=w.width/2+E.RIVER_BANK_GAP-1e-6,seeds[i]+': prop in the river');
   for(const rd of roads)assert(polylineDist(foot,rd.points)>=(rd.width+1.2)/2-1e-6,seeds[i]+': prop on a road');
  }
  // Diagnostics agree with the emitted features.
  let accepted=0,placed2=0;
  for(const k in s.city.generationDiagnostics){accepted+=s.city.generationDiagnostics[k].buildings.accepted;placed2+=s.city.generationDiagnostics[k].props.placed;}
  assert.equal(accepted,buildings.length,seeds[i]+': diagnostics disagree with buildings');
  assert.equal(placed2,s.features.filter(f=>f.quarterProp).length,seeds[i]+': diagnostics disagree with props');
 }
});
test('stress settings stay bounded, valid and consistent',()=>{
 for(const [name,opts] of Object.entries({
  blocks140:{sizeKm:2.4,districts:140,density:1,chaos:.6,quarterDetail:1,river:true,walls:true,layout:'organic'},
  tiny:{sizeKm:.5,districts:40,density:.8,quarterDetail:.8,river:true},
  huge:{sizeKm:8,districts:90,density:.6,quarterDetail:.7,river:true,coast:true}
 })){
  const started=performance.now(),s=E.generate('city','stress-'+name,opts),ms=performance.now()-started;
  E.validateScene(JSON.parse(JSON.stringify(s)));
  assert(!/NaN|Infinity/.test(R.render(s)),name+': bad SVG');
  assert(ms<15000,name+' took '+ms.toFixed(0)+'ms');
  const buildings=s.features.filter(f=>f.type==='building');
  let accepted=0;
  for(const k in s.city.generationDiagnostics)accepted+=s.city.generationDiagnostics[k].buildings.accepted;
  assert.equal(accepted,buildings.length,name+': diagnostics disagree with buildings');
  assert.equal(s.city.statistics.buildings,buildings.length,name+': statistics disagree with buildings');
 }
});
