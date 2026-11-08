(function(root){
'use strict';
const VERSION=2, DEFAULT_COURSE='ai-workflow-learning-lab';let activeCourse=DEFAULT_COURSE;
const courseId=d=>typeof d?.id==='string'&&/^[a-z0-9][a-z0-9-]{2,80}$/.test(d.id)?d.id:DEFAULT_COURSE;
const plain=v=>v!==null&&typeof v==='object'&&!Array.isArray(v)&&Object.getPrototypeOf(v)===Object.prototype;
const safeKey=k=>!['__proto__','prototype','constructor'].includes(k);
const empty=(id=activeCourse)=>({version:VERSION,course:id,reading:[],notes:{},answers:{},drafts:{},evidence:{},labs:{},review:{intervals:[1,3,7,14],records:{}},theme:'light'});
function sanitize(input,course,strict=false){
  const expectedCourse=courseId(course);if(!plain(input)||input.version!==VERSION||input.course!==expectedCourse)throw new Error('备份版本或课程不匹配');
  const allowed=['version','course','reading','notes','answers','drafts','evidence','labs','review','theme'];
  if(strict&&Object.keys(input).some(k=>!allowed.includes(k)))throw new Error('备份包含未知字段');
  const out=empty(expectedCourse),mids=new Set(course.modules.map(m=>m.id));
  const quizzes=new Map(course.modules.flatMap(m=>(m.quiz||[]).map((q,i)=>[m.id+':'+i,q])));
  const exercises=new Map(course.modules.flatMap(m=>(m.exercises||[]).map(q=>[m.id+':'+q.id,q])));
  if(!Array.isArray(input.reading)||!plain(input.notes)||!plain(input.answers)||!plain(input.drafts)||!plain(input.evidence)||!plain(input.labs)||!plain(input.review)||!plain(input.review.records))throw new Error('备份字段结构不完整');
  out.reading=[...new Set(input.reading.filter(id=>mids.has(id)))];
  for(const [id,text] of Object.entries(input.notes))if(mids.has(id)&&typeof text==='string')out.notes[id]=text.slice(0,50000);
  for(const [id,answer] of Object.entries(input.answers))if(quizzes.has(id)&&Number.isInteger(answer)&&answer>=0&&answer<quizzes.get(id).options.length)out.answers[id]=answer;
  for(const [id,text] of Object.entries(input.drafts))if(exercises.has(id)&&typeof text==='string')out.drafts[id]=text.slice(0,50000);
  for(const [id,item] of Object.entries(input.evidence))if(exercises.has(id)&&plain(item)&&Number.isInteger(item.score)&&item.score>=0&&item.score<=exercises.get(id).maxScore&&typeof item.at==='string'&&Number.isFinite(Date.parse(item.at)))out.evidence[id]={score:item.score,at:item.at,method:'self'};
  const labids=new Set((course.labs||[]).map(l=>l.id));
  function jsonSafe(value,depth=0){if(depth>10)throw new Error('实验备份嵌套过深');if(value===null||typeof value==='boolean'||typeof value==='string'&&value.length<=50000||typeof value==='number'&&Number.isFinite(value))return value;if(Array.isArray(value)&&value.length<=1000)return value.map(v=>jsonSafe(v,depth+1));if(plain(value)&&Object.keys(value).length<=100)return Object.fromEntries(Object.entries(value).filter(([k])=>safeKey(k)).map(([k,v])=>[k,jsonSafe(v,depth+1)]));throw new Error('实验备份包含无效数据');}
  for(const [id,item] of Object.entries(input.labs))if(labids.has(id)&&plain(item))out.labs[id]=jsonSafe(item);
  const ints=input.review.intervals;if(!Array.isArray(ints)||!ints.length||ints.length>8||ints.some((n,i)=>!Number.isInteger(n)||n<1||n>365||i>0&&n<=ints[i-1]))throw new Error('复习间隔应为递增的 1–365 天整数');out.review.intervals=ints;
  for(const [id,item] of Object.entries(input.review.records))if(mids.has(id)&&plain(item)&&Number.isInteger(item.stage)&&item.stage>=0&&item.stage<8&&typeof item.due==='string'&&Number.isFinite(Date.parse(item.due)))out.review.records[id]={stage:item.stage,due:item.due};
  out.theme=input.theme==='dark'?'dark':'light';return out;
}
function load(course){activeCourse=courseId(course);try{return sanitize(JSON.parse(localStorage.getItem(activeCourse+'-v2')),course);}catch{return empty();}}
function save(state){localStorage.setItem(state.course+'-v2',JSON.stringify(state));}
function review(state,id,success,now=new Date()){
  const previous=state.review.records[id];const stage=success?Math.min(previous?previous.stage+1:0,state.review.intervals.length-1):0;
  const due=new Date(now);due.setDate(due.getDate()+state.review.intervals[stage]);state.review.records[id]={stage,due:due.toISOString()};
}
const api={VERSION,get COURSE(){return activeCourse;},get KEY(){return activeCourse+'-v2';},empty,sanitize,load,save,review};root.CourseState=api;if(typeof module!=='undefined')module.exports=api;
})(typeof window!=='undefined'?window:globalThis);
