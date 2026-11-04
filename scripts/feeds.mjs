import {escape as e,plain} from './lib.mjs';
const cdata=value=>`<![CDATA[${value.replaceAll(']]>',']]]]><![CDATA[>')}]]>`;

// Compatibility feeds mirror published Substack content; the website never authors it.
export function substackFeeds(posts,site){
 const absolute=path=>new URL(path,site.url).href;
 const items=posts.map(post=>`<item><title>${e(post.title)}</title><link>${e(post.url)}</link><guid isPermaLink="true">${e(post.legacyUrl||post.url)}</guid><pubDate>${new Date(post.publishedAt).toUTCString()}</pubDate><dc:creator>${e(site.author.name)}</dc:creator><description>${cdata(post.contentHtml)}</description><content:encoded>${cdata(post.contentHtml)}</content:encoded></item>`).join('');
 const rss=`<?xml version="1.0" encoding="UTF-8"?><rss version="2.0" xmlns:atom="http://www.w3.org/2005/Atom" xmlns:content="http://purl.org/rss/1.0/modules/content/" xmlns:dc="http://purl.org/dc/elements/1.1/"><channel><title>${e(site.name)}</title><link>${e(site.url)}</link><description>${e(site.description)}</description><language>en-us</language><atom:link href="${e(absolute('feed.xml'))}" rel="self" type="application/rss+xml"/>${items}</channel></rss>`;
 const json={version:'https://jsonfeed.org/version/1.1',title:site.name,description:site.description,home_page_url:site.url,feed_url:absolute('feed.json'),language:'en-US',authors:[{name:site.author.name,url:site.author.url}],items:posts.map(post=>({id:post.legacyUrl||post.url,url:post.url,title:post.title,summary:post.summary,content_html:post.contentHtml,content_text:plain(post.contentHtml.replace(/<\/(?:p|h[1-6]|li|section|figcaption)>/g,'$& ')),date_published:post.publishedAt,...(post.image?{image:post.image.src}:{})}))};
 return {rss,json};
}
