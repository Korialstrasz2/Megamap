/* Deterministic seamless material tiles. Original procedural art, GPL-3.0-only.
 * Produces small, indexed PNGs synchronously in Node and the browser, without
 * Canvas, fetch, image services, dependencies, or platform-specific encoders.
 * Tiles are cached (bounded LRU) and embedded in SVG/PNG/WebP/VTT exports.
 */
(function(root,factory){const api=factory();if(typeof module==='object'&&module.exports)module.exports=api;else root.MegamapBattleMaterials=api;})(typeof globalThis!=='undefined'?globalThis:this,function(){
'use strict';
const N=128,cache=new Map();
function hash(x,y,seed=0){let h=Math.imul(x+374761393,668265263)^Math.imul(y+1274126177,2246822519)^seed;h=Math.imul(h^(h>>>13),1274126177);return ((h^(h>>>16))>>>0)/4294967296;}
const smooth=t=>t*t*(3-2*t),lerp=(a,b,t)=>a+(b-a)*t;
function noise(x,y,cells,seed){x=x/N*cells;y=y/N*cells;const i=Math.floor(x),j=Math.floor(y),u=smooth(x-i),v=smooth(y-j),at=(a,b)=>hash((a%cells+cells)%cells,(b%cells+cells)%cells,seed);return lerp(lerp(at(i,j),at(i+1,j),u),lerp(at(i,j+1),at(i+1,j+1),u),v);}
const table=Uint32Array.from({length:256},(_,i)=>{let c=i;for(let j=0;j<8;j++)c=c&1?0xedb88320^(c>>>1):c>>>1;return c>>>0;});
const crc=data=>{let c=0xffffffff;for(const b of data)c=table[(c^b)&255]^(c>>>8);return(c^0xffffffff)>>>0;};
const u32=n=>[(n>>>24)&255,(n>>>16)&255,(n>>>8)&255,n&255];
function chunk(type,data){const bytes=[...type].map(c=>c.charCodeAt(0)).concat(Array.from(data));return [...u32(data.length),...bytes,...u32(crc(bytes))];}
function png(pixels,palette){const raw=[];for(let y=0;y<N;y++){raw.push(0);for(let x=0;x<N;x++)raw.push(pixels[y*N+x]);}
 // A single stored DEFLATE block: <= 16.6 KB, exact and portable.
 let a=1,b=0;for(const x of raw){a=(a+x)%65521;b=(b+a)%65521;}
 const len=raw.length,z=[0x78,0x01,1,len&255,len>>>8,(~len)&255,((~len)>>>8)&255,...raw,...u32(((b<<16)|a)>>>0)];
 const bytes=[137,80,78,71,13,10,26,10,...chunk('IHDR',[...u32(N),...u32(N),8,3,0,0,0]),...chunk('PLTE',palette),...chunk('IDAT',z),...chunk('IEND',[])];
 const abc='ABCDEFGHIJKLMNOPQRSTUVWXYZabcdefghijklmnopqrstuvwxyz0123456789+/';let out='';for(let i=0;i<bytes.length;i+=3){const v=(bytes[i]<<16)|((bytes[i+1]||0)<<8)|(bytes[i+2]||0);out+=abc[v>>>18]+abc[(v>>>12)&63]+(i+1<bytes.length?abc[(v>>>6)&63]:'=')+(i+2<bytes.length?abc[v&63]:'=');}return 'data:image/png;base64,'+out;
}
function texture(material,color){const key=material+color;if(cache.has(key)){const value=cache.get(key);cache.delete(key);cache.set(key,value);return value;}
 const seed=[...material].reduce((h,c)=>Math.imul(h,31)+c.charCodeAt(0)|0,971),pixels=new Uint8Array(N*N),rgb=/^#[\da-f]{6}$/i.test(color)?color.slice(1).match(/../g).map(x=>parseInt(x,16)):[128,128,128];
 const put=(x,y,v)=>pixels[(((y%N)+N)%N)*N+((x%N)+N)%N]=Math.max(0,Math.min(255,v));
 for(let y=0;y<N;y++)for(let x=0;x<N;x++){
  const macro=noise(x,y,4,seed),fine=hash(x,y,seed);let v=126+(macro-.5)*68+(noise(x,y,16,seed+1)-.5)*42+(fine-.5)*35;
  if(material==='grass')v+=(noise(x,y,8,seed+9)-.5)*38;
  if(material==='wood')v=128+(noise(x,y,4,seed)-.5)*34+Math.sin(y*Math.PI*30/N+noise(x,y,4,seed+1)*9)*17+(fine-.5)*18+Math.sin(y*Math.PI*86/N+Math.sin(x*Math.PI*2/N))*9;
  if(material==='sand')v=139+(macro-.5)*38+Math.sin(y*Math.PI*12/N+noise(x,y,4,seed+1)*5)*5+(fine-.5)*30;
  if(material==='water')v=124+(macro-.5)*46+Math.sin(y*Math.PI*10/N+noise(x,y,8,seed+1)*6)*13+(fine-.5)*8;
  if(material==='snow')v=151+(macro-.5)*37+(fine-.5)*17;
  if(material==='stone')v+=(noise(x,y,32,seed+3)-.5)*25;
  put(x,y,Math.round(v));
 }
 // Thousands of directional grass blades, twigs, pebbles and pores per tile.
 const count=material==='grass'?2300:material==='earth'?680:material==='stone'?440:material==='sand'?280:0;
 for(let k=0;k<count;k++){
  const x=Math.floor(hash(k,1,seed)*N),y=Math.floor(hash(k,2,seed)*N),length=material==='grass'?2+Math.floor(hash(k,3,seed)*7):1+Math.floor(hash(k,3,seed)*2),dx=hash(k,4,seed)-.5;
  const base=material==='grass'?80+hash(k,5,seed)*112:95+hash(k,5,seed)*90;
  for(let j=0;j<length;j++){const xx=x+Math.round(dx*j),yy=y-j;put(xx+1,yy+1,base-30);put(xx,yy,base+j*3);}
 }
 const palette=[];for(let i=0;i<256;i++){const delta=(i-128)*.64;for(let c=0;c<3;c++)palette.push(Math.round(Math.max(0,Math.min(255,rgb[c]+delta*(c===2&&material==='grass'?.6:1)))));}
 const out=png(pixels,palette);cache.set(key,out);if(cache.size>64)cache.delete(cache.keys().next().value);return out;
}
return {texture,noise,hash,size:N};
});
