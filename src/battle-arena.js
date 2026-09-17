/* Open arena bowl with editable tiers and real, open entrances. GPL-3.0-only.
 * Arena structure is ordinary area/wall features, so manual edits and VTT
 * exports share the same geometry. No hidden rooms or decorative fake doors.
 */
(function(root,factory){const api=factory();if(typeof module==='object'&&module.exports)module.exports=api;else root.MegamapBattleArena=api;})(typeof globalThis!=='undefined'?globalThis:this,function(){
'use strict';
const PRESET={id:'arena',name:'Arena',hint:'An open fighting floor, stepped spectator stands, opposing entrances and optional tactical cover.',cols:52,rows:44,zones:[],arenaSurface:'sand',arenaFloor:65,arenaTiers:4,arenaCover:6};
function generate(F,{finish,prop,footprint}){
 F.layout='Arena bowl and spectator tiers';F.outdoor=true;
 const {s,C,R,g,H,o}=F,cx=C/2,cy=R/2;
 // Fit the whole bowl inside the actual play envelope, even on narrow hexes.
 let rx=C/2-1.2,ry=R/2-1.2;
 const ellipse=(a,b,n=80)=>Array.from({length:n},(_,i)=>[cx+a*Math.cos(i*2*Math.PI/n),cy+b*Math.sin(i*2*Math.PI/n)]);
 for(let k=0;k<100&&!ellipse(rx,ry).every(p=>F.inside(...p));k++){rx*=.97;ry*=.97;}
 const ratio=o.arenaFloor/100,ix=rx*ratio,iy=ry*ratio,gate=Math.min(1.7,ix*.38),floor=ellipse(ix,iy);
 const dist=(x,y)=>Math.hypot((x-cx)/ix,(y-cy)/iy);
 for(let y=0;y<R;y++)for(let x=0;x<C;x++){const i=y*C+x;if(!F.mask[i])continue;F.floor[i]=1;F.owner[i]=-2;F.exterior.add(i);
  // Reserve the entire spectator bowl, both entrances and a central cross.
  if(dist(x+.5,y+.5)>.82||Math.abs(x+.5-cx)<gate+.5||Math.abs(y+.5-cy)<.7)F.reserved.add(i);
 }
 const addArea=(polygon,material,notes)=>H.add(s,'area',{polygon:polygon.map(p=>F.P(...p)),material,notes});
 addArea(ellipse(rx,ry),'stone','Arena foundation and spectator bowl.');
 const angles=[[-Math.PI/2+.11,Math.PI/2-.11],[Math.PI/2+.11,Math.PI*1.5-.11]];
 // Open gates stay open in both the drawing and line-of-sight export.
 const arc=(a,b,start,end,n=36)=>Array.from({length:n+1},(_,i)=>{const t=start+(end-start)*i/n;return [cx+a*Math.cos(t),cy+b*Math.sin(t)];});
 for(let tier=0;tier<o.arenaTiers;tier++){
  const t0=ratio+(1-ratio)*tier/o.arenaTiers,t1=ratio+(1-ratio)*(tier+1)/o.arenaTiers;
  for(let sector=0;sector<8;sector++){
   const a=-Math.PI/2+sector*Math.PI/4+.065,b=-Math.PI/2+(sector+1)*Math.PI/4-.065;
   const ring=arc(rx*t1,ry*t1,a,b,12).concat(arc(rx*t0,ry*t0,b,a,12));
   const f=addArea(ring,tier%2?'slate':'stone','Spectator tier '+(tier+1)+'; aisles separate the seating sections.');f.arenaTier=tier+1;
  }
 }
 addArea(floor,o.arenaSurface,'Open fighting floor. Opposing entrances and the central crossing are kept clear.');
 // Two north/south entry aisles are aligned with actual barrier openings.
 for(const sign of [-1,1])addArea([[cx-gate,cy+sign*iy*.94],[cx+gate,cy+sign*iy*.94],[cx+gate,cy+sign*ry*.98],[cx-gate,cy+sign*ry*.98]],'flagstone','Open arena entrance aisle.');
 const gap=Math.asin(Math.min(.8,(gate+.3)/ix));
 for(const [a,b] of [[-Math.PI/2+gap,Math.PI/2-gap],[Math.PI/2+gap,Math.PI*1.5-gap]])H.add(s,'wall',{points:arc(ix,iy,a,b,48).map(p=>F.P(...p)),width:g*.23,notes:'Arena barrier; the gaps at both ends are open entrances.'});
 for(const [a,b] of angles)H.add(s,'wall',{points:arc(rx,ry,a,b,48).map(p=>F.P(...p)),width:g*.3,notes:'Outer arena wall; entry aisles remain open.'});
 // Safe, seeded cover placements. Never use the seating tiers as combat rooms.
 const ids=['column','crate','boulder','barrel','weapon-rack','banner-stand'];let placed=0;
 for(let k=0;k<o.arenaCover*120&&placed<o.arenaCover;k++){
  const x=cx+(F.r()-.5)*ix*1.45,y=cy+(F.r()-.5)*iy*1.45,id=ids[placed%ids.length],[w,h]=footprint(id);
  if(dist(x,y)>.72)continue;
  if(prop(F,id,x,y,w,h,0))placed++;
 }
 const entrance=F.P(cx,cy-ry),exit=F.P(cx,cy+ry);
 for(const [pt,label]of [[entrance,'Arena entrance'],[exit,'Opposing entrance']])H.add(s,'label',{x:pt[0],y:pt[1],size:g*.33,label,notes:'Open passage; not a closed door.'});
 s.battle.entrance={room:'arena-floor',side:['north','east','south','west'][F.turn],point:entrance};
 s.battle.arena={floor:floor.map(p=>F.P(...p)),bowl:ellipse(rx,ry).map(p=>F.P(...p)),entrances:[entrance,exit],tiers:o.arenaTiers,coverPlaced:placed};
 if(placed<o.arenaCover)s.battle.diagnostics.warnings.push('The arena is too tight for all requested cover. Enlarge the floor or reduce cover.');
 s.notes='An open arena at a five-foot scale. Opposing entrances and the central crossing remain clear. Spectator tiers, barriers and cover are individually editable. Barriers export as VTT vision walls with open entrances. Tier heights and climbing rules are not automated.';
 finish(F);s.title=s.title.replace(/ Depths$/,' · Arena');s.metadata.program='Arena';s.metadata.architecture='Open arena bowl; no generated rooms. Editable tiers and barriers, two open entry aisles.';
 return s;
}
return {PRESET,generate};
});
