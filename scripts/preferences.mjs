import { readFile, readdir, mkdir, writeFile } from 'node:fs/promises';
import { resolve } from 'node:path';

export function feedback(value) {
  if(value === undefined) return {scope:'similar',reason:''};
  if(!value || !['similar','article'].includes(value.scope) || typeof value.reason!=='string' || value.reason.length>5000) throw new Error('Invalid recommendation feedback');
  return {scope:value.scope,reason:value.reason.trim()};
}
const canonical=url=>{const u=new URL(url);u.hash='';for(const key of [...u.searchParams.keys()])if(/^utm_/i.test(key))u.searchParams.delete(key);return u.href;};
const norm=value=>value.trim().toLowerCase().replace(/\s+/g,' ');

export function preferenceProfile(batches,{before='9999-12-31'}={}) {
  // One current vote per original article, including a later reversal to pending.
  const latest=new Map();
  for(const batch of [...batches].sort((a,b)=>a.date.localeCompare(b.date))) {
    if(batch.date>=before) continue;
    for(const c of batch.candidates||[]) {
      const url=canonical(c.url),at=c.history?.at(-1)?.at||c.reviewedAt||batch.date;
      const previous=latest.get(url);
      if(!previous||at>=previous.at)latest.set(url,{...c,url,at,batch:batch.date});
    }
  }
  const votes=[...latest.values()].filter(c=>['approved','rejected'].includes(c.decision));
  const topicMap=new Map(),sourceMap=new Map();
  function tally(map,key,label,c){if(!map.has(key))map.set(key,{name:label,kept:0,passed:0,examples:[]});const row=map.get(key);row[c.decision==='approved'?'kept':'passed']++;row.examples.push({id:c.id,title:c.title,url:c.url,decision:c.decision,batch:c.batch});}
  for(const c of votes) {
    if(feedback(c.preferenceFeedback).scope==='article')continue;
    const topics=c.discovery?.topics?.length?c.discovery.topics:[c.category||'Uncategorized'];
    for(const topic of new Map(topics.map(t=>[norm(t),t])).values())tally(topicMap,norm(topic),topic,c);
    const host=new URL(c.url).hostname.replace(/^www\./,'');tally(sourceMap,host,host,c);
  }
  const rows=map=>[...map.values()].map(row=>({...row,signal:(row.kept-row.passed)/(row.kept+row.passed+4),confidence:row.kept+row.passed<3?'early':'emerging'})).sort((a,b)=>b.signal-a.signal||a.name.localeCompare(b.name));
  return {version:1,before,reviewed:votes.length,kept:votes.filter(c=>c.decision==='approved').length,passed:votes.filter(c=>c.decision==='rejected').length,
    topics:rows(topicMap),sources:rows(sourceMap),
    explicitFeedback:votes.filter(c=>feedback(c.preferenceFeedback).reason).map(c=>({candidateId:c.id,title:c.title,url:c.url,decision:c.decision,...feedback(c.preferenceFeedback),batch:c.batch})),
    reviewedArticles:votes.map(c=>({url:c.url,title:c.title,decision:c.decision,batch:c.batch})),
    policy:{explorationShare:0.25,notes:'Use explicit preference reasons first. Topic/source signals are tentative research hints, never bans. Source signals matter less than topic fit. Article-only feedback does not generalize. Editing notes are copy instructions, not taste evidence. Keep roughly a quarter of the shortlist exploratory. Never infer approval or repeatedly recommend a reviewed article.'}};
}

export async function readPreferences(root=process.cwd(),options={}) {
  const directory=resolve(root,'content/review');
  let files;try{files=await readdir(directory);}catch(e){if(e.code==='ENOENT')return preferenceProfile([],options);throw e;}
  const batches=await Promise.all(files.filter(f=>/^\d{4}-\d{2}-\d{2}\.json$/.test(f)).map(async f=>JSON.parse(await readFile(resolve(directory,f),'utf8'))));
  return preferenceProfile(batches,options);
}

export async function exportPreferences(root=process.cwd(),options={}) {
  const profile=await readPreferences(root,options),dir=resolve(root,'exports/preferences');await mkdir(dir,{recursive:true});
  const name=options.before||'latest';
  await writeFile(resolve(dir,`${name}.json`),JSON.stringify(profile,null,2)+'\n');
  return profile;
}
