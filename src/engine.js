/* Megamap 1.2.0 — GPL-3.0. City parcel subdivision derives from
 * Watabou's Ward.createAlleys; see vendor/watabou/README.md. */
(function(root,factory){const assets=typeof module==='object'&&module.exports?require('./assets.js'):root.MegamapAssets;const battle=typeof module==='object'&&module.exports?require('./battle.js'):root.MegamapBattle;const studio=typeof module==='object'&&module.exports?require('./city-studio.js'):root.MegamapCityStudio;const api=factory(assets,battle,studio);if(typeof module==='object'&&module.exports)module.exports=api;else root.MegamapEngine=api;})(typeof globalThis!=='undefined'?globalThis:this,function(AssetPack,Battle,Studio){
'use strict';
const VERSION='1.2.0',SIZE=1000;
const clamp=(v,a,b)=>Math.max(a,Math.min(b,v));
const lerp=(a,b,t)=>a+(b-a)*t;
const dist=(a,b)=>{const dx=a[0]-b[0],dy=a[1]-b[1];return Math.sqrt(dx*dx+dy*dy);}; // sqrt is much faster than Math.hypot at map-unit scales
function hash(text){let h=2166136261;for(const c of String(text)){h^=c.charCodeAt(0);h=Math.imul(h,16777619);}return h>>>0;}
function rng(seed){let a=hash(seed);return ()=>{a=(a+0x6D2B79F5)|0;let t=Math.imul(a^(a>>>15),1|a);t^=t+Math.imul(t^(t>>>7),61|t);return ((t^(t>>>14))>>>0)/4294967296;};}
function pick(r,a){return a[Math.floor(r()*a.length)];}
function noise(x,y,seed){const ix=Math.floor(x),iy=Math.floor(y),f=t=>t*t*(3-2*t);const h=(x,y)=>{let n=Math.imul(x,374761393)^Math.imul(y,668265263)^seed;n=Math.imul(n^(n>>>13),1274126177);return ((n^(n>>>16))>>>0)/4294967295;};return lerp(lerp(h(ix,iy),h(ix+1,iy),f(x-ix)),lerp(h(ix,iy+1),h(ix+1,iy+1),f(x-ix)),f(y-iy));}
function fbm(x,y,seed){let sum=0,a=.56;for(let k=0;k<5;k++){sum+=a*noise(x,y,seed+k*3719);x*=2;y*=2;a*=.5;}return sum/1.085;}
function area(p){let a=0;for(let i=0;i<p.length;i++){const q=p[(i+1)%p.length];a+=p[i][0]*q[1]-q[0]*p[i][1];}return Math.abs(a)/2;}
function center(p){if(!p.length)return[0,0];return p.reduce((a,b)=>[a[0]+b[0]/p.length,a[1]+b[1]/p.length],[0,0]);}
function clip(p,n,c){const out=[];if(!p.length)return out;for(let i=0;i<p.length;i++){const a=p[i],b=p[(i+1)%p.length],da=a[0]*n[0]+a[1]*n[1]-c,db=b[0]*n[0]+b[1]*n[1]-c;const ina=da<=1e-7,inb=db<=1e-7;if(ina)out.push(a.slice());if(ina!==inb){const t=da/(da-db);out.push([lerp(a[0],b[0],t),lerp(a[1],b[1],t)]);}}return out;}
function inset(p,d){let q=p.map(x=>x.slice());const mid=center(p);for(let i=0;i<p.length;i++){const a=p[i],b=p[(i+1)%p.length],len=dist(a,b);if(len<1e-7)continue;let n=[(b[1]-a[1])/len,-(b[0]-a[0])/len];let c=n[0]*a[0]+n[1]*a[1];if(n[0]*mid[0]+n[1]*mid[1]>c){n=n.map(v=>-v);c=-c;}q=clip(q,n,c-d);if(q.length<3)return[];}return q;}
function inside(q,p){let yes=false;for(let i=0,j=p.length-1;i<p.length;j=i++){const a=p[i],b=p[j];if(((a[1]>q[1])!==(b[1]>q[1]))&&q[0]<(b[0]-a[0])*(q[1]-a[1])/(b[1]-a[1])+a[0])yes=!yes;}return yes;}
function hull(points){const ps=points.map(p=>p.slice()).sort((a,b)=>a[0]-b[0]||a[1]-b[1]);if(ps.length<3)return ps;const cross=(o,a,b)=>(a[0]-o[0])*(b[1]-o[1])-(a[1]-o[1])*(b[0]-o[0]);const lo=[],hi=[];for(const p of ps){while(lo.length>1&&cross(lo.at(-2),lo.at(-1),p)<=0)lo.pop();lo.push(p);}for(const p of ps.slice().reverse()){while(hi.length>1&&cross(hi.at(-2),hi.at(-1),p)<=0)hi.pop();hi.push(p);}lo.pop();hi.pop();return lo.concat(hi);}
function voronoi(sites,bounds){return sites.map((s,i)=>{let p=bounds.map(v=>v.slice());for(let j=0;j<sites.length&&p.length;j++){if(i===j)continue;const t=sites[j],n=[t[0]-s[0],t[1]-s[1]];p=clip(p,n,(t[0]*t[0]+t[1]*t[1]-s[0]*s[0]-s[1]*s[1])/2);}return p;});}
/** Port/adaptation of Watabou Ward.createAlleys (GPL-3.0).
 * Bounded recursion and degenerate polygon handling are Megamap additions. */
function createAlleys(p,minSq,gridChaos,sizeChaos,r,emptyProb=.04,depth=0){
 if(p.length<3||area(p)<9)return[];
 if(depth>=14||area(p)<minSq*.55)return r()<emptyProb?[]:[p];
 let k=0,longest=-1;for(let i=0;i<p.length;i++){const d=dist(p[i],p[(i+1)%p.length]);if(d>longest){k=i;longest=d;}}
 const a=p[k],b=p[(k+1)%p.length],spread=.8*gridChaos,ratio=(1-spread)/2+r()*spread;
 const angle=(r()-.5)*Math.PI/6*gridChaos*(area(p)<minSq*4?0:1);
 const ux=(b[0]-a[0])/longest,uy=(b[1]-a[1])/longest,n=[ux*Math.cos(angle)-uy*Math.sin(angle),ux*Math.sin(angle)+uy*Math.cos(angle)];
 const cutpoint=[lerp(a[0],b[0],ratio),lerp(a[1],b[1],ratio)],c=n[0]*cutpoint[0]+n[1]*cutpoint[1],gap=.7;
 const halves=[clip(p,n,c-gap/2),clip(p,[-n[0],-n[1]],-c-gap/2)];
 if(halves.some(h=>h.length<3||area(h)<2)||halves.some(h=>area(h)>area(p)*.985))return[p];
 let out=[];for(const h of halves){if(area(h)<minSq*Math.pow(2,4*sizeChaos*(r()-.5))){if(r()>=emptyProb&&area(h)>=9)out.push(h);}else out.push(...createAlleys(h,minSq,gridChaos,sizeChaos,r,emptyProb,depth+1));}return out;
}
const first=['Ash','Briar','Crow','Dun','Elder','Fallow','Grey','High','Iron','Kings','Low','Moon','North','Oak','Raven','Red','Silver','Stone','Thorn','West','White','Wyrm'];
const last=['bridge','brook','cross','dale','fell','ford','gate','haven','hold','hollow','mere','mont','port','reach','ridge','stead','vale','watch','wick','wood'];
function name(r){return pick(r,first)+pick(r,last);}
const ASSETS=AssetPack.catalog.map(a=>a.id);
const defaults={
 fantasy:{...Studio.DEFAULTS},
 region:{sizeKm:20,terrain:'valley',water:.36,ruggedness:.55,forest:.5,settlements:9,poi:14},
 city:{sizeKm:2.4,districts:55,density:.7,chaos:.45,river:true,walls:true,coast:false,layout:'organic',shape:'random',shapeGuidance:65,rotation:0,quarterDetail:.7,
  quarters:['market','commons','oldtown','artisans','temple','noble','gardens','docks','military','merchants'],buildings:[]},
 battle:{...Battle.DEFAULTS},
 local:{sizeKm:20,biome:'woodland',averageHeight:350,heightDiversity:500,forest:.65,water:'stream',riverWidth:18,roads:'none',homesteads:0,minSeparationKm:2,caves:4,detail:.7}
};
function options(mode,o={}){
 if(mode==='fantasy')return Studio.normalize(o);
 if(!defaults[mode])throw Error('Unknown map mode');const d=defaults[mode],v={...d,...o};
 const number=(k,a,b)=>{const n=Number(v[k]);v[k]=Number.isFinite(n)?clamp(n,a,b):d[k];};
 const integer=(k,a,b)=>{number(k,a,b);v[k]=Math.round(v[k]);};
 const choose=(k,values)=>{if(!values.includes(v[k]))v[k]=d[k];};
 const subset=(k,ids)=>{v[k]=Array.isArray(v[k])?[...new Set(v[k].filter(x=>typeof x==='string'&&ids.includes(x)))]:d[k].slice();};
 if(mode==='region'){
  number('sizeKm',2,100);number('water',.1,.7);number('ruggedness',0,1);number('forest',0,1);integer('settlements',2,30);integer('poi',0,40);choose('terrain',['valley','island','coast','highlands','archipelago']);
 }else if(mode==='city'){
  number('sizeKm',.5,8);integer('districts',12,140);number('density',.1,1);number('chaos',0,1);number('quarterDetail',0,1);integer('shapeGuidance',1,100);number('rotation',0,359);
  ['river','walls','coast'].forEach(k=>v[k]=!!v[k]);choose('layout',['organic','planned','radial']);choose('shape',CITY_SHAPES.map(x=>x[0]));
  subset('quarters',QUARTERS.map(q=>q.id));subset('buildings',BUILDING_TYPES.map(q=>q.id));
 }else if(mode==='local'){
  number('sizeKm',.5,40);choose('biome',LOCAL_BIOMES.map(x=>x[0]));number('averageHeight',-500,6000);number('heightDiversity',0,5000);number('forest',0,1);number('riverWidth',2,120);choose('water',['none','stream','river','lake','coast']);choose('roads',['none','footpath','road','network']);integer('homesteads',0,12);number('minSeparationKm',.2,20);integer('caves',0,20);number('detail',0,1);
 }else{
  return Battle.normalize(o);
 }return v;
}
function base(mode,seed,o){return{format:'megamap',version:1,engineVersion:VERSION,mode,seed:String(seed),options:o,title:name(rng(String(seed)+'title'))+(mode==='region'?' Reach':mode==='city'?'':' Depths'),width:SIZE,height:SIZE,units:mode==='battle'?'ft':'km',scale:mode==='battle'?o.cols*5:o.sizeKm,features:[],terrain:null,notes:'',metadata:{coordinateSystem:'local map units; not georeferenced'}};}
const featureCounters=new WeakMap();
function add(s,type,more){let id=featureCounters.get(s);if(id==null)id=s.features.reduce((n,f)=>/^f\d+$/.test(f.id)?Math.max(n,Number(f.id.slice(1))+1):n,0);featureCounters.set(s,id+1);const f={id:'f'+id,type,...more};s.features.push(f);return f;}
function nearPolyline(p,line){let d=Infinity;for(let i=1;i<line.length;i++){const a=line[i-1],b=line[i],vx=b[0]-a[0],vy=b[1]-a[1],t=clamp(((p[0]-a[0])*vx+(p[1]-a[1])*vy)/(vx*vx+vy*vy||1),0,1);d=Math.min(d,dist(p,[a[0]+t*vx,a[1]+t*vy]));}return d;}
class Heap{constructor(){this.a=[];}push(node){const a=this.a;a.push(node);let i=a.length-1;while(i){const p=(i-1)>>1;if(a[p][0]<=node[0])break;a[i]=a[p];i=p;}a[i]=node;}pop(){const a=this.a,top=a[0],end=a.pop();if(a.length){let i=0;while(2*i+1<a.length){let c=2*i+1;if(c+1<a.length&&a[c+1][0]<a[c][0])c++;if(a[c][0]>=end[0])break;a[i]=a[c];i=c;}a[i]=end;}return top;}get length(){return this.a.length;}}
function astar(grid,n,start,end,sea){const idx=p=>clamp(Math.floor(p[1]/SIZE*n),0,n-1)*n+clamp(Math.floor(p[0]/SIZE*n),0,n-1);const a=idx(start),b=idx(end),g=new Float64Array(n*n).fill(Infinity),from=new Int32Array(n*n).fill(-1),closed=new Uint8Array(n*n),heap=new Heap();g[a]=0;heap.push([0,a]);while(heap.length){const [,u]=heap.pop();if(closed[u])continue;if(u===b)break;closed[u]=1;const x=u%n,y=Math.floor(u/n);for(const[dx,dy]of [[1,0],[-1,0],[0,1],[0,-1],[1,1],[-1,-1],[1,-1],[-1,1]]){const xx=x+dx,yy=y+dy;if(xx<0||yy<0||xx>=n||yy>=n)continue;const v=yy*n+xx,water=grid[v]<sea?35:0,cost=Math.hypot(dx,dy)*(1+water+Math.abs(grid[v]-grid[u])*50+Math.max(0,grid[v]-.7)*8);const ng=g[u]+cost;if(ng<g[v]){g[v]=ng;from[v]=u;heap.push([ng+Math.hypot(xx-b%n,yy-Math.floor(b/n)),v]);}}}if(a!==b&&from[b]===-1)return[start,end];const pts=[];for(let v=b;v!==-1;v=from[v]){pts.push([(v%n+.5)*SIZE/n,(Math.floor(v/n)+.5)*SIZE/n]);if(v===a)break;}pts.reverse();const simplified=pts.filter((p,i)=>i===0||i===pts.length-1||i%3===0);simplified[0]=start;simplified[simplified.length-1]=end;return simplified;}
function region(seed,config){const o=options('region',config),s=base('region',seed,o),r=rng(seed),hseed=hash(seed),n=112,heights=[],moisture=[];for(let y=0;y<n;y++)for(let x=0;x<n;x++){const nx=x/(n-1),ny=y/(n-1),rad=Math.hypot(nx-.5,ny-.5);let h=fbm(nx*3.3,ny*3.3,hseed);h=.5+(h-.5)*(.8+o.ruggedness);if(o.terrain==='island')h+=.27-rad*.82;else if(o.terrain==='archipelago')h+=.1-rad*.4+noise(nx*9,ny*9,hseed)*.08;else if(o.terrain==='coast')h+=(nx-.5)*.55;else if(o.terrain==='highlands')h+=.16;else h+=Math.abs(nx-.5)*.32-.05;heights.push(clamp(h,0,1));moisture.push(fbm(nx*5+13,ny*5+17,hseed+777));}
 s.terrain={n,heights,moisture,sea:o.water};
 const elev=p=>heights[clamp(Math.floor(p[1]/SIZE*n),0,n-1)*n+clamp(Math.floor(p[0]/SIZE*n),0,n-1)];
 // Drainage tree: priority-flood establishes a parent toward boundary or sea.
 const filled=heights.slice(),parent=new Int32Array(n*n).fill(-1),seen=new Uint8Array(n*n),heap=new Heap();
 for(let y=0;y<n;y++)for(let x=0;x<n;x++){const i=y*n+x;if(x===0||y===0||x===n-1||y===n-1||heights[i]<o.water){heap.push([heights[i],i]);seen[i]=1;}}
 while(heap.length){const [h,i]=heap.pop(),x=i%n,y=Math.floor(i/n);for(const [dx,dy]of[[1,0],[-1,0],[0,1],[0,-1]]){const xx=x+dx,yy=y+dy,j=yy*n+xx;if(xx<0||yy<0||xx>=n||yy>=n||seen[j])continue;seen[j]=1;parent[j]=i;filled[j]=Math.max(heights[j],h+.000001);heap.push([filled[j],j]);}}
 const used=new Set();let rivers=0;for(let tries=0;tries<120&&rivers<5;tries++){let i=Math.floor(r()*n*n);if(heights[i]<Math.max(.54,o.water+.13)||used.has(i))continue;const path=[];let j=i;while(j!==-1&&path.length<n*3){path.push([(j%n+.5)*SIZE/n,(Math.floor(j/n)+.5)*SIZE/n]);if(heights[j]<o.water||used.has(j))break;j=parent[j];}if(path.length<12)continue;for(let j=i;j!==-1&&!used.has(j);j=parent[j]){used.add(j);if(heights[j]<o.water)break;}let curve=path;for(let k=0;k<2;k++){const next=[curve[0]];for(let j=1;j<curve.length;j++){const a=curve[j-1],b=curve[j];next.push([a[0]*.75+b[0]*.25,a[1]*.75+b[1]*.25],[a[0]*.25+b[0]*.75,a[1]*.25+b[1]*.75]);}next.push(curve.at(-1));curve=next;}add(s,'river',{points:curve,width:3.7+r()*3});rivers++;}
 const settlements=[],occupied=[];const uniqueNames=new Set();for(let k=0;k<Math.round(o.settlements);k++){let best=null,bestScore=-Infinity;for(let t=0;t<260;t++){const p=[60+r()*880,60+r()*880],h=elev(p);if(h<o.water+.022||h>.83||occupied.some(q=>dist(p,q)<80))continue;const nearRiver=s.features.filter(f=>f.type==='river').reduce((d,f)=>Math.min(d,nearPolyline(p,f.points)),300);const score=r()*.24-Math.abs(h-(o.water+.13))*2-Math.min(nearRiver,180)/700;if(score>bestScore){best=p;bestScore=score;}}if(!best)continue;occupied.push(best);let label=name(r);while(uniqueNames.has(label))label=name(r);uniqueNames.add(label);settlements.push(add(s,'settlement',{x:best[0],y:best[1],asset:k===0?'castle':k<3?'manor':'cottage',size:k===0?22:16,label,population:k===0?2500+Math.floor(r()*7000):80+Math.floor(r()*1700),citySeed:seed+'-'+k,notes:pick(r,['A disputed river toll funds the watch.','The local shrine has stopped ringing its bell.','A seasonal fair draws traders from the hills.','The oldest well leads into forgotten passages.','The road wardens have not returned.'])}));}
 const connected=new Set([0]);while(connected.size<settlements.length){let edge=null,d=Infinity;for(const a of connected)for(let b=0;b<settlements.length;b++){if(connected.has(b))continue;const l=dist([settlements[a].x,settlements[a].y],[settlements[b].x,settlements[b].y]);if(l<d){d=l;edge=[a,b];}}if(!edge)break;const[a,b]=edge,pa=[settlements[a].x,settlements[a].y],pb=[settlements[b].x,settlements[b].y];add(s,'road',{points:astar(heights,n,pa,pb,o.water),width:3.2,roadType:'road'});connected.add(b);}
 // A small road loop makes alternatives rather than only a spanning tree.
 if(settlements.length>4){const a=settlements[1],b=settlements.at(-1);add(s,'road',{points:astar(heights,n,[a.x,a.y],[b.x,b.y],o.water),width:2,roadType:'trail'});}
 for(let k=0;k<o.poi;k++){for(let t=0;t<150;t++){const p=[35+r()*930,35+r()*930];if(elev(p)<o.water+.01||occupied.some(q=>dist(p,q)<42))continue;occupied.push(p);const asset=pick(r,['ruin','cave','mine','tower','temple','camp','gravestone']);add(s,'poi',{x:p[0],y:p[1],asset,size:16,label:pick(r,['Old','Lost','Broken','Silent','Hidden','Forgotten'])+' '+({ruin:'Ruins',cave:'Cavern',mine:'Mine',tower:'Watch',temple:'Shrine',camp:'Camp',gravestone:'Barrows'}[asset]),notes:pick(r,['Fresh tracks lead away toward the nearest settlement.','Something here appears on no surviving chart.','An old boundary stone bears a warning.','A local guide knows a safer approach.'])});break;}}
 for(let k=0;k<1500;k++){const p=[20+r()*960,20+r()*960],h=elev(p),i=clamp(Math.floor(p[1]/SIZE*n),0,n-1)*n+clamp(Math.floor(p[0]/SIZE*n),0,n-1);if(h<o.water+.03||occupied.some(q=>dist(p,q)<23))continue;let asset=null;if(h>.73)asset='mountain';else if(moisture[i]>.65-o.forest*.29&&r()<o.forest)asset=h>.61?pick(r,['pine','cedar']):pick(r,['tree','oak','birch','willow']);else if(h>.66&&r()<.25)asset='hill';if(asset)add(s,'decoration',{x:p[0],y:p[1],asset,size:asset==='mountain'?14+r()*10:8+r()*5,rotation:0});}
 // Mark crossings on roads near river centerlines (schematic, not structural bridges).
 const riversF=s.features.filter(f=>f.type==='river');for(const road of s.features.filter(f=>f.type==='road')){let last=[-100,-100];for(let i=1;i<road.points.length-1;i++){const p=road.points[i];if(dist(p,last)<25)continue;if(riversF.some(f=>nearPolyline(p,f.points)<6)){const a=road.points[i-1],b=road.points[i+1];add(s,'decoration',{x:p[0],y:p[1],asset:'bridge',size:11,rotation:Math.atan2(b[1]-a[1],b[0]-a[0])*180/Math.PI});last=p;}}}
 return s;
}
// ---- v1.2: guided city envelopes, quarter programs, and local surveys. ----
const CITY_SHAPES = [
 ['random','Organic / random'],['circle','Circle'],['ellipse','Oval'],
 ['square','Square'],['rectangle','Rectangle'],['triangle','Triangle'],
 ['diamond','Diamond'],['hexagon','Hexagon'],['octagon','Octagon'],
 ['l-shape','L-shaped'],['t-shape','T-shaped'],['ribbon','River ribbon']
];
const QUARTERS = [
 {id:'market',name:'Market',kinds:['shop','guildhall','inn'],props:['canopy-stall','produce-stall','cloth-stall','market-scale'],factor:1.1},
 {id:'commons',name:'Commons',kinds:['house','tenement','tavern','shrine'],props:['laundry-line','communal-oven','street-well'],factor:.85},
 {id:'oldtown',name:'Old town',kinds:['house','townhouse','inn','shrine'],props:['street-well','small-square','street-lamp'],factor:.95},
 {id:'artisans',name:'Artisans',kinds:['workshop','smithy','guildhall','house'],props:['timber-rack','kiln-yard','dye-vats','artisan-yard'],factor:1.15},
 {id:'temple',name:'Temple precinct',kinds:['temple','shrine','monastery','hospital'],props:['cloister-garden','processional-square','statue','cemetery'],factor:2.2},
 {id:'noble',name:'Noble quarter',kinds:['villa','palace','townhouse','bathhouse'],props:['formal-garden','hedge-maze','reflecting-pool','gazebo'],factor:2.0},
 {id:'gardens',name:'Gardens',kinds:['greenhouse'],props:['formal-garden','orchard-block','gazebo','pond-garden'],factor:2.3},
 {id:'docks',name:'Docks',kinds:['warehouse','fishmarket','shipyard','tavern'],props:['dock-crane','dry-dock','cargo-yard','fishing-racks'],factor:1.7},
 {id:'military',name:'Military quarter',kinds:['barracks','keep','stable','smithy'],props:['drill-yard','archery-yard','training-ring','supply-yard'],factor:1.7},
 {id:'merchants',name:'Merchants',kinds:['shop','townhouse','warehouse','guildhall','inn'],props:['covered-market','trade-court','market-scale','street-lamp'],factor:1.35},
 {id:'university',name:'Scholars',kinds:['library','college','observatory','hospital'],props:['astronomical-court','botanical-garden','cloister-garden','statue'],factor:1.9},
 {id:'industrial',name:'Industrial quarter',kinds:['workshop','smithy','mill','warehouse'],props:['kiln-yard','dye-vats','timber-rack','charcoal-yard'],factor:1.35},
 {id:'slums',name:'Shantytown',kinds:['shack','tenement','tavern'],props:['laundry-line','scrap-yard','communal-oven','street-well'],factor:.65},
 {id:'cemetery',name:'Necropolis',kinds:['mausoleum','shrine'],props:['grave-row','memorial-circle','crypt-entrance','cemetery'],factor:2.2},
 {id:'farming',name:'Farmsteads',kinds:['house','barn','granary','mill','stable'],props:['vegetable-plots','orchard-block','hay-yard','animal-pen'],factor:1.65}
];
const BUILDING_TYPES = [
 ['house','Houses',['roof-cottage','roof-lhouse','roof-longhouse']],
 ['townhouse','Townhouses',['roof-townhouse','roof-townhouse-gabled']],
 ['tenement','Tenements',['roof-tenement','roof-rowhouse']],
 ['shack','Shacks',['roof-shack','roof-hut']],
 ['villa','Villas',['roof-villa','roof-villa-pool']],
 ['palace','Palaces',['roof-palace','roof-courtyard']],
 ['workshop','Workshops',['roof-workshop','roof-pottery']],
 ['smithy','Smithies',['roof-smithy']],
 ['shop','Shops',['roof-shop','roof-shop-arcade']],
 ['warehouse','Warehouses',['roof-warehouse','roof-warehouse-paired']],
 ['inn','Inns',['roof-inn','roof-inn-court']],
 ['tavern','Taverns',['roof-tavern']],
 ['temple','Temples',['roof-temple','roof-domed-temple']],
 ['shrine','Shrines',['roof-shrine']],
 ['monastery','Monasteries',['roof-monastery']],
 ['barracks','Barracks',['roof-barracks','roof-barracks-court']],
 ['keep','Keeps',['roof-keep']],
 ['stable','Stables',['roof-stable']],
 ['library','Libraries',['roof-library']],
 ['college','Colleges',['roof-college']],
 ['observatory','Observatories',['roof-observatory']],
 ['hospital','Hospitals',['roof-hospital']],
 ['bathhouse','Bathhouses',['roof-bathhouse']],
 ['mill','Mills',['roof-mill']],
 ['barn','Barns',['roof-barn']],
 ['granary','Granaries',['roof-granary']],
 ['guildhall','Guildhalls',['roof-guildhall']],
 ['fishmarket','Fish markets',['roof-fishmarket']],
 ['shipyard','Shipyards',['roof-shipyard']],
 ['greenhouse','Greenhouses',['roof-greenhouse']],
 ['mausoleum','Mausoleums',['roof-mausoleum']]
].map(([id,name,assets])=>({id,name,assets}));
const LOCAL_BIOMES = [
 ['woodland','Temperate woodland'],['plains','Grassland / plains'],
 ['mountains','Mountain range'],['desert','Sandy desert'],['badlands','Badlands / canyons'],
 ['wetland','Marsh & wetland'],['coast','Coastal landscape'],
 ['alpine','Alpine high country'],['volcanic','Volcanic terrain'],['tundra','Tundra']
];
const GRID_TYPES = ['square','hex-pointy','hex-flat'];
function signedArea(p){let a=0;for(let i=0;i<p.length;i++){const b=p[(i+1)%p.length];a+=p[i][0]*b[1]-b[0]*p[i][1];}return a/2;}
function cleanPolygon(p){
 let q=[];for(const v of p)if(!q.length||dist(v,q.at(-1))>1e-5)q.push(v.slice());
 if(q.length>1&&dist(q[0],q.at(-1))<1e-5)q.pop();
 let changed=true;while(changed&&q.length>3){changed=false;for(let i=0;i<q.length;i++){
  const a=q[(i+q.length-1)%q.length],b=q[i],c=q[(i+1)%q.length];
  if(Math.abs((b[0]-a[0])*(c[1]-b[1])-(b[1]-a[1])*(c[0]-b[0]))<1e-7){q.splice(i,1);changed=true;break;}
 }}
 if(signedArea(q)<0)q.reverse();return q;
}
function pointOnOrInside(p,poly,tol=1e-5){return inside(p,poly)||nearPolyline(p,[...poly,poly[0]])<=tol;}
/** Ear clipping handles concave target envelopes; returns only interior triangles. */
function triangulate(poly){
 const p=cleanPolygon(poly),indices=p.map((_,i)=>i),out=[];
 const cross=(a,b,c)=>(b[0]-a[0])*(c[1]-a[1])-(b[1]-a[1])*(c[0]-a[0]);
 const inTri=(p,a,b,c)=>cross(a,b,p)>1e-7&&cross(b,c,p)>1e-7&&cross(c,a,p)>1e-7;
 let guard=p.length*p.length;
 while(indices.length>3&&guard-->0){let found=false;for(let k=0;k<indices.length;k++){
  const ia=indices[(k+indices.length-1)%indices.length],ib=indices[k],ic=indices[(k+1)%indices.length],a=p[ia],b=p[ib],c=p[ic];
  if(cross(a,b,c)<=1e-7)continue;
  if(indices.some(j=>j!==ia&&j!==ib&&j!==ic&&inTri(p[j],a,b,c)))continue;
  out.push([a,b,c]);indices.splice(k,1);found=true;break;
 }if(!found)throw Error('The city outline could not be triangulated safely.');}
 if(indices.length===3)out.push(indices.map(i=>p[i]));return out;
}
function convexIntersection(subject,bounds){let p=subject;const q=cleanPolygon(bounds);for(let i=0;i<q.length&&p.length;i++){
 const a=q[i],b=q[(i+1)%q.length],n=[b[1]-a[1],a[0]-b[0]];p=clip(p,n,n[0]*a[0]+n[1]*a[1]);
 }return cleanPolygon(p);}
/** Rejoin triangle fragments before making streets: triangulation diagonals are NOT roads. */
function joinFragments(pieces){
 const key=p=>p.map(v=>Math.round(v*1e5)).join(','),edges=new Map();
 for(const poly of pieces)for(let i=0;i<poly.length;i++){
  const a=poly[i],b=poly[(i+1)%poly.length],ka=key(a),kb=key(b);if(ka===kb)continue;
  const rev=kb+'>'+ka;if(edges.has(rev))edges.delete(rev);else edges.set(ka+'>'+kb,{a,b,ka,kb});
 }
 const starts=new Map();for(const e of edges.values()){if(!starts.has(e.ka))starts.set(e.ka,[]);starts.get(e.ka).push(e);}
 const used=new Set(),loops=[];
 for(const first of edges.values()){
  if(used.has(first))continue;let e=first,poly=[],limit=edges.size+1;
  while(e&&!used.has(e)&&limit-->0){used.add(e);poly.push(e.a);if(e.kb===first.ka)break;e=(starts.get(e.kb)||[]).find(v=>!used.has(v));}
  if(e&&e.kb===first.ka&&poly.length>2){poly=cleanPolygon(poly);if(area(poly)>3)loops.push(poly);}
 }
 return loops;
}
function clipToEnvelope(cell,triangles){const pieces=[];for(const t of triangles){const p=convexIntersection(cell,t);if(p.length>2&&area(p)>1e-5)pieces.push(p);}return joinFragments(pieces);}
function isConvex(poly){const p=cleanPolygon(poly);for(let i=0;i<p.length;i++){const a=p[i],b=p[(i+1)%p.length],c=p[(i+2)%p.length];if((b[0]-a[0])*(c[1]-b[1])-(b[1]-a[1])*(c[0]-b[0])< -1e-6)return false;}return true;}
function convexParts(poly){if(isConvex(poly))return[poly];const parts=triangulate(poly);let merge=true;
 while(merge){merge=false;outer:for(let i=0;i<parts.length;i++)for(let j=i+1;j<parts.length;j++){
  const h=hull([...parts[i],...parts[j]]);if(Math.abs(area(h)-area(parts[i])-area(parts[j]))<.01){parts[i]=cleanPolygon(h);parts.splice(j,1);merge=true;break outer;}
 }}return parts;
}
// ---- City generation repair: geometry policy and predicates ----------------
// Numerical tolerance is separate from visible placement clearance: boundary
// contact may join adjacent land pieces, but placed objects keep clearance.
const EPS=1e-6;                 // numerical tolerance, local units
const PLACE_CLEARANCE=.5;       // visible gap between placed objects
const RIVER_BANK_GAP=8;         // dry bank kept beyond the river half-width
const SHORE_SETBACK=1.5;        // dry setback kept beyond a coastal shoreline
const WATERFRONT_GAP=60;        // max bank/shore gap for water-dependent activity;
                                // tuned so the shipped coastal frame (39-56 units
                                // from the shoreline) keeps usable waterfront
const OPEN_SPACE_FRACTION=.35;  // target share of usable dry land per open program
const MIN_OPEN_SPACE=250;       // smallest readable open-space reservation
const OPEN_MATERIALS={market:'sand',gardens:'grass',cemetery:'hill',farming:'sand'};
const PROP_MIN_SIZE=4;          // floor for a bounded shrink; never an unreadable dot
const MAX_PROP_ATTEMPTS=65;     // bounded placement attempts per requested prop
const WATER_KINDS=['shipyard','fishmarket'];          // buildings that need nearby water
const WATER_PROPS=['dry-dock','dock-crane','fishing-racks']; // detail that needs it
const STREET_SETBACK=4.2;       // district street setback, applied once
const LOT_INSET=.75;            // per-lot inset before a building footprint
const MIN_BUILD_WIDTH=2.4;      // minimum support width for a building footprint
const MIN_PLAN_WIDTH=2*LOT_INSET+MIN_BUILD_WIDTH; // land too narrow to host one
const MAX_BUILD_ASPECT=6;       // fitted roof-frame aspect limit for a building
const TIP_ANGLE=15;             // bevel a tip whose corner angle is below this (deg)
const TIP_EXTENSION=.12;        // ... and whose height/base extension exceeds this
const TIP_TRIM=.35;             // fraction of the adjoining sides removed per bevel
const MAX_TIP_TRIMS=6;          // bounded repair passes per footprint
const FOOTPRINT_TOL=1e-4;       // vertex cleanup tolerance for building footprints
const MAX_PLAN_PIECES=96;       // bounded convex fragments per district plan
const CAPSULE_SEGMENTS=12;      // cap chords; polygon contains the true circle
function orient(a,b,c){return (b[0]-a[0])*(c[1]-a[1])-(b[1]-a[1])*(c[0]-a[0]);}
function properCross(a,b,c,d){const o1=orient(a,b,c),o2=orient(a,b,d),o3=orient(c,d,a),o4=orient(c,d,b);return((o1>0&&o2<0)||(o1<0&&o2>0))&&((o3>0&&o4<0)||(o3<0&&o4>0));}
/** Endpoint contact, collinear overlap and zero-length segments all count. */
function pointOnSegment(p,a,b,tol=EPS){const ab=dist(a,b);if(ab<=tol)return dist(p,a)<=tol;const t=clamp(((p[0]-a[0])*(b[0]-a[0])+(p[1]-a[1])*(b[1]-a[1]))/(ab*ab),0,1);return dist(p,[lerp(a[0],b[0],t),lerp(a[1],b[1],t)])<=tol;}
function segmentsIntersect(a,b,c,d,tol=EPS){if(properCross(a,b,c,d))return true;return pointOnSegment(c,a,b,tol)||pointOnSegment(d,a,b,tol)||pointOnSegment(a,c,d,tol)||pointOnSegment(b,c,d,tol);}
function pointSegmentDistance(p,a,b){const ab=dist(a,b);if(ab<=EPS)return dist(p,a);const t=clamp(((p[0]-a[0])*(b[0]-a[0])+(p[1]-a[1])*(b[1]-a[1]))/(ab*ab),0,1);return dist(p,[lerp(a[0],b[0],t),lerp(a[1],b[1],t)]);}
function segmentDistance(a,b,c,d){if(segmentsIntersect(a,b,c,d))return 0;return Math.min(pointSegmentDistance(a,c,d),pointSegmentDistance(b,c,d),pointSegmentDistance(c,a,b),pointSegmentDistance(d,a,b));}
function boundsOf(p){const b={x0:Infinity,y0:Infinity,x1:-Infinity,y1:-Infinity};for(const v of p){if(v[0]<b.x0)b.x0=v[0];if(v[1]<b.y0)b.y0=v[1];if(v[0]>b.x1)b.x1=v[0];if(v[1]>b.y1)b.y1=v[1];}return b;}
function boundsOverlap(a,b,tol=0){return a.x0<=b.x1+tol&&b.x0<=a.x1+tol&&a.y0<=b.y1+tol&&b.y0<=a.y1+tol;}
function shapeOf(poly){return{p:poly,b:boundsOf(poly)};}
/** True when the polygons touch, cross, or one contains the other. AABB is a
 * cheap early-out only; crossing edges catch intersections with no contained
 * vertex and vertex containment catches containment without edge contact. */
function polygonsIntersect(a,b,tol=EPS){
 if(!boundsOverlap(boundsOf(a),boundsOf(b),tol))return false;
 for(let i=0;i<a.length;i++){const p=a[i],q=a[(i+1)%a.length];for(let j=0;j<b.length;j++)if(segmentsIntersect(p,q,b[j],b[(j+1)%b.length],tol))return true;}
 return pointOnOrInside(a[0],b,tol)||pointOnOrInside(b[0],a,tol);
}
function polygonDistance(a,b){let d=Infinity;for(let i=0;i<a.length;i++){const p=a[i],q=a[(i+1)%a.length];for(let j=0;j<b.length;j++)d=Math.min(d,segmentDistance(p,q,b[j],b[(j+1)%b.length]));}return d;}
/** Placement clearance predicate. `clearance` is the visible gap required
 * between the object and each shape; zero still rejects boundary contact. */
function polygonsClearOf(poly,shapes,clearance=0,tol=EPS){
 const b=boundsOf(poly);
 for(const s of shapes){if(!boundsOverlap(b,s.b,clearance))continue;if(polygonsIntersect(poly,s.p,tol))return false;if(clearance>0&&polygonDistance(poly,s.p)<clearance-tol)return false;}
 return true;
}
/** Containment in a simple (possibly concave) boundary: vertex tests alone
 * miss an edge that leaves through a concavity, so edge midpoints and proper
 * edge crossings are checked as well. */
function polygonInsidePolygon(inner,outer,tol=EPS){
 if(inner.length<3||outer.length<3)return false;
 for(const v of inner)if(!pointOnOrInside(v,outer,tol))return false;
 for(let i=0;i<inner.length;i++){const a=inner[i],b=inner[(i+1)%inner.length];
  if(!pointOnOrInside([(a[0]+b[0])/2,(a[1]+b[1])/2],outer,tol))return false;
  for(let j=0;j<outer.length;j++)if(properCross(a,b,outer[j],outer[(j+1)%outer.length]))return false;}
 return true;
}
/** Minimum distance between a polygon and a finite polyline; bends and end
 * caps are covered because every polyline segment, including the last, is
 * measured against every polygon edge. */
function polygonPolylineDistance(poly,line){let d=Infinity;for(let i=0;i<poly.length;i++){const a=poly[i],b=poly[(i+1)%poly.length];for(let j=1;j<line.length;j++)d=Math.min(d,segmentDistance(a,b,line[j-1],line[j]));}return d;}
/** Point-symbol footprint. The renderer draws a 2*size square centred on x/y
 * and rotates it about the centre; flipX mirrors about the centre x. */
function symbolFootprint(f){
 const size=Number.isFinite(f.size)?f.size:15,x=Number.isFinite(f.x)?f.x:0,y=Number.isFinite(f.y)?f.y:0;
 const a=(Number.isFinite(f.rotation)?f.rotation:0)*Math.PI/180,cs=Math.cos(a),sn=Math.sin(a);
 return[[-size,-size],[size,-size],[size,size],[-size,size]].map(([u,v])=>{const px=x+u*cs-v*sn,py=y+u*sn+v*cs;return f.flipX?[2*x-px,py]:[px,py];});
}
/** Convex quality: finite vertices, simplicity, positive area, minimum support
 * width, fitted roof-frame aspect and the most extended vertex tip. */
function convexQuality(poly){
 const p=cleanPolygon(poly),q={finite:true,vertices:p.length,simple:true,area:0,width:0,aspect:0,minAngle:0,maxTip:0};
 for(const v of p)if(!Number.isFinite(v[0])||!Number.isFinite(v[1]))q.finite=false;
 if(p.length<3||!q.finite)return q;
 q.area=area(p);
 for(let i=0;i<p.length&&q.simple;i++)for(let j=i+1;j<p.length;j++){
  if((i+1)%p.length===j||(j+1)%p.length===i)continue;
  if(segmentsIntersect(p[i],p[(i+1)%p.length],p[j],p[(j+1)%p.length])){q.simple=false;break;}
 }
 let width=Infinity,minAngle=180,maxTip=0;
 for(let i=0;i<p.length;i++){
  const a=p[(i+p.length-1)%p.length],b=p[i],c=p[(i+1)%p.length],base=Math.max(dist(a,c),EPS);
  minAngle=Math.min(minAngle,Math.acos(clamp(((a[0]-b[0])*(c[0]-b[0])+(a[1]-b[1])*(c[1]-b[1]))/((dist(a,b)*dist(b,c))||1),-1,1))*180/Math.PI);
  maxTip=Math.max(maxTip,Math.abs((c[0]-a[0])*(b[1]-a[1])-(c[1]-a[1])*(b[0]-a[0]))/base/base);
  const e=[c[0]-b[0],c[1]-b[1]],el=Math.hypot(e[0],e[1]);if(el<EPS)continue;
  let far=0;for(const v of p)far=Math.max(far,Math.abs((v[0]-b[0])*e[1]-(v[1]-b[1])*e[0])/el);
  width=Math.min(width,far);
 }
 q.width=Number.isFinite(width)?width:0;q.minAngle=minAngle;q.maxTip=maxTip;
 const f=fitRoof(p);q.aspect=Math.max(f.width,f.height)/Math.max(EPS,Math.min(f.width,f.height));
 return q;
}
/** Conservative disk approximation: circumscribed regular polygon (apothem r). */
function circlePolygon(c,r,segments=24){const R=r/Math.cos(Math.PI/segments);return cleanPolygon(Array.from({length:segments},(_,i)=>{const t=i/segments*Math.PI*2;return[c[0]+Math.cos(t)*R,c[1]+Math.sin(t)*R];}));}
/** Capsule polygon around a finite segment. Cap chords use the circumscribed
 * radius, so the polygon contains the true capsule of radius r; the maximum
 * overshoot is r*(1/cos(pi/(2*CAPSULE_SEGMENTS))-1) ~= 0.86%, so gaps cannot
 * admit a building inside the true corridor. */
function capsulePolygon(a,b,r){
 const dx=b[0]-a[0],dy=b[1]-a[1],len=Math.hypot(dx,dy);
 if(len<=EPS)return circlePolygon(a,r);
 const phi=Math.atan2(dy,dx),R=r/Math.cos(Math.PI/(2*CAPSULE_SEGMENTS)),pts=[];
 for(let i=0;i<=CAPSULE_SEGMENTS;i++){const t=phi+Math.PI/2-Math.PI*i/CAPSULE_SEGMENTS;pts.push([b[0]+Math.cos(t)*R,b[1]+Math.sin(t)*R]);}
 for(let i=0;i<=CAPSULE_SEGMENTS;i++){const t=phi-Math.PI/2-Math.PI*i/CAPSULE_SEGMENTS;pts.push([a[0]+Math.cos(t)*R,a[1]+Math.sin(t)*R]);}
 return cleanPolygon(pts);
}
/** Convex polygon difference (subject minus obstacle); both convex CCW.
 * Each obstacle edge half-plane describes its interior as dot(n, point) <= c.
 * The outside slice of the running remainder is dry land and is kept; the
 * final remainder is subject intersect obstacle and is discarded. */
function subtractConvex(subject,obstacle){
 let remainder=cleanPolygon(subject);const out=[],ob=cleanPolygon(obstacle);
 for(let i=0;i<ob.length&&remainder.length>=3;i++){
  const a=ob[i],b=ob[(i+1)%ob.length],n=[b[1]-a[1],a[0]-b[0]],c=n[0]*a[0]+n[1]*a[1];
  const outside=clip(remainder,[-n[0],-n[1]],-c);
  if(outside.length>=3&&area(outside)>EPS)out.push(cleanPolygon(outside));
  remainder=clip(remainder,n,c);
 }
 return out.filter(p=>p.length>=3&&area(p)>EPS);
}
/** Subtract every obstacle from every surviving piece, keeping all exterior
 * pieces; the union of overlapping obstacles is removed without needing a
 * polygon with holes. Fragment growth is bounded and reported. */
function subtractAll(subject,obstacles,cap=MAX_PLAN_PIECES){
 let pieces=[shapeOf(cleanPolygon(subject))],capped=false;
 for(const ob of obstacles){
  if(!pieces.length)break;
  const next=[];
  for(const piece of pieces){
   if(!boundsOverlap(piece.b,ob.b)){next.push(piece);continue;}
   for(const out of subtractConvex(piece.p,ob.p))next.push(shapeOf(out));
  }
  pieces=next.filter(x=>x.p.length>=3&&area(x.p)>1e-4);
  if(pieces.length>cap){pieces.sort((a,b)=>area(b.p)-area(a.p));pieces.length=cap;capped=true;}
 }
 return{pieces:pieces.map(x=>x.p),capped};
}
// ---- Building footprint quality (Step D) ------------------------------------
/** Remove near-duplicate and redundant collinear vertices within a tolerance.
 * Vertices are only removed, so the result never expands outside the input. */
function cleanFootprint(poly,tol=FOOTPRINT_TOL){
 const q=[];
 for(const v of poly){if(!Number.isFinite(v[0])||!Number.isFinite(v[1]))return [];if(!q.length||dist(v,q.at(-1))>tol)q.push(v.slice());}
 while(q.length>1&&dist(q[0],q.at(-1))<=tol)q.pop();
 let changed=true;
 while(changed&&q.length>3){changed=false;
  for(let i=0;i<q.length;i++){
   const a=q[(i+q.length-1)%q.length],b=q[i],c=q[(i+1)%q.length],ab=dist(a,b),bc=dist(b,c);
   if(ab<=tol||bc<=tol||Math.abs((b[0]-a[0])*(c[1]-b[1])-(b[1]-a[1])*(c[0]-b[0]))<=tol*Math.max(ab,bc)){q.splice(i,1);changed=true;break;}
  }}
 return q.length>=3?cleanPolygon(q):[];
}
/** Corner angle (degrees) and extension ratio (tip height / base) of a vertex. */
function tipMeasure(poly,i){
 const a=poly[(i+poly.length-1)%poly.length],b=poly[i],c=poly[(i+1)%poly.length];
 const la=dist(a,b),lc=dist(b,c),base=Math.max(dist(a,c),EPS);
 return{angle:Math.acos(clamp(((a[0]-b[0])*(c[0]-b[0])+(a[1]-b[1])*(c[1]-b[1]))/((la*lc)||1),-1,1))*180/Math.PI,
  ratio:Math.abs((c[0]-a[0])*(b[1]-a[1])-(c[1]-a[1])*(b[0]-a[0]))/base/base,la,lc};
}
/** Chamfer an acute, extended tip; the bevel stays inside the original lot. */
function bevelTip(poly,i,trim=TIP_TRIM){
 const a=poly[(i+poly.length-1)%poly.length],b=poly[i],c=poly[(i+1)%poly.length],la=dist(a,b),lc=dist(b,c);
 if(la<=EPS||lc<=EPS)return null;
 const p1=[lerp(b[0],a[0],trim),lerp(b[1],a[1],trim)],p2=[lerp(b[0],c[0],trim),lerp(b[1],c[1],trim)],out=poly.slice();
 out.splice(i,1,p1,p2);return out;
}
/** Bounded deterministic repair: clean vertices, then bevel the worst acute
 * extended tips until the footprint passes or the pass budget is spent. */
function repairBuildingFootprint(poly){
 let p=cleanFootprint(poly),bevels=0;
 for(let k=0;k<MAX_TIP_TRIMS&&p.length>=3;k++){
  let worst=-1,worstAngle=180;
  for(let i=0;i<p.length;i++){const m=tipMeasure(p,i);if(m.angle<TIP_ANGLE&&m.ratio>TIP_EXTENSION&&m.angle<worstAngle){worst=i;worstAngle=m.angle;}}
  if(worst<0)break;
  const next=bevelTip(p,worst);
  if(!next)break;
  const cleaned=cleanFootprint(next);
  if(cleaned.length<3||!polygonInsidePolygon(cleaned,p,.001))break;
  p=cleaned;bevels++;
 }
 return{polygon:p,bevels};
}
/** Named shape policy: positive area, minimum support width, fitted aspect. */
function buildingShapeReason(poly){
 const q=convexQuality(poly);
 if(!(q.area>0))return 'area';
 if(q.width<MIN_BUILD_WIDTH)return 'width';
 if(q.aspect>MAX_BUILD_ASPECT)return 'aspect';
 return null;
}
// ---- Waterfront eligibility (Step F) ----------------------------------------
function boxDistance(a,b){const dx=Math.max(0,a.x0-b.x1,b.x0-a.x1),dy=Math.max(0,a.y0-b.y1,b.y0-a.y1);return Math.hypot(dx,dy);}
/** Gap from a footprint to the nearest water bank/shoreline: river banks use
 * finite segment distance minus half-width, polygonal water uses its boundary.
 * Water touching or containing the footprint reports 0. AABB lower bounds skip
 * segments that cannot beat the running best, and `limit` allows early exit
 * when only the "within the waterfront gap" question matters. */
function waterProximity(s,poly,limit=Infinity){
 const b=boundsOf(poly);let best=Infinity;
 for(const f of s.features){
  if(f.type==='river'&&f.points&&Number.isFinite(f.width)){
   const half=f.width/2;
   for(let i=1;i<f.points.length;i++){
    const p0=f.points[i-1],p1=f.points[i];
    const sb={x0:Math.min(p0[0],p1[0]),y0:Math.min(p0[1],p1[1]),x1:Math.max(p0[0],p1[0]),y1:Math.max(p0[1],p1[1])};
    if(boxDistance(b,sb)-half>=best)continue;
    best=Math.min(best,polygonPolylineDistance(poly,[p0,p1])-half);
    if(Number.isFinite(limit)&&best<=limit)return Math.max(0,best);
   }
  }else if(f.type==='water'&&f.polygon){
   if(boxDistance(b,boundsOf(f.polygon))>=best)continue;
   best=Math.min(best,polygonsIntersect(poly,f.polygon)?0:polygonDistance(poly,f.polygon));
   if(Number.isFinite(limit)&&best<=limit)return Math.max(0,best);
  }
 }
 return Math.max(0,best);
}
const waterKindOk=(kind,gap)=>gap<=WATERFRONT_GAP||!WATER_KINDS.includes(kind);
// ---- Planned open space (Step E) --------------------------------------------
/** Grow a compact reservation from an interior point until it reaches the
 * target area inside the dry component; the result is convex and contained. */
function reserveCompactGround(piece,target){
 const c=polygonInterior(piece),pb=boundsOf(piece);
 let a=piece[0],b=piece[1];
 for(let i=0;i<piece.length;i++)if(dist(piece[i],piece[(i+1)%piece.length])>dist(a,b)){a=piece[i];b=piece[(i+1)%piece.length];}
 const theta=Math.atan2(b[1]-a[1],b[0]-a[0]),cs=Math.cos(theta),sn=Math.sin(theta);
 const map=(U,V)=>[c[0]+U*cs-V*sn,c[1]+U*sn+V*cs];
 let half=Math.sqrt(target)/2,best=null,bestArea=0;
 for(let k=0;k<14;k++){
  const rect=[map(-half,-half),map(half,-half),map(half,half),map(-half,half)],clipped=convexIntersection(piece,rect);
  if(clipped.length>=3){const ar=area(clipped);if(ar>bestArea){best=clipped;bestArea=ar;}if(ar>=target*.98)break;}
  half*=1.2;
  if(half>Math.max(pb.x1-pb.x0,pb.y1-pb.y0))break;
 }
 return best&&bestArea>=Math.min(MIN_OPEN_SPACE,target*.9)?cleanPolygon(best):null;
}
/** One coherent reservation per substantial dry component of an open program,
 * clipped away from protected objects (never discarded because one object
 * overlaps the candidate area). Detail density never gates this land. */
function planOpenSpaces(pieces,q,blocked){
 if(!(q.id in OPEN_MATERIALS))return [];
 const out=[];
 for(const piece of pieces){
  const target=OPEN_SPACE_FRACTION*area(piece);
  if(target<MIN_OPEN_SPACE)continue;
  const candidate=reserveCompactGround(piece,target);
  if(!candidate)continue;
  const parts=(blocked.length?subtractAll(candidate,blocked).pieces:[candidate])
   .filter(p=>area(p)>=MIN_OPEN_SPACE*.5).sort((a,b)=>area(b)-area(a)).slice(0,2);
  for(const polygon of parts)out.push({polygon,material:OPEN_MATERIALS[q.id],purpose:q.id});
 }
 return out;
}
function cityEnvelope(seed,o){
 const r=rng(seed+'-outline'),TAU=Math.PI*2;
 let target,anchor=[0,0];
 const regular=(n,angle=-Math.PI/2)=>Array.from({length:n},(_,i)=>[Math.cos(angle+i*TAU/n),Math.sin(angle+i*TAU/n)]);
 switch(o.shape){
 case'circle':target=regular(96);break;
 case'ellipse':target=regular(96).map(([x,y])=>[x,y*.64]);break;
 case'square':target=[[-1,-1],[1,-1],[1,1],[-1,1]];break;
 case'rectangle':target=[[-1,-.62],[1,-.62],[1,.62],[-1,.62]];break;
 case'triangle':target=regular(3);break;
 case'diamond':target=[[0,-1],[.78,0],[0,1],[-.78,0]];break;
 case'hexagon':target=regular(6,0);break;
 case'octagon':target=regular(8,Math.PI/8);break;
 case'l-shape':target=[[-1,-1],[1,-1],[1,-.2],[-.2,-.2],[-.2,1],[-1,1]];anchor=[-.5,-.5];break;
 case't-shape':target=[[-1,-1],[1,-1],[1,-.25],[.32,-.25],[.32,1],[-.32,1],[-.32,-.25],[-1,-.25]];anchor=[0,-.5];break;
 case'ribbon':target=[[-1,-.38],[-.65,-.6],[-.18,-.5],[.25,-.26],[1,-.22],[1,.38],[.3,.52],[-.1,.24],[-.65,.18],[-1,.28]];anchor=[0,0];break;
 default:target=regular(64);break;
 }
 target=cleanPolygon(target);
 const p1=r()*TAU,p2=r()*TAU,p3=r()*TAU,aspect=.68+r()*.3,angle=r()*TAU;
 const randomRadius=t=>{
  const base=1/Math.sqrt(Math.cos(t-angle)**2+Math.sin(t-angle)**2/(aspect*aspect));
  return base*(.84+.15*Math.sin(3*t+p1)+.095*Math.sin(5*t+p2)+.055*Math.cos(7*t+p3));
 };
 const ray=t=>{const d=[Math.cos(t),Math.sin(t)];let distance=Infinity;
  for(let i=0;i<target.length;i++){const a=target[i],b=target[(i+1)%target.length],v=[b[0]-a[0],b[1]-a[1]],w=[a[0]-anchor[0],a[1]-anchor[1]],den=d[0]*v[1]-d[1]*v[0];if(Math.abs(den)<1e-10)continue;
   const u=(w[0]*v[1]-w[1]*v[0])/den,q=(w[0]*d[1]-w[1]*d[0])/den;if(u>0&&q>=-1e-8&&q<=1+1e-8)distance=Math.min(distance,u);
  }return Number.isFinite(distance)?distance:1;
 };
 const g=(o.shapeGuidance-1)/99,angles=Array.from({length:80},(_,i)=>i*TAU/80);
 // Include every target corner so 100 means exact polygon, not a rounded approximation.
 if(g>0&&o.shape!=='random')for(const v of target)angles.push((Math.atan2(v[1]-anchor[1],v[0]-anchor[0])+TAU)%TAU);
 angles.sort((a,b)=>a-b);let shape=angles.filter((a,i)=>!i||a-angles[i-1]>1e-8).map(t=>{
  const rad=o.shape==='random'?randomRadius(t):lerp(randomRadius(t),ray(t),g);
  const x=Math.cos(t)*rad+(o.shape==='random'?0:anchor[0]*g),y=Math.sin(t)*rad+(o.shape==='random'?0:anchor[1]*g);
  const a=o.rotation*Math.PI/180;return[x*Math.cos(a)-y*Math.sin(a),x*Math.sin(a)+y*Math.cos(a)];
 });
 const xs=shape.map(p=>p[0]),ys=shape.map(p=>p[1]),minX=Math.min(...xs),maxX=Math.max(...xs),minY=Math.min(...ys),maxY=Math.max(...ys);
 const factor=Math.min((o.coast?650:800)/(maxX-minX),800/(maxY-minY)),cx=o.coast?420:500,cy=500;
 const transform=p=>[cx+(p[0]-(minX+maxX)/2)*factor,cy+(p[1]-(minY+maxY)/2)*factor];
 const a=o.rotation*Math.PI/180,ar=o.shape==='random'?[0,0]:[anchor[0]*g,anchor[1]*g];
 return{polygon:cleanPolygon(shape.map(transform)),anchor:transform([ar[0]*Math.cos(a)-ar[1]*Math.sin(a),ar[0]*Math.sin(a)+ar[1]*Math.cos(a)])};
}
function polygonInterior(poly){const c=center(poly);if(inside(c,poly))return c;const ts=triangulate(poly);ts.sort((a,b)=>area(b)-area(a));return center(ts[0]);}
function buildingProgram(quarter){return QUARTERS.find(q=>q.id===quarter)||{id:'unassigned',name:'Unassigned',kinds:[],props:[],factor:1};}
/** Roof frame fit. The frame is the axis-aligned extent of the polygon in the
 * longest-edge frame; for asymmetric polygons its centre differs from the
 * mean-of-vertices centre, so the fitted centre is returned as additive
 * metadata (roofCx/roofCy) and the renderer places the art there. */
function fitRoof(poly){
 let a=poly[0],b=poly[1];for(let i=0;i<poly.length;i++)if(dist(poly[i],poly[(i+1)%poly.length])>dist(a,b)){a=poly[i];b=poly[(i+1)%poly.length];}
 const theta=Math.atan2(b[1]-a[1],b[0]-a[0]),cs=Math.cos(theta),sn=Math.sin(theta),c=center(poly);
 const local=poly.map(p=>[(p[0]-c[0])*cs+(p[1]-c[1])*sn,-(p[0]-c[0])*sn+(p[1]-c[1])*cs]);
 const xs=local.map(p=>p[0]),ys=local.map(p=>p[1]),uMin=Math.min(...xs),uMax=Math.max(...xs),vMin=Math.min(...ys),vMax=Math.max(...ys);
 const cu=(uMin+uMax)/2,cv=(vMin+vMax)/2;
 return{angle:theta*180/Math.PI,width:uMax-uMin,height:vMax-vMin,cx:c[0]+cu*cs-cv*sn,cy:c[1]+cu*sn+cv*cs};
}
/** Obstacles and protected shapes derived from the CURRENT scene. Water uses
 * the finite-polyline capsule policy; road corridors include the visible outer
 * stroke and a placement clearance; wall lines are omitted because the district
 * street setback already keeps contents clear of the boundary. Recompute for
 * regeneration so moved or edited geometry is respected. */
function sceneReservations(s){
 const water=[],shore=[],infra=[],symbols=[],solids=[];
 for(const f of s.features){
  if(f.type==='district')continue;
  if(f.type==='river'&&f.points&&Number.isFinite(f.width)){
   for(let i=1;i<f.points.length;i++)water.push(shapeOf(capsulePolygon(f.points[i-1],f.points[i],f.width/2+RIVER_BANK_GAP)));
  }else if(f.type==='water'&&f.polygon){
   const wp=cleanPolygon(f.polygon);if(wp.length<3)continue;shore.push(shapeOf(wp));
   for(const piece of convexParts(wp))water.push(shapeOf(piece));
  }else if(f.type==='road'&&f.points&&Number.isFinite(f.width)){
   for(let i=1;i<f.points.length;i++)infra.push(shapeOf(capsulePolygon(f.points[i-1],f.points[i],(f.width+1.2)/2+PLACE_CLEARANCE)));
  }else if(Number.isFinite(f.size)&&(f.type==='asset'||f.type==='poi')){
   symbols.push(shapeOf(symbolFootprint(f)));
  }else if(f.polygon&&(f.type==='plaza'||f.type==='area')){
   const poly=cleanPolygon(f.polygon);if(poly.length>=3)solids.push(shapeOf(poly));
  }
 }
 return{water,shore,infra,symbols,solids};
}
function cityOccupancy(s){
 const buildings=[],props=[];
 for(const f of s.features){
  if(f.type==='building'&&f.polygon)buildings.push(shapeOf(f.polygon));
  else if(f.quarterProp&&Number.isFinite(f.size))props.push(shapeOf(symbolFootprint(f)));
 }
 return{buildings,props};
}
/** Temporary buildable-land plan for one district. Logical district polygons
 * stay unchanged; the street setback is applied once, then water and
 * infrastructure are subtracted with real convex polygon difference. Slivers
 * narrower than MIN_PLAN_WIDTH cannot host a building after the lot inset and
 * are cleaned out of the plan (their area is reported, not silently dropped). */
function districtContext(s,d,reservations,occupancy){
 const o=s.options,q=buildingProgram(d.quarter),raw=[],obstacles=[...reservations.water,...reservations.infra];
 let capped=false,dryArea=0,sliverArea=0;
 for(const part of convexParts(d.polygon)){
  const poly=inset(part,STREET_SETBACK);
  if(poly.length<3)continue;
  const cut=subtractAll(poly,obstacles);
  raw.push(...cut.pieces);if(cut.capped)capped=true;
 }
 if(raw.length>MAX_PLAN_PIECES){raw.sort((a,b)=>area(b)-area(a));raw.length=MAX_PLAN_PIECES;capped=true;}
 const pieces=[];
 for(const p of raw){
  if(convexQuality(p).width>=MIN_PLAN_WIDTH){pieces.push(p);dryArea+=area(p);}
  else sliverArea+=area(p);
 }
 const blocked=[...(occupancy?.buildings||[]),...(occupancy?.props||[]),...reservations.solids,...reservations.symbols];
 return{o,q,pieces,dryArea,sliverArea,capped,reservations,openSpaces:planOpenSpaces(pieces,q,blocked)};
}
/** Returns null when the footprint may be built, otherwise a rejection reason. */
function buildingRejection(poly,s,ctx,occupancy){
 const boundary=s.city?.boundary;
 if(poly.length<3||area(poly)<16)return 'area';
 for(const v of poly)if(!Number.isFinite(v[0])||!Number.isFinite(v[1]))return 'finite';
 if(boundary&&!polygonInsidePolygon(poly,boundary,.001))return 'envelope';
 const r=ctx.reservations;
 if(!polygonsClearOf(poly,r.water))return 'water';
 if(!polygonsClearOf(poly,r.infra))return 'infrastructure';
 if(!polygonsClearOf(poly,r.symbols))return 'protected';
 if(!polygonsClearOf(poly,r.solids))return 'protected';
 if(!polygonsClearOf(poly,r.shore,SHORE_SETBACK))return 'shore';
 if(!polygonsClearOf(poly,occupancy.buildings,PLACE_CLEARANCE))return 'occupancy';
 return null;
}
function placeDistrictBuildings(s,d,ctx,occupancy,stream){
 const o=ctx.o,q=ctx.q,allowed=q.kinds.filter(k=>o.buildings.includes(k));
 const open=['gardens','cemetery','market','farming'].includes(q.id);
 const stats={candidates:0,accepted:0,repaired:0,repairedArea:0,rejected:0,rejectedArea:0,reasons:{}};
 if(!allowed.length)return stats;
 const reject=(r,a=0)=>{stats.rejected++;stats.rejectedArea+=a;stats.reasons[r]=(stats.reasons[r]||0)+1;};
 for(const poly of ctx.pieces){
  const minSq=lerp(310,80,o.density)*q.factor,empty=open?0:.065;
  for(const lot of createAlleys(poly,minSq,o.chaos,.48,stream,empty)){
   stats.candidates++;
   const fixed=repairBuildingFootprint(inset(lot,LOT_INSET)),p=fixed.polygon;
   if(p.length<3){reject('area');continue;}
   if(ctx.openSpaces.some(r=>polygonsIntersect(p,r.polygon))){reject('reserved',area(p));continue;}
   const shape=buildingShapeReason(p);
   if(shape){reject(shape,area(p));continue;}
   const reason=buildingRejection(p,s,ctx,occupancy);
   if(reason){reject(reason,area(p));continue;}
   const gap=waterProximity(s,p,WATERFRONT_GAP),pool=BUILDING_TYPES.filter(t=>allowed.includes(t.id)&&waterKindOk(t.id,gap));
   if(!pool.length){reject('noKind',area(p));continue;}
   if(fixed.bevels){stats.repaired++;stats.repairedArea+=area(p);}
   const c=center(p),t=pick(stream,pool),roof=fitRoof(p);
   add(s,'building',{polygon:p,x:c[0],y:c[1],ward:d.id,buildingKind:t.id,roof:QUARTERS.indexOf(q)%5<0?0:QUARTERS.indexOf(q)%5,roofAsset:pick(stream,t.assets),roofAngle:roof.angle,roofWidth:roof.width,roofHeight:roof.height,roofCx:roof.cx,roofCy:roof.cy,label:t.name.replace(/ies$/,'y').replace(/s$/,''),notes:q.name+' · '+pick(stream,['A family business has occupied this plot for generations.','The occupants know a useful local rumor.','A recent arrival has changed this household.','A disputed lease is drawing unwanted attention.'])});
   occupancy.buildings.push(shapeOf(p));
   stats.accepted++;
  }
 }
 return stats;
}
/** Uniform sample inside a convex polygon by area-weighted triangle fan. */
function sampleConvex(poly,r){
 const n=poly.length;if(n<3)return center(poly);
 let total=0;const areas=[];
 for(let i=1;i<n-1;i++){const a=area([poly[0],poly[i],poly[i+1]]);areas.push(a);total+=a;}
 if(!(total>0))return center(poly);
 let t=r()*total,k=0;while(k<areas.length-1&&t>areas[k]){t-=areas[k];k++;}
 const a=poly[0],b=poly[k+1],c=poly[k+2];let u=r(),v=r();
 if(u+v>1){u=1-u;v=1-v;}
 return[a[0]+u*(b[0]-a[0])+v*(c[0]-a[0]),a[1]+u*(b[1]-a[1])+v*(c[1]-a[1])];
}
/** Bounding box of the part of a convex piece that lies within `reach` of any
 * water, or null when the piece has no waterfront. Used to aim water-dependent
 * detail at real bank/shore ground instead of sampling the whole district. */
function waterfrontBBox(s,poly,reach){
 const b=boundsOf(poly),pts=[];
 for(let i=0;i<poly.length;i++){
  const a=poly[i],c=poly[(i+1)%poly.length],m=[(a[0]+c[0])/2,(a[1]+c[1])/2];
  if(waterProximity(s,[a,a],reach)<=reach)pts.push(a);
  if(waterProximity(s,[m,m],reach)<=reach)pts.push(m);
 }
 if(!pts.length)return null;
 const bb={x0:Infinity,y0:Infinity,x1:-Infinity,y1:-Infinity};
 for(const p of pts){if(p[0]<bb.x0)bb.x0=p[0];if(p[1]<bb.y0)bb.y0=p[1];if(p[0]>bb.x1)bb.x1=p[0];if(p[1]>bb.y1)bb.y1=p[1];}
 return{x0:Math.max(b.x0,bb.x0),y0:Math.max(b.y0,bb.y0),x1:Math.min(b.x1,bb.x1),y1:Math.min(b.y1,bb.y1)};
}
/** Place this district's props after ALL buildings exist. Full transformed
 * symbol footprints are checked against water, roads, protected symbols, every
 * building (any ward) and every already placed prop (any ward). Open programs
 * place their detail inside the planned open-space reservations; waterfront
 * detail targets real bank/shore ground. */
function placeDistrictProps(s,d,ctx,occupancy,stream){
 const o=ctx.o,q=ctx.q,r=ctx.reservations,stats={requested:0,placed:0,unplaced:0,attempts:0,shrunk:0,reasons:{}};
 if(!q.props.length||o.quarterDetail===0)return stats;
 const open=['gardens','cemetery','market','farming'].includes(q.id),boundary=s.city?.boundary;
 const ground=open&&ctx.openSpaces.length?ctx.openSpaces.map(x=>x.polygon):ctx.pieces;
 const waterProps=q.props.filter(a=>WATER_PROPS.includes(a)),landProps=q.props.filter(a=>!WATER_PROPS.includes(a));
 const attempt=(poly,bx,pool,exactWater,forced)=>{
  const size=forced||5+stream()*4;
  const p=exactWater?[lerp(bx.x0,bx.x1,stream()),lerp(bx.y0,bx.y1,stream())]:sampleConvex(poly,stream);
  const foot=symbolFootprint({x:p[0],y:p[1],size,rotation:0});
  let reason=null;
  if(!inside(p,poly)||nearPolyline(p,[...poly,poly[0]])<size+PLACE_CLEARANCE)reason='ground';
  else if(boundary&&!polygonInsidePolygon(foot,boundary,0))reason='bounds';
  else if(!polygonsClearOf(foot,r.water))reason='water';
  else if(!polygonsClearOf(foot,r.infra))reason='infrastructure';
  else if(!polygonsClearOf(foot,r.symbols)||!polygonsClearOf(foot,r.solids))reason='protected';
  else if(!polygonsClearOf(foot,r.shore,SHORE_SETBACK))reason='shore';
  else if(!polygonsClearOf(foot,occupancy.buildings,PLACE_CLEARANCE))reason='buildings';
  else if(!polygonsClearOf(foot,occupancy.props,PLACE_CLEARANCE))reason='props';
  else if(exactWater&&waterProximity(s,foot,WATERFRONT_GAP)>WATERFRONT_GAP)reason='waterDetail';
  if(reason){stats.reasons[reason]=(stats.reasons[reason]||0)+1;return false;}
  if(forced)stats.shrunk++;
  add(s,'decoration',{x:p[0],y:p[1],size,asset:pick(stream,pool),ward:d.id,quarterProp:true,rotation:0});
  occupancy.props.push(shapeOf(foot));return true;
 };
 for(const poly of ground){
  const b=boundsOf(poly),base=Math.max(0,Math.round((open?9:3)*o.quarterDetail*area(poly)/7500));
  if(landProps.length&&base)for(let j=0;j<base;j++){
   stats.requested++;let placed=false;
   for(let tries=0;tries<MAX_PROP_ATTEMPTS;tries++){stats.attempts++;if(attempt(poly,b,landProps,false)){placed=true;break;}}
   // Bounded size adjustment on a real open reservation: an asset that cannot
   // fit is retried at readable smaller sizes before it is skipped.
   if(!placed&&open&&ctx.openSpaces.length)for(const size of [6.5,5,PROP_MIN_SIZE]){
    for(let tries=0;tries<12&&!placed;tries++){stats.attempts++;if(attempt(poly,b,landProps,false,size))placed=true;}
    if(placed)break;
   }
   if(placed)stats.placed++;else{stats.unplaced++;stats.reasons.exhausted=(stats.reasons.exhausted||0)+1;}
  }
  if(!waterProps.length)continue;
  const near=waterfrontBBox(s,poly,WATERFRONT_GAP+9);
  if(!near||near.x1<=near.x0||near.y1<=near.y0)continue;
  const amount=Math.min(3,Math.max(1,Math.round((open?9:3)*o.quarterDetail*area(poly)/15000)));
  for(let j=0;j<amount;j++){
   stats.requested++;let placed=false;
   for(let tries=0;tries<MAX_PROP_ATTEMPTS;tries++){stats.attempts++;if(attempt(poly,near,waterProps,true)){placed=true;break;}}
   if(placed)stats.placed++;else{stats.unplaced++;stats.reasons.exhausted=(stats.reasons.exhausted||0)+1;}
  }
 }
 return stats;
}
/** Deterministic per-district diagnostics: land stages, program constraints,
 * placement limits and per-reason counters. Replaced, never accumulated, when
 * a district is regenerated. */
function districtDiagnostics(s,d,ctx,buildings,props){
 const o=s.options,allowed=ctx.q.kinds.filter(k=>o.buildings.includes(k));
 return{revision:d.revision||0,waterfront:waterProximity(s,d.polygon,WATERFRONT_GAP)<=WATERFRONT_GAP,
  program:{quarter:ctx.q.id,unassigned:ctx.q.id==='unassigned',openSpace:!!(ctx.q.id in OPEN_MATERIALS),kinds:allowed.length,openSpaces:ctx.openSpaces.length},
  land:{area:Number(area(d.polygon).toFixed(3)),dryArea:Number(ctx.dryArea.toFixed(3)),sliverArea:Number(ctx.sliverArea.toFixed(3)),pieces:ctx.pieces.length},
  limits:{planCapped:ctx.capped,planPieceCap:MAX_PLAN_PIECES,propAttempts:MAX_PROP_ATTEMPTS},
  buildings:{...buildings,repairedArea:Number(buildings.repairedArea.toFixed(3)),rejectedArea:Number(buildings.rejectedArea.toFixed(3))},
  props};
}
function regenerateDistrict(s,id,quarter){
 if(s.cityStudio)return Studio.regenerateDistrict(s,id,quarter);
 const d=s.features.find(f=>f.id===id&&f.type==='district');if(!d)throw Error('Select a district first.');if(d.locked)throw Error('Unlock the district first.');
 if(quarter&&!QUARTERS.some(q=>q.id===quarter))throw Error('Unknown quarter.');
 if(quarter)d.quarter=quarter;if(!d.quarter)d.quarter=QUARTERS.find(q=>q.name.toLowerCase()===String(d.ward).toLowerCase())?.id||'commons';
 const q=buildingProgram(d.quarter);d.ward=q.name;d.label=q.name;d.revision=(d.revision||0)+1;
 s.features=s.features.filter(f=>f.ward!==id||f.locked);
 // Reservations and protected geometry come from the current scene, so edited
 // roads, moved buildings and locked props of any district are respected.
 const reservations=sceneReservations(s),occupancy=cityOccupancy(s),ctx=districtContext(s,d,reservations,occupancy);
 for(const os of ctx.openSpaces){const c=center(os.polygon);
  add(s,'area',{polygon:os.polygon,x:c[0],y:c[1],material:os.material,ward:d.id,purpose:os.purpose,openSpace:true,notes:'Generated open space ('+os.purpose+'). Detail density controls decoration only; the ground surface is part of the district plan.'});}
 const buildings=placeDistrictBuildings(s,d,ctx,occupancy,rng(s.seed+'-'+id+'-'+d.revision));
 const props=placeDistrictProps(s,d,ctx,occupancy,rng(s.seed+'-'+id+'-'+d.revision+'-props'));
 if(s.city){s.city.generationDiagnostics={...(s.city.generationDiagnostics||{}),[id]:districtDiagnostics(s,d,ctx,buildings,props)};
  s.city.quarterCounts={};for(const f of s.features)if(f.type==='district')s.city.quarterCounts[f.quarter]=(s.city.quarterCounts[f.quarter]||0)+1;
  s.city.statistics={districts:s.features.filter(f=>f.type==='district').length,buildings:s.features.filter(f=>f.type==='building').length,buildingTypes:[...new Set(s.features.filter(f=>f.type==='building').map(f=>f.buildingKind))].length};}
 s.population=Math.round(s.features.filter(f=>f.type==='building').length*5.4);return d;
}
/** Phase 2: emit walls, towers, gates, approach roads and bridge corridors
 * before any lot or prop is planned, so their footprints are reservations
 * rather than late removals. Emitting features here is safe because render
 * order is layer-based, not feature-order-based. */
function planCityInfrastructure(s,o,boundary,anchor){
 const directions=[[1,0],[0,1],[-1,0],[0,-1]],gates=directions.map(v=>boundaryRay(anchor,v,boundary));
 const nearWater=p=>s.features.some(f=>f.type==='river'&&nearPolyline(p,f.points)<f.width/2+6||f.type==='water'&&inside(p,f.polygon));
 // The real silhouette supplies the wall, including concavities. No circular ring remains.
 if(o.walls){let run=[];const perimeter=sampleBoundary(boundary,7);for(const p of [...perimeter,perimeter[0]]){
  if(gates.some(g=>dist(g,p)<12)||nearWater(p)){if(run.length>1)add(s,'wall',{points:run,width:5});run=[];}else run.push(p);
 }if(run.length>1)add(s,'wall',{points:run,width:5});
 for(const p of evenlySpacedBoundary(boundary,110))if(!nearWater(p)&&!gates.some(g=>dist(g,p)<24))add(s,'asset',{x:p[0],y:p[1],asset:'roof-tower',size:8});
 }
 for(let i=0;i<gates.length;i++){const p=gates[i],dir=directions[i],q=[clamp(p[0]+dir[0]*1000,0,1000),clamp(p[1]+dir[1]*1000,0,1000)];if(nearWater(p))continue;
  add(s,'road',{points:[p,q],width:8,roadType:'road',label:''});if(o.walls)add(s,'poi',{x:p[0],y:p[1],asset:'gatehouse',size:11,label:['East gate','South gate','West gate','North gate'][i]});
 }
 // Streets are the non-overlapping gaps between parcels. Reserve two bridge corridors.
 const river=s.features.find(f=>f.type==='river');if(river)for(const y of[380,650]){
  const p=river.points.reduce((a,b)=>Math.abs(a[1]-y)<Math.abs(b[1]-y)?a:b),path=[[p[0]-50,y],[p[0]+50,y]];
  if(!path.every(v=>inside(v,boundary)))continue;
  add(s,'road',{points:path,width:9,roadType:'cobble'});add(s,'asset',{x:p[0],y,asset:'bridge',size:23});
 }
}
function guidedCity(seed,config){
 const o=options('city',config),s=base('city',seed,o),r=rng(seed),outline=cityEnvelope(seed,o),boundary=outline.polygon,anchor=outline.anchor;
 s.city={boundary,anchor,shape:o.shape,shapeGuidance:o.shapeGuidance,quarterCounts:{},warnings:[],generationDiagnostics:{},generationPolicy:{streetSetback:STREET_SETBACK,lotInset:LOT_INSET,minBuildWidth:MIN_BUILD_WIDTH,maxBuildAspect:MAX_BUILD_ASPECT,tipAngle:TIP_ANGLE,placementClearance:PLACE_CLEARANCE,riverBankGap:RIVER_BANK_GAP,shoreSetback:SHORE_SETBACK,waterfrontGap:WATERFRONT_GAP,openSpaceFraction:OPEN_SPACE_FRACTION,minOpenSpace:MIN_OPEN_SPACE,planPieceCap:MAX_PLAN_PIECES,propAttempts:MAX_PROP_ATTEMPTS,propMinSize:PROP_MIN_SIZE}};
 s.metadata.outlineScope='The envelope constrains generated districts and buildings. Approach roads and symbols may extend outside it.';
 if(o.river){const phase=r()*6,river=[];for(let y=0;y<=1000;y+=10)river.push([(o.coast?460:550)+Math.sin(y/210+phase)*70+Math.sin(y/93)*12,y]);add(s,'river',{points:river,width:36});}
 if(o.coast)add(s,'water',{polygon:[[780,0],[778,170],[808,390],[778,600],[792,800],[780,1000],[1000,1000],[1000,0]]});
 if(o.quarters.includes('docks')&&!o.river&&!o.coast)s.city.warnings.push('Docks selected without water: waterfront buildings and detail are omitted; docks quarters use storage and cargo activity only.');
 if(!o.quarters.length)s.city.warnings.push('No quarters selected. Plots are unassigned and no buildings are generated.');
 if(!o.buildings.length)s.city.warnings.push('No building types selected. Only the district plan and open-space details are generated.');
 // Phase 2: infrastructure first, so every later footprint can avoid it.
 planCityInfrastructure(s,o,boundary,anchor);
 const count=Math.max(Math.round(o.districts),o.quarters.length),sites=[];
 const minX=Math.min(...boundary.map(p=>p[0])),maxX=Math.max(...boundary.map(p=>p[0])),minY=Math.min(...boundary.map(p=>p[1])),maxY=Math.max(...boundary.map(p=>p[1]));
 if(o.layout==='planned'){
  const step=Math.sqrt(area(boundary)/count)*.94;
  for(let y=minY+step*.5;y<maxY&&sites.length<count;y+=step)for(let x=minX+step*.5;x<maxX&&sites.length<count;x+=step){
   const p=[x+(r()-.5)*step*o.chaos*.38,y+(r()-.5)*step*o.chaos*.38];if(inside(p,boundary))sites.push(p);
  }
 }else if(o.layout==='radial'){
  sites.push(anchor);const rings=Math.max(2,Math.ceil(Math.sqrt(count/5)));
  for(let ring=1;ring<=rings&&sites.length<count;ring++)for(let k=0;k<ring*8&&sites.length<count;k++){
   const a=k*Math.PI*2/(ring*8)+ring*.1,edge=boundaryRay(anchor,[Math.cos(a),Math.sin(a)],boundary),t=ring/(rings+.4),p=[lerp(anchor[0],edge[0],t)+(r()-.5)*o.chaos*7,lerp(anchor[1],edge[1],t)+(r()-.5)*o.chaos*7];if(inside(p,boundary))sites.push(p);
  }
 }
 if(!sites.length)sites.push(anchor);
 while(sites.length<count){let best=null,score=-1;for(let t=0;t<45;t++){
  const p=[lerp(minX,maxX,r()),lerp(minY,maxY,r())];if(!inside(p,boundary))continue;
  const d=Math.min(...sites.map(q=>dist(p,q)))*(.8+r()*.4);if(d>score){best=p;score=d;}
 }if(!best)best=anchor.map((v,i)=>v+(r()-.5)*3);sites.push(best);}
 const cells=voronoi(sites,[[0,0],[1000,0],[1000,1000],[0,1000]]),triangles=triangulate(boundary),fragments=[];
 for(let i=0;i<cells.length;i++)for(const p of clipToEnvelope(cells[i],triangles))if(area(p)>40)fragments.push({polygon:p,site:i});
 // All explicitly enabled quarter types appear at least once; disabled ones never do.
 // Waterfront opportunity is measured on the fragment itself, so the required
 // docks program claims the best waterfront fragment before other programs.
 const fragmentWater=fragments.map(f=>waterProximity(s,f.polygon));
 const waterfront=i=>fragmentWater[i]<=WATERFRONT_GAP;
 const free=new Set(fragments.map((_,i)=>i)),assignments=new Map(),inlandDocks=new Set();
 const order=[...o.quarters].sort((a,b)=>(a==='docks'?-1:0)-(b==='docks'?-1:0));
 for(const id of order){let chosen=null,best=Infinity;for(const i of free){const c=polygonInterior(fragments[i].polygon);let score=dist(c,anchor)+r()*20;
  if(id==='docks'){const gap=fragmentWater[i];score=waterfront(i)?gap:(Number.isFinite(gap)?1000+gap:1000);}
  if(['farming','cemetery','slums'].includes(id))score=-dist(c,anchor);
  if(['noble','university'].includes(id))score=dist(c,[anchor[0]-180,anchor[1]-170]);
  if(score<best){best=score;chosen=i;}
 }if(chosen!=null){assignments.set(chosen,id);free.delete(chosen);if(id==='docks'&&!waterfront(chosen))inlandDocks.add(chosen);}}
 for(const i of [...free]){
  if(!o.quarters.length){assignments.set(i,'unassigned');continue;}
  const pool=o.quarters.filter(id=>id!=='docks'||waterfront(i));
  const id=pool.length?pick(r,pool):'docks';
  assignments.set(i,id);if(id==='docks'&&!waterfront(i))inlandDocks.add(i);
 }
 if(inlandDocks.size&&o.quarters.includes('docks')&&(o.river||o.coast)&&![...assignments].some(([i,id])=>id==='docks'&&waterfront(i)))
  s.city.warnings.push('No waterfront was available for the docks program: inland storage quarters use no water-dependent detail.');
 const districtFeatures=[];
 for(let i=0;i<fragments.length;i++){
  const p=fragments[i].polygon,c=polygonInterior(p),id=assignments.get(i)||(o.quarters.length?pick(r,o.quarters):'unassigned'),q=buildingProgram(id);
  const d=add(s,'district',{polygon:p,x:c[0],y:c[1],ward:q.name,quarter:id,label:q.name,notes:'Quarter program: '+q.name+'. Select this plot to change its program and regenerate only this quarter.'});
  s.city.quarterCounts[id]=(s.city.quarterCounts[id]||0)+1;districtFeatures.push(d);
 }
 // Phase 3: plans and their open-space reservations. Phase 4: all buildings.
 // Phase 5: all props, checked against the complete occupancy set, including
 // buildings of every other district.
 const reservations=sceneReservations(s),occupancy=cityOccupancy(s);
 const contexts=districtFeatures.map(d=>{
  const ctx=districtContext(s,d,reservations,occupancy);
  for(const os of ctx.openSpaces){const c=center(os.polygon);
   add(s,'area',{polygon:os.polygon,x:c[0],y:c[1],material:os.material,ward:d.id,purpose:os.purpose,openSpace:true,notes:'Generated open space ('+os.purpose+'). Detail density controls decoration only; the ground surface is part of the district plan.'});}
  return {d,ctx};
 });
 for(const {d,ctx} of contexts){
  const buildings=placeDistrictBuildings(s,d,ctx,occupancy,rng(seed+'-quarter-'+d.id));
  s.city.generationDiagnostics[d.id]=districtDiagnostics(s,d,ctx,buildings,null);
 }
 for(const {d,ctx} of contexts)s.city.generationDiagnostics[d.id].props=placeDistrictProps(s,d,ctx,occupancy,rng(seed+'-quarter-'+d.id+'-props'));
 s.population=Math.round(s.features.filter(f=>f.type==='building').length*5.4);
 s.city.statistics={districts:districtFeatures.length,buildings:s.features.filter(f=>f.type==='building').length,buildingTypes:[...new Set(s.features.filter(f=>f.type==='building').map(f=>f.buildingKind))].length};
 return s;
}
function boundaryRay(origin,direction,poly){let best=Infinity;for(let i=0;i<poly.length;i++){
 const a=poly[i],b=poly[(i+1)%poly.length],v=[b[0]-a[0],b[1]-a[1]],w=[a[0]-origin[0],a[1]-origin[1]],den=direction[0]*v[1]-direction[1]*v[0];if(Math.abs(den)<1e-9)continue;
 const t=(w[0]*v[1]-w[1]*v[0])/den,u=(w[0]*direction[1]-w[1]*direction[0])/den;if(t>0&&u>=-1e-7&&u<=1+1e-7)best=Math.min(best,t);
 }return Number.isFinite(best)?[origin[0]+direction[0]*best,origin[1]+direction[1]*best]:origin.slice();}
function sampleBoundary(poly,step){const out=[];for(let i=0;i<poly.length;i++){
 const a=poly[i],b=poly[(i+1)%poly.length],n=Math.max(1,Math.ceil(dist(a,b)/step));for(let j=0;j<n;j++)out.push([lerp(a[0],b[0],j/n),lerp(a[1],b[1],j/n)]);
 }return out;}
function evenlySpacedBoundary(poly,step){const lengths=poly.map((p,i)=>dist(p,poly[(i+1)%poly.length])),total=lengths.reduce((a,b)=>a+b,0),count=Math.max(3,Math.floor(total/step)),out=[];for(let k=0;k<count;k++){let d=k*total/count,i=0;while(i<lengths.length-1&&d>lengths[i])d-=lengths[i++];const a=poly[i],b=poly[(i+1)%poly.length],t=d/(lengths[i]||1);out.push([lerp(a[0],b[0],t),lerp(a[1],b[1],t)]);}return out;}
function smoothLine(points,passes=2){let p=points;for(let k=0;k<passes;k++){const q=[p[0]];for(let i=1;i<p.length;i++){const a=p[i-1],b=p[i];q.push([lerp(a[0],b[0],.25),lerp(a[1],b[1],.25)],[lerp(a[0],b[0],.75),lerp(a[1],b[1],.75)]);}q.push(p.at(-1));p=q;}return p;}
function localElevation(s,p){if(!s.terrain?.elevationM)return null;const {n,elevationM}=s.terrain,x=clamp(p[0]/s.width*n-.5,0,n-1),y=clamp(p[1]/s.height*n-.5,0,n-1),ix=Math.floor(x),iy=Math.floor(y),jx=Math.min(n-1,ix+1),jy=Math.min(n-1,iy+1);return lerp(lerp(elevationM[iy*n+ix],elevationM[iy*n+jx],x-ix),lerp(elevationM[jy*n+ix],elevationM[jy*n+jx],x-ix),y-iy);}
function localRegion(seed,config){
 const o=options('local',config),s=base('local',seed,o),r=rng(seed),hs=hash(seed),n=160,raw=[],moisture=[];s.title=name(r)+' Survey';
 for(let y=0;y<n;y++)for(let x=0;x<n;x++){
  const nx=(x+.5)/n,ny=(y+.5)/n,a=fbm(nx*2.8,ny*2.8,hs),b=noise(nx*4.5+4,ny*4.5+3,hs+37);let v=a;
  if(['mountains','alpine'].includes(o.biome))v=.45*a+.55*(1-Math.abs(2*fbm(nx*4,ny*3,hs+921)-1));
  else if(o.biome==='desert')v=.45*a+.2*Math.sin((nx*12+ny*4+noise(nx*2,ny*2,hs))*Math.PI);
  else if(o.biome==='badlands')v=a*.3+Math.pow(Math.abs(2*b-1),.5)*.7;
  else if(o.biome==='volcanic'){const d=Math.hypot(nx-.5,ny-.5);v=a*.25+Math.exp(-d*d*14)-.62*Math.exp(-d*d*190);}
  else if(o.biome==='coast')v=a*.35+nx*.7;
  else if(o.biome==='wetland')v=.8*a+.2*noise(nx*7,ny*7,hs+992);
  if(o.water==='river')v+=Math.abs(nx-.5)*.16;
  raw.push(v);moisture.push(fbm(nx*5+17,ny*5+31,hs+8123));
 }
 const minRaw=Math.min(...raw),maxRaw=Math.max(...raw),avgRaw=raw.reduce((a,b)=>a+b,0)/raw.length;
 const elevationM=raw.map(v=>Number((o.averageHeight+(v-avgRaw)/(maxRaw-minRaw||1)*o.heightDiversity).toFixed(3)));
 const minM=Math.min(...elevationM),maxM=Math.max(...elevationM),meanM=elevationM.reduce((a,b)=>a+b,0)/elevationM.length;
 const heightAt=v=>.12+(v-minM)/(maxM-minM||1)*.78,heights=elevationM.map(heightAt),sea=o.water==='coast'?clamp(heightAt(0),0,1):0;
 s.terrain={n,heights,moisture,sea,elevationM,minM,maxM,meanM,cellMeters:o.sizeKm*1000/n,biome:o.biome,waterMode:o.water,revision:0};
 s.metadata={...s.metadata,scope:'Local landscape survey; all horizontal coordinates have one consistent kilometre scale. Symbols are not measured footprints.',elevationModel:'Synthetic procedural height field. Mean and peak-to-trough relief are specified in metres; not real-world survey data.',warnings:[]};
 const index=p=>clamp(Math.floor(p[1]/1000*n),0,n-1)*n+clamp(Math.floor(p[0]/1000*n),0,n-1),at=i=>[(i%n+.5)*1000/n,(Math.floor(i/n)+.5)*1000/n];
 const dry=p=>heights[index(p)]>=sea&&p[0]>10&&p[1]>10&&p[0]<990&&p[1]<990;
 // Priority-flood drainage to the sea or boundary; parents strictly descend the filled field.
 const parent=new Int32Array(n*n).fill(-1),filled=elevationM.slice(),seen=new Uint8Array(n*n),heap=new Heap();
 for(let y=0;y<n;y++)for(let x=0;x<n;x++){const i=y*n+x;if(x===0||y===0||x===n-1||y===n-1||(o.water==='coast'&&elevationM[i]<0)){seen[i]=1;heap.push([filled[i],i]);}}
 while(heap.length){const[h,i]=heap.pop(),x=i%n,y=Math.floor(i/n);for(const[dx,dy]of[[1,0],[-1,0],[0,1],[0,-1],[1,1],[-1,-1],[1,-1],[-1,1]]){
  const xx=x+dx,yy=y+dy,j=yy*n+xx;if(xx<0||yy<0||xx>=n||yy>=n||seen[j])continue;seen[j]=1;parent[j]=i;filled[j]=Math.max(elevationM[j],h+.00001);heap.push([filled[j],j]);
 }}
 const waterLines=[],occupied=[];
 if(['stream','river'].includes(o.water)){
  const candidates=Array.from({length:160},()=>Math.floor(r()*n*n)),paths=[];
  for(const start of candidates){if(heights[start]<sea)continue;let i=start,points=[];while(i!==-1&&points.length<n*3){points.push(at(i));if(heights[i]<sea)break;i=parent[i];}if(points.length>12)paths.push(points);}
  paths.sort((a,b)=>b.length-a.length);const count=o.water==='river'?3:2;
  for(const path of paths){if(waterLines.length>=count)break;if(waterLines.some(line=>nearPolyline(path[0],line.points)<90))continue;
   // Do not simplify away drainage junctions: physical widths are in metres.
   const widthM=o.water==='river'?(waterLines.length?6:o.riverWidth):Math.max(2,o.riverWidth*.22),width=Math.max(.65,widthM/o.sizeKm);
   const f=add(s,'river',{points:smoothLine(path),width,widthMeters:widthM,label:'',notes:'Schematic channel following a filled-depression drainage path.'});waterLines.push(f);
  }
 }
 if(o.water==='lake'){
  // A deliberately small local lake occupies the lowest inland basin.
  let low=-1;for(let y=24;y<n-24;y++)for(let x=24;x<n-24;x++){const i=y*n+x;if(low<0||elevationM[i]<elevationM[low])low=i;}
  const c=at(low),radius=clamp(500/o.sizeKm,12,130),poly=Array.from({length:56},(_,i)=>{const a=i/56*Math.PI*2,rad=radius*(.82+.16*Math.sin(a*3));return[c[0]+Math.cos(a)*rad,c[1]+Math.sin(a)*rad*.65];});
  add(s,'water',{polygon:poly,label:'',notes:'Stylized basin lake. Surface polygon does not modify the stored elevation field.'});occupied.push(c);
 }
 const blocked=p=>!dry(p)||s.features.some(f=>f.type==='water'&&inside(p,f.polygon)||f.type==='river'&&nearPolyline(p,f.points)<f.width/2+2);
 // Local roads do not imply settlement clusters. They traverse a single bounded survey.
 if(o.roads!=='none'){
  const ends=[];
  for(let side=0;side<(o.roads==='network'?4:2);side++){let best=null,score=Infinity;for(let t=0;t<80;t++){
   const v=40+r()*920,p=side===0?[18,v]:side===1?[982,v]:side===2?[v,18]:[v,982];if(blocked(p))continue;const e=elevationM[index(p)];if(e<score){score=e;best=p;}
  }if(best)ends.push(best);}
  const cost=heights.map((v,i)=>.28+clamp((elevationM[i]-minM)/Math.max(100,o.heightDiversity),0,1)*.55);
  if(o.water==='coast')for(let i=0;i<cost.length;i++)if(elevationM[i]<0)cost[i]=0;
  if(ends.length>1){const centerPoint=ends[0];for(let i=1;i<ends.length;i++){
   const path=astar(cost,n,centerPoint,ends[i],.08),widthMeters=o.roads==='footpath'?1.5:6;
   add(s,'road',{points:smoothLine(path,1),width:Math.max(.85,widthMeters/o.sizeKm),widthMeters,roadType:o.roads==='footpath'?'trail':'road',notes:'Terrain-weighted route. Streams and sea may require a crossing; inspect before play.'});
  }}else s.metadata.warnings.push('No dry edge-to-edge route was available for the selected road setting.');
 }
 // Only explicitly requested homesteads; no villages or city population defaults.
 for(let k=0;k<o.homesteads;k++){let placed=false;for(let t=0;t<500;t++){
  const p=[45+r()*910,45+r()*910],minDistance=o.minSeparationKm/o.sizeKm*1000;if(blocked(p)||occupied.some(q=>dist(p,q)<minDistance))continue;
  const road=s.features.filter(f=>f.type==='road');if(road.length&&road.every(f=>nearPolyline(p,f.points)>100))continue;
  occupied.push(p);add(s,'poi',{x:p[0],y:p[1],asset:'local-farmstead',size:7,label:name(r)+' Farm',elevationM:localElevation(s,p),notes:'An isolated farmstead, not a village. The marker is symbolic.'});placed=true;break;
 }if(!placed)s.metadata.warnings.push('A requested homestead could not meet the dry-land and minimum-separation constraints.');}
 for(let k=0;k<o.caves;k++){let best=null,bestScore=-Infinity;for(let t=0;t<140;t++){
  const p=[35+r()*930,35+r()*930];if(blocked(p)||occupied.some(q=>dist(p,q)<35))continue;
  const i=index(p),x=i%n,y=Math.floor(i/n),slope=Math.abs(elevationM[i]-elevationM[y*n+Math.min(n-1,x+1)])+Math.abs(elevationM[i]-elevationM[Math.min(n-1,y+1)*n+x]);const score=slope+r()*o.heightDiversity*.004;if(score>bestScore){bestScore=score;best=p;}
 }if(best){occupied.push(best);add(s,'poi',{x:best[0],y:best[1],asset:'cave-mouth',size:8,label:pick(r,['Hidden','Split','Echoing','Wind','Deep','Cold'])+' Cave '+(k+1),elevationM:localElevation(s,best),notes:'Entrance marker only. The survey does not generate underground passage geometry.'});}}
 const decorations={woodland:['canopy-grove','canopy-conifers','meadow-patch'],plains:['meadow-patch','hedgerow','rock-outcrop'],mountains:['ridge-spur','scree-slope','rock-outcrop'],desert:['dune-ridge','salt-pan','desert-wadi'],badlands:['mesa','rock-arch','dry-gully'],wetland:['marsh-pool','reed-bed','canopy-grove'],coast:['sea-stack','rock-outcrop','meadow-patch'],alpine:['scree-slope','ridge-spur','snowfield'],volcanic:['lava-bed','fumarole','basalt-columns'],tundra:['snowfield','moss-patch','rock-outcrop']};
 for(let k=0;k<Math.round(180*o.detail);k++){
  const p=[20+r()*960,20+r()*960];if(blocked(p)||occupied.some(q=>dist(p,q)<20))continue;
  const isTree=o.biome==='woodland',symbol=pick(r,decorations[o.biome]);if(isTree&&moisture[index(p)]<.52-o.forest*.23)continue;
  const footprintM=isTree?100+r()*120:70+r()*160;
  add(s,'decoration',{x:p[0],y:p[1],asset:symbol,size:clamp(footprintM/o.sizeKm/2,2,14),rotation:isTree?0:r()*35,notes:'Schematic landscape patch, not an individual tree or a measured landmark.'});
 }
 if(o.water==='coast'&&minM>=0)s.metadata.warnings.push('All sampled ground is above sea level. Lower the mean elevation or increase relief to reveal a coast.');
 s.appearance={palette:o.biome==='desert'||o.biome==='badlands'?'desert':['alpine','tundra'].includes(o.biome)?'frost':'atlas',grid:'none',contours:true};
 return s;
}
/* ---- Battle zone program: the ordered plan that drives room placement. ----
 * Each zone role is a room type with a size class, a defining prop, extra props
 * and GM notes. THEME_ZONES lists the default plan per encounter preset, in
 * placement order: the first zone is the way in, the last is the objective.
 * Size classes: s = 3×3 cells, m = 5×4, l = 7×5 (before seed jitter). */
const ZONE_ROLES=Battle.ZONES,THEME_ZONES=Battle.PLANS;
function mapBoundary(s){if(s.mode!=='battle'||!['hex-pointy','hex-flat'].includes(s.options.mapShape))return[[0,0],[s.width,0],[s.width,s.height],[0,s.height]];
 const pointy=s.options.mapShape==='hex-pointy',r=pointy?Math.min(s.width/Math.sqrt(3),s.height/2):Math.min(s.width/2,s.height/Math.sqrt(3)),angle=pointy?-Math.PI/2:0;
 return Array.from({length:6},(_,i)=>[s.width/2+r*Math.cos(angle+i*Math.PI/3),s.height/2+r*Math.sin(angle+i*Math.PI/3)]);
}
function finalizeBattle(s){
 s.appearance={grid:s.options.gridType,hq:s.options.hq};s.battle.boundary=mapBoundary(s);
 if(s.battle.generatorVersion===2)return s;
 if(s.options.mapShape==='rectangle')return s;
 const poly=s.battle.boundary,g=s.gridSize,{cols,rows,cells}=s.battle,outdoor=Battle.isOutdoor(s.options.theme);
 if(!outdoor){
  for(let y=0;y<rows;y++)for(let x=0;x<cols;x++)if(!inside([(x+.5)*g,(y+.5)*g],poly))cells[y*cols+x]=0;
  // Retain the largest navigable component after trimming a rectangular complex to a hex.
  const seen=new Set(),groups=[];for(let i=0;i<cells.length;i++){if(!cells[i]||seen.has(i))continue;const q=[i];seen.add(i);
   for(let j=0;j<q.length;j++){const u=q[j],x=u%cols,y=Math.floor(u/cols);for(const[dx,dy]of[[1,0],[-1,0],[0,1],[0,-1]]){const xx=x+dx,yy=y+dy,v=yy*cols+xx;if(xx<0||yy<0||xx>=cols||yy>=rows||seen.has(v)||!cells[v])continue;seen.add(v);q.push(v);}}
   groups.push(q);
  }groups.sort((a,b)=>b.length-a.length);cells.fill(0);for(const i of groups[0]||[])cells[i]=1;
  // A very narrow hex may miss the entire original cave. Always leave a small
  // playable central chamber rather than an empty map after envelope clipping.
  if(!cells.some(Boolean)){
   const cx=Math.floor(cols/2),cy=Math.floor(rows/2);
   for(let y=cy-2;y<=cy+2;y++)for(let x=cx-2;x<=cx+2;x++)if(x>=0&&y>=0&&x<cols&&y<rows&&inside([(x+.5)*g,(y+.5)*g],poly))cells[y*cols+x]=1;
   s.metadata.boundaryFallback='A small central chamber was carved because the hex boundary missed the generated cave.';
  }
 }
 s.features=s.features.filter(f=>f.type==='portal'?inside(center(f.points),poly):f.x==null||(inside([f.x,f.y],poly)&&(outdoor||cells[Math.floor(f.y/g)*cols+Math.floor(f.x/g)])));
 s.metadata.mapBoundary='Hexagonal play boundary clips the render. Room construction uses a square raster independent of the movement grid. For enclosed maps only the largest connected clipped floor is retained.';
 return s;
}

defaults.city.buildings=BUILDING_TYPES.map(t=>t.id);
function battle(seed,config){const o=options('battle',config),s=base('battle',seed,o);return Battle.generate(s,{rng,add,mapBoundary,pointOnOrInside,inside,ASSETS});}
function wallSegments(s){
 if(!s.battle||Battle.isOutdoor(s.options.theme))return[];
 const {cols,rows,cells}=s.battle,g=s.gridSize,lines=[],exterior=new Set(s.battle.exterior||[]);
 for(let y=0;y<rows;y++)for(let x=0;x<cols;x++){
  const i=y*cols+x;if(!cells[i])continue;
  if(exterior.has(i)){
   // No walls on the map edge outdoors; painted rock still creates real boundaries.
   if(y>0&&!cells[i-cols]&&exterior.has(i-cols))lines.push([[x*g,y*g],[(x+1)*g,y*g]]);
   if(y<rows-1&&!cells[i+cols]&&exterior.has(i+cols))lines.push([[x*g,(y+1)*g],[(x+1)*g,(y+1)*g]]);
   if(x>0&&!cells[i-1]&&exterior.has(i-1))lines.push([[x*g,y*g],[x*g,(y+1)*g]]);
   if(x<cols-1&&!cells[i+1]&&exterior.has(i+1))lines.push([[(x+1)*g,y*g],[(x+1)*g,(y+1)*g]]);
   continue;
  }
  if(y===0||!cells[(y-1)*cols+x])lines.push([[x*g,y*g],[(x+1)*g,y*g]]);
  if(y===rows-1||!cells[(y+1)*cols+x])lines.push([[x*g,(y+1)*g],[(x+1)*g,(y+1)*g]]);
  if(x===0||!cells[y*cols+x-1])lines.push([[x*g,y*g],[x*g,(y+1)*g]]);
  if(x===cols-1||!cells[y*cols+x+1])lines.push([[(x+1)*g,y*g],[(x+1)*g,(y+1)*g]]);
 }
 // Shared walls exist even when both neighbouring floor cells are walkable.
 // Keep only surviving interfaces after floor painting; new solid cells already
 // receive a raster boundary above. Old documents need no partition metadata.
 for(const edge of s.battle.partitions||[]){const [a,b]=edge,m=[(a[0]+b[0])/2,(a[1]+b[1])/2],dx=b[0]-a[0],dy=b[1]-a[1],len=Math.hypot(dx,dy)||1,n=[-dy/len*g*.1,dx/len*g*.1];
  const floor=p=>{const x=Math.floor(p[0]/g),y=Math.floor(p[1]/g);return x>=0&&y>=0&&x<cols&&y<rows&&cells[y*cols+x];};
  if(floor([m[0]+n[0],m[1]+n[1]])&&floor([m[0]-n[0],m[1]-n[1]]))lines.push(edge);
 }
 return lines;
}
function generate(mode,seed,config){return mode==='fantasy'?Studio.generate(seed,config):mode==='region'?region(seed,config):mode==='local'?localRegion(seed,config):mode==='city'?guidedCity(seed,config):mode==='battle'?finalizeBattle(battle(seed,config)):(()=>{throw Error('Unknown map mode');})();}
/** Validate a loaded document before exposing it to the editor or renderer.
 * Local coordinates only. No HTML, scripts or remote image URLs are accepted.
 */
function validateScene(s){
 if(!s||typeof s!=='object'||s.format!=='megamap'||s.version!==1||!['region','local','city','battle'].includes(s.mode))throw Error('Unsupported Megamap document.');
 for(const k of ['width','height'])if(!Number.isFinite(s[k])||s[k]<=0||s[k]>10000)throw Error('Invalid map dimensions.');
 if(!Number.isFinite(s.scale)||s.scale<=0||s.scale>100000)throw Error('Invalid map scale.');
 if(!Array.isArray(s.features)||s.features.length>40000)throw Error('Invalid or oversized feature list (40,000 maximum).');
 if(s.titleCustom!=null&&typeof s.titleCustom!=='boolean')throw Error('Invalid custom title flag.');
 if(typeof s.title!=='string'||s.title.length>1000)throw Error('Invalid map title.');
 if(s.notes!=null&&(typeof s.notes!=='string'||s.notes.length>200000))throw Error('Invalid map notes.');
 s.seed=String(s.seed??'imported').slice(0,120);s.notes=s.notes||'';s.units=s.mode==='battle'?'ft':'km';
 s.metadata=s.metadata&&typeof s.metadata==='object'&&!Array.isArray(s.metadata)?s.metadata:{};
 // Pre-HQ saved maps keep their original look. New generation supplies hq:true.
 if(s.mode==='battle'&&s.options?.hq==null&&s.appearance?.hq==null){s.appearance={...s.appearance,hq:false};}
 s.options=options(s.cityStudio?'fantasy':s.mode,s.options&&typeof s.options==='object'?s.options:{});
 if(s.cityStudio)Studio.validate(s);
 const types=new Set(['river','water','settlement','road','poi','decoration','district','plaza','asset','building','wall','room','label','paint','image','area','portal','light']);
 const paths=new Set(['river','road','wall','paint','portal']),polygons=new Set(['water','district','plaza','building','area']);
 const ids=new Set();
 for(const f of s.features){
  if(!f||typeof f!=='object'||!types.has(f.type)||typeof f.id!=='string'||f.id.length>150||ids.has(f.id))throw Error('Invalid or duplicated feature.');ids.add(f.id);
  if(f.labelCustom!=null&&typeof f.labelCustom!=='boolean')throw Error('Invalid custom label flag.');
  for(const k of ['label','notes','ward','quarter','buildingKind','roofAsset'])if(f[k]!=null&&(typeof f[k]!=='string'||f[k].length>200000))throw Error('Invalid feature text.');
  for(const k of ['x','y','width','size','rotation','opacity','range','intensity','aspect','roof','z','roofAngle','roofWidth','roofHeight','roofCx','roofCy','widthMeters','elevationM'])if(f[k]!=null&&(!Number.isFinite(f[k])||Math.abs(f[k])>20000))throw Error('Invalid feature geometry.');
  for(const k of ['size','width','range','aspect'])if(f[k]!=null&&f[k]<=0)throw Error('Feature size must be positive.');
  for(const k of ['points','polygon'])if(f[k]!=null&&(!Array.isArray(f[k])||f[k].length>10000||f[k].some(p=>!Array.isArray(p)||p.length!==2||p.some(v=>!Number.isFinite(v)||Math.abs(v)>20000))))throw Error('Invalid polygon or path.');
  if(paths.has(f.type)&&(!f.points||f.points.length<2))throw Error('A path requires at least two points.');
  if(polygons.has(f.type)&&(!f.polygon||f.polygon.length<3))throw Error('A polygon requires at least three points.');
  if(!paths.has(f.type)&&!polygons.has(f.type)&&(!Number.isFinite(f.x)||!Number.isFinite(f.y)))throw Error('A point feature requires coordinates.');
  if(paths.has(f.type)&&f.type!=='portal'&&!Number.isFinite(f.width))throw Error('Missing path width.');
  if(f.type==='portal'&&f.points.length!==2)throw Error('A door requires exactly two endpoints.');
  if(f.type==='image'&&(!/^data:image\/(png|jpeg|webp);base64,[a-zA-Z0-9+/=]+$/.test(f.data||'')||f.data.length>12000000))throw Error('Only embedded PNG, JPEG or WebP images are allowed.');
  if(f.asset&&!ASSETS.includes(f.asset))f.asset='rock';if(f.roofAsset&&!ASSETS.includes(f.roofAsset))delete f.roofAsset;
  if(f.type==='settlement')f.population=Number.isFinite(f.population)?clamp(Math.round(f.population),0,1e8):0;
  if(f.type==='light'){f.range=clamp(f.range||6,1,100);f.intensity=clamp(f.intensity||1,.1,5);f.color=/^#[0-9a-f]{6}$/i.test(f.color||'')?f.color:'#ffc477';}
 }
 if(s.terrain){const {n,heights,moisture,sea}=s.terrain;if(!Number.isInteger(n)||n<8||n>256||!Array.isArray(heights)||!Array.isArray(moisture)||heights.length!==n*n||moisture.length!==n*n||[...heights,...moisture].some(x=>!Number.isFinite(x)||x<0||x>1)||!Number.isFinite(sea)||sea<0||sea>1)throw Error('Invalid terrain data.');}
 if(s.battle){const {cols,rows,cells}=s.battle;if(!Number.isInteger(cols)||!Number.isInteger(rows)||cols<16||rows<16||cols>80||rows>80||!Array.isArray(cells)||cells.length!==cols*rows||cells.some(v=>v!==0&&v!==1)||!Number.isFinite(s.gridSize)||Math.abs(s.gridSize-s.width/cols)>1e-5||Math.abs(s.height-rows*s.gridSize)>1e-5)throw Error('Invalid battle grid.');}
 if(['region','local'].includes(s.mode)&&!s.terrain||s.mode==='battle'&&!s.battle)throw Error('Missing terrain or grid.');
 if(s.terrain?.elevationM){
  const t=s.terrain;if(s.mode!=='local'||!Array.isArray(t.elevationM)||t.elevationM.length!==t.n*t.n||t.elevationM.some(v=>!Number.isFinite(v)||Math.abs(v)>15000))throw Error('Invalid metre-based elevation field.');
  if(!Number.isFinite(t.cellMeters)||Math.abs(t.cellMeters-s.scale*1000/t.n)>.001)throw Error('Elevation sample spacing does not match the map scale.');
  t.minM=Math.min(...t.elevationM);t.maxM=Math.max(...t.elevationM);t.meanM=t.elevationM.reduce((a,b)=>a+b,0)/t.elevationM.length;
 }
 if(s.mode==='local'&&!s.terrain?.elevationM)throw Error('Local surveys require metre-based elevations.');
 const validBoundary=p=>Array.isArray(p)&&p.length>=3&&p.length<=400&&p.every(v=>Array.isArray(v)&&v.length===2&&v.every(Number.isFinite)&&v[0]>=-.001&&v[1]>=-.001&&v[0]<=s.width+.001&&v[1]<=s.height+.001)&&area(p)>1;
 if(s.city&&!validBoundary(s.city.boundary))throw Error('Invalid city envelope.');
 if(s.battle?.boundary&&!validBoundary(s.battle.boundary))throw Error('Invalid battle boundary.');
 Battle.validateMetadata(s);
 return s;
}

return{VERSION,SIZE,defaults,ASSETS,CITY_STUDIO:Studio,CITY_SHAPES,QUARTERS,BUILDING_TYPES,LOCAL_BIOMES,GRID_TYPES,BATTLE_ZONES:ZONE_ROLES,BATTLE_PLANS:THEME_ZONES,BATTLE_TEMPLATES:Battle.TEMPLATES,BATTLE_EXTRA_PRESETS:Battle.EXTRA_PRESETS,isRoomlessBattle:Battle.isRoomless,battleEstimate:Battle.estimate,options,cityEnvelope,triangulate,cleanPolygon,pointOnOrInside,clipToEnvelope,regenerateDistrict,localElevation,mapBoundary,hash,rng,noise,fbm,area,center,clip,inset,inside,hull,voronoi,createAlleys,astar,wallSegments,generate,validateScene,nearPolyline,dist,clamp,EPS,PLACE_CLEARANCE,RIVER_BANK_GAP,SHORE_SETBACK,STREET_SETBACK,segmentsIntersect,segmentDistance,polygonsIntersect,polygonDistance,polygonsClearOf,polygonInsidePolygon,polygonPolylineDistance,symbolFootprint,convexQuality,capsulePolygon,subtractConvex,subtractAll,shapeOf,boundsOf,sceneReservations,cityOccupancy,convexParts,districtContext,districtDiagnostics,cleanFootprint,repairBuildingFootprint,buildingShapeReason,buildingRejection,waterProximity,waterKindOk,planOpenSpaces,reserveCompactGround,sampleConvex,waterfrontBBox,MAX_BUILD_ASPECT,MIN_BUILD_WIDTH,TIP_ANGLE,TIP_EXTENSION,TIP_TRIM,MAX_TIP_TRIMS,FOOTPRINT_TOL,WATERFRONT_GAP,OPEN_SPACE_FRACTION,MIN_OPEN_SPACE,OPEN_MATERIALS,WATER_KINDS,WATER_PROPS,PROP_MIN_SIZE,MAX_PROP_ATTEMPTS};
});
