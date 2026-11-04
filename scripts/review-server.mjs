import http from 'node:http';
import { readFile, writeFile, readdir, rename } from 'node:fs/promises';
import { resolve, dirname } from 'node:path';
import { fileURLToPath } from 'node:url';
import { createHash, randomBytes } from 'node:crypto';
import { execFile } from 'node:child_process';
import { promisify } from 'node:util';
import { reviewCandidate, validateBatch, approvedCandidates, copyHash } from './editorial.mjs';
import { feedback, readPreferences } from './preferences.mjs';
import { readArtwork, saveArtwork, mediaHash } from './artwork.mjs';

const run = promisify(execFile);
const digest = value => createHash('sha256').update(value).digest('hex');
const datePattern = /^\d{4}-\d{2}-\d{2}$/;

export function applyReviewChanges(batch, changes) {
  if (!Array.isArray(changes) || changes.length > batch.candidates.length) throw new Error('Invalid review changes');
  const next = structuredClone(batch), seen = new Set();
  for (const change of changes) {
    if (seen.has(change.id)) throw new Error('Duplicate candidate');
    seen.add(change.id);
    const index = next.candidates.findIndex(c => c.id === change.id);
    if (index < 0 || !['pending','approved','rejected'].includes(change.decision) || typeof change.note !== 'string' || change.note.length > 10000) throw new Error('Invalid candidate decision');
    const current = next.candidates[index], note = change.note.trim();
    if (change.bodyText !== undefined && (typeof change.bodyText !== 'string' || !change.bodyText.trim() || change.bodyText.length > 20000)) throw new Error('My take must contain 1–20000 characters');
    const editedHtml = change.bodyText === undefined ? current.copy?.bodyHtml : change.bodyText.replace(/\r\n?/g,'\n').split(/\n\n+/).map(text=>`<p>${text.replace(/[&<>"']/g,c=>({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[c])).replace(/\n/g,'<br>')}</p>`).join('\n');
    const editedCopy={...current.copy,bodyHtml:editedHtml};
    for(const [field,label] of [['xText','X post'],['noteText','Substack Note']]){
      if(change[field]===undefined)continue;
      if(typeof change[field]!=='string'||!change[field].trim()||change[field].length>20000)throw new Error(`${label} must contain 1–20000 characters`);
      editedCopy[field]=change[field];
    }
    if(change.noteText!==undefined&&editedCopy.noteLinks)editedCopy.noteLinks=editedCopy.noteLinks.filter(link=>change.noteText.includes(link.text));
    const copyEdited = JSON.stringify(editedCopy) !== JSON.stringify(current.copy||{});
    const preferenceFeedback=feedback(change.preferenceFeedback ?? current.preferenceFeedback);
    if(JSON.stringify(preferenceFeedback)!==JSON.stringify(feedback(current.preferenceFeedback)))next.candidates[index].preferenceFeedback=preferenceFeedback;
    if (!copyEdited && current.decision === change.decision && (current.editingNote || '') === note && !(change.decision === 'approved' && !note && current.approvedHash !== copyHash(current))) continue;
    if (change.decision === 'pending') {
      next.candidates[index] = {...current, decision:'pending', editingNote:note, notesApplied:false, approvedHash:null,
        history:[...(current.history || []), {at:new Date().toISOString(), action:'pending', note}]};
    } else next.candidates[index] = {...reviewCandidate(current, {...change, note}),preferenceFeedback};
    if(copyEdited){
      const updated=next.candidates[index];
      next.candidates[index]={...updated,copy:editedCopy,approvedHash:null,
        history:[...(updated.history||[]),{at:new Date().toISOString(),action:'copy-edited'}]};
    }
  }
  return next;
}

export function createReviewServer({root = resolve(dirname(fileURLToPath(import.meta.url)), '..')} = {}) {
  const token = randomBytes(24).toString('hex');
  let writing = Promise.resolve();
  const batchPath = date => {
    if (!datePattern.test(date)) throw new Error('Invalid edition date');
    return resolve(root, 'content/review', `${date}.json`);
  };
  async function snapshot(date) {
    const raw = await readFile(batchPath(date), 'utf8'), batch = JSON.parse(raw);
    const errors = validateBatch(batch);
    if (errors.length) throw new Error(errors.join('; '));
    const ready=approvedCandidates(batch);
    const media=await readArtwork(root,date),mediaRevision=mediaHash(media);
    media.stale=JSON.stringify(media.selected)!==JSON.stringify(ready.map(c=>({id:c.id,copyHash:copyHash(c)})));
    return {batch, media, mediaRevision, revision:digest(raw), readyIds:ready.map(c=>c.id)};
  }
  return http.createServer(async (req, res) => {
    const host = `127.0.0.1:${res.socket.localPort}`;
    const send = (code, data) => {res.writeHead(code, {'Content-Type':'application/json; charset=utf-8','Cache-Control':'no-store'});res.end(JSON.stringify(data));};
    if (req.headers.host !== host) return send(403, {error:'Open this review on its local address.'});
    const url = new URL(req.url, `http://${host}`);
    res.setHeader('X-Content-Type-Options','nosniff');
    res.setHeader('Referrer-Policy','no-referrer');
    res.setHeader('Content-Security-Policy', "default-src 'self'; script-src 'self'; style-src 'self'; img-src 'self' data:; connect-src 'self'; frame-ancestors 'none'; base-uri 'none'; form-action 'self'");
    try {
      const mediaFile=url.pathname.match(/^\/media\/(\d{4}-\d{2}-\d{2})\/([a-z0-9-]+\.(png|webp|jpg|gif))$/);
      if(req.method==='GET'&&mediaFile){
        const bytes=await readFile(resolve(root,'exports/media',mediaFile[1],mediaFile[2]));
        res.writeHead(200,{'Content-Type':`image/${mediaFile[3]==='jpg'?'jpeg':mediaFile[3]}`,'Cache-Control':'no-store'});
        return res.end(bytes);
      }
      if (req.method === 'GET' && ['/', '/review.js', '/review.css', '/logo.svg'].includes(url.pathname)) {
        const file = url.pathname === '/' ? 'review.html' : url.pathname.slice(1);
        res.writeHead(200, {'Content-Type':file.endsWith('.html')?'text/html; charset=utf-8':file.endsWith('.js')?'text/javascript; charset=utf-8':file.endsWith('.svg')?'image/svg+xml':'text/css; charset=utf-8','Cache-Control':'no-store'});
        return res.end(await readFile(resolve(root,'scripts/review-ui',file)));
      }
      if (req.method === 'GET' && url.pathname === '/api/batches') {
        const dates = (await readdir(resolve(root,'content/review'))).filter(f => datePattern.test(f.slice(0,-5)) && f.endsWith('.json')).map(f=>f.slice(0,-5)).sort().reverse();
        return send(200,{dates,token});
      }
      if (req.method === 'GET' && url.pathname === '/api/review') return send(200, await snapshot(url.searchParams.get('date') || ''));
      if (req.method === 'GET' && url.pathname === '/api/preferences') return send(200, await readPreferences(root));
      if (req.method === 'POST' && ['/api/review','/api/prepare','/api/artwork'].includes(url.pathname)) {
        if (req.headers.origin !== `http://${host}` || req.headers['x-review-token'] !== token || !req.headers['content-type']?.startsWith('application/json')) return send(403,{error:'Reload the review before saving.'});
        let body='';
        for await (const chunk of req) {body+=chunk;if (Buffer.byteLength(body)>(url.pathname==='/api/artwork'?12000000:200000)) return send(413,{error:'Upload is too large. Use an image under 8 MB.'});}
        const input=JSON.parse(body);
        const task = writing.then(async()=>{
          const current=await snapshot(input.date);
          if (input.revision !== current.revision) return send(409,{error:'This review changed elsewhere. Reload to see the latest decisions; your unsaved notes remain on screen.'});
          if(url.pathname==='/api/artwork'){
            await saveArtwork(root,input,current.batch);
            return send(200,await snapshot(input.date));
          }
          if (url.pathname === '/api/prepare') {
            const kept=current.batch.candidates.filter(c=>c.decision==='approved');
            if (!kept.length || kept.length>6 || kept.length!==current.readyIds.length) throw new Error('Choose up to six ready picks and apply outstanding editing notes before preparing drafts.');
            const {stdout}=await run(process.execPath,['scripts/editorial-cli.mjs','hopper','--batch',input.date],{cwd:root});
            return send(200,{message:stdout.trim()});
          }
          const batch=applyReviewChanges(current.batch,input.changes);
          const path=batchPath(input.date), tmp=`${path}.review.tmp`;
          // Invalidate prepared jobs before committing changed approvals.
          const queuePath=resolve(root,'exports/hopper',input.date,'queue.json');
          try {
            const queue=JSON.parse(await readFile(queuePath,'utf8'));
            queue.invalidatedAt=new Date().toISOString();queue.jobs=queue.jobs.map(j=>({...j,state:'invalidated'}));
            await writeFile(queuePath,JSON.stringify(queue,null,2)+'\n');
          } catch (error) {if(error.code!=='ENOENT')throw error;}
          await writeFile(tmp,JSON.stringify(batch,null,2)+'\n');await rename(tmp,path);
          return send(200,await snapshot(input.date));
        });
        writing=task.catch(()=>{});
        await task;return;
      }
      send(404,{error:'Not found'});
    } catch(error) {send(error.status||(error.code==='ENOENT'?404:400),{error:error.message});}
  });
}

if (process.argv[1] && resolve(process.argv[1]) === fileURLToPath(import.meta.url)) {
  const server=createReviewServer();
  server.listen(Number(process.env.REVIEW_PORT || 8766),'127.0.0.1',()=>console.log(`Review: http://127.0.0.1:${server.address().port}/`));
}
