'use strict';
const test=require('node:test'),assert=require('node:assert/strict'),fs=require('node:fs'),path=require('node:path');
const E=require('../src/engine'),C=require('../src/editor-core'),R=require('../src/render'),A=require('../src/assets');
const copy=C.clone;
const city=(seed,opts={})=>E.generate('city',seed,{river:false,...opts});
function connected(s){const {cols,rows,cells}=s.battle,start=cells.indexOf(1);if(start<0)return false;const q=[start],seen=new Set(q);for(let k=0;k<q.length;k++){const i=q[k],x=i%cols,y=Math.floor(i/cols);for(const [dx,dy]of[[1,0],[-1,0],[0,1],[0,-1]]){const xx=x+dx,yy=y+dy,j=yy*cols+xx;if(xx>=0&&yy>=0&&xx<cols&&yy<rows&&cells[j]&&!seen.has(j)){seen.add(j);q.push(j);}}}return seen.size===cells.filter(Boolean).length;}
const count=(s,type)=>s.features.filter(f=>f.type===type);
for(const [shape] of E.CITY_SHAPES){
 test('Envelope '+shape+': 100 guidance confines buildings for three seeds',()=>{
  for(let i=0;i<3;i++){const s=city('shape-'+i,{shape,shapeGuidance:100,districts:35});E.validateScene(copy(s));assert(count(s,'building').length>0);
   for(const f of count(s,'building'))for(const p of f.polygon)assert(E.pointOnOrInside(p,s.city.boundary,.001),`${shape}: ${f.id} outside envelope`);
   const sum=count(s,'district').reduce((n,d)=>n+E.area(d.polygon),0);assert(Math.abs(sum-E.area(s.city.boundary))<.1,'Clipping must preserve the envelope area without holes or overlaps');
   for(const w of count(s,'wall'))for(const p of w.points)assert(E.nearPolyline(p,[...s.city.boundary,s.city.boundary[0]])<.001,'Wall is not on envelope');
  }
 });
 test('Envelope '+shape+': guidance 1 ignores selected shape',()=>{
  const o=E.options('city',{shape,shapeGuidance:1}),a=E.cityEnvelope('same-random',o),b=E.cityEnvelope('same-random',E.options('city',{shape:'random',shapeGuidance:1}));assert.deepEqual(a,b);
 });
}
test('Enforced square and L have the exact expected area',()=>{
 const a=city('exact',{shape:'square',shapeGuidance:100}),b=city('exact',{shape:'l-shape',shapeGuidance:100});assert(Math.abs(E.area(a.city.boundary)-640000)<.01);assert(Math.abs(E.area(b.city.boundary)-409600)<.01);
});
test('Shape strength and seed vary the silhouette; pure target is seed-independent',()=>{
 const outline=(seed,strength)=>E.cityEnvelope(seed,E.options('city',{shape:'rectangle',shapeGuidance:strength}));assert.notDeepEqual(outline('a',50),outline('b',50));assert.notDeepEqual(outline('a',1),outline('a',100));assert.deepEqual(outline('a',100),outline('b',100));
});
test('Intermediate concave shapes remain valid under rotation',()=>{
 for(const shape of ['l-shape','t-shape','ribbon'])for(const rotation of[15,75,180,285]){const s=city('rotate-'+rotation,{shape,shapeGuidance:55,rotation,districts:20});E.validateScene(s);assert(count(s,'district').length>=20);for(const b of count(s,'building'))assert(E.pointOnOrInside([b.x,b.y],s.city.boundary,.01));}
});
test('Guidance and other generator inputs are bounded and sanitized',()=>{
 const o=E.options('city',{shape:'<script>',shapeGuidance:900,quarters:['military','bogus','military'],buildings:['barracks','not-real'],districts:3});assert.equal(o.shape,'random');assert.equal(o.shapeGuidance,100);assert.equal(o.districts,12);assert.deepEqual(o.quarters,['military']);assert.deepEqual(o.buildings,['barracks']);assert.equal(E.options('city',{shapeGuidance:-3}).shapeGuidance,1);
});
test('Every enabled quarter appears; disabled quarters never appear',()=>{
 const selected=['military','noble','artisans','university'],s=city('quarter-subset',{quarters:selected});assert.deepEqual(new Set(count(s,'district').map(f=>f.quarter)),new Set(selected));
});
test('All fifteen requested quarters fit even with target 12 blocks',()=>{
 const selected=E.QUARTERS.map(q=>q.id),s=city('all-quarters',{quarters:selected,districts:12});assert.deepEqual(new Set(count(s,'district').map(f=>f.quarter)),new Set(selected));assert(count(s,'district').length>=15);
});
test('Building whitelist applies inside all quarter programs',()=>{
 const s=city('whitelist',{quarters:['military','noble','artisans'],buildings:['barracks','smithy']});const bs=count(s,'building');assert(bs.length>0);assert(bs.every(f=>['barracks','smithy'].includes(f.buildingKind)));assert(!bs.some(f=>f.buildingKind==='villa'));
});
test('An empty quarter selection generates a blank plot plan',()=>{
 const s=city('empty-quarters',{quarters:[]});assert.equal(count(s,'building').length,0);assert(count(s,'district').every(d=>d.quarter==='unassigned'));assert(s.city.warnings.length>0);
});
test('An empty building selection excludes every building but retains districts',()=>{
 const s=city('empty-buildings',{buildings:[]});assert.equal(count(s,'building').length,0);assert(count(s,'district').length>0);
});
test('Quarter detail at zero places no quarter props',()=>{
 const s=city('no-props',{quarterDetail:0});assert(!s.features.some(f=>f.quarterProp));
});
test('All procedural roof and quarter assets exist in the shipped library',()=>{
 for(const q of E.QUARTERS)for(const a of q.props)assert(A.byId[a],a);for(const b of E.BUILDING_TYPES)for(const a of b.assets)assert(A.byId[a],a);
});
test('Quarter programs produce distinct roof sets with valid district links',()=>{
 // Water is required: shipyards and fish markets are water-dependent kinds, and
 // this fixture must exercise their roofs rather than rely on the old dry-land
 // behaviour.
 const s=city('roof-variety',{river:true,quarters:E.QUARTERS.map(q=>q.id),districts:65}),bs=count(s,'building');assert(new Set(bs.map(f=>f.roofAsset)).size>=25);assert(new Set(bs.map(f=>f.buildingKind)).size>=20);
 assert(bs.some(f=>f.buildingKind==='shipyard'));assert(bs.some(f=>f.buildingKind==='fishmarket'));
 for(const b of bs){assert(A.byId[b.roofAsset]);const d=s.features.find(d=>d.type==='district'&&d.id===b.ward);assert(d);assert(E.pointOnOrInside([b.x,b.y],d.polygon,.01));assert(E.BUILDING_TYPES.some(t=>t.id===b.buildingKind));}
});
test('Quarter regeneration preserves other districts and locked geometry',()=>{
 const s=city('regenerate',{quarters:['commons','military'],buildings:['house','barracks','smithy']}),d=count(s,'district').find(f=>f.quarter==='commons'),locked=count(s,'building').find(f=>f.ward===d.id);locked.locked=true;const snapshot=copy(locked),others=copy(s.features.filter(f=>f.id!==d.id&&f.ward!==d.id));
 E.regenerateDistrict(s,d.id,'military');E.validateScene(s);assert.deepEqual(s.features.find(f=>f.id===locked.id),snapshot);assert.deepEqual(s.features.filter(f=>f.id!==d.id&&f.ward!==d.id),others);assert(s.features.filter(f=>f.type==='building'&&f.ward===d.id&&!f.locked).every(f=>['barracks','smithy'].includes(f.buildingKind)));
});
test('Regenerating an imported city repeatedly never duplicates IDs',()=>{
 let s=copy(city('loaded'));E.validateScene(s);const d=count(s,'district')[0];for(let i=0;i<3;i++)E.regenerateDistrict(s,d.id);assert.equal(new Set(s.features.map(f=>f.id)).size,s.features.length);E.validateScene(s);
});
test('Roof details follow building rotation and scale',()=>{
 const s=city('transform-roof'),f=count(s,'building')[0],angle=f.roofAngle,width=f.roofWidth,height=f.roofHeight;C.rotate(f,15);assert(Math.abs(f.roofAngle-(angle+15)%360)<1e-6);C.scale(f,2);assert.equal(f.roofWidth,width*2);assert.equal(f.roofHeight,height*2);
});
for(const [biome]of E.LOCAL_BIOMES){
 test('Local '+biome+': deterministic, 20 km, true mean and relief',()=>{
  const opts={biome,averageHeight:800,heightDiversity:750,roads:'none',homesteads:0},s=E.generate('local','survey',opts),same=E.generate('local','survey',opts);assert.deepEqual(s,same);E.validateScene(copy(s));assert.equal(s.scale,20);assert.equal(s.width,s.height);assert.equal(s.terrain.cellMeters,125);assert(Math.abs(s.terrain.meanM-800)<.001);assert(Math.abs(s.terrain.maxM-s.terrain.minM-750)<.002);assert.equal(count(s,'road').length,0);assert.equal(count(s,'settlement').length,0);assert(!count(s,'poi').some(f=>f.asset==='local-farmstead'));assert(!/NaN|undefined/.test(R.render(s)));
 });
}
test('Local survey can be completely flat with no caves, roads, farms or water',()=>{
 const s=E.generate('local','flat',{averageHeight:-50,heightDiversity:0,caves:0,roads:'none',water:'none',homesteads:0,detail:0});assert(s.terrain.elevationM.every(v=>v===-50));assert.equal(s.features.length,0);assert(!R.render(s).includes('NaN'));
});
test('Local roads are opt-in and obey the requested road style',()=>{
 for(const roads of ['footpath','road','network']){const s=E.generate('local','road-types',{roads,water:'none'}),a=count(s,'road');assert(a.length>0);assert(a.every(f=>f.roadType===(roads==='footpath'?'trail':'road')));assert(a.every(f=>Number.isFinite(f.widthMeters)));}
});
test('Cave counts are configurable and elevation is attached to each entrance',()=>{
 const a=E.generate('local','caves-off',{caves:0}),b=E.generate('local','caves-on',{caves:12});assert.equal(count(a,'poi').filter(f=>f.asset==='cave-mouth').length,0);assert.equal(count(b,'poi').filter(f=>f.asset==='cave-mouth').length,12);assert(count(b,'poi').every(f=>Number.isFinite(f.elevationM)));
});
test('Local isolated farms respect physical minimum spacing',()=>{
 const s=E.generate('local','sparse-farms',{homesteads:8,minSeparationKm:5,water:'none',roads:'none',caves:0}),farms=count(s,'poi').filter(f=>f.asset==='local-farmstead');assert(farms.length>=4);for(let i=0;i<farms.length;i++)for(let j=i+1;j<farms.length;j++)assert(E.dist([farms[i].x,farms[i].y],[farms[j].x,farms[j].y])/s.width*s.scale>=5);assert.equal(count(s,'settlement').length,0);
});
test('Elevation readout interpolates sample centers exactly',()=>{
 const s=E.generate('local','sample-coords',{}),t=s.terrain;for(const i of[0,100,10005,t.elevationM.length-1]){const p=[(i%t.n+.5)*s.width/t.n,(Math.floor(i/t.n)+.5)*s.height/t.n];assert(Math.abs(E.localElevation(s,p)-t.elevationM[i])<.001);}
});
test('Height CSV has all samples and uses correct metre-based coordinates',()=>{
 const s=E.generate('local','csv',{sizeKm:4}),lines=C.heightCSV(s).split('\r\n');assert.equal(lines.length,25601);assert.equal(lines[0],'column,row,easting_m,northing_m,elevation_m');const first=lines[1].split(',').map(Number);assert.equal(first[2],12.5);assert.equal(first[3],3987.5);assert.equal(first[4],s.terrain.elevationM[0]);
});
test('Height export rejects maps without surveyed elevations',()=>assert.throws(()=>C.heightCSV(E.generate('region','not-local',{}))));
test('All local water settings remain valid',()=>{
 for(const water of['none','stream','river','lake','coast']){const s=E.generate('local','wet-'+water,{water,biome:'coast',averageHeight:25,heightDiversity:180});E.validateScene(s);if(water==='none')assert(!s.features.some(f=>['river','water'].includes(f.type)));if(water==='river'||water==='stream')assert(count(s,'river').length>0);if(water==='lake')assert(count(s,'water').length===1);if(water==='coast')assert(s.terrain.minM<0&&s.terrain.maxM>0);}
});
test('Invalid elevation length, non-finite data and wrong spacing are rejected',()=>{
 const base=E.generate('local','bad-import',{});for(const mutate of [s=>s.terrain.elevationM.pop(),s=>s.terrain.elevationM[0]=Infinity,s=>s.terrain.cellMeters=4,s=>delete s.terrain.elevationM]){const s=copy(base);mutate(s);assert.throws(()=>E.validateScene(s));}
});
test('Local settings survive JSON atlas roundtrip',()=>{
 const s=E.generate('local','roundtrip-local',{roads:'network',biome:'desert',averageHeight:650,heightDiversity:350,caves:2});s.appearance={...C.appearance(s),terrainDisplay:'elevation',hillshade:false,grid:'hex-pointy',gridSpacingKm:.5};const a=C.validateAtlas(copy({format:'megamap-atlas',version:1,maps:[s],active:0}));assert.deepEqual(a.maps[0].options,s.options);assert.deepEqual(a.maps[0].terrain,s.terrain);assert.deepEqual(a.maps[0].appearance,s.appearance);
});
for(const type of E.GRID_TYPES){
 test(type+': grid shape persists and renders a matching overlay',()=>{
  const s=E.generate('battle','grid',{gridType:type});assert.equal(s.appearance.grid,type);const a=C.validateAtlas(copy(s));assert.equal(a.maps[0].appearance.grid,type);assert(R.render(s).includes(`data-grid="${type}"`));
 });
}
for(const type of ['hex-pointy','hex-flat']){
 test(type+': six nearest neighbors have exact 5 ft center spacing',()=>{
  const s=E.generate('battle','hex-math',{gridType:type}),spec=C.gridSpec(s),cells=C.hexCenters(s,type),c=cells.find(c=>c.row===8&&c.col===8),neighbors=cells.filter(p=>Math.abs(E.dist([p.x,p.y],[c.x,c.y])-spec.spacing)<1e-5);assert.equal(neighbors.length,6);for(const n of neighbors)assert(Math.abs(E.dist([n.x,n.y],[c.x,c.y])/s.width*s.scale-5)<1e-6);
 });
 test(type+': snapping returns actual grid centers',()=>{
  const s=E.generate('battle','hex-snap',{gridType:type}),cells=C.hexCenters(s,type);for(const p of[[125,330],[250,300],[422,678],[782,127]]){const snap=C.snapPoint(s,p,type);assert(cells.some(c=>E.dist([c.x,c.y],snap)<1e-7));const min=Math.min(...cells.map(c=>E.dist(p,[c.x,c.y])));assert(Math.abs(E.dist(p,snap)-min)<1e-6);}
 });
 test(type+': correct orientation and across-flat dimensions',()=>{
  const s=E.generate('battle','geometry',{gridType:type}),spec=C.gridSpec(s),poly=C.hexPolygon(0,0,spec.radius,spec.pointy),xs=poly.map(p=>p[0]),ys=poly.map(p=>p[1]);assert(Math.abs((spec.pointy?Math.max(...xs)-Math.min(...xs):Math.max(...ys)-Math.min(...ys))-spec.spacing)<1e-6);const top=poly.filter(p=>Math.abs(p[1]-Math.min(...ys))<1e-6);assert.equal(top.length,spec.pointy?1:2);
 });
 test(type+': play boundary trims maps and VTT walls consistently',()=>{
  const s=E.generate('battle','play-boundary',{theme:'dungeon',mapShape:type,gridType:type}),boundary=E.mapBoundary(s);assert.equal(boundary.length,6);assert(connected(s));assert.equal(C.canPlace(s,[1,1]),false);const v=C.vttData(s,100,'');assert.equal(v.megamap.grid.type,type);assert.equal(v.megamap.mapShape,type);for(const line of v.line_of_sight)for(const p of line)assert(E.pointOnOrInside([p.x*s.gridSize,p.y*s.gridSize],boundary,.001));
 });
}
test('Hex-cropped enclosed encounters retain connected floor for multiple themes',()=>{
 for(const theme of['dungeon','cave','tavern','ruins','ice-cave'])for(const mapShape of ['hex-pointy','hex-flat'])for(let seed=0;seed<4;seed++){const s=E.generate('battle','cropped-'+seed,{theme,mapShape,cols:32,rows:24});assert(connected(s),theme+' '+mapShape+' '+seed);E.validateScene(s);}
});
test('Grid metadata distinguishes movement grid from rectangular scene extent',()=>{
 const s=E.generate('battle','meta',{gridType:'hex-pointy',cols:40,rows:30}),m=C.gridMetadata(s);assert.equal(m.mapSizeUnits.width,200);assert.equal(m.mapSizeUnits.height,150);assert.equal(m.grid.distance,5);assert.equal(m.grid.units,'ft');assert(m.grid.originMapUnits.x>0);s.appearance.grid='none';assert.equal(C.gridMetadata(s).grid.type,'hex-pointy');assert.equal(C.gridSpec(s).hex,true);
});
test('Dense survey grids are bounded to a practical display spacing',()=>{
 const s=E.generate('local','dense',{sizeKm:40});s.appearance={grid:'hex-flat',gridSpacingKm:.0001};s.appearance=C.appearance(s);assert(s.appearance.gridSpacingKm>=40/150);assert(C.hexCenters(s).length<30000);
});
test('Region and local remain different generation modes at the same 20 km scale',()=>{
 const a=E.generate('region','modes',{}),b=E.generate('local','modes',{});assert.equal(a.scale,b.scale);assert(count(a,'settlement').length>0);assert.equal(count(b,'settlement').length,0);assert.equal(a.terrain.elevationM,undefined);assert(b.terrain.elevationM.length===25600);
});
test('The new asset inventory has 103 additions, each with a unique original body',()=>{
 const data=JSON.parse(fs.readFileSync(path.join(__dirname,'../docs/NEW_ASSETS_V12.json'),'utf8'));assert.equal(data.newAssets,103);assert.equal(data.totalAssets,246);assert.equal(new Set(data.assets.map(x=>A.byId[x.id].body)).size,103);
});

test('Narrow hex cave cannot become an empty map after boundary trimming',()=>{
 for(const mapShape of ['hex-pointy','hex-flat'])for(const theme of ['cave','ice-cave']){
  const s=E.generate('battle','extreme2',{mapShape,theme,cols:80,rows:16});
  assert(s.battle.cells.some(Boolean));
 }
});
