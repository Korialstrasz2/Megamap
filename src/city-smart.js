/* Smart city zoning. GPL-3.0-only. Offline, deterministic, bounded allocation.
 * Explicit district paint is never reassigned. Flood growth stays inside the
 * actual dry brush mask; holes, islands and the saved stroke program survive.
 */
(function(root,factory){const api=factory();if(typeof module==='object'&&module.exports)module.exports=api;else root.MegamapCitySmart=api;})(typeof globalThis!=='undefined'?globalThis:this,function(){
'use strict';
const PROGRAMS={
 fishing:['commons','docks','market','artisans'],
 'river-capital':['docks','military','temple','market','noble','slums','artisans','merchants','oldtown','commons','gardens','university'],
 council:['docks','military','market','artisans','commons','temple','oldtown','gardens'],
 market:['market','docks','merchants','artisans','commons','oldtown','gardens'],
 citadel:['military','market','artisans','noble','temple','commons','oldtown','gardens'],
 canal:['docks','market','merchants','artisans','commons','oldtown','temple','noble','gardens'],
 grove:['temple','gardens','commons','market','artisans','farming'],
 oasis:['market','merchants','gardens','temple','commons','artisans','oldtown'],
 crater:['university','temple','market','artisans','commons','oldtown','noble','gardens'],
 colossus:['oldtown','gardens','market','artisans','commons','temple','merchants']
};
function program(v){if(v.count<=6)return ['commons'];const all=PROGRAMS[v.preset]||PROGRAMS.market;if(v.count<60)return [...new Set(['commons',...all.slice(0,2)])];return all.slice();}
class Heap{constructor(){this.a=[];}push(cost,id,owner){const a=this.a,node={cost,id,owner};let i=a.length;a.push(node);while(i){const p=(i-1)>>1;if(a[p].cost<=cost)break;a[i]=a[p];i=p;}a[i]=node;}pop(){const a=this.a,top=a[0],last=a.pop();if(a.length){let i=0;while(i*2+1<a.length){let j=i*2+1;if(j+1<a.length&&a[j+1].cost<a[j].cost)j++;if(a[j].cost>=last.cost)break;a[i]=a[j];i=j;}a[i]=last;}return top;}}
function resolve(s,plan,components,C,P){
 const st=s.cityStudio,v=st.resolved,N=P.N,step=P.STEP,smart=components.filter(c=>c.code===P.CODES.smart),explicit=components.filter(c=>c.code!==P.CODES.smart);
 if(!smart.length)return components;
 const required=program(v),covered=new Set(explicit.map(c=>P.DISTRICTS[c.code-1].id)),point=i=>[(i%N+.5)*step,(Math.floor(i/N)+.5)*step];
 const cells=smart.flatMap(c=>c.cells),mask=new Uint8Array(N*N),componentId=new Int16Array(N*N).fill(-1);
 smart.forEach((c,k)=>c.cells.forEach(i=>{mask[i]=1;componentId[i]=k;}));
 const mean=cells.reduce((p,i)=>{const q=point(i);return[p[0]+q[0]/cells.length,p[1]+q[1]/cells.length];},[0,0]);
 const neighbors=i=>{const x=i%N,y=Math.floor(i/N);return[x?i-1:-1,x<N-1?i+1:-1,y?i-N:-1,y<N-1?i+N:-1].filter(j=>j>=0);};
 // Distance to the brush edge measures whether a landmark or a housing block
 // has usable depth, not just a dry center point.
 const clearance=new Uint16Array(N*N),queue=[];
 for(const i of cells)if(i%N===0||i%N===N-1||i<N||i>=N*(N-1)||neighbors(i).some(j=>!mask[j])){clearance[i]=1;queue.push(i);}
 for(let k=0;k<queue.length;k++){const i=queue[k];for(const j of neighbors(i))if(mask[j]&&!clearance[j]){clearance[j]=clearance[i]+1;queue.push(j);}}
 const candidates=[];
 for(let k=0;k<smart.length;k++){const a=smart[k].cells,stride=Math.max(1,Math.floor(a.length/180));for(let t=0;t<a.length;t+=stride){const i=a[t],p=point(i);if(clearance[i]<3||C.waterAt(st.ground,p,Math.max(4,5/s.scale)))continue;
  const bank=P.bankDistance(st.ground,p),height=C.heightAt(st.ground,p)/Math.max(1,v.relief),road=plan.roads.length?Math.min(...plan.roads.map(r=>distanceToLine(p,r.points))):0;
  candidates.push({i,p,bank:Number.isFinite(bank)?bank:1e5,height,road,core:C.distance(p,mean),clearance:clearance[i]*step,component:k});}
 }
 const missing=required.filter(q=>!covered.has(q)),minCells=Math.max(10,Math.ceil(180/(s.scale*step)**2));
 const capacity=Math.max(smart.length,Math.floor(cells.length/minCells)),limit=Math.min(48-explicit.length,capacity,Math.max(missing.length,v.hubs,smart.length));
 const seeds=[],used=new Set(),spacing=Math.max(16,Math.min(130,Math.sqrt(cells.length*step*step/Math.max(1,limit))*.48));
 const select=(q,component=null)=>{let choice=null,score=Infinity;for(const c of candidates){if(used.has(c.i)||component!=null&&c.component!==component)continue;
   if(q==='docks'&&(c.bank>125||c.clearance<Math.max(step*4,12/s.scale)))continue;
   const separation=seeds.length?Math.min(...seeds.map(n=>C.distance(c.p,n.p))):1000;
   if(separation<Math.min(14,spacing*.25))continue;
   let value=q==='docks'?c.bank*5:q==='military'?130*(1-c.height)+c.core*.15:q==='noble'?150*(1-c.height)+Math.abs(c.core-160)*.35:q==='market'?c.core*.8+c.road*.8:q==='temple'||q==='university'?c.core*.4+100*(1-c.height):q==='slums'||q==='artisans'||q==='merchants'?Math.abs(c.core-190)*.35+Math.min(c.bank,300)*.2:q==='gardens'?Math.abs(c.core-180)*.5:c.core*.25;
   value+=Math.max(0,1500-smart[c.component].cells.length)*.3+Math.max(0,spacing-separation)*8+Math.max(0,24/s.scale-c.clearance)*3+c.road*.12;
   if(q==='merchants'){const dock=seeds.find(n=>n.q==='docks');if(dock)value+=C.distance(c.p,dock.p)*.25;}
   value+=(C.hash(s.seed+':'+q+':'+c.i)%100)/100;
   if(value<score){score=value;choice=c;}
  }if(!choice)return false;seeds.push({...choice,q});used.add(choice.i);return true;};
 for(const q of missing){if(seeds.length>=limit)break;select(q);}
 // Every disconnected dry island gets a seed; never silently drop a painted
 // component just to satisfy the main settlement's quarter quota.
 for(let k=0;k<smart.length;k++)if(!seeds.some(n=>n.component===k)&&seeds.length<48-explicit.length){if(!select('commons',k)){const i=smart[k].cells[0];seeds.push({i,p:point(i),q:'commons',component:k});}}
 for(let tries=0;seeds.length<limit&&tries<limit;tries++)if(!select(tries%3===0?'oldtown':'commons'))break;
 if(!seeds.length){st.warnings.push('Smart planning needs a wider painted area. Enlarge the building brush.');return explicit;}
 const owner=new Int16Array(N*N).fill(-1),cost=new Float64Array(N*N).fill(Infinity),heap=new Heap();
 seeds.forEach((n,k)=>{cost[n.i]=0;owner[n.i]=k;heap.push(0,n.i,k);});
 while(heap.a.length){const item=heap.pop();if(item.cost!==cost[item.id]||item.owner!==owner[item.id])continue;
  for(const j of neighbors(item.id)){if(!mask[j])continue;const q=seeds[item.owner].q,weight=q==='gardens'?1.55:q==='commons'||q==='slums'?.9:1;
   const next=item.cost+weight*(1+.12/(clearance[j]||1));if(next<cost[j]){cost[j]=next;owner[j]=item.owner;heap.push(next,j,item.owner);}}
 }
 const groups=seeds.map(n=>({code:P.CODES[n.q],cells:[],smart:true,anchor:n.p}));
 for(const i of cells)if(owner[i]>=0){const g=groups[owner[i]];g.cells.push(i);plan.zones[i]=g.code;}
 st.smartCity={version:1,required,assigned:[],fulfilled:[],missing:[],unbuilt:[]};
 return [...explicit,...groups.filter(g=>g.cells.length>=3)];
}
function distanceToLine(p,ps){let d=Infinity;for(let i=1;i<ps.length;i++){const a=ps[i-1],b=ps[i],dx=b[0]-a[0],dy=b[1]-a[1],t=Math.max(0,Math.min(1,((p[0]-a[0])*dx+(p[1]-a[1])*dy)/(dx*dx+dy*dy||1)));d=Math.min(d,Math.hypot(p[0]-a[0]-dx*t,p[1]-a[1]-dy*t));}return d;}
function finish(s){const st=s.cityStudio,r=st.smartCity;if(!r)return;r.assigned=[...new Set(st.neighborhoods.map(w=>w.quarter))];r.fulfilled=r.required.filter(q=>st.neighborhoods.some(w=>w.quarter===q&&s.features.some(f=>f.ward===w.feature&&(f.type==='building'||q==='gardens'&&['area','plaza'].includes(f.type)))));r.missing=r.required.filter(q=>!r.assigned.includes(q));r.unbuilt=r.required.filter(q=>r.assigned.includes(q)&&!r.fulfilled.includes(q));
 for(const q of r.missing)st.warnings.push('Smart quarter unavailable: '+q+'. Add suitable painted land'+(q==='docks'?' beside water':'')+'.');
 for(const q of r.unbuilt)st.warnings.push('Smart quarter has no usable buildings: '+q+'. Enlarge its area or improve road access.');
}
function validate(s){const r=s.cityStudio.smartCity;if(r==null)return;const known=new Set([...Object.values(PROGRAMS).flat(),'cemetery','industrial','slums','university','farming']);if(r.version!==1)throw Error('Invalid smart city report.');for(const k of ['required','assigned','fulfilled','missing','unbuilt'])if(!Array.isArray(r[k])||r[k].length>18||r[k].some(q=>!known.has(q)))throw Error('Invalid smart city report.');}
function example(){return{version:1,strokes:[{role:'smart',width:285,points:[[250,210],[625,210],[660,460],[625,730],[250,730],[235,460],[650,460]]},{role:'river',width:55,points:[[785,0],[730,340],[810,640],[770,1000]]},{role:'road',width:12,points:[[70,470],[915,470]]},{role:'road',width:10,points:[[430,60],[430,920]]}]};}
return{PROGRAMS,program,resolve,finish,validate,example};
});
