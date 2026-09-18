/* Locality, physical-detail, projection and backward-compatibility regressions. */
'use strict';
const test=require('node:test'),assert=require('node:assert/strict'),fs=require('node:fs'),path=require('node:path');
const E=require('../src/engine'),C=E.CITY_STUDIO,Ref=C.REFINEMENT,Core=require('../src/editor-core'),R=require('../src/render'),CR=require('../src/city-render'),A=require('../src/assets'),CA=require('../src/city-assets'),P=require('../src/city-perspective'),View=require('../src/city-view');
const make=(preset='market',extra={},seed='refine-0')=>E.generate('fantasy',seed,{preset,...extra}),clone=x=>JSON.parse(JSON.stringify(x));
test('Sixteen original city assets extend the library without replacing existing symbols',()=>{
 assert.equal(CA.assets.length,16);assert.equal(new Set(CA.assets.map(a=>a.body)).size,16);assert.equal(A.catalog.length,294);assert(A.categories.includes('City details'));
 for(const asset of CA.assets){assert(A.byId[asset.id]);assert(asset.heightM>=0);assert(CA.IT[asset.name]);for(const palette of Core.PALETTES){const svg=R.assetFile(asset.id,palette);assert(!/undefined|NaN|<script/.test(svg));assert(svg.includes(asset.id));}assert.equal(fs.readFileSync(path.join(__dirname,'../assets/svg',asset.id+'.svg'),'utf8'),R.assetFile(asset.id));}
});
test('Every origin has spatially assigned neighborhood identities without extra generator settings',()=>{
 for(const preset of C.PRESETS){const s=make(preset.id,{size:'town'});assert.equal(s.cityStudio.refinementVersion,1);for(const w of s.cityStudio.neighborhoods){assert(Ref.PROFILES[w.quarter]);assert(w.profile.name);assert.equal(w.profile.name,s.features.find(f=>f.id===w.feature).cityZone);if(w.quarter==='docks')assert(C.bankDistance(s.cityStudio.ground,w.center)<=125);}}
 assert.equal(require('../src/city-ui').sections(C.DEFAULTS).length,2);
});
test('Nordic and imperial districts retain different architectural mixes and material identities',()=>{
 const nordic=make('council'),imperial=make('river-capital');
 assert(nordic.cityStudio.neighborhoods.some(w=>w.profile.name==='Assembly terrace'));assert(imperial.cityStudio.neighborhoods.some(w=>w.profile.name==='Naval yards'));
 assert(nordic.features.filter(f=>f.type==='building'&&f.cityRole==='building').every(f=>f.cityFloors<=2));
 assert(new Set(imperial.features.filter(f=>f.type==='building').map(f=>f.cityMaterial).filter(Boolean)).size>=4);
 const v=imperial.cityStudio.neighborhoods.find(w=>w.quarter==='noble'),old=imperial.cityStudio.neighborhoods.find(w=>w.quarter==='oldtown');assert(v.profile.gap>old.profile.gap);assert(v.profile.lanes>old.profile.lanes);
});
test('Neighborhood profiles blend frontage activity with a quieter residential seam',()=>{
 const s=make(),ward=s.cityStudio.neighborhoods.find(w=>w.quarter==='market'),road={cityRole:'avenue'},r=C.rng('mix-test'),kinds=new Set(),floors=new Set();
 for(let i=0;i<150;i++){const x=Ref.parcel(s,ward,[ward.center[0]+i,ward.center[1]],road,r,{...C,KINDS:C.KINDS});kinds.add(x.kind);floors.add(x.floors);assert(x.gapM>=0);}
 assert(kinds.has('house')||kinds.has('townhouse'));assert(kinds.has('shop'));assert(floors.size>1);
});
test('Unique physical courts and working details do not intersect buildings, water or public streets',()=>{
 for(const preset of ['fishing','council','river-capital','oasis']){
  const s=make(preset),details=s.features.filter(f=>f.cityRole==='site-detail'),buildings=s.features.filter(f=>f.type==='building'),roads=s.features.filter(f=>f.type==='road'&&!['roof-route','tunnel'].includes(f.cityRole));assert(details.length>0);
  const ix=new C.Index();for(const b of buildings)ix.add(b.polygon,b);for(const road of roads)for(let i=1;i<road.points.length;i++)ix.add(C.corridor(road.points[i-1],road.points[i],road.width*.85),road);
  for(const f of details){const poly=C.rect([f.x,f.y],f.size*2,f.size*2,(f.rotation||0)*Math.PI/180);assert(C.dryPolygon(s.cityStudio.ground,poly,0));for(const hit of ix.query(poly))assert(!E.polygonsIntersect(poly,hit.poly),`${preset}: ${f.id} intersects ${hit.value.id}`);ix.add(poly,f);assert(CA.assets.some(a=>a.id===f.asset));}
  const sites=s.features.filter(f=>f.cityRole==='special-ground');for(const site of sites){assert(s.cityStudio.reservations.some(z=>z.feature===site.id));assert(s.features.some(f=>f.cityBuilding===site.id&&f.cityRole==='access'));}
 }
});
test('Small settlement is still exactly four huts and three skiffs, not a miniature city',()=>{
 for(let i=0;i<8;i++){const s=make('fishing',{},'refined-huts-'+i);assert.equal(s.cityStudio.statistics.buildings,4);assert.equal(s.cityStudio.statistics.boats,3);assert(!s.features.some(f=>f.cityRole==='special-ground'));assert(s.cityStudio.functionalDetails<=2);assert(!s.population);assert(s.features.every(f=>!f.notes));}
});
test('HQ roof materials and inset garden patterns are deterministic, palette-aware and appearance-only',()=>{
 const s=make('river-capital'),before=JSON.stringify(s.features),svg=R.render(s),plain=R.render(s,{hq:false}),muted=R.render(s,{textures:false});assert.notEqual(svg,plain);assert.notEqual(svg,muted);for(const m of CR.MATERIALS)assert(svg.includes('id="city-mat-'+m+'"'));assert(svg.includes('city-court-'));assert.equal(JSON.stringify(s.features),before);assert.equal(svg,R.render(s));
});
test('Signature sites, their detail and their approaches survive local building regeneration',()=>{
 const s=make('council'),site=s.features.find(f=>f.cityRole==='special-ground'),ids=s.features.filter(f=>f.id===site.id||f.cityBuilding===site.id).map(f=>f.id),before=s.features.filter(f=>ids.includes(f.id)).map(clone);
 E.regenerateDistrict(s,site.ward,'noble');E.validateScene(s);for(const old of before)assert.deepEqual(s.features.find(f=>f.id===old.id),old);assert.equal(C.buildGraph(s).components.length,1);
});
test('Malformed additive refinement metadata is rejected instead of reaching rendering',()=>{
 const good=make('fishing');for(const change of [s=>s.cityStudio.refinementVersion=99,s=>s.cityStudio.functionalDetails=-1,s=>s.cityStudio.neighborhoods[0].profile.gap=Infinity,s=>s.features[0].cityMaterial={}]){const s=clone(good);change(s);assert.throws(()=>E.validateScene(s),/City Studio/);}
});
test('Pre-refinement saved Studio maps are displayed without regenerating their geometry',()=>{
 const s=make('fishing');delete s.cityStudio.refinementVersion;delete s.cityStudio.functionalDetails;for(const w of s.cityStudio.neighborhoods)delete w.profile;for(const f of s.features){delete f.cityMaterial;delete f.cityZone;}
 const before=JSON.stringify(s.features);E.validateScene(s);assert.equal(JSON.stringify(s.features),before);assert(P.render(s).includes('data-city-perspective'));assert.equal(JSON.stringify(s.features),before);
});
test('2.5D projects real height and four different camera orientations, not a CSS skew',()=>{
 const cam=P.camera(),a=cam.project([100,200],0),b=cam.project([100,200],20);assert.equal(a[0],b[0]);assert(Math.abs(a[1]-b[1]-16)<1e-8);assert.notDeepEqual(a,P.camera(90).project([100,200],0));assert.equal(P.camera(-90).bearing,270);assert.equal(P.camera(NaN).bearing,0);
 const s=make('fishing'),before=JSON.stringify(s),views=[0,90,180,270].map(angle=>P.render(s,{},angle));assert.equal(new Set(views).size,4);assert(views.every(svg=>svg.includes('data-wall-face')&&svg.includes('data-roof-face="pitched"')));assert.equal(JSON.stringify(s),before);assert.equal(views[0],P.render(s));
});
test('2.5D shows terrain relief, pitched roofs, ships, trees and new city details together',()=>{
 const s=make('council'),svg=P.render(s);assert(svg.includes('data-terrain-face'));assert(svg.includes('data-vessel'));assert(svg.includes('data-sail'));assert(svg.includes('data-window'));assert(svg.includes('city-assembly-stones'));assert(!/NaN|undefined|<script/.test(svg));assert(P.elevation(s,[300,300])!==P.elevation(s,[600,650]));
});
test('Water is clipped to the actual map boundary before projection',()=>{
 const poly=P.clipMap([[-40,450],[1040,450],[1040,550],[-40,550]]);assert(poly.every(p=>p.every(x=>x>=0&&x<=1000)));assert.equal(C.area(poly),100000);assert.deepEqual(P.clipMap([[-50,-50],[-20,-50],[-20,-20]]),[]);
});
test('Concave courtyard and hand-edited roofs do not become solid rectangular roofs in 2.5D',()=>{
 const s=make('oasis',{size:'village'}),f=s.features.find(f=>f.type==='building'&&f.cityForm==='court');assert(f);const before=clone(f.polygon),svg=P.render(s);assert(svg.includes('data-roof-face="flat"'));assert.deepEqual(f.polygon,before);
 f.cityRoof='gable';f.polygon=[[100,100],[145,110],[130,150],[110,145]];const edited=P.render(s);assert(edited.includes('data-roof-face="custom"'));assert(!/NaN|undefined/.test(edited));
});
test('2.5D respects GM-only, hidden and disabled layers, including asset definitions',()=>{
 const s=make('fishing'),b=s.features.find(f=>f.type==='building'),a=s.features.find(f=>f.cityRole==='site-detail');b.gmOnly=true;b.label='Secret building';a.hidden=true;
 const svg=P.render(s,{player:true});assert(!svg.includes('data-id="'+b.id+'"'));assert(!svg.includes('data-id="'+a.id+'"'));assert(!svg.includes('Secret building'));
 const empty=P.render(s,{layers:Object.fromEntries(Object.keys(Core.DEFAULT_LAYERS).map(k=>[k,false]))});assert(!empty.includes('data-wall-face'));assert(!empty.includes('data-terrain-face="true"'));assert(!/NaN|undefined|Infinity/.test(empty));
});
test('Projection and normal exports escape hostile labels and keep imported rasters embedded',()=>{
 const s=make('council',{size:'village'}),f=s.features.find(f=>f.cityRole==='civic');if(f)f.label='<script>not-code</script>';s.title='"<img onerror=bad>';
 s.features.push({id:'safe-raster',type:'image',x:50,y:50,size:10,aspect:2,rotation:30,data:'data:image/png;base64,iVBORw0KGgo='});const svg=P.render(s);assert(!svg.includes('<script>'));assert(!svg.includes('<img '));assert(svg.includes('&lt;img'));assert(svg.includes('data:image/png;base64,'));assert(!/https?:\/\/(?!www\.w3\.org)/.test(svg));
});
test('Every cartographic palette has a valid standard and HQ perspective',()=>{
 const s=make('fishing');for(const palette of Core.PALETTES)for(const hq of [true,false]){const svg=P.render(s,{palette,hq});assert(svg.startsWith('<svg'));assert(!/NaN|undefined/.test(svg));assert(svg.includes('data-city-perspective="true"'));}
 assert.throws(()=>P.render(E.generate('city','old',{districts:12})),/City Studio/);
});
test('Capital projection has bounded output and does not mutate or exhaust the coordinate stack',()=>{
 const s=make('river-capital',{structureCount:2400}),before=JSON.stringify(s.features),start=Date.now(),svg=P.render(s);assert(svg.length<24000000);assert(Date.now()-start<15000);assert.equal(before,JSON.stringify(s.features));assert(svg.includes('data-wall-face'));
});
test('Perspective controls and new city asset labels have Italian translations',()=>{
 for(const key of ['2.5D city preview','Open 2.5D view','Rotate left','Rotate right','Back to map','Export 2.5D PNG'])assert(View.IT[key]);for(const [key,entry]of Object.entries(Ref.PROFILES))assert(entry.name&&(Ref.IT[entry.name]||['Villa gardens','Outer lanes','Memorial gardens'].includes(entry.name)),key);
});
