const assert=require('node:assert/strict');
const M=require('../src/models.js');
const a=M.approximate({fn:'sin',segments:16,bits:16,fraction:10});
assert.equal(a.tableBits,272);assert.equal(a.saturated,0);assert.ok(a.maxAbs<=a.bound+1e-12);assert.ok(a.worst);
assert.ok(M.approximate({fn:'exp',bits:8,fraction:7}).saturated>0);
assert.ok(M.approximate({fn:'sin',segments:64}).maxAbs<a.maxAbs);
for(let stages=1;stages<=8;stages++){
 const p=M.pipeline({stages,count:12,blocked:0});assert.equal(p.totalCycles,12+stages);assert.ok(p.latencies.every(l=>l===stages));assert.deepEqual(p.outputs.map(o=>o.id),Array.from({length:12},(_,i)=>i));
 const s=M.pipeline({stages,count:12,blocked:3,period:5});assert.ok(s.complete);assert.deepEqual(s.outputs.map(o=>o.id),Array.from({length:12},(_,i)=>i));assert.ok(s.events.every(e=>e.exit===null||e.ready));
}
assert.equal(M.pipeline({blocked:5,period:5}).complete,false);
assert.equal(M.pipeline().elapsedCycles,15);
assert.equal(M.pipeline().elapsedThroughput,0.8);
assert.equal(M.pipeline().totalCycles,16);
assert.equal(M.verify({variant:'wrap',suite:'normal'}).passed,4);
assert.ok(M.verify({variant:'wrap',suite:'boundary'}).passed<5);
const copied=M.verify({variant:'wrap',suite:'boundary',oracle:'copied'});assert.equal(copied.passed,5);assert.ok(copied.trueCorrect<5);
assert.ok(M.verify({variant:'correct',suite:'boundary'}).rows.every(r=>r.pass));
const ppa=M.pareto();assert.equal(ppa.find(p=>p.id==='small').feasible,false);assert.equal(ppa.find(p=>p.id==='dominated').pareto,false);assert.equal(ppa.find(p=>p.id==='balanced').pareto,true);
assert.equal(M.pareto({maxDelay:0.1}).some(p=>p.feasible),false);
assert.throws(()=>M.pipeline({stages:0}));assert.throws(()=>M.approximate({segments:0}));
assert.equal(M.roofline().total,4.005);assert.equal(M.roofline({serial:1}).total,8.005);
assert.equal(M.roofline({utilization:1}).memory,2);assert.equal(M.roofline({peak:256}).total,4.005);
assert.equal(M.roofline({bytes:32}).total,4.005);assert.throws(()=>M.roofline({utilization:0}));
console.log('PASS: approximation bounds, saturation, pipeline conservation/backpressure, oracle counterexample and Pareto boundaries');
