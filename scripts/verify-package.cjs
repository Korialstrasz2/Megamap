/* Verify an extracted, unmodified release with built-in Node modules only.
 * Editing any shipped file legitimately changes its expected hash.
 */
'use strict';
const fs=require('node:fs'),path=require('node:path'),crypto=require('node:crypto');
const root=path.resolve(__dirname,'..');
try {
 const manifest=JSON.parse(fs.readFileSync(path.join(root,'docs/SHA256_MANIFEST.json'),'utf8'));
 const failures=[];
 for(const [relative,expected]of Object.entries(manifest.files)){
  const file=path.resolve(root,relative);
  if(!file.startsWith(root+path.sep)){failures.push(relative+': invalid path');continue;}
  if(!fs.existsSync(file)){failures.push(relative+': missing');continue;}
  const digest=crypto.createHash('sha256').update(fs.readFileSync(file)).digest('hex');
  if(digest!==expected)failures.push(relative+': modified or corrupted');
 }
 if(failures.length){console.error(failures.join('\n'));process.exitCode=1;}
 else console.log('Megamap '+manifest.version+': '+Object.keys(manifest.files).length+' file hashes match.');
} catch(error) {console.error('Could not verify release: '+error.message);process.exitCode=1;}
