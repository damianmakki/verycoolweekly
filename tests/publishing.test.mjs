import test from 'node:test';
import assert from 'node:assert/strict';
import { readFile, mkdtemp, cp, mkdir, rm } from 'node:fs/promises';
import { tmpdir } from 'node:os';
import { join, resolve } from 'node:path';
import { execFileSync } from 'node:child_process';
import * as cheerio from 'cheerio';
import { visibleIssues, validateIssues, rich, outbound, loadIssues } from '../scripts/lib.mjs';
const base={number:99,slug:'issue-99',date:'2026-11-06',title:'Fresh picks',description:'An edition about useful tools.',introHtml:'<p>A personal introduction.</p>',status:'draft',hero:{src:'assets/images/verycool.png',alt:'Very Cool Weekly'},items:[{kind:'editorial',title:'A tool',url:'https://example.org/tool',bodyHtml:'<p>Why it matters.</p>'}],products:[],sponsor:null};
test('drafts and future editions cannot enter production; scheduled editions become visible when due',()=>{
 const issues=[base,{...base,status:'scheduled',slug:'scheduled'},{...base,status:'published',slug:'published'},{...base,status:'published',date:'2017-06-30',slug:'archive'}];
 assert.deepEqual(visibleIssues(issues,{today:'2026-11-03'}).map(x=>x.slug),['archive']);
 assert.deepEqual(visibleIssues(issues,{today:'2026-11-06'}).map(x=>x.slug),['scheduled','published','archive']);
 assert.equal(visibleIssues(issues,{drafts:true}).length,4);
});
test('commercial copy requires explicit relationships and valid destinations',()=>{
 const issue={...base,products:[{kind:'affiliate',title:'Product',url:'https://example.org/product',description:'Useful.'}]};
 assert.ok(validateIssues([issue]).some(x=>x.includes('commission')));
 issue.products[0].disclosure='We earn a commission if you buy through this link.';
 assert.deepEqual(validateIssues([issue]),[]);
 issue.products[0].url='javascript:alert(1)';assert.ok(validateIssues([issue]).length);
 issue.products[0]={kind:'product',title:'Ours',url:'https://example.org',description:'Useful.'};assert.ok(validateIssues([issue]).some(x=>x.includes('relationship')));
});
test('a timed release stays out of pages and discovery until its exact release instant',()=>{
 const issue={...base,status:'scheduled',date:'2026-11-13',publishAt:'2026-11-13T09:00:00-07:00'};
 assert.equal(visibleIssues([issue],{now:'2026-11-13T15:59:59Z'}).length,0);
 assert.equal(visibleIssues([issue],{now:'2026-11-13T16:00:00Z'}).length,1);
 assert.equal(visibleIssues([{...issue,status:'draft'}],{now:'2026-11-14T16:00:00Z'}).length,0);
 assert.equal(visibleIssues([issue],{drafts:true,now:'2026-11-01T00:00:00Z'}).length,1);
 assert.ok(validateIssues([{...issue,publishAt:'2026-11-13T09:00:00'}]).some(x=>x.includes('publishAt')));
});
test('affiliate URLs keep partner parameters and only add tracking when explicitly enabled',()=>{
 const item={kind:'affiliate',url:'https://example.org/p?aff=123&campaign=partner'};
 assert.equal(outbound(item,base),item.url);
 const url=new URL(outbound({...item,track:true},base,'email','product-1'));
 assert.equal(url.searchParams.get('aff'),'123');assert.equal(url.searchParams.get('utm_medium'),'email');assert.equal(url.searchParams.get('utm_campaign'),base.slug);
});
test('rich copy cannot inject scripts, handlers, or unsafe destinations',()=>{
 const html=rich('<script>bad()</script><p onclick="bad()">Good <a href="javascript:bad()">link</a><a href="https://example.org" onmouseover="bad()">safe</a></p>');
 assert.ok(!html.includes('<script'));assert.ok(!html.includes('onclick'));assert.ok(!html.includes('javascript:'));assert.ok(html.includes('href="https://example.org"'));
});
test('placeholder editions and invalid dates cannot be published',()=>{
 assert.ok(validateIssues([{...base,status:'scheduled',introHtml:'<p>TODO: write this.</p>'}]).some(x=>x.includes('placeholder')));
 assert.ok(validateIssues([{...base,date:'2026-02-30'}]).some(x=>x.includes('date')));
});
test('all eleven original editions retain their editorial picks',async()=>{
 const issues=(await loadIssues()).filter(i=>i.archived).sort((a,b)=>a.number-b.number);
 assert.deepEqual(issues.map(i=>i.items.length),[7,11,8,7,6,6,6,6,6,5,6]);
 assert.equal(issues[0].date,'2017-04-21');assert.equal(issues.at(-1).date,'2017-06-30');
 assert.deepEqual(validateIssues(issues),[]);
});
test('generated commercial web and email editions preserve disclosures, tracking, and draft exclusion',async()=>{
 const dir=await mkdtemp(join(tmpdir(),'vcw-test-'));
 try{
  for(const path of ['scripts','assets','content'])await cp(resolve(path),join(dir,path),{recursive:true});
  for(const path of ['site.config.json','favicon-32x32.png','apple-touch-icon-152x152.png'])await cp(resolve(path),join(dir,path));
  const fixtureSite=JSON.parse(await readFile(join(dir,'site.config.json'),'utf8'));
  fixtureSite.publishing={source:'local'};
  await import('node:fs/promises').then(fs=>fs.writeFile(join(dir,'site.config.json'),JSON.stringify(fixtureSite)));
  // Resolve dependencies without installing anything in the fixture.
  const {symlink}=await import('node:fs/promises');await symlink(resolve('node_modules'),join(dir,'node_modules'),'dir');
  const issue={...base,status:'published',date:'2020-01-03',sponsor:{name:'Studio',title:'Studio tool',url:'https://example.org/sponsor',description:'Sponsored copy.'},products:[{kind:'affiliate',title:'Paid pick',url:'https://example.org/product?aff=123',description:'A useful product.',disclosure:'We earn a commission if you buy through this link.',track:true}]};
  await import('node:fs/promises').then(fs=>fs.writeFile(join(dir,'content/issues/test-commercial.json'),JSON.stringify(issue)));
  await import('node:fs/promises').then(fs=>fs.writeFile(join(dir,'content/issues/test-draft.json'),JSON.stringify({...base,number:100,slug:'private-draft',title:'Secret draft'})));
  await mkdir(join(dir,'exports/emails'),{recursive:true});
  await import('node:fs/promises').then(fs=>fs.writeFile(join(dir,'exports/emails/private-draft.html'),'stale private preview'));
  execFileSync(process.execPath,['scripts/build.mjs'],{cwd:dir});
  await assert.rejects(readFile(join(dir,'exports/emails/private-draft.html')));
  const web=cheerio.load(await readFile(join(dir,'dist/issue-99/index.html'),'utf8'));
  assert.equal(web('.paid').length,2);assert.ok(web('.disclosure').text().includes('We earn a commission'));
  assert.ok(web('a[rel~=sponsored]').length>=4);
  const email=await readFile(join(dir,'exports/emails/issue-99.html'),'utf8');assert.ok(email.includes('We earn a commission'));assert.ok(email.includes('utm_medium=email'));assert.ok(email.includes('{{ unsubscribe_url }}'));
  const feed=await readFile(join(dir,'dist/feed.xml'),'utf8');assert.ok(!feed.includes('private-draft'));
  await assert.rejects(readFile(join(dir,'dist/private-draft/index.html')));
 }finally{await rm(dir,{recursive:true,force:true});}
});
