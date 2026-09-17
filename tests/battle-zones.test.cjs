'use strict';
const test=require('node:test'),assert=require('node:assert/strict');
const E=require('../src/engine.js'),C=require('../src/editor-core.js'),R=require('../src/render.js');
const copy=C.clone,battle=(seed='zones',options={})=>E.generate('battle',seed,options);
function connected(s){const {cols,rows,cells}=s.battle,start=cells.indexOf(1);if(start<0)return false;const q=[start],seen=new Set(q);for(let k=0;k<q.length;k++){const i=q[k],x=i%cols,y=Math.floor(i/cols);for(const[dx,dy]of[[1,0],[-1,0],[0,1],[0,-1]]){const xx=x+dx,yy=y+dy,j=yy*cols+xx;if(xx<0||yy<0||xx>=cols||yy>=rows||!cells[j]||seen.has(j))continue;seen.add(j);q.push(j);}}return seen.size===cells.filter(Boolean).length;}
const rooms=s=>s.features.filter(f=>f.type==='room');

test('Battle grid defaults to flat-top hex movement cells',()=>{
 const s=battle('default-grid');
 assert.equal(s.options.gridType,'hex-flat');
 assert.equal(s.appearance.grid,'hex-flat');
 const spec=C.gridSpec(s);
 assert.equal(spec.hex,true);assert.equal(spec.pointy,false);
 const poly=C.hexPolygon(0,0,spec.radius,spec.pointy),ys=poly.map(p=>p[1]);
 assert.equal(poly.filter(p=>Math.abs(p[1]-Math.min(...ys))<1e-6).length,2,'flat-top hexes have a flat edge on top');
});

test('Every encounter preset has an ordered zone plan, entrance first',()=>{
 for(const [theme,plan] of Object.entries(E.BATTLE_PLANS)){
  if(E.isRoomlessBattle(theme)){assert.deepEqual(plan,[]);continue;}
  assert(plan.length>=3,theme+' plan too short');
  for(const role of plan)assert(E.BATTLE_ZONES[role],theme+' references unknown role '+role);
  assert(E.BATTLE_ZONES[plan[0]].props.length>0,'the first zone must be a furnished room');
  assert.deepEqual(E.options('battle',{theme}).zones,plan,'options must fall back to the theme plan');
 }
 const firsts={dungeon:'entrance',tavern:'common-room',temple:'narthex',sewer:'outfall',ruins:'courtyard',cave:'cave-mouth','ice-cave':'cave-mouth',forest:'trailhead',desert:'trailhead',bridge:'approach'};
 for(const [theme,first] of Object.entries(firsts))assert.equal(E.BATTLE_PLANS[theme][0],first,theme+' must start at its way in');
});

test('Zone lists are sanitized: unknown roles dropped, duplicates kept, length capped',()=>{
 assert.deepEqual(E.options('battle',{zones:['entrance','bogus',7,'guard','guard']}).zones,['entrance','guard','guard']);
 assert.deepEqual(E.options('battle',{zones:'nope',theme:'tavern'}).zones,E.BATTLE_PLANS.tavern);
 assert.deepEqual(E.options('battle',{zones:[]}).zones,[]);
 assert.equal(E.options('battle',{zones:Array(40).fill('guard')}).zones.length,24);
});

test('The zone order drives the generated plan: first room is the way in, last is the objective',()=>{
 const s=battle('ordered',{zones:['entrance','prison','prison','treasury']});
 assert.deepEqual(s.battle.plan,['entrance','prison','prison','treasury']);
 const labels=rooms(s).map(f=>f.label);
 assert.deepEqual(labels,['Entrance','Cells','Cells','Vault']);
 assert(s.metadata.program.startsWith('Entrance hall'));
 assert(s.metadata.program.endsWith('Vault'));
});

test('Removing every zone still produces a valid entrance-only map',()=>{
 const s=battle('bare',{zones:[]});
 E.validateScene(s);
 assert.equal(s.battle.rooms.length,1);
 assert.equal(s.battle.plan[0],'entrance');
 assert(connected(s));
 assert(!/NaN|undefined/.test(R.render(s)));
});

test('Zone roles place their defining prop, not generic furniture',()=>{
 const s=battle('furnish',{zones:['entrance','library','treasury']}),assets=new Set(s.features.filter(f=>f.type==='asset').map(f=>f.asset));
 assert(assets.has('bookshelf'),'library defining prop');
 assert(assets.has('chest')||assets.has('treasure-pile'),'vault defining prop');
 assert(assets.has('stairs'),'entrance stairs');
});

test('Complex themes generate collinear doors that split walls in VTT exports',()=>{
 for(const theme of ['dungeon','temple','sewer','ruins','tavern']){
  const s=battle('doors-'+theme,{theme}),portals=s.features.filter(f=>f.type==='portal');
  assert(portals.length>0,theme+' has no doors');
  const v=C.vttData(s,100,'');
  assert.equal(v.portals.length,portals.length);
  assert(v.line_of_sight.length>0,theme+' has no walls');
  for(const p of portals){
   assert.equal(p.points.length,2);
   const [a,b]=p.points;
   assert(a[0]===b[0]||a[1]===b[1],'doors must lie on a grid-aligned wall');
   assert(E.dist(a,b)>s.gridSize*.3&&E.dist(a,b)<s.gridSize,'door width must be a fraction of one cell');
  }
 }
});

test('Open and cave themes keep zone markers without inventing room walls',()=>{
 for(const theme of ['forest','desert','bridge'])assert.equal(E.wallSegments(battle('markers-'+theme,{theme})).length,0,theme+' should not gain walls');
 for(const theme of ['forest','desert','bridge','cave','ice-cave']){
  const s=battle('markers-'+theme,{theme});
  assert.equal(rooms(s).length,s.battle.plan.length,theme+' room markers must match the plan');
  assert(s.metadata.program.length>0);
 }
});

test('Cave zone markers follow depth order from the entrance',()=>{
 const s=battle('depth',{theme:'cave',cols:48,rows:32}),chambers=rooms(s),{cols,rows,cells}=s.battle,g=s.gridSize;
 assert.equal(chambers.length,E.BATTLE_PLANS.cave.length);
 assert.equal(chambers[0].label,'Cave mouth');
 assert.equal(chambers.at(-1).label,'Deep cavern');
 // Chambers are labelled by walking distance from the mouth, not by distance to the map edge.
 const at=r=>[Math.floor(r.x/g),Math.floor(r.y/g)],index=([x,y])=>y*cols+x;
 const dist=new Int32Array(cells.length).fill(-1),start=index(at(chambers[0]));
 dist[start]=0;const q=[start];
 for(let k=0;k<q.length;k++){const i=q[k],x=i%cols,y=Math.floor(i/cols);for(const[dx,dy]of[[1,0],[-1,0],[0,1],[0,-1]]){const xx=x+dx,yy=y+dy,j=yy*cols+xx;if(xx<0||yy<0||xx>=cols||yy>=rows||!cells[j]||dist[j]>=0)continue;dist[j]=dist[i]+1;q.push(j);}}
 const depths=chambers.map(r=>dist[index(at(r))]);
 for(let i=1;i<depths.length;i++)assert(depths[i]>=depths[i-1],'chamber depth must not decrease: '+depths.join(','));
 assert(depths.at(-1)>depths[0],'the deep cavern must be farther from the mouth than the first chamber');
});

test('Custom zone programs stay connected at every supported map size',()=>{
 for(const cols of [16,24,32,48,80])for(let seed=0;seed<6;seed++){
  const s=battle('custom-'+seed,{cols,rows:24,zones:['entrance','guard','storage','barracks','sanctum']});
  E.validateScene(s);assert(connected(s),'disconnected at '+cols+'/'+seed);
 }
});

test('Zone programs survive an atlas roundtrip',()=>{
 const s=battle('roundtrip',{zones:['entrance','shrine','crypt','sanctum'],theme:'dungeon'});
 const loaded=C.validateAtlas(copy({format:'megamap-atlas',version:1,active:0,maps:[s]}));
 assert.deepEqual(loaded.maps[0].options.zones,['entrance','shrine','crypt','sanctum']);
 assert.deepEqual(loaded.maps[0].battle.plan,s.battle.plan);
});

test('Zone generation is deterministic for a fixed seed and program',()=>{
 const o={zones:['entrance','mess','kitchen','storage','sanctum']};
 const a=E.generate('battle','deterministic',o),b=E.generate('battle','deterministic',o);
 assert.deepEqual(a,b);assert.equal(R.render(a),R.render(b));
});
