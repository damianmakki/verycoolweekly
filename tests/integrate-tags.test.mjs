import test from 'node:test';
import assert from 'node:assert/strict';
import twitterText from 'twitter-text';
import { integrateTags, noteHtml } from '../scripts/integrate-tags.mjs';

const candidate={id:'pick',url:'https://example.org/article',decision:'approved',approvedHash:'previous',editingNote:'Keep my phrasing',copy:{bodyHtml:'<p>My edit.</p>',xText:'Author explores a thought in Publication.',noteText:'Author explores a different thought in Publication.'},discovery:{entities:[{name:'Author',role:'author',url:'https://example.org/author',accounts:{x:{handle:'@maker',url:'https://x.com/maker',evidenceUrl:'https://example.org/author',checkedAt:'2026-11-03',verification:'official-link'}}},{name:'Publication',role:'publication',url:'https://example.org/',accounts:{x:{handle:'@publisher',url:'https://x.com/publisher',evidenceUrl:'https://example.org/',checkedAt:'2026-11-03',verification:'official-link'}}}],x:{mentionCandidates:['Author','Publication'],hashtags:['#CSS','#Design']}}};

test('tag integration saves reviewed platform copy, preserves author work and is idempotent',()=>{
 const next=integrateTags(candidate,'2026-11-03');
 assert.equal(next.copy.xText,'@maker explores a thought in @publisher. #CSS');
 assert.equal(next.copy.noteText,candidate.copy.noteText);
 assert.deepEqual(next.copy.noteLinks,[{text:'Author',url:'https://example.org/author'},{text:'Publication',url:'https://example.org/'}]);
 assert.match(noteHtml(next),/<a href="https:\/\/example.org\/author">Author<\/a> explores/);
 assert.doesNotMatch(next.copy.noteText,/@maker|#CSS/);
 assert.equal(next.copy.bodyHtml,candidate.copy.bodyHtml);assert.equal(next.editingNote,candidate.editingNote);assert.equal(next.decision,'approved');assert.equal(next.approvedHash,null);
 assert.deepEqual(integrateTags(next),next);assert.equal(candidate.approvedHash,'previous');
 assert.equal(twitterText.parseTweet(`${next.copy.xText}\n\n${next.url}`).valid,true);
});

test('unverified and mismatched handles are excluded; full-length copy is never cut',()=>{
 const unverified=structuredClone(candidate);unverified.discovery.entities[0].accounts.x.verification='unverified';unverified.discovery.entities[1].accounts.x.url='https://x.com/someoneelse';
 assert.doesNotMatch(integrateTags(unverified).copy.xText,/@/);
 const long=structuredClone(candidate);long.copy.xText='界'.repeat(126);
 const result=integrateTags(long);assert.equal(result.copy.xText,long.copy.xText);
 assert.equal(twitterText.parseTweet(`${result.copy.xText}\n\n${result.url}`).valid,true);
});

test('verified Substack profiles become linked credits, never fake native mentions',()=>{
 const c=structuredClone(candidate);c.discovery.entities[0].accounts.substack={handle:'@maker',url:'https://substack.com/@maker',verification:'native-verified',evidenceUrl:'https://example.org/author',checkedAt:'2026-11-03'};
 const result=integrateTags(c);assert.equal(result.copy.noteLinks[0].url,'https://substack.com/@maker');assert.doesNotMatch(result.copy.noteText,/@maker|https:/);
});

test('names absent from the prose do not trigger a credit footer',()=>{
 const c=structuredClone(candidate);c.copy.xText='A thought without a named source.';c.copy.noteText='A different thought.';
 const next=integrateTags(c);assert.equal(next.copy.xText,'A thought without a named source. #CSS');assert.equal(next.copy.noteText,c.copy.noteText);assert.deepEqual(next.copy.noteLinks,[]);
 const unsafe={...next,copy:{...next.copy,noteText:'<script> & Author',noteLinks:[{text:'Author',url:'javascript:alert(1)'}]}};
 assert.doesNotMatch(noteHtml(unsafe),/<script>|javascript:/);assert.match(noteHtml(unsafe),/&lt;script&gt; &amp; Author/);
});
