import { createHash } from 'node:crypto';
import twitterText from 'twitter-text';
import { plain, httpUrl, validateIssues } from './lib.mjs';

const hash = value => createHash('sha256').update(JSON.stringify(value)).digest('hex');
const slotsByCount = {
  1: [[1,0]],
  2: [[3,0],[1,0]],
  3: [[4,0],[2,0],[1,0]],
  4: [[4,0],[3,0],[2,0],[1,0]],
  5: [[4,0],[3,0],[2,0],[1,0],[1,1]],
  6: [[4,0],[3,0],[2,0],[2,1],[1,0],[1,1]],
  7: [[4,0],[3,0],[3,1],[2,0],[2,1],[1,0],[1,1]],
  8: [[4,0],[4,1],[3,0],[3,1],[2,0],[2,1],[1,0],[1,1]]
};

const tuesdaySlots = {
  1: [[1,0]],
  2: [[3,0],[1,0]],
  3: [[3,0],[2,0],[1,0]],
  4: [[3,0],[2,0],[1,0],[1,1]],
  5: [[3,0],[3,1],[2,0],[1,0],[1,1]],
  6: [[3,0],[3,1],[2,0],[2,1],[1,0],[1,1]]
};

function dateBefore(date, days) {
  const result = new Date(`${date}T12:00:00Z`);
  result.setUTCDate(result.getUTCDate() - days);
  return result.toISOString().slice(0,10);
}

// Convert an intended wall-clock time using the IANA zone's offset on that date,
// rather than a fixed UTC offset. The default daytime slots avoid DST transitions.
export function zonedInstant(date, time, timeZone) {
  if (!/^\d{2}:\d{2}$/.test(time) || Number(time.slice(0,2)) > 23 || Number(time.slice(3)) > 59) {
    throw new Error('Posting times must use HH:MM, from 00:00 to 23:59');
  }
  const desired = Date.parse(`${date}T${time}:00Z`);
  const formatter = new Intl.DateTimeFormat('en-CA', {
    timeZone, year:'numeric', month:'2-digit', day:'2-digit',
    hour:'2-digit', minute:'2-digit', second:'2-digit', hourCycle:'h23'
  });
  let guess = desired;
  for (let n=0; n<4; n++) {
    const parts = Object.fromEntries(formatter.formatToParts(new Date(guess)).map(p=>[p.type,p.value]));
    const rendered = Date.parse(`${parts.year}-${parts.month}-${parts.day}T${parts.hour}:${parts.minute}:${parts.second}Z`);
    if (rendered === desired) return new Date(guess).toISOString();
    guess += desired - rendered;
  }
  throw new Error(`Cannot resolve ${date} ${time} in ${timeZone}; choose a different posting time`);
}

function clip(text, limit) {
  let result = text.trim();
  while (twitterText.parseTweet(result).weightedLength > limit) {
    const characters = Array.from(result.replace(/…$/, ''));
    characters.pop();
    result = characters.join('').trimEnd() + '…';
  }
  return result;
}

function identity(url) {
  const u = new URL(url);
  u.hash = '';
  for (const key of [...u.searchParams.keys()]) if (key.startsWith('utm_')) u.searchParams.delete(key);
  return u.href;
}

export function createSocialPlan(issue, config, site, {now=new Date(), example=false}={}) {
  const errors = validateIssues([issue]);
  if (errors.length) throw new Error(errors.join('\n'));
  if (issue.archived && !example) throw new Error('Archive issues require --example; they must not enter a live queue');
  if (!/^[A-Za-z0-9_]{1,15}$/.test(config.account || '')) throw new Error('Set a valid X account handle');
  if (config.delivery !== 'export-only') throw new Error('This planner supports export-only delivery; no posts are sent');
  if (!httpUrl(site.url)) throw new Error('Set the canonical website URL');
  if (new Date(`${issue.date}T12:00:00Z`).getUTCDay() !== 5) throw new Error('The default social cadence requires a Friday issue date');
  if (!Array.isArray(config.articleTimes) || config.articleTimes.length !== 2) throw new Error('Configure two article posting times');
  if (config.articleStartDay && !['monday','tuesday'].includes(config.articleStartDay)) throw new Error('Unknown article start day');
  const slots = config.articleStartDay === 'tuesday' ? tuesdaySlots : slotsByCount;
  if (!slots[issue.items.length]) throw new Error(config.articleStartDay === 'tuesday' ? 'Tuesday–Thursday supports up to six picks at two posts per day; select six or set an explicit alternative cadence' : 'The weekly cadence supports 1–8 editorial picks; split larger issues explicitly');

  const blockers = [];
  if (example) blockers.push('Historical example only; never submit these posts');
  if (issue.status === 'draft') blockers.push('The issue is still a draft');
  if (/TODO|example\.com|YOUR_ID/.test(JSON.stringify(issue))) blockers.push('Replace placeholder content before review');
  const seen = new Set();
  const posts = issue.items.map((item,index) => {
    if (item.kind !== 'editorial') throw new Error('Only editorial picks belong in the article drip');
    const key = identity(item.url);
    if (seen.has(key)) throw new Error(`Duplicate article destination: ${item.url}`);
    seen.add(key);
    const [days,timeIndex] = slots[issue.items.length][index];
    const localDate = dateBefore(issue.date,days), localTime = config.articleTimes[timeIndex];
    const url = item.url;
    // Author-written xText is body copy only; we append and preserve the original URL.
    const generated = `${clip(item.title,100)}\n\n${clip(plain(item.bodyHtml),125)}`;
    const text = `${item.xText?.trim() || generated}\n\n${url}`.normalize('NFC');
    return {id:`${issue.slug}:x:article:${hash(key).slice(0,16)}`,kind:'article',articleTitle:item.title,
      url,text,localDate,localTime,timeZone:config.timeZone,
      scheduledAt:zonedInstant(localDate,localTime,config.timeZone),requiresLiveIssue:false};
  });
  const substackSource=site.publishing?.source==='substack';
  if(substackSource&&issue.substackPostUrl){
    if(!httpUrl(issue.substackPostUrl)||new URL(issue.substackPostUrl).origin!==new URL(site.subscription.publicationUrl).origin||!new URL(issue.substackPostUrl).pathname.startsWith('/p/'))throw new Error('Set the actual Substack post URL for this edition');
  }
  if(substackSource&&!issue.substackPostUrl)blockers.push('Add the actual published Substack post URL before scheduling the roundup');
  const summaryUrl = substackSource?new URL(issue.substackPostUrl||site.subscription.publicationUrl):new URL(`${issue.slug}/`, site.url);
  summaryUrl.searchParams.set('utm_source','x');
  summaryUrl.searchParams.set('utm_medium','social');
  summaryUrl.searchParams.set('utm_campaign',issue.slug);
  const preview = issue.items.slice(0,3).map(i=>i.title).join(' · ');
  const summaryCopy = issue.xSummary?.trim() || `This week’s very cool finds:\n\n${clip(preview,180)}\n\nThe full edition ↓`;
  posts.push({id:`${issue.slug}:x:roundup`,kind:'roundup',url:summaryUrl.href,
    text:`${summaryCopy}\n\n${summaryUrl.href}`.normalize('NFC'),
    localDate:issue.date,localTime:config.roundupTime,timeZone:config.timeZone,
    scheduledAt:zonedInstant(issue.date,config.roundupTime,config.timeZone),requiresLiveIssue:!substackSource,...(substackSource?{requiresPublishedSubstackPost:true,missingSubstackUrl:!issue.substackPostUrl}:{})});

  const daily = new Map();
  for (const post of posts) {
    const parsed = twitterText.parseTweet(post.text);
    if (!parsed.valid) throw new Error(`${post.id}: invalid X text (${parsed.weightedLength} weighted characters); shorten xText/xSummary`);
    post.weightedLength = parsed.weightedLength;
    post.status = 'draft';
    post.missedSlot = Date.parse(post.scheduledAt) <= now.getTime();
    if (post.missedSlot) blockers.push(`Missed slot: ${post.id}; reschedule or explicitly skip, never catch up in a burst`);
    daily.set(post.localDate,(daily.get(post.localDate)||0)+1);
  }
  if ([...daily.values()].some(count=>count>2)) throw new Error('More than two posts on one day');
  if (posts.some((p,n)=>n && p.scheduledAt <= posts[n-1].scheduledAt)) throw new Error('Posting slots must be unique, chronological, and before the roundup');

  return {version:1,account:config.account,profileUrl:`https://x.com/${config.account}`,issue:issue.slug,
    issueDate:issue.date,timeZone:config.timeZone,delivery:'export-only',example,
    generatedAt:now.toISOString(),contentHash:hash({issue,config,siteUrl:site.url,...(substackSource?{publication:site.subscription.publicationUrl,publishingSource:'substack'}:{})}),
    approvedAt:null,readyToReview:blockers.length===0,blockers,posts};
}
