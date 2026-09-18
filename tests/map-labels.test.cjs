'use strict';
const test=require('node:test'),assert=require('node:assert/strict');
const E=require('../src/engine.js'),R=require('../src/render.js'),L=require('../src/map-labels.js'),P=require('../src/city-perspective.js'),C=require('../src/editor-core.js'),S=require('../src/city-studio.js');
const scene=E.generate('fantasy','part1-labels',{preset:'river-capital',size:'town'});
test('Stock city titles, zones and landmarks render in Italian and English without changing the map',()=>{
 const before=JSON.stringify(scene),view={layers:{districts:true},language:'it'};
 const it=R.render(scene,view),en=R.render(scene,{...view,language:'en'});
 assert.match(it,/Fiume Dorato/);assert.match(it,/Palazzo imperiale/);assert.match(it,/Cantieri navali|Lungomare operativo|Corti mercantili/);assert.match(en,/Imperial palace/);
 assert.equal(JSON.stringify(scene),before);assert.equal(R.render(scene),R.render(scene,{language:'en'}));
});
test('Every current automatic and painted district name has a map translation',()=>{
 for(const p of S.PRESETS){const s={cityStudio:{resolved:{preset:p.id,culture:'vernacular'}}};for(const q of Object.keys(S.QUARTER_NAMES)){const n=S.REFINEMENT.profile(s,q).name;assert.notEqual(L.text(n,'it'),n,n);}}
 for(const b of S.PLAN.DISTRICTS)assert.ok(Object.hasOwn(L.IT,b.name),b.name);
});
test('2.5D uses the same Italian civic labels and translated description; exports do not mutate',()=>{
 const before=JSON.stringify(scene),it=P.render(scene,{language:'it'}),en=P.render(scene,{language:'en'});
 assert.match(it,/Palazzo imperiale/);assert.match(it,/Vista assonometrica/);assert.match(en,/Imperial palace/);assert.equal(JSON.stringify(scene),before);
});
test('Custom names, text labels and notes are not translated even when matching stock words',()=>{
 const s=structuredClone(scene);s.title='Golden River';s.titleCustom=true;
 s.features.push({id:'custom-note',type:'label',x:40,y:40,label:'Market',size:15});
 const f=s.features.find(f=>f.cityRole==='civic');f.label='Market';f.labelCustom=true;f.notes='Golden River';
 assert.equal(L.feature(f,'it'),'Market');assert.equal(L.feature(s.features.at(-1),'it'),'Market');assert.equal(L.title(s,'it'),'Golden River');
 assert.match(R.render(s,{language:'it'}),/>Market<\/text>/);assert.match(P.render(s,{language:'it'}),/>Market<\/text>/);assert.equal(f.notes,'Golden River');
 assert.equal(L.text('My Market of Dreams','it'),'My Market of Dreams');assert.equal(L.text('Silvergate','it'),'Silvergate');
});
test('Known stock labels in older saves translate without metadata or rewriting saved text',()=>{
 assert.equal(L.feature({type:'district',label:'Market'},'it'),'Mercato');
 assert.equal(L.feature({type:'poi',label:'East gate'},'it'),'Porta orientale');
 assert.equal(L.feature({type:'district',label:'Market'},'en'),'Market');
});
test('Numbered rooms and procedural descriptive landmarks translate; proper names stay intact',()=>{
 assert.equal(L.text('1 · Entrance','it'),'1 · Ingresso');assert.equal(L.text('Deep Cave 3','it'),'Grotta profonda 3');assert.equal(L.text('Hidden Shrine','it'),'Santuario nascosto');assert.equal(L.text('Mooncross','it'),'Mooncross');
});
test('English/Italian exports escape custom markup and honor player filtering',()=>{
 const s=structuredClone(scene),f=s.features.find(f=>f.cityRole==='civic');f.label='<script>danger</script>';f.labelCustom=true;
 assert.doesNotMatch(R.render(s,{language:'it'}),/<script>/);assert.match(R.render(s,{language:'it'}),/&lt;script&gt;/);
 f.gmOnly=true;assert.doesNotMatch(R.render(s,{language:'it',player:true}),/danger/);assert.doesNotMatch(P.render(s,{language:'it',player:true}),/danger/);
});
test('Custom label/title flags survive save/load and reject non-boolean hostile inputs',()=>{
 const s=structuredClone(scene);s.titleCustom=true;s.features[0].labelCustom=true;
 const a=C.validateAtlas({format:'megamap-atlas',version:1,maps:[s],active:0,library:[]});assert.equal(a.maps[0].titleCustom,true);assert.equal(a.maps[0].features[0].labelCustom,true);
 s.titleCustom='false';assert.throws(()=>E.validateScene(s),/custom title/);s.titleCustom=false;s.features[0].labelCustom={};assert.throws(()=>E.validateScene(s),/custom label/);
});
test('All building kinds have readable Italian program labels',()=>{
 for(const b of E.BUILDING_TYPES)assert.ok(Object.hasOwn(L.IT,b.id),b.id);
 assert.equal(L.kind({buildingKind:'warehouse'},'it'),'Magazzino');assert.equal(L.kind({cityRoof:'hip'},'it'),'A padiglione');assert.equal(L.kind({buildingKind:'fishmarket'},'en'),'Fish market');
});
test('City placement diagnostics translate their actual counts and district names',()=>{
 assert.equal('12'+L.text(' buildings','it'),'12 edifici');assert.equal('28'+L.text(' objects','it'),'28 oggetti');
 assert.equal(L.text('Only 3 of 8 requested boats fit safely in navigable water.','it'),'Solo 3 delle 8 imbarcazioni richieste trovano posto in sicurezza nelle acque navigabili.');
 assert.match(L.text('No buildings fit Villas / wealthy homes patch 4; enlarge it or add a road.','it'),/zona 4 \(Ville \/ abitazioni benestanti\)/);
 assert.match(L.text('The sketch has 3 disconnected street groups. Paint connecting roads and bridge/gate crossings to join them.','it'),/3 gruppi di strade/);
});
test('Local survey legend language participates in the terrain render cache',()=>{
 const s=E.generate('local','part1-legend',{forest:0,detail:0});const en=R.render(s,{language:'en'}),it=R.render(s,{language:'it'});
 assert.match(en,/LOCAL SURVEY/);assert.match(it,/RILIEVO LOCALE/);assert.match(it,/Campioni/);assert.equal(R.render(s,{language:'en'}),en);
});
test('Long and unknown imported text is preserved without expensive translation attempts',()=>{
 const text=' '.repeat(10000)+'Market';assert.equal(L.text(text,'it'),text);assert.equal(L.text('__proto__','it'),'__proto__');assert.equal(L.text('constructor','it'),'constructor');
});
