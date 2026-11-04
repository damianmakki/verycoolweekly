import { escape as e, rich } from './lib.mjs';

// The historical migration feed remains separate from the full-text public feeds.
export function archiveFeed(issues, site, images = {}) {
  const absolute = path => new URL(path, site.url).href;
  const cdata = value => `<![CDATA[${value.replaceAll(']]>', ']]]]><![CDATA[>')}]]>`;
  const picture = image => {
    const variant = images[image?.src]?.variants?.at(-1);
    return variant ? `<p><img src="${e(absolute(variant.src))}" alt="${e(image.alt || '')}"></p>` : '';
  };
  const archived = issues.filter(i => i.archived && i.status === 'published').sort((a,b) => a.number-b.number);
  const items = archived.map(issue => {
    const url = absolute(`${issue.slug}/`);
    const body = `<p><em>From the Very Cool Weekly archive. Originally published ${e(issue.date)}. Links and commentary reflect that time.</em></p>${picture(issue.hero)}${rich(issue.introHtml)}${issue.items.map(item => `<h2><a href="${e(item.url)}">${e(item.title)}</a></h2>${picture(item.image)}${rich(item.bodyHtml)}${item.source ? `<p><em>${e(item.source)}</em></p>` : ''}`).join('')}<p><a href="${e(url)}">Original edition on Ruckus Labs</a></p>`;
    return `<item><title>${e(issue.title)}</title><link>${e(url)}</link><guid isPermaLink="true">${e(url)}</guid><pubDate>${new Date(`${issue.date}T12:00:00Z`).toUTCString()}</pubDate><dc:creator>${e(site.author.name)}</dc:creator><description>${e(issue.description)}</description><content:encoded>${cdata(body)}</content:encoded></item>`;
  }).join('');
  return `<?xml version="1.0" encoding="UTF-8"?><rss version="2.0" xmlns:content="http://purl.org/rss/1.0/modules/content/" xmlns:dc="http://purl.org/dc/elements/1.1/"><channel><title>${e(site.name)} — Original archive</title><link>${e(site.url)}</link><description>The original Very Cool Weekly editions, with complete commentary.</description><language>en-us</language>${items}</channel></rss>`;
}
