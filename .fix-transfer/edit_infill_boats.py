from pathlib import Path
p=Path('src/city-studio.js');s=p.read_text()
s=s.replace("function buildFrontages(s,only=null,requested=null){", "function buildFrontages(s,only=null,requested=null,infillPass=0){")
s=s.replace("(only?.revision||0)),roads=", "(only?.revision||0)+(infillPass?'-infill-'+infillPass:'')),roads=")
s=s.replace("road.width/2+9/v.metersPerUnit", "road.width/2+(infillPass?6:9)/v.metersPerUnit")
s=s.replace("dim=dimensions(kind,v,r),w=dim[0]*context.width,d=dim[1]*context.depth", "dim=dimensions(kind,v,r),compact=infillPass&&['house','townhouse','shack','shop','workshop'].includes(kind)?(infillPass===1?.88:.76):1,w=Math.max((kind==='shack'?3.5:4.5)/v.metersPerUnit,dim[0]*context.width*compact),d=Math.max(5/v.metersPerUnit,dim[1]*context.depth*compact)")
s=s.replace("wards[i].paintTarget=target;const result=buildFrontages(s,wards[i],target);remaining-=result.added;}\n }else", """wards[i].paintTarget=target;const result=buildFrontages(s,wards[i],target);remaining-=result.added;}
  // Redistribute unspent quotas and fit smaller *new* homes into remaining
  // frontages. Reusing the same random stream retried identical rejected lots.
  for(let pass=1;pass<=2&&remaining>0;pass++)for(const w of wards){if(!remaining)break;remaining-=buildFrontages(s,w,remaining,pass).added;}
 }else""")
needle=" const variant=v.fleet==='armada'?'warship':"
a=s.index(needle);b=s.index(" for(let attempt=0;attempt<1800",a)
s=s[:b]+''' // Aim along the user's actual river, rather than spending almost every
 // attempt on dry ground with a random ship angle. Erased strokes remain safe:
 // the authoritative wet mask and hull clearance still decide acceptance.
 const paintedPoses=[];let wet=[];
 if(g.paintWater){wet=g.paintWater.cells.map((x,i)=>x?i:-1).filter(i=>i>=0);
  for(const stroke of s.options.cityPlan.strokes.filter(x=>x.role==='river'&&x.points.length>1)){
   const ps=pathSamples(stroke.points,Math.max(5,length*.35));for(let i=1;i<ps.length;i++)paintedPoses.push({p:point(ps[i-1],ps[i],.5),angle:Math.atan2(ps[i][1]-ps[i-1][1],ps[i][0]-ps[i-1][0])});
  }
  for(let i=paintedPoses.length-1;i>0;i--){const j=Math.floor(r()*(i+1));[paintedPoses[i],paintedPoses[j]]=[paintedPoses[j],paintedPoses[i]];}
 }
''' +s[b:]
s=s.replace("if(g.paintWater){p=[40+r()*920,40+r()*920];angle=r()*Math.PI;}", "if(g.paintWater){if(!wet.length)break;const pose=paintedPoses[attempt];if(pose){p=pose.p;angle=pose.angle;}else{const i=wet[Math.floor(r()*wet.length)];p=[(i%Plan.N+.5)*Plan.STEP,(Math.floor(i/Plan.N)+.5)*Plan.STEP];angle=r()*Math.PI;}}")
p.write_text(s)
