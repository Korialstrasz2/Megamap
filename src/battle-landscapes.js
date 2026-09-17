/* Room-free outdoor encounters. GPL-3.0-only.
 * Roads and encounter space are reserved before water and cover are placed.
 * Terrain is illustrative: the editor/VTT does not infer climbing or swim rules.
 */
(function(root,factory){const api=factory();if(typeof module==='object'&&module.exports)module.exports=api;else root.MegamapBattleLandscapes=api;})(typeof globalThis!=='undefined'?globalThis:this,function(){
'use strict';
// Sutherland-Hodgman, convex map envelope. Clip the actual vector geometry, not
// just its raster samples, so exported terrain cannot extend beyond a hex map.
function clipPolygon(subject,boundary){
 let out=subject.slice();
 const area=boundary.reduce((sum,p,i)=>{const q=boundary[(i+1)%boundary.length];return sum+p[0]*q[1]-q[0]*p[1];},0),sign=area<0?-1:1;
 for(let i=0;i<boundary.length&&out.length;i++){
  const a=boundary[i],b=boundary[(i+1)%boundary.length],side=p=>sign*((b[0]-a[0])*(p[1]-a[1])-(b[1]-a[1])*(p[0]-a[0])),input=out;out=[];
  for(let j=0;j<input.length;j++){
   const p=input[j],q=input[(j+1)%input.length],sp=side(p),sq=side(q),pin=sp>=-1e-8,qin=sq>=-1e-8;
   if(pin)out.push(p);
   if(pin!==qin){const t=sp/(sp-sq);out.push([p[0]+t*(q[0]-p[0]),p[1]+t*(q[1]-p[1])]);}
  }
 }
 return out;
}
const specs={
 'forest-road':{ground:'grass',road:'road',layout:'Woodland road and clearing',label:'Roadside clearing',density:.19,
  shapes:[[.45,.02],[.32,.22],[.46,.43],[.57,.64],[.47,.82],[.55,.98]],
  cover:['battle-oak-canopy','battle-oak-canopy','battle-oak-canopy','pine','bramble-patch','bramble-patch','boulder'],
  landmarks:['broken-cart','timber-pile','bramble-patch','battle-oak-canopy'],
  notes:'A continuous wagon road crosses the woodland. The wider pull-off is the encounter space; a damaged cart and logging debris provide off-road cover. Trees and thickets leave the marked travel corridor clear.'},
 'mountain-path':{ground:'hill',road:'trail',layout:'Mountain switchbacks and ledge',label:'Passing ledge',density:.12,
  shapes:[[.45,.02],[.27,.20],[.70,.36],[.28,.56],[.67,.77],[.48,.98]],
  cover:['crag-spire','crag-spire','scree-fan','scree-fan','boulder','boulder','pine'],
  landmarks:['stone-cairn','crag-spire','rope-rail','scree-fan'],
  notes:'Switchbacks cross rocky ground, with a wider ledge for passing or an encounter. Crags and scree indicate cover and potentially difficult ground. Cliff height, falling damage and movement costs are for the GM to decide; this is not an elevation simulation.'},
 'marsh-causeway':{ground:'grass',road:'boardwalk',layout:'Wetland causeway and pools',label:'Dry island',density:.13,
  shapes:[[.44,.02],[.49,.24],[.43,.47],[.52,.71],[.47,.98]],
  cover:['marsh-tussock','bog-stump','sunken-log','reeds','marsh-tussock','reeds'],
  landmarks:['bog-stump','sunken-log','marsh-tussock','boardwalk-planks'],
  notes:'A raised timber causeway links dry ground through the marsh. Pools are kept off the travel corridor and central island. Reeds, stumps and washed-up timber provide cover. Water depth and swimming rules are not encoded in VTT exports.'},
 'coastal-cove':{ground:'sand',road:'trail',layout:'Coastal path and tidal inlet',label:'Beach landing',density:.09,
  shapes:[[.33,.02],[.37,.23],[.42,.46],[.36,.71],[.40,.98]],
  cover:['tidal-rocks','driftwood-pile','fishing-baskets','boulder','palm'],
  landmarks:['wrecked-skiff','tidal-rocks','driftwood-pile','fishing-baskets'],
  notes:'A beach path skirts a tidal inlet. A wrecked skiff, driftwood and fishing supplies sit on dry sand beside the landing. The water and rocks are editable terrain features; tides and underwater hazards require GM adjudication.'}
};
function generate(F,{finish,prop,footprint,pointOnRoute,lineDistance,choose,clamp}){
 const spec=specs[F.o.theme];if(!spec)throw Error('Unknown outdoor encounter');
 F.layout=spec.layout;F.outdoor=true;
 for(let i=0;i<F.mask.length;i++)if(F.mask[i]){F.floor[i]=1;F.owner[i]=-2;F.exterior.add(i);}
 const valid=p=>p[0]>=0&&p[1]>=0&&p[0]<F.C&&p[1]<F.R&&F.mask[Math.floor(p[1])*F.C+Math.floor(p[0])];
 // Cell-center anchors avoid ambiguous boundary ownership after 90-degree turns.
 const cellCenter=p=>[Math.floor(p[0])+.5,Math.floor(p[1])+.5];
 function fit(p){if(valid(p))return cellCenter(p);let lo=0,hi=1;for(let k=0;k<24;k++){const t=(lo+hi)/2,q=[F.C/2+(p[0]-F.C/2)*t,F.R/2+(p[1]-F.R/2)*t];if(valid(q))lo=t;else hi=t;}return cellCenter([F.C/2+(p[0]-F.C/2)*lo*.97,F.R/2+(p[1]-F.R/2)*lo*.97]);}
 const route=spec.shapes.map(([x,y],i)=>fit([(x+(i&&i<spec.shapes.length-1?(F.r()-.5)*.07:0))*F.C,y*F.R]));
 const width=F.o.routeWidth,clearance=width/2+1,clearing=pointOnRoute(route,.5),radius=F.o.clearingSize/2;
 for(let y=0;y<F.R;y++)for(let x=0;x<F.C;x++){
  const i=y*F.C+x;if(!F.floor[i])continue;
  if(lineDistance([x+.5,y+.5],route)<clearance||Math.hypot(x+.5-clearing[0],y+.5-clearing[1])<radius+.6)F.reserved.add(i);
 }
 const project=points=>clipPolygon(points.map(p=>F.P(...p)),F.s.battle.boundary);
 function polygon(type,points,attributes){const p=project(points);return p.length>=3?F.H.add(F.s,type,{polygon:p,...attributes}):null;}
 function oval(x,y,rx,ry){return Array.from({length:20},(_,i)=>{const a=i*Math.PI/10;return [x+Math.cos(a)*rx,y+Math.sin(a)*ry];});}
 function water(points){
  const f=polygon('water',points,{notes:'Water lies outside the reserved dry route.'});if(!f)return;
  for(let y=0;y<F.R;y++)for(let x=0;x<F.C;x++){const i=y*F.C+x;if(F.floor[i]&&!F.reserved.has(i)&&F.H.inside([x+.5,y+.5],points))F.wet.add(i);}
 }
 // The coast bank stays clear of the entire route, even at the maximum width.
 if(F.o.theme==='coastal-cove'){
  const minBank=Math.max(...route.map(p=>p[0]))+clearance+1;
  const bank=Array.from({length:13},(_,i)=>{const y=i/12*F.R;return [Math.max(minBank,F.C*(.70+.05*Math.sin(i*.55+F.r()*.3))),y];});
  water([...bank,[F.C,F.R],[F.C,0]]);
  polygon('area',bank.map(([x,y])=>[x-.8,y]).concat(bank.slice().reverse()),{material:'sand',notes:'Dry upper strand along the tidal waterline.'});
 }
 if(F.o.theme==='marsh-causeway'){
  // Reject whole pools near the route instead of painting over water later.
  // This keeps vector artwork and waterCells consistent.
  const count=Math.round(5+F.o.roughness*9);
  for(let k=0,placed=0;k<160&&placed<count;k++){
   const x=(.07+F.r()*.86)*F.C,y=(.08+F.r()*.84)*F.R,rx=1+F.r()*Math.min(4,F.C*.09),ry=1+F.r()*Math.min(3,F.R*.08),ps=oval(x,y,rx,ry);
   if(ps.some(p=>!valid(p)||lineDistance(p,route)<clearance+1||Math.hypot(p[0]-clearing[0],p[1]-clearing[1])<radius+1))continue;
   // The road is outside the entire ellipse, not inside an oversized pool.
   if(lineDistance([x,y],route)<Math.max(rx,ry)+clearance+1)continue;
   water(ps);placed++;
  }
 }
 if(F.o.theme==='mountain-path'){
  // Large rock masses sit outside the trail; individual crags add tactical cover.
  for(let k=0;k<14;k++){
   const x=F.r()*F.C,y=F.r()*F.R,rx=1+F.r()*2.8,ry=1+F.r()*2;
   if(lineDistance([x,y],route)<Math.max(rx,ry)+clearance+1||Math.hypot(x-clearing[0],y-clearing[1])<radius+Math.max(rx,ry)+1)continue;
   polygon('area',oval(x,y,rx,ry),{material:'mountain',notes:'Rocky ground outside the mountain trail; GM assigns elevation and movement costs.'});
  }
 }
 polygon('area',oval(...clearing,radius,radius*.85),{material:spec.ground==='hill'?'sand':spec.ground,notes:spec.notes});
 F.H.add(F.s,'road',{points:route.map(p=>F.P(...p)),width:width*F.g,roadType:spec.road,notes:spec.notes});
 const p=F.P(...clearing);F.H.add(F.s,'label',{x:p[0],y:p[1],size:Math.min(17,F.g*.5),label:spec.label,notes:spec.notes});
 const rngCover=F.H.rng(F.s.seed+'-landscape-cover');
 // Landmark props are placed first. Each placement still obeys the same route,
 // water, envelope and collision checks as all other battle furnishings.
 if(F.o.furnishing>0){
  const candidates=[];
  for(let y=1;y<F.R-1;y++)for(let x=1;x<F.C-1;x++)if(F.floor[y*F.C+x]&&!F.reserved.has(y*F.C+x)&&!F.wet.has(y*F.C+x))candidates.push([x+.5,y+.5]);
  for(let k=0;k<spec.landmarks.length;k++){
   const id=spec.landmarks[k],at=pointOnRoute(route,.23+k*.17),target=[at[0]+(k%2?-1:1)*(clearance+2),at[1]];
   const sorted=candidates.slice().sort((a,b)=>Math.hypot(a[0]-target[0],a[1]-target[1])-Math.hypot(b[0]-target[0],b[1]-target[1]));
   const [w,h]=footprint(id);for(const c of sorted){if(prop(F,id,...c,w,h,k%2?180:0))break;}
  }
  const desired=Math.round(F.mask.filter(Boolean).length*spec.density*F.o.furnishing*(.65+.7*F.o.roughness));
  for(let k=0,placed=0;k<desired*22&&placed<desired;k++){
   const x=.5+rngCover()*(F.C-1),y=.5+rngCover()*(F.R-1),id=choose(rngCover,spec.cover),scale=.75+rngCover()*.5;
   const [w,h]=footprint(id).map(n=>n*scale),turn=Math.floor(rngCover()*4)*90;
   if(prop(F,id,x,y,turn%180?h:w,turn%180?w:h,turn))placed++;
  }
 }
 F.s.battle.landscape={kind:F.o.theme,ground:spec.ground,route:route.map(p=>F.P(...p)),routeWidthFt:width*5,clearing:project(oval(...clearing,radius,radius*.85))};
 F.s.battle.entrance={room:'outdoors',side:['north','east','south','west'][F.turn],point:F.P(...route[0])};
 F.s.notes=spec.notes+'\n\nNo rooms are generated. Tree canopies, rocks and props are cover symbols, not automatically exported vision-blocking walls. Add wall segments in the editor where your VTT needs them.';
 const s=finish(F);
 s.metadata.architecture='Room-free outdoor encounter. The road and encounter space are reserved before water and cover placement. Terrain does not encode an elevation or movement-cost simulation.';
 s.metadata.program=spec.layout;
 s.title=s.title.replace(/ Depths$/,' · '+spec.label);
 return s;
}
return {generate,clipPolygon};
});
