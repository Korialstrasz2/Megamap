'use strict';
const test=require('node:test'),assert=require('node:assert/strict'),fs=require('node:fs'),path=require('node:path'),vm=require('node:vm');
const E=require('../src/engine.js'),B=require('../src/battle.js'),P=require('../src/encounter-content.js'),A=require('../src/assets.js'),R=require('../src/render.js'),C=require('../src/editor-core.js'),UI=require('../src/battle-ui.js');
const make=(theme,options={})=>E.generate('battle','encounter-regression-'+theme,{theme,...options});
const outdoors=P.presets.filter(p=>p.outdoor);
function propsSafe(s){
 const fs=s.features.filter(f=>f.battleFootprint),b=s.battle;
 for(let i=0;i<fs.length;i++){
  const f=fs[i];assert(f.battleFootprint.every(p=>E.pointOnOrInside(p,b.boundary,.001)),'prop outside envelope');
  for(let j=i+1;j<fs.length;j++)assert(!E.polygonsIntersect(f.battleFootprint,fs[j].battleFootprint),'overlapping props');
  const q=b.rooms.find(q=>q.key===f.roomKey);
  if(q){const box=[[q.x,q.y],[q.x+q.w,q.y],[q.x+q.w,q.y+q.h],[q.x,q.y+q.h]].map(p=>p.map(n=>n*s.gridSize));assert(f.battleFootprint.every(p=>E.pointOnOrInside(p,box,.001)),'prop crosses room wall');}
 }
}
function dryRoute(s){
 const b=s.battle,l=b.landscape,g=s.gridSize,wet=new Set(b.waterCells),reserved=new Set(b.circulation);
 assert(l&&l.route.length>=2);assert.equal(b.rooms.length,0);assert.equal(b.plan.length,0);assert.equal(b.diagnostics.requested,0);assert.equal(b.diagnostics.placed,0);
 assert(!s.features.some(f=>f.type==='room'||f.type==='portal'));assert.deepEqual(E.wallSegments(s),[]);
 for(const i of reserved){assert(b.cells[i]);assert(!wet.has(i),'water covers reserved corridor');}
 for(const f of s.features.filter(f=>f.battleFootprint)){
  const xs=f.battleFootprint.map(p=>p[0]/g),ys=f.battleFootprint.map(p=>p[1]/g);
  for(let y=Math.floor(Math.min(...ys)+1e-6);y<Math.ceil(Math.max(...ys)-1e-6);y++)for(let x=Math.floor(Math.min(...xs)+1e-6);x<Math.ceil(Math.max(...xs)-1e-6);x++)assert(!reserved.has(y*b.cols+x),'prop obstructs dry passage');
 }
 for(const f of s.features.filter(f=>f.polygon))assert(f.polygon.every(p=>E.pointOnOrInside(p,b.boundary,.001)),'terrain escapes boundary');
 const vtt=C.vttData(s,100,'');assert.equal(vtt.portals.length,0);assert.equal(vtt.line_of_sight.length,0);
}
test('Six additional selectable presets retain all twelve original battle types',()=>{assert.equal(P.presets.length,6);assert.equal(Object.keys(B.PLANS).length,18);assert.equal(outdoors.length,4);for(const p of P.presets){const o=E.options('battle',{theme:p.id});assert.equal(o.theme,p.id);assert.equal(o.cols,p.cols);assert.equal(o.rows,p.rows);assert.deepEqual(o.zones,p.zones);}});
for(const p of P.presets)test(p.id+': deterministic default, valid editable atlas and export',()=>{
 const s=make(p.id);E.validateScene(s);assert.deepEqual(make(p.id),s);propsSafe(s);
 const restored=C.validateAtlas({format:'megamap-atlas',version:1,active:0,maps:[JSON.parse(JSON.stringify(s))],library:[]}).maps[0];assert.deepEqual(restored.battle,s.battle);
 const svg=R.render(s);assert(svg.includes('<svg'));assert(!/NaN|undefined|<script/.test(svg));assert.equal(s.battle.diagnostics.unplaced.length,0);
 if(p.outdoor)dryRoute(s);else{assert.equal(s.battle.rooms.length,13);assert(s.battle.courtyard);assert(s.features.some(f=>f.type==='portal'));assert(C.vttData(s,100,'').line_of_sight.length>0);}
});
test('Roomless encounters ignore stale room programs and display landscape controls',()=>{for(const p of outdoors){const o=B.normalize({theme:p.id,zones:['entrance','bedroom'],zoneDetails:[{label:'Old room'}]});assert.deepEqual(o.zones,[]);assert.deepEqual(o.zoneDetails,[]);const html=UI.render(o);assert(html.includes('data-outdoor-preview'));assert(!html.includes('data-zone-template'));assert(!html.includes('data-zone-card'));}});
test('All six themes support each grid and each outer envelope',()=>{for(const p of P.presets)for(const gridType of ['square','hex-flat','hex-pointy'])for(const mapShape of ['rectangle','hex-flat','hex-pointy']){const s=make(p.id,{gridType,mapShape,furnishing:.15});E.validateScene(s);assert.equal(s.options.gridType,gridType);assert.equal(s.options.mapShape,mapShape);if(p.outdoor)dryRoute(s);else if(s.battle.diagnostics.unplaced.length)assert(s.battle.diagnostics.warnings.length);}});
test('Outdoor entry rotation and extreme dimensions preserve dry routes',()=>{for(const p of outdoors)for(const entrySide of ['north','east','south','west'])for(const [cols,rows] of [[16,80],[80,16],[16,16]]){const s=make(p.id,{entrySide,cols,rows,routeWidth:4,clearingSize:8,furnishing:.1,mapShape:'hex-flat'});E.validateScene(s);assert.equal(s.battle.entrance.side,entrySide);dryRoute(s);}});
test('Zero density removes props, not the landscape, road or reserved space',()=>{for(const p of outdoors){const a=make(p.id,{furnishing:0}),b=make(p.id,{furnishing:1});assert.equal(a.features.filter(f=>f.battleProp).length,0);assert(b.features.some(f=>f.battleProp));assert.deepEqual(a.battle.landscape,b.battle.landscape);assert(a.features.some(f=>f.type==='road'));dryRoute(a);}});
test('Marsh and cove contain editable water while every default retains a landmark',()=>{for(const p of outdoors){const s=make(p.id);assert(s.features.some(f=>P.assets.some(a=>a.id===f.asset)));if(['marsh-causeway','coastal-cove'].includes(p.id)){assert(s.battle.waterCells.length>0);assert(s.features.some(f=>f.type==='water'));}}});
test('All 32 new assets have distinct vector art, footprints and shipped SVG files',()=>{assert.equal(P.assets.length,32);assert.equal(new Set(P.assets.map(a=>a.body)).size,32);for(const a of P.assets){assert(A.catalog.some(x=>x.id===a.id));assert(P.footprints[a.id].every(n=>n>0&&Number.isFinite(n)));const f=path.join(__dirname,'../assets/svg',a.id+'.svg');assert(fs.existsSync(f));assert.equal(fs.readFileSync(f,'utf8'),R.assetFile(a.id));}});
test('New props retain physical footprints through rotate, move and scale edits',()=>{for(const theme of ['forest-road','mansion','castle']){const s=make(theme),f=s.features.find(f=>f.battleProp);assert(f);const before=JSON.stringify(f.battleFootprint);C.rotate(f,90);C.scale(f,.8);C.translate(f,1,2);assert.notEqual(JSON.stringify(f.battleFootprint),before);E.validateScene(s);}});
test('Landscape metadata rejects malformed imported values',()=>{for(const mutate of [s=>s.battle.landscape.route=[[NaN,0],[1,1]],s=>s.battle.landscape.ground='javascript',s=>s.battle.landscape.kind='dungeon',s=>s.battle.landscape.routeWidthFt=900,s=>s.battle.landscape.clearing=[]]){const s=make('forest-road');mutate(s);assert.throws(()=>E.validateScene(s),/Invalid battle/);}});
test('Every new preset, asset and room name has an Italian UI translation',()=>{const window={};vm.runInNewContext(fs.readFileSync(path.join(__dirname,'../src/i18n.js'),'utf8'),{window});const I=window.MegamapI18n;for(const x of [...P.presets,...P.assets,...Object.values(P.roles)])assert(I.isTranslated(x.name),'Missing Italian: '+x.name);for(const key of ['Landscape','No rooms','Arrival side','Route width (5 ft units)','Terrain variety','Cover and detail density'])assert(I.isTranslated(key),key);});
test('Six-map showcase is a valid self-contained editable atlas',()=>{const data=JSON.parse(fs.readFileSync(path.join(__dirname,'../examples/Six-new-encounters.megamap.json'),'utf8'));const a=C.validateAtlas(data);assert.deepEqual(a.maps.map(s=>s.options.theme),P.presets.map(p=>p.id));for(const s of a.maps){E.validateScene(s);assert(s.notes.includes('IT:'));}});
