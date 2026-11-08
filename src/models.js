(function(root){
  'use strict';
  const functions={sin:{f:Math.sin,lo:-Math.PI,hi:Math.PI,m2:1},exp:{f:Math.exp,lo:-2,hi:2,m2:Math.exp(2)},sigmoid:{f:x=>1/(1+Math.exp(-x)),lo:-6,hi:6,m2:1/(6*Math.sqrt(3))}};
  function approximate({fn='sin',segments=16,bits=16,fraction=10,samples=4097}={}){
    const spec=functions[fn];
    if(!spec||!Number.isInteger(segments)||segments<1||segments>256||!Number.isInteger(bits)||bits<4||bits>24||!Number.isInteger(fraction)||fraction<0||fraction>20||!Number.isInteger(samples)||samples<2||samples>100001)throw Error('Invalid approximation parameters');
    const step=(spec.hi-spec.lo)/segments,q=2**-fraction,min=-(2**(bits-1))*q,max=(2**(bits-1)-1)*q;
    const nodes=Array.from({length:segments+1},(_,i)=>spec.f(spec.lo+i*step));
    const points=[];let maxAbs=0,maxRel=0,relCount=0,saturated=0,worst=null;
    for(let i=0;i<samples;i++){
      const x=spec.lo+(spec.hi-spec.lo)*i/(samples-1),j=Math.min(segments-1,Math.floor((x-spec.lo)/step));
      const t=(x-(spec.lo+j*step))/step,ideal=nodes[j]*(1-t)+nodes[j+1]*t;
      const rounded=Math.round(ideal/q)*q,y=Math.max(min,Math.min(max,rounded)),truth=spec.f(x),abs=Math.abs(y-truth);
      if(rounded<min||rounded>max)saturated++;
      if(abs>=maxAbs){maxAbs=abs;worst={x,y,truth,abs};}
      if(Math.abs(truth)>=0.01){maxRel=Math.max(maxRel,abs/Math.abs(truth));relCount++;}
      if(i%Math.max(1,Math.floor(samples/256))===0||i===samples-1)points.push({x,y,truth,error:abs});
    }
    return {fn,segments,bits,fraction,samples,lo:spec.lo,hi:spec.hi,step,q,min,max,maxAbs,maxRel,relCount,saturated,worst,points,tableBits:(segments+1)*bits,interpolationBound:spec.m2*step*step/8,bound:spec.m2*step*step/8+q/2};
  }
  function pipeline({stages=4,count=12,gap=1,period=5,blocked=0}={}){
    if(![stages,count,gap,period,blocked].every(Number.isInteger)||stages<1||stages>12||count<1||count>64||gap<1||gap>10||period<1||blocked<0||blocked>period)throw Error('Invalid pipeline parameters');
    let slots=Array(stages).fill(null),queue=[],accepted=[],outputs=[],events=[],maxQueue=0;
    const limit=Math.min(2000,count*gap+count*stages*period+period+10);
    for(let cycle=0;cycle<limit;cycle++){
      if(cycle%gap===0&&cycle/gap<count)queue.push(cycle/gap);
      maxQueue=Math.max(maxQueue,queue.length);
      const ready=cycle%period>=blocked,old=slots.slice(),moves=Array(stages).fill(false);
      for(let j=stages-1;j>=0;j--)moves[j]=old[j]!==null&&(j===stages-1?ready:old[j+1]===null||moves[j+1]);
      const exit=moves[stages-1]?old[stages-1]:null;
      if(exit!==null)outputs.push({id:exit,cycle});
      for(let j=stages-1;j>=0;j--){if(moves[j])slots[j]=null;if(j>0&&moves[j-1])slots[j]=old[j-1];}
      let enter=null;
      if(slots[0]===null&&queue.length){enter=queue.shift();slots[0]=enter;accepted.push({id:enter,cycle});}
      events.push({cycle,ready,before:old,slots:slots.slice(),queue:queue.slice(),enter,exit,moves});
      if(outputs.length===count)break;
      if(blocked===period&&cycle>Math.max(count*gap,stages)+5)break;
    }
    const totalCycles=events.length,latencies=outputs.map(o=>o.cycle-accepted.find(a=>a.id===o.id).cycle);
    const elapsedCycles=events.at(-1).cycle-(accepted[0]?.cycle??0);
    return {stages,count,gap,period,blocked,events,accepted,outputs,maxQueue,totalCycles,elapsedCycles,complete:outputs.length===count,latencies,throughput:outputs.length/totalCycles,elapsedThroughput:elapsedCycles>0?outputs.length/elapsedCycles:0};
  }
  const vectors={normal:[[1,2],[10,20],[40,60],[0,0]],boundary:[[0,255],[127,128],[128,128],[255,1],[255,255]],mixed:[[3,5],[200,100],[0,255],[128,127],[255,2],[17,19]]};
  function verify({variant='wrap',suite='normal',oracle='independent'}={}){
    if(!['correct','wrap','signed'].includes(variant)||!vectors[suite]||!['independent','copied'].includes(oracle))throw Error('Invalid verification parameters');
    const impl=(a,b)=>variant==='correct'?Math.min(255,a+b):variant==='wrap'?(a+b)&255:Math.max(0,Math.min(255,(a>=128?a-256:a)+(b>=128?b-256:b)));
    const rows=vectors[suite].map(([a,b])=>{const truth=Math.min(255,a+b),actual=impl(a,b),expected=oracle==='copied'?impl(a,b):truth;return {a,b,truth,actual,expected,pass:actual===expected,correct:actual===truth};});
    return {variant,suite,oracle,rows,passed:rows.filter(r=>r.pass).length,trueCorrect:rows.filter(r=>r.correct).length,total:rows.length,coverage:rows.length/65536};
  }
  const ppaData=[{id:'baseline',name:'基线',area:100,delay:1.8,power:50,error:0.002},{id:'small',name:'小表',area:75,delay:1.6,power:38,error:0.012},{id:'pipeline',name:'深流水',area:122,delay:1.1,power:56,error:0.002},{id:'balanced',name:'均衡候选',area:90,delay:1.5,power:44,error:0.003},{id:'dominated',name:'被支配候选',area:115,delay:1.9,power:55,error:0.004}];
  function pareto({maxDelay=1.8,maxError=0.005}={}){
    if(!Number.isFinite(maxDelay)||!Number.isFinite(maxError)||maxDelay<=0||maxError<0)throw Error('Invalid constraints');
    const feasible=ppaData.filter(p=>p.delay<=maxDelay&&p.error<=maxError);
    return ppaData.map(p=>({...p,feasible:feasible.includes(p),pareto:feasible.includes(p)&&!feasible.some(q=>q!==p&&q.area<=p.area&&q.delay<=p.delay&&q.power<=p.power&&(q.area<p.area||q.delay<p.delay||q.power<p.power)),areaSaving:1-p.area/100,powerSaving:1-p.power/50}));
  }
  function roofline({operations=512,bytes=64,peak=128,bandwidth=32,utilization=0.5,launch=5,serial=0}={}){
    if(![operations,bytes,peak,bandwidth,utilization,launch].every(Number.isFinite)||operations<0||bytes<=0||peak<=0||bandwidth<=0||utilization<=0||utilization>1||launch<0)throw Error('Invalid roofline parameters');
    const compute=operations/peak,memory=bytes/(bandwidth*utilization),work=Number(serial)?compute+memory:Math.max(compute,memory);
    return {compute,memory,work,total:work+launch/1000,intensity:operations/bytes,effectiveBandwidth:bandwidth*utilization,rateBound:Math.min(peak,operations/bytes*bandwidth*utilization)};
  }
  const api={approximate,pipeline,verify,pareto,roofline,ppaData};root.LabModels=api;
  if(typeof module!=='undefined'&&module.exports)module.exports=api;
})(typeof window!=='undefined'?window:globalThis);
