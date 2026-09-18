/* Reproducible small examples of one sketch and two construction climates. */
'use strict';
const fs=require('node:fs'),path=require('node:path'),E=require('../src/engine'),Core=require('../src/editor-core');
const configs=[['Painted river town · temperate','temperate'],['Painted river town · hot and dry','hot-dry']];
const maps=configs.map(([title,climate],i)=>{const s=E.generate('fantasy','painted-river-17',{preset:'market',structureCount:240,relief:0,climate,cityPlan:E.CITY_STUDIO.PLAN.example()});s.title=title;s.id='painted-example-'+i;return s;});
const atlas=Core.validateAtlas({format:'megamap-atlas',version:1,appVersion:'1.2.0',savedAt:'2026-09-18T00:00:00.000Z',active:0,maps,library:[]});
const output=JSON.stringify(atlas)+'\n',file=path.join(__dirname,'../examples/Painted-Cities.megamap.json');
if(process.argv.includes('--check')){if(!fs.existsSync(file)||fs.readFileSync(file,'utf8')!==output){console.error('Painted-city examples are out of date.');process.exitCode=1;}}
else fs.writeFileSync(file,output);
