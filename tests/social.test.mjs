import test from 'node:test';
import assert from 'node:assert/strict';
import { createSocialPlan, zonedInstant } from '../scripts/social-plan.mjs';
const config={account:'verycoolweekly',timeZone:'America/Denver',articleTimes:['09:30','14:30'],roundupTime:'10:00',delivery:'export-only'};
const site={url:'https://ruckuslabs.co/verycoolweekly/'};
const issue={number:20,slug:'issue-20',date:'2026-11-13',status:'scheduled',title:'Useful things',description:'Six design and development discoveries.',introHtml:'<p>A useful introduction.</p>',hero:{src:'assets/images/verycool.png',alt:'Very Cool Weekly'},
 items:Array.from({length:6},(_,n)=>({title:`Interesting project ${n+1}`,kind:'editorial',url:`https://example.org/projects/${n+1}`,bodyHtml:'<p>A practical idea for people who make things.</p>'})),products:[],sponsor:null};
const now=new Date('2026-11-07T12:00:00Z');
test('six articles run Monday to Thursday before the Friday roundup, directly linking to the sources',()=>{
 const plan=createSocialPlan(issue,config,site,{now});
 assert.equal(plan.posts.length,7);assert.equal(plan.readyToReview,true);assert.equal(plan.approvedAt,null);
 assert.deepEqual(plan.posts.map(p=>p.localDate),['2026-11-09','2026-11-10','2026-11-11','2026-11-11','2026-11-12','2026-11-12','2026-11-13']);
 assert.deepEqual(plan.posts.slice(0,6).map(p=>p.url),issue.items.map(i=>i.url));
 assert.ok(plan.posts.every(p=>p.status==='draft'&&p.weightedLength<=280));
 assert.equal(plan.posts.at(-1).requiresLiveIssue,true);
 assert.equal(new URL(plan.posts.at(-1).url).searchParams.get('utm_source'),'x');
});
test('Mountain time follows daylight saving time rather than a fixed UTC offset',()=>{
 assert.equal(zonedInstant('2026-10-30','10:00','America/Denver'),'2026-10-30T16:00:00.000Z');
 assert.equal(zonedInstant('2026-11-06','10:00','America/Denver'),'2026-11-06T17:00:00.000Z');
 assert.throws(()=>zonedInstant('2026-11-06','25:00','America/Denver'));
});
test('up to eight picks have distinct times, fit before the summary, and never exceed two per day',()=>{
 for(let count=1;count<=8;count++){
  const picks=Array.from({length:count},(_,n)=>({...issue.items[0],title:`Pick ${n}`,url:`https://example.org/${n}`}));
  const {posts}=createSocialPlan({...issue,items:picks},config,site,{now});
  assert.equal(new Set(posts.map(p=>p.scheduledAt)).size,posts.length);
  assert.ok(posts.every((p,n)=>!n||p.scheduledAt>posts[n-1].scheduledAt));
  const counts=posts.reduce((a,p)=>({...a,[p.localDate]:(a[p.localDate]||0)+1}),{});
  assert.ok(Object.values(counts).every(n=>n<=2));
 }
});
test('copy review is invalidated when the issue or campaign settings change',()=>{
 const first=createSocialPlan(issue,config,site,{now});
 const later=createSocialPlan(issue,config,site,{now:new Date('2026-11-07T13:00:00Z')});
 assert.equal(first.contentHash,later.contentHash);
 const edited=structuredClone(issue);edited.items[0].xText='A better explanation of why this is useful.';
 assert.notEqual(first.contentHash,createSocialPlan(edited,config,site,{now}).contentHash);
 assert.notEqual(first.contentHash,createSocialPlan(issue,{...config,roundupTime:'11:00'},site,{now}).contentHash);
});
test('drafts and missed slots remain blocked; archives cannot become regular campaigns',()=>{
 assert.ok(createSocialPlan({...issue,status:'draft'},config,site,{now}).blockers.some(x=>x.includes('draft')));
 assert.ok(createSocialPlan(issue,config,site,{now:new Date('2026-11-14T12:00:00Z')}).posts.every(p=>p.missedSlot));
 assert.throws(()=>createSocialPlan({...issue,archived:true},config,site,{now}),/Archive/);
 assert.equal(createSocialPlan({...issue,archived:true},config,site,{now,example:true}).readyToReview,false);
});
test('duplicate sources, non-Friday dates, and oversized custom text are rejected',()=>{
 const duplicate=structuredClone(issue);duplicate.items[1].url=duplicate.items[0].url+'?utm_source=test#section';
 assert.throws(()=>createSocialPlan(duplicate,config,site,{now}),/Duplicate/);
 assert.throws(()=>createSocialPlan({...issue,date:'2026-11-12'},config,site,{now}),/Friday/);
 const long=structuredClone(issue);long.items[0].xText='界'.repeat(200);
 assert.throws(()=>createSocialPlan(long,config,site,{now}),/weighted characters/);
});
test('automatic drafts handle long Unicode copy and long URLs within X weighted limits',()=>{
 const long=structuredClone(issue);long.items[0].title='界'.repeat(100);long.items[0].bodyHtml='<p>'+ '👨‍👩‍👧‍👦'.repeat(150)+'</p>';long.items[0].url='https://example.org/'+ 'a'.repeat(500);
 const plan=createSocialPlan(long,config,site,{now});
 assert.ok(plan.posts[0].weightedLength<=280);
 assert.ok(plan.posts[0].text.endsWith(long.items[0].url));
});
test('Monday research cadence starts Tuesday and rejects overflow instead of posting before review',()=>{
 const c={...config,articleStartDay:'tuesday'};
 const plan=createSocialPlan(issue,c,site,{now});
 assert.deepEqual(plan.posts.map(p=>p.localDate),['2026-11-10','2026-11-10','2026-11-11','2026-11-11','2026-11-12','2026-11-12','2026-11-13']);
 assert.throws(()=>createSocialPlan({...issue,items:[...issue.items,{...issue.items[0],url:'https://example.org/seventh'}]},c,site,{now}),/up to six/);
});
