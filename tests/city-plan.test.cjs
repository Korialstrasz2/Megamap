/* Semantic brush plan, local housing and wizard isolation acceptance. */
'use strict';
const test=require('node:test'),assert=require('node:assert/strict'),fs=require('node:fs');
const E=require('../src/engine'),C=E.CITY_STUDIO,P=C.PLAN,H=C.HOUSING,R=require('../src/render'),Perspective=require('../src/city-perspective'),Core=require('../src/editor-core');
const clone=x=>JSON.parse(JSON.stringify(x));
const make=(extra={},seed='paint-0')=>E.generate('fantasy',seed,{preset:'market',structureCount:100,relief:0,boatCount:0,cityPlan:P.example(),...extra});
const box=(x0,y0,x1,y1)=>[[x0,y0],[x1,y0],[x1,y1],[x0,y1]];
test('Brush masks use last-write-wins within layers, and water wins over district paint',()=>{
 const plan={version:1,strokes:[{role:'commons',width:250,points:[[500,500]]},{role:'sea',width:170,points:[[500,500]]},{role:'slums',width:120,points:[[500,500]]},{role:'erase-terrain',width:60,points:[[500,500]]}]},d=P.compile(plan),i=P.cell([500,500]);assert.equal(d.zones[i],P.CODES.slums);assert.equal(d.terrain[i],0);assert.equal(d.terrain[P.cell([560,500])],2);assert.equal(d.zones[P.cell([10,10])],0);
 assert.deepEqual(d,P.compile(plan));assert.deepEqual(plan,clone(plan));
});
test('Erasers cut earlier roads in their own layer, not walls or future roads',()=>{
 const d=P.compile({version:1,strokes:[{role:'road',width:10,points:[[100,500],[900,500]]},{role:'wall',width:6,points:[[100,500],[900,500]]},{role:'erase-roads',width:120,points:[[500,500]]},{role:'road',width:10,points:[[500,400],[500,600]]}]});assert.equal(d.roads.length,3);assert.equal(d.walls.length,1);assert(d.roads[0].points.at(-1)[0]<450);assert(d.roads[1].points[0][0]>550);
});
test('Painted plan import rejects unbounded, malformed and executable-looking data',()=>{
 for(const v of [null,{}, {version:2,strokes:[]},{version:1,strokes:Array(241).fill({role:'river',width:20,points:[[1,1]]})},{version:1,strokes:[{role:'<script>',width:20,points:[[1,1]]}]},{version:1,strokes:[{role:'sea',width:Infinity,points:[[1,1]]}]},{version:1,strokes:[{role:'sea',width:20,points:[[NaN,1]]}]},{version:1,strokes:[{role:'sea',width:20,points:[[1001,1]]}]}])assert.throws(()=>P.normalize(v));
 assert.throws(()=>make({cityPlan:{version:1,strokes:[]}}),/Paint at least/);
});
test('A sea island stays dry in collision geometry and generated editable water',()=>{
 const raw={version:1,strokes:[{role:'sea',width:280,points:[[500,500]]},{role:'erase-terrain',width:90,points:[[500,500]]}]},c=P.compile(raw),g={paintWater:{n:P.N,cells:c.terrain}};
 assert(!P.waterAt(g,[500,500]));assert(P.waterAt(g,[590,500]));assert(P.waterAt(g,[590,500],-5));assert(!P.rectangles(c.terrain).some(b=>C.inside([500,500],b.polygon)));
 assert(P.touches(box(450,450,620,620),c.terrain,x=>!!x,C));assert(!P.touches(box(490,490,510,510),c.terrain,x=>!!x,C));
});
test('Every painted building footprint stays in its own painted district and clear of water',()=>{
 for(const seed of ['paint-0','paint-1','paint-2']){const s=make({},seed);E.validateScene(s);const st=s.cityStudio,buildings=s.features.filter(f=>f.type==='building');assert(buildings.length>40);
 for(const f of buildings){const w=st.neighborhoods.find(w=>w.feature===f.ward);assert(P.fits(s,f.polygon,C,w),f.id+' escapes district');assert(!P.touches(f.polygon,st.ground.paintWater.cells,x=>!!x,C));assert.equal(f.quarter,w.quarter);assert(s.features.some(p=>p.cityRole==='access'&&p.cityBuilding===f.id));}
 assert(s.features.filter(f=>f.cityRole==='civic').every(f=>f.cityComplex),'Painted civic buildings belong to fitted complexes, not unpainted preset landmarks');assert(!s.population);assert(s.features.every(f=>!f.notes));}
});
test('Painted rich and poor districts receive their requested building programs and construction differences',()=>{
 const s=make({structureCount:160});const poor=s.features.filter(f=>f.type==='building'&&f.quarter==='slums'),rich=s.features.filter(f=>f.type==='building'&&f.quarter==='noble');assert(poor.length>10);assert(rich.length>5);assert(poor.every(f=>f.cityWealth==='modest'));assert(rich.every(f=>f.cityWealth==='affluent'));
 const average=a=>a.reduce((v,f)=>v+C.area(f.polygon),0)/a.length;assert(average(rich)>average(poor)*2);assert(new Set(poor.map(f=>f.cityMaterial)).size>=2);assert(rich.some(f=>f.cityForm==='court'));
 for(const w of s.cityStudio.neighborhoods.filter(w=>!P.OPEN.has(P.CODES[w.paintRole])))assert(w.target>0,w.id+' starved');
});
test('Roads drawn across a river become explicit bridges and across walls become real openings',()=>{
 const s=make(),bridge=s.features.find(f=>f.cityPainted&&f.cityRole==='bridge');assert(bridge);assert(bridge.cityDeck);const walls=s.features.filter(f=>f.type==='wall'&&f.cityPainted);assert(walls.length>=2);for(const w of walls)for(const p of w.points)assert(C.lineDistance(p,[[325,80],[325,900]])>7);
 assert(C.buildGraph(s).components.length===1,'Expected connected example roads');
});
test('A road ending in the sea is not a giant fabricated bridge',()=>{
 const p=P.example();p.strokes.push({role:'road',width:12,points:[[700,900],[990,900]]});const s=make({cityPlan:p});assert(s.cityStudio.warnings.some(w=>w.includes('wet section')));assert(!s.features.filter(f=>f.cityRole==='bridge').some(f=>C.lineDistance([970,900],f.points)<20));
});
test('Open parks and squares remain open, including erased district holes',()=>{
 const p=P.example();p.strokes.push({role:'square',width:95,points:[[400,390]]},{role:'erase-districts',width:70,points:[[330,650]]});const s=make({cityPlan:p});for(const f of s.features.filter(f=>f.type==='building')){assert(!C.inside([400,390],f.polygon));assert(!C.inside([330,650],f.polygon));}assert(s.features.some(f=>f.cityRole==='paint-open'&&f.citySurface==='paving'));
});
test('The same painted plan and seed reproduce exactly, without changing the draft',()=>{const p=P.example(),before=JSON.stringify(p),a=make({cityPlan:p}),b=make({cityPlan:p});assert.equal(JSON.stringify(a),JSON.stringify(b));assert.equal(JSON.stringify(p),before);assert.notEqual(JSON.stringify(a.features),JSON.stringify(make({cityPlan:p},'other').features));});
test('Painted geometry, brush program and climate survive atlas roundtrip without regeneration',()=>{const s=make({climate:'cold'}),before=JSON.stringify(s.features),atlas={format:'megamap-atlas',version:1,maps:[s],active:0,library:[]};const saved=Core.validateAtlas(clone(atlas)).maps[0];assert.deepEqual(saved.options.cityPlan,s.options.cityPlan);assert.equal(JSON.stringify(saved.features),before);assert.equal(saved.options.climate,'cold');});
test('Painted masks and housing metadata reject malformed imports',()=>{const s=make();for(const mutate of [x=>x.cityStudio.paintPlan.cellWard[0]=500,x=>x.cityStudio.ground.paintWater.cells[0]=99,x=>x.cityStudio.paintPlan.zones.pop(),x=>x.features.find(f=>f.type==='building').cityPitch=20,x=>x.options.cityPlan.version=2]){const bad=clone(s);mutate(bad);assert.throws(()=>E.validateScene(bad));}});
test('Painted neighborhood regeneration preserves locked objects and other neighborhoods',()=>{const s=make(),w=s.cityStudio.neighborhoods.find(w=>w.quarter==='slums'),locked=s.features.find(f=>f.type==='building'&&f.ward===w.feature);locked.locked=true;const before=clone(locked),others=s.features.filter(f=>f.id!==w.feature&&f.ward!==w.feature&&!['roof-route','tunnel'].includes(f.cityRole)).map(clone);E.regenerateDistrict(s,w.feature,'commons');E.validateScene(s);assert.deepEqual(s.features.find(f=>f.id===locked.id),before);for(const f of others)assert.deepEqual(s.features.find(x=>x.id===f.id),f);for(const f of s.features.filter(f=>f.type==='building'&&f.ward===w.feature))assert(P.fits(s,f.polygon,C,w));});
test('Cold, hot-dry, humid and temperate housing use distinct constructions, not just palettes',()=>{
 const designs=new Map();for(const climate of H.CLIMATES.filter(c=>c!=='auto')){const r=C.rng('climate'),a=[];for(let i=0;i<35;i++)a.push(H.parcel({culture:'vernacular',climate},'commons',{kind:'house',width:1,depth:1,gapM:1,setbackM:1,floors:2},r));designs.set(climate,a);assert(new Set(a.map(x=>x.material)).size>1);}
 assert(designs.get('cold').every(x=>x.pitch>.5&&x.roof!=='flat'));assert(designs.get('hot-dry').every(x=>x.roof==='flat'&&x.pitch===0));assert(designs.get('hot-humid').every(x=>x.detail==='veranda'));assert(designs.get('temperate').some(x=>x.roof==='hip'));
});
test('Top-down and 2.5D both reflect climate/wealth metadata, with unchanged stored geometry',()=>{for(const climate of ['cold','hot-dry','hot-humid']){const s=make({structureCount:60,climate}),before=JSON.stringify(s.features),svg=R.render(s),view=Perspective.render(s);assert(svg.includes('data-housing-climate="'+climate+'"'));assert(svg.includes('data-housing-wealth="modest"'));assert(view.includes('data-city-perspective'));assert(view.includes(climate==='hot-dry'?'data-roof-face="flat"':'data-roof-face="pitched"'));assert(!/NaN|undefined/.test(view));assert.equal(JSON.stringify(s.features),before);}});
test('Wizard-only planner never exposes a sidebar control or reuses a stored plan implicitly',()=>{const wizard=fs.readFileSync('src/wizard.js','utf8'),app=fs.readFileSync('src/app.js','utf8'),ui=fs.readFileSync('src/city-ui.js','utf8');assert(wizard.includes("id:'paint-plan'"));assert(app.includes('delete opts.cityPlan'));assert(app.includes('MegamapCityPaint?.currentPlan()'));assert(!ui.includes('cityPaint'));assert(!ui.includes('data-opt="cityPlan"'));assert.equal(C.normalize({climate:'invalid'}).climate,'auto');});
