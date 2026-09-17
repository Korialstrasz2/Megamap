/* Megamap v1.2 demonstration atlas. Run with Node; no packages needed.
 * Existing v1 examples are intentionally preserved for compatibility testing.
 */
'use strict';
const fs=require('node:fs'),path=require('node:path'),E=require('../src/engine'),C=require('../src/editor-core'),R=require('../src/render');
const out=path.resolve(__dirname,'../examples');fs.mkdirSync(out,{recursive:true});
function make(mode,seed,title,options,appearance={},notes=''){
 const s=E.generate(mode,seed,options);s.title=title;s.documentId='v12-'+seed;s.appearance=C.appearance({...s,appearance:{...s.appearance,...appearance}});s.notes=notes;return s;
}
const maps=[
 make('city','copper-elbow','Copper Elbow · exact L-shaped city',{shape:'l-shape',shapeGuidance:100,river:false,districts:64,quarters:['market','commons','artisans','temple','noble','military','university'],density:.65},{},'The exact L envelope is enforced. Enable the Districts layer in Style to inspect plots. Select a district to change its quarter program; select an individual building to see its kind. Streets may extend outside the town as approach roads.'),
 make('city','bastion-rectangle','Greywall · planned garrison town',{shape:'rectangle',shapeGuidance:100,river:false,layout:'planned',districts:36,quarters:['military','market','artisans','commons'],buildings:['barracks','keep','stable','smithy','workshop','shop','house','tavern'],density:.6},{palette:'parchment'},'A restricted building whitelist, straight-sided town envelope and a planned layout. Unchecked temple, noble and academic types will not be generated.'),
 make('city','forked-college','Forked College · guided T-shape',{shape:'t-shape',shapeGuidance:72,rotation:15,river:false,districts:48,quarters:['university','temple','gardens','merchants','noble'],density:.55},{},'Guidance 72 blends the T target with the seeded irregular silhouette. For an exact T, regenerate with guidance 100. Existing maps are never overwritten by Generate.'),
 make('local','greenwood-survey','Greenwood · 20 km landscape survey',{sizeKm:20,biome:'woodland',averageHeight:420,heightDiversity:600,water:'stream',roads:'none',homesteads:0,caves:4},{},'20 by 20 km. No settlements, farms or roads. 160 by 160 elevation samples, 125 m apart. Tree-cluster symbols represent land-cover patches, not single measured trees. The ruler and elevation CSV share the same physical coordinate scale.'),
 make('local','karst-pass-survey','High Pass · 10 km cave country',{sizeKm:10,biome:'mountains',averageHeight:1850,heightDiversity:1700,water:'stream',roads:'footpath',homesteads:0,caves:8,forest:.25},{},'Mean elevation 1,850 m; peak-to-trough relief 1,700 m. A cross-country route and eight cave entrance markers. Height samples are 62.5 m apart. Cave markers do not generate underground passages. The route is schematic rather than a guaranteed engineering-grade pass.'),
 make('local','red-sands-survey','Red Sands · 20 km dry survey',{sizeKm:20,biome:'desert',averageHeight:380,heightDiversity:150,water:'none',roads:'none',homesteads:0,caves:2,forest:0},{palette:'desert'},'Desert topography with no roads or surface water. No village symbols. Elevations are synthetic, not real-world terrain.'),
 make('battle','pointy-forest','Woodland encounter · pointy-top hex',{theme:'forest',cols:40,rows:36,gridType:'hex-pointy',mapShape:'hex-pointy'},{},'The movement grid and outer boundary are both pointy-top hexagons. Hex centers are 5 ft from their nearest neighbors. Export the grid JSON for placement metadata; a VTT may require its hex-grid orientation and offsets to be set manually.'),
 make('battle','flat-ruins','Broken sanctuary · flat-top hex',{theme:'ruins',cols:40,rows:36,gridType:'hex-flat',mapShape:'hex-flat'},{palette:'parchment'},'The movement grid and boundary are both flat-top hexagons, but the chambers use the orthogonal floor raster. Only the largest connected floor component is retained after boundary trimming. Door and light objects can be added with the toolbar.')
];
const atlas=C.validateAtlas({format:'megamap-atlas',version:1,appVersion:E.VERSION,active:0,maps,library:[]});
fs.writeFileSync(path.join(out,'V1.2-showcase.megamap.json'),JSON.stringify(atlas));
for(const [i,name]of[[0,'V12-L-shaped-city'],[3,'V12-20km-local-survey'],[6,'V12-pointy-hex-encounter']])fs.writeFileSync(path.join(out,name+'.svg'),R.render(maps[i],{...maps[i].appearance,editor:false}));
fs.writeFileSync(path.join(out,'V12-High-Pass-elevations.csv'),C.heightCSV(maps[4]));
fs.writeFileSync(path.join(out,'V12-pointy-hex-grid.json'),JSON.stringify(C.gridMetadata(maps[6]),null,2));
console.log('Wrote 8-map v1.2 showcase, three vector exports, elevation CSV and hex grid JSON.');
