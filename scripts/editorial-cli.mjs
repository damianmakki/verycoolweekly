import { readFile, writeFile, mkdir, rename } from 'node:fs/promises';
import { reviewCandidate, applyEditingNote, reviewPreview, buildHopper, validateBatch } from './editorial.mjs';
import { integrateTags } from './integrate-tags.mjs';
const args=process.argv.slice(2),command=args[0];
const arg=key=>{const i=args.indexOf(key);return i>=0?args[i+1]:undefined;};
const date=arg('--batch');
if(!/^\d{4}-\d{2}-\d{2}$/.test(date||''))throw new Error('Use --batch YYYY-MM-DD');
const path=`content/review/${date}.json`;
const batch=JSON.parse(await readFile(path,'utf8'));
let errors=validateBatch(batch);if(errors.length)throw new Error(errors.join('\n'));
if(command==='review'){
 const input=JSON.parse(await readFile(arg('--input'),'utf8'));
 const seen=new Set();
 for(const feedback of input){
  if(seen.has(feedback.id))throw new Error('Duplicate decision');seen.add(feedback.id);
  const n=batch.candidates.findIndex(c=>c.id===feedback.id);if(n<0)throw new Error(`Unknown candidate ${feedback.id}`);
  batch.candidates[n]=reviewCandidate(batch.candidates[n],feedback);
 }
 await save();
}else if(command==='apply-notes'){
 const updates=JSON.parse(await readFile(arg('--input'),'utf8'));
 for(const update of updates){
  const n=batch.candidates.findIndex(c=>c.id===update.id);if(n<0)throw new Error(`Unknown candidate ${update.id}`);
  batch.candidates[n]=applyEditingNote(batch.candidates[n],update.copy);
 }
 await save();
}else if(command==='integrate-tags'){
 batch.candidates=batch.candidates.map(c=>integrateTags(c));
 await save();
}else if(command==='hopper'){
 const [config,site]=await Promise.all(['social.config.json','site.config.json'].map(async p=>JSON.parse(await readFile(p,'utf8'))));
 const result=buildHopper(batch,config,site),dir=`exports/hopper/${date}`;
 await mkdir(dir,{recursive:true});
 await writeFile(`${dir}/issue.json`,JSON.stringify(result.issue,null,2)+'\n');
 await writeFile(`${dir}/queue.json`,JSON.stringify(result.manifest,null,2)+'\n');
  await writeFile(`${dir}/discovery.json`,JSON.stringify(result.manifest.discoveryPlan,null,2)+'\n');
 await writeFile(`${dir}/substack.html`,result.postHtml);
 await writeFile(`${dir}/email.html`,result.emailHtml);
 await writeFile(`${dir}/notes.txt`,result.notes.map(n=>`${n.scheduledAt}\n${n.text}`).join('\n\n---\n\n'));
 await writeFile(`${dir}/notes.html`,`<!doctype html><html lang="en"><head><meta charset="utf-8"><title>Very Cool Weekly Notes</title></head><body>${result.notes.map(n=>`<article>${n.html}</article>`).join('<hr>')}</body></html>`);
 await writeFile(`${dir}/x-posts.txt`,result.manifest.jobs.filter(j=>j.channel==='x').map(j=>`${j.scheduledAt}\n${j.text}`).join('\n\n---\n\n'));
 console.log(`Prepared ${result.manifest.selected.length} approved picks in ${dir}. No posts sent or scheduled.`);
}else if(command==='preview'){
 await mkdir('exports/review',{recursive:true});
 await writeFile(`exports/review/${date}.md`,reviewPreview(batch));
 console.log(`Review: exports/review/${date}.md`);
}else throw new Error('Commands: preview, review, apply-notes, integrate-tags, hopper');
async function save(){
 const tmp=`${path}.tmp`;await writeFile(tmp,JSON.stringify(batch,null,2)+'\n');await rename(tmp,path);
 try {
  const queuePath=`exports/hopper/${date}/queue.json`;
  const queue=JSON.parse(await readFile(queuePath,'utf8'));
  queue.invalidatedAt=new Date().toISOString();
  queue.jobs=queue.jobs.map(job=>({...job,state:'invalidated'}));
  await writeFile(queuePath,JSON.stringify(queue,null,2)+'\n');
 } catch(error) { if(error.code!=='ENOENT')throw error; }
 console.log(`Saved review decisions for ${date}; any previous hopper is invalidated.`);
}
