import test from 'node:test';
import assert from 'node:assert/strict';
import { reviewCandidate, applyEditingNote, approvedCandidates, buildHopper, copyHash } from '../scripts/editorial.mjs';
const candidate={id:'test-pick',title:'A useful article',url:'https://example.org/article',source:'Original author',checkedAt:'2026-11-03',summary:'A specific article.',whyItFits:'Useful to designers.',copy:{bodyHtml:'<p>A useful explanation.</p>',xText:'A useful idea.',noteText:'A useful idea, with context.'},decision:'pending',notesApplied:false,approvedHash:null};
const batch={date:'2026-11-13',issueSlug:'issue-12',issueNumber:12,candidates:[candidate]};
const config={account:'verycoolweekly',timeZone:'America/Denver',articleTimes:['09:30','14:30'],roundupTime:'10:00',delivery:'export-only'};
const site={url:'https://ruckuslabs.co/verycoolweekly/',author:{name:'Damian Makki'}};
const now=new Date('2026-11-03T12:00:00Z');
test('pending and rejected picks never reach the hopper',()=>{
 assert.throws(()=>buildHopper(batch,config,site,{now}),/No approved/);
 assert.throws(()=>buildHopper({...batch,candidates:[reviewCandidate(candidate,{decision:'rejected'})]},config,site,{now}),/No approved/);
});
test('a thumbs up without notes approves the exact reviewed copy',()=>{
 const approved=reviewCandidate(candidate,{decision:'approved'});
 assert.equal(approved.approvedHash,copyHash(approved));
 assert.equal(approvedCandidates({...batch,candidates:[approved]}).length,1);
 const changed=structuredClone(approved);changed.copy.xText='Changed without applying a note.';
 assert.equal(approvedCandidates({...batch,candidates:[changed]}).length,0);
});
test('an editing note blocks the pick until applied to all channel copy',()=>{
 const approved=reviewCandidate(candidate,{decision:'approved',note:'Make it shorter.'});
 assert.equal(approvedCandidates({...batch,candidates:[approved]}).length,0);
 const edited=applyEditingNote(approved,{bodyHtml:'<p>Short copy.</p>',xText:'Short copy.',noteText:'Short context.'});
 assert.equal(approvedCandidates({...batch,candidates:[edited]}).length,1);
 assert.equal(edited.editingNote,'Make it shorter.');assert.equal(edited.history.at(-1).action,'editing-note-applied');
 assert.throws(()=>applyEditingNote(candidate,edited.copy),/No approved editing note/);
});
test('hopper contains only approved picks and produces all requested channel formats',()=>{
 const approved=reviewCandidate(candidate,{decision:'approved'});
 const other={...candidate,id:'unreviewed',url:'https://example.org/unreviewed',title:'Do not include'};
 const result=buildHopper({...batch,candidates:[approved,other]},config,site,{now});
 assert.equal(result.issue.items.length,1);assert.equal(result.issue.status,'draft');
 assert.ok(!result.postHtml.includes('Do not include'));assert.ok(result.emailHtml.includes('{{ unsubscribe_url }}'));
 assert.deepEqual(result.manifest.selected,['test-pick']);
 assert.ok(['x','substack-note','substack-edition','email'].every(channel=>result.manifest.jobs.some(j=>j.channel===channel)));
 const editions=result.manifest.jobs.filter(j=>['email','substack-edition'].includes(j.channel));
 assert.equal(editions[0].exclusiveDeliveryGroup,editions[1].exclusiveDeliveryGroup);
 assert.equal(result.manifest.delivery,'export-only');assert.ok(result.manifest.jobs.every(j=>!['sent','scheduled'].includes(j.state)));
});
test('source changes invalidate approval; rejection can revoke a previous thumbs up',()=>{
 const approved=reviewCandidate(candidate,{decision:'approved'});
 assert.equal(approvedCandidates({...batch,candidates:[{...approved,url:'https://example.org/changed'}]}).length,0);
 assert.equal(approvedCandidates({...batch,candidates:[reviewCandidate(approved,{decision:'rejected'})]}).length,0);
});
test('repeat builds have stable post IDs and fingerprints; new feedback changes the snapshot',()=>{
 const approved=reviewCandidate(candidate,{decision:'approved'},'2026-11-03T10:00:00Z');
 const b={...batch,candidates:[approved]};const a=buildHopper(b,config,site,{now});
 const again=buildHopper(b,config,site,{now:new Date('2026-11-03T13:00:00Z')});
 assert.equal(a.manifest.contentHash,again.manifest.contentHash);
 assert.deepEqual(a.manifest.jobs.map(j=>j.id),again.manifest.jobs.map(j=>j.id));
});


test('selected free Buffer and Substack routes never imply delivery or a second email send',()=>{
 const approved=reviewCandidate(candidate,{decision:'approved'});
 const result=buildHopper({...batch,candidates:[approved]},
  {...config,publishingProvider:'buffer-free',buffer:{channelId:'verified-channel'}},
  {...site,subscription:{provider:'substack',enabled:true}},{now});
 assert.ok(result.manifest.jobs.filter(j=>j.channel==='x').every(j=>j.state==='ready-for-buffer-scheduling'));
 assert.equal(result.manifest.jobs.find(j=>j.channel==='email').state,'disabled-use-substack');
 assert.equal(result.manifest.delivery,'export-only');
 assert.ok(result.manifest.emailPolicy.includes('do not send it separately'));
});

test('discovery plans stay attached to approved picks and tag changes require review again',()=>{
 const discovery={checkedAt:'2026-11-03',topics:['CSS'],entities:[{name:'Original author',role:'author',url:'https://example.org/',sourceUrl:'https://example.org/article',accounts:{x:{handle:'@author',url:'https://x.com/author',evidenceUrl:'https://example.org/',checkedAt:'2026-11-03',verification:'official-link'}}}],x:{hashtags:['#CSS']}};
 const approved=reviewCandidate({...candidate,discovery},{decision:'approved'});
 const result=buildHopper({...batch,candidates:[approved]},config,site,{now});
 assert.equal(result.manifest.discoveryPlan[0].candidateId,candidate.id);
 assert.deepEqual(result.manifest.discoveryPlan[0].discovery,discovery);
 const changed=structuredClone(approved);changed.discovery.entities[0].accounts.x.handle='@someoneelse';
 assert.equal(approvedCandidates({...batch,candidates:[changed]}).length,0);
 const invalid=structuredClone(approved);invalid.discovery.entities[0].accounts.x.evidenceUrl='javascript:alert(1)';
 assert.throws(()=>approvedCandidates({...batch,candidates:[invalid]}),/evidence/);
});

test('Substack-first drafts do not require a website issue and X roundups wait for the actual post URL',()=>{
 const approved=reviewCandidate(candidate,{decision:'approved'});
 const substackSite={...site,subscription:{provider:'substack',publicationUrl:'https://verycoolweekly.substack.com/'},publishing:{source:'substack'}};
 const result=buildHopper({...batch,candidates:[approved]},config,substackSite,{now});
 assert.equal(result.manifest.jobs.find(j=>j.channel==='substack-edition').requiresLiveIssue,false);
 assert.notEqual(result.manifest.contentHash,buildHopper({...batch,candidates:[approved]},config,site,{now}).manifest.contentHash);
 assert.equal(result.manifest.jobs.find(j=>j.kind==='roundup').state,'waiting-substack-url');
 assert.ok(!result.postHtml.includes('https://ruckuslabs.co/verycoolweekly/issue-12/'));
 const ready=buildHopper({...batch,candidates:[approved],substackPostUrl:'https://verycoolweekly.substack.com/p/actual-post-slug'},config,substackSite,{now});
 const roundup=ready.manifest.jobs.find(j=>j.kind==='roundup');
 assert.equal(new URL(roundup.url).pathname,'/p/actual-post-slug');
 assert.equal(roundup.requiresPublishedSubstackPost,true);assert.equal(roundup.missingSubstackUrl,false);
 assert.throws(()=>buildHopper({...batch,candidates:[approved],substackPostUrl:'https://example.org/wrong-post'},config,substackSite,{now}),/actual Substack post URL/);
});
