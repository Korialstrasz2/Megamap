/* Climate and means affect construction, not just roof color. GPL-3.0-only.
 * Small, deterministic fantasy architectural vocabularies; no inhabitants,
 * simulation of wealth, or claim of universal historical building rules.
 */
(function(root,factory){const api=factory();if(typeof module==='object'&&module.exports)module.exports=api;else root.MegamapCityHousing=api;})(typeof globalThis!=='undefined'?globalThis:this,function(){
'use strict';
const CLIMATES=['auto','temperate','hot-dry','hot-humid','cold'];
const WEALTH=['modest','ordinary','affluent'];
const pick=(r,a)=>a[Math.floor(r()*a.length)];
function climate(v){return CLIMATES.includes(v.climate)&&v.climate!=='auto'?v.climate:v.culture==='desert'?'hot-dry':v.culture==='nordic'||v.culture==='stone'&&v.landscape==='hills'?'cold':'temperate';}
function wealth(q,kind,r){if(q==='slums'||kind==='shack')return'modest';if(q==='noble'||kind==='villa'||kind==='palace')return'affluent';return r()<.24?'modest':r()<.12?'affluent':'ordinary';}
function parcel(v,q,context,r){const out={...context},c=climate(v),tier=wealth(q,context.kind,r),home=['house','shack','townhouse','tenement','villa','palace','inn'].includes(context.kind);
 out.climate=c;out.wealth=tier;out.pitch=c==='cold'?.62:c==='hot-humid'?.52:.36;
 out.roof=c==='hot-dry'?'flat':v.culture==='nordic'?'longhouse':pick(r,['gable','gable','hip']);
 out.detail=c==='cold'?'chimney':c==='hot-dry'?'shade':c==='hot-humid'?'veranda':'plain';
 const materials={
  temperate:{modest:['thatch','shingle','weathered'],ordinary:['tile','shingle','slate'],affluent:['tile','slate','tile']},
  cold:{modest:['thatch','turf','shingle'],ordinary:['shingle','turf','slate'],affluent:['slate','shingle','slate']},
  'hot-dry':{modest:['plaster','weathered','plaster'],ordinary:['plaster','tile','plaster'],affluent:['plaster','tile','plaster']},
  'hot-humid':{modest:['thatch','shingle','thatch'],ordinary:['shingle','tile','thatch'],affluent:['tile','shingle','tile']}
 };
 out.material=pick(r,materials[c][tier]);
 if(home){
  out.width*=tier==='modest'?.87:tier==='affluent'?1.10:1;
  out.depth*=c==='cold'?.92:c==='hot-humid'?1.08:1;
  if(tier==='modest'){out.floors=q==='slums'?1+(r()<.13?1:0):Math.min(2,out.floors);out.detail=c==='cold'?'chimney':c==='hot-humid'?'veranda':'patched';}
  if(tier==='affluent'){out.detail=c==='hot-dry'?'shade':c==='hot-humid'?'veranda':c==='cold'?'dormer':'formal';out.gapM+=.7;}
  if(c==='hot-dry'){out.pitch=0;out.form=tier==='affluent'||context.kind==='inn'?'court':r()<.35?'ell':'rect';}
  if(c==='cold'){out.form=tier==='affluent'&&r()<.30?'ell':'rect';out.setbackM+=.4;}
  if(c==='hot-humid'){out.form=tier==='affluent'&&r()<.30?'ell':'rect';out.gapM+=1.1;out.setbackM+=1;}
 }
 return out;
}
function metadata(c){return{cityClimate:c.climate,cityWealth:c.wealth,cityHousingDetail:c.detail,cityPitch:c.pitch,cityHousingVersion:1};}
return{CLIMATES,WEALTH,climate,parcel,metadata};
});
