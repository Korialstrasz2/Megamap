from pathlib import Path
p=Path('src/city-perspective.js');s=p.read_text()
s=s.replace("node?require('./render.js'):root.MegamapRender);", "node?require('./render.js'):root.MegamapRender,node?require('./engine.js'):root.MegamapEngine);")
s=s.replace("function(C,CR,A,Core,R){", "function(C,CR,A,Core,R,E){")
needle='function render(s,view={},bearing=0)'
idx=s.index(needle)
helpers='''// One camera-independent triangulated heightfield is used by terrain,
// draped roads/areas and object foundations in every rotation and HQ setting.
// A four-corner polygon is NOT a terrain surface when its interior crosses a
// hill. Clip each surface to the same mesh rather than spanning the hollow.
function terrainMesh(s){const count=64,step=1000/count,nodes=[];
 for(let y=0;y<=count;y++)for(let x=0;x<=count;x++)nodes.push([x*step,y*step,C.heightAt(s.cityStudio.ground,[x*step,y*step])/s.scale]);
 const at=(x,y)=>nodes[y*(count+1)+x],triangles=(x,y)=>[[at(x,y),at(x+1,y),at(x+1,y+1)],[at(x,y),at(x+1,y+1),at(x,y+1)]];
 const height=p=>{const x=clamp(p[0]/step,0,count-1e-8),y=clamp(p[1]/step,0,count-1e-8),ix=Math.floor(x),iy=Math.floor(y),u=x-ix,v=y-iy,a=at(ix,iy)[2],b=at(ix+1,iy)[2],c=at(ix+1,iy+1)[2],d=at(ix,iy+1)[2];return u>=v?a*(1-u)+b*(u-v)+c*v:a*(1-v)+c*u+d*(v-u);};
 return{count,step,nodes,triangles,height};
}
function clipTriangle(subject,triangle){let out=subject.map(p=>p.slice(0,2));
 for(let k=0;k<3&&out.length;k++){const a=triangle[k],b=triangle[(k+1)%3],side=p=>(b[0]-a[0])*(p[1]-a[1])-(b[1]-a[1])*(p[0]-a[0]),next=[];
  for(let j=0;j<out.length;j++){const u=out[j],v=out[(j+1)%out.length],du=side(u),dv=side(v);if(du>=-1e-8)next.push(u);if((du>=0)!==(dv>=0))next.push(lerp(u,v,du/(du-dv)));}out=next;
 }return out;
}
function surfacePieces(ps,mesh){ps=clipMap(ps);if(ps.length<3||C.area(ps)<1e-7)return[];
 const convex=ps.every((p,i)=>{const a=ps[(i+1)%ps.length],b=ps[(i+2)%ps.length];return(a[0]-p[0])*(b[1]-a[1])-(a[1]-p[1])*(b[0]-a[0])>=-1e-7;});
 // Ear clipping preserves concave courts and arbitrary user-edited polygons.
 const parts=convex?[ps]:E.triangulate(ps),pieces=[];
 for(const part of parts){const b=C.bounds(part),x0=clamp(Math.floor(b.x0/mesh.step),0,mesh.count-1),x1=clamp(Math.floor(b.x1/mesh.step),0,mesh.count-1),y0=clamp(Math.floor(b.y0/mesh.step),0,mesh.count-1),y1=clamp(Math.floor(b.y1/mesh.step),0,mesh.count-1);
  for(let y=y0;y<=y1;y++)for(let x=x0;x<=x1;x++)for(const tri of mesh.triangles(x,y)){const poly=clipTriangle(part,tri);if(poly.length>=3&&C.area(poly)>1e-7)pieces.push({poly,tile:C.center(tri.map(p=>p.slice(0,2)))});}
 }return pieces;
}
function wallPanels(s,f,height,mesh=terrainMesh(s)){const ps=C.pathSamples(f.points,mesh.step/2),panels=[];
 for(let i=1;i<ps.length;i++){if(C.distance(ps[i-1],ps[i])<.001)continue;const footprint=C.corridor(ps[i-1],ps[i],f.width),bottom=footprint.map(p=>mesh.height(p));panels.push({footprint,bottom,top:bottom.map(z=>z+height)});}return panels;
}
'''
s=s[:idx]+helpers+s[idx:]
s=s.replace("const fs=s.features.filter(visible),extent=", "const mesh=terrainMesh(s),elevation=(_,p)=>mesh.height(p);\n const fs=s.features.filter(visible),extent=")
s=s.replace(" const surfacePoly=(ps,fill,attrs='',z=null)=>poly(ps.map(q=>project(q,z===null?elevation(s,q):z)),fill,attrs,fill,.28);", " let surfaceId='',surfaceOrder=0;\n const surfacePoly=(ps,fill,attrs='',z=null)=>{for(const piece of surfacePieces(ps,mesh)){const points=piece.poly.map(q=>project(q,z===null?elevation(s,q):z));surface.push({d:cam.depth(piece.tile),order:surfaceOrder,art:`<g data-id=\"${esc(surfaceId)}\">${poly(points,fill,attrs,fill,.18)}</g>`});}return '';};")
a=s.index(' // Terrain is deliberately bounded');b=s.index(' // Water and paths are surface geometry',a)
s=s[:a]+''' // Triangles cannot twist or change their apparent slope when the camera
 // turns. Surface layers use these exact vertices and interpolation rules.
 if(layers.terrain!==false){for(let y=0;y<mesh.count;y++)for(let x=0;x<mesh.count;x++)for(const tri of mesh.triangles(x,y)){
   const mid=C.center(tri.map(q=>q.slice(0,2))),z=mesh.height(mid)*s.scale,t=g.relief?z/g.relief:0,slope=C.heightAt(g,[mid[0]+8,mid[1]])-C.heightAt(g,[mid[0],mid[1]+8]);let fill=CR.color(p.land,p.hill,t*.32);
   if(hq)fill=CR.color(fill,slope>0?p.paper:p.ink,Math.min(.1,Math.abs(slope)*.012));
   ground.push({d:cam.depth(mid),art:poly(tri.map(q=>project(q,q[2])),fill,'data-terrain-face="true"',fill,.4)});
 }}else for(const q of [[0,0],[1000,0],[1000,1000],[0,1000]])project(q,0);
''' +s[b:]
s=s.replace("for(const f of fs){let art='';\n  if(f.type==='water'", "for(const f of fs){let art='';surfaceId=f.id;surfaceOrder++;\n  if(f.type==='water'")
s=s.replace("'data-surface-water=\"true\"',0)","'data-surface-water=\"true\"',f.cityPaintBand&&f.cityWaterKind==='river'?null:0)")
s=s.replace("if(art)surface.push(`<g data-id=\"${esc(f.id)}\">${art}</g>`);", "if(art)surface.push({d:cam.depth(Core.center(f)),order:surfaceOrder,art:`<g data-id=\"${esc(f.id)}\">${art}</g>`});")
s=s.replace("project(b,top),project(a,top)","project(b,Array.isArray(top)?top[(i+1)%footprint.length]:top),project(a,Array.isArray(top)?top[i]:top)")
s=s.replace("top=1/s.scale;\n  let art=poly(polyWorld.map(q=>project(q,top))", "top=(g.paintWater&&g.paintWater.cells[C.PLAN.cell([f.x,f.y])]===1?elevation(s,[f.x,f.y]):0)+1/s.scale;\n  let art=poly(polyWorld.map(q=>project(q,top))")
a=s.index("  else if(f.type==='wall'&&f.points)");b=s.index("  else if(['asset'",a)
s=s[:a]+'''  else if(f.type==='wall'&&f.points){const height=(f.cityRole==='retaining'?1.5:f.cityRole==='old-wall'?2.2:6)/s.scale;
   // Sort short panels independently. A single maximum height/depth for an
   // entire long wall turned low sections into towers and drew it over hills.
   for(const panel of wallPanels(s,f,height,mesh)){const {footprint,bottom,top}=panel,art=wallFaces(f,footprint,Math.min(...bottom),top)+poly(footprint.map((q,i)=>project(q,top[i])),p.hill,'data-wall-top="true"',p.ink,.35);
    objects.push({art,id:f.id,d:Math.max(...footprint.map(cam.depth)),z:Math.max(...top),center:C.center(footprint)});
   }
  }
''' +s[b:]
s=s.replace(" ground.sort((a,b)=>a.d-b.d);objects.sort((a,b)=>a.d-b.d||a.id.localeCompare(b.id));", """ const scene=[...ground.map(x=>({...x,rank:0,kind:'terrain'})),...surface.map(x=>({...x,rank:1,kind:'surface'})),...objects.map(x=>({...x,rank:2,kind:'objects'}))];
 // Foreground terrain must be able to hide objects and roads behind it. The
 // old terrain / all surfaces / all objects buckets drew through hills.
 scene.sort((a,b)=>a.d-b.d||a.rank-b.rank||(a.order||0)-(b.order||0)||(a.id||'').localeCompare(b.id||''));""")
s=s.replace('data-bearing="${n(cam.bearing)}"', 'data-bearing="${n(cam.bearing)}" data-terrain-mesh="64"')
a=s.index('<g data-perspective-terrain="true">');b=s.index('<g pointer-events="none">',a)
s=s[:a]+'''<g data-perspective-scene="true">${scene.map(x=>`<g data-perspective-${x.kind}="true"${x.id?` data-id="${esc(x.id)}"`:''}>${x.art}</g>`).join('')}</g>''' +s[b:]
s=s.replace('return{render,camera,elevation,buildingHeight,clipMap};','return{render,camera,elevation,buildingHeight,clipMap,terrainMesh,surfacePieces,wallPanels};')
p.write_text(s)
