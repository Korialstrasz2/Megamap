/* Previous example recipes, rebuilt with the current engine.
 * The historical v1 atlases are preserved; regenerated files use a -current suffix.
 */
const fs=require('node:fs'),path=require('node:path'),E=require('../src/engine.js'),C=require('../src/editor-core.js'),R=require('../src/render.js');
const dir=path.resolve(__dirname,'../examples');fs.mkdirSync(dir,{recursive:true});
function make(mode,seed,title,options={},appearance={}){const s=E.generate(mode,seed,options);s.title=title;s.appearance=C.appearance({...s,appearance});s.documentId='example-'+seed;s.notes='Megamap example. Edit this map or generate a new map from the Build panel. Save your atlas to preserve changes.';return s;}
const region=make('region','silver-vale-42','The Silver Vale',{sizeKm:20,terrain:'valley',forest:.6,settlements:9,poi:12},{contours:true});
const town=region.features.find(f=>f.type==='settlement');
const city=make('city',town.citySeed,'Silvergate — River City',{districts:60,layout:'organic',river:true,walls:true},{palette:'parchment'});town.label='Silvergate';city.metadata.parentRegion=region.title;city.metadata.parentSettlement=town.id;
const tavern=make('battle','the-wayfarers-rest','The Wayfarer’s Rest',{theme:'tavern',cols:32,rows:28},{palette:'atlas',grid:'square'});
const ruin=make('battle','under-the-bell','Under the Bell — Sanctuary',{theme:'temple',cols:40,rows:30,roomCount:8},{palette:'ink',grid:'square'});
let serial=0;const add=(s,f)=>s.features.push({id:'example-added-'+(++serial),...f});
// Place doors on two actual wall intervals, plus intentional independent light sources.
for(const s of [tavern,ruin]){const lines=C.mergeWalls(E.wallSegments(s)),l=lines.find(([a,b])=>E.dist(a,b)>=s.gridSize*4);if(l){const[a,b]=l,pt=t=>[a[0]+(b[0]-a[0])*t,a[1]+(b[1]-a[1])*t],fraction=Math.min(.2,s.gridSize/E.dist(a,b)/2);add(s,{type:'portal',points:[pt(.5-fraction),pt(.5+fraction)],label:'Door'});}const room=s.features.find(f=>f.type==='room');if(room)add(s,{type:'light',x:room.x,y:room.y,range:7,intensity:1,color:'#ffca7a',label:''});}
const starter={format:'megamap-atlas',version:1,appVersion:E.VERSION,active:0,maps:[region,city,tavern,ruin],library:[]};C.validateAtlas(starter);fs.writeFileSync(path.join(dir,'Starter-current.megamap.json'),JSON.stringify(starter));
for(const[s,name]of [[region,'Silver-Vale-region'],[city,'Silvergate-city'],[tavern,'Wayfarers-Rest-battle'],[ruin,'Under-the-Bell-temple']])fs.writeFileSync(path.join(dir,name+'-current.svg'),R.render(s,{...s.appearance,editor:false}));
const themes=['dungeon','forest','cave','ruins','tavern','temple','sewer','bridge','desert','ice-cave'];const sampler={format:'megamap-atlas',version:1,appVersion:E.VERSION,active:0,maps:themes.map(theme=>make('battle','sampler-'+theme,'Sampler — '+theme,{theme,cols:40,rows:30},{palette:theme==='desert'?'desert':theme==='ice-cave'?'frost':'atlas',grid:'square'})),library:[]};C.validateAtlas(sampler);fs.writeFileSync(path.join(dir,'Ten-encounters-current.megamap.json'),JSON.stringify(sampler));
console.log('Wrote four-map starter, ten-theme sampler and four SVG maps.');
