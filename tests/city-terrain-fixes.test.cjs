/* Screenshot-derived regression. The user's actual atlas/seed was not supplied.
 * Verify geometry and camera invariants, not just the presence of feature names.
 */
'use strict';
const test=(name,fn)=>require('node:test')(name,async()=>{await new Promise(r=>setImmediate(r));return fn();});
const assert=require('node:assert/strict'),E=require('../src/engine'),C=E.CITY_STUDIO,P=C.PLAN,V=require('../src/city-perspective'),R=require('../src/render'),Core=require('../src/editor-core');
const fixture=require('./fixtures/northern-painted-city.cjs'),clone=x=>JSON.parse(JSON.stringify(x));
let northern;
const make=()=>northern||(northern=E.generate('fantasy',fixture.seed,fixture.options));
test('Northern edge sketch reserves all five civic complexes before street infill',()=>{
 const s=make();E.validateScene(s);assert.deepEqual(s.cityStudio.complexes.map(x=>x.kind),['fortress','temple','warehouse','park','square']);
 assert(!s.cityStudio.warnings.some(w=>w.startsWith('City complex')));assert(!s.cityStudio.reservations.some(x=>x.smartSite));assert(s.cityStudio.neighborhoods.every(x=>!x.smartSite));
});
test('The painted canvas edge is developed instead of being excluded by a central sampling rectangle',()=>{
 const s=make(),buildings=s.features.filter(f=>f.type==='building');assert(buildings.length>180);assert(buildings.filter(f=>f.y<100).length>15);
 const first=P.compile(fixture.options.cityPlan),ix=new C.Index();for(const f of buildings){const ward=s.cityStudio.neighborhoods.find(w=>w.feature===f.ward);assert(P.fits(s,f.polygon,C,ward));assert(!P.touches(f.polygon,first.zones,x=>!x,C));assert(C.dryPolygon(s.cityStudio.ground,f.polygon));for(const hit of ix.query(f.polygon))assert(!E.polygonsIntersect(f.polygon,hit.poly));ix.add(f.polygon);assert(s.features.some(a=>a.cityBuilding===f.id&&a.cityRole==='access'));}
});
test('Civic pads have bounded relief and their entrances do not cross the enclosing fortress wall',()=>{
 const s=make();for(const c of s.cityStudio.complexes){const f=s.features.find(x=>x.id===c.id),zs=f.polygon.map(p=>C.heightAt(s.cityStudio.ground,p));assert(Math.max(...zs)-Math.min(...zs)<=10.001);}
 const walls=s.features.filter(f=>f.cityComplex&&f.type==='wall');for(const access of s.features.filter(f=>f.cityComplex&&f.cityRole==='access')){const target=s.features.find(f=>f.id===access.cityBuilding);assert(E.nearPolyline(access.points.at(-1),[...target.polygon,target.polygon[0]])<.01);for(let i=1;i<access.points.length;i++)for(const wall of walls)for(let j=1;j<wall.points.length;j++)assert(!E.polygonsIntersect(C.corridor(access.points[i-1],access.points[i],access.width*.8),C.corridor(wall.points[j-1],wall.points[j],wall.width)));}
});
test('River-aware vessel sampling finds real berths without shrinking longships or painting extra water',()=>{
 const s=make(),boats=s.features.filter(f=>f.cityRole==='vessel');assert(boats.length>=8);const ix=new C.Index();for(const f of boats){assert.equal(f.cityShip,'longship');assert.equal(f.size*2*s.scale,23);const poly=C.rect([f.x,f.y],f.size*2,f.size*2*f.cityBeam,f.rotation*Math.PI/180);assert(C.pathSamples([...poly,poly[0]],3).every(p=>C.waterAt(s.cityStudio.ground,p,-2)));assert(!ix.hits(poly,1));ix.add(poly);}
 assert.deepEqual(s.options.cityPlan,fixture.options.cityPlan);
});
test('Unspent targets remain explicit and report the physical painted area in both languages',()=>{
 const s=make(),warning=s.cityStudio.warnings.find(x=>x.startsWith('Painted building land:'));assert(warning);assert(s.cityStudio.statistics.buildings<1200);assert(R.labels.text(warning,'it').startsWith('Terreno edificabile dipinto:'));assert.equal(R.labels.text(warning,'en'),warning);assert(!s.population);
});
test('A painted river no longer carries the invisible coastline of the selected preset',()=>{
 const plan={version:1,strokes:[{role:'smart',width:250,points:[[300,200],[650,200]]},{role:'river',width:28,points:[[160,20],[180,980]]}]};
 const a=E.generate('fantasy','no-ghost-coast',{preset:'council',size:'hamlet',boatCount:0,landscape:'fjord',cityPlan:plan}),b=E.generate('fantasy','no-ghost-coast',{preset:'council',size:'hamlet',boatCount:0,landscape:'hills',cityPlan:plan});assert.deepEqual(a.cityStudio.ground.heights,b.cityStudio.ground.heights);assert(C.heightAt(a.cityStudio.ground,[750,300])>0);assert.equal(a.cityStudio.ground.paintWater.surfaceVersion,1);
 const bad=clone(a);bad.cityStudio.ground.paintWater.surfaceVersion='bad';assert.throws(()=>E.validateScene(bad));
});
test('Shared terrain mesh is triangular, fixed across HQ settings, and interpolates its vertices',()=>{
 const mesh=V.terrainMesh(make());assert.equal(mesh.count,64);for(let y=0;y<64;y+=7)for(let x=0;x<64;x+=7)for(const tri of mesh.triangles(x,y)){assert.equal(tri.length,3);for(const p of tri)assert(Math.abs(mesh.height(p)-p[2])<.0001);}
 const a=V.render(make(),{hq:true}),b=V.render(make(),{hq:false});assert(a.includes('data-terrain-mesh="64"'));assert(b.includes('data-terrain-mesh="64"'));
});
test('Draped surfaces preserve concave area and use interior terrain samples instead of long height chords',()=>{
 const mesh=V.terrainMesh(make()),polygons=[[[100,100],[800,100],[800,700],[100,700]],[[100,100],[700,100],[700,200],[200,200],[200,750],[100,750]]];
 for(const polygon of polygons)for(const p of [polygon,polygon.slice().reverse()]){const pieces=V.surfacePieces(p,mesh);assert(pieces.length>50);assert(Math.abs(pieces.reduce((n,x)=>n+C.area(x.poly),0)-C.area(p))<.001);for(const part of pieces){const b=C.bounds(part.poly);assert(b.x1-b.x0<=mesh.step+.001&&b.y1-b.y0<=mesh.step+.001);}}
});
test('Long walls follow their local terrain in every camera rather than stretching to the highest endpoint',()=>{
 const s=make(),wall=s.features.find(f=>f.type==='wall'&&f.cityPainted&&f.points.length>4),mesh=V.terrainMesh(s),height=6/s.scale,panels=V.wallPanels(s,wall,height,mesh);assert(panels.length>70);
 for(const panel of panels)for(let i=0;i<panel.footprint.length;i++){assert(Math.abs(panel.top[i]-panel.bottom[i]-height)<1e-8);for(const a of [0,90,180,270]){const cam=V.camera(a),lo=cam.project(panel.footprint[i],panel.bottom[i]),hi=cam.project(panel.footprint[i],panel.top[i]);assert(Math.abs(lo[0]-hi[0])<1e-8);assert(Math.abs(lo[1]-hi[1]-.8*height)<1e-8);}}
});
test('Terrain, draped surfaces and short wall panels participate in a shared depth ordering',()=>{
 const svg=V.render(make(),{},90);assert(svg.includes('data-perspective-scene="true"'));const objects=svg.indexOf('data-perspective-objects="true"');assert(objects>0);assert(svg.indexOf('data-perspective-terrain="true"',objects)>objects);assert((svg.match(/data-wall-top="true"/g)||[]).length>70);
});
test('Four rotations and bilingual exports leave existing scene geometry and brush programs untouched',()=>{
 const s=clone(make());delete s.cityStudio.ground.paintWater.surfaceVersion;const before=JSON.stringify(s),svgs=[];for(const angle of [0,90,180,270]){const out=V.render(s,{language:'it'},angle);assert(out.includes('Fortezza interna'));assert(out.includes('Grande tempio'));assert(!/NaN|Infinity|undefined/.test(out));assert(out.length<24000000);svgs.push(out);}assert.equal(new Set(svgs).size,4);assert.equal(JSON.stringify(s),before);assert.equal(svgs[0],V.render(s,{language:'it'},360));Core.validateAtlas({format:'megamap-atlas',version:1,maps:[s],active:0,library:[]});
});
