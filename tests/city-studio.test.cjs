/* City Studio acceptance and safety regressions. Tests inspect stored geometry,
 * not screenshots alone. The existing engine predicates provide an independent
 * intersection implementation for placement assertions. GPL-3.0-only. */
'use strict';
const test=(name,fn)=>require('node:test')(name,async()=>{await new Promise(done=>setImmediate(done));return fn();}),assert=require('node:assert/strict'),crypto=require('node:crypto'),fs=require('node:fs'),vm=require('node:vm');
const E=require('../src/engine'),C=require('../src/city-studio'),Core=require('../src/editor-core'),R=require('../src/render'),CR=require('../src/city-render'),UI=require('../src/city-ui');
const clone=x=>JSON.parse(JSON.stringify(x)),make=(preset='market',extra={},seed='qa-0')=>E.generate('fantasy',seed,{preset,...extra});
const buildings=s=>s.features.filter(f=>f.type==='building'),byId=s=>new Map(s.features.map(f=>[f.id,f]));
function geometryCheck(s){
 E.validateScene(s);const ix=new C.Index(),all=byId(s),g=s.cityStudio.ground;
 for(const b of buildings(s)){
  assert(b.polygon.every(p=>E.pointOnOrInside(p,s.cityStudio.boundary,.001)),b.id+' envelope');
  assert(C.dryPolygon(g,b.polygon,0),b.id+' dry footprint');assert(C.currentWaterClear(s,b.polygon,0),b.id+' visible water');
  for(const prev of ix.query(b.polygon))assert(!E.polygonsIntersect(b.polygon,prev.poly),b.id+' overlaps '+prev.value.id);
  ix.add(b.polygon,b);assert.equal(all.get(b.ward)?.type,'district');
 }
 const graph=C.buildGraph(s);assert.equal(graph.components.length,1,'All walkable streets, bridges, piers and access paths connect');
 for(const a of s.features.filter(f=>f.cityRole==='access')){
  const b=all.get(a.cityBuilding);assert(b,'Access references a building');assert(all.get(a.cityStreet),'Access references a street');
  assert(E.nearPolyline(a.points.at(-1),[...b.polygon,b.polygon[0]])<.01,'Access ends at footprint, not a fake roof center');
  assert(C.dryLine(g,a.points,0),'Access stays dry');
  for(let i=1;i<a.points.length;i++){
   const poly=C.corridor(a.points[i-1],a.points[i],a.width*.8);
   for(const hit of ix.query(poly))if(hit.value.id!==b.id)assert(!E.polygonsIntersect(poly,hit.poly),'Access blocked by '+hit.value.id);
  }
 }
 const roadIndex=new C.Index();for(const f of s.features.filter(f=>f.type==='road'&&!['access','roof-route','tunnel','pier','bridge'].includes(f.cityRole))){assert(C.dryLine(g,f.points,f.width/2),'Street crosses water without bridge: '+f.id);for(let i=1;i<f.points.length;i++)roadIndex.add(C.corridor(f.points[i-1],f.points[i],f.width*.95),f);}
 for(const b of buildings(s))for(const hit of roadIndex.query(b.polygon))assert(!E.polygonsIntersect(b.polygon,hit.poly),'Building blocks road '+hit.value.id);
 assert(s.features.every(f=>!f.notes),'No generated narratives');assert(!('population' in s));assert.equal(s.notes,'');
 assert(s.features.length<40000);assert.equal(new Set(s.features.map(f=>f.id)).size,s.features.length);
}
function shipsCheck(s){const g=s.cityStudio.ground,ix=new C.Index();
 for(const f of s.features.filter(f=>f.cityDeck))for(let i=1;i<f.points.length;i++)ix.add(C.corridor(f.points[i-1],f.points[i],f.width),f);
 for(const f of s.features.filter(f=>f.cityRole==='vessel')){const poly=C.rect([f.x,f.y],f.size*2,f.size*2*f.cityBeam,f.rotation*Math.PI/180);
  assert(C.pathSamples([...poly,poly[0]],3).every(p=>C.waterAt(g,p,0)),'Entire vessel must be on water');
  for(const hit of ix.query(poly))assert(!E.polygonsIntersect(poly,hit.poly),'Boat overlaps deck or another boat');ix.add(poly,f);
 }
}
test('City Studio is a separate engine, with ten curated fantasy settings and compact defaults',()=>{
 assert.equal(C.PRESETS.length,10);assert.equal(new Set(C.PRESETS.map(p=>p.id)).size,10);assert.equal(C.normalize({}).hq,true);
 assert.equal(UI.sections(C.DEFAULTS).length,2);assert(UI.sections(C.DEFAULTS)[1].html.includes('<details'));
 const s=make();assert.equal(s.mode,'city');assert.equal(s.metadata.generator,'city-studio');assert.equal(s.cityStudio.version,1);
});
test('Legacy city output remains byte-identical to the pre-Studio engine',()=>{
 const s=E.generate('city','legacy-city-studio-check',{districts:18,buildings:['house','warehouse','temple']});
 assert.equal(crypto.createHash('sha256').update(JSON.stringify(s)).digest('hex'),'7be740e4f2c0144a1ef54ae3f741c1fe11cde59538c2f9e2b35033f404a7e97e');assert(!s.cityStudio);
});
for(const p of C.PRESETS)test(p.id+': repeated-seed geometry, road access, placement and ships',()=>{
 for(const seed of ['qa-0','qa-1']){const s=make(p.id,{},seed);geometryCheck(s);shipsCheck(s);assert(buildings(s).length>=s.cityStudio.resolved.count*.5,p.id+' usable yield');assert.equal(s.cityStudio.statistics.boats,p.boats);}
});
test('Four huts and three skiffs are exact across thirty distinct seeds',()=>{
 for(let i=0;i<30;i++){const s=make('fishing',{},'landing-'+i);assert.equal(buildings(s).length,4);assert(buildings(s).every(b=>b.buildingKind==='shack'));assert.equal(s.features.filter(f=>f.cityShip==='skiff').length,3);assert.equal(C.buildGraph(s).components.length,1);assert(!s.cityStudio.warnings.length);}
});
test('Fresh generation is deterministic; seeds genuinely change terrain, roads and plots',()=>{
 for(const p of ['council','fishing','market']){assert.deepEqual(make(p),make(p));assert.notDeepEqual(make(p,{},'different').features,make(p).features);}
});
test('HQ is an appearance-only toggle in every City Studio preset',()=>{
 for(const p of C.PRESETS){const rich=make(p.id),plain=make(p.id,{hq:false});assert.deepEqual(rich.features,plain.features);assert.deepEqual(rich.cityStudio.ground,plain.cityStudio.ground);}
 const s=make('council'),before=JSON.stringify(s);assert(R.render(s).includes('data-city-ground="hq"'));assert(R.render(s,{hq:false}).includes('data-city-ground="standard"'));assert.notEqual(R.render(s),R.render(s,{hq:false}));assert.equal(JSON.stringify(s),before);
});
test('Each architectural character has safe, palette-aware HQ and standard vectors',()=>{
 for(const culture of C.ENUMS.culture.slice(1)){const s=make('market',{size:'village',culture});for(const palette of Core.PALETTES){const svg=R.render(s,{palette});assert(!/NaN|undefined|<script|https?:\/\/(?!www\.w3\.org)/.test(svg));assert(svg.includes('data-city-ground'));}}
});
test('Courtyard and L-shaped buildings have genuine open geometry and derived roof wings',()=>{
 const s=make('oasis');const court=buildings(s).find(b=>b.cityForm==='court'),ell=buildings(make()).find(b=>b.cityForm==='ell');assert(court);assert(ell);
 const ground=s.features.find(f=>f.cityRole==='court'&&f.cityBuilding===court.id);assert(ground);assert(!E.inside(E.center(ground.polygon),court.polygon));assert(court.polygon.length>4);
 for(const f of [court,ell]){const p=CR.roofWings?CR.roofWings(f.polygon):null;if(p)assert(Math.abs(p.reduce((sum,x)=>sum+E.area(x),0)-E.area(f.polygon))<.2);const moved=clone(f);Core.rotate(moved,37);Core.translate(moved,21,-17);assert(!/NaN|undefined/.test(CR.building(moved,s,R.palettes.atlas,{hq:true,textures:true})));}
});
test('Grand civic compounds and neighborhood squares shape later streets',()=>{
 const s=make('river-capital'),civic=s.features.find(f=>f.cityRole==='civic');assert(civic);assert.equal(civic.buildingKind,'palace');assert.equal(civic.cityForm,'court');assert(E.area(civic.polygon)*s.scale*s.scale>2000);
 assert(s.cityStudio.reservations.some(z=>z.feature===civic.id&&z.blockRoad));assert(s.features.some(f=>f.cityRole==='neighborhood-square'));assert(R.render(s).includes('Imperial palace'));
});
test('Terrain relief is measured, flat is actually flat, and waterfront samples are low',()=>{
 const flat=make('council',{relief:0}),hill=make('council',{relief:180}),g=hill.cityStudio.ground;
 assert(flat.cityStudio.ground.heights.every(z=>z===0));assert.equal(Math.max(...g.heights)-Math.min(...g.heights),1);assert.equal(g.relief,180);
 assert.notDeepEqual(flat.features.filter(f=>f.type==='road'),hill.features.filter(f=>f.type==='road'));assert(new Set(buildings(hill).map(b=>Math.round(b.elevationM))).size>15);
 assert(hill.features.some(f=>f.cityRole==='retaining'));assert(!R.render(flat,{hq:false}).match(/data-city-ground[^]*?fill-rule="evenodd"[^]*?<\/g>/));
});
test('Organic, mixed and planned fabrics have distinct street geometry',()=>{
 const layouts=['organic','mixed','planned'].map(fabric=>make('market',{fabric}).features.filter(f=>f.type==='road'&&!['access','approach'].includes(f.cityRole)));
 for(let i=0;i<layouts.length;i++)for(let j=i+1;j<layouts.length;j++)assert.notDeepEqual(layouts[i],layouts[j]);
 geometryCheck(make('market',{fabric:'planned'}));
});
test('Strict envelopes constrain footprints without forbidding external approaches',()=>{
 for(const envelope of ['oval','rectangle','ribbon']){const s=make('market',{envelope});for(const b of buildings(s))assert(b.polygon.every(p=>E.pointOnOrInside(p,s.cityStudio.boundary,.001)));assert(s.features.some(f=>f.cityRole==='approach'));E.validateScene(s);}
});
test('Historical layers are optional physical remnants, not generated lore',()=>{
 const modern=make('citadel',{history:'none'}),old=make('citadel',{history:'layered'}),ancient=make('colossus',{history:'ancient'});
 assert(!modern.features.some(f=>['old-wall','ruin'].includes(f.cityRole)));assert(old.features.some(f=>f.cityRole==='old-wall'));assert(ancient.features.some(f=>f.cityRole==='ruin'));assert(old.features.every(f=>!f.notes));
});
test('Fantasy landmarks reserve real land and divert the network',()=>{
 for(const wonder of ['great-tree','crater','colossus','crystal']){const s=make('market',{wonder});geometryCheck(s);assert(s.features.some(f=>f.citySymbol===wonder||f.cityRole===wonder));assert.notDeepEqual(s.features.filter(f=>f.type==='road'),make('market',{wonder:'none'}).features.filter(f=>f.type==='road'));}
});
test('Rooftop routes connect actual roof edges across short gaps; underground is opt-in',()=>{
 const s=make('market',{rooftops:true,underground:true}),all=byId(s),roof=s.features.filter(f=>f.cityRole==='roof-route'),tunnels=s.features.filter(f=>f.cityRole==='tunnel');assert(roof.length>5);assert(tunnels.length>0);
 for(const r of roof){assert(r.cityGapM>0&&r.cityGapM<=5);r.cityLinks.forEach((id,i)=>{const b=all.get(id);assert(b);assert(E.nearPolyline(r.points[i],[...b.polygon,b.polygon[0]])<.01);});}
 const plain=make();assert(!plain.features.some(f=>['roof-route','tunnel'].includes(f.cityRole)));const surface=R.render(s),roofView=R.render(s,{cityLevel:'rooftops'}),under=R.render(s,{cityLevel:'underground'});
 assert(!surface.includes('data-id="'+roof[0].id+'"'));assert(roofView.includes('data-id="'+roof[0].id+'"'));assert(!roofView.includes('data-id="'+tunnels[0].id+'"'));assert(under.includes('data-id="'+tunnels[0].id+'"'));
});
test('Impossible boat requests and constrained exact counts warn rather than overlap',()=>{
 const dry=make('citadel',{fleet:'armada',boatCount:12});assert.equal(dry.cityStudio.statistics.boats,0);assert(dry.cityStudio.warnings.some(w=>w.includes('No navigable water')));
 const tight=make('fishing',{structureCount:500,boatCount:0});assert(buildings(tight).length<500);assert(tight.cityStudio.warnings.some(w=>w.includes('500 requested structures')));assert.equal(tight.cityStudio.statistics.boats,0);
});
test('Options are normalized without accepting missing, unbounded or string booleans',()=>{
 const o=C.normalize({preset:'bogus',structureCount:1e50,boatCount:999,relief:-999,hq:'false',rooftops:'true',culture:'javascript:'});assert.equal(o.structureCount,2400);assert.equal(o.boatCount,40);assert.equal(o.relief,-1);assert.equal(o.hq,true);assert.equal(o.rooftops,false);assert.equal(o.culture,'recommended');assert.deepEqual(C.normalize(null),C.normalize({}));
});
test('Saves preserve stored geometry and both independent City engines',()=>{
 const studio=make('market',{rooftops:true,underground:true}),legacy=E.generate('city','legacy',{districts:12}),before=JSON.stringify(studio.features);
 const a=Core.validateAtlas(clone({format:'megamap-atlas',version:1,active:0,maps:[studio,legacy],library:[]}));assert.equal(JSON.stringify(a.maps[0].features),before);assert(a.maps[0].cityStudio);assert(!a.maps[1].cityStudio);assert.equal(a.maps[0].appearance.hq,true);assert.equal(Core.appearance({...legacy,appearance:{hq:true}}).hq,false);
});
test('Invalid Studio terrain, water, counters, plans and render metadata are rejected',()=>{
 const good=make('fishing');for(const mutate of [s=>s.cityStudio.version=99,s=>s.cityStudio.ground.heights[2]=NaN,s=>s.cityStudio.ground.shore=[],s=>s.cityStudio.ground.riverWidth=Infinity,s=>s.cityStudio.ground.landscape='bogus',s=>s.cityStudio.neighborhoods[0].center=[Infinity,1],s=>s.cityStudio.nextId=0,s=>s.cityStudio.reservations=[{polygon:[[0,0]],blockRoad:true}],s=>s.features[0].cityBeam=NaN,s=>s.cityStudio.boundary=[[0,0]],s=>s.cityStudio.neighborhoods[0].planAngle='x']){const s=clone(good);mutate(s);assert.throws(()=>E.validateScene(s),/City Studio/);}
});
test('Neighborhood regeneration preserves locked buildings, their doors and other wards',()=>{
 const s=make(),ward=s.cityStudio.neighborhoods.find(w=>buildings(s).filter(f=>f.ward===w.feature&&f.cityRole!=='civic').length>12),locked=buildings(s).find(f=>f.ward===ward.feature&&f.cityRole!=='civic');locked.locked=true;locked.label='Keep exactly';locked.notes='User text';
 Core.translate(locked,2,0);const lockedBefore=JSON.stringify(locked),other=JSON.stringify(s.features.filter(f=>f.ward!==ward.feature&&f.id!==ward.feature)),path=clone(s.features.find(f=>f.cityBuilding===locked.id&&f.cityRole==='access'));
 E.regenerateDistrict(s,ward.feature,'noble');E.validateScene(s);assert.equal(JSON.stringify(s.features.find(f=>f.id===locked.id)),lockedBefore);assert.equal(JSON.stringify(s.features.filter(f=>f.ward!==ward.feature&&f.id!==ward.feature)),other);assert.deepEqual(s.features.find(f=>f.id===path.id),path);
 assert.equal(s.features.find(f=>f.id===ward.feature).quarter,'noble');assert.equal(new Set(s.features.map(f=>f.id)).size,s.features.length);
 const d=s.features.find(f=>f.id===ward.feature);d.locked=true;assert.throws(()=>E.regenerateDistrict(s,d.id,'commons'),/Unlock/);
});
test('Regeneration respects manually added roads, water and protected assets',()=>{
 const s=make(),ward=s.cityStudio.neighborhoods[0],p=ward.center;
 s.features.push({id:'custom-water',type:'water',polygon:C.rect([p[0]+28,p[1]],20,35)},{id:'custom-road',type:'road',points:[[p[0]-65,p[1]-15],[p[0]+65,p[1]-15]],width:7},{id:'keep-symbol',type:'asset',asset:'statue',x:p[0]-30,y:p[1]+20,size:9,locked:true});
 const existing=new Set(s.features.map(f=>f.id));E.regenerateDistrict(s,ward.feature,'commons');E.validateScene(s);
 for(const b of buildings(s).filter(f=>!existing.has(f.id))){assert(C.currentWaterClear(s,b.polygon,0));assert(!E.polygonsIntersect(b.polygon,C.corridor(s.features.find(f=>f.id==='custom-road').points[0],s.features.find(f=>f.id==='custom-road').points[1],7)));assert(!E.polygonsIntersect(b.polygon,C.circle([p[0]-30,p[1]+20],9,12)));}
 assert(s.features.some(f=>f.id==='keep-symbol'));
});
test('Player filtering and hostile labels are safe in normal and HQ exports',()=>{
 const s=make('council'),f=s.features.find(f=>f.cityRole==='civic');f.label='<script>alert(1)</script>';assert(!R.render(s).includes('<script>'));assert(R.render(s).includes('&lt;script&gt;'));f.gmOnly=true;assert(!R.render(s,{player:true}).includes('data-id="'+f.id+'"'));f.hidden=true;assert(!R.render(s).includes('data-id="'+f.id+'"'));
});
test('The city UI remains bilingual and adds no runtime network dependencies',()=>{
 const window={};vm.runInNewContext(fs.readFileSync(require.resolve('../src/i18n'),'utf8'),{window});window.MegamapI18n.register(UI.IT);
 for(const label of ['City Studio','City · legacy','Settlement size','Landscape setting','Exact overrides','Optional city layers','City view',...C.PRESETS.map(p=>p.name)])assert(window.MegamapI18n.isTranslated(label),label);
 for(const file of ['city-studio.js','city-render.js','city-ui.js'])assert(!/\bfetch\s*\(|XMLHttpRequest|WebSocket|https:\/\//.test(fs.readFileSync(require.resolve('../src/'+file),'utf8')),file);
});
test('Maximum explicit size stays bounded with a usable map and transparent diagnostics',()=>{
 const started=Date.now(),s=make('river-capital',{structureCount:2400,detail:'rich',rooftops:true,underground:true});E.validateScene(s);assert(buildings(s).length>600);assert(buildings(s).length<=2400);assert(s.features.length<40000);assert(Date.now()-started<30000);if(buildings(s).length<2400)assert(s.cityStudio.warnings.some(w=>w.includes('2400')));
});
