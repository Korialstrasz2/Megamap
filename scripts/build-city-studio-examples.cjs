/* Deterministic sample atlas. Developer-only; the runtime stays dependency-free. */
'use strict';
const fs=require('node:fs'),path=require('node:path'),E=require('../src/engine'),C=require('../src/editor-core');
const presets=['fishing','river-capital','council','grove','oasis','crater'];
const maps=presets.map(preset=>{const s=E.generate('fantasy','city-studio-'+preset,{preset,rooftops:preset==='council',underground:preset==='council'});s.documentId='city-studio-example-'+preset;s.appearance=C.appearance(s);return s;});
const atlas=C.validateAtlas({format:'megamap-atlas',version:1,active:0,maps,library:[]}),file=path.join(__dirname,'../examples/City-Studio.megamap.json'),data=JSON.stringify(atlas)+'\n';
if(process.argv.includes('--check')){if(!fs.existsSync(file)||fs.readFileSync(file,'utf8')!==data){console.error('City Studio example is out of date. Run node scripts/build-city-studio-examples.cjs');process.exitCode=1;}}
else fs.writeFileSync(file,data);
