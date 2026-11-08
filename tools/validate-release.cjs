const fs=require('node:fs'),path=require('node:path'),cp=require('node:child_process'),crypto=require('node:crypto'),assert=require('node:assert/strict');
const root=path.resolve(__dirname,'..'),dist=path.join(root,'dist');
const list=cp.spawnSync('git',['ls-files','--cached','--others','--exclude-standard'],{cwd:root,encoding:'utf8'});assert.equal(list.status,0);
const files=[...new Set(list.stdout.trim().split(/\r?\n/).filter(Boolean))];
const banned=[];for(const file of files){if(/\.(mp4|wav|srt|pem|key)$/i.test(file))banned.push(file);const body=fs.readFileSync(path.join(root,file),'utf8');if(/(?:ghp_|github_pat_)[A-Za-z0-9_]{30,}/.test(body)||body.includes('F:\\projects\\video-learning-private'))banned.push(file);}
assert.deepEqual(banned,[],'Private input or credential pattern detected in listed files (values never logged)');
const manifest=JSON.parse(fs.readFileSync(path.join(dist,'downloads/download-manifest.json'),'utf8'));
for(const item of manifest.files){const body=fs.readFileSync(path.join(dist,'downloads',item.file));assert.equal(body.length,item.bytes,item.file+' bytes');assert.equal(crypto.createHash('sha256').update(body).digest('hex'),item.sha256,item.file+' checksum');}
const pdf=fs.readFileSync(path.join(dist,'downloads/ai-workflow-handbook.pdf'));assert.equal(pdf.subarray(0,5).toString(),'%PDF-');
const html=fs.readFileSync(path.join(dist,'downloads/ai-workflow-handbook.html'),'utf8');const ids=new Set([...html.matchAll(/\bid="([^"]+)"/g)].map(x=>x[1]));
for(const [,hash] of html.matchAll(/href="#([^"]+)"/g))assert.ok(ids.has(decodeURIComponent(hash)),'Offline internal link: '+hash);
for(const file of ['index.html','content.js','style.css','enhancements.css','storage.js','views.js','models.js','labs.js','app.js'])assert.ok(fs.statSync(path.join(dist,file)).size>0,file);
const summary={ok:true,date:new Date().toISOString(),sourceFiles:files.length,downloads:manifest.files.length,offlineAnchors:ids.size,checks:['source privacy patterns','download checksums','PDF signature','offline internal links','static assets']};
fs.mkdirSync(path.join(root,'output/release'),{recursive:true});fs.writeFileSync(path.join(root,'output/release/report.json'),JSON.stringify(summary,null,2));console.log(JSON.stringify(summary,null,2));

