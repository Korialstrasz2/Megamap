/* Reproducible standalone Arena example; developer utility only. GPL-3.0-only. */
'use strict';
const fs=require('node:fs'),path=require('node:path'),E=require('../src/engine'),C=require('../src/editor-core');
const s=E.generate('battle','arena-showcase',{theme:'arena',hq:true});
s.title='Arena · HQ';s.documentId='arena-hq-showcase';s.appearance=C.appearance(s);
s.notes+='\n\nIT: Arena aperta con tribune, due ingressi e coperture modificabili. Le barriere diventano muri VTT, gli ingressi restano aperti. HQ migliora solo l’aspetto; puoi disattivarlo in Stile senza rigenerare la mappa.';
const a=C.validateAtlas({format:'megamap-atlas',version:1,active:0,maps:[s],library:[]}),file=path.join(__dirname,'../examples/Arena-HQ.megamap.json'),data=JSON.stringify(a)+'\n';
if(process.argv.includes('--check')){if(!fs.existsSync(file)||fs.readFileSync(file,'utf8')!==data){console.error('Arena example is out of date. Run node scripts/build-arena-example.cjs');process.exitCode=1;}}else fs.writeFileSync(file,data);
