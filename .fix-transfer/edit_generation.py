from pathlib import Path
p=Path('src/city-studio.js');s=p.read_text()
s=s.replace("const bank=bankDistance(g,[xx,yy]);g.heights.push", "const bank=v.cityPlan?Infinity:bankDistance(g,[xx,yy]);g.heights.push")
# Sample the actual brush support, not the legacy central rectangle.
s=s.replace("const target=Math.ceil(v.count/(v.count>600?9:6)),width=", "const target=Math.ceil(v.count/(st.paintPlan?6:v.count>600?9:6)),width=")
s=s.replace("let placed=0;\n for(let attempt=0;attempt<target*45", "let placed=0;\n const painted=st.paintPlan?st.paintPlan.cellWard.map((id,i)=>id>=0&&!Plan.OPEN.has(st.paintPlan.zones[i])&&!st.ground.paintWater.cells[i]?i:-1).filter(i=>i>=0):null;\n for(let attempt=0;attempt<target*45")
s=s.replace("const p=[120+r()*755,130+r()*740];if(!inside", "const cell=painted?.[Math.floor(r()*painted.length)],p=painted?[(cell%Plan.N+r())*Plan.STEP,(Math.floor(cell/Plan.N)+r())*Plan.STEP]:[120+r()*755,130+r()*740];if(!inside")
# A painted street may meet the edge of the drawable map.
s=s.replace("const pass=p=>p[0]>=30&&p[1]>=30&&p[0]<=970&&p[1]<=970", "const margin=st.paintPlan?10:30;\n const pass=p=>p[0]>=margin&&p[1]>=margin&&p[0]<=1000-margin&&p[1]<=1000-margin")
s=s.replace("buildGraph,heightAt,bankDistance", "buildGraph,heightAt,bankDistance,Complexes,rect") if 'buildGraph,heightAt,bankDistance' in s else s
# exact API line currently examine appended below
p.write_text(s)
p=Path('src/city-plan.js');s=p.read_text()
a=s.index(' // Water lowers its own terrain');b=s.index(' for(const band of rectangles',a)
s=s[:a]+''' // A river is not a sea-level trench. Keep the selected relief, carve a
 // shallow channel, and shape only actual sea/lake banks toward sea level.
 // makeGround has deliberately skipped the *preset* coastline for this plan.
 const sea=plan.terrain.some(x=>x===2)?{paintWater:{n:N,cells:plan.terrain.map(x=>x===2?2:0)}}:null;
 g.heights=g.heights.map((z,i)=>{const p=[(i%64+.5)*1000/64,(Math.floor(i/64)+.5)*1000/64],bank=bankDistance(g,p),coast=sea?clamp(bankDistance(sea,p)/120,0,1):1;
  return Math.max(0,z*coast-(g.relief?Math.max(0,1-bank/24)*Math.min(3,g.relief*.02)/g.relief:0));});
 g.paintWater.surfaceVersion=1;
''' +s[b:]
s=s.replace("st.neighborhoods.push(ward);cells.forEach", "st.neighborhoods.push(ward);if(component.site){ward.smartSite=component.site;st.reservations.push({polygon:component.site.polygon,blockRoad:true,smartSite:ward.id});}cells.forEach")
s=s.replace("const p=ward.center,near=C.nearestRoad(s,p),width=Math.max(2,5/s.scale);", "let p=ward.center;const width=Math.max(2,5/s.scale);\n  if(ward.smartSite){const site=ward.smartSite,ps=site.polygon,candidates=ps.map((a,i)=>{const b=ps[(i+1)%4],mid=[(a[0]+b[0])/2,(a[1]+b[1])/2],dx=mid[0]-p[0],dy=mid[1]-p[1],d=Math.hypot(dx,dy)||1;return[mid[0]+dx/d*(width+5),mid[1]+dy/d*(width+5)];});candidates.sort((a,b)=>(C.nearestRoad(s,a)?.distance||0)-(C.nearestRoad(s,b)?.distance||0));p=candidates.find(q=>!C.waterAt(g,q,width))||candidates[0];}\n  const near=C.nearestRoad(s,p);")
p.write_text(s)
