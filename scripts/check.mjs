import { readFile, readdir, stat } from 'node:fs/promises';
import { resolve } from 'node:path';
import * as cheerio from 'cheerio';
import { loadIssues, visibleIssues, validateIssues } from './lib.mjs';
const config=JSON.parse(await readFile('site.config.json')),base=new URL(config.url),errors=[];
const all=await loadIssues();errors.push(...validateIssues(all));
async function files(dir){return (await Promise.all((await readdir(dir,{withFileTypes:true})).map(async d=>d.isDirectory()?files(`${dir}/${d.name}`):[`${dir}/${d.name}`]))).flat();}
const html=(await files('dist')).filter(f=>f.endsWith('.html'));
const titles=new Set(),descriptions=new Set();
for(const file of html){
 const $=cheerio.load(await readFile(file,'utf8')),fail=message=>errors.push(`${file}: ${message}`);
 if($('html').attr('lang')!=='en')fail('missing language');
 if($('h1').length!==1)fail('expected one h1');
 const title=$('title').text(),description=$('meta[name=description]').attr('content');
 if(!title||titles.has(title))fail('missing or duplicate title');titles.add(title);
 if(!description||descriptions.has(description))fail('missing or duplicate description');descriptions.add(description);
 const canonical=$('link[rel=canonical]').attr('href');if(!canonical?.startsWith(config.url))fail('wrong canonical');
 if($('script[src]').length)fail('unexpected runtime script');
 const structured=$('script[type="application/ld+json"]');
 if(structured.length!==1)fail('expected one JSON-LD graph');
 structured.each((_,el)=>{try{
  const graph=JSON.parse($(el).text())['@graph'];
  if(!Array.isArray(graph))throw new Error('missing graph');
  const page=graph.find(node=>['WebPage','CollectionPage'].includes(node['@type']));
  if(page?.url!==canonical||page?.name!==title||page?.description!==description)fail('page schema does not match metadata');
  for(const type of ['Organization','WebSite','Person'])if(!graph.some(node=>node['@type']===type))fail(`missing ${type} identity`);
  const ids=new Set(graph.map(node=>node['@id']));
  function references(value){if(!value||typeof value!=='object')return;if(Object.keys(value).length===1&&value['@id']&&!ids.has(value['@id']))fail('unresolved schema identity');for(const child of Object.values(value))references(child);}
  references(graph);
 }catch{fail('invalid structured data');}});
 if($('.subscribe').length!==1)fail('expected the shared newsletter signup');
 if($('.site-header').length!==1||$('.site-footer').length!==1)fail('missing shared header/footer');
 if($('img:not([alt])').length)fail('images missing alt');
 if($('table:not([role=presentation])').length)fail('email layout tables in web content');
 for(const el of $('a[href],img[src],link[href]').toArray()){
  const value=$(el).attr(el.tagName==='img'?'src':'href');
  if(value.startsWith('#')){if(!$(value).length)fail(`missing anchor ${value}`);continue;}
  const url=new URL(value,canonical);
  if(url.origin!==base.origin||!url.pathname.startsWith(base.pathname))continue;
  let local=resolve('dist',decodeURIComponent(url.pathname.slice(base.pathname.length)));
  try{if((await stat(local)).isDirectory())local+='/index.html';await stat(local);}catch{fail(`missing local target ${value}`);}
  if(url.hash){try{const target=cheerio.load(await readFile(local,'utf8'));if(!target(url.hash).length)fail(`missing target ${value}`);}catch{}}
 }
 for(const el of $('a[rel~=sponsored]').toArray()){
  if(!$(el).closest('.paid').length)fail('commercial link outside a labeled placement');
 }
}
const sitemap=await readFile('dist/sitemap.xml','utf8'),feed=await readFile('dist/feed.xml','utf8');
for(const i of all){
 const url=new URL(`${i.slug}/`,config.url).href;
 if(visibleIssues([i]).length){if(!sitemap.includes(url)||!feed.includes(url))errors.push(`${i.slug}: missing from discovery feeds`);}
 else if(sitemap.includes(url)||feed.includes(url))errors.push(`${i.slug}: unpublished issue leaked into discovery feeds`);
}
const optimized=JSON.parse(await readFile('assets/optimized/manifest.json'));
for(const i of visibleIssues(all))for(const image of [i.hero,...i.items.map(x=>x.image),...(i.products||[]).map(x=>x.image),i.sponsor?.image].filter(Boolean)){
 if(!optimized[image.src])errors.push(`${i.slug}: image has not been optimized: ${image.src}`);
}
if(errors.length){console.error(errors.join('\n'));process.exitCode=1;}else console.log(`Checked ${html.length} pages: local links, images, metadata, headings, structured data, paid placements, and draft visibility passed.`);
