#!/usr/bin/env node
/* Deterministic offline handbook from the same public course.json as the website.
 * Requires Pandoc + Eisvogel + XeLaTeX. No private research input is read.
 * Usage: node tools/build-pdf.cjs [--content content/course.json] [--out dist/downloads/ai-workflow-handbook.pdf]
 */
'use strict';
const fs=require('node:fs'),path=require('node:path'),cp=require('node:child_process'),crypto=require('node:crypto');
const root=path.resolve(__dirname,'..'),args=process.argv.slice(2);
const arg=(key,def)=>args.includes(key)?args[args.indexOf(key)+1]:def;
const content=path.resolve(root,arg('--content','content/course.json'));
const output=path.resolve(root,arg('--out','dist/downloads/ai-workflow-handbook.pdf'));
const work=path.join(root,'output','pdf-build');fs.mkdirSync(work,{recursive:true});fs.mkdirSync(path.dirname(output),{recursive:true});
const d=JSON.parse(fs.readFileSync(content,'utf8').replace(/^\uFEFF/,''));
const pandoc=process.env.PANDOC||'F:\\office_beautify\\pandoc\\pandoc.exe';
const xelatex=process.env.XELATEX||'F:\\office_beautify\\TinyTeX\\bin\\windows\\xelatex.exe';
const template=process.env.EISVOGEL||'F:\\office_beautify\\pandoc\\templates\\eisvogel.latex';
const localTemplate=path.join(work,'eisvogel-offline.latex');
fs.writeFileSync(localTemplate,fs.readFileSync(template,'utf8').replace('\\newgeometry{left=6cm}','\\newgeometry{left=22mm,right=22mm,top=25mm,bottom=25mm}').replace(/\\huge \\textbf\{\\textsf\{\$title\$\}\}/g,'\\fontsize{32}{42}\\selectfont \\textbf{\\textsf{$title$}}'));
const e=v=>String(v??'').replace(/[&<>"']/g,c=>({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[c]));
const plain=v=>Array.isArray(v)?v.map(plain).join('；'):v&&typeof v==='object'?Object.values(v).map(plain).join('；'):String(v??'');
const p=(label,v)=>v===undefined||v===null||v===''?'':`<p>${label?`<strong>${e(label)}：</strong>`:''}${e(plain(v)).replace(/\n/g,'<br>')}</p>`;
const list=a=>`<ul>${(a||[]).map(x=>`<li>${e(plain(x))}</li>`).join('')}</ul>`;
const byModule=new Map(d.modules.map(x=>[x.id,x])),bySource=new Map(d.sources.map(x=>[x.id,x]));
const ml=id=>byModule.has(id)?`<a href="#${e(id)}">${e(byModule.get(id).title)}</a>`:e(id);
const sl=id=>bySource.has(id)?`<a href="#source-${e(id)}">[${e(id)}] ${e(bySource.get(id).title)}</a>`:e(id);
const time=n=>{n=Math.floor(Number(n)||0);return [Math.floor(n/3600),Math.floor(n/60)%60,n%60].map(v=>String(v).padStart(2,'0')).join(':');};
const website=(d.website||'https://andyzr-coder.github.io/ai-workflow-learning-lab/').replace(/\/?$/,'/');
function offline(html){
  return String(html||'')
    .replace(/href="#\/lesson\/([^/"#]+)(?:\/([^"#]+))?"/g,(_,m,s)=>`href="#${m}${s?'-'+s:''}"`)
    .replace(/href="#\/sources\/([^"#]+)"/g,'href="#source-$1"')
    .replace(/href="#\/lab(?:\/[^"#]+)?"/g,'href="#experiments"')
    .replace(/href="#\/timeline"/g,'href="#recording"')
    .replace(/href="downloads\/([^"#]+)"/g,(_,f)=>`href="${website}downloads/${f}"`)
    .replace(/先做“独立 oracle”交互实验：预测普通测试能否识别错误，再切换边界输入，最后把参考模型改为复制实现。/g,'先完成“独立 oracle”纸面推演：预测普通输入能否识别错误，再分别列出边界输入，以及参考模型复制实现时的结果。')
    .replace(/网站分别记录阅读、自评证据与复习日期；开放答案不做自动语义评分。/g,'在学习日志中分别记录阅读、自评证据与复习日期；开放答案按本手册量表自评。')
    .replace(/交互实验/g,'配套教学模型')
    .replace(/<em>/g,'<span>').replace(/<\/em>/g,'</span>')
    .replace(/[\u2011\u2012\u2013\u2014]/g,'-');
}
function exercise(q,i){return `<div class="exercise"><h3>练习 ${i+1} · ${e(q.type||'独立题')}</h3>${p('题目',q.prompt)}${p('补全步骤与提示',q.scaffold)}<p><em>先独立写下假设、过程、结果和验证方法，再核对下面的答案。</em></p><h4>参考答案</h4>${p('',q.answer)}<h4>自评量表</h4>${list(q.rubric)}${p('评分',`满分 ${q.maxScore} 分；开放答案采用自评，不自动判定正确。`)}</div>`;}
function chapter(m,i){return `<section id="${e(m.id)}"><h1>${e(m.title)}</h1><p><strong>模块 ${i+1}</strong> · ${m.level==='advanced'?'深入选学':'必须掌握'} · 建议 ${m.minutes||30} 分钟</p>${p('',m.intro)}<p><strong>先修：</strong>${(m.prerequisites||[]).map(ml).join(' · ')||'无额外先修'}</p>${m.related?.length?`<p><strong>横向关联：</strong>${m.related.map(ml).join(' · ')}</p>`:''}<h2>能力目标</h2>${list(m.outcomes)}${(m.sections||[]).map(s=>`<section id="${e(m.id)}-${e(s.id)}"><h2>${e(s.title)}</h2>${offline(s.html).replace('<table>','<table><caption>表：'+e(s.title)+'</caption>')}</section>`).join('')}<h2>能力训练与完整答案</h2>${(m.exercises||[]).map(exercise).join('')}${m.interview?.length?`<h2>口述与追问</h2>${m.interview.map(q=>`<h3>${e(q.q)}</h3>${p('参考回答',q.answer)}${list(q.followups)}`).join('')}`:''}${m.quiz?.length?`<h2>快速检查</h2>${m.quiz.map((q,j)=>`<h3>${j+1}. ${e(q.q)}</h3><ol type="A">${q.options.map(o=>`<li>${e(o)}</li>`).join('')}</ol>${p('答案',`${String.fromCharCode(65+q.correct)}：${q.explanation}`)}`).join('')}`:''}<h2>来源与阅读边界</h2><ul>${(m.sourceIds||[]).map(id=>`<li>${sl(id)}</li>`).join('')}</ul></section>`;}
let html=`<html lang="zh-CN"><head><meta charset="utf-8"></head><body><section id="reading-guide"><h1>阅读说明</h1>${p('',d.subtitle)}${p('',d.scope)}<p>本手册把规格、功能、性能与 AI 工作流连接成一条可核验的证据链。建议先读示范，再补全步骤，最后独立完成变式；每道开放练习都附完整参考答案和自评量表。数值算例与录屏主张分开标注，工具能力与已执行证据分开说明。</p><p>这是离线静态版本。纸面推演、公式、题目、答案与来源均完整保留；需要运行代码的实验，应在本地下载公开示例后执行。外部来源及验证报告链接需要网络，PDF 内部目录和章节链接可直接跳转。</p><p><strong>课程网站：</strong><a href="${e(website)}">${e(website)}</a></p>${d.repository?`<p><strong>公开示例源码：</strong><a href="${e(d.repository)}">${e(d.repository)}</a></p>`:''}</section><section id="plan"><h1>学习目标与路线</h1><p>最终能力包括解释机制、画数据与控制路径、定量估算、调试反例、比较方案，以及设计独立验证。</p><h2>问题与能力对应</h2>${(d.coverage||[]).map((c,i)=>`<div><h3>${i+1}. ${e(c.question)}</h3>${p('层次',c.level==='advanced'?'深入选学':'必须掌握')}${p('先修',c.prior)}<p><strong>模块：</strong>${(Array.isArray(c.module)?c.module:[c.module]).filter(Boolean).map(ml).join(' · ')}</p>${p('练习与实验',c.exercise)}<p><strong>来源：</strong>${(c.sources||[]).map(sl).join(' · ')}</p></div>`).join('')}${(d.routes||[]).map(r=>`<h2>${e(r.title)}</h2>${(r.days||[]).map(day=>`<h3>${e(day.label)}</h3><p>${(day.modules||[]).map(ml).join(' · ')}</p>${p('能力产出',day.activity)}`).join('')}`).join('')}<h2>复习记录</h2><p>建议在 1、3、7、14 天后复习，可按需要调整。先凭记忆解释机制，再完成一个变式；若不能独立完成，缩短复习间隔。在纸面学习日志中分开记录阅读、练习证据和自评结果。</p></section><section id="recording"><h1>录屏归纳索引</h1><p>本节是匿名技术归纳，不包含原始音视频、人物信息、原始逐字稿或内部源码。时间码相对录屏起点；录制从介绍中途开始。自动摘要不作为新的发言或决议。</p>${(d.timeline||[]).map(t=>`<h2>${time(t.start)}-${time(t.end)} ${e(t.title)}</h2>${p('',t.summary)}${p('核对状态',t.confidence)}${t.module?`<p>${ml(t.module)}</p>`:''}`).join('')}</section>${d.modules.map(chapter).join('')}<section id="flows"><h1>工程 Flow 比较</h1>${(d.flows||[]).map(f=>`<h2>${e(f.title)}</h2>${p('问题',f.problem)}${p('基线',f.baseline)}<h3>机制与步骤</h3><ol>${(f.steps||[]).map(s=>`<li>${e(plain(s))}</li>`).join('')}</ol>${[['证据','evidence'],['成本','cost'],['适用条件','conditions'],['反例','counterexample'],['验证办法','validation']].map(([label,key])=>p(label,f[key])).join('')}<p>${(f.sourceIds||[]).map(sl).join(' · ')}</p>`).join('')}</section><section id="experiments"><h1>实验模型与边界</h1><p>以下提供离线预测、手算和边界测试任务。在线界面仅是这些模型的配套演示，不是本 PDF 内置功能。运行实验前先写预测，随后用公开示例代码或网站核对。</p>${(d.labs||[]).map(l=>`<section id="lab-${e(l.id)}"><h2>${e(l.title)}</h2>${[['模型','model'],['假设','assumptions'],['限制','limits'],['先预测','prediction'],['纸面任务','prompt'],['迁移变式','variation']].map(([label,key])=>p(label,l[key])).join('')}${l.module?`<p>${ml(l.module)}</p>`:''}</section>`).join('')}</section><section id="glossary"><h1>术语索引</h1>${(d.glossary||[]).map(g=>`<h2>${e(g.term)} · ${e(g.zh)}</h2>${p('',g.definition)}${g.module?`<p>${ml(g.module)}</p>`:''}`).join('')}</section><section id="sources"><h1>完整来源索引</h1><p>原规范、论文、代码和厂商文档版权属于原作者。这里提供原创教学整理和原始来源链接，不镜像全文。链接需联网访问；文档的适用版本、阅读范围和证据限制与正文同等重要。</p>${d.sources.map(s=>`<section class="source-entry" id="source-${e(s.id)}"><h2>[${e(s.id)}] ${e(s.title)}</h2>${p('类型与版本',[s.type,s.year,s.version||s.venue].filter(Boolean))}${p('支持的证据',s.evidence)}${p('阅读范围',s.reading||s.sections||s.scope)}${p('边界',s.access||s.limits)}${p('访问日期',s.accessed)}<p><a href="${e(s.url==='#/timeline'?'#recording':s.url)}">${e(s.url==='#/timeline'?'本手册录屏归纳索引':s.url)}</a></p></section>`).join('')}</section></body></html>`;
html=offline(html);
// This PDF must never imply controls are operable inside a static document.
if(/<script\b|<button\b|<input\b|onclick\s*=/.test(html))throw new Error('Interactive control leaked into PDF content');
const input=path.join(work,'handbook-offline.html'),meta=path.join(work,'metadata.json'),header=path.join(work,'header.tex'),filter=path.join(work,'layout.lua'),tex=path.join(work,'handbook.tex');
fs.writeFileSync(input,html);
fs.writeFileSync(meta,JSON.stringify({title:d.title,author:'离线学习手册 · 正文、练习与完整答案',date:`资料核对截至 ${d.updated}`,lang:'zh-CN',CJKmainfont:'Microsoft YaHei',CJKsansfont:'Microsoft YaHei',CJKmonofont:'Microsoft YaHei',mainfont:'Cambria',mainfontoptions:['Ligatures=NoCommon'],sansfont:'Arial',sansfontoptions:['Ligatures=NoCommon'],monofont:'Consolas',fontsize:'10pt',geometry:['a4paper','top=21mm','bottom=21mm','left=21mm','right=21mm'],linestretch:1.08,titlepage:true,'titlepage-rule-color':'187D74','toc-own-page':true,'toc-title':'目录','toc-depth':1,colorlinks:true,linkcolor:'teal',urlcolor:'teal','header-left':'AI 芯片工程研习室','header-right':'离线学习手册','footer-left':'公开脱敏课程 · 独立验证与证据','footer-right':'\\thepage',book:false},null,2));
fs.writeFileSync(header,String.raw`\usepackage{fvextra}
\usepackage{xurl}
\usepackage{needspace}
\fvset{breaklines=true,breakanywhere=true,fontsize=\small}
\DefineVerbatimEnvironment{Highlighting}{Verbatim}{commandchars=\\\{\},breaklines=true,breakanywhere=true,fontsize=\small}
\setlength{\emergencystretch}{3em}
\setlength{\parskip}{4pt}
\setlength{\headheight}{18pt}
\setcounter{tocdepth}{1}
\setcounter{secnumdepth}{2}
\renewcommand{\arraystretch}{1.25}
\AtBeginEnvironment{longtable}{\small}
\widowpenalty=10000
\clubpenalty=10000
`);
fs.writeFileSync(filter,String.raw`local first = true
function Header(h)
  if h.level == 1 then
    if first then first=false; return h end
    return {pandoc.RawBlock('latex','\\clearpage'),h}
  end
  return h
end
function CodeBlock(c)
  local _,count = c.text:gsub('\n','\n')
  local lines=math.min(count+3,24)
  return {pandoc.RawBlock('latex','\\Needspace{'..lines..'\\baselineskip}'),c}
end
function Table(t)
  return {pandoc.RawBlock('latex','\\Needspace{16\\baselineskip}'),t}
end
function Div(d)
  if d.classes:includes('source-entry') then
    table.insert(d.content,1,pandoc.RawBlock('latex','\\par\\noindent\\begin{minipage}{\\dimexpr\\linewidth-12pt\\relax}\\small'))
    table.insert(d.content,pandoc.RawBlock('latex','\\end{minipage}\\par\\vspace{0.7em}'))
    return d
  end
end
`);
const cmd=[input,'--from=html','--standalone','--template='+localTemplate,'--metadata-file='+meta,'--include-in-header='+header,'--lua-filter='+filter,'--number-sections','--toc','--toc-depth=1','--resource-path='+root,'--pdf-engine='+xelatex];
const env={...process.env,PATH:path.dirname(xelatex)+path.delimiter+process.env.PATH};
function run(argv){const r=cp.spawnSync(pandoc,argv,{cwd:root,env,encoding:'utf8',maxBuffer:32*1024*1024});fs.appendFileSync(path.join(work,'build.log'),(r.stdout||'')+(r.stderr||''));if(r.status!==0)throw new Error('Pandoc failed\n'+(r.stderr||r.stdout).slice(-5000));return r;}
fs.writeFileSync(path.join(work,'build.log'),'');
run([...cmd,'-o',tex]);
run([...cmd,'--verbose','-o',output]);
const manifest={content:content,contentSha256:crypto.createHash('sha256').update(fs.readFileSync(content)).digest('hex'),output,outputBytes:fs.statSync(output).size,modules:d.modules.length,openExercises:d.modules.reduce((n,m)=>n+(m.exercises||[]).length,0),quizzes:d.modules.reduce((n,m)=>n+(m.quiz||[]).length,0),flows:(d.flows||[]).length,sources:d.sources.length,timeline:(d.timeline||[]).length,createdAt:new Date().toISOString()};
fs.writeFileSync(path.join(work,'manifest.json'),JSON.stringify(manifest,null,2));console.log(JSON.stringify(manifest,null,2));




