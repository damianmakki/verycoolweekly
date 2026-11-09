import {execFile} from 'node:child_process';
import {promisify} from 'node:util';
import {readFile,writeFile,mkdir,rm} from 'node:fs/promises';
import {tmpdir} from 'node:os';
import {join,resolve} from 'node:path';
import {fileURLToPath} from 'node:url';
import {postsHash} from './substack.mjs';

const exec=promisify(execFile);
const sourceRepo='damianmakki/verycoolweekly',websiteRepo='RuckusLabs/ruckuslabs.co';
const indexFile='content/substack/posts.json';
const root=resolve(fileURLToPath(new URL('..',import.meta.url)));
const run=async(cmd,args)=>{const r=await exec(cmd,args,{cwd:root,maxBuffer:8*1024*1024});return r.stdout.trim();};

export function validatePublicIndex(index,publicationUrl,now=Date.now()){
 if(index.publicationUrl!==publicationUrl||!Array.isArray(index.posts)||index.feedHash!==postsHash(index.posts))throw new Error('Invalid public snapshot.');
 if(index.posts.some(p=>!Number.isFinite(Date.parse(p.publishedAt))||Date.parse(p.publishedAt)>now))throw new Error('Refusing future or undated posts.');
}

// Run from a fresh checkout: the author's desk, private exports and unrelated work stay untouched.
export async function refreshPublishedIndex({publish=false}={}){
 const dirty=await run('git',['status','--porcelain']);
 if(dirty)throw new Error('Use a clean isolated newsletter checkout for the website refresh.');
 const remote=await run('git',['remote','get-url','origin']);
 if(!remote.endsWith(sourceRepo+'.git')&&!remote.endsWith(sourceRepo))throw new Error('Unexpected newsletter repository.');
 const site=JSON.parse(await readFile(join(root,'site.config.json'),'utf8'));
 if(site.publishing?.source!=='substack'||site.url!=='https://ruckuslabs.co/verycoolweekly/'||site.subscription.publicationUrl!=='https://verycoolweekly.substack.com/')throw new Error('Unexpected publication configuration.');
 const oldRaw=await readFile(join(root,indexFile),'utf8');
 const old=JSON.parse(oldRaw);
 await run('npm',['run','sync:substack','--','--strict']);
 const current=JSON.parse(await readFile(join(root,indexFile),'utf8'));
 validatePublicIndex(current,site.subscription.publicationUrl);
 const live=await fetch(new URL('assets/substack-index.json',site.url),{signal:AbortSignal.timeout(20000)});
 let liveHash=null;
 if(live.ok){const index=await live.json();if(index.publicationUrl!==current.publicationUrl||!Array.isArray(index.posts)||index.feedHash!==postsHash(index.posts))throw new Error('Invalid deployed public index.');liveHash=index.feedHash;}
 else if(live.status!==404)throw new Error(`Website index returned HTTP ${live.status}`);
 const sourceChanged=old.feedHash!==current.feedHash;
 if(!sourceChanged)await writeFile(join(root,indexFile),oldRaw);
 if(!sourceChanged&&liveHash===current.feedHash)return {status:'unchanged',feedHash:current.feedHash};
 await run('npm',['test']);await run('npm',['run','build']);await run('npm',['run','check']);
 const changes=(await run('git',['diff','--name-only'])).split('\n').filter(Boolean);
 if(changes.some(p=>p!==indexFile))throw new Error('Unexpected source changes; refusing to publish.');
 if(!publish)return {status:'validated-preview',sourceChanged,feedHash:current.feedHash,posts:current.posts.length};
 if(sourceChanged){
  await run('git',['add','--',indexFile]);
  await run('git',['commit','-m','Refresh published Substack index']);
  await run('git',['push','origin','HEAD:master']);
 }
 const sourceCommit=await run('git',['rev-parse','HEAD']);
 const title=`Publish website · newsletter ${sourceCommit}`;
 const runs=JSON.parse(await run('gh',['run','list','-R',websiteRepo,'--workflow','deploy-pages.yml','--event','workflow_dispatch','--limit','30','--json','databaseId,displayTitle,status,url']));
 const pending=runs.find(r=>r.displayTitle===title&&['queued','in_progress','waiting','requested','pending'].includes(r.status));
 if(pending)return {status:'deployment-already-running',sourceCommit,feedHash:current.feedHash,workflowUrl:pending.url};
 await run('gh',['workflow','run','deploy-pages.yml','-R',websiteRepo,'--ref','main','-f',`newsletter_ref=${sourceCommit}`]);
 return {status:'deployment-dispatched',sourceCommit,feedHash:current.feedHash,runTitle:title};
}

if(process.argv[1]&&resolve(process.argv[1])===fileURLToPath(import.meta.url)){
 const lock=join(tmpdir(),'vcw-public-substack-refresh.lock');
 await mkdir(lock);
 try{console.log(JSON.stringify(await refreshPublishedIndex({publish:process.argv.includes('--publish')})));}
 finally{await rm(lock,{recursive:true,force:true});}
}
