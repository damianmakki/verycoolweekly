// One-time migration from the original committed archive. Never rewrites current drafts.
import { execFileSync } from 'node:child_process';
import { writeFile, mkdir, access } from 'node:fs/promises';
import * as cheerio from 'cheerio';
const words = ['one','two','three','four','five','six','seven','eight','nine','ten','eleven'];
await mkdir('content/issues', {recursive:true});
for (const [index, word] of words.entries()) {
  const slug = `issue-${word}`;
  const dest = `content/issues/${slug}.json`;
  try { await access(dest); continue; } catch {}
  const $ = cheerio.load(execFileSync('git', ['show', `a39b9c4:${slug}/index.html`], {encoding:'utf8'}));
  function clean(html) {
    const c = cheerio.load(html || '', null, false);
    c('script,style,img').remove();
    c('*').each((_, el) => {
      if (!['p','br','em','strong','a','b','i'].includes(el.tagName)) { c(el).replaceWith(c(el).contents()); return; }
      const href = c(el).attr('href');
      for (const attr of Object.keys(el.attribs || {})) c(el).removeAttr(attr);
      if (el.tagName==='a' && /^https?:\/\//.test(href || '')) c(el).attr('href', href);
    });
    return c.html().trim();
  }
  const images = $('img').toArray().filter(img => !/verycool\.svg|transparent\.gif/.test($(img).attr('src') || ''));
  const titles = $('.item--title').toArray();
  const itemImages = images.slice(-titles.length);
  const intro = index < 5 ? $('.campaign-section').first().find('p').toArray() : $('table.container').first().find('p').toArray();
  const items = titles.map((title,i) => {
    const t = $(title), block = t.closest(index < 5 ? '.item' : 'th');
    const image = $(itemImages[i]);
    const link = block.find('.item--creator a').attr('href') || image.closest('a').attr('href');
    const src = image.attr('src');
    return {title:t.text().trim(), url:link, source:block.find('.item--creator').text().trim(),
      bodyHtml:block.find('p').toArray().map(p => clean($.html(p))).join('\n'),
      image: {src: /^https?:/.test(src) ? src : `${slug}/${src}`, alt:image.attr('alt') || t.text().trim()},
      kind:'editorial'};
  });
  const title = `Issue ${word[0].toUpperCase()+word.slice(1)}`;
  const issue = {number:index+1, slug, title, date:new Date(Date.UTC(2017,3,21+index*7)).toISOString().slice(0,10),
    status:'published', archived:true, description:`${title}: ${items.slice(0,3).map(i=>i.title).join('; ')}. Design and development picks from 2017.`,
    hero:{src:`assets/images/${slug}-hero.jpg`,alt:`Very Cool Weekly ${title}`},
    introHtml:intro.map(p=>clean($.html(p))).join('\n'),items,sponsor:null,products:[]};
  await writeFile(dest, JSON.stringify(issue,null,2)+'\n');
  console.log(slug, items.length, 'picks');
}
