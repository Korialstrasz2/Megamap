/* City Studio — terrain-led fantasy settlements. GPL-3.0-only.
 * Independent of the legacy Voronoi/parcel city generator. No network, people,
 * economy simulation or generated narrative. Units are metres at the boundary
 * of the model and local SVG units in geometry. All random streams are seeded.
 */
(function(root,factory){const api=factory();if(typeof module==='object'&&module.exports)module.exports=api;else root.MegamapCityStudio=api;})(typeof globalThis!=='undefined'?globalThis:this,function(){
'use strict';
const VERSION=1,TAU=2*Math.PI,EPS=1e-7;
const clamp=(v,a,b)=>Math.max(a,Math.min(b,v)),mix=(a,b,t)=>a+(b-a)*t;
const distance=(a,b)=>Math.hypot(a[0]-b[0],a[1]-b[1]);
const point=(a,b,t)=>[mix(a[0],b[0],t),mix(a[1],b[1],t)];
const hash=s=>{let h=2166136261;for(const c of String(s)){h^=c.charCodeAt(0);h=Math.imul(h,16777619);}return h>>>0;};
function rng(s){let a=hash(s);return()=>{a=(a+0x6D2B79F5)|0;let t=Math.imul(a^(a>>>15),1|a);t^=t+Math.imul(t^(t>>>7),61|t);return((t^(t>>>14))>>>0)/4294967296;};}
const choose=(r,a)=>a[Math.floor(r()*a.length)];
const copy=x=>JSON.parse(JSON.stringify(x));
const SIZE_PROFILES={hamlet:{count:4,km:.20,hubs:1},village:{count:35,km:.45,hubs:3},town:{count:230,km:.8,hubs:6},city:{count:600,km:1.3,hubs:9},capital:{count:1500,km:1.8,hubs:13}};
const PRESETS=[
 {id:'fishing',name:'Four huts & three boats',hint:'A tiny fishing landing, not a small city. Exactly four huts and three skiffs at the recommended size.',size:'hamlet',landscape:'coast',culture:'vernacular',fabric:'organic',history:'none',walls:'none',wonder:'none',fleet:'fishing',boats:3,relief:12},
 {id:'river-capital',name:'Imperial capital · Golden River',hint:'A river metropolis with a naval waterfront, palace precinct, dense old streets and villa gardens.',size:'capital',landscape:'river',culture:'imperial',fabric:'mixed',history:'layered',walls:'city',wonder:'none',fleet:'armada',boats:18,relief:65},
 {id:'council',name:'Nordic council · hillside harbor',hint:'Longhouses and a council hall across sloping terraces, with stairs, a winding ascent and longship berths.',size:'town',landscape:'fjord',culture:'nordic',fabric:'organic',history:'old',walls:'citadel',wonder:'none',fleet:'longships',boats:8,relief:155},
 {id:'market',name:'Bridge & market town',hint:'A crossing and fountain square with shops, shared frontages, gardens and a less regular outer edge.',size:'town',landscape:'river',culture:'vernacular',fabric:'mixed',history:'old',walls:'none',wonder:'none',fleet:'trade',boats:5,relief:28},
 {id:'citadel',name:'Mountain citadel',hint:'A hilltop stronghold, terrain-routed streets and lower service quarters on buildable slopes.',size:'city',landscape:'hills',culture:'stone',fabric:'organic',history:'layered',walls:'citadel',wonder:'none',fleet:'none',boats:0,relief:200},
 {id:'canal',name:'Lagoon trading port',hint:'Quays and canal crossings frame dense waterside frontages and enclosed merchant courtyards.',size:'city',landscape:'canals',culture:'merchant',fabric:'mixed',history:'old',walls:'none',wonder:'none',fleet:'trade',boats:12,relief:10},
 {id:'grove',name:'Great-tree sanctuary',hint:'Woodland neighborhoods and curving paths grow around a protected, monumental tree.',size:'town',landscape:'forest',culture:'woodland',fabric:'organic',history:'ancient',walls:'none',wonder:'great-tree',fleet:'none',boats:0,relief:70},
 {id:'oasis',name:'Oasis court city',hint:'Flat roofs, shaded lanes, courtyard compounds and palms beside a protected spring basin.',size:'town',landscape:'oasis',culture:'desert',fabric:'mixed',history:'old',walls:'city',wonder:'none',fleet:'none',boats:0,relief:24},
 {id:'crater',name:'Crater-side arcane city',hint:'Terraced neighborhoods and diverted streets surround a vast, unbuildable impact hollow.',size:'city',landscape:'hills',culture:'arcane',fabric:'organic',history:'layered',walls:'none',wonder:'crater',fleet:'none',boats:0,relief:100},
 {id:'colossus',name:'Reclaimed colossus city',hint:'New streets and gardens sit beside ruined foundations and a monumental fallen relic.',size:'town',landscape:'plain',culture:'stone',fabric:'mixed',history:'ancient',walls:'none',wonder:'colossus',fleet:'none',boats:0,relief:35}
];
const DEFAULTS={preset:'river-capital',size:'recommended',fabric:'recommended',landscape:'recommended',culture:'recommended',history:'recommended',walls:'recommended',wonder:'recommended',fleet:'recommended',envelope:'terrain',structureCount:0,boatCount:-1,relief:-1,hq:true,rooftops:false,underground:false,detail:'balanced'};
const ENUMS={size:['recommended',...Object.keys(SIZE_PROFILES)],fabric:['recommended','organic','mixed','planned'],landscape:['recommended','plain','river','coast','fjord','hills','canals','forest','oasis'],culture:['recommended','vernacular','imperial','nordic','stone','merchant','woodland','desert','arcane'],history:['recommended','none','old','layered','ancient'],walls:['recommended','none','city','citadel'],wonder:['recommended','none','great-tree','crater','colossus','crystal'],fleet:['recommended','none','fishing','trade','armada','longships'],envelope:['terrain','oval','rectangle','ribbon'],detail:['quiet','balanced','rich']};
function normalize(raw={}){raw=raw&&typeof raw==='object'&&!Array.isArray(raw)?raw:{};const o={...DEFAULTS};o.preset=PRESETS.some(p=>p.id===raw.preset)?raw.preset:DEFAULTS.preset;
 for(const [key,values]of Object.entries(ENUMS))if(values.includes(raw[key]))o[key]=raw[key];
 for(const [key,min,max]of [['structureCount',0,2400],['boatCount',-1,40],['relief',-1,300]])if(Number.isFinite(Number(raw[key]))&&raw[key]!=null&&raw[key]!=='')o[key]=clamp(Math.round(Number(raw[key])),min,max);
 for(const key of ['hq','rooftops','underground'])if(typeof raw[key]==='boolean')o[key]=raw[key];return o;
}
function resolve(raw){const o=normalize(raw),p=PRESETS.find(p=>p.id===o.preset),v={...o};for(const key of ['size','fabric','landscape','culture','history','walls','wonder','fleet'])if(v[key]==='recommended')v[key]=p[key];
 const size=SIZE_PROFILES[v.size];v.count=o.structureCount||size.count;v.km=size.km;v.hubs=clamp(Math.round(size.hubs*Math.sqrt(v.count/size.count)),1,18);v.relief=o.relief<0?p.relief:o.relief;v.boats=o.boatCount<0?(v.fleet==='none'?0:v.size===p.size?p.boats:Math.max(1,Math.round(Math.sqrt(v.count)/2))):o.boatCount;
 if(v.count<=6){v.hubs=1;v.km=.20;v.wonder='none';v.walls='none';}v.metersPerUnit=v.km;return v;
}
function bounds(p){return{x0:Math.min(...p.map(v=>v[0])),y0:Math.min(...p.map(v=>v[1])),x1:Math.max(...p.map(v=>v[0])),y1:Math.max(...p.map(v=>v[1]))};}
function center(p){return p.reduce((s,v)=>[s[0]+v[0]/p.length,s[1]+v[1]/p.length],[0,0]);}
function area(p){let a=0;for(let i=0;i<p.length;i++){const q=p[(i+1)%p.length];a+=p[i][0]*q[1]-q[0]*p[i][1];}return Math.abs(a)/2;}
function inside(p,poly){let yes=false;for(let i=0,j=poly.length-1;i<poly.length;j=i++){const a=poly[i],b=poly[j];if((a[1]>p[1])!==(b[1]>p[1])&&p[0]<(b[0]-a[0])*(p[1]-a[1])/(b[1]-a[1])+a[0])yes=!yes;}return yes;}
function segmentPoint(p,a,b){const dx=b[0]-a[0],dy=b[1]-a[1],t=clamp(((p[0]-a[0])*dx+(p[1]-a[1])*dy)/(dx*dx+dy*dy||1),0,1);return{p:point(a,b,t),t};}
function lineDistance(p,line){let d=Infinity;for(let i=1;i<line.length;i++)d=Math.min(d,distance(p,segmentPoint(p,line[i-1],line[i]).p));return d;}
function intersection(a,b,c,d){const v=[b[0]-a[0],b[1]-a[1]],w=[d[0]-c[0],d[1]-c[1]],den=v[0]*w[1]-v[1]*w[0];if(Math.abs(den)<EPS)return null;const q=[c[0]-a[0],c[1]-a[1]],t=(q[0]*w[1]-q[1]*w[0])/den,u=(q[0]*v[1]-q[1]*v[0])/den;return t>=-EPS&&t<=1+EPS&&u>=-EPS&&u<=1+EPS?{p:point(a,b,t),t,u}:null;}
function overlaps(a,b,gap=0){const ba=bounds(a),bb=bounds(b);if(ba.x1+gap<bb.x0||bb.x1+gap<ba.x0||ba.y1+gap<bb.y0||bb.y1+gap<ba.y0)return false;
 if(a.some(p=>inside(p,b))||b.some(p=>inside(p,a)))return true;for(let i=0;i<a.length;i++)for(let j=0;j<b.length;j++){const p=a[i],q=a[(i+1)%a.length],v=b[j],w=b[(j+1)%b.length];if(intersection(p,q,v,w))return true;if(gap>0&&Math.min(distance(p,segmentPoint(p,v,w).p),distance(v,segmentPoint(v,p,q).p))<gap)return true;}return false;
}
function rect(c,w,h,angle=0){const cs=Math.cos(angle),sn=Math.sin(angle);return[[-w/2,-h/2],[w/2,-h/2],[w/2,h/2],[-w/2,h/2]].map(([x,y])=>[c[0]+x*cs-y*sn,c[1]+x*sn+y*cs]);}
function circle(c,r,n=32){return Array.from({length:n},(_,i)=>[c[0]+Math.cos(i*TAU/n)*r,c[1]+Math.sin(i*TAU/n)*r]);}
function corridor(a,b,width){const c=point(a,b,.5),d=distance(a,b);return rect(c,d+width,width,Math.atan2(b[1]-a[1],b[0]-a[0]));}
class Index{constructor(cell=40){this.cell=cell;this.bins=new Map();this.count=0;}keys(b){const out=[];for(let y=Math.floor(b.y0/this.cell);y<=Math.floor(b.y1/this.cell);y++)for(let x=Math.floor(b.x0/this.cell);x<=Math.floor(b.x1/this.cell);x++)out.push(x+','+y);return out;}add(poly,value={}){const item={poly,b:bounds(poly),value,id:this.count++};for(const k of this.keys(item.b)){if(!this.bins.has(k))this.bins.set(k,[]);this.bins.get(k).push(item);}return item;}query(poly,gap=0){const b=bounds(poly),found=new Set();for(const k of this.keys({x0:b.x0-gap,y0:b.y0-gap,x1:b.x1+gap,y1:b.y1+gap}))for(const x of this.bins.get(k)||[])found.add(x);return [...found];}hits(poly,gap=0,ignore=()=>false){return this.query(poly,gap).some(x=>!ignore(x.value)&&overlaps(poly,x.poly,gap));}}
function noise(x,y,seed){const ix=Math.floor(x),iy=Math.floor(y),s=t=>t*t*(3-2*t),h=(x,y)=>(hash(seed+':'+x+':'+y)%65536)/65535;return mix(mix(h(ix,iy),h(ix+1,iy),s(x-ix)),mix(h(ix,iy+1),h(ix+1,iy+1),s(x-ix)),s(y-iy));}
function makeGround(seed,v){const r=rng(seed+'-land'),phase=r()*TAU,riverWidth=v.preset==='river-capital'?100:46;
 const river=[];for(let y=-30;y<=1030;y+=10)river.push([610+Math.sin(y/185+phase)*37+Math.sin(y/470+phase)*22,y]);
 const shore=[];for(let y=0;y<=1000;y+=10)shore.push([v.landscape==='fjord'?665+Math.sin(y/150+phase)*55+Math.sin(y/65)*14:685+Math.sin(y/210+phase)*35+Math.sin(y/73+phase)*9,y]);
 const canals=v.landscape==='canals'?[[[150,720],[370,675],[550,700],[725,705]],[[475,170],[470,370],[500,520],[550,700]]]:[];
 const lake=circle([660,520],110,64).map(([x,y])=>[x,520+(y-520)*.68]);
 const g={n:64,phase,riverWidth,river,shore,canals,lake,landscape:v.landscape,relief:v.relief,heights:[],hill:[250+r()*150,250+r()*230]};
 for(let y=0;y<64;y++)for(let x=0;x<64;x++){const xx=(x+.5)/64*1000,yy=(y+.5)/64*1000;let z=.08+noise(xx/240,yy/240,seed)*.08;
 if(['hills','fjord','forest'].includes(v.landscape))z+=.68*Math.exp(-((xx-g.hill[0])**2/175000+(yy-g.hill[1])**2/150000))+.18*Math.exp(-((xx-600)**2/200000+(yy-160)**2/100000));else z+=.24*(1-xx/1100)+noise(xx/520,yy/520,seed+'b')*.13;
 const bank=bankDistance(g,[xx,yy]);g.heights.push(clamp(z,0,1)*clamp(bank/90,0,1));}
 const lo=Math.min(...g.heights),hi=Math.max(...g.heights);g.heights=g.heights.map(z=>v.relief===0?0:(z-lo)/(hi-lo||1));return g;
}
function heightAt(g,p){const x=clamp(p[0]/1000*g.n-.5,0,g.n-1),y=clamp(p[1]/1000*g.n-.5,0,g.n-1),ix=Math.floor(x),iy=Math.floor(y),a=(xx,yy)=>g.heights[Math.min(g.n-1,yy)*g.n+Math.min(g.n-1,xx)];return g.relief*mix(mix(a(ix,iy),a(ix+1,iy),x-ix),mix(a(ix,iy+1),a(ix+1,iy+1),x-ix),y-iy);}
function bankDistance(g,p){let d=Infinity;if(g.landscape==='river')d=lineDistance(p,g.river)-g.riverWidth/2;
 if(['coast','fjord','canals'].includes(g.landscape)){const y=clamp(p[1],0,999.999)/10,i=Math.floor(y);d=mix(g.shore[i][0],g.shore[i+1][0],y-i)-p[0];}
 if(g.landscape==='oasis')d=(Math.sqrt(((p[0]-660)/110)**2+((p[1]-520)/74.8)**2)-1)*74.8;
 for(const c of g.canals)d=Math.min(d,lineDistance(p,c)-11);return d;
}
function waterAt(g,p,margin=0){if(g.landscape==='river'&&lineDistance(p,g.river)<g.riverWidth/2+margin)return true;
 if(['coast','fjord','canals'].includes(g.landscape)){const y=clamp(p[1],0,999.999)/10,i=Math.floor(y),x=mix(g.shore[i][0],g.shore[i+1][0],y-i);if(p[0]>x-margin)return true;}
 if(g.landscape==='oasis'&&((p[0]-660)/(110+margin))**2+((p[1]-520)/(74.8+margin))**2<1)return true;
 return g.canals.some(c=>lineDistance(p,c)<11+margin);
}
function makeEnvelope(seed,v){if(v.envelope==='rectangle')return[[75,95],[900,95],[900,910],[75,910]];if(v.envelope==='oval')return circle([485,505],405,64).map(([x,y])=>[x,505+(y-505)*.83]);if(v.envelope==='ribbon')return rect([460,505],570,820,-.14);
 const r=rng(seed+'-edge'),ph=r()*TAU;return Array.from({length:64},(_,i)=>{const a=i*TAU/64,rad=390*(1+.07*Math.sin(a*3+ph)+.035*Math.sin(a*7-ph));return[475+Math.cos(a)*rad,505+Math.sin(a)*rad];});}
function emit(s,type,data){const id='cs'+(s.cityStudio.nextId++);const f={id,type,...data,cityGenerated:true};s.features.push(f);return f;}
function pathSamples(line,spacing=10){const out=[];for(let i=1;i<line.length;i++){const n=Math.max(1,Math.ceil(distance(line[i-1],line[i])/spacing));for(let j=0;j<n;j++)out.push(point(line[i-1],line[i],j/n));}out.push(line.at(-1));return out;}
function dryLine(g,line,margin=2){return pathSamples(line,4).every(p=>!waterAt(g,p,margin));}
function dryPolygon(g,poly,margin=1){return !waterAt(g,center(poly),margin)&&pathSamples([...poly,poly[0]],5).every(p=>!waterAt(g,p,margin));}
function addWater(s,g){if(g.landscape==='river')emit(s,'river',{points:copy(g.river),width:g.riverWidth,label:s.options.preset==='river-capital'?'Golden River':'River',cityRole:'water'});
 if(['coast','fjord','canals'].includes(g.landscape))emit(s,'water',{polygon:[...copy(g.shore),[1000,1000],[1000,0]],cityRole:'water'});
 if(g.landscape==='oasis')emit(s,'water',{polygon:copy(g.lake),label:'Spring basin',cityRole:'water'});
 for(const points of g.canals)emit(s,'river',{points:copy(points),width:22,cityRole:'water'});
}
class Heap{constructor(){this.a=[];}push(x){const a=this.a;let i=a.length;a.push(x);while(i){const p=(i-1)>>1;if(a[p][0]<=x[0])break;a[i]=a[p];i=p;}a[i]=x;}pop(){const a=this.a,x=a[0],end=a.pop();if(a.length){let i=0;while(i*2+1<a.length){let j=i*2+1;if(j+1<a.length&&a[j+1][0]<a[j][0])j++;if(a[j][0]>=end[0])break;a[i]=a[j];i=j;}a[i]=end;}return x;}get length(){return this.a.length;}}
/** Bounded terrain routing. Water is impassable: only explicit bridges cross it.
 * Endpoint connectors and every simplification chord are checked as well. */
function route(s,start,end,width=4,straight=false){const st=s.cityStudio,g=st.ground,n=80,cell=1000/n;
 const pass=p=>p[0]>=30&&p[1]>=30&&p[0]<=970&&p[1]<=970&&!waterAt(g,p,width/2+1)&&!st.reservations.some(z=>z.blockRoad&&(inside(p,z.polygon)||lineDistance(p,[...z.polygon,z.polygon[0]])<width/2+1.2));
 if(!pass(start)||!pass(end))return null;
 const span=distance(start,end),mid=point(start,end,.5),bend=straight||st.resolved.fabric==='planned'?0:(noise(mid[0]/120,mid[1]/120,s.seed+'bend')-.5)*Math.min(35,span*.23),dx=(end[0]-start[0])/(span||1),dy=(end[1]-start[1])/(span||1),control=[mid[0]-dy*bend,mid[1]+dx*bend];
 // Quadratic samples are stored geometry; renderer smoothing never changes access.
 const direct=Array.from({length:Math.max(3,Math.ceil(span/23))+1},(_,i)=>{const t=i/Math.max(3,Math.ceil(span/23));return[(1-t)**2*start[0]+2*(1-t)*t*control[0]+t*t*end[0],(1-t)**2*start[1]+2*(1-t)*t*control[1]+t*t*end[1]];});
 if(pathSamples(direct,4).every(pass)&&direct.every((p,i)=>!i||Math.abs(heightAt(g,p)-heightAt(g,direct[i-1]))/(distance(p,direct[i-1])*st.resolved.metersPerUnit)<.16))return direct;
 const id=p=>clamp(Math.floor(p[1]/cell),0,n-1)*n+clamp(Math.floor(p[0]/cell),0,n-1),pos=id=>[(id%n+.5)*cell,(Math.floor(id/n)+.5)*cell];
 const nearest=p=>{let best=-1,d=Infinity;const ix=Math.floor(p[0]/cell),iy=Math.floor(p[1]/cell);for(let dy=-2;dy<=2;dy++)for(let dx=-2;dx<=2;dx++){const x=ix+dx,y=iy+dy;if(x<0||y<0||x>=n||y>=n)continue;const v=y*n+x,q=pos(v),dd=distance(p,q);if(dd<d&&pass(q)&&pathSamples([p,q],4).every(pass)){best=v;d=dd;}}return best;};
 const a=nearest(start),b=nearest(end);if(a<0||b<0)return null;if(a===b)return pathSamples([start,end],4).every(pass)?[start,end]:null;
 const dist=new Float64Array(n*n).fill(Infinity),from=new Int32Array(n*n).fill(-1),closed=new Uint8Array(n*n),heap=new Heap();dist[a]=0;heap.push([0,a]);let visits=0;
 while(heap.length&&visits++<n*n*2){const [,u]=heap.pop();if(closed[u])continue;if(u===b)break;closed[u]=1;const p=pos(u),z=heightAt(g,p),x=u%n,y=Math.floor(u/n);
 for(const [dx,dy]of [[1,0],[-1,0],[0,1],[0,-1],[1,1],[1,-1],[-1,1],[-1,-1]]){const xx=x+dx,yy=y+dy;if(xx<0||yy<0||xx>=n||yy>=n)continue;const k=yy*n+xx,q=pos(k);if(closed[k]||!pass(q)||!pass(point(p,q,.5)))continue;
 const grade=Math.abs(heightAt(g,q)-z)/(distance(p,q)*st.resolved.metersPerUnit),length=Math.hypot(dx,dy),next=dist[u]+length*(1+Math.min(30,grade*grade*90));if(next<dist[k]){dist[k]=next;from[k]=u;heap.push([next+distance(q,end)/cell,k]);}}
 }
 if(from[b]<0)return null;let line=[end];for(let u=b;u!==-1;u=from[u]){line.push(pos(u));if(u===a)break;}line.push(start);line.reverse();
 const out=[line[0]];let i=0;while(i<line.length-1){let j=Math.min(line.length-1,i+8);for(;j>i+1;j--){const a=line[i],b=line[j],pa=pathSamples([a,b],4),za=heightAt(g,a),zb=heightAt(g,b);if(pa.every(pass)&&pa.every((p,k)=>Math.abs(heightAt(g,p)-mix(za,zb,k/(pa.length-1||1)))<6))break;}out.push(line[j]);i=j;}return out;
}
function street(s,points,role,width,extra={}){if(!points||points.length<2)return null;const f=emit(s,'road',{points,width,roadType:role==='alley'?'trail':'road',cityRole:role,...extra});return f;}
function nearestRoad(s,p,filter=f=>!['pier','access','roof-route','tunnel'].includes(f.cityRole)){let best=null,d=Infinity;for(const f of s.features)if(f.type==='road'&&filter(f))for(let i=1;i<f.points.length;i++){const at=segmentPoint(p,f.points[i-1],f.points[i]),dd=distance(p,at.p);if(dd<d){d=dd;best={point:at.p,road:f,segment:i,distance:dd};}}return best;}
function link(s,a,b,role='street',width=4){return street(s,route(s,a,b,width),role,width);}
function circleRoad(s,c,r,width,role='promenade'){const points=[...circle(c,r,36)];points.push(points[0]);return dryLine(s.cityStudio.ground,points,width/2+1)?street(s,points,role,width):null;}
function placeOrigin(s,r){const st=s.cityStudio,v=st.resolved,g=st.ground;
 let origin=v.count<=6?[470,500]:['fjord','hills'].includes(v.landscape)?[365,400]:[380,510];
 if(v.landscape==='oasis')origin=[450,500];if(v.wonder!=='none')origin=[405,490];
 while(waterAt(g,origin,60))origin[0]-=35;st.origin=origin;
 const radius=v.count<=6?0:v.wonder==='crater'?73:v.wonder==='great-tree'?44:v.wonder==='colossus'?55:Math.max(13,20/v.metersPerUnit);
 if(radius){const plaza=emit(s,'plaza',{polygon:circle(origin,radius+11,40),x:origin[0],y:origin[1],cityRole:'square',label:v.preset==='council'?'Council terrace':v.wonder!=='none'?'Monument precinct':'Fountain square'});
 const inner=v.wonder==='none'?Math.max(3,4/v.metersPerUnit):radius-8;st.reservations.push({polygon:circle(origin,inner,32),blockRoad:true});
 if(v.wonder==='crater')emit(s,'area',{polygon:circle(origin,inner,64),cityRole:'crater',material:'mountain'});
 else emit(s,'poi',{x:origin[0],y:origin[1],asset:v.wonder==='none'?'fountain':v.wonder==='great-tree'?'oak':v.wonder==='crystal'?'crystal':'statue',size:inner,citySymbol:v.wonder==='none'?'fountain':v.wonder,label:'',cityRole:'landmark'});
 st.reservations.push({polygon:plaza.polygon,blockRoad:false});circleRoad(s,origin,radius+14,Math.max(2.6,6/v.metersPerUnit));st.networkRoot=[origin[0],origin[1]+radius+14];
 }else{st.networkRoot=origin;street(s,[[origin[0]-75,origin[1]+55],origin,[origin[0]+55,origin[1]-38]],'lane',10);}
}
function primaryNetwork(s,r){const st=s.cityStudio,v=st.resolved,g=st.ground,o=st.origin,root=st.networkRoot,w=Math.max(4,10/v.metersPerUnit);
 if(v.count<=6){const y=o[1]+20;let x=o[0];while(x<940&&!waterAt(g,[x,y],-4))x+=2;if(x<940){link(s,root,[x-25,y],'lane',10);street(s,[[x-26,y],[x+62,y]],'pier',12,{cityDeck:true});}return;}
 const entries=[[270,195],[200,720],[450,840],[500,185]];st.entries=[];
 for(const p of entries){if(waterAt(g,p,10)||!inside(p,st.boundary))continue;const road=link(s,root,p,'avenue',w);if(road)st.entries.push(p);}
 if(g.landscape==='river')for(const y of(v.count>400?[330,700]:[525])){const c=g.river.find(p=>p[1]===y)||g.river.reduce((a,b)=>Math.abs(a[1]-y)<Math.abs(b[1]-y)?a:b),half=g.riverWidth/2+18,a=[c[0]-half,c[1]],b=[c[0]+half,c[1]];
 if(link(s,root,a,'avenue',w)){street(s,[a,b],'bridge',w+1,{cityDeck:true});link(s,b,[Math.min(845,b[0]+100),clamp(y+(y<500?-115:120),145,840)],'avenue',w);st.bridges.push([a,b]);}}
 if(g.landscape==='canals')for(const [c,i]of g.canals.map((c,i)=>[c,i])){const p=c[1],a=i===0?[p[0],p[1]-29]:[p[0]-29,p[1]],b=i===0?[p[0],p[1]+29]:[p[0]+29,p[1]];const near=nearestRoad(s,a);if(near&&link(s,near.point,a,'street',w*.75)){street(s,[a,b],'bridge',w*.75,{cityDeck:true});st.bridges.push([a,b]);link(s,b,i===0?[p[0]+45,820]:[620,330],'street',w*.75);}}
 if(['river','coast','fjord','canals'].includes(g.landscape)){
 const y=v.preset==='river-capital'?570:620,quay=[];
 for(let yy=y-105;yy<=y+105;yy+=15){let xx=410;while(xx<935&&!waterAt(g,[xx,yy],-1))xx+=2;quay.push([xx-16,yy]);}
 if(dryLine(g,quay,w/2+1)){const mid=quay[Math.floor(quay.length/2)],near=nearestRoad(s,mid);if(near&&link(s,near.point,mid,'quay',w)){
 const quayRoad=street(s,quay,'quay',w);for(const dy of[-60,0,60]){const yy=y+dy,a=quay.reduce((a,b)=>Math.abs(a[1]-yy)<Math.abs(b[1]-yy)?a:b);street(s,[a,[a[0]+16+Math.min(g.riverWidth*.32,45),a[1]]],'pier',Math.max(3,8/v.metersPerUnit),{cityDeck:true,cityStreet:quayRoad.id});}st.harbor=[mid[0]+16,mid[1]];}}
 }
 // Approaches continue beyond the settlement envelope. Walls later leave gate
 // openings at these actual intersections rather than four invented symbols.
 for(const end of st.entries){const dx=end[0]-o[0],dy=end[1]-o[1],len=Math.hypot(dx,dy);let t=1.1,p=end;
 while(t<3&&inside(p,st.boundary)){p=[o[0]+dx*t,o[1]+dy*t];t+=.08;}
 p=[clamp(p[0]+dx/len*20,32,968),clamp(p[1]+dy/len*20,32,968)];link(s,end,p,'approach',w);
 }

}
const QUARTER_NAMES={commons:'Lower lanes',oldtown:'Old quarter',noble:'Villa gardens',market:'Market ward',merchants:'Merchants’ courts',artisans:'Craft yards',docks:'Harbor quarter',military:'Citadel terrace',temple:'Temple gardens',university:'Upper courts',gardens:'Garden quarter',industrial:'Works quarter',slums:'Outer lanes',farming:'Garden holdings',cemetery:'Memorial gardens'};
function urbanMask(s,p){const st=s.cityStudio,v=st.resolved,rad=v.count<50?145:v.count<400?245:v.count<1000?300:335;
 if(distance(p,st.origin)<rad)return true;if(st.harbor&&distance(p,[st.harbor[0]-45,st.harbor[1]])<rad*.58)return true;
 return st.bridges.some(b=>distance(p,b[1])<rad*.58);
}
function makeNeighborhoods(s,r){const st=s.cityStudio,v=st.resolved,g=st.ground,hubCount=v.hubs;
 const candidates=[];for(const f of s.features.filter(f=>f.type==='road'&&!['pier','bridge'].includes(f.cityRole)))for(const p of pathSamples(f.points,65))if(inside(p,st.boundary)&&urbanMask(s,p)&&distance(p,st.origin)>35&&p[0]>130&&p[0]<870&&p[1]>135&&p[1]<860)candidates.push(p);
 const centers=[point(st.origin,st.networkRoot,1.35)];while(centers.length<hubCount&&candidates.length){let best=0,score=-1;for(let i=0;i<candidates.length;i++){const p=candidates[i],d=Math.min(...centers.map(c=>distance(c,p)))*(1+heightAt(g,p)/Math.max(1,g.relief)*.4);if(d>score){best=i;score=d;}}centers.push(candidates.splice(best,1)[0]);}
 const special=new Map();if(centers.length>1){const rank=centers.map((p,i)=>({i,z:heightAt(g,p),water:waterAt(g,[p[0]+60,p[1]],0)||waterAt(g,[p[0]-60,p[1]],0)}));special.set(rank.reduce((a,b)=>a.z>b.z?a:b).i,'noble');const dock=rank.filter(x=>x.water&&!special.has(x.i))[0];if(dock)special.set(dock.i,'docks');}
 st.planAngle=(r()-.5)*Math.PI/3;
 const sequence=['oldtown','commons','market','artisans','merchants','commons','gardens','temple','commons','military','university','commons','noble'];
 st.neighborhoods=centers.map((p,i)=>({id:'ward'+i,center:p,quarter:v.count<=6?'commons':special.get(i)||sequence[i%sequence.length],seed:hash(s.seed+'ward'+i),revision:0,target:0}));
 // Semantic neighborhood cells never generate streets or building lots.
 for(const d of st.neighborhoods){let poly=copy(st.boundary);for(const other of st.neighborhoods){if(other===d)continue;const n=[other.center[0]-d.center[0],other.center[1]-d.center[1]],c=(other.center[0]**2+other.center[1]**2-d.center[0]**2-d.center[1]**2)/2;poly=clipHalf(poly,n,c);}const near=nearestRoad(s,d.center);d.planAngle=v.fabric==='planned'?st.planAngle:near?Math.atan2(near.road.points[near.segment][1]-near.road.points[near.segment-1][1],near.road.points[near.segment][0]-near.road.points[near.segment-1][0]):0;const f=emit(s,'district',{polygon:poly,x:d.center[0],y:d.center[1],ward:QUARTER_NAMES[d.quarter],quarter:d.quarter,label:QUARTER_NAMES[d.quarter],cityWard:d.id});d.feature=f.id;}
}
function clipHalf(poly,n,c){const out=[];for(let i=0;i<poly.length;i++){const a=poly[i],b=poly[(i+1)%poly.length],da=a[0]*n[0]+a[1]*n[1]-c,db=b[0]*n[0]+b[1]*n[1]-c;if(da<=EPS)out.push(a);if((da<=EPS)!==(db<=EPS))out.push(point(a,b,da/(da-db)));}return out;}
function neighborhoodAt(s,p){return s.cityStudio.neighborhoods.reduce((a,b)=>distance(a.center,p)<distance(b.center,p)?a:b);}
/** Grow lanes from existing streets, stop at the first crossing, and close
 * selected loops. No independent neighborhood grids can crosshatch each other. */
function trimAtStreet(s,line,startRoad){const existing=s.features.filter(f=>f.type==='road'&&!['pier','access'].includes(f.cityRole)),out=[line[0]];let traveled=0;
 for(let i=1;i<line.length;i++){const a=line[i-1],b=line[i],len=distance(a,b);let first=null;
 for(const f of existing)for(let j=1;j<f.points.length;j++){const hit=intersection(a,b,f.points[j-1],f.points[j]);if(hit&&traveled+hit.t*len>4&&hit.t>.001&&(!first||hit.t<first.t))first=hit;}
 if(first){out.push(first.p);return out;}out.push(b);traveled+=len;
 }return out;
}
function minorNetwork(s,r){const st=s.cityStudio,v=st.resolved,g=st.ground;if(v.count<=6)return;
 const target=Math.ceil(v.count/(v.count>600?9:6)),width=Math.max(1.4,3.8/v.metersPerUnit);let placed=0;
 for(let attempt=0;attempt<target*45&&placed<target;attempt++){
  const p=[120+r()*755,130+r()*740];if(!inside(p,st.boundary)||!urbanMask(s,p)||waterAt(g,p,8)||st.reservations.some(z=>inside(p,z.polygon)))continue;
  const ward=neighborhoodAt(s,p),noble=ward.quarter==='noble',minSpace=(noble?42:26)/v.metersPerUnit,near=nearestRoad(s,p);
  if(!near||near.distance<minSpace||near.distance>Math.max(85,115/v.metersPerUnit))continue;
  // Coherent planned precincts align new targets, rather than imposing a citywide grid.
  const planned=v.fabric==='planned'||v.fabric==='mixed'&&noble;let end=p;if(planned){const dx=p[0]-near.point[0],dy=p[1]-near.point[1],a=ward.planAngle||0,cs=Math.cos(a),sn=Math.sin(a),u=dx*cs+dy*sn,z=-dx*sn+dy*cs;end=Math.abs(u)>Math.abs(z)?[near.point[0]+cs*u,near.point[1]+sn*u]:[near.point[0]-sn*z,near.point[1]+cs*z];}
  let line=route(s,near.point,end,width,planned);if(!line)continue;line=trimAtStreet(s,line,near.road.id);if(pathSamples(line,30).length<3||distance(line[0],line.at(-1))<minSpace*.7)continue;
  const f=street(s,line,noble?'street':'lane',width*(noble?1.25:1));placed++;
  if(r()<.78){const tail=line.at(-1),source=line[0],candidates=[];
   for(const other of s.features)if(other.type==='road'&&other!==f&&!['pier','bridge','access'].includes(other.cityRole))for(let i=1;i<other.points.length;i++){
    const q=segmentPoint(tail,other.points[i-1],other.points[i]).p,d=distance(q,tail);if(d>minSpace*.55&&d<minSpace*3.2&&distance(q,source)>minSpace*1.25)candidates.push({q,d});}
   candidates.sort((a,b)=>a.d-b.d);for(const c of candidates.slice(0,5)){let back=route(s,tail,c.q,width*.8,planned);if(!back)continue;back=trimAtStreet(s,back,f.id);if(distance(back[0],back.at(-1))<minSpace*.4)continue;street(s,back,'alley',width*.8);break;}
  }
 }
}
function networkIndex(s){const ix=new Index();for(const f of s.features){if(f.type==='road'&&!['roof-route','tunnel','access'].includes(f.cityRole))for(let i=1;i<f.points.length;i++)ix.add(corridor(f.points[i-1],f.points[i],f.width+1),{road:f});if(f.type==='wall')for(let i=1;i<f.points.length;i++)ix.add(corridor(f.points[i-1],f.points[i],f.width+1),{wall:f});}for(const res of s.cityStudio.reservations){const f=res.feature&&s.features.find(f=>f.id===res.feature);if(res.feature&&!f)continue;ix.add(f?.polygon||res.polygon,{reserve:true});}return ix;}
function builtIndex(s){const ix=new Index();for(const f of s.features)if(f.type==='road'&&f.cityRole==='access')for(let i=1;i<f.points.length;i++)ix.add(corridor(f.points[i-1],f.points[i],f.width),{access:f.cityBuilding});for(const f of s.features){if(f.polygon&&(f.type==='building'||['yard','court','ruin'].includes(f.cityRole)||f.locked&&f.type!=='district'))ix.add(f.polygon,{feature:f});else if(['asset','poi','decoration','image'].includes(f.type)&&!['vessel','tree'].includes(f.cityRole)){const rad=f.size||8;ix.add(circle([f.x,f.y],rad,12),{feature:f});}}return ix;}
function footprintGood(s,poly,roads,occupied){const st=s.cityStudio,g=st.ground;if(!poly.every(p=>inside(p,st.boundary))||!dryPolygon(g,poly,1.5)||!currentWaterClear(s,poly,1)||roads.hits(poly,.35)||occupied.hits(poly,.2))return false;const zs=poly.map(p=>heightAt(g,p));return Math.max(...zs)-Math.min(...zs)<(['hills','fjord'].includes(g.landscape)?10:6);}
const KINDS={commons:['house','house','house','tenement','shop'],oldtown:['townhouse','townhouse','house','shop','inn'],market:['shop','shop','townhouse','guildhall'],noble:['villa','villa','villa','palace','townhouse'],artisans:['workshop','house','workshop','smithy'],docks:['warehouse','warehouse','tavern','house'],merchants:['townhouse','shop','warehouse','inn'],military:['barracks','stable','house'],temple:['temple','house','shrine'],university:['college','townhouse','library'],gardens:['villa','house','greenhouse'],industrial:['workshop','warehouse','smithy'],slums:['shack','shack','house'],farming:['house','barn'],cemetery:['mausoleum','shrine']};
function dimensions(kind,v,r){let w=6+r()*5,d=8+r()*7;if(['warehouse','barracks','college','guildhall'].includes(kind)){w=12+r()*8;d=19+r()*12;}if(['villa','palace','temple'].includes(kind)){w=15+r()*11;d=15+r()*15;}if(kind==='shack'){w=4+r()*3;d=6+r()*3;}if(v.culture==='nordic'){w*=.90;d*=1.4;}return[w/v.metersPerUnit,d/v.metersPerUnit];}
/** Arc-length frontage packing: a curved street is one frontage, not a new
 * subdivision at every rendering vertex. Lot width and depth are in metres.
 * Reserved parcels include courtyards so later passes cannot fill the void. */
function alongLine(line,at){let used=0;for(let i=1;i<line.length;i++){const a=line[i-1],b=line[i],len=distance(a,b);if(used+len>=at||i===line.length-1){const t=clamp((at-used)/(len||1),0,1);return{p:point(a,b,t),angle:Math.atan2(b[1]-a[1],b[0]-a[0])};}used+=len;}return{p:line[0],angle:0};}
function lotForm(c,w,d,angle,side,form){
 const cs=Math.cos(angle),sn=Math.sin(angle),map=([x,y])=>[c[0]+x*cs-y*sn*side,c[1]+x*sn+y*cs*side];
 let shape=[[-w/2,-d/2],[w/2,-d/2],[w/2,d/2],[-w/2,d/2]],court=null,front=0;
 if(form==='court'){const wing=w*.25,back=d*.3;shape=[[-w/2,-d/2],[-w/2+wing,-d/2],[-w/2+wing,d/2-back],[w/2-wing,d/2-back],[w/2-wing,-d/2],[w/2,-d/2],[w/2,d/2],[-w/2,d/2]];court=[[-w/2+wing,-d/2],[w/2-wing,-d/2],[w/2-wing,d/2-back],[-w/2+wing,d/2-back]];front=2;}
 else if(form==='ell'){shape=[[-w/2,-d/2],[w*.12,-d/2],[w*.12,d*.08],[w/2,d*.08],[w/2,d/2],[-w/2,d/2]];court=[[w*.12,-d/2],[w/2,-d/2],[w/2,d*.08],[w*.12,d*.08]];}
 return{polygon:shape.map(map),court:court?.map(map),front};
}
function currentWaterClear(s,poly,margin=1){for(const f of s.features){if(f.type==='water'&&f.polygon&&overlaps(poly,f.polygon,margin))return false;if(f.type==='river'&&f.points&&pathSamples([...poly,poly[0]],3).some(p=>lineDistance(p,f.points)<f.width/2+margin))return false;}return true;}
function buildFrontages(s,only=null,requested=null){const st=s.cityStudio,v=st.resolved,r=rng(s.seed+'-frontages-'+(only?.id||'all')+'-'+(only?.revision||0)),roads=networkIndex(s),occupied=builtIndex(s),target=requested??v.count,initial=s.features.filter(f=>f.type==='building').length;
 let added=0,attempts=0;const stats={attempts:0,placed:0,rejected:0};
 let routes=s.features.filter(f=>f.type==='road'&&!['pier','bridge','access','roof-route','tunnel'].includes(f.cityRole));routes=routes.map(f=>({f,key:r()})).sort((a,b)=>a.key-b.key).map(x=>x.f);
 for(let pass=0;pass<3&&added<target;pass++)for(const road of routes){if(added>=target)break;const length=road.points.reduce((n,p,i)=>n+(i?distance(p,road.points[i-1]):0),0);
 for(const side of[-1,1]){let along=1+r()*2;while(along<length-2&&added<target){attempts++;
 const at=alongLine(road.points,along),ward=neighborhoodAt(s,at.p),q=ward.quarter;if(v.count>6&&!urbanMask(s,at.p)||only&&ward.id!==only.id){along+=8;continue;}
 const dense=['commons','oldtown','market','slums','merchants'].includes(q),kind=v.count<=6?'shack':choose(r,KINDS[q]||KINDS.commons),[w,d]=dimensions(kind,v,r),yard=['villa','palace'].includes(kind),setback=(yard?6+r()*8:dense?.55:2+r()*2)/v.metersPerUnit+pass*(d+4/v.metersPerUnit),front=road.width/2+setback;
 const {p:anchor,angle}=alongLine(road.points,along+w/2),ux=Math.cos(angle),uy=Math.sin(angle);along+=w+(dense?.25:2.5)/v.metersPerUnit;
 const c=[anchor[0]-uy*side*(front+d/2),anchor[1]+ux*side*(front+d/2)],lot=rect(c,w,d,angle);
 if(!footprintGood(s,lot,roads,occupied)){stats.rejected++;continue;}
 // Access belongs to this lot and reaches its actual front door. Courtyards
 // are traversable open ground, not a roof art illusion or a later infill lot.
 const form=yard||kind==='inn'||v.culture==='desert'&&w>9/v.metersPerUnit?'court':!['warehouse','barracks'].includes(kind)&&v.culture!=='nordic'&&r()<.24?'ell':'rect';
 const geometry=lotForm(c,w,d,angle,side,form),poly=geometry.polygon,edge=geometry.front,entrance=point(poly[edge],poly[(edge+1)%poly.length],.5),access=[anchor,entrance],accessPoly=corridor(...access,Math.max(.65,1.2/v.metersPerUnit));
 if(occupied.hits(accessPoly,.1)||!dryLine(st.ground,access,1)||!currentWaterClear(s,accessPoly,0)){stats.rejected++;continue;}
 const f=emit(s,'building',{polygon:poly,x:c[0],y:c[1],ward:ward.feature,quarter:q,buildingKind:kind,roof:hash(ward.id)%5,cityRole:'building',cityCulture:v.culture,cityForm:form,cityRoof:v.culture==='desert'?'flat':v.culture==='nordic'?'longhouse':choose(r,['gable','hip','gable','hip']),cityFloors:yard?2:dense?2+Math.floor(r()*3):1+Math.floor(r()*2),cityFront:edge,cityAge:v.history==='none'?'new':q==='oldtown'?'old':choose(r,['old','new','new']),elevationM:heightAt(st.ground,c),label:'',notes:''});
 occupied.add(lot,{feature:f});occupied.add(accessPoly,{access:f.id});emit(s,'road',{points:access,width:Math.max(.65,1.2/v.metersPerUnit),roadType:'trail',cityRole:'access',ward:ward.feature,cityBuilding:f.id,cityStreet:road.id});
 if(geometry.court)emit(s,'area',{polygon:geometry.court,material:'sand',ward:ward.feature,cityRole:'court',cityBuilding:f.id});
 if(yard){const garden=rect([c[0]-uy*side*(d*.55+4/v.metersPerUnit),c[1]+ux*side*(d*.55+4/v.metersPerUnit)],w+4/v.metersPerUnit,6/v.metersPerUnit,angle);if(footprintGood(s,garden,roads,occupied)){const yf=emit(s,'area',{polygon:garden,material:'grass',ward:ward.feature,cityRole:'yard',cityBuilding:f.id,cityGarden:true});occupied.add(garden,{feature:yf});}}
 if(['fjord','hills'].includes(st.ground.landscape)&&v.relief>80){const edge=[lot[2],lot[3]];emit(s,'wall',{points:edge,width:Math.max(.5,1/v.metersPerUnit),ward:ward.feature,cityRole:'retaining',cityBuilding:f.id});}
 added++;
 }} }
 stats.attempts=attempts;stats.placed=added;st.lastPlacement=stats;return{added,initial,stats};
}
function tinySettlement(s){const st=s.cityStudio,v=st.resolved,g=st.ground,r=rng(s.seed+'-huts'),ward=st.neighborhoods[0];let route=s.features.find(f=>f.type==='road'&&f.cityRole==='lane'),n=0,ix=networkIndex(s),occupied=builtIndex(s);
 // Deliberately finite four-hut plan at physical scale, with verified access.
 for(const [x,y]of [[355,420],[405,625],[535,390],[555,555],[290,545],[365,710]]){if(n>=v.count)break;const near=nearestRoad(s,[x,y]),angle=near?Math.atan2(near.point[1]-y,near.point[0]-x)+Math.PI/2:0,poly=rect([x,y],(6+r()*1.5)/v.metersPerUnit,(8+r()*2)/v.metersPerUnit,angle);if(!footprintGood(s,poly,ix,occupied)||!near)continue;
 // The near face is edge zero: the local negative-y normal points toward the road.
 const end=point(poly[0],poly[1],.5),access=[near.point,end],accessPoly=corridor(...access,7);if(occupied.hits(accessPoly,.1)||!dryLine(g,access,1)||!currentWaterClear(s,accessPoly,0))continue;
 const f=emit(s,'building',{polygon:poly,x,y,ward:ward.feature,quarter:'commons',buildingKind:'shack',cityRole:'building',cityCulture:v.culture,cityRoof:'gable',cityFloors:1,cityFront:0,roof:n%3,elevationM:heightAt(g,[x,y]),label:'',notes:''});occupied.add(poly,{feature:f});
 street(s,access,'access',7,{cityBuilding:f.id,cityStreet:near.road.id,ward:ward.feature});occupied.add(accessPoly,{access:f.id});n++;
 }
 if(n<v.count)buildFrontages(s,null,v.count-n);
}
/** Civic compounds reserve land before neighborhood lanes grow. The high-ground
 * bias is local to the old center, not the highest faraway point on an approach. */
function civicLandmark(s){const st=s.cityStudio,v=st.resolved;if(v.count<20)return;const roads=networkIndex(s),occupied=builtIndex(s);
 const kind=v.preset==='council'?'council-hall':v.preset==='river-capital'?'palace':v.walls==='citadel'?'keep':'hall';
 const candidates=s.features.filter(f=>f.type==='road'&&['avenue','street','promenade'].includes(f.cityRole)).flatMap(f=>pathSamples(f.points,22).map(p=>({p,f,z:heightAt(st.ground,p)-distance(p,st.origin)*.055}))).filter(x=>distance(x.p,st.origin)<190&&distance(x.p,st.origin)>45).sort((a,b)=>b.z-a.z);
 for(const {p,f}of candidates){const near=nearestRoad(s,p);if(!near)continue;for(const side of[-1,1]){const a=f.points[near.segment-1]||f.points[0],b=f.points[near.segment]||f.points.at(-1),ang=Math.atan2(b[1]-a[1],b[0]-a[0]),w=(kind==='palace'?78:kind==='council-hall'?38:31)/v.metersPerUnit,d=(kind==='palace'?58:kind==='council-hall'?22:25)/v.metersPerUnit,off=d/2+f.width/2+10/v.metersPerUnit,c=[p[0]-Math.sin(ang)*off*side,p[1]+Math.cos(ang)*off*side],lot=rect(c,w,d,ang);
 if(!footprintGood(s,lot,roads,occupied))continue;const ward=neighborhoodAt(s,c),form=kind==='palace'?'court':'rect',geo=lotForm(c,w,d,ang,side,form),poly=geo.polygon,building=emit(s,'building',{polygon:poly,x:c[0],y:c[1],buildingKind:kind,ward:ward.feature,quarter:ward.quarter,cityRole:'civic',cityForm:form,cityRoof:kind==='council-hall'?'longhouse':'hip',cityCulture:v.culture,cityFloors:kind==='keep'?5:3,cityFront:geo.front,roof:3,elevationM:heightAt(st.ground,c),label:kind==='council-hall'?'Council hall':kind==='palace'?'Imperial palace':kind==='keep'?'High keep':'Great hall',notes:''});
 const front=point(poly[geo.front],poly[(geo.front+1)%poly.length],.5);street(s,[p,front],'access',Math.max(1.5,4/v.metersPerUnit),{cityBuilding:building.id,cityStreet:f.id,ward:ward.feature});
 if(geo.court)emit(s,'area',{polygon:geo.court,material:'sand',ward:ward.feature,cityRole:'court',cityBuilding:building.id});
 st.reservations.push({polygon:lot,blockRoad:true,feature:building.id});st.civic=building.id;st.civicCenter=c;return;}}
}
function neighborhoodSquares(s){const st=s.cityStudio,v=st.resolved;if(v.count<100)return;const occupied=builtIndex(s),roads=networkIndex(s);
 for(const ward of st.neighborhoods.filter(d=>['noble','market','temple'].includes(d.quarter)).slice(0,3)){
 const near=nearestRoad(s,ward.center);if(!near)continue;const a=near.road.points[near.segment-1],b=near.road.points[near.segment],angle=Math.atan2(b[1]-a[1],b[0]-a[0]),radius=(ward.quarter==='noble'?15:11)/v.metersPerUnit;
 for(const side of[-1,1]){const off=radius+near.road.width/2+5/v.metersPerUnit,p=[near.point[0]-Math.sin(angle)*off*side,near.point[1]+Math.cos(angle)*off*side],poly=circle(p,radius,24);
 if(distance(p,st.origin)<70||!footprintGood(s,poly,roads,occupied))continue;const plaza=emit(s,'plaza',{polygon:poly,x:p[0],y:p[1],cityRole:'neighborhood-square',ward:ward.feature,label:''});
 const asset=ward.quarter==='noble'?'statue':'fountain',inner=3/v.metersPerUnit;emit(s,'poi',{x:p[0],y:p[1],asset,citySymbol:asset,size:inner,cityRole:'landmark',ward:ward.feature});
 st.reservations.push({polygon:circle(p,inner+1,16),blockRoad:true});st.reservations.push({polygon:poly,blockRoad:false});
 const ring=circleRoad(s,p,radius+3,Math.max(1.4,3/v.metersPerUnit),'promenade');if(ring){const q=nearestRoad(s,near.point,f=>f.id===ring.id);link(s,near.point,q.point,'street',Math.max(2,3/v.metersPerUnit));}occupied.add(poly,{feature:plaza});break;
 }}
}
function perimeterAndHistory(s){const st=s.cityStudio,v=st.resolved,r=rng(s.seed+'-history');if(v.count<=6)return;
 if(v.walls!=='none'){const centerWall=v.walls==='citadel'?st.civicCenter||st.origin:[465,510],radius=v.walls==='citadel'?90:357,poly=v.walls==='city'?st.boundary.map(p=>point(centerWall,p,.94)):circle(centerWall,radius,64);const roads=s.features.filter(f=>f.type==='road'&&!['access','pier'].includes(f.cityRole));let run=[];const flush=()=>{if(run.length>1)emit(s,'wall',{points:run,width:Math.max(1.5,3/v.metersPerUnit),cityRole:'fortification'});run=[];};
 for(const p of pathSamples([...poly,poly[0]],4)){const blocked=waterAt(st.ground,p,8)||roads.some(f=>lineDistance(p,f.points)<f.width/2+2.2);if(blocked)flush();else run.push(p);}flush();
 for(let i=0;i<poly.length;i+=5){const p=poly[i];if(!waterAt(st.ground,p,8)&&!roads.some(f=>lineDistance(p,f.points)<f.width/2+12))emit(s,'asset',{x:p[0],y:p[1],size:Math.max(3,6/v.metersPerUnit),asset:'roof-tower',citySymbol:'wall-tower',cityRole:'fortification'});}}
 if(['layered','ancient'].includes(v.history)){const o=st.origin,angle=r()*TAU,old=circle(o,145,40).slice(0,15),roads=s.features.filter(f=>f.type==='road');for(let i=1;i<old.length;i++)if(dryLine(st.ground,[old[i-1],old[i]],3)&&!roads.some(f=>lineDistance(old[i],f.points)<f.width/2+7))emit(s,'wall',{points:[old[i-1],old[i]],width:Math.max(1,2/v.metersPerUnit),cityRole:'old-wall'});
 const reserve=networkIndex(s),occupied=builtIndex(s);for(let i=0;i<(v.history==='ancient'?10:4);i++){const p=[160+r()*530,170+r()*650],poly=rect(p,20+r()*16,14+r()*10,r()*TAU);if(!footprintGood(s,poly,reserve,occupied))continue;const ward=neighborhoodAt(s,p),f=emit(s,'area',{polygon:poly,material:'hill',cityRole:'ruin',ward:ward.feature});occupied.add(poly,{feature:f});}}
}
function placeBoats(s){const st=s.cityStudio,v=st.resolved,g=st.ground,r=rng(s.seed+'-boats'),needed=v.boats;if(!needed)return;
 if(!['river','coast','fjord','canals','oasis'].includes(g.landscape)){st.warnings.push('No navigable water: the requested boats were not placed.');return;}
 const occupied=new Index();for(const f of s.features.filter(f=>f.type==='road'&&['bridge','pier'].includes(f.cityRole)))for(let i=1;i<f.points.length;i++)occupied.add(corridor(f.points[i-1],f.points[i],f.width+2));
 const variant=v.fleet==='armada'?'warship':v.fleet==='longships'?'longship':v.fleet==='trade'?'merchant':'skiff',length=(variant==='warship'?40:variant==='longship'?23:variant==='merchant'?24:4.8)/v.metersPerUnit,width=length*(variant==='longship'?.19:variant==='skiff'?.30:.26);let count=0;
 for(let attempt=0;attempt<1800&&count<needed;attempt++){let p,angle;
 if(v.count<=6){const y=425+(attempt%3)*80+Math.floor(attempt/3)*8;let x=560;while(x<950&&!waterAt(g,[x,y],-20))x+=2;p=[x+22,y];angle=Math.PI/2+(r()-.5)*.15;}
 else if(g.landscape==='river'){const y=160+r()*685,river=g.river.reduce((a,b)=>Math.abs(a[1]-y)<Math.abs(b[1]-y)?a:b);p=[river[0]+(r()-.5)*(g.riverWidth-width-8),y];angle=Math.PI/2+(r()-.5)*.25;}
 else{p=[720+r()*200,160+r()*690];angle=Math.PI/2+(r()-.5)*.5;}
 const poly=rect(p,length,width,angle);if(!pathSamples([...poly,poly[0]],4).every(q=>waterAt(g,q,-2))||occupied.hits(poly,2)||p.some(q=>q<40||q>960))continue;
 emit(s,'asset',{x:p[0],y:p[1],asset:'boat',size:length/2,rotation:angle*180/Math.PI,citySymbol:'ship',cityShip:variant,cityBeam:width/length,cityRole:'vessel',label:''});occupied.add(poly);count++;}
 st.boats=count;if(count<needed)st.warnings.push('Only '+count+' of '+needed+' requested boats fit safely in navigable water.');
}
function decorate(s){const st=s.cityStudio,v=st.resolved,r=rng(s.seed+'-detail'),roads=networkIndex(s),occupied=builtIndex(s),rich=v.detail==='rich'?1.6:v.detail==='quiet'?.45:1;
 const attempts=Math.round((v.count<=6?55:350)*rich);let placed=0;for(let i=0;i<attempts;i++){const p=[65+r()*860,80+r()*820],ward=neighborhoodAt(s,p),forest=v.landscape==='forest',edge=!inside(p,st.boundary)||distance(p,ward.center)>115;if(!edge&&!['noble','gardens'].includes(ward.quarter))continue;
 const size=(v.count<=6?12:forest?6:3.5)*(1+r()*.65),poly=circle(p,size,8);if(waterAt(st.ground,p,size+4)||roads.hits(poly,1)||occupied.hits(poly,1)||st.reservations.some(z=>overlaps(poly,z.polygon)))continue;
 emit(s,'decoration',{x:p[0],y:p[1],asset:v.culture==='desert'?'palm':v.culture==='nordic'?'pine':'oak',size,cityRole:'tree',citySymbol:v.culture==='desert'?'palm':v.culture==='nordic'?'pine':'tree',rotation:r()*360});occupied.add(poly);placed++;}st.detailCount=placed;

}
/** Planar graph built from actual visible road intersections, not proximity.
 * Access paths participate; bridges are explicit edges. Used by QA and overlays. */
function buildGraph(s){const roads=s.features.filter(f=>f.type==='road'&&!['roof-route','tunnel'].includes(f.cityRole)),segs=[],index=new Index(50);
 for(const f of roads)for(let i=1;i<f.points.length;i++){const a=f.points[i-1],b=f.points[i];if(distance(a,b)>.01){const seg={a,b,road:f.id,role:f.cityRole,cut:[0,1]};const poly=corridor(a,b,.05);for(const prev of index.query(poly).map(x=>x.value)){const hit=intersection(a,b,prev.a,prev.b);if(hit){seg.cut.push(clamp(hit.t,0,1));prev.cut.push(clamp(hit.u,0,1));}}
 segs.push(seg);index.add(poly,seg);}}
 const nodes=[],keys=new Map(),edges=[],node=p=>{const key=p.map(x=>Math.round(x*100)).join(',');if(keys.has(key))return keys.get(key);const i=nodes.length;keys.set(key,i);nodes.push({x:p[0],y:p[1]});return i;};
 for(const seg of segs){const ts=[...new Set(seg.cut.map(t=>Math.round(t*1e8)/1e8))].sort((a,b)=>a-b);for(let i=1;i<ts.length;i++){const a=node(point(seg.a,seg.b,ts[i-1])),b=node(point(seg.a,seg.b,ts[i]));if(a!==b)edges.push({a,b,road:seg.road,role:seg.role});}}
 const adj=nodes.map(()=>[]);edges.forEach(e=>{adj[e.a].push(e.b);adj[e.b].push(e.a);});const visited=new Uint8Array(nodes.length),components=[];for(let i=0;i<nodes.length;i++){if(visited[i])continue;const q=[i];visited[i]=1;for(let j=0;j<q.length;j++)for(const k of adj[q[j]])if(!visited[k]){visited[k]=1;q.push(k);}components.push(q);}return{nodes,edges,components};
}
function addLayers(s){const st=s.cityStudio,v=st.resolved;s.features=s.features.filter(f=>!['roof-route','tunnel'].includes(f.cityRole)||f.locked);
 if(v.rooftops){const buildings=s.features.filter(f=>f.type==='building'&&f.cityFloors>=2),ix=new Index(),maxGap=5/v.metersPerUnit;
 for(const f of buildings){let best=null,d=Infinity;
 for(const item of ix.query(f.polygon,maxGap)){const b=item.value;if(Math.abs((b.cityFloors||2)-(f.cityFloors||2))>1)continue;
 for(let i=0;i<f.polygon.length;i++)for(let j=0;j<b.polygon.length;j++){const a=f.polygon[i],c=b.polygon[j],e=segmentPoint(a,c,b.polygon[(j+1)%b.polygon.length]).p,z=segmentPoint(c,a,f.polygon[(i+1)%f.polygon.length]).p;
 for(const [u,w]of [[a,e],[z,c]]){const gap=distance(u,w);if(gap>=.2&&gap<maxGap&&gap<d&&dryLine(st.ground,[u,w],0)){best={b,points:[u,w]};d=gap;}}}}
 if(best)street(s,best.points,'roof-route',.7,{cityLinks:[f.id,best.b.id],cityGapM:d*v.metersPerUnit});ix.add(f.polygon,f);}}

 if(v.underground){for(const f of s.features.slice())if(f.type==='road'&&['avenue','promenade'].includes(f.cityRole)&&dryLine(st.ground,f.points,3))street(s,copy(f.points),'tunnel',Math.max(1.3,f.width*.35),{cityStreet:f.id});}
}
function summarize(s){const st=s.cityStudio;st.statistics={buildings:s.features.filter(f=>f.type==='building').length,boats:s.features.filter(f=>f.cityRole==='vessel').length,neighborhoods:st.neighborhoods.length,streets:s.features.filter(f=>f.type==='road'&&!['access','roof-route','tunnel','pier'].includes(f.cityRole)).length,bridges:s.features.filter(f=>f.cityRole==='bridge').length};for(const d of st.neighborhoods)d.target=s.features.filter(f=>f.type==='building'&&f.ward===d.feature).length;s.city.warnings=st.warnings.slice();s.city.statistics=copy(st.statistics);}
function generate(seed,raw={}){seed=String(seed??'city').slice(0,120);const o=normalize(raw),v=resolve(o),p=PRESETS.find(p=>p.id===o.preset),g=makeGround(seed,v),boundary=makeEnvelope(seed,v);
 const s={format:'megamap',version:1,engineVersion:'1.2.0',mode:'city',seed,options:o,title:p.name,width:1000,height:1000,units:'km',scale:v.km,features:[],terrain:null,notes:'',metadata:{coordinateSystem:'local map units; not georeferenced',generator:'city-studio',generatorVersion:VERSION},appearance:{hq:o.hq,palette:v.culture==='desert'?'desert':v.culture==='nordic'?'frost':'atlas',cityLevel:'surface'},city:{boundary,warnings:[]},cityStudio:{version:VERSION,nextId:0,resolved:v,ground:g,boundary,reservations:[],bridges:[],neighborhoods:[],warnings:[],revision:0}};
 const r=rng(seed+'-plan');addWater(s,g);placeOrigin(s,r);primaryNetwork(s,r);makeNeighborhoods(s,r);civicLandmark(s);neighborhoodSquares(s);minorNetwork(s,r);perimeterAndHistory(s);
 if(v.count<=6)tinySettlement(s);else{buildFrontages(s,null,Math.max(0,v.count-s.features.filter(f=>f.type==='building').length));}
 placeBoats(s);decorate(s);addLayers(s);summarize(s);
 if(s.cityStudio.statistics.buildings<(o.structureCount?v.count:v.count*.5))s.cityStudio.warnings.push('Placed '+s.cityStudio.statistics.buildings+' of '+v.count+' requested structures; unsuitable or inaccessible plots were left open.');
 s.city.warnings=s.cityStudio.warnings.slice();return s;
}
function regenerateDistrict(s,id,quarter){if(!s.cityStudio)throw Error('Not a City Studio map.');const d=s.features.find(f=>f.id===id&&f.type==='district'),ward=s.cityStudio.neighborhoods.find(w=>w.feature===id);if(!d||!ward)throw Error('Select a City Studio neighborhood.');if(d.locked)throw Error('Unlock the neighborhood first.');if(!Object.hasOwn(KINDS,quarter))throw Error('Unknown neighborhood program.');
 const before=s.features.filter(f=>f.type==='building'&&f.ward===id).length,protectedIds=new Set(s.features.filter(f=>f.locked||f.cityRole==='civic').map(f=>f.id));
 s.features=s.features.filter(f=>f.ward!==id||f.locked||f.type==='district'||f.cityRole==='civic'||f.cityRole==='neighborhood-square'||f.cityRole==='landmark'||f.cityBuilding&&protectedIds.has(f.cityBuilding));ward.quarter=quarter;ward.revision++;d.quarter=quarter;d.label=QUARTER_NAMES[quarter];d.ward=d.label;
 const retained=s.features.filter(f=>f.type==='building'&&f.ward===id).length,result=buildFrontages(s,ward,Math.max(0,before-retained));s.cityStudio.revision++;addLayers(s);summarize(s);if(result.added+retained<before)s.cityStudio.warnings.push('Neighborhood regeneration kept protected objects and left constrained plots open.');s.city.warnings=s.cityStudio.warnings.slice();return d;
}
function validate(s){const st=s.cityStudio;if(!st)return true;
 if(s.mode!=='city'||st.version!==VERSION||s.width!==1000||s.height!==1000)throw Error('Unsupported City Studio document.');
 if(!Number.isInteger(st.nextId)||st.nextId<0||st.nextId>1e7)throw Error('Invalid City Studio identifier counter.');
 const pair=p=>Array.isArray(p)&&p.length===2&&p.every(v=>Number.isFinite(v)&&Math.abs(v)<20000);
 const points=(p,min=2,max=1000)=>Array.isArray(p)&&p.length>=min&&p.length<=max&&p.every(pair);
 const g=st.ground;
 if(!g||g.n!==64||!Array.isArray(g.heights)||g.heights.length!==4096||g.heights.some(x=>!Number.isFinite(x)||x<0||x>1)||!Number.isFinite(g.relief)||g.relief<0||g.relief>300||!ENUMS.landscape.slice(1).includes(g.landscape))throw Error('Invalid City Studio ground.');
 if(!Number.isFinite(g.riverWidth)||g.riverWidth<4||g.riverWidth>200||!points(g.river)||!points(g.shore,101,101)||!points(g.lake,3)||!Array.isArray(g.canals)||g.canals.length>12||g.canals.some(p=>!points(p)))throw Error('Invalid City Studio water geometry.');
 if(g.shore.some((p,i)=>Math.abs(p[1]-i*10)>.001))throw Error('Invalid City Studio shoreline samples.');
 if(!points(st.boundary,3,400)||!pair(st.origin)||!pair(st.networkRoot)||!Array.isArray(st.bridges)||st.bridges.length>12||st.bridges.some(p=>!points(p,2,2)))throw Error('Invalid City Studio boundary.');
 if(!Array.isArray(st.neighborhoods)||st.neighborhoods.length<1||st.neighborhoods.length>18||!Array.isArray(st.reservations)||st.reservations.length>100||!Array.isArray(st.warnings)||st.warnings.length>500||st.warnings.some(w=>typeof w!=='string'||w.length>2000))throw Error('Invalid City Studio plan.');
 for(const z of st.reservations)if(!z||!points(z.polygon,3)||typeof z.blockRoad!=='boolean')throw Error('Invalid City Studio reservation.');
 const names=new Set();for(const d of st.neighborhoods){if(!d||!pair(d.center)||typeof d.id!=='string'||names.has(d.id)||typeof d.feature!=='string'||!Object.hasOwn(KINDS,d.quarter)||!Number.isInteger(d.revision)||d.revision<0||d.revision>1e7||!Number.isFinite(d.planAngle))throw Error('Invalid City Studio neighborhood.');names.add(d.id);}
 for(const f of s.features){if(!f||typeof f!=='object')throw Error('Invalid City Studio object.');
 if(/^cs[0-9]+$/.test(f.id)&&Number(f.id.slice(2))>=st.nextId)throw Error('Invalid City Studio identifier counter.');
 for(const k of ['cityRole','citySymbol','cityRoof','cityCulture','cityForm','cityAge','cityShip','cityBuilding','cityStreet'])if(f[k]!=null&&(typeof f[k]!=='string'||f[k].length>160))throw Error('Invalid City Studio object metadata.');
 for(const k of ['cityFloors','cityFront','cityBeam','cityGapM'])if(f[k]!=null&&(!Number.isFinite(f[k])||Math.abs(f[k])>20000))throw Error('Invalid City Studio object dimensions.');
 if(f.cityLinks!=null&&(!Array.isArray(f.cityLinks)||f.cityLinks.length!==2||f.cityLinks.some(id=>typeof id!=='string'||id.length>160)))throw Error('Invalid City Studio route links.');
 }
 st.resolved=resolve(s.options);return true;
}

return{VERSION,PRESETS,DEFAULTS,ENUMS,SIZE_PROFILES,QUARTER_NAMES,KINDS,normalize,resolve,generate,regenerateDistrict,validate,buildGraph,alongLine,lotForm,currentWaterClear,bankDistance,heightAt,waterAt,dryLine,dryPolygon,bounds,center,area,inside,overlaps,rect,circle,corridor,distance,lineDistance,pathSamples,neighborhoodAt,Index,hash,rng};
});
