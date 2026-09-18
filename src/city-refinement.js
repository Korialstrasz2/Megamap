/* City Studio refinements: locally mixed neighborhoods and physical signature
 * spaces. GPL-3.0-only. Pure seeded generation; no new settings or narrative.
 * Geometry operations are injected to avoid a circular engine dependency.
 */
(function(root,factory){const api=factory();if(typeof module==='object'&&module.exports)module.exports=api;else{root.MegamapCityRefinement=api;root.MegamapI18n?.register(api.IT);}})(typeof globalThis!=='undefined'?globalThis:this,function(){
'use strict';
const clamp=(x,a,b)=>Math.max(a,Math.min(b,x));
const PROFILES={
 commons:{name:'Residential lanes',material:'tile',gap:.4,width:1,depth:1,lanes:25,site:null},
 oldtown:{name:'Old mixed quarter',material:'weathered',gap:.28,width:.9,depth:1.07,lanes:23,site:'city-cistern'},
 noble:{name:'Villa gardens',material:'slate',gap:3.2,width:1.1,depth:1.05,lanes:43,site:'city-pergola'},
 market:{name:'Market frontages',material:'tile',gap:.35,width:.94,depth:1,lanes:25,site:'city-covered-bazaar'},
 merchants:{name:'Merchant courts',material:'tile',gap:.6,width:1.07,depth:1.1,lanes:28,site:'city-cargo-scales'},
 artisans:{name:'Workshop and service yards',material:'shingle',gap:1.5,width:1,depth:1.1,lanes:29,site:'city-forge-yard'},
 docks:{name:'Working waterfront',material:'shingle',gap:1.4,width:1.1,depth:1.12,lanes:32,site:'city-boat-slip'},
 military:{name:'Garrison courts',material:'slate',gap:2,width:1.1,depth:1.12,lanes:34,site:'city-arcade-court'},
 temple:{name:'Sanctuary gardens',material:'slate',gap:2.2,width:1.1,depth:1.1,lanes:34,site:'city-cloister-herbs'},
 university:{name:'Scholars’ courts',material:'slate',gap:1.6,width:1.07,depth:1.08,lanes:29,site:'city-observatory-dais'},
 gardens:{name:'Garden holdings',material:'shingle',gap:3.5,width:1.05,depth:1,lanes:38,site:'city-pergola'},
 industrial:{name:'Service and kiln yards',material:'weathered',gap:1.7,width:1.12,depth:1.2,lanes:32,site:'city-forge-yard'},
 slums:{name:'Outer lanes',material:'thatch',gap:.45,width:.85,depth:.92,lanes:22,site:null},
 farming:{name:'Cultivated fringe',material:'thatch',gap:3,width:1,depth:1.1,lanes:40,site:'city-cistern'},
 cemetery:{name:'Memorial gardens',material:'slate',gap:3,width:1,depth:1,lanes:36,site:'city-relic-garden'}
};
// Priority order is spatial, not an index-to-ward assignment. Shore and height
// scores vary with the actual seed's terrain; residential uses fill the gaps.
const PROGRAMS={
 fishing:['commons'],
 'river-capital':['docks','noble','market','military','temple','artisans','oldtown','merchants','commons','gardens','university','commons','oldtown'],
 council:['docks','military','market','artisans','oldtown','commons','temple','gardens'],
 market:['market','docks','merchants','artisans','oldtown','commons','gardens'],
 citadel:['military','artisans','market','noble','temple','commons','oldtown','gardens','industrial'],
 canal:['docks','merchants','market','artisans','oldtown','commons','temple','noble','gardens'],
 grove:['temple','gardens','market','artisans','oldtown','commons','farming'],
 oasis:['market','merchants','gardens','temple','artisans','commons','oldtown'],
 crater:['university','artisans','market','oldtown','noble','commons','industrial','gardens','temple'],
 colossus:['oldtown','gardens','artisans','market','commons','temple','merchants']
};
const NAMES={
 'river-capital':{docks:'Naval yards',noble:'Palace-side villas',market:'Bridge markets',military:'Arsenal courts',oldtown:'Old river quarter'},
 council:{docks:'Longship landing',military:'Assembly terrace',commons:'Longhouse clusters',oldtown:'Old timber lanes',market:'Harbor exchange',artisans:'Boatwright yards'},
 fishing:{commons:'Fishing landing'},
 citadel:{military:'High garrison',artisans:'Lower forge terraces',commons:'Slope-side houses',noble:'Upper stone courts'},
 canal:{docks:'Quay warehouses',merchants:'Canal trading courts',oldtown:'Canalside lanes'},
 grove:{temple:'Root sanctuary',gardens:'Sacred grove gardens',commons:'Woodland halls'},
 oasis:{market:'Shaded bazaar',merchants:'Caravan courts',gardens:'Irrigated gardens',temple:'Spring sanctuary'},
 crater:{university:'Astral terraces',artisans:'Crystal workshops',oldtown:'Rim-side lanes'},
 colossus:{oldtown:'Reclaimed foundations',gardens:'Relic gardens',artisans:'Stonecutters’ yards'}
};
const SITES={
 'river-capital':{docks:'city-ropewalk',military:'city-boat-slip',noble:'city-arcade-court'},
 council:{military:'city-assembly-stones',temple:'city-runestone',artisans:'city-boat-slip'},
 grove:{temple:'city-runestone',gardens:'city-cloister-herbs'},
 oasis:{merchants:'city-caravan-yard',gardens:'city-cistern'},
 crater:{university:'city-observatory-dais',artisans:'city-cargo-scales'},
 colossus:{oldtown:'city-relic-garden',gardens:'city-relic-garden'}
};
const IT={
 'Residential lanes':'Vicoli residenziali','Old mixed quarter':'Quartiere antico misto','Market frontages':'Fronti del mercato','Merchant courts':'Corti mercantili','Workshop and service yards':'Cortili di botteghe e servizi','Working waterfront':'Lungomare operativo','Garrison courts':'Corti della guarnigione','Sanctuary gardens':'Giardini del santuario','Scholars’ courts':'Corti degli studiosi','Garden holdings':'Appezzamenti a giardino','Service and kiln yards':'Cortili di servizio e forni','Cultivated fringe':'Margine coltivato',
 'Naval yards':'Cantieri navali','Palace-side villas':'Ville presso il palazzo','Bridge markets':'Mercati dei ponti','Arsenal courts':'Corti dell’arsenale','Old river quarter':'Quartiere fluviale antico','Longship landing':'Approdo dei drakkar','Assembly terrace':'Terrazza dell’assemblea','Longhouse clusters':'Gruppi di case lunghe','Old timber lanes':'Antichi vicoli di legno','Harbor exchange':'Mercato portuale','Boatwright yards':'Cantieri dei maestri d’ascia','Fishing landing':'Approdo di pesca','High garrison':'Guarnigione alta','Lower forge terraces':'Terrazze basse delle forge','Slope-side houses':'Case sul pendio','Upper stone courts':'Corti alte di pietra','Quay warehouses':'Magazzini delle banchine','Canal trading courts':'Corti commerciali dei canali','Canalside lanes':'Vicoli dei canali','Root sanctuary':'Santuario delle radici','Sacred grove gardens':'Giardini del bosco sacro','Shaded bazaar':'Bazar ombreggiato','Caravan courts':'Corti carovaniere','Irrigated gardens':'Giardini irrigati','Spring sanctuary':'Santuario della sorgente','Astral terraces':'Terrazze astrali','Crystal workshops':'Botteghe dei cristalli','Rim-side lanes':'Vicoli sul bordo','Reclaimed foundations':'Fondazioni recuperate','Relic gardens':'Giardini dei reperti','Stonecutters’ yards':'Cortili degli scalpellini'
};
function profile(s,quarter){const p={...(PROFILES[quarter]||PROFILES.commons)},v=s.cityStudio.resolved;
 p.name=NAMES[v.preset]?.[quarter]||p.name;p.site=SITES[v.preset]?.[quarter]||p.site;
 if(v.culture==='nordic'||v.culture==='woodland')p.material=quarter==='noble'?'shingle':'turf';
 if(v.culture==='desert')p.material='plaster';
 if(v.culture==='stone'||v.culture==='arcane')p.material='slate';return p;
}
function assign(s,C){const st=s.cityStudio,v=st.resolved,wards=st.neighborhoods,free=new Set(wards),sequence=C.smartProgram?C.smartProgram(v):PROGRAMS[v.preset]||PROGRAMS.market,assigned=[];
 for(let i=0;i<wards.length;i++){
  let q=v.count<=6?'commons':sequence[i%sequence.length],best=null,score=Infinity;
  for(const w of free){const bank=C.bankDistance(st.ground,w.center),water=Number.isFinite(bank)?Math.max(0,bank):600,z=C.heightAt(st.ground,w.center)/Math.max(1,v.relief),core=C.distance(w.center,st.origin);
   let cost=q==='docks'?water*4:q==='noble'||q==='military'?180*(1-z)+core*.25:q==='market'?Math.abs(core-100)*.55+water*.12:q==='oldtown'||q==='temple'||q==='university'?core*.75:q==='industrial'||q==='artisans'?Math.abs(core-210)*.65+water*.15:Math.abs(core-190)*.4;
   if(q==='gardens')cost+=assigned.filter(a=>['noble','temple'].includes(a.quarter)).reduce((n,a)=>Math.min(n,C.distance(a.center,w.center)),250)*.3;
   // Prefer coherent adjacency for repeated residential neighborhoods, but do
   // not displace a waterfront or high-ground anchor to make a neat pattern.
   const similar=assigned.filter(a=>a.quarter===q);if(similar.length)cost+=Math.min(...similar.map(a=>C.distance(a.center,w.center)))*.18;
   cost+=(C.hash(s.seed+w.id+q)%100)/100;if(cost<score){score=cost;best=w;}
  }
  if(!best)break;if(q==='docks'&&C.bankDistance(st.ground,best.center)>125)q='merchants';
  best.quarter=q;best.profile=profile(s,q);const d=s.features.find(f=>f.id===best.feature);d.quarter=q;d.label=d.ward=best.profile.name;d.cityZone=best.profile.name;
  assigned.push(best);free.delete(best);
 }
 st.refinementVersion=1;
}
function parcel(s,ward,p,road,r,C){const v=s.cityStudio.resolved,q=ward.quarter,pr=profile(s,q),central=clamp(1-C.distance(p,ward.center)/150,0,1),active=['avenue','quay','promenade'].includes(road.cityRole);
 let pool=C.KINDS[q]||C.KINDS.commons;
 if(q==='noble')pool=['villa','villa','villa','villa','townhouse','palace'];
 if(q==='temple')pool=['house','house','shrine','temple'];
 if(q==='military')pool=['barracks','stable','house','house'];
 if(v.culture==='nordic'&&q==='commons')pool=['house','house','house','workshop'];
 // A less active residential seam at the edge, shops on major frontages.
 if(!['noble','cemetery','farming'].includes(q)&&r()<.18*(1-central))pool=['house','townhouse'];
 if(active&&['commons','oldtown','merchants','market'].includes(q)&&r()<.28)pool=['shop','inn','townhouse'];
 const kind=pool[Math.floor(r()*pool.length)],dense=['commons','oldtown','market','slums','merchants'].includes(q),yard=['villa','palace'].includes(kind);
 const waterfront=C.bankDistance(s.cityStudio.ground,p)<85;
 return{kind,dense,yard,width:pr.width*(.93+central*.11),depth:pr.depth,gapM:pr.gap+(1-central)*(dense?.45:1.4),setbackM:yard?6+r()*8:dense?.55+(1-central)*.7:2+r()*2,
  floors:v.culture==='nordic'||v.culture==='woodland'?1+(r()<.28?1:0):yard?2:dense?2+(central>.45&&r()<.48?1:0)+(q==='commons'&&central>.7&&r()<.15?1:0):1+(r()<.55?1:0),
  material:waterfront&&q==='docks'?'weathered':pr.material,zone:pr.name};
}
function sites(s,C){const st=s.cityStudio,v=st.resolved;if(v.count<30)return;
 const r=C.rng(s.seed+'-signature-sites'),occupied=C.builtIndex(s),roads=C.networkIndex(s);let used=0;
 const distinct=new Set();
 for(const ward of st.neighborhoods){const pr=profile(s,ward.quarter);if(!pr.site||distinct.has(pr.site)||used>=7)continue;
  const candidates=s.features.filter(f=>f.type==='road'&&!['pier','bridge','access','approach'].includes(f.cityRole)).flatMap(f=>C.pathSamples(f.points,18).map(p=>({p,f}))).filter(x=>C.neighborhoodAt(s,x.p).id===ward.id&&C.distance(x.p,ward.center)<120);
  candidates.sort((a,b)=>C.distance(a.p,ward.center)-C.distance(b.p,ward.center));
  let done=false;
  for(const {p,f}of candidates.slice(0,45)){if(done)break;const near=C.nearestRoad(s,p,x=>x.id===f.id);if(!near)continue;const a=f.points[near.segment-1],b=f.points[near.segment],ang=Math.atan2(b[1]-a[1],b[0]-a[0]);
   for(const side of[-1,1]){const w=(ward.quarter==='docks'?23:19)/v.metersPerUnit,d=(ward.quarter==='docks'?18:16)/v.metersPerUnit,off=d/2+f.width/2+3/v.metersPerUnit,c=[p[0]-Math.sin(ang)*side*off,p[1]+Math.cos(ang)*side*off],poly=C.rect(c,w,d,ang);
    if(!C.footprintGood(s,poly,roads,occupied))continue;
    if(['city-boat-slip','city-ropewalk'].includes(pr.site)&&C.bankDistance(st.ground,c)>110)continue;
    const front=[c[0]+Math.sin(ang)*side*d/2,c[1]-Math.cos(ang)*side*d/2],path=[p,front],access=C.corridor(...path,Math.max(1.3,2/v.metersPerUnit));
    if(occupied.hits(access,.3)||!C.dryLine(st.ground,path,1)||!C.currentWaterClear(s,access))continue;
    const ground=C.emit(s,'plaza',{polygon:poly,x:c[0],y:c[1],ward:ward.feature,cityRole:'special-ground',cityZone:pr.name,citySurface:['gardens','temple'].includes(ward.quarter)?'garden':'paving',label:''});
    C.street(s,path,'access',Math.max(1.3,2/v.metersPerUnit),{ward:ward.feature,cityBuilding:ground.id,cityStreet:f.id});
    const asset=C.emit(s,'asset',{x:c[0],y:c[1],asset:pr.site,size:Math.min(w,d)*.35,rotation:ang*180/Math.PI,ward:ward.feature,cityRole:'site-detail',cityBuilding:ground.id,cityZone:pr.name,label:'',notes:''});
    st.reservations.push({polygon:poly,blockRoad:true,feature:ground.id});occupied.add(poly,{feature:ground});occupied.add(access,{access:ground.id});roads.add(poly,{reserve:true});
    distinct.add(pr.site);used++;done=true;break;
   }
  }
 }
 st.signatureSites=used;
}
function details(s,C){const st=s.cityStudio,v=st.resolved,r=C.rng(s.seed+'-functional-details'),occupied=C.builtIndex(s),roads=C.networkIndex(s);
 // Existing court polygons are intentionally open. Insets below reserve the
 // central circulation spine and place only genuinely fitting small stamps.
 const count=v.detail==='rich'?2:v.detail==='quiet'?0:1;
 let added=0;
 for(const f of s.features.slice().filter(f=>f.type==='building')){
  const ward=st.neighborhoods.find(w=>w.feature===f.ward);if(!ward)continue;
  const candidates=v.count<=6?['city-net-racks']:ward.quarter==='docks'?['city-capstan','city-net-racks']:ward.quarter==='artisans'||ward.quarter==='industrial'?['city-forge-yard']:ward.quarter==='noble'?['city-pergola']:ward.quarter==='temple'?['city-cloister-herbs']:ward.quarter==='market'?['city-covered-bazaar']:[];
  if(!candidates.length||v.count>6&&(count===0||r()>.14*count))continue;
  const bb=C.bounds(f.polygon),theta=(r()*Math.PI*2),meters=v.count<=6?3.4:2.8,size=meters/v.metersPerUnit;
  for(let i=0;i<12;i++){const a=theta+i*Math.PI/6,c=[f.x+Math.cos(a)*((bb.x1-bb.x0)/2+size+2),f.y+Math.sin(a)*((bb.y1-bb.y0)/2+size+2)],poly=C.rect(c,size*2,size*2,0);
   if(!C.footprintGood(s,poly,roads,occupied))continue;
   const asset=candidates[added%candidates.length],o=C.emit(s,'asset',{x:c[0],y:c[1],asset,size,rotation:0,ward:f.ward,cityRole:'site-detail',cityBuilding:f.id,cityZone:profile(s,ward.quarter).name,label:'',notes:''});occupied.add(poly,{feature:o});added++;break;
  }
  if(added>=Math.min(55,v.count<=6?2:v.count*.075))break;
 }
 st.functionalDetails=added;
}
return{PROFILES,PROGRAMS,IT,profile,assign,parcel,sites,details};
});
