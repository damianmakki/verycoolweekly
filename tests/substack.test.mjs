import test from 'node:test';
import assert from 'node:assert/strict';
import {mkdtemp,cp,readFile,writeFile,symlink,rm} from 'node:fs/promises';
import {tmpdir} from 'node:os';
import {join,resolve} from 'node:path';
import {execFileSync} from 'node:child_process';
import {load} from 'cheerio';
import {parseSubstackFeed,cleanPostHtml,reconcilePosts,postsHash,indexPosts} from '../scripts/substack.mjs';
const publication='https://verycoolweekly.substack.com/';
const xml=items=>`<rss version="2.0" xmlns:content="http://purl.org/rss/1.0/modules/content/"><channel>${items}</channel></rss>`;
const item=(slug,date,title='An edition',body='<p>Full text.</p>')=>`<item><title>${title}</title><link>${publication}p/${slug}</link><pubDate>${date}</pubDate><description>Short introduction.</description><content:encoded><![CDATA[${body}]]></content:encoded></item>`;

test('public Substack posts are normalized, sorted, deduplicated and future releases excluded',()=>{
 const posts=parseSubstackFeed(xml(item('older','Fri, 01 Jan 2021 12:00:00 GMT')+item('newer','Sat, 02 Jan 2021 12:00:00 GMT')+item('newer','Sat, 02 Jan 2021 12:00:00 GMT')+item('future','Wed, 01 Jan 2031 12:00:00 GMT')),publication,{now:new Date('2026-01-01')});
 assert.deepEqual(posts.map(p=>p.url),[`${publication}p/newer`,`${publication}p/older`]);
 assert.equal(postsHash(posts),postsHash(structuredClone(posts)));
 assert.throws(()=>parseSubstackFeed('<html>Error page</html>',publication));
 assert.throws(()=>parseSubstackFeed(xml(item('unsafe','not-a-date')),publication));
});

test('external feed HTML is sanitized and relative links and images become absolute',()=>{
 const body=load(cleanPostHtml('<script>bad()</script><iframe src="https://example.org"></iframe><p onclick="bad()">Real commentary <a href="javascript:bad()">unsafe</a><a href="/p/work">work</a></p><img src="/picture.jpg" alt="A photo" onerror="bad()"><img src="data:text/html,bad"><h2>Article title</h2>',publication));
 assert.equal(body('script,iframe,[onclick],[onerror]').length,0);
 assert.equal(body('a').first().attr('href'),undefined);assert.equal(body('a').last().attr('href'),`${publication}p/work`);
 assert.equal(body('img').length,1);assert.equal(body('img').attr('src'),`${publication}picture.jpg`);assert.equal(body('img').attr('alt'),'A photo');
});

test('rolling feed windows retain older archive entries and respect deletions in the current window',()=>{
 const p=n=>({url:`${publication}p/${n}`,publishedAt:`2021-01-0${n}T12:00:00.000Z`});
 assert.deepEqual(reconcilePosts([p(1),p(2),p(3)],[p(4),p(3)]).map(p=>p.url),[4,3,2,1].map(n=>p(n).url));
 assert.deepEqual(reconcilePosts([p(1),p(2),p(3)],[p(4),p(2)]).map(p=>p.url),[4,2,1].map(n=>p(n).url));
 assert.deepEqual(reconcilePosts([p(1)],[]),[]);
});

test('new Substack editions drive the homepage and index while original routes remain available',async()=>{
 const dir=await mkdtemp(join(tmpdir(),'vcw-substack-'));
 try{
  for(const path of ['scripts','assets','content'])await cp(resolve(path),join(dir,path),{recursive:true});
  for(const path of ['site.config.json','favicon-32x32.png','apple-touch-icon-152x152.png'])await cp(resolve(path),join(dir,path));
  await symlink(resolve('node_modules'),join(dir,'node_modules'),'dir');
  const snapshot=JSON.parse(await readFile(join(dir,'content/substack/posts.json'),'utf8'));
  const post=parseSubstackFeed(xml(item('a-brand-new-post','Tue, 01 Jan 2019 12:00:00 GMT','A brand new post','<p>New published commentary.</p>')),publication)[0];
  snapshot.posts=[post,...snapshot.posts.filter(p=>p.publishedAt.startsWith('2017-'))];snapshot.feedHash=postsHash(snapshot.posts);
  await writeFile(join(dir,'content/substack/posts.json'),JSON.stringify(snapshot));
  execFileSync(process.execPath,['scripts/build.mjs'],{cwd:dir});
  const home=load(await readFile(join(dir,'dist/index.html'),'utf8')),archive=load(await readFile(join(dir,'dist/archive/index.html'),'utf8'));
  assert.equal(home('.latest-edition-title a').attr('href'),post.url);assert.equal(home('.latest-edition-image').length,0);
  assert.equal(archive('.issue-card').length,12);assert.equal(archive('.issue-card h3 a').first().attr('href'),post.url);
  for(const slug of ['one','two','three','four','five','six','seven','eight','nine','ten','eleven'])assert.ok((await readFile(join(dir,`dist/issue-${slug}/index.html`),'utf8')).includes('From the 2017 archive'));
  await assert.rejects(readFile(join(dir,'dist/issue-12/index.html')));
  const json=JSON.parse(await readFile(join(dir,'dist/feed.json'),'utf8'));assert.equal(json.items[0].url,post.url);
  const schema=JSON.parse(archive('script[type="application/ld+json"]').text());assert.equal(schema['@graph'].find(n=>n['@type']==='ItemList').itemListElement[0].url,post.url);
  const before=await readFile(join(dir,'content/substack/posts.json'),'utf8');
  execFileSync(process.execPath,['scripts/sync-substack.mjs','--input','missing-feed.xml'],{cwd:dir,stdio:'pipe'});
  assert.equal(await readFile(join(dir,'content/substack/posts.json'),'utf8'),before);
  assert.throws(()=>execFileSync(process.execPath,['scripts/sync-substack.mjs','--input','missing-feed.xml','--strict'],{cwd:dir,stdio:'pipe'}));
 }finally{await rm(dir,{recursive:true,force:true});}
});
