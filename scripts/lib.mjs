import { readFile, readdir } from 'node:fs/promises';
import * as cheerio from 'cheerio';
export const escape = value => String(value ?? '').replace(/[&<>"']/g,c=>({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[c]));
export const plain = html => cheerio.load(html || '').text().replace(/\s+/g,' ').trim();
export function httpUrl(value) {
  try { const u=new URL(value); return ['http:','https:'].includes(u.protocol) && !u.username && !u.password; } catch { return false; }
}
export function rich(html) {
  const $=cheerio.load(html||'', null, false);
  $('script,style,iframe,object').remove();
  $('*').each((_,el)=>{
    if(!['p','br','a','em','strong','b','i','ul','ol','li','code'].includes(el.tagName)) { $(el).replaceWith($(el).contents()); return; }
    const href=$(el).attr('href');
    for(const key of Object.keys(el.attribs||{})) $(el).removeAttr(key);
    if(el.tagName==='a'&&httpUrl(href))$(el).attr('href',href);
  });return $.html();
}
export async function loadIssues() {
  return Promise.all((await readdir('content/issues')).filter(f=>f.endsWith('.json')).map(async f=>JSON.parse(await readFile(`content/issues/${f}`,'utf8'))));
}
export function visibleIssues(issues,{drafts=false,now=new Date(),today=new Date(now).toISOString().slice(0,10)}={}) {
  return issues.filter(i=>drafts || (['published','scheduled'].includes(i.status)&&i.date<=today&&(!i.publishAt||Date.parse(i.publishAt)<=new Date(now).getTime()))).sort((a,b)=>b.date.localeCompare(a.date)||b.number-a.number);
}
export function validateIssues(issues) {
  const errors=[],slugs=new Set(),numbers=new Set();
  for(const i of issues){
    const fail=message=>errors.push(`${i.slug||'unknown issue'}: ${message}`);
    if(!/^[a-z0-9]+(?:-[a-z0-9]+)*$/.test(i.slug||''))fail('slug must be lowercase words separated by hyphens');
    if(['assets','archive','signup','sponsor','disclosure','feed','index','404'].includes(i.slug))fail('slug is reserved');
    if(slugs.has(i.slug))fail('duplicate slug');slugs.add(i.slug);
    if(!Number.isInteger(i.number)||i.number<1||numbers.has(i.number))fail('issue number must be a unique positive integer');numbers.add(i.number);
    if(!/^\d{4}-\d{2}-\d{2}$/.test(i.date||'')||!Number.isFinite(Date.parse(i.date))||new Date(i.date).toISOString().slice(0,10)!==i.date)fail('invalid date');
    if(!['draft','scheduled','published'].includes(i.status))fail('unknown status');
    if(i.publishAt!==undefined&&(!/^\d{4}-\d{2}-\d{2}T\d{2}:\d{2}:\d{2}(?:\.\d{3})?(?:Z|[+-]\d{2}:\d{2})$/.test(i.publishAt)||!Number.isFinite(Date.parse(i.publishAt))))fail('publishAt must be a valid timestamp with timezone');
    for(const key of ['title','description','introHtml'])if(typeof i[key]!=='string'||!plain(i[key]))fail(`${key} is required`);
    if(!Array.isArray(i.items)||!i.items.length)fail('at least one editorial pick is required');
    if((i.items||[]).some(x=>x.kind!=='editorial'))fail('put paid and product cards in sponsor/products slots');
    if((i.products||[]).some(x=>!['affiliate','product'].includes(x.kind)))fail('products must be affiliate or product cards');
    if((i.products||[]).length>2)fail('at most two product cards per issue');
    if(i.status!=='draft' && !i.archived && /TODO|example\.com|YOUR_ID/.test(JSON.stringify(i)))fail('replace all placeholder copy and URLs before publication');
    const entries=[...(i.items||[]),...(i.products||[]),...(i.sponsor?[{...i.sponsor,kind:'sponsor'}]:[])];
    for(const item of entries){
      if(!item.title||!httpUrl(item.url))fail('each card needs a title and an HTTP(S) destination');
      if(!['editorial','product','affiliate','sponsor'].includes(item.kind))fail('unknown card kind');
      if(!(item.bodyHtml||item.description))fail('each card needs copy');
      if(item.kind==='affiliate'&&!item.disclosure)fail('affiliate cards need a clear commission disclosure');
      if(item.kind==='product'&&!item.relationship)fail('product cards must state the relationship (e.g. Our product, or Independent pick)');
      if(item.kind==='sponsor'&&!item.name)fail('sponsors need a name');
      if(item.image){
        if(!item.image.alt)fail('images need alt text');
        if(!httpUrl(item.image.src)&&(!/^[a-zA-Z0-9_./-]+$/.test(item.image.src)||item.image.src.split('/').includes('..')||item.image.src.startsWith('/')))fail('unsafe image path');
      }
    }
    if(!i.hero?.src||!i.hero?.alt)fail('hero image and alt text are required');
  }return errors;
}
export const label = item => item.kind==='affiliate'?'Affiliate pick':item.kind==='sponsor'?'Paid sponsorship':item.kind==='product'?item.relationship:'Editorial pick';
export function outbound(item,issue,medium='web',placement='pick') {
  const url=new URL(item.url);
  if(item.kind!=='editorial') {
    // Preserve signed/affiliate destinations verbatim unless the partner approves appended tracking.
    if(item.track===true){
      url.searchParams.set('utm_source','verycoolweekly');url.searchParams.set('utm_medium',medium);
      url.searchParams.set('utm_campaign',issue.slug);url.searchParams.set('utm_content',placement);
    }
  }
  return url.href;
}
