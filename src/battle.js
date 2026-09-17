/* Architectural encounter planning. GPL-3.0. No network or runtime dependencies.
 * Rooms are allocated before doors; doors reserve circulation before furnishing.
 * All geometry is expressed in 5 ft construction cells until final projection.
 */
(function(root,factory){const api=factory();if(typeof module==='object'&&module.exports)module.exports=api;else root.MegamapBattle=api;})(typeof globalThis!=='undefined'?globalThis:this,function(){
'use strict';
const MAX_ZONES=24;
const clamp=(n,a,b)=>Math.max(a,Math.min(b,n));
const DIRECTIONS=[[1,0],[-1,0],[0,1],[0,-1]];
const choose=(r,a)=>a[Math.floor(r()*a.length)];
const ZONE_ROLES={
 entrance:{name:'Entrance hall',label:'Entrance',size:'m',props:['stairs','brazier','crate','barrel'],notes:['The way in. Dust and fresh footprints lead deeper.','A cold draught suggests at least one other opening.']},
 guard:{name:'Guard post',label:'Guard post',size:'s',props:['weapon-rack','bench','table','lantern','crossed-swords'],notes:['A watch rotation is chalked on the wall.','The post is manned in shifts; the roster is missing one name.']},
 mess:{name:'Mess hall',label:'Mess hall',size:'l',props:['long-table','bench','fireplace','barrel','sacks'],notes:['Long tables still carry the last meal.','The hearth is banked, but not cold.']},
 kitchen:{name:'Kitchen',label:'Kitchen',size:'m',props:['stove','cauldron','barrel','sacks','counter'],notes:['Ash and grease. Something is simmering.','Knives are racked in a neat, well-kept row.']},
 storage:{name:'Storeroom',label:'Storeroom',size:'s',props:['crate','barrel','sacks','handcart'],notes:['Spare timber, lamp oil and rope.','Every crate carries an old owner\u2019s mark.']},
 armory:{name:'Armory',label:'Armory',size:'s',props:['weapon-rack','crossed-swords','chest','bench'],notes:['Racks are half empty; the rest is oiled and ready.','A tally of missing blades is scratched into the door.']},
 prison:{name:'Cells',label:'Cells',size:'m',props:['cage','chain','bedroll','bones','barrel'],notes:['Straw, rust and old scratches.','One cell has been opened from the inside.']},
 barracks:{name:'Barracks',label:'Barracks',size:'m',props:['bunk-bed','weapon-rack','chest','bench'],notes:['Bedrolls and kit are stacked in threes.','A locked footlocker sits apart from the rest.']},
 library:{name:'Library',label:'Library',size:'m',props:['bookshelf','desk','chair','lantern','rug'],notes:['Shelves are indexed; the index is not here.','A reading desk is still lit.']},
 shrine:{name:'Shrine',label:'Shrine',size:'m',props:['altar','brazier','statue','column'],notes:['Offerings have been left recently.','The icon has been deliberately defaced.']},
 workshop:{name:'Workshop',label:'Workshop',size:'m',props:['anvil','loom','desk','timber-rack','barrel'],notes:['Tools are laid out for a job left unfinished.','Sawdust and filings mark a recent project.']},
 crypt:{name:'Crypt',label:'Crypt',size:'m',props:['sarcophagus','gravestone','bones','skull','brazier'],notes:['Names are carved in a script older than the walls.','One lid has been shifted and not replaced.']},
 treasury:{name:'Vault',label:'Vault',size:'s',props:['chest','treasure-pile','sacks','lantern'],notes:['The strongbox is chained to the floor.','A counting ledger lists more than is present.']},
 sanctum:{name:'Sanctum',label:'Sanctum',size:'l',props:['throne','pentagram','brazier','statue','treasure-pile'],notes:['The air is still and deliberately kept.','Whatever this room was built around is not visible from the door.']},
 'common-room':{name:'Common room',label:'Common room',size:'l',props:['round-table','long-table','bench','counter','fireplace'],notes:['Sawdust on the boards, tankards still out.','A chalk board lists rooms and prices.']},
 bar:{name:'Bar',label:'Bar',size:'m',props:['counter','barrel','round-table','lantern'],notes:['The tap is dry; the cellar key is not on its hook.']},
 guest:{name:'Guest rooms',label:'Guest rooms',size:'s',props:['bed','bunk-bed','desk','lantern','chest'],notes:['Beds are made, but not all of them are empty.','A traveller\u2019s kit is stacked by the door.']},
 cellar:{name:'Cellar',label:'Cellar',size:'m',props:['barrel','crate','sacks','lantern'],notes:['Cool, damp and stacked to the ceiling.','A brick at the back wall sounds hollow.']},
 narthex:{name:'Narthex',label:'Narthex',size:'m',props:['brazier','column','bench','lantern'],notes:['Worshippers left their marks at the threshold.']},
 nave:{name:'Nave',label:'Nave',size:'l',props:['column','bench','statue','brazier'],notes:['Rows of seating face a raised dais.','The ceiling is lost above the columns.']},
 vestry:{name:'Vestry',label:'Vestry',size:'s',props:['bookshelf','desk','chest','lantern'],notes:['Vestments are hung in careful order.']},
 cloister:{name:'Cloister',label:'Cloister',size:'m',props:['cloister-garden','column','statue','bench'],notes:['A covered walk rings a small garden.']},
 cells:{name:'Monastic cells',label:'Monastic cells',size:'s',props:['bed','desk','bookshelf','lantern'],notes:['Each cell holds one bed and one book.']},
 reliquary:{name:'Reliquary',label:'Reliquary',size:'s',props:['altar','treasure-pile','brazier','lantern'],notes:['The relic case is locked, waxed and watched.']},
 altar:{name:'Inner sanctum',label:'Sanctum',size:'l',props:['altar','pentagram','statue','brazier','column'],notes:['The innermost chamber. The floor is cut with ritual marks.','A single seat faces the altar.']},
 outfall:{name:'Outfall',label:'Outfall',size:'m',water:true,props:['reeds','barrel','bones','lantern'],notes:['Daylight and river smell reach this far.']},
 junction:{name:'Drain junction',label:'Junction',size:'m',water:true,props:['reeds','barrel','crate','lantern'],notes:['Three channels meet beneath a cracked lintel.']},
 cistern:{name:'Cistern',label:'Cistern',size:'l',water:true,props:['lily-pads','reeds','fountain'],notes:['Still water fills the room to the lip.']},
 cache:{name:'Hidden cache',label:'Cache',size:'s',props:['chest','crate','sacks','lantern'],notes:['Someone keeps supplies where the patrols do not go.']},
 lair:{name:'Lair',label:'Lair',size:'l',water:true,props:['bones','skull','treasure-pile','chain'],notes:['The channel runs foul here. Something lives at the junction.']},
 courtyard:{name:'Courtyard',label:'Courtyard',size:'l',props:['broken-column','fern','boulder','statue'],notes:['Saplings split the paving.']},
 hall:{name:'Collapsed hall',label:'Collapsed hall',size:'l',props:['broken-column','boulder','bones','gravestone'],notes:['Half the roof is open to the sky.']},
 'cave-mouth':{name:'Cave mouth',label:'Cave mouth',size:'m',props:['boulder','mushroom','bones','crystal'],notes:['Daylight stops a few paces in.']},
 cavern:{name:'Cavern',label:'Cavern',size:'l',props:['boulder','crystal','mushroom','bones'],notes:['The ceiling is lost in darkness.']},
 pool:{name:'Pool',label:'Pool',size:'m',water:true,props:['lily-pads','crystal','mushroom','reeds'],notes:['Water drips into a still black pool.']},
 grotto:{name:'Crystal grotto',label:'Crystal grotto',size:'m',props:['crystal','ice-shards','boulder'],notes:['Facets catch every torch.']},
 deep:{name:'Deep cavern',label:'Deep cavern',size:'l',props:['bones','skull','crystal','boulder'],notes:['The floor is strewn with old bones.','The passage here is worn smooth by something large.']},
 trailhead:{name:'Trailhead',label:'Trailhead',size:'m',props:['signpost','waypoint','wagon','fallen-log'],notes:['Wagon ruts end here.']},
 grove:{name:'Grove',label:'Grove',size:'l',props:['tree','oak','bush','fern','stump'],notes:['The canopy closes overhead.']},
 clearing:{name:'Camp clearing',label:'Camp',size:'l',props:['campfire-ring','tent','camp','fallen-log'],notes:['A ring of stones marks an old fire.']},
 ruins:{name:'Old ruins',label:'Ruins',size:'m',props:['ruin','broken-column','gravestone','bones'],notes:['Foundations show a building older than the road.']},
 ambush:{name:'Ambush point',label:'Ambush point',size:'m',props:['rock-cluster','boulder','fallen-log','danger'],notes:['Cover on both sides of the trail.']},
 camp:{name:'Caravan camp',label:'Caravan camp',size:'l',props:['camp','tent','wagon','campfire-ring'],notes:['The fire is out, but the ash is warm.']},
 approach:{name:'Approach',label:'Approach',size:'m',props:['signpost','wagon','fallen-log','rock-cluster'],notes:['The road narrows toward the crossing.']},
 crossing:{name:'Crossing',label:'Crossing',size:'m',props:['bridge-marker','raft','fishing-net','reeds'],notes:['The current is fast and the far bank is screened by reeds.']},
 'far-bank':{name:'Far bank',label:'Far bank',size:'m',props:['reeds','raft','waypoint','boulder'],notes:['Tracks scatter here; some are not human.']}
};
const THEME_ZONES={
 dungeon:['entrance','guard','mess','kitchen','storage','barracks','armory','prison','workshop','library','shrine','crypt','treasury','sanctum'],
 tavern:['common-room','bar','kitchen','guest','guest','cellar'],
 temple:['narthex','nave','vestry','cloister','cells','reliquary','altar'],
 sewer:['outfall','junction','cistern','workshop','cache','lair'],
 ruins:['courtyard','hall','storage','shrine','crypt','treasury'],
 cave:['cave-mouth','cavern','pool','grotto','deep'],
 'ice-cave':['cave-mouth','cavern','grotto','pool','deep'],
 forest:['trailhead','grove','clearing','ruins','ambush'],
 desert:['trailhead','ambush','camp'],
 bridge:['approach','crossing','far-bank']
};
Object.assign(ZONE_ROLES,{
 bedroom:{name:'Bedchamber',label:'Bedchamber',size:'m',props:['bed','chest','chair','rug'],notes:['A private sleeping room, with storage beside the bed.']},
 study:{name:'Study',label:'Study',size:'s',props:['desk','bookshelf','chair','lantern'],notes:['A writing desk faces into the room, away from the household traffic.']},
 pantry:{name:'Pantry',label:'Pantry',size:'s',props:['sacks','barrel','bookshelf','crate'],notes:['Dry provisions are shelved close to the kitchen.']},
 privy:{name:'Washroom / privy',label:'Washroom',size:'s',props:['well','barrel','bench'],notes:['A screened service room, separated from food preparation and sleeping space.']},
 stable:{name:'Stable',label:'Stable',size:'l',props:['animal-pen','sacks','barrel','timber-rack'],notes:['Stalls line the walls; the central handling aisle is kept clear.']},
 gatehouse:{name:'Gatehouse',label:'Gatehouse',size:'m',props:['weapon-rack','bench','brazier'],notes:['The approach is watched from a controlled entrance.']}
});
THEME_ZONES.dwelling=['entrance','common-room','kitchen','pantry','bedroom','bedroom','privy','study'];
THEME_ZONES.stronghold=['gatehouse','guard','barracks','armory','mess','kitchen','storage','stable','prison','treasury','sanctum'];
const GROUPS={arrival:['entrance','gatehouse','narthex','approach','trailhead','cave-mouth'],domestic:['common-room','bar','guest','bedroom','study','privy','cells'],service:['kitchen','pantry','storage','cellar','mess','workshop','stable'],military:['guard','barracks','armory','prison','treasury','sanctum'],sacred:['library','shrine','crypt','nave','vestry','cloister','reliquary','altar'],underground:['outfall','junction','cistern','cache','lair','cavern','pool','grotto','deep'],outdoors:['courtyard','hall','grove','clearing','ruins','ambush','camp','crossing','far-bank']};
const GROUP_NAMES={arrival:'Arrival',domestic:'Domestic',service:'Service',military:'Defence & security',sacred:'Sacred & learning',underground:'Underground',outdoors:'Outdoors'};
const SERVICE=new Set(GROUPS.service.concat(['bar','vestry','privy','outfall','junction','cistern']));
const PRIVATE=new Set(['guest','bedroom','cells','study','library']);
const SECURE=new Set(['treasury','sanctum','reliquary','altar','prison','crypt','deep','lair']);
const AFFINITIES=[['kitchen','pantry'],['kitchen','storage'],['kitchen','mess'],['kitchen','bar'],['bar','common-room'],['cellar','bar'],['guest','guest'],['bedroom','bedroom'],['bedroom','privy'],['guard','entrance'],['gatehouse','guard'],['guard','armory'],['guard','prison'],['barracks','armory'],['barracks','mess'],['narthex','nave'],['nave','altar'],['altar','vestry'],['altar','reliquary'],['cloister','cells'],['shrine','crypt'],['workshop','storage'],['stable','storage'],['junction','cistern'],['cistern','outfall']];
for(const [group,ids] of Object.entries(GROUPS))for(const id of ids)ZONE_ROLES[id].group=group;
for(const [id,z] of Object.entries(ZONE_ROLES)){
 z.access=SECURE.has(id)?'secure':PRIVATE.has(id)?'private':SERVICE.has(id)?'service':'public';
 z.near=AFFINITIES.flatMap(([a,b])=>a===id?[b]:b===id?[a]:[]);
}
const DEFAULTS={cols:40,rows:30,roomCount:12,theme:'dungeon',gridType:'hex-flat',mapShape:'rectangle',layout:'auto',entrySide:'auto',corridorWidth:1,furnishing:.7,condition:'inhabited',serviceExit:true};
const LAYOUTS={dungeon:'branching',tavern:'compact',dwelling:'compact',stronghold:'courtyard',temple:'axial',ruins:'courtyard',sewer:'branching'};
const TEMPLATES=[
 {id:'garrison',name:'Dungeon garrison',theme:'dungeon',zones:THEME_ZONES.dungeon,layout:'branching'},
 {id:'home',name:'Family dwelling',theme:'dwelling',zones:THEME_ZONES.dwelling,layout:'compact',cols:28,rows:24},
 {id:'inn',name:'Roadside inn',theme:'tavern',zones:['common-room','bar','kitchen','pantry','guest','guest','guest','cellar','privy'],layout:'compact',cols:36,rows:28},
 {id:'manor',name:'Fortified manor',theme:'stronghold',zones:['gatehouse','guard','courtyard','common-room','kitchen','pantry','bedroom','bedroom','study','privy','treasury'],layout:'courtyard',cols:40,rows:34},
 {id:'monastery',name:'Working monastery',theme:'temple',zones:['narthex','nave','vestry','cloister','cells','cells','mess','kitchen','library','reliquary','altar'],layout:'axial',cols:40,rows:36},
 {id:'tomb',name:'Burial complex',theme:'dungeon',zones:['entrance','guard','shrine','crypt','crypt','crypt','reliquary','treasury'],layout:'branching'},
 {id:'waterworks',name:'Undercity waterworks',theme:'sewer',zones:['outfall','junction','cistern','workshop','storage','cache','lair'],layout:'branching'},
 {id:'caverns',name:'Living cave system',theme:'cave',zones:THEME_ZONES.cave},
 {id:'crossing',name:'River crossing',theme:'bridge',zones:THEME_ZONES.bridge}
];
function detail(value={},index=0,length=0){
 const v=value&&typeof value==='object'&&!Array.isArray(value)?value:{};
 return {label:typeof v.label==='string'?v.label.trim().slice(0,80):'',size:['auto','small','large'].includes(v.size)?v.size:'auto',access:['auto','public','service','private','secure'].includes(v.access)?v.access:'auto',near:Number.isInteger(v.near)&&v.near>=0&&v.near<length&&v.near!==index?v.near:null};
}
function normalize(input={}){
 if(!input||typeof input!=='object'||Array.isArray(input))input={};
 const o={...DEFAULTS,...input};
 for(const [k,lo,hi] of [['cols',16,80],['rows',16,80],['roomCount',3,25],['corridorWidth',1,2]])o[k]=Number.isFinite(Number(o[k]))?clamp(Math.round(Number(o[k])),lo,hi):DEFAULTS[k];
 o.furnishing=Number.isFinite(Number(o.furnishing))?clamp(Number(o.furnishing),0,1):DEFAULTS.furnishing;
 for(const [key,values] of Object.entries({theme:Object.keys(THEME_ZONES),gridType:['square','hex-pointy','hex-flat'],mapShape:['rectangle','hex-pointy','hex-flat'],layout:['auto','compact','branching','courtyard','axial'],entrySide:['auto','north','east','south','west'],condition:['inhabited','abandoned','ruined']}))if(!values.includes(o[key]))o[key]=DEFAULTS[key];
 o.serviceExit=typeof o.serviceExit==='boolean'?o.serviceExit:DEFAULTS.serviceExit;
 const raw=Array.isArray(input.zones)?input.zones:THEME_ZONES[o.theme],valid=raw.map((role,i)=>({role,i})).filter(z=>typeof z.role==='string'&&Object.hasOwn(ZONE_ROLES,z.role)).slice(0,MAX_ZONES);
 const remap=new Map(valid.map((z,i)=>[z.i,i]));
 o.zones=valid.map(z=>z.role);
 o.zoneDetails=valid.map((z,i)=>{const v=detail(input.zoneDetails?.[z.i],z.i,raw.length);v.near=remap.has(v.near)?remap.get(v.near):null;return detail(v,i,valid.length);});
 return o;
}
function program(o){return (o.zones.length?o.zones:[THEME_ZONES[o.theme][0]]).map((role,index)=>{
 const d=detail(o.zoneDetails[index],index,o.zones.length),z=ZONE_ROLES[role],size=d.size==='small'?'s':d.size==='large'?'l':z.size;
 return {role,index,key:'zone-'+index,label:d.label||z.label,access:d.access==='auto'?z.access:d.access,near:d.near,size,weight:size==='s'?12:size==='l'?38:22};
});}
function estimate(input){const o=normalize(input),p=program(o),area=p.reduce((n,z)=>n+z.weight,0)*((o.layout==='auto'?LAYOUTS[o.theme]:o.layout)==='courtyard'?1.65:1.35),factor=o.mapShape==='rectangle'?1:.62;
 const available=Math.max(1,(o.cols-4)*(o.rows-4)*factor),scale=Math.max(1,Math.sqrt(area/available));
 return {requested:p.length,area:Math.ceil(area),available:Math.floor(available),crowded:area>available,recommended:{cols:clamp(Math.ceil(o.cols*scale/2)*2,16,80),rows:clamp(Math.ceil(o.rows*scale/2)*2,16,80)}};
}
function rectPoints(q){return [[q.x,q.y],[q.x+q.w,q.y],[q.x+q.w,q.y+q.h],[q.x,q.y+q.h]];}
function contains(q,x,y){return x>=q.x&&y>=q.y&&x<q.x+q.w&&y<q.y+q.h;}
function adjacent(a,b){
 if(a.x+a.w===b.x||b.x+b.w===a.x){const lo=Math.max(a.y,b.y),hi=Math.min(a.y+a.h,b.y+b.h);return hi-lo>=2?{axis:'v',at:a.x+a.w===b.x?b.x:a.x,lo,hi}:null;}
 if(a.y+a.h===b.y||b.y+b.h===a.y){const lo=Math.max(a.x,b.x),hi=Math.min(a.x+a.w,b.x+b.w);return hi-lo>=2?{axis:'h',at:a.y+a.h===b.y?b.y:a.y,lo,hi}:null;}
 return null;
}
/** Binary allocation with explicit circulation frontage. Splitting perpendicular
 * to the access edge keeps both children on a hall. A cross-gallery reaches
 * that hall, rather than leaving an unconnected corridor floating in the plan. */
function subdivide(rect,items,side,ctx,depth=0){
 if(!items.length)return true;
 if(rect.w<3||rect.h<3)return false;
 if(items.length===1){ctx.rooms.push({...rect,...items[0]});return true;}
 const horizontal=side==='east'||side==='west',length=horizontal?rect.h:rect.w;
 let n=Math.ceil(items.length/2),gallery=ctx.layout==='branching'&&items.length>=4&&rect.w>=9&&rect.h>=9&&depth<2?ctx.cw:0;
 const minA=gallery?3:3*n,minB=gallery?3:3*(items.length-n);
 if(length<minA+minB+gallery)return false;
 const sum=items.reduce((a,b)=>a+b.weight,0),left=items.slice(0,n).reduce((a,b)=>a+b.weight,0);
 let cut=clamp(Math.round((length-gallery)*left/sum+(ctx.r()-.5)*.8),minA,length-gallery-minB);
 const a={...rect},b={...rect};
 if(horizontal){a.h=cut;b.y+=cut+gallery;b.h-=cut+gallery;}else{a.w=cut;b.x+=cut+gallery;b.w-=cut+gallery;}
 let sa=side,sb=side;
 if(gallery){const g=horizontal?{x:rect.x,y:rect.y+cut,w:rect.w,h:gallery}:{x:rect.x+cut,y:rect.y,w:gallery,h:rect.h};ctx.halls.push(g);sa=horizontal?'south':'east';sb=horizontal?'north':'west';}
 const roomMark=ctx.rooms.length,hallMark=ctx.halls.length;
 if(subdivide(a,items.slice(0,n),sa,ctx,depth+1)&&subdivide(b,items.slice(n),sb,ctx,depth+1))return true;
 ctx.rooms.length=roomMark;ctx.halls.length=hallMark;
 if(gallery){ctx.halls.pop();const retry={...ctx,layout:'compact'};return subdivide(rect,items,side,retry,depth+1);}
 return false;
}
function splitGroups(items,n){
 const groups=Array.from({length:n},()=>[]),weights=new Array(n).fill(0);
 for(const item of items){let best=0,score=Infinity;
  for(let k=0;k<n;k++){const affinity=groups[k].filter(z=>ZONE_ROLES[item.role].near.includes(z.role)||z.index===item.near||z.near===item.index).length;const v=weights[k]-affinity*12+(groups[k].length?0:-5);if(v<score){score=v;best=k;}}
  groups[best].push(item);weights[best]+=item.weight;
 }
 const rank=z=>z.index===0?-10:z.access==='public'?0:z.access==='service'?1:z.access==='private'?2:3;
 for(const g of groups)g.sort((a,b)=>rank(a)-rank(b)||a.index-b.index);
 return groups;
}
function allocation(box,items,layout,cw,r){
 const ctx={rooms:[],halls:[],layout,cw,r};
 if(items.length===1){ctx.rooms.push({...box,...items[0]});return ctx;}
 if(layout==='courtyard'&&box.w>=17&&box.h>=17&&items.length>=5){
  const gardenW=clamp(Math.round(box.w*.28),4,9),gardenH=clamp(Math.round(box.h*.28),4,9),left=Math.floor((box.w-gardenW-2*cw)/2),top=Math.floor((box.h-gardenH-2*cw)/2);
  const x=box.x+left,y=box.y+top,w=gardenW+2*cw,h=gardenH+2*cw;
  ctx.court={x:x+cw,y:y+cw,w:gardenW,h:gardenH};
  ctx.halls.push({x:box.x,y,w:box.w,h:cw},{x:box.x,y:y+h-cw,w:box.w,h:cw},{x,y:y+cw,w:cw,h:h-2*cw},{x:x+w-cw,y:y+cw,w:cw,h:h-2*cw});
  const blocks=[{x:box.x,y:box.y,w:box.w,h:top},{x:box.x,y:y+h,w:box.w,h:box.y+box.h-y-h},{x:box.x,y:y+cw,w:left,h:h-2*cw},{x:x+w,y:y+cw,w:box.x+box.w-x-w,h:h-2*cw}];
  const groups=splitGroups(items,4),sides=['south','north','east','west'];
  // Side wings have less frontage; place overflow in the longer front/rear wings.
  for(const i of [2,3])while(groups[i].length>Math.floor(gardenH/3)){const target=groups[0].length<=groups[1].length?0:1;groups[target].push(groups[i].pop());}
  for(const group of groups)group.sort((a,b)=>(a.index===0?-1:b.index===0?1:a.index-b.index));
  for(let i=0;i<4;i++)if(!subdivide(blocks[i],groups[i],sides[i],ctx))return null;
  return ctx;
 }
 if(layout==='axial'&&box.w>=15&&box.h>=17&&items.some(z=>z.role==='nave')){
  const nave=items.find(z=>z.role==='nave'),first=items[0],last=items.at(-1),central=clamp(Math.round(box.w*.34),5,9),x=box.x+Math.floor((box.w-central)/2),front=4,back=4;
  ctx.rooms.push({x,y:box.y+front,w:central,h:box.h-front-back,...nave});
  const remaining=items.filter(z=>z!==nave&&z!==first&&z!==last);
  if(first!==nave)ctx.rooms.push({x,y:box.y,w:central,h:front,...first});
  if(last!==nave&&last!==first)ctx.rooms.push({x,y:box.y+box.h-back,w:central,h:back,...last});
  ctx.halls.push({x:x-cw,y:box.y,w:cw,h:box.h},{x:x+central,y:box.y,w:cw,h:box.h});
  const groups=splitGroups(remaining,2),blocks=[{x:box.x,y:box.y,w:x-cw-box.x,h:box.h},{x:x+central+cw,y:box.y,w:box.x+box.w-x-central-cw,h:box.h}];
  for(let i=0;i<2;i++)if(!subdivide(blocks[i],groups[i],i?'west':'east',ctx))return null;
  ctx.axial=true;return ctx;
 }
 const w=Math.max(1,cw),x=box.x+Math.floor((box.w-w)/2);
 ctx.halls.push({x,y:box.y,w,h:box.h});
 const groups=splitGroups(items,2),blocks=[{x:box.x,y:box.y,w:x-box.x,h:box.h},{x:x+w,y:box.y,w:box.x+box.w-x-w,h:box.h}];
 for(let i=0;i<2;i++)if(!subdivide(blocks[i],groups[i],i?'west':'east',ctx))return null;
 return ctx;
}
function frame(s,H){
 const o=s.options,r=H.rng(s.seed+'-architecture-v2'),turn=o.entrySide==='auto'?Math.floor(r()*4):['north','east','south','west'].indexOf(o.entrySide),C=turn%2?o.rows:o.cols,R=turn%2?o.cols:o.rows,g=s.width/o.cols;
 s.height=o.rows*g;s.gridSize=g;s.scale=o.cols*5;
 s.battle={cols:o.cols,rows:o.rows,cells:new Array(o.cols*o.rows).fill(0),rooms:[],generatorVersion:2,partitions:[],surfaces:[],circulation:[],exterior:[],waterCells:[],connections:[],diagnostics:{requested:program(o).length,placed:0,unplaced:[],warnings:[]}};
 s.battle.boundary=H.mapBoundary(s);
 const T=(x,y)=>{const p=turn===0?[x,y]:turn===1?[o.cols-y,x]:turn===2?[o.cols-x,o.rows-y]:[y,o.rows-x];return p;};
 const P=(x,y)=>T(x,y).map(v=>v*g),index=(x,y)=>{const p=T(x+.5,y+.5);return Math.floor(p[1])*o.cols+Math.floor(p[0]);};
 const inside=(x,y)=>x>=0&&y>=0&&x<=C&&y<=R&&H.pointOnOrInside(P(x,y),s.battle.boundary);
 const mask=Array.from({length:C*R},(_,i)=>{const x=i%C,y=Math.floor(i/C);return inside(x+.02,y+.02)&&inside(x+.98,y+.02)&&inside(x+.98,y+.98)&&inside(x+.02,y+.98);});
 return {s,H,o,r,C,R,g,turn,T,P,index,inside,mask,owner:new Int32Array(C*R).fill(-3),floor:new Uint8Array(C*R),reserved:new Set(),wet:new Set(),occupied:[],doorEdges:new Set(),doors:[],rooms:[],halls:[],exterior:new Set(),surface:[],bodies:[]};
}
function fill(F,q,owner){for(let y=q.y;y<q.y+q.h;y++)for(let x=q.x;x<q.x+q.w;x++){const i=y*F.C+x;if(F.mask[i]){F.owner[i]=owner;F.floor[i]=1;}}}
function surface(F,q,material){F.surface.push({polygon:rectPoints(q).map(p=>F.P(...p)),material});}
function bounds(F,items){
 const area=items.reduce((n,z)=>n+z.weight,0)*(F.layout==='courtyard'?1.8:1.42),ratio=F.layout==='axial'?.8:1.12;
 let maxW=F.C-4,maxH=F.R-4;
 const ok=(w,h)=>{const x=Math.floor((F.C-w)/2),y=Math.floor((F.R-h)/2);return rectPoints({x,y,w,h}).every(p=>F.inside(...p));};
 while(!ok(maxW,maxH)&&(maxW>7||maxH>7)){if(maxW/F.C>maxH/F.R&&maxW>7)maxW--;else if(maxH>7)maxH--;else maxW--;}
 let w=clamp(Math.round(Math.sqrt(area*ratio)),7,maxW),h=clamp(Math.ceil(area/w),6,maxH);
 if(items.length===1){w=Math.min(maxW,8);h=Math.min(maxH,7);}
 return {x:Math.floor((F.C-w)/2),y:Math.floor((F.R-h)/2),w,h,maxW,maxH};
}
function edgeKey(a,b){return a<b?a+':'+b:b+':'+a;}
function portal(F,room,x,y,dx,dy,kind='room',other='circulation'){
 const ax=x+dx,ay=y+dy,i=y*F.C+x,j=ay*F.C+ax,key=edgeKey(i,j);if(F.doorEdges.has(key))return null;
 const line=dx?[[x+(dx>0?1:0),y+.14],[x+(dx>0?1:0),y+.86]]:[[x+.14,y+(dy>0?1:0)],[x+.86,y+(dy>0?1:0)]];
 const door=F.H.add(F.s,'portal',{points:line.map(p=>F.P(...p)),doorKind:room.access==='secure'?'iron':'timber',closed:true,roomKey:room.key,connection:kind,notes:kind==='entrance'?'Main entrance.':kind==='service-exit'?'Independent service exit.':'A doorway on a shared structural wall.'});
 F.doorEdges.add(key);F.reserved.add(i);if(ax>=0&&ay>=0&&ax<F.C&&ay<F.R)F.reserved.add(j);
 const d={room:room.key,x,y,dx,dy,id:door.id,other};F.doors.push(d);
 F.s.battle.connections.push({from:other,to:room.key,door:door.id,kind});
 return d;
}
function boundaryCells(F,q,predicate){const found=[];
 for(let y=q.y;y<q.y+q.h;y++)for(let x=q.x;x<q.x+q.w;x++)for(const [dx,dy] of DIRECTIONS){const xx=x+dx,yy=y+dy;if(contains(q,xx,yy)||xx<0||yy<0||xx>=F.C||yy>=F.R)continue;if(predicate(F.owner[yy*F.C+xx],xx,yy))found.push({x,y,dx,dy});}
 return found;
}
function midpointDoor(candidates,q){return candidates.slice().sort((a,b)=>Math.abs(a.x+.5-q.x-q.w/2)+Math.abs(a.y+.5-q.y-q.h/2)-Math.abs(b.x+.5-q.x-q.w/2)-Math.abs(b.y+.5-q.y-q.h/2))[0];}
function connectRooms(F){
 for(const q of F.rooms){
  const cs=boundaryCells(F,q,owner=>owner===-1);
  const d=midpointDoor(cs,q);
  if(d)portal(F,q,d.x,d.y,d.dx,d.dy);
  else if(F.rooms.length>1)F.s.battle.diagnostics.warnings.push(q.label+' has no hall frontage.');
 }
 if(F.axial)for(const q of F.rooms.filter(q=>['nave','narthex'].includes(q.role))){
  for(const dir of [-1,1]){const d=midpointDoor(boundaryCells(F,q,owner=>owner===-1).filter(c=>c.dx===dir),q);if(d)portal(F,q,d.x,d.y,d.dx,d.dy,'aisle');}
 }
 for(let a=0;a<F.rooms.length;a++)for(let b=a+1;b<F.rooms.length;b++){
  const q=F.rooms[a],p=F.rooms[b],e=adjacent(q,p);if(!e)continue;
  const user=q.near===p.index||p.near===q.index,service=ZONE_ROLES[q.role].near.includes(p.role)&&[q.access,p.access].includes('service')&&![q.access,p.access].includes('private'),axis=F.axial&&[q.role,p.role].includes('nave')&&[q.role,p.role].some(v=>['narthex','altar'].includes(v));
  if(!user&&!service&&!axis)continue;
  const t=Math.floor((e.lo+e.hi)/2);
  const x=e.axis==='v'?e.at-1:t,y=e.axis==='h'?e.at-1:t;
  const from=contains(q,x,y)?q:p,to=from===q?p:q;
  portal(F,from,x,y,e.axis==='v'?1:0,e.axis==='h'?1:0,axis?'processional':user?'preferred-adjacency':'service',to.key);
 }
 const first=F.rooms.find(q=>q.index===0)||F.rooms[0];
 const exteriorDoor=q=>boundaryCells(F,q,(owner,x,y)=>owner<-1&&F.mask[y*F.C+x]);
 const candidates=exteriorDoor(first).sort((a,b)=>a.y-b.y||Math.abs(a.x-F.C/2)-Math.abs(b.x-F.C/2));
 if(candidates.length){const d=candidates[0];portal(F,first,d.x,d.y,d.dx,d.dy,'entrance','outside');approach(F,d,'entrance');F.s.battle.entrance={room:first.key,side:['north','east','south','west'][F.turn],point:F.P(d.x+.5+d.dx*.5,d.y+.5+d.dy*.5)};}
 if(F.o.serviceExit){const q=F.rooms.filter(q=>q!==first&&SERVICE.has(q.role)).find(q=>exteriorDoor(q).length);if(q){const cs=exteriorDoor(q).sort((a,b)=>b.y-a.y),d=cs[0];portal(F,q,d.x,d.y,d.dx,d.dy,'service-exit','outside');approach(F,d,'service');}}
}
function approach(F,d,kind){
 let x=d.x+d.dx,y=d.y+d.dy;const start=[d.x+.5+d.dx*.5,d.y+.5+d.dy*.5],path=[start];
 while(x>=0&&y>=0&&x<F.C&&y<F.R&&F.mask[y*F.C+x]&&F.owner[y*F.C+x]<0){const i=y*F.C+x;F.floor[i]=1;F.owner[i]=F.residential?-2:-1;if(F.residential)F.exterior.add(i);F.reserved.add(i);path.push([x+.5,y+.5]);x+=d.dx;y+=d.dy;}
 if(F.residential&&path.length>1)F.H.add(F.s,'road',{points:path.map(p=>F.P(...p)),width:F.g*.9,roadType:'footpath',notes:kind==='service'?'Service approach.':'Main approach.'});
}
function shortestPath(F,start,goal,allowed){
 const queue=[start],previous=new Int32Array(F.C*F.R).fill(-1);previous[start]=start;
 for(let k=0;k<queue.length;k++){const i=queue[k];if(i===goal)break;const x=i%F.C,y=Math.floor(i/F.C);
  for(const [dx,dy] of DIRECTIONS){const xx=x+dx,yy=y+dy,j=yy*F.C+xx;if(xx<0||yy<0||xx>=F.C||yy>=F.R||previous[j]!==-1||!allowed(j,i))continue;previous[j]=i;queue.push(j);}}
 if(previous[goal]===-1)return [];
 const path=[];for(let i=goal;;i=previous[i]){path.push(i);if(i===start)break;}return path.reverse();
}
function water(F){
 for(const q of F.rooms){if(!ZONE_ROLES[q.role].water||q.w<5||q.h<5)continue;
  let pool={x:q.x+1,y:q.y+1,w:q.w-2,h:q.h-2};
  if(F.natural){
   // Natural pools fill side hollows, never the dry main travel route.
   const w=Math.max(2,Math.floor(q.w*.35)),h=Math.max(2,Math.floor(q.h*.35));let found=null;
   for(let y=q.y+1;y<=q.y+q.h-h-1&&!found;y++)for(let x=q.x+1;x<=q.x+q.w-w-1&&!found;x++){
    let ok=true;for(let yy=y;yy<y+h;yy++)for(let xx=x;xx<x+w;xx++){const i=yy*F.C+xx;if(!F.floor[i]||F.reserved.has(i))ok=false;}
    if(ok)found={x,y,w,h};
   }
   if(!found)continue;pool=found;
  }
  F.H.add(F.s,'water',{polygon:rectPoints(pool).map(p=>F.P(...p)),roomKey:q.key,notes:F.natural?'A pool in a side hollow leaves the main passage dry.':'A sunken basin with a continuous 5 ft maintenance walk around its edge.'});
  for(let y=pool.y;y<pool.y+pool.h;y++)for(let x=pool.x;x<pool.x+pool.w;x++)F.wet.add(y*F.C+x);
 }
 if(F.o.theme==='sewer')for(const h of F.halls){if(h.w<2||h.h<4)continue;
  const x=h.x,h0=h.y,h1=h.y+h.h;
  F.H.add(F.s,'river',{points:[F.P(x+.5,h0),F.P(x+.5,h1)],width:F.g*.68,notes:'Gravity channel with dry maintenance walks and inspection crossings.'});
  for(let y=h0;y<h1;y++)F.wet.add(y*F.C+x);
  const crossings=new Set([Math.floor((h0+h1)/2),...F.doors.filter(d=>d.x>=h.x-1&&d.x<=h.x+h.w).map(d=>d.y)]);
  for(const y of crossings){if(y<h0||y>=h1)continue;F.wet.delete(y*F.C+x);const q={x,y,w:1,h:1};F.H.add(F.s,'area',{polygon:rectPoints(q).map(p=>F.P(...p)),material:'paper',notes:'Stone maintenance crossing over the channel.'});}
 }
}
function circulation(F){
 for(const i of F.reserved)F.wet.delete(i);
 for(const q of F.rooms){
  const candidates=[];for(let y=q.y;y<q.y+q.h;y++)for(let x=q.x;x<q.x+q.w;x++){const i=y*F.C+x;if(F.floor[i]&&!F.wet.has(i))candidates.push(i);}
  const center=Number.isInteger(q.anchor)&&F.floor[q.anchor]&&!F.wet.has(q.anchor)?q.anchor:candidates.sort((a,b)=>Math.abs(a%F.C+.5-q.x-q.w/2)+Math.abs(Math.floor(a/F.C)+.5-q.y-q.h/2)-Math.abs(b%F.C+.5-q.x-q.w/2)-Math.abs(Math.floor(b/F.C)+.5-q.y-q.h/2))[0];
  q.anchor=center;F.reserved.add(center);
  const doors=F.doors.filter(d=>d.room===q.key||d.other===q.key);
  for(const d of doors){let x=d.x,y=d.y;if(!contains(q,x,y)){x+=d.dx;y+=d.dy;}const target=y*F.C+x;
   for(const i of shortestPath(F,center,target,j=>contains(q,j%F.C,Math.floor(j/F.C))&&F.floor[j]&&!F.wet.has(j)))F.reserved.add(i);
  }
 }
}
const FOOTPRINTS={bed:[1.15,2], 'bunk-bed':[1.2,2],bench:[1.8,.5],chair:[.65,.65],desk:[1.6,.8],bookshelf:[1.8,.45],table:[1.7,1.2],'long-table':[2.5,1.1],'round-table':[1.3,1.3],counter:[2.3,.6],stove:[1.1,1],fireplace:[1.5,.7],barrel:[.7,.7],crate:[.8,.8],sacks:[.7,.6],chest:[1,.6],'weapon-rack':[1.7,.5],altar:[1.6,1.1],sarcophagus:[1,2],column:[.8,.8],statue:[1,1],throne:[1.15,1.2],brazier:[.65,.65],stairs:[1.5,2],cage:[1.65,1.65],'animal-pen':[2,2],tent:[2,2.5],wagon:[1.8,3],rug:[2,2],well:[1,1],anvil:[.9,.8]};
function footprint(asset){return FOOTPRINTS[asset]||[.85,.85];}
function overlap(a,b,pad=.12){return a.x<b.x+b.w+pad&&a.x+a.w+pad>b.x&&a.y<b.y+b.h+pad&&a.y+a.h+pad>b.y;}
function canPlace(F,q,room,allowWet=false){
 for(let y=Math.floor(q.y);y<=Math.ceil(q.y+q.h)-1;y++)for(let x=Math.floor(q.x);x<=Math.ceil(q.x+q.w)-1;x++){const i=y*F.C+x;if(x<0||y<0||x>=F.C||y>=F.R||!F.floor[i]||F.reserved.has(i)||(!allowWet&&F.wet.has(i))||room&&!contains(room,x,y))return false;}
 return !F.occupied.some(p=>overlap(q,p));
}
function prop(F,asset,x,y,w,h,rotation=0,room=null){
 if(!F.H.ASSETS.includes(asset))return null;
 // Reserve the true rotated footprint (not the unrotated symbol's box).
 const quarter=Math.abs(((rotation%180)+180)%180-90)<.00001,bw=quarter?h:w,bh=quarter?w:h,angle=rotation*Math.PI/180,cs=Math.cos(angle),sn=Math.sin(angle);
 const polygon=[[-bw/2,-bh/2],[bw/2,-bh/2],[bw/2,bh/2],[-bw/2,bh/2]].map(([dx,dy])=>[x+dx*cs-dy*sn,y+dx*sn+dy*cs]);
 const xs=polygon.map(p=>p[0]),ys=polygon.map(p=>p[1]),q={x:Math.min(...xs),y:Math.min(...ys),w:Math.max(...xs)-Math.min(...xs),h:Math.max(...ys)-Math.min(...ys)};
 if(!canPlace(F,q,room))return null;
 F.occupied.push(q);
 const p=F.P(x,y),f=F.H.add(F.s,'asset',{x:p[0],y:p[1],asset,size:Math.max(bw,bh)*F.g*.55,rotation:(rotation+F.turn*90)%360,battleProp:true,propWidth:bw*F.g,propHeight:bh*F.g,battleFootprint:polygon.map(p=>F.P(...p)),roomKey:room?.key});
 return f;
}
function placeAgainstWall(F,q,asset,preferred='any',scale=1){
 let [w,h]=footprint(asset).map(v=>v*scale);const options=[];
 for(const rotation of [0,90]){const ww=rotation?h:w,hh=rotation?w:h;
  for(let y=q.y+.2+hh/2;y<=q.y+q.h-.2-hh/2+.01;y+=.5)for(let x=q.x+.2+ww/2;x<=q.x+q.w-.2-ww/2+.01;x+=.5){
   const wall=Math.min(x-q.x-ww/2,q.x+q.w-x-ww/2,y-q.y-hh/2,q.y+q.h-y-hh/2),score=wall*4+(preferred==='back'?(q.y+q.h-y)*2:0)+(F.r()*.18);
   options.push({x,y,w:ww,h:hh,rotation,score});
  }
 }
 options.sort((a,b)=>a.score-b.score);
 for(const p of options){const f=prop(F,asset,p.x,p.y,p.w,p.h,p.rotation,q);if(f)return f;}
 return null;
}
function furnish(F){
 for(const q of F.rooms){const z=ZONE_ROLES[q.role],anchor=q.anchor??Math.floor(q.y+q.h/2)*F.C+Math.floor(q.x+q.w/2),p=F.P(anchor%F.C+.5,Math.floor(anchor/F.C)+.5),notes=(z.notes[0]||'')+' '+q.access[0].toUpperCase()+q.access.slice(1)+' space; access is through planned doorways, with a clear 5 ft circulation route.';
  const marker=F.H.add(F.s,'room',{x:p[0],y:p[1],role:q.role,roomKey:q.key,label:q.label,notes,zoneIndex:q.index});q.featureId=marker.id;
  if(F.o.furnishing===0)continue;
  const primary=q.role==='entrance'?(F.residential?'bench':'stairs'):q.role==='nave'?'column':q.role==='cloister'?'column':z.props[0];
  let first=placeAgainstWall(F,q,primary,SECURE.has(q.role)?'back':'any');
  if(!first)first=placeAgainstWall(F,q,primary,'any',.65);
  const repeat=['barracks','crypt','library','storage','cellar','stable','nave','mess','common-room'].includes(q.role);
  const placed=new Map(first?[[primary,1]]:[]),cap=asset=>asset==='bed'?(q.role==='guest'&&q.w*q.h>45?2:1):['stairs','stove','fireplace','altar','throne','rug','fountain','desk','counter','anvil','cauldron'].includes(asset)?1:asset==='column'?8:asset==='bunk-bed'?6:4;
  const count=clamp(Math.round(q.w*q.h/7*F.o.furnishing),1,16);
  const pool=z.props.filter(a=>!['bones','skull','danger','pentagram','treasure-pile','crossed-swords','chain','loom','handcart','cloister-garden','well'].includes(a)&&!(F.residential&&a==='stairs'));
  for(let k=1;k<count;k++){
   let asset=repeat&&k%2===0?primary:pool[k%Math.max(1,pool.length)]||primary;
   if((placed.get(asset)||0)>=cap(asset))asset=pool.find(a=>(placed.get(a)||0)<cap(a));
   if(!asset)break;
   const f=placeAgainstWall(F,q,asset);if(f)placed.set(asset,(placed.get(asset)||0)+1);
   if(f&&['long-table','table','round-table','desk'].includes(asset)){
    const center=F.occupied.at(-1),seat=asset==='desk'?'chair':'bench';
    if(center){const w=Math.min(center.w,1.5);prop(F,seat,center.x+center.w/2,center.y+center.h+.55,w,.5,0,q);}
   }
  }
  if(F.o.condition!=='inhabited')for(let k=0;k<(F.o.condition==='ruined'?3:1);k++)placeAgainstWall(F,q,choose(F.r,['bones','boulder','broken-column']), 'any',.6);
 }
}
function finish(F){
 const s=F.s,b=s.battle;
 for(let i=0;i<F.floor.length;i++){const x=i%F.C,y=Math.floor(i/F.C),j=F.index(x,y);b.cells[j]=F.floor[i];if(F.reserved.has(i))b.circulation.push(j);if(F.exterior.has(i))b.exterior.push(j);if(F.wet.has(i))b.waterCells.push(j);}
 b.surfaces=F.surface;
 if(!F.natural&&!F.outdoor)for(let y=0;y<F.R;y++)for(let x=0;x<F.C;x++){
  const i=y*F.C+x;if(!F.floor[i])continue;
  for(const [dx,dy] of [[1,0],[0,1]]){const xx=x+dx,yy=y+dy,j=yy*F.C+xx;if(xx>=F.C||yy>=F.R||!F.floor[j]||F.owner[i]===F.owner[j]||(F.owner[i]<0&&F.owner[j]<0&&!([F.owner[i],F.owner[j]].includes(-2)&&[F.owner[i],F.owner[j]].includes(-1))))continue;
   b.partitions.push((dx?[[x+1,y],[x+1,y+1]]:[[x,y+1],[x+1,y+1]]).map(p=>F.P(...p)));
  }
 }
 b.rooms=F.rooms.slice().sort((a,b)=>a.index-b.index).map(q=>{const ps=rectPoints(q).map(p=>F.T(...p)),xs=ps.map(p=>p[0]),ys=ps.map(p=>p[1]);return {x:Math.min(...xs),y:Math.min(...ys),w:Math.max(...xs)-Math.min(...xs),h:Math.max(...ys)-Math.min(...ys),role:q.role,key:q.key,index:q.index,label:q.label,access:q.access,featureId:q.featureId};});
 const markers=s.features.filter(f=>f.type==='room').sort((a,b)=>a.zoneIndex-b.zoneIndex),other=s.features.filter(f=>f.type!=='room');s.features=other.concat(markers);
 b.plan=b.rooms.map(q=>q.role);b.diagnostics.placed=b.rooms.length;
 b.diagnostics.layout=F.actualLayout||F.layout;b.diagnostics.entrySide=['north','east','south','west'][F.turn];
 b.diagnostics.unmetAdjacencies=F.rooms.filter(q=>q.near!=null&&!b.connections.some(c=>c.from===q.key&&c.to==='zone-'+q.near||c.to===q.key&&c.from==='zone-'+q.near)).map(q=>({index:q.index,near:q.near}));
 if(b.diagnostics.unmetAdjacencies.length)b.diagnostics.warnings.push('Adjacency preferences not met: '+b.diagnostics.unmetAdjacencies.map(q=>(q.index+1)+' ↔ '+(q.near+1)).join(', ')+'. Try another layout, reorder related rooms or enlarge the map.');
 b.diagnostics.doors=F.doors.length;b.diagnostics.serviceConnections=b.connections.filter(c=>c.kind==='service'||c.kind==='preferred-adjacency').length;
 s.metadata.program=b.rooms.map(q=>ZONE_ROLES[q.role].name).join(' → ');
 s.metadata.architecture='Rooms, shared walls and circulation are planned before doors and furnishings. Construction cells are 5 ft; the movement grid is independent.';
 s.metadata.mapBoundary='Construction is fitted inside the play boundary before allocation; rooms are not cropped after generation.';
 s.appearance={grid:F.o.gridType};
 return s;
}
function material(q,F){if(['courtyard','cloister'].includes(q.role))return 'grass';if(['kitchen','pantry','privy','workshop','stable'].includes(q.role))return 'flagstone';if(['nave','altar','shrine','reliquary'].includes(q.role))return 'tile';if(['crypt','prison','treasury','cellar'].includes(q.role))return 'slate';return F.residential?'wood':'stone';}
function interiors(F){
 const requested=program(F.o);F.layout=F.o.layout==='auto'?LAYOUTS[F.o.theme]||'branching':F.o.layout;F.residential=['tavern','dwelling','stronghold'].includes(F.o.theme);F.cw=F.o.theme==='sewer'?2:F.o.corridorWidth;
 if(F.layout==='axial'&&!requested.some(q=>q.role==='nave')||F.layout==='courtyard'&&requested.length<5){F.s.battle.diagnostics.warnings.push('The requested layout needs '+(F.layout==='axial'?'a nave':'at least five zones')+'; a compact plan was used.');F.layout='compact';}
 let selected=requested.slice(),plan=null,box=bounds(F,requested),usedBox;
 while(selected.length){
  for(const layout of [...new Set([F.layout,'compact'])]){
   const limit=Math.max(box.maxW-box.w,box.maxH-box.h);
   for(let extra=0;extra<=limit+1;extra+=2){const w=Math.min(box.maxW,box.w+extra),h=Math.min(box.maxH,box.h+extra),q={x:Math.floor((F.C-w)/2),y:Math.floor((F.R-h)/2),w,h};
    if(layout==='axial'&&(w<15||h<17)||layout==='courtyard'&&(w<17||h<17))continue;
    plan=allocation(q,selected,layout,F.cw,F.r);if(plan){usedBox=q;F.actualLayout=layout;break;}
   }
   if(plan)break;
  }
  if(plan)break;
  const remove=selected.length>2?selected.length-2:selected.length-1;selected.splice(remove,1);
 }
 if(!plan){const q={x:Math.floor(F.C/2)-2,y:Math.floor(F.R/2)-2,w:4,h:4};plan={rooms:[{...q,...requested[0]}],halls:[]};usedBox=q;}
 if(F.actualLayout&&F.actualLayout!==F.layout)F.s.battle.diagnostics.warnings.push('The requested layout could not fit; a compact connected plan was used. Increase the map dimensions for the requested architecture.');
 F.rooms=plan.rooms.sort((a,b)=>a.index-b.index);F.halls=plan.halls;F.axial=plan.axial;
 const missing=requested.filter(q=>!F.rooms.some(p=>p.index===q.index));
 F.s.battle.diagnostics.unplaced=missing.map(q=>({index:q.index,role:q.role,label:q.label,reason:'Insufficient buildable area for a room with safe circulation.'}));
 if(missing.length)F.s.battle.diagnostics.warnings.push('Placed '+F.rooms.length+' of '+requested.length+' zones. Increase the map size or reduce the zone program. Unplaced: '+missing.map(q=>(q.index+1)+'. '+q.label).join(', ')+'.');
 if(F.residential){for(let i=0;i<F.mask.length;i++)if(F.mask[i]){F.floor[i]=1;F.owner[i]=-2;F.exterior.add(i);}}
 for(const h of F.halls){fill(F,h,-1);surface(F,h,F.residential?'flagstone':'stone');}
 if(plan.court){fill(F,plan.court,-1);surface(F,plan.court,'grass');F.s.battle.courtyard=rectPoints(plan.court).map(p=>F.P(...p));}
 for(const q of F.rooms){fill(F,q,q.index);surface(F,q,material(q,F));}
 for(let i=0;i<F.owner.length;i++)if(F.owner[i]>=-1)F.exterior.delete(i);
 connectRooms(F);water(F);circulation(F);furnish(F);
 if(plan.court&&F.o.furnishing>0){const c=plan.court;prop(F,'well',c.x+c.w/2,c.y+c.h/2,1,1);}
 return finish(F);
}
function caves(F){
 F.layout='organic chambers';F.natural=true;
 const requested=program(F.o),b=bounds(F,requested),box={x:Math.floor((F.C-b.maxW)/2),y:Math.floor((F.R-b.maxH)/2),w:b.maxW,h:b.maxH};
 let n=requested.length,nx,ny,ww,hh;
 while(n){nx=clamp(Math.ceil(Math.sqrt(n*box.w/box.h)),1,n);ny=Math.ceil(n/nx);ww=Math.floor(box.w/nx);hh=Math.floor(box.h/ny);if(ww>=5&&hh>=5)break;n--;}
 n=Math.max(1,n);const selected=requested.slice(0,n);if(n<requested.length&&n>1)selected[n-1]=requested.at(-1);
 for(let i=0;i<n;i++){
  const row=Math.floor(i/nx),col=row%2?nx-1-i%nx:i%nx,q={x:box.x+col*ww+1,y:box.y+row*hh+1,w:Math.max(3,ww-2),h:Math.max(3,hh-2),...selected[i]};
  F.rooms.push(q);
  const cx=q.x+q.w/2,cy=q.y+q.h/2,phase=F.r()*Math.PI*2;
  for(let y=q.y;y<q.y+q.h;y++)for(let x=q.x;x<q.x+q.w;x++){
   const dx=(x+.5-cx)/(q.w*.51),dy=(y+.5-cy)/(q.h*.51),angle=Math.atan2(dy,dx),rough=.1*Math.sin(angle*3+phase)+.06*Math.cos(angle*5-phase);
   if(dx*dx+dy*dy<=1+rough){F.floor[y*F.C+x]=1;F.owner[y*F.C+x]=q.index;}
  }
  q.anchor=Math.floor(cy)*F.C+Math.floor(cx);F.floor[q.anchor]=1;F.owner[q.anchor]=q.index;
 }
 for(let i=1;i<F.rooms.length;i++){
  const a=F.rooms[i-1],b=F.rooms[i],path=shortestPath(F,a.anchor,b.anchor,j=>F.mask[j]&&!F.rooms.some((q,k)=>k!==i&&k!==i-1&&contains(q,j%F.C,Math.floor(j/F.C))));
  for(const j of path){F.floor[j]=1;F.reserved.add(j);const x=j%F.C,y=Math.floor(j/F.C);if(F.o.corridorWidth===2&&x+1<F.C&&F.mask[j+1]){F.floor[j+1]=1;F.reserved.add(j+1);}}
  F.s.battle.connections.push({from:a.key,to:b.key,kind:'natural-passage'});
 }
 const first=F.rooms[0],x=first.anchor%F.C;let y=Math.floor(first.anchor/F.C);
 while(y>0&&F.mask[(y-1)*F.C+x]){F.floor[y*F.C+x]=1;F.reserved.add(y*F.C+x);y--;}
 F.floor[y*F.C+x]=1;F.reserved.add(y*F.C+x);F.s.battle.entrance={room:first.key,side:['north','east','south','west'][F.turn],point:F.P(x+.5,y+.5)};
 water(F);circulation(F);furnish(F);
 const missing=requested.filter(q=>!F.rooms.some(p=>p.index===q.index));F.s.battle.diagnostics.unplaced=missing.map(q=>({index:q.index,role:q.role,label:q.label,reason:'Insufficient space for a separate cavern and rock divider.'}));
 if(missing.length)F.s.battle.diagnostics.warnings.push('Placed '+n+' of '+requested.length+' cavern zones. Increase the map dimensions for distinct chambers.');
 return finish(F);
}
function pointOnRoute(route,t){const lengths=route.slice(1).map((p,i)=>Math.hypot(p[0]-route[i][0],p[1]-route[i][1]));let d=lengths.reduce((a,b)=>a+b,0)*t;
 for(let i=0;i<lengths.length;i++){if(d<=lengths[i]){const v=d/lengths[i];return [route[i][0]+(route[i+1][0]-route[i][0])*v,route[i][1]+(route[i+1][1]-route[i][1])*v];}d-=lengths[i];}return route.at(-1).slice();
}
function lineDistance(p,route){let best=Infinity;for(let i=1;i<route.length;i++){const a=route[i-1],b=route[i],dx=b[0]-a[0],dy=b[1]-a[1],t=clamp(((p[0]-a[0])*dx+(p[1]-a[1])*dy)/(dx*dx+dy*dy||1),0,1);best=Math.min(best,Math.hypot(p[0]-a[0]-t*dx,p[1]-a[1]-t*dy));}return best;}
function outdoors(F){
 F.layout=F.o.theme==='bridge'?'crossing and riverbanks':'landscape route';F.outdoor=true;
 for(let i=0;i<F.mask.length;i++)if(F.mask[i]){F.floor[i]=1;F.owner[i]=-2;F.exterior.add(i);}
 const fit=p=>{let [x,y]=p;for(let k=0;k<30&&!F.mask[Math.floor(y)*F.C+Math.floor(x)];k++){x=(x+F.C/2)*.5;y=(y+F.R/2)*.5;}return [x,y];};
 const route=(F.o.theme==='bridge'?[[F.C*.4,1],[F.C*.5,F.R*.35],[F.C*.5,F.R*.65],[F.C*.65,F.R-1]]:[[F.C*.25,1],[F.C*(.27+F.r()*.12),F.R*.28],[F.C*(.5+F.r()*.12),F.R*.52],[F.C*.45,F.R*.75],[F.C*.73,F.R-1]]).map(fit);
 F.H.add(F.s,'road',{points:route.map(p=>F.P(...p)),width:F.g*(F.o.theme==='bridge'?1.6:1.1),roadType:F.o.theme==='bridge'?'cobble':'footpath',notes:'Continuous approach with kept-clear travel space.'});
 for(let y=0;y<F.R;y++)for(let x=0;x<F.C;x++)if(F.floor[y*F.C+x]&&lineDistance([x+.5,y+.5],route)<1.2)F.reserved.add(y*F.C+x);
 if(F.o.theme==='bridge'){
  const channel=clamp(F.R*.15,3,7),y=F.R/2-channel/2;
  const river=[[0,y-.8],[F.C*.25,y+.4],[F.C*.5,y],[F.C*.75,y-.5],[F.C,y+.8],[F.C,y+channel+.8],[F.C*.75,y+channel-.5],[F.C*.5,y+channel],[F.C*.25,y+channel+.4],[0,y+channel-.8]];
  F.H.add(F.s,'water',{polygon:river.map(p=>F.P(...p)),notes:'Continuous river channel, crossed only by the bridge deck.'});
  for(let yy=Math.floor(y-1);yy<=Math.ceil(y+channel+1);yy++)for(let x=0;x<F.C;x++)if(yy>=0&&yy<F.R&&F.H.inside([x+.5,yy+.5],river))F.wet.add(yy*F.C+x);
  const x=F.C/2,deck={x:x-1,y:y-.8,w:2,h:channel+1.6},p=F.P(x,y+channel/2);
  F.H.add(F.s,'asset',{x:p[0],y:p[1],asset:'bridge',size:Math.max(deck.w,deck.h)*F.g*.55,battleProp:true,structural:true,propWidth:deck.w*F.g,propHeight:deck.h*F.g,rotation:F.turn*90,notes:'Load-bearing deck with abutments on both banks.'});
  for(const xx of [deck.x,deck.x+deck.w])F.H.add(F.s,'wall',{points:[F.P(xx,deck.y),F.P(xx,deck.y+deck.h)],width:F.g*.1,notes:'Bridge parapet.'});
  for(let yy=Math.floor(deck.y);yy<Math.ceil(deck.y+deck.h);yy++)for(let xx=Math.floor(deck.x);xx<Math.ceil(deck.x+deck.w);xx++)F.wet.delete(yy*F.C+xx);
 }
 const clearings=[];
 for(const q of program(F.o)){
  const t=F.o.zones.length<=1?.5:.08+q.index/(F.o.zones.length-1)*.84,p=pointOnRoute(route,t),pos=F.P(...p);
  const room={x:Math.floor(p[0]),y:Math.floor(p[1]),w:1,h:1,...q};F.rooms.push(room);
  const f=F.H.add(F.s,'room',{x:pos[0],y:pos[1],role:q.role,roomKey:q.key,label:q.label,notes:ZONE_ROLES[q.role].notes[0],zoneIndex:q.index});room.featureId=f.id;
  if(['camp','clearing','ambush','ruins','grove'].includes(q.role)){
   const c=fit([p[0]+(p[0]<F.C/2?3.8:-3.8),p[1]]);clearings.push(c);
   const poly=Array.from({length:14},(_,i)=>[c[0]+3.2*Math.cos(i*Math.PI/7),c[1]+2.7*Math.sin(i*Math.PI/7)]);
   if(poly.every(p=>F.inside(...p)))F.H.add(F.s,'area',{polygon:poly.map(p=>F.P(...p)),material:F.o.theme==='desert'?'sand':'grass',notes:'A usable clearing beside, not across, the travel route.'});
   if(F.o.furnishing>0){if(['camp','clearing'].includes(q.role)){prop(F,'campfire-ring',c[0],c[1],1,1);prop(F,'tent',c[0]-2,c[1],1.7,2.1,90);prop(F,'tent',c[0]+2,c[1],1.7,2.1,270);prop(F,'fallen-log',c[0],c[1]+1.7,1.5,.5);}else for(let i=0;i<3;i++)prop(F,q.role==='ruins'?'broken-column':q.role==='grove'?'tree':'boulder',c[0]+(i-1)*1.9,c[1]+(i%2?1.5:-1),1.1,1.1);}
  }
 }
 const plants=F.o.theme==='desert'?['cactus','rock-cluster','boulder']:['tree','oak','pine','bush','fern','boulder'];
 for(let y=1;y<F.R-1;y++)for(let x=1;x<F.C-1;x++){
  if(F.o.furnishing===0)continue;
  const density=F.o.theme==='desert'?.075:.28,cluster=.65+.35*Math.sin(x*.7+y*.31+F.turn);
  if(F.r()>density*cluster*F.o.furnishing||clearings.some(c=>Math.hypot(c[0]-x-.5,c[1]-y-.5)<4))continue;
  const asset=choose(F.r,plants),size=['tree','oak','pine'].includes(asset)?1.6:.7;
  prop(F,asset,x+.5+(F.r()-.5)*.25,y+.5+(F.r()-.5)*.25,size,size,F.r()*360);
 }
 for(let i=1;i<F.rooms.length;i++)F.s.battle.connections.push({from:F.rooms[i-1].key,to:F.rooms[i].key,kind:'route'});
 F.s.battle.entrance={room:F.rooms[0].key,side:['north','east','south','west'][F.turn],point:F.P(...route[0])};
 return finish(F);
}
function generate(scene,helpers){const F=frame(scene,helpers);return ['forest','desert','bridge'].includes(F.o.theme)?outdoors(F):['cave','ice-cave'].includes(F.o.theme)?caves(F):interiors(F);}
/** Bound optional architectural metadata before rendering; legacy atlases remain valid. */
function validateMetadata(s){
 const fail=what=>{throw Error('Invalid battle '+what+'.');},point=p=>Array.isArray(p)&&p.length===2&&p.every(v=>Number.isFinite(v)&&Math.abs(v)<=20000),poly=(p,min,max)=>Array.isArray(p)&&p.length>=min&&p.length<=max&&p.every(point),text=v=>typeof v==='string'&&v.length<=200;
 for(const f of s.features){
  if(f.battleProp!=null&&typeof f.battleProp!=='boolean')fail('prop flag');
  if(f.battleProp){if(f.type!=='asset'||![f.propWidth,f.propHeight,f.size].every(v=>Number.isFinite(v)&&v>0&&v<=20000))fail('prop dimensions');}
  if(f.battleFootprint!=null&&!poly(f.battleFootprint,4,4))fail('prop footprint');
  if(f.roomKey!=null&&!text(f.roomKey))fail('room reference');
  if(f.zoneIndex!=null&&(!Number.isInteger(f.zoneIndex)||f.zoneIndex<0||f.zoneIndex>=MAX_ZONES))fail('zone index');
  if(f.doorKind!=null&&!['timber','iron'].includes(f.doorKind))fail('door material');
 }
 const b=s.battle;if(!b)return;
 if(b.exterior!=null&&(!Array.isArray(b.exterior)||b.exterior.length>b.cells.length||b.exterior.some(i=>!Number.isInteger(i)||i<0||i>=b.cells.length)))fail('exterior');
 if(b.partitions!=null&&(!Array.isArray(b.partitions)||b.partitions.length>b.cells.length*2||b.partitions.some(p=>!poly(p,2,2))))fail('partitions');
 if(b.generatorVersion==null)return;
 if(b.generatorVersion!==2)fail('generator version');
 if(!Array.isArray(b.rooms)||b.rooms.length>MAX_ZONES||b.rooms.some(q=>!q||![q.x,q.y,q.w,q.h].every(Number.isFinite)||q.x<0||q.y<0||q.w<=0||q.h<=0||q.x+q.w>b.cols+.001||q.y+q.h>b.rows+.001||!text(q.label)||!text(q.role)||!text(q.key)||!Number.isInteger(q.index)||q.index<0||q.index>=MAX_ZONES))fail('room geometry');
 if(!Array.isArray(b.partitions)||b.partitions.length>b.cols*b.rows*2||b.partitions.some(p=>!poly(p,2,2)))fail('partitions');
 if(!Array.isArray(b.surfaces)||b.surfaces.length>200||b.surfaces.some(p=>!p||!poly(p.polygon,3,100)||!['wood','stone','slate','flagstone','tile','grass'].includes(p.material)))fail('floor surfaces');
 for(const key of ['exterior','circulation','waterCells'])if(!Array.isArray(b[key])||b[key].length>b.cells.length||b[key].some(i=>!Number.isInteger(i)||i<0||i>=b.cells.length))fail(key);
 if(!Array.isArray(b.connections)||b.connections.length>300||b.connections.some(c=>!c||!text(c.from)||!text(c.to)||!text(c.kind)||c.door!=null&&!text(c.door)))fail('connections');
 if(b.entrance!=null&&(!b.entrance||!point(b.entrance.point)||!text(b.entrance.room)||!['north','east','south','west'].includes(b.entrance.side)))fail('entrance');
 if(b.courtyard!=null&&!poly(b.courtyard,3,100))fail('courtyard');
 if(b.windows!=null&&(!Array.isArray(b.windows)||b.windows.length>100||b.windows.some(p=>!poly(p,2,2))))fail('windows');
 const d=b.diagnostics;if(!d||!Number.isInteger(d.requested)||d.requested<1||d.requested>MAX_ZONES||d.placed!==b.rooms.length||!Array.isArray(d.warnings)||d.warnings.length>100||d.warnings.some(w=>typeof w!=='string'||w.length>10000)||!Array.isArray(d.unplaced)||d.unplaced.length>MAX_ZONES)fail('diagnostics');
}
return {MAX_ZONES,ZONES:ZONE_ROLES,PLANS:THEME_ZONES,GROUPS:GROUP_NAMES,TEMPLATES,DEFAULTS,normalize,estimate,program,generate,validateMetadata};
});
