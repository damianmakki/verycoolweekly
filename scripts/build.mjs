import { readFile, writeFile, mkdir, rm, cp, readdir } from 'node:fs/promises';
import { archiveFeed } from './archive-feed.mjs';
import { escape as e, plain, rich, loadIssues, visibleIssues, validateIssues, label, outbound, httpUrl } from './lib.mjs';
const config=JSON.parse(await readFile('site.config.json','utf8'));
if(!httpUrl(config.url)||!config.url.endsWith('/')) throw new Error('site.config.json url must be an absolute URL ending in /');
const base=new URL(config.url).pathname;
const local=path=>`${base}${path}`;
const absolute=path=>new URL(path,config.url).href;
const all=await loadIssues(), errors=validateIssues(all);
if(errors.length)throw new Error(errors.join('\n'));
const drafts=process.argv.includes('--drafts');
const issues=visibleIssues(all,{drafts}),live=visibleIssues(all);
let images={};try{images=JSON.parse(await readFile('assets/optimized/manifest.json'));}catch{}
await rm('dist',{recursive:true,force:true});await mkdir('dist/assets',{recursive:true});await rm('exports/emails',{recursive:true,force:true});await mkdir('exports/emails',{recursive:true});
try{await cp('assets/originals','dist/assets/originals',{recursive:true});}catch{}
await cp('assets/site.css','dist/assets/site.css');
await cp('assets/images/verycool.svg','dist/assets/logo.svg');
await cp('favicon-32x32.png','dist/assets/favicon.png');
await cp('apple-touch-icon-152x152.png','dist/assets/apple-touch-icon.png');
try{await cp('assets/optimized','dist/assets/optimized',{recursive:true});}catch{}
// Retain legacy image URLs and on-demand original animations; optimized posters are used in pages.
await cp('assets/images','dist/assets/images',{recursive:true});
for(const dir of (await readdir('.')).filter(d=>d.startsWith('issue-'))) {
  try{await cp(`${dir}/images`,`dist/${dir}/images`,{recursive:true});}catch{}
}
const pretty=date=>new Intl.DateTimeFormat('en-US',{dateStyle:'long',timeZone:'UTC'}).format(new Date(`${date}T12:00:00Z`));
function picture(image,{eager=false,sizes='(max-width: 760px) 92vw, 760px',email=false}={}){
  if(!image)return '';
  const entry=images[image.src], variants=entry?.variants;
  const best=variants?.at(-1), src=best?best.src:image.src;
  const url=/^https?:/.test(src)?src:(email?absolute(src):local(src));
  if(email)return `<img src="${e(url)}" alt="${e(image.alt)}" width="600" style="display:block;width:100%;max-width:600px;height:auto;border:0;border-radius:8px">`;
  const srcset=variants?` srcset="${variants.map(v=>`${local(v.src)} ${v.width}w`).join(', ')}" sizes="${e(sizes)}" width="${best.width}" height="${best.height}"`:'';
  return `<img src="${e(url)}"${srcset} alt="${e(image.alt)}" loading="${eager?'eager':'lazy'}" decoding="async"${eager?' fetchpriority="high"':''}>`;
}
function layout({title,description,path='',body,schema,robots=false,splash=false}){
 const canonical=absolute(path), social=schema?.image?.[0]||absolute('assets/images/verycool.png');
 return `<!doctype html><html lang="en"><head><meta charset="utf-8"><meta name="viewport" content="width=device-width, initial-scale=1"><title>${e(title)}</title><meta name="description" content="${e(description)}"><link rel="canonical" href="${e(canonical)}">${drafts||robots?'<meta name="robots" content="noindex,nofollow">':''}<meta name="theme-color" content="#e3ff24"><meta property="og:type" content="${schema?.['@type']==='Article'?'article':'website'}"><meta property="og:title" content="${e(title)}"><meta property="og:description" content="${e(description)}"><meta property="og:url" content="${e(canonical)}"><meta property="og:image" content="${social}"><meta property="og:image:alt" content="${e(title)}">${schema?.datePublished?`<meta property="article:published_time" content="${schema.datePublished}T12:00:00Z">`:''}<meta property="og:site_name" content="Very Cool Weekly"><meta name="twitter:card" content="summary_large_image"><link rel="icon" href="${local('assets/favicon.png')}" sizes="32x32"><link rel="apple-touch-icon" href="${local('assets/apple-touch-icon.png')}" sizes="152x152"><link rel="alternate" type="application/rss+xml" title="Very Cool Weekly" href="${local('feed.xml')}"><link rel="stylesheet" href="${local('assets/site.css')}">${schema?`<script type="application/ld+json">${JSON.stringify({'@context':'https://schema.org',...schema}).replace(/</g,'\\u003c')}</script>`:''}</head><body${splash?' class="splash-page"':''}><a class="skip" href="#main">Skip to content</a>${drafts?'<div class="preview-banner">Local draft preview · Not for publication</div>':''}${splash?'':`<header class="site-header wrap"><a class="brand" href="${local('')}" aria-label="Very Cool Weekly home"><img src="${local('assets/logo.svg')}" width="100" height="100" alt="Very Cool Weekly"></a><nav aria-label="Main navigation"><a href="${local('archive/')}">The archive</a><a href="${local('sponsor/')}">Sponsor an issue</a><a class="nav-subscribe" href="${local('signup/')}">Sign up</a></nav></header>`}<main id="main">${body}</main>${splash||(path==='signup/'&&config.subscription.enabled&&config.subscription.provider==='substack')?'':subscribe()}<footer class="site-footer wrap"><p>Very Cool Weekly <span>by <a href="${e(config.author.url)}">${e(config.author.name)}</a></span></p><nav aria-label="Footer"><a href="${local('feed.xml')}">RSS</a><a href="${local('disclosure/')}">How we’re supported</a><a href="https://ruckuslabs.co/">Ruckus Labs</a></nav></footer></body></html>`;
}
function subscribe(){
 const s=config.subscription;
 if(!s.enabled)return `<section class="subscribe" id="subscribe"><div class="wrap subscribe-inner"><div><p class="eyebrow">Coming soon</p><h2>Get the next edition</h2><p>We’re getting the next edition ready. Until email subscriptions reopen, follow the feed for new issues.</p></div><a class="button" href="${local('feed.xml')}">Follow via RSS</a></div></section>`;
 if(s.provider==='substack'){
   if(!httpUrl(s.publicationUrl))throw new Error('Set the verified Substack publication URL before enabling signup');
   const publication=new URL(s.publicationUrl);
   if(publication.protocol!=='https:'||!['','/'].includes(publication.pathname)||publication.search||publication.hash)throw new Error('Use the HTTPS publication homepage URL, without a post path or query');
   const destination=new URL('/subscribe',publication).href;
   return `<section class="subscribe" id="subscribe"><div class="wrap subscribe-inner"><div><p class="eyebrow">The newsletter</p><h2>Get the next edition</h2><p>The weekly email is delivered through Substack. Subscribe there to join the list.</p></div><a class="button" href="${e(destination)}">Subscribe on Substack</a></div></section>`;
 }
 if(!httpUrl(s.action))throw new Error('Subscription action must be an HTTP(S) URL');
 return `<section class="subscribe" id="subscribe"><div class="wrap subscribe-inner"><div><p class="eyebrow">The newsletter</p><h2>Get the next edition</h2><p>Design, development, and ideas worth your time. Unsubscribe whenever you like.</p></div><form action="${e(s.action)}" method="post"><label for="subscriber-email">Email address</label><div class="form-row"><input id="subscriber-email" name="${e(s.emailField||'email')}" type="email" autocomplete="email" required placeholder="you@example.com"><button class="button" type="submit">Count me in</button></div>${s.honeypot?`<div class="honeypot" aria-hidden="true"><input name="${e(s.honeypot)}" type="text" tabindex="-1" autocomplete="off"></div>`:''}<small>Your subscription is handled by our email provider. Check your inbox to confirm.</small></form></div></section>`;
}
function issueCard(i,index=1){return `<article class="issue-card"><a class="card-image" href="${local(`${i.slug}/`)}" aria-label="Read ${e(i.title)}">${picture(i.hero,{eager:index===0,sizes:'(max-width: 700px) 92vw, 520px'})}</a><div class="card-meta"><time datetime="${i.date}">${pretty(i.date)}</time></div><h3><a href="${local(`${i.slug}/`)}">${e(i.title)}</a></h3><p>${e(i.items.slice(0,3).map(x=>x.title).join(' · '))}</p><a class="text-link" href="${local(`${i.slug}/`)}">Read the issue </a></article>`;}
const hasNew=live.some(i=>!i.archived);
const archiveCount=live.filter(i=>i.archived).length;
const home=layout({
 title:'Very Cool Weekly — A newsletter for designers and developers',
 description:config.description,
 splash:true,
 schema:{'@type':'WebSite',name:config.name,url:config.url,description:config.description},
 body:`<section class="splash wrap" aria-labelledby="splash-title">
   <a class="splash-logo" href="${local('')}" aria-label="Very Cool Weekly home"><img src="${local('assets/logo.svg')}" width="180" height="180" alt=""></a>
   <h1 id="splash-title">Very Cool Weekly</h1>
   <div class="splash-letter">
     <p>A newsletter for designers and developers, curated by <a href="${e(config.author.url)}">Damian Makki</a>.</p>
     <p>Good articles, interesting projects, useful tools, and the occasional thing that has nothing to do with work.</p>
   </div>
   <nav class="splash-links" aria-label="Explore Very Cool Weekly">
     <a href="${config.subscription.enabled&&config.subscription.provider==='substack'?e(new URL('/subscribe',config.subscription.publicationUrl).href):local('signup/')}">Sign up</a>
     <a href="${local('archive/')}">Browse the archive</a>
     <a href="${local('sponsor/')}">Advertise</a>
   </nav>
   <p class="splash-status">${config.subscription.enabled?'New editions by email. Unsubscribe whenever you like.':`Email signup is closed while the next edition takes shape. You can still read the ${archiveCount} original editions from 2017.`}</p>
 </section>`
});
await write('index.html',home);
await write('archive/index.html',layout({title:'All issues — Very Cool Weekly',description:'Browse every edition of Very Cool Weekly: independent design and development picks, with original publication dates.',path:'archive/',body:`<section class="page-head wrap"><p class="eyebrow">All editions</p><h1>The archive.</h1><p>${hasNew?'Every edition, from the original 2017 run to the latest picks.':'Eleven editions from the original 2017 run. New editions will appear here when they’re published.'}</p></section><section class="wrap editions"><div class="issue-grid">${issues.map(issueCard).join('')}</div></section>`}));
function card(item,issue,index,{email=false,placement='pick'}={}){
 const paid=['affiliate','sponsor'].includes(item.kind), url=outbound(item,issue,email?'email':'web',`${placement}-${index+1}`);
 const disclosure=item.kind==='affiliate'?item.disclosure:item.kind==='sponsor'?`Paid placement by ${item.name}.`:item.kind==='product'?item.relationship:'';
 const entry=images[item.image?.src];
 const original=entry?.originalSrc || item.image?.src;
 const animation=entry?.animated?`<p class="animation-link"><a href="${e(/^https?:/.test(original)?original:email?absolute(original):local(original))}">View original animation (${(entry.originalBytes/1000000).toFixed(1)} MB)</a></p>`:'';
 const style=email?' style="padding:24px 0;border-top:1px solid #555"':'';
 return `<${email?'section':'article'} class="pick ${paid?'paid':''}"${style}><p class="eyebrow"${email?' style="font-size:12px;color:#e3ff24"':''}>${e(label(item))}${item.source?` · ${e(item.source)}`:''}</p>${disclosure?`<p class="disclosure"${email?' style="font-size:14px;color:#fff"':''}>${e(disclosure)}</p>`:''}<h2${email?' style="font-size:26px;line-height:1.2"':''}><a href="${e(url)}"${paid?' rel="sponsored noopener"':''}>${e(item.title)}</a></h2>${item.imageUnavailable?'<p class="archive-note">The original image preview is no longer available. The editorial pick and its source link are preserved below.</p>':''}${item.image?`<a class="pick-image" href="${e(url)}"${paid?' rel="sponsored noopener"':''}>${picture(item.image,{email})}</a>${animation}`:''}<div class="prose">${rich(item.bodyHtml||`<p>${e(item.description)}</p>`)}</div><a class="text-link" href="${e(url)}"${paid?' rel="sponsored noopener"':''}>${e(item.cta||'Take a look')}</a></${email?'section':'article'}>`;
}
for(const [idx,i] of issues.entries()){
 const path=`${i.slug}/`,url=absolute(path),older=issues[idx+1],newer=issues[idx-1];
 const body=`<article class="issue wrap"><header class="issue-head"><a class="text-link" href="${local('archive/')}">← Back to the archive</a><p class="eyebrow">Issue ${i.number} · <time datetime="${i.date}">${pretty(i.date)}</time></p><h1>${e(i.title)}</h1><p class="issue-deck">${e(i.items.slice(0,3).map(x=>x.title).join(' · '))}</p>${i.archived?'<p class="archive-note">From the 2017 archive. These picks reflect their original publication date; external sites and offers may have changed.</p>':''}</header>${picture(i.hero,{eager:true})}<div class="prose intro">${rich(i.introHtml)}</div>${i.sponsor?card({...i.sponsor,kind:'sponsor'},i,0,{placement:'sponsor'}):''}<div class="picks">${i.items.map((x,n)=>card(x,i,n)).join('')}</div>${i.products?.length?`<section class="products" aria-label="Products and recommendations"><h2 class="section-title">Worth a look.</h2>${i.products.map((x,n)=>card(x,i,n,{placement:'product'})).join('')}</section>`:''}<nav class="issue-pagination" aria-label="Other issues">${older?`<a href="${local(`${older.slug}/`)}">← ${e(older.title)}</a>`:'<span></span>'}${newer?`<a href="${local(`${newer.slug}/`)}">${e(newer.title)} →</a>`:''}</nav></article>`;
 await write(`${path}index.html`,layout({title:`${i.title}: ${i.items[0].title} — Very Cool Weekly`,description:i.description,path,body,schema:{'@type':'Article',headline:i.title,description:i.description,datePublished:i.date,author:{'@type':'Person',name:config.author.name,url:config.author.url},publisher:{'@type':'Organization',name:config.name,url:config.url},image:[absolute(images[i.hero.src]?.variants.at(-1).src||i.hero.src)],mainEntityOfPage:url,isAccessibleForFree:true}}));
 // Email exports live outside the public build. Provider settings must supply actual unsubscribe/address values.
 const emailBody=`${rich(i.introHtml)}${i.sponsor?card({...i.sponsor,kind:'sponsor'},i,0,{email:true,placement:'sponsor'}):''}${i.items.map((x,n)=>card(x,i,n,{email:true})).join('')}${(i.products||[]).map((x,n)=>card(x,i,n,{email:true,placement:'product'})).join('')}`;
 const email=`<!doctype html><html lang="en"><head><meta charset="utf-8"><meta name="viewport" content="width=device-width,initial-scale=1"><title>${e(i.title)}</title><style>body{margin:0;background:#222;color:#fff;font-family:Arial,sans-serif;line-height:1.6}a{color:#e3ff24}img{max-width:100%;height:auto}h2{line-height:1.2}</style></head><body><div style="display:none;max-height:0;overflow:hidden">${e(i.description)}</div><table role="presentation" width="100%" style="background:#222;color:#fff"><tr><td align="center"><table role="presentation" width="100%" style="max-width:640px"><tr><td style="padding:24px;font-family:Arial,sans-serif;color:#fff;font-size:16px;line-height:1.6"><p style="font-size:13px"><a href="${url}">Read on the web</a></p><h1>${e(i.title)} / Very Cool Weekly</h1><p>${pretty(i.date)}</p>${emailBody}<hr><p>Curated by ${e(config.author.name)} · <a href="${absolute('disclosure/')}">How we’re supported</a></p><p><a href="{{ unsubscribe_url }}">Unsubscribe</a><br>{{ mailing_address }}</p></td></tr></table></td></tr></table></body></html>`;
 await writeFile(`exports/emails/${i.slug}.html`,email);

 await writeFile(`exports/emails/${i.slug}.txt`,`${i.title} — Very Cool Weekly\n${url}\n\n${plain(i.introHtml)}\n\n${[...(i.sponsor?[{...i.sponsor,kind:'sponsor'}]:[]),...i.items,...(i.products||[])].map((x,n)=>`${label(x)}: ${x.title}\n${x.disclosure|| (x.kind==='sponsor'?`Paid placement by ${x.name}.`:'')}\n${plain(x.bodyHtml||x.description)}\n${outbound(x,i,'email',`pick-${n+1}`)}`).join('\n\n')}\n\nUnsubscribe: {{ unsubscribe_url }}\n{{ mailing_address }}\n`);
}
await write('signup/index.html',layout({
 title:'Sign up — Very Cool Weekly',
 description:'Get updates on the next chapter of Very Cool Weekly, an independent newsletter for designers, developers, and the endlessly curious.',
 path:'signup/',
 body:`<section class="page-head wrap signup-head"><p class="eyebrow">The newsletter</p><h1>Sign up for<br>Very Cool Weekly</h1><p>${config.subscription.enabled?'A weekly email about design, development, and interesting things to make. Continue to Substack to join the list.':'We’re getting Very Cool Weekly ready for its next chapter. Email signup will reopen once our new mailing list is ready.'}</p>${config.subscription.enabled&&config.subscription.provider==='substack'?`<p><a class="button" href="${e(new URL('/subscribe',config.subscription.publicationUrl).href)}">Subscribe on Substack</a></p>`:''}${config.subscription.enabled?'':`<p>In the meantime, <a href="${local('archive/')}">explore the original editions</a> or follow the <a href="${local('feed.xml')}">RSS feed</a> for new issues.</p>`}</section>`
}));
await write('sponsor/index.html',layout({title:'Sponsor Very Cool Weekly — Reach designers & developers',description:'Partner with an independent design and development newsletter through clearly labeled sponsorships and useful product recommendations.',path:'sponsor/',body:`<section class="page-head wrap"><p class="eyebrow">Advertising</p><h1>Advertise in<br>Very Cool Weekly</h1><p>Tools, products, and ideas for people who care about making things well.</p></section><section class="wrap info-grid"><article><p class="eyebrow">Lead sponsor</p><h2>Sponsor an edition</h2><p>One sponsor per edition, with a dedicated placement near the top of the web and email editions. A useful story, a clear label, and a link to learn more.</p></article><article><p class="eyebrow">Product recommendations</p><h2>Recommend a product</h2><p>Up to two relevant products per issue. Affiliate picks disclose commissions beside the recommendation. Our own products are labeled, too.</p></article><article><p class="eyebrow">Editorial policy</p><h2>Every placement is reviewed</h2><p>We review every placement. Sponsorships don’t buy editorial coverage. Audience size, availability, pricing, and reporting are agreed before booking.</p></article></section><section class="wrap manifesto"><h2>Get in touch</h2><p>The next chapter is taking shape. Get in touch about a future edition.</p><a class="button" href="${e(config.sponsorContact)}">Talk to Ruckus Labs</a></section>`}));
await write('disclosure/index.html',layout({title:'How we’re supported — Very Cool Weekly',description:'Our approach to sponsorships, affiliate commissions, own products, and independent editorial selections.',path:'disclosure/',body:`<section class="page-head wrap"><p class="eyebrow">Our editorial policy</p><h1>How we’re supported.</h1></section><section class="wrap prose policy"><h2>Editorial picks</h2><p>Editorial picks are independently selected. Original archive issues retain their original recommendations; no affiliate links have been added retroactively.</p><h2>Paid sponsorships</h2><p>Paid placements are labeled “Paid sponsorship” and identify the sponsor, beside the placement, in both web and email editions.</p><h2>Affiliate picks</h2><p>When a link can earn us a commission, the recommendation explains that relationship beside the link. The destination may track purchases under its own policies.</p><h2>Our products</h2><p>Products we make or sell are labeled “Our product.” Other commercial relationships are described where they appear.</p><h2>Email and privacy</h2><p>${config.subscription.enabled?'Email subscriptions are handled by Substack. Its subscription and privacy settings apply when you join the list. Unsubscribe using the link in any edition.':'Email subscriptions are currently closed while we prepare the next chapter.'} This website does not use analytics scripts or advertising pixels. If you follow an external link, that site’s privacy practices apply.</p></section>`}));
await write('404.html',layout({title:'Page not found — Very Cool Weekly',description:'Find your way back to the Very Cool Weekly archive.',robots:true,body:`<section class="page-head wrap"><p class="eyebrow">404</p><h1>This one got away.</h1><p><a class="button" href="${local('archive/')}">Explore the archive</a></p></section>`}));
const sitemapPaths=['','archive/','signup/','sponsor/','disclosure/',...live.map(i=>`${i.slug}/`)];
await write('archive-import.xml',archiveFeed(live,config,images));
await write('sitemap.xml',`<?xml version="1.0" encoding="UTF-8"?><urlset xmlns="http://www.sitemaps.org/schemas/sitemap/0.9">${sitemapPaths.map(path=>`<url><loc>${e(absolute(path))}</loc></url>`).join('')}</urlset>`);
await write('robots.txt',`User-agent: *\nAllow: ${base}\nSitemap: ${absolute('sitemap.xml')}\n`);
const feedItems=live.map(i=>`<item><title>${e(i.title)}</title><link>${e(absolute(`${i.slug}/`))}</link><guid isPermaLink="true">${e(absolute(`${i.slug}/`))}</guid><pubDate>${new Date(`${i.date}T12:00:00Z`).toUTCString()}</pubDate><description>${e(i.description)}</description></item>`).join('');
await write('feed.xml',`<?xml version="1.0" encoding="UTF-8"?><rss version="2.0" xmlns:atom="http://www.w3.org/2005/Atom"><channel><title>Very Cool Weekly</title><link>${config.url}</link><description>${e(config.description)}</description><language>en-us</language><atom:link href="${absolute('feed.xml')}" rel="self" type="application/rss+xml"/>${feedItems}</channel></rss>`);
await write('feed.json',JSON.stringify({version:'https://jsonfeed.org/version/1.1',title:config.name,home_page_url:config.url,feed_url:absolute('feed.json'),items:live.map(i=>({id:absolute(`${i.slug}/`),url:absolute(`${i.slug}/`),title:i.title,content_text:i.description,date_published:`${i.date}T12:00:00Z`}))},null,2));
console.log(`Built ${issues.length} issues at ${base}${drafts?' (draft preview; noindex)':''}. Email editions: exports/emails/`);
async function write(path,contents){await mkdir(`dist/${path.split('/').slice(0,-1).join('/')}`,{recursive:true});await writeFile(`dist/${path}`,contents);}
