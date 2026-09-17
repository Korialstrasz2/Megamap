const {test}=require('node:test');
const assert=require('node:assert/strict');
const W=require('../src/wizard.js');
const field=(min,max,step,value=min)=>({min:String(min),max:String(max),step:String(step),value:String(value)});
const ranges=[field(2,100,1,20),field(.5,8,.1,2),field(.5,40,.5,20),field(-500,6000,10,350),field(0,5000,10,500),field(.2,20,.2,1),field(.1,.7,.01,.36),field(0,1,.05,.6),field(1,100,1,65),field(0,345,15,0),field(16,80,1,48),field(12,140,1,40)];
test('numeric shortcuts honor all generator ranges and step alignment',()=>{
 for(const f of ranges){const values=W.numericChoices(f),l=W.limits(f);assert.ok(values.length>=2&&values.length<=6);assert.equal(values[0],l.min);assert.ok(values.includes(Number(f.value)));assert.equal(new Set(values).size,values.length);for(const v of values){assert.ok(v>=l.min&&v<=l.max);assert.ok(Math.abs((v-l.min)/l.step-Math.round((v-l.min)/l.step))<1e-7);}}
});
test('random values include both endpoints and never escape valid steps',()=>{
 for(const f of ranges){const l=W.limits(f);assert.equal(W.randomNumber(f,()=>0),l.min);assert.ok(W.randomNumber(f,()=>.999999999)<=l.max);for(let i=0;i<1000;i++){const v=W.randomNumber(f);assert.ok(v>=l.min&&v<=l.max);assert.ok(Math.abs((v-l.min)/l.step-Math.round((v-l.min)/l.step))<1e-7);}}
});
test('non-aligned maxima, constant ranges and invalid bounds are safe',()=>{
 assert.deepEqual(W.numericChoices(field(0,1,.3)),[0,.3,.6,.9]);assert.deepEqual(W.numericChoices(field(4,4,1)),[4]);assert.equal(W.randomNumber(field(4,4,1)),4);
 for(const f of [field(5,1,1),field(0,1,0),field('',1,1),field(0,'bad',1)]){assert.deepEqual(W.numericChoices(f),[]);assert.equal(W.randomNumber(f),null);}
});
test('wizard copy includes Italian labels for entry, navigation and errors',()=>{
 for(const text of ['New wizard','New map wizard','Random','Randomize section','Exact value','Skip section','Generate map','Close wizard'])assert.ok(W.translations[text]&&W.translations[text]!==text);
});
