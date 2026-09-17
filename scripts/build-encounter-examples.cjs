/* Deterministic six-map encounter showcase. GPL-3.0-only.
 * Developer utility only; the shipped atlas opens without Node or a build step.
 * --check verifies reproducibility without changing the checked-in atlas.
 */
'use strict';
const fs=require('node:fs'),path=require('node:path');
const E=require('../src/engine.js'),C=require('../src/editor-core.js'),P=require('../src/encounter-content.js');
const titles={
 'forest-road':'Greenwood road / Strada nel bosco',
 'mountain-path':'High pass / Sentiero di montagna',
 'marsh-causeway':'Reedwater causeway / Passerella nella palude',
 'coastal-cove':'Smugglers cove / Cala dei contrabbandieri',
 mansion:'Willowmere mansion / Interno della dimora',
 castle:'Greywatch castle / Interno del castello'
};
const maps=P.presets.map(p=>{
 const s=E.generate('battle','showcase-'+p.id,{theme:p.id});
 s.title=titles[p.id];s.documentId='six-encounters-'+p.id;
 s.appearance=C.appearance({...s,appearance:{...s.appearance,grid:'hex-flat',palette:p.outdoor?'atlas':'parchment'}});
 s.notes+='\n\nEN: This example uses the preset defaults. Use the existing editing tools to change this map; changing generator settings and pressing Generate adds a new map. Save atlas before closing.\n\nIT: Questo esempio usa le impostazioni predefinite. Gli strumenti di modifica agiscono sulla mappa attuale; cambiare i parametri e premere Genera aggiunge una nuova mappa. Salva l’atlante prima di chiudere.';
 if(p.outdoor)s.notes+='\nIT: Terreno aperto, senza stanze. Il percorso asciutto e lo spazio dello scontro sono riservati prima di posizionare acqua e coperture. Rocce e alberi non diventano automaticamente muri di visibilità nel VTT; aggiungi i muri necessari con gli strumenti di modifica.';
 E.validateScene(s);return s;
});
const atlas=C.validateAtlas({format:'megamap-atlas',version:1,appVersion:E.VERSION,active:0,maps,library:[]});
const file=path.resolve(__dirname,'../examples/Six-new-encounters.megamap.json'),data=JSON.stringify(atlas)+'\n';
if(process.argv.includes('--check')){
 if(!fs.existsSync(file)||fs.readFileSync(file,'utf8')!==data){console.error('Encounter showcase is missing or out of date. Run npm run encounters.');process.exitCode=1;}
 else console.log('Six-map encounter showcase matches the current engine.');
}else{fs.mkdirSync(path.dirname(file),{recursive:true});fs.writeFileSync(file,data);console.log('Wrote six editable encounter maps to '+file);}
