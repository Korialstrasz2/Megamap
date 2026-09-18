from pathlib import Path
p=Path('src/city-smart.js');s=p.read_text()
a=" const seeds=[],used=new Set(),spacing="
i=s.index(a)
insert=''' // Keep a usable civic footprint before routing streets through the
 // neighborhood. Center-only seeds used to strand roomy painted districts.
 const blocked=new Uint8Array(N*N),claims=new Uint8Array(N*N);
 for(const stroke of [...plan.roads,...plan.walls])for(let k=1;k<stroke.points.length;k++){
  const a=stroke.points[k-1],b=stroke.points[k],r=stroke.width/2+3;
  for(let y=Math.max(0,Math.floor((Math.min(a[1],b[1])-r)/step));y<=Math.min(N-1,Math.floor((Math.max(a[1],b[1])+r)/step));y++)
   for(let x=Math.max(0,Math.floor((Math.min(a[0],b[0])-r)/step));x<=Math.min(N-1,Math.floor((Math.max(a[0],b[0])+r)/step));x++)if(distanceToLine(point(y*N+x),[a,b])<r)blocked[y*N+x]=1;
 }
 const siteFor=(c,q)=>{const spec=C.Complexes.SPECS.find(a=>a.quarters[0]===q&&v.count>=a.min&&(a.kind!=='fortress'||s.options.walls!=='none'));
  if(!spec)return null;
  for(const factor of [1,.8,.62])for(const angle of [0,Math.PI/2]){const W=spec.size[0]*factor/s.scale,D=spec.size[1]*factor/s.scale,poly=C.rect(c.p,W,D,angle),w=(angle?D:W)/2+step,h=(angle?W:D)/2+step;
   if(c.p[0]-w<10||c.p[0]+w>990||c.p[1]-h<10||c.p[1]+h>990)continue;
   const zs=poly.map(p=>C.heightAt(st.ground,p));if(Math.max(...zs)-Math.min(...zs)>10)continue;
   let ok=true;const reserve=[];
   for(let y=Math.floor((c.p[1]-h)/step);y<=Math.floor((c.p[1]+h)/step)&&ok;y++)for(let x=Math.floor((c.p[0]-w)/step);x<=Math.floor((c.p[0]+w)/step);x++){const i=y*N+x;if(!mask[i]||blocked[i]||claims[i]){ok=false;break;}reserve.push(i);}
   if(ok)return{kind:spec.kind,factor,polygon:poly,angle,cells:reserve};
  }return null;
 };
'''
s=s[:i]+insert+s[i:]
s=s.replace("if(used.has(c.i)||component!=null", "if(used.has(c.i)||claims[c.i]||component!=null")
s=s.replace("if(value<score){score=value;choice=c;}", "const needsSite=C.Complexes.SPECS.some(a=>a.quarters[0]===q&&v.count>=a.min&&(a.kind!=='fortress'||s.options.walls!=='none')),site=needsSite?siteFor(c,q):null;\n   if(needsSite)value+=site?(1-site.factor)*80:1800;\n   if(value<score){score=value;choice={...c,site};}")
s=s.replace("seeds.push({...choice,q});used.add(choice.i);return true;", "seeds.push({...choice,q});used.add(choice.i);if(choice.site)choice.site.cells.forEach(i=>claims[i]=1);return true;")
s=s.replace("seeds.forEach((n,k)=>{cost[n.i]=0;owner[n.i]=k;heap.push(0,n.i,k);});", "seeds.forEach((n,k)=>{for(const i of n.site?.cells||[n.i]){cost[i]=0;owner[i]=k;heap.push(0,i,k);}});")
s=s.replace("cells:[],smart:true,anchor:n.p}", "cells:[],smart:true,anchor:n.p,site:n.site?{kind:n.site.kind,factor:n.site.factor,polygon:n.site.polygon,angle:n.site.angle}:null}")
p.write_text(s)
