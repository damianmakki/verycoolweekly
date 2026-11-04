import test from 'node:test';
import assert from 'node:assert/strict';
import { readFile } from 'node:fs/promises';
import { load } from 'cheerio';
import { loadIssues } from '../scripts/lib.mjs';
import { archiveFeed } from '../scripts/archive-feed.mjs';

test('migration feed preserves all eleven archive dates and 74 complete picks, excluding drafts',async()=>{
 const issues=await loadIssues();
 const site=JSON.parse(await readFile('site.config.json','utf8'));
 const images=JSON.parse(await readFile('assets/optimized/manifest.json','utf8'));
 const xml=load(archiveFeed(issues,site,images),{xmlMode:true});
 assert.equal(xml('item').length,11);
 let picks=0;
 xml('item').each((_,el)=>{
  const item=xml(el),body=load(item.find('content\\:encoded').text());
  const original=issues.find(i=>new URL(`${i.slug}/`,site.url).href===item.find('link').text());
  assert.ok(original?.archived);
  assert.equal(new Date(item.find('pubDate').text()).toISOString().slice(0,10),original.date);
  assert.equal(body('h2').length,original.items.length);
  for(const pick of original.items)assert.ok(body('h2 a').toArray().some(a=>body(a).attr('href')===pick.url));
  body('img').each((_,img)=>assert.ok(body(img).attr('src').startsWith(`${site.url}assets/optimized/`)));
  picks+=body('h2').length;
 });
 assert.equal(picks,74);
});
