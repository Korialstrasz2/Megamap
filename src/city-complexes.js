/* Reserved city complexes shared by automatic and brush-assisted generation.
 * GPL-3.0-only. Each compound is ordinary editable geometry. Its gate, courts,
 * buildings and ornaments are laid out together before residential infill.
 */
(function(root,factory){const api=factory();if(typeof module==='object'&&module.exports)module.exports=api;else root.MegamapCityComplexes=api;})(typeof globalThis!=='undefined'?globalThis:this,function(){
'use strict';
const SPECS=[
 {kind:'fortress',name:'Inner fortress',quarters:['military'],size:[86,66],min:220},
 {kind:'temple',name:'Great temple gardens',quarters:['temple'],size:[78,62],min:90},
 {kind:'warehouse',name:'Warehouse district yards',quarters:['docks','merchants','industrial'],size:[86,66],min:90},
 {kind:'park',name:'City park',quarters:['gardens','noble'],size:[64,52],min:55},
 {kind:'square',name:'Monument square',quarters:['market','oldtown','commons'],size:[40,34],min:30}
];
function place(s,C){const st=s.cityStudio,v=st.resolved;if(v.count<=6)return;st.complexes=[];
 for(const spec of SPECS){if(v.count<spec.min&&!(spec.kind==='fortress'&&v.walls==='citadel'&&v.count>=60))continue;
  if(spec.kind==='fortress'&&s.options.walls==='none')continue;
  const wards=st.neighborhoods.filter(w=>spec.quarters.includes(w.quarter));if(!wards.length)continue;
  st.reservations=st.reservations.filter(r=>!wards.some(w=>r.smartSite===w.id&&w.smartSite?.kind===spec.kind));
  const ordered=wards.sort((a,b)=>spec.quarters.indexOf(a.quarter)-spec.quarters.indexOf(b.quarter));let placed=false;
  for(const factor of [1,.8,.62]){if(placed)break;
   for(const ward of ordered){if(placed)break;const W=spec.size[0]*factor/s.scale,D=spec.size[1]*factor/s.scale;
    const roads=C.networkIndex(s),occupied=C.builtIndex(s),samples=[];
    const add=(p,f)=>{const near=C.nearestRoad(s,p,x=>x.id===f.id);if(!near)return;const a=f.points[near.segment-1],b=f.points[near.segment],angle=Math.atan2(b[1]-a[1],b[0]-a[0]);for(const side of [-1,1]){const normal=[-Math.sin(angle)*side,Math.cos(angle)*side],offset=D/2+f.width/2+5/s.scale;
     samples.push({center:[p[0]+normal[0]*offset,p[1]+normal[1]*offset],angle,side,near:{...near,point:p}});}};
    for(const f of s.features)if(f.type==='road'&&!['access','pier','bridge','roof-route','tunnel'].includes(f.cityRole))for(const p of C.pathSamples(f.points,22))if(C.distance(p,ward.center)<180)add(p,f);
    samples.sort((a,b)=>{const score=x=>C.distance(x.center,ward.center)+(spec.kind==='warehouse'?Math.min(500,C.bankDistance(st.ground,x.center))*.6:0);return score(a)-score(b);});
    // In a quiet open precinct the street can sit outside its painted edge.
    const near=C.nearestRoad(s,ward.center);if(near){const a=near.road.points[near.segment-1],b=near.road.points[near.segment],angle=Math.atan2(b[1]-a[1],b[0]-a[0]);const side=((ward.center[0]-near.point[0])*-Math.sin(angle)+(ward.center[1]-near.point[1])*Math.cos(angle))>=0?1:-1;samples.push({center:ward.center.slice(),angle,side,near,route:true});}
    // Curved or diagonal street approaches can miss an otherwise roomy
    // precinct. Sample its interior too, facing the gate toward a real road.
    // These slots are fallbacks: successful frontage placement remains stable.
    const interior=[],district=s.features.find(f=>f.id===ward.feature),bb=district?.polygon&&C.bounds(district.polygon),spacing=Math.max(12,Math.min(W,D)*.28);
    if(bb){let examined=0;for(let y=bb.y0+spacing/2;y<bb.y1&&examined<900;y+=spacing)for(let x=bb.x0+spacing/2;x<bb.x1&&examined<900;x+=spacing){examined++;const center=[x,y];
      if(st.paintPlan?C.Plan.at(s,center)?.id!==ward.id:C.neighborhoodAt(s,center).id!==ward.id)continue;
      const near=C.nearestRoad(s,center);if(!near||near.distance>D*2.5+45||near.distance<D/2+near.road.width/2+1)continue;
      const angle=Math.atan2(near.point[1]-y,near.point[0]-x)+Math.PI/2;
      interior.push({center,angle,side:1,near,route:true});
    }}
    interior.sort((a,b)=>C.distance(a.center,ward.center)-C.distance(b.center,ward.center));
    const pinned=[];if(ward.smartSite?.kind===spec.kind&&ward.smartSite.factor===factor){const center=ward.center.slice(),angle=ward.smartSite.angle;for(const side of [-1,1]){const gate=[center[0]+Math.sin(angle)*D/2*side,center[1]-Math.cos(angle)*D/2*side],near=C.nearestRoad(s,gate);if(near)pinned.push({center,angle,side,near,route:true});}}
    for(const slot of pinned.concat(samples.slice(0,100),samples.filter(x=>x.route),interior.slice(0,120))){const cs=Math.cos(slot.angle),sn=Math.sin(slot.angle),T=(x,y)=>[slot.center[0]+cs*x-sn*y*slot.side,slot.center[1]+sn*x+cs*y*slot.side],box=(x,y,w,h)=>[T(x-w/2,y-h/2),T(x+w/2,y-h/2),T(x+w/2,y+h/2),T(x-w/2,y+h/2)],poly=box(0,0,W,D);
     if(st.paintPlan){if(poly.some(p=>C.Plan.cell(p)<0)||C.Plan.touches(poly,st.paintPlan.cellWard,id=>id!==ward.paintIndex,C))continue;}
     else if(C.neighborhoodAt(s,slot.center).id!==ward.id)continue;
     if(!poly.every(p=>C.inside(p,st.boundary))||!C.dryPolygon(st.ground,poly,1.5)||!C.currentWaterClear(s,poly,1)||roads.hits(poly,.4)||occupied.hits(poly,.5))continue;
     const elevations=poly.map(p=>C.heightAt(st.ground,p));if(Math.max(...elevations)-Math.min(...elevations)>10)continue;
     const gate=T(0,-D/2),width=Math.max(1,2.4*factor/s.scale),route=slot.route?C.route(s,slot.near.point,gate,width):[slot.near.point,gate];if(!route||!C.dryLine(st.ground,route,width/2))continue;
     // The final point is the gate on the boundary, not an interior crossing.
     if(C.pathSamples(route,2).slice(0,-1).some(p=>C.inside(p,poly)))continue;
     let clear=true;for(let i=1;i<route.length;i++){const footprint=C.corridor(route[i-1],route[i],width);if(occupied.hits(footprint,.1)||roads.hits(footprint,0,value=>!!value.road)||!C.currentWaterClear(s,footprint,0)){clear=false;break;}}if(!clear)continue;
     compose(s,C,{spec,ward,W,D,T,box,poly,gate,route,width,road:slot.near.road,angle:slot.angle,side:slot.side,factor});placed=true;break;
    }
   }
  }
  if(!placed)st.warnings.push('City complex could not fit safely: '+spec.name+'. More connected open land is needed.');
 }
 st.reservations=st.reservations.filter(r=>!r.smartSite);for(const w of st.neighborhoods)delete w.smartSite;
}
function harbors(s,C){const st=s.cityStudio;if(st.resolved.count<=6)return;let made=0;
 for(const w of st.neighborhoods.filter(w=>w.quarter==='docks').slice(0,3)){
  if(s.features.some(f=>f.cityRole==='pier'&&C.distance(f.points[0],w.center)<180))continue;
  const width=Math.max(1.5,3/s.scale),candidates=[],occupied=C.builtIndex(s),roads=C.networkIndex(s);
  for(let y=45;y<955;y+=12)for(let x=45;x<955;x+=12){const p=[x,y];if(C.distance(p,w.center)>170||C.neighborhoodAt(s,p).id!==w.id||C.waterAt(st.ground,p,width/2+1)||C.bankDistance(st.ground,p)>18/s.scale)continue;if(st.paintPlan&&C.Plan.at(s,p)?.id!==w.id)continue;candidates.push(p);}
  candidates.sort((a,b)=>C.bankDistance(st.ground,a)-C.bankDistance(st.ground,b));let placed=false;
  for(const p of candidates.slice(0,45)){if(placed)break;for(let k=0;k<16;k++){const angle=k*Math.PI/8,end=[p[0]+Math.cos(angle)*24/s.scale,p[1]+Math.sin(angle)*24/s.scale];if(end.some(v=>v<20||v>980)||!C.waterAt(st.ground,end,-width))continue;const deck=C.corridor(p,end,width);if(occupied.hits(deck,.4)||roads.hits(deck,.3))continue;
   const near=C.nearestRoad(s,p);if(!near||near.distance>160)continue;const line=C.route(s,near.point,p,width);if(!line)continue;
   C.street(s,line,'street',width,{ward:w.feature});C.street(s,[p,end],'pier',width,{cityDeck:true,ward:w.feature,label:'Harbor pier'});made++;placed=true;break;
  }}
 }st.harborPiers=made;
}
function compose(s,C,x){const {spec,ward,W,D,T,box,poly,gate,route,width,road,factor}=x,st=s.cityStudio,v=st.resolved;
 const ground=C.emit(s,'plaza',{polygon:poly,x:T(0,0)[0],y:T(0,0)[1],ward:ward.feature,cityRole:'complex-ground',citySurface:['park','temple'].includes(spec.kind)?'garden':'paving',label:spec.name,cityComplexKind:spec.kind});ground.cityComplex=ground.id;
 const common={ward:ward.feature,cityComplex:ground.id,cityComplexKind:spec.kind};
 const entry=C.street(s,route,'access',width,{...common,cityBuilding:ground.id,cityStreet:road.id});
 const paths=[];
 const localPath=points=>{for(let i=1;i<points.length;i++)paths.push(C.corridor(points[i-1],points[i],width));};
 const branch=(end,building)=>{const local=[gate,T(0,-D*.36),T(end[0],-D*.36),T(...end)].filter((p,i,a)=>!i||C.distance(p,a[i-1])>.01);localPath(local);return C.street(s,local,'access',width,{...common,cityBuilding:building.id,cityStreet:entry.id});};
 const blds=[];
 const building=(kind,name,cx,cy,w,h,floors=2,form='rect')=>{let footprint=box(cx,cy,w,h);if(form==='apse')footprint=[T(cx-w/2,cy-h/2),T(cx+w/2,cy-h/2),T(cx+w/2,cy+h*.22),T(cx+w*.27,cy+h/2),T(cx-w*.27,cy+h/2),T(cx-w/2,cy+h*.22)];const p=T(cx,cy),f=C.emit(s,'building',{...common,polygon:footprint,x:p[0],y:p[1],buildingKind:kind,quarter:ward.quarter,cityRole:'civic',cityCulture:v.culture,cityForm:form,cityRoof:v.culture==='desert'?'flat':kind==='keep'?'hip':v.culture==='nordic'?'longhouse':'gable',cityMaterial:ward.profile?.material||'slate',cityFloors:floors,cityFront:0,roof:kind==='temple'?3:1,elevationM:C.heightAt(st.ground,p),label:name,notes:''});blds.push(f);branch([cx,cy-h/2],f);return f;};
 const ornaments=[];
 const asset=(id,cx,cy,r,name='')=>{const p=T(cx,cy),shape=box(cx,cy,r*2,r*2);if(blds.some(f=>C.overlaps(shape,f.polygon,.15))||paths.some(a=>C.overlaps(shape,a,.15))||ornaments.some(a=>C.overlaps(shape,a,.15))||Math.abs(cx)+r>W/2-1||Math.abs(cy)+r>D/2-1)return;
  C.emit(s,'asset',{...common,x:p[0],y:p[1],asset:id,size:r,rotation:x.angle*180/Math.PI,cityRole:'site-detail',label:name,notes:''});ornaments.push(shape);};
 if(spec.kind==='fortress'){
  building('keep','Inner keep',0,D*.19,W*.32,D*.32,4);
  building('barracks','Citadel barracks',-W*.32,D*.02,W*.18,D*.40,2);
  building('barracks','Citadel barracks',W*.32,D*.02,W*.18,D*.40,2);
  const gap=Math.max(width*2.4,6*factor/s.scale),inset=3.2*factor/s.scale;
  const wall=[T(gap/2,-D/2+inset),T(W/2-inset,-D/2+inset),T(W/2-inset,D/2-inset),T(-W/2+inset,D/2-inset),T(-W/2+inset,-D/2+inset),T(-gap/2,-D/2+inset)];
  C.emit(s,'wall',{...common,points:wall,width:Math.max(.7,1.6*factor/s.scale),cityRole:'fortification',label:''});
  for(const dx of [-1,1])for(const dy of [-1,1]){const p=T(dx*(W/2-inset),dy*(D/2-inset));C.emit(s,'asset',{...common,x:p[0],y:p[1],asset:'roof-tower',size:2.2*factor/s.scale,citySymbol:'wall-tower',cityRole:'fortification',label:''});}
  asset('city-guard-post',-W*.21,-D*.28,Math.min(W,D)*.048);
 }else if(spec.kind==='temple'){
  building('temple','Great temple',0,D*.12,W*.42,D*.48,3,v.culture==='nordic'?'rect':'apse');
  asset('city-temple-steps',0,-D*.23,D*.045);
  for(const a of [-1,1]){asset('city-parterre',a*W*.35,D*.16,Math.min(W*.11,D*.14));asset('city-pergola',a*W*.33,-D*.20,D*.09);}
 }else if(spec.kind==='warehouse'){
  for(const a of [-1,1])building('warehouse','Great warehouse',a*W*.29,D*.08,W*.30,D*.60,2);
  asset('city-warehouse-cargo',0,D*.18,Math.min(W*.11,D*.13));asset(C.bankDistance(st.ground,T(0,0))<140?'city-dock-crane':'city-granary-silos',W*.4,-D*.4,D*.055);
 }else{
  // The entrance splits around the center monument, never through its plinth.
  const end=C.emit(s,'area',{...common,polygon:box(0,D*.33,W*.24,D*.08),cityRole:'court',material:'sand',label:''});
  const path=[gate,T(0,-D*.3),T(W*.23,-D*.3),T(W*.23,D*.29),T(0,D*.29)];localPath(path);C.street(s,path,'access',width,{...common,cityBuilding:end.id,cityStreet:entry.id});
  if(spec.kind==='park'){
   asset('city-park-pavilion',0,0,D*.10,'Park pavilion');
   for(const a of [-1,1])for(const y of [-.16,.13])asset('city-parterre',a*W*.36,D*y,Math.min(W,D)*.085);
   for(const a of [-1,1])for(const y of [-.35,.35]){const p=T(a*W*.35,D*y);C.emit(s,'decoration',{...common,x:p[0],y:p[1],asset:v.culture==='desert'?'palm':v.culture==='nordic'?'pine':'oak',size:D*.045,cityRole:'tree',citySymbol:v.culture==='desert'?'palm':v.culture==='nordic'?'pine':'tree',label:''});}
  }else{
   const fountain=C.hash(s.seed+ward.id)%2===0;asset(fountain?'city-grand-fountain':'city-statue-plinth',0,0,D*.115,fountain?'Great fountain':'Civic monument');
   for(const a of [-1,1])asset('city-market-arcade',a*W*.37,0,D*.085);
  }
 }
 st.reservations.push({polygon:poly,blockRoad:true,feature:ground.id});st.complexes.push({id:ground.id,kind:spec.kind,ward:ward.feature,sizeFactor:factor});
}
function validate(s){const c=s.cityStudio.complexes;if(c==null)return;if(!Array.isArray(c)||c.length>8||c.some(x=>!x||!SPECS.some(v=>v.kind===x.kind)||typeof x.id!=='string'||x.id.length>160||typeof x.ward!=='string'||x.ward.length>160||!Number.isFinite(x.sizeFactor)||x.sizeFactor<=0||x.sizeFactor>1))throw Error('Invalid city complexes.');}
return{SPECS,place,harbors,validate};
});
