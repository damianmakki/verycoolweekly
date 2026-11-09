import test from 'node:test';
import assert from 'node:assert/strict';
import {validatePublicIndex} from '../scripts/publish-substack-index.mjs';
import {postsHash} from '../scripts/substack.mjs';
const publicationUrl='https://verycoolweekly.substack.com/';
const snapshot=posts=>({publicationUrl,posts,feedHash:postsHash(posts)});
test('website publisher rejects future content, modified snapshots and other publications',()=>{
 const now=Date.parse('2026-11-13T17:00:00Z');
 const past={url:publicationUrl+'p/test',publishedAt:'2026-11-12T17:00:00Z',date:'2026-11-12'};
 assert.doesNotThrow(()=>validatePublicIndex(snapshot([past]),publicationUrl,now));
 // A matching calendar date cannot make a future release eligible.
 assert.throws(()=>validatePublicIndex(snapshot([{...past,date:'2026-11-13',publishedAt:'2026-11-13T17:11:00Z'}]),publicationUrl,now),/future/);
 assert.throws(()=>validatePublicIndex(snapshot([{...past,publishedAt:null}]),publicationUrl,now),/undated/);
 assert.throws(()=>validatePublicIndex({...snapshot([past]),feedHash:'changed'},publicationUrl,now),/Invalid/);
 assert.throws(()=>validatePublicIndex(snapshot([past]),'https://other.substack.com/',now),/Invalid/);
});
