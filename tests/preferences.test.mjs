import test from 'node:test';
import assert from 'node:assert/strict';
import { preferenceProfile } from '../scripts/preferences.mjs';
import { applyReviewChanges } from '../scripts/review-server.mjs';
const pick=(id,decision,extra={})=>({id,title:id,url:`https://example.org/${id}`,decision,category:'Development',discovery:{topics:['CSS','Layout']},...extra});
test('preferences use current reviewed decisions, ignore pending, and do not infer taste from editing notes',()=>{
 const profile=preferenceProfile([{date:'2026-11-06',candidates:[pick('yes','approved',{editingNote:'Make it shorter'}),pick('no','rejected'),pick('maybe','pending')]}]);
 assert.equal(profile.reviewed,2);assert.equal(profile.topics[0].kept,1);assert.equal(profile.topics[0].passed,1);
 assert.equal(profile.topics[0].confidence,'early');assert.deepEqual(profile.explicitFeedback,[]);
 assert.equal(profile.policy.explorationShare,.25);
});
test('repeated articles count once and newer decisions or pending reversals replace old votes',()=>{
 const old={date:'2026-11-06',candidates:[pick('same','approved')]};
 const newer={date:'2026-11-13',candidates:[pick('same','rejected',{url:'https://example.org/same?utm_source=test#intro'})]};
 assert.equal(preferenceProfile([old,newer]).reviewed,1);assert.equal(preferenceProfile([old,newer]).passed,1);
 assert.equal(preferenceProfile([old,{...newer,candidates:[pick('same','pending')]}]).reviewed,0);
 assert.equal(preferenceProfile([old,newer],{before:'2026-11-13'}).kept,1);
});
test('article-only votes stay out of topic trends and explicit reasons are retained separately',()=>{
 const c=pick('one-off','rejected',{preferenceFeedback:{scope:'article',reason:'Already read this one. Keep sending CSS.'}});
 const profile=preferenceProfile([{date:'2026-11-06',candidates:[c]}]);
 assert.equal(profile.reviewed,1);assert.deepEqual(profile.topics,[]);assert.deepEqual(profile.sources,[]);
 assert.equal(profile.explicitFeedback[0].reason,c.preferenceFeedback.reason);
 const batch={candidates:[c]},updated=applyReviewChanges(batch,[{id:c.id,decision:'rejected',note:'',preferenceFeedback:{scope:'similar',reason:'Too introductory'}}]);
 assert.equal(updated.candidates[0].preferenceFeedback.reason,'Too introductory');
 assert.equal(batch.candidates[0].preferenceFeedback.scope,'article');
});
