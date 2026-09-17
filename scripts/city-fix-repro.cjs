'use strict';
const fs = require('node:fs');
const path = require('node:path');
const E = require('../src/engine.js');
const R = require('../src/render.js');
const output = path.resolve(process.argv[2] || 'docs/qa-city/before');
fs.mkdirSync(output, {recursive: true});

const REPRO = {
  sizeKm: 2.4, shape: 'random', shapeGuidance: 44, rotation: 0,
  districts: 56, density: 0.1, chaos: 0.2, quarterDetail: 0.5,
  river: true, walls: true, coast: false, layout: 'organic'
};
const variants = {
  repro: REPRO,
  dense: {...REPRO, districts: 55, density: 0.7, chaos: 0.45,
          quarterDetail: 0.7},
  dry: {...REPRO, river: false},
  coast: {...REPRO, river: false, coast: true}
};
const crops = {
  'river-margin': '430 695 200 200',
  'dock-icons': '368 232 90 60',
  'pointed-lots': '129 366 90 60'
};
const summaries = {};
for (const [name, options] of Object.entries(variants)) {
  const started = performance.now();
  const scene = E.generate('city', 'silver-vale-42', options);
  const generationMs = performance.now() - started;
  E.validateScene(JSON.parse(JSON.stringify(scene)));
  fs.writeFileSync(path.join(output, `${name}.json`),
                  JSON.stringify(scene, null, 2));
  fs.writeFileSync(path.join(output, `${name}.svg`), R.render(scene));
  if (name === 'repro') {
    for (const [crop, viewBox] of Object.entries(crops)) {
      fs.writeFileSync(path.join(output, `${crop}.svg`), R.render(scene, {
        viewBox, furniture: false, layers: {labels: false}
      }));
    }
  }
  summaries[name] = {
    generationMs,
    features: scene.features.length,
    districts: scene.features.filter(f => f.type === 'district').length,
    buildings: scene.features.filter(f => f.type === 'building').length,
    props: scene.features.filter(f => f.quarterProp).length
  };
}
fs.writeFileSync(path.join(output, 'counts.json'),
                JSON.stringify(summaries, null, 2));
console.log(JSON.stringify(summaries, null, 2));
