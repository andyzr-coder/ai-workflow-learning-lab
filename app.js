(function(){
'use strict';
const D=window.COURSE,V=window.CourseViews,S=window.CourseState,$=q=>document.querySelector(q);
let state=S.load(D),toastTimer,localVideo=null,comparedFlows=new Set();
const pageTitles={home:'学习总览',map:'知识与依赖',path:'学习路线',timeline:'录屏归纳',flows:'工程 Flow',lab:'交互实验',practice:'能力训练',glossary:'术语速查',sources:'证据与来源',review:'间隔复习',notes:'笔记与备份'};
const route=()=>location.hash.replace(/^#\/?/,'').split('/').filter(Boolean);
function toast(message){$('#toast').textContent=message;$('#toast').classList.add('visible');clearTimeout(toastTimer);toastTimer=setTimeout(()=>$('#toast').classList.remove('visible'),3200);}
function save(){try{S.save(state);}catch{toast('浏览器存储不可用，请导出备份保存学习记录。');}}
function syncNav(){const sidebar=$('#sidebar'),hidden=window.matchMedia('(max-width:900px)').matches&&!sidebar.classList.contains('open');sidebar.inert=hidden;if(hidden)sidebar.setAttribute('aria-hidden','true');else sidebar.removeAttribute('aria-hidden');}
function sidebar(){const [page='home',id]=route();$('#sidebar').innerHTML=V.sidebar(D,state,page,id);}
function render(){
 const [page='home',id,section]=route();sidebar();document.body.classList.toggle('dark',state.theme==='dark');
 const label=page==='lesson'?(D.modules.find(m=>m.id===id)?.title||'模块学习'):(pageTitles[page]||'学习总览');
 $('#breadcrumb').textContent=D.title+' / '+label;document.title=label+' · '+D.title;
 $('#footer').textContent='资料核对至 '+D.updated+' · 阅读记录与能力证据分别保存 · 学习数据仅保存在当前浏览器';
 if(D.repository)$('#github-link').href=D.repository;
 const views={home:()=>V.home(D,state),map:()=>V.intro('关键问题 → 先修 → 机制 → 验证','知识与依赖','箭头表示学习依赖，横向关系用于比较或迁移。熟悉的内容可跳过，但建议先尝试本章独立题。')+V.tree(D,state)+V.coverage(D),path:()=>V.route(D,id),lesson:()=>V.lesson(D,state,id),timeline:()=>V.timeline(D),flows:()=>V.flows(D),practice:()=>V.practice(D,state),glossary:()=>V.glossary(D),sources:()=>V.intro('一手资料 · 版本 · 阅读范围','证据与来源','课程中的重要结论应回到原始资料核对。教学算例不等于实测，产品目标不等于已实现能力。')+V.sourceList(D),notes:()=>V.notes(D,state),review:()=>V.review(D,state),lab:()=>V.lab(D,id)};
 $('#main').innerHTML=(views[page]||views.home)();$('#sidebar').classList.remove('open');$('#menu-button').setAttribute('aria-expanded','false');syncNav();
 if(page==='lab'){const host=$('#lab-host');if(host){const lid=host.dataset.lab;if(typeof window.renderLab==='function')window.renderLab(lid,host,state.labs[lid]||{},next=>{state.labs[lid]=next;save();});else host.innerHTML='<p>实验组件尚未加载，请刷新页面。</p>';}}
 if(page==='timeline')attachLocalVideo();
 if(page==='flows'){$('#flow-comparison').innerHTML=V.flowComparison(D,comparedFlows);document.querySelectorAll('[data-flow-compare]').forEach(el=>el.checked=comparedFlows.has(el.dataset.flowCompare));}
 requestAnimationFrame(()=>{const target=section?document.getElementById('sec-'+section):page==='sources'&&id?document.getElementById('source-'+id):null;if(target)target.scrollIntoView({block:'start'});else window.scrollTo(0,0);});
}
function strip(html){const el=document.createElement('div');el.innerHTML=html;return el.textContent||'';}
function search(query){
 const q=query.trim().toLowerCase(),results=[];
 const add=(title,description,url,type)=>{const content=title+' '+description;if(!q||content.toLowerCase().includes(q))results.push({title,description,url,type});};
 for(const m of D.modules){add(m.title,m.intro,'#/lesson/'+m.id,'模块');for(const sec of m.sections||[])add(sec.title,strip(sec.html),'#/lesson/'+m.id+'/'+sec.id,m.title);for(const ex of m.exercises||[])add(ex.prompt,'独立练习：先作答，再展开参考答案与自评量表。 '+V.text(ex.scaffold),'#/lesson/'+m.id+'/exercises','练习');}
 for(const g of D.glossary||[])add(g.term+' · '+g.zh,g.definition,'#/glossary','术语');
 for(const s of D.sources)add(s.title,[s.evidence,s.version,s.reading].filter(Boolean).join(' '),'#/sources/'+s.id,'来源');
 for(const f of D.flows||[])add(f.title,V.text(f.problem),'#/flows','工程 Flow');
 $('#search-results').innerHTML=results.slice(0,q?60:6).map(r=>{const index=r.description.toLowerCase().indexOf(q);return `<a class="search-result" href="${V.esc(r.url)}"><span class="badge">${V.esc(r.type)}</span> ${V.esc(r.title)}<small>${V.esc(r.description.slice(Math.max(0,index-30),Math.max(0,index-30)+160))}</small></a>`;}).join('')||'<p class="empty">没有匹配内容，试试英文术语或相关机制。</p>';
}
function openSearch(){if(!$('#search-dialog').open)$('#search-dialog').showModal();$('#global-search').focus();search($('#global-search').value);}
function attachLocalVideo(){const video=$('#timeline-video');if(!video)return;if(localVideo){video.src=localVideo.url;video.hidden=false;$('#video-status').textContent='本地文件：'+localVideo.name+'（仅当前浏览器会话）';$('#clear-local-video').hidden=false;}else{video.removeAttribute('src');video.hidden=true;$('#video-status').textContent='尚未选择视频；仍可阅读下方归纳。';$('#clear-local-video').hidden=true;}}
function quizByKey(key){const at=key.lastIndexOf(':'),m=D.modules.find(m=>m.id===key.slice(0,at));return {m,q:m?.quiz?.[Number(key.slice(at+1))],i:Number(key.slice(at+1))};}
function updateQuiz(card){const {m,q,i}=quizByKey(card.dataset.quiz);if(m&&q)card.outerHTML=V.quiz(m,q,i,state);}
document.addEventListener('click',e=>{
 const button=e.target.closest('button,a');if(!button)return;
 if(button.classList.contains('skip-link')){e.preventDefault();$('#main').focus();$('#main').scrollIntoView({block:'start'});return;}
 if(button.closest('#sidebar')&&button.tagName==='A'){$('#sidebar').classList.remove('open');$('#menu-button').setAttribute('aria-expanded','false');syncNav();}
 if(button.dataset.seek!==undefined){const video=$('#timeline-video'),seek=Number(button.dataset.seek);if(!localVideo||!video){toast('请先选择电脑上的原始录屏文件。');return;}const jump=()=>{video.currentTime=Math.min(seek,Number.isFinite(video.duration)?video.duration:seek);video.scrollIntoView({block:'center'});video.focus();toast('已定位到所选时间，可点击播放。');};if(video.readyState>=1)jump();else video.addEventListener('loadedmetadata',jump,{once:true});return;}
 if(button.id==='clear-local-video'){if(localVideo)URL.revokeObjectURL(localVideo.url);localVideo=null;attachLocalVideo();$('#timeline-video-file').value='';toast('已移除浏览器引用；原文件保持不变。');return;}
 if(button.closest('#search-results'))$('#search-dialog').close();
 if(button.id==='search-trigger'){openSearch();return;}if(button.id==='close-search'){$('#search-dialog').close();return;}
 if(button.id==='menu-button'){const expanded=$('#sidebar').classList.toggle('open');button.setAttribute('aria-expanded',String(expanded));syncNav();if(expanded)$('#sidebar .nav-item')?.focus();return;}
 if(button.id==='theme-button'){state.theme=state.theme==='dark'?'light':'dark';document.body.classList.toggle('dark',state.theme==='dark');save();return;}
 if(button.dataset.read){const id=button.dataset.read;state.reading=state.reading.includes(id)?state.reading.filter(x=>x!==id):[...state.reading,id];save();sidebar();button.textContent=state.reading.includes(id)?'✓ 已阅读 · 撤销标记':'标记已阅读';toast('阅读记录已更新；能力证据单独记录。');return;}
 if(button.dataset.choice!==undefined){const card=button.closest('[data-quiz]'),key=card.dataset.quiz,{q}=quizByKey(key),a=Number(button.dataset.choice);if(q&&Number.isInteger(a)&&a>=0&&a<q.options.length){state.answers[key]=a;save();updateQuiz(card);}return;}
 if(button.dataset.retry){const card=button.closest('[data-quiz]');delete state.answers[button.dataset.retry];save();updateQuiz(card);return;}
 if(button.dataset.review){S.review(state,button.dataset.review,button.dataset.success==='true');save();render();toast('复习安排已更新。');return;}
 if(button.id==='export-progress'){const blob=new Blob([JSON.stringify(state,null,2)],{type:'application/json'}),url=URL.createObjectURL(blob),a=document.createElement('a');a.href=url;a.download='ai-workflow-learning-backup.json';a.click();setTimeout(()=>URL.revokeObjectURL(url),1000);toast('学习备份已导出。');return;}
 if(button.id==='import-progress'){$('#import-file').click();return;}
});
document.addEventListener('input',e=>{
 const el=e.target;if(el.id==='global-search'){search(el.value);return;}
 if(el.dataset.note){state.notes[el.dataset.note]=el.value;save();return;}
 if(el.dataset.draft){state.drafts[el.dataset.draft]=el.value;save();return;}
});
document.addEventListener('change',async e=>{
 const el=e.target;if(el.id==='practice-filter'){$('#practice-items').innerHTML=V.practiceItems(D,state,el.value);return;}
 if(el.dataset.flowCompare){if(el.checked&&comparedFlows.size>=3){el.checked=false;toast('最多同时比较三个 Flow。');return;}if(el.checked)comparedFlows.add(el.dataset.flowCompare);else comparedFlows.delete(el.dataset.flowCompare);$('#flow-comparison').innerHTML=V.flowComparison(D,comparedFlows);return;}
 if(el.id==='timeline-video-file'){const file=el.files[0];if(!file)return;if(localVideo)URL.revokeObjectURL(localVideo.url);localVideo={url:URL.createObjectURL(file),name:file.name};attachLocalVideo();return;}
 if(el.dataset.score&&el.value!==''){
  const key=el.dataset.score,at=key.indexOf(':'),id=key.slice(0,at),q=D.modules.find(m=>m.id===id)?.exercises?.find(q=>q.id===key.slice(at+1)),score=Number(el.value);
  if(!q||!Number.isInteger(score)||score<0||score>q.maxScore)return;state.evidence[key]={score,at:new Date().toISOString(),method:'self'};
  if(!state.review.records[id])S.review(state,id,false);save();sidebar();const status=el.closest('.answer-detail').querySelector('.score-status');status.textContent=` 已记录 ${score}/${q.maxScore} · 自评`;toast('已记录自评分，并安排间隔复习。');return;
 }
 if(el.id==='import-file'){
  const file=el.files[0];if(!file)return;if(file.size>5e6){toast('备份超过 5 MB，请选择本站导出的学习备份。');return;}
  try{const imported=S.sanitize(JSON.parse(await file.text()),D,true);state.reading=[...new Set([...state.reading,...imported.reading])];for(const key of ['notes','answers','drafts','evidence','labs'])Object.assign(state[key],imported[key]);state.review.intervals=imported.review.intervals;Object.assign(state.review.records,imported.review.records);save();render();toast('已合并导入学习记录。');}catch(err){toast('无法导入：'+err.message);}return;
 }
});
document.addEventListener('submit',e=>{if(e.target.id!=='interval-form')return;e.preventDefault();const values=$('#review-intervals').value.split(/[,，]/).map(v=>Number(v.trim()));if(!values.length||values.length>8||values.some((v,i)=>!Number.isInteger(v)||v<1||v>365||i>0&&v<=values[i-1])){toast('请填写递增的 1–365 天整数，例如 1,3,7,14。');return;}state.review.intervals=values;save();toast('复习间隔已保存，将用于后续安排。');});
document.addEventListener('keydown',e=>{if(e.key==='/'&&!['INPUT','TEXTAREA','SELECT'].includes(document.activeElement.tagName)){e.preventDefault();openSearch();}if(e.key==='Escape'){const wasOpen=$('#sidebar').classList.contains('open');$('#sidebar').classList.remove('open');$('#menu-button').setAttribute('aria-expanded','false');syncNav();if(wasOpen)$('#menu-button').focus();}});
window.matchMedia('(max-width:900px)').addEventListener('change',syncNav);window.addEventListener('beforeunload',()=>{if(localVideo)URL.revokeObjectURL(localVideo.url);});window.addEventListener('hashchange',()=>{render();$('#main').focus({preventScroll:true});});render();
})();
