import {readFile,writeFile,mkdir,appendFile} from 'node:fs/promises';
import {parseSubstackFeed,reconcilePosts,postsHash} from './substack.mjs';
const site=JSON.parse(await readFile('site.config.json','utf8'));
const publicationUrl=site.subscription.publicationUrl;
const feedUrl=new URL('/feed',publicationUrl).href;
const destination='content/substack/posts.json';
let previous;try{previous=JSON.parse(await readFile(destination,'utf8'));}catch{}
const args=process.argv.slice(2),input=args.includes('--input')?args[args.indexOf('--input')+1]:null;
let snapshot,liveHash;
try{
 let xml,deployed;
 if(input)xml=await readFile(input,'utf8');
 else{
  // Carry the complete published archive between ephemeral deployment runners.
  const indexUrl=new URL('assets/substack-index.json',site.url);indexUrl.searchParams.set('refresh',String(Date.now()));
  try{
   const response=await fetch(indexUrl,{signal:AbortSignal.timeout(15000)});
   if(response.ok){deployed=await response.json();if(deployed.publicationUrl!==publicationUrl||!Array.isArray(deployed.posts)||postsHash(deployed.posts)!==deployed.feedHash)throw new Error('Invalid deployed Substack snapshot');liveHash=deployed.feedHash;}
   else if(response.status!==404)throw new Error(`Published index returned HTTP ${response.status}`);
  }catch(error){deployed=undefined;if(args.includes('--strict'))throw error;console.warn(`Using local archive history: ${error.message}`);}
  if(deployed){const combined=new Map([...(previous?.posts||[]),...deployed.posts].map(post=>[post.url,post]));const merged=[...combined.values()];previous={...deployed,posts:merged,feedHash:postsHash(merged)};}
  const response=await fetch(feedUrl,{signal:AbortSignal.timeout(20000),headers:{Accept:'application/rss+xml,application/xml;q=0.9','User-Agent':`VeryCoolWeekly/1.0 (+${site.url})`}});if(!response.ok)throw new Error(`Substack feed returned HTTP ${response.status}`);xml=await response.text();if(xml.length>10*1024*1024)throw new Error('Substack feed exceeded the size limit');
 }
 const incoming=parseSubstackFeed(xml,publicationUrl);
 const posts=reconcilePosts(previous?.publicationUrl===publicationUrl?previous.posts:[],incoming);
 snapshot={version:1,publicationUrl,feedUrl,fetchedAt:new Date().toISOString(),feedHash:postsHash(posts),posts};
 await mkdir('content/substack',{recursive:true});await writeFile(destination,JSON.stringify(snapshot,null,2)+'\n');
 console.log(`Synced ${incoming.length} published Substack posts; ${posts.length} retained in the website index.`);
}catch(error){
 if(args.includes('--strict')||!previous)throw error;
 snapshot=previous;console.warn(`Substack refresh unavailable; using the last successful snapshot. ${error.message}`);
}
if(args.includes('--check-live')){
 const changed=liveHash!==snapshot.feedHash;
 if(process.env.GITHUB_OUTPUT)await appendFile(process.env.GITHUB_OUTPUT,`changed=${changed}\n`);
 console.log(`Published Substack index changed: ${changed}`);
}
