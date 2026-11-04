import { mkdir, readFile, writeFile } from 'node:fs/promises';
import { createSocialPlan } from './social-plan.mjs';
const args=process.argv.slice(2),index=args.indexOf('--issue'),slug=index>=0?args[index+1]:undefined;
if (!slug || !/^[a-z0-9]+(?:-[a-z0-9]+)*$/.test(slug)) throw new Error('Usage: npm run social:plan -- --issue issue-12 [--example]');
const [issue,config,site] = await Promise.all([
  readFile(`content/issues/${slug}.json`,'utf8'),readFile('social.config.json','utf8'),readFile('site.config.json','utf8')
]).then(values=>values.map(JSON.parse));
const plan=createSocialPlan(issue,config,site,{example:args.includes('--example')});
const destination=`exports/social/${slug}`;
await mkdir(destination,{recursive:true});
await writeFile(`${destination}/x-plan.json`,JSON.stringify(plan,null,2)+'\n');
const preview=[`X post plan for @${plan.account}`,`Issue: ${plan.issue}`,`Timezone: ${plan.timeZone}`,
  'DRAFT / EXPORT ONLY — nothing is scheduled or posted.',
  `Content fingerprint: ${plan.contentHash}`,
  ...plan.blockers.map(b=>`BLOCKED: ${b}`),'',
  ...plan.posts.flatMap((p,n)=>[`${n+1}. ${p.kind.toUpperCase()} — ${p.localDate} ${p.localTime} ${p.timeZone}`,
    `UTC: ${p.scheduledAt} | ${p.weightedLength}/280 weighted characters`,p.text,'',
    p.requiresLiveIssue?'Before sending: verify the production issue is live with its expected title and canonical URL.':'Links directly to the original article.',''])].join('\n');
await writeFile(`${destination}/x-posts.txt`,preview);
console.log(`Prepared ${plan.posts.length} X drafts in ${destination}/. ${plan.readyToReview?'Ready for copy review.':`${plan.blockers.length} blockers listed in the preview.`} No posts sent or scheduled.`);
