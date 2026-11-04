import test from 'node:test';
import assert from 'node:assert/strict';
import {readFile} from 'node:fs/promises';
import {load} from 'cheerio';
import {loadIssues} from '../scripts/lib.mjs';
import {indexPosts} from '../scripts/substack.mjs';
import {substackFeeds} from '../scripts/feeds.mjs';
const site={name:'Very Cool Weekly',url:'https://ruckuslabs.co/verycoolweekly/',description:'Independent design and development picks.',author:{name:'Damian Makki',url:'https://makki.pro/'}};

test('compatibility feeds mirror Substack full text and images while retaining historical subscriber IDs',async()=>{
 const snapshot=JSON.parse(await readFile('content/substack/posts.json','utf8'));
 const posts=indexPosts(snapshot.posts,await loadIssues(),site);
 const {rss,json}=substackFeeds(posts,site),xml=load(rss,{xmlMode:true});
 assert.equal(xml('item').length,posts.length);assert.equal(json.items.length,posts.length);
 let picks=0,images=0;
 xml('item').each((index,el)=>{
  const item=xml(el),post=posts[index];
  const body=item.children().filter((_,node)=>node.tagName==='content:encoded').text(),html=load(body);
  assert.equal(body,post.contentHtml);assert.equal(item.find('description').text(),body);
  assert.equal(item.find('link').text(),post.url);assert.equal(item.find('guid').text(),post.legacyUrl||post.url);
  assert.equal(json.items[index].id,post.legacyUrl||post.url);assert.equal(json.items[index].url,post.url);assert.equal(json.items[index].content_html,body);
  if(post.archived){picks+=html('h2').length;images+=html('img').length;}
  html('img').each((_,img)=>assert.match(html(img).attr('src'),/^https:\/\//));
 });
 assert.equal(picks,74);assert.ok(images>=11);
});

test('new Substack posts use their own canonical IDs and retain full text in both feed formats',()=>{
 const post={url:'https://verycoolweekly.substack.com/p/a-new-edition',title:'A & B',summary:'Short introduction.',publishedAt:'2026-01-01T15:00:00.000Z',contentHtml:'<p>Full text with ]]&gt; and &amp;.</p><img src="https://example.org/photo.jpg" alt="Photo">',image:{src:'https://example.org/photo.jpg',alt:'Photo'}};
 const {rss,json}=substackFeeds([post],site),xml=load(rss,{xmlMode:true});
 assert.equal(xml('item guid').text(),post.url);assert.equal(xml('item title').text(),'A & B');assert.equal(xml('item description').text(),post.contentHtml);
 assert.equal(json.items[0].id,post.url);assert.ok(json.items[0].content_text.includes('Full text'));assert.equal(json.items[0].image,post.image.src);
});
