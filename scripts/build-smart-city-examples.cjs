/* Two reproducible Part 2 scenes. No browser, services or external assets. */
'use strict';
const fs=require('node:fs'),path=require('node:path'),E=require('../src/engine'),Core=require('../src/editor-core');
const maps=[false,true].map(painted=>{const s=E.generate('fantasy','part2-check',{preset:'river-capital',size:'city',relief:0,boatCount:4,...(painted?{cityPlan:E.CITY_STUDIO.PLAN.Smart.example()}:{})});s.title=painted?'Smart capital · painted':'Monumental capital · automatic';s.documentId='city-part2-'+(painted?'smart':'automatic');return s;});
const data=JSON.stringify(Core.validateAtlas({format:'megamap-atlas',version:1,active:0,maps,library:[]}))+'\n',file=path.join(__dirname,'../examples/Smart-Cities.megamap.json');
if(process.argv.includes('--check')){if(!fs.existsSync(file)||fs.readFileSync(file,'utf8')!==data){console.error('Smart-city examples are out of date.');process.exitCode=1;}}else fs.writeFileSync(file,data);
