import {createHash} from 'node:crypto';
import {load} from 'cheerio';
import {httpUrl,plain} from './lib.mjs';

const tags=new Set(['p','br','a','em','strong','b','i','ul','ol','li','code','pre','blockquote','h1','h2','h3','h4','h5','h6','img','figure','figcaption','hr','table','thead','tbody','tr','th','td','sup','sub','s','del','section','div','span']);
function safeUrl(value,base){try{const url=new URL(value,base);return httpUrl(url.href)?url.href:null;}catch{return null;}}
export function cleanPostHtml(html,publicationUrl){
 const $=load(html||'',null,false);
 $('script,style,iframe,object,embed,form,input,button,link,meta,noscript').remove();
 $('.subscription-widget,.subscription-widget-wrap').remove();
 $('*').each((_,el)=>{
  const node=$(el),tag=el.tagName;
  if(!tags.has(tag)){node.replaceWith(node.contents());return;}
  const href=node.attr('href'),src=node.attr('src')||node.attr('data-src'),alt=node.attr('alt');
  for(const key of Object.keys(el.attribs||{}))node.removeAttr(key);
  if(tag==='a'){const url=href&&safeUrl(href,publicationUrl);if(url)node.attr('href',url);}
  if(tag==='img'){const url=src&&safeUrl(src,publicationUrl);if(!url){node.remove();return;}node.attr('src',url).attr('alt',alt||'').attr('style','max-width:100%;height:auto');}
 });
 return $.html();
}
export function parseSubstackFeed(xml,publicationUrl,{now=new Date()}={}){
 const publication=new URL(publicationUrl),$=load(xml,{xmlMode:true});
 if(!$('rss > channel').length)throw new Error('Substack did not return an RSS publication feed');
 const seen=new Set(),posts=[];
 $('channel > item').each((_,el)=>{
  const item=$(el),url=safeUrl(item.find('link').first().text().trim(),publicationUrl);
  const title=plain(item.find('title').first().text()).trim();
  const date=new Date(item.find('pubDate').first().text());
  if(!url||new URL(url).origin!==publication.origin||!new URL(url).pathname.startsWith('/p/')||!title||!Number.isFinite(date.getTime()))throw new Error('Invalid Substack publication item');
  if(date>new Date(now))return;
  const normalized=new URL(url);normalized.search='';normalized.hash='';
  if(seen.has(normalized.href))return;seen.add(normalized.href);
  const contentHtml=cleanPostHtml(item.find('content\\:encoded').first().text()||item.find('description').first().text(),publicationUrl);
  const body=load(contentHtml),headings=body('h2').toArray().map(e=>plain(body(e).html())).filter(Boolean).slice(0,3);
  const description=plain(item.find('description').first().text());
  const summary=headings.length?headings.join(' · '):(description||plain(contentHtml)).slice(0,260).replace(/\s+\S*$/,'');
  const enclosure=item.find('enclosure').first().attr('url');
  const image=safeUrl(enclosure||body('img').first().attr('src')||'',publicationUrl);
  posts.push({url:normalized.href,title,publishedAt:date.toISOString(),date:date.toISOString().slice(0,10),summary,contentHtml,...(image&&((enclosure||body('img').length))?{image:{src:image,alt:title}}:{})});
 });
 return posts.sort((a,b)=>b.publishedAt.localeCompare(a.publishedAt)||a.url.localeCompare(b.url));
}
export function reconcilePosts(previous,incoming){
 // Retain older posts after they roll out of Substack's finite RSS window.
 // Missing posts inside the current window are removed, respecting deletions.
 const oldest=incoming.at(-1)?.publishedAt;
 const older=oldest?previous.filter(post=>post.publishedAt<oldest):[];
 return [...new Map([...older,...incoming].map(post=>[post.url,post])).values()].sort((a,b)=>b.publishedAt.localeCompare(a.publishedAt)||a.url.localeCompare(b.url));
}
export const postsHash=posts=>createHash('sha256').update(JSON.stringify(posts)).digest('hex');
export function indexPosts(posts,legacyIssues,site,{now=new Date()}={}){
 return posts.filter(post=>Date.parse(post.publishedAt)<=new Date(now).getTime()).map(post=>{
  const legacy=legacyIssues.find(issue=>issue.archived&&new URL(post.url).pathname===`/p/${issue.slug}`);
  return {...post,hero:post.image,archived:!!legacy,...(legacy?{legacyUrl:new URL(`${legacy.slug}/`,site.url).href}:{})};
 });
}
