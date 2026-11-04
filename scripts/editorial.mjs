import { createHash } from 'node:crypto';
import { escape as e, httpUrl, rich, validateIssues } from './lib.mjs';
import { createSocialPlan, zonedInstant } from './social-plan.mjs';
import { feedback } from './preferences.mjs';
import { noteHtml } from './integrate-tags.mjs';
const digest = value => createHash('sha256').update(JSON.stringify(value)).digest('hex');
export const copyHash = c => digest({title:c.title,url:c.url,copy:c.copy,discovery:c.discovery});

export function validateBatch(batch) {
  const errors=[];
  if(!/^\d{4}-\d{2}-\d{2}$/.test(batch.date||'') || !Number.isFinite(Date.parse(batch.date)) || new Date(batch.date).toISOString().slice(0,10)!==batch.date)errors.push('Invalid issue date');
  if(!/^[a-z0-9]+(?:-[a-z0-9]+)*$/.test(batch.issueSlug||''))errors.push('Invalid issue slug');
  if(!Number.isInteger(batch.issueNumber)||batch.issueNumber<1)errors.push('Invalid issue number');
  if(!Array.isArray(batch.candidates))return [...errors,'Candidates must be an array'];
  const ids=new Set(),urls=new Set();
  for(const c of batch.candidates){
    if(!/^[A-Za-z0-9-]+$/.test(c.id||'')||ids.has(c.id))errors.push('Candidate IDs must be unique');ids.add(c.id);
    if(!httpUrl(c.url)||urls.has(c.url))errors.push(`${c.id}: invalid or duplicate source URL`);urls.add(c.url);
    if(!c.title||!c.summary||!c.whyItFits||!c.checkedAt)errors.push(`${c.id}: missing research notes`);
    if(!c.copy?.bodyHtml||!c.copy.xText||!c.copy.noteText)errors.push(`${c.id}: missing channel copy`);
    if(!['pending','approved','rejected'].includes(c.decision))errors.push(`${c.id}: invalid decision`);
    if(c.discovery){
      const d=c.discovery;
      if(!Array.isArray(d.topics)||d.topics.some(t=>typeof t!=='string')||!Array.isArray(d.entities))errors.push(`${c.id}: invalid discovery metadata`);
      else for(const entity of d.entities){
        if(!entity.name||!entity.role||!httpUrl(entity.url)||!httpUrl(entity.sourceUrl))errors.push(`${c.id}: credits need names, roles, and source URLs`);
        for(const account of Object.values(entity.accounts||{}))if(!account.handle||!httpUrl(account.url)||!httpUrl(account.evidenceUrl)||!account.checkedAt)errors.push(`${c.id}: social identities need evidence and a check date`);
      }
    }
  }return errors;
}

export function reviewCandidate(candidate,{decision,note='',preferenceFeedback},at=new Date().toISOString()) {
  if(!['approved','rejected'].includes(decision))throw new Error('Decision must be approved or rejected');
  const next=structuredClone(candidate);
  if(preferenceFeedback!==undefined)next.preferenceFeedback=feedback(preferenceFeedback);
  next.decision=decision;next.editingNote=note.trim();next.reviewedAt=at;
  next.notesApplied=!next.editingNote;next.approvedHash=decision==='approved'&&!next.editingNote?copyHash(next):null;
  next.history=[...(next.history||[]),{at,action:decision,note:next.editingNote}];
  return next;
}

export function applyEditingNote(candidate,copy,at=new Date().toISOString()) {
  if(candidate.decision!=='approved'||!candidate.editingNote||candidate.notesApplied)throw new Error('No approved editing note is awaiting application');
  if(!copy?.bodyHtml||!copy.xText||!copy.noteText)throw new Error('Supply revised newsletter, X, and Notes copy');
  const next={...structuredClone(candidate),copy,notesApplied:true,notesAppliedAt:at};
  next.approvedHash=copyHash(next);
  next.history=[...(next.history||[]),{at,action:'editing-note-applied',note:candidate.editingNote}];
  return next;
}

export function approvedCandidates(batch) {
  const errors=validateBatch(batch);if(errors.length)throw new Error(errors.join('\n'));
  return batch.candidates.filter(c=>c.decision==='approved'&&c.notesApplied&&c.approvedHash===copyHash(c));
}

export function buildHopper(batch,config,site,{now=new Date()}={}) {
  const selected=approvedCandidates(batch);
  if(!selected.length)throw new Error('No approved, edited picks are ready; nothing was queued');
  if(selected.length>8)throw new Error('Select at most eight picks for one edition');
  const substackSource=site.publishing?.source==='substack';
  const issue={...(batch.substackPostUrl?{substackPostUrl:batch.substackPostUrl}:{}),number:batch.issueNumber,slug:batch.issueSlug,date:batch.date,status:'draft',archived:false,
    title:batch.issueTitle||`Issue ${batch.issueNumber}`,
    description:selected.map(c=>c.title).join('; ').slice(0,160),
    hero:{src:'assets/images/verycool.png',alt:'Very Cool Weekly'},
    introHtml:batch.introHtml||'<p>Here are this week’s design and development picks.</p>',
    items:selected.map(c=>({kind:'editorial',title:c.title,url:c.url,source:c.source||new URL(c.url).hostname,
      bodyHtml:c.copy.bodyHtml,xText:c.copy.xText})),sponsor:null,products:[]};
  const errors=validateIssues([issue]);if(errors.length)throw new Error(errors.join('\n'));
  // Article approval permits previewing picks before Friday; it does not publish the issue.
  const x=createSocialPlan({...issue,status:'scheduled'},config,site,{now});
  const fingerprint=digest({issue,selection:selected.map(c=>({id:c.id,hash:c.approvedHash})),config,...(substackSource?{publishingSource:'substack',publicationUrl:site.subscription.publicationUrl}:{})});
  const at=now.toISOString();
  const jobs=x.posts.map(p=>({...p,channel:'x',state:p.missedSlot?'needs-reschedule':p.missingSubstackUrl?'waiting-substack-url':config.publishingProvider==='buffer-free'&&config.buffer?.channelId?'ready-for-buffer-scheduling':'waiting-connection',candidateId:p.kind==='article'?selected[x.posts.indexOf(p)].id:null}));
  const editionUrl=substackSource?site.url:new URL(`${issue.slug}/`,site.url).href;
  const websiteLinkLabel=substackSource?'Visit the Very Cool Weekly website':'Read this edition on the Very Cool Weekly website';
  const postHtml=`<h1>${e(issue.title)}</h1>${rich(issue.introHtml)}${selected.map(c=>`<h2><a href="${e(c.url)}">${e(c.title)}</a></h2>${rich(c.copy.bodyHtml)}`).join('')}<p>Curated by ${e(site.author.name)}. <a href="${editionUrl}">${websiteLinkLabel}</a>.</p>`;
  const emailHtml=`<!doctype html><html lang="en"><head><meta charset="utf-8"><title>${e(issue.title)}</title></head><body style="max-width:640px;margin:32px auto;padding:0 20px;font-family:Arial,sans-serif;line-height:1.6">${postHtml}<p><a href="{{ unsubscribe_url }}">Unsubscribe</a><br>{{ mailing_address }}</p></body></html>`;
  const notePicks=selected.length<=3?selected:[selected[0],selected[Math.floor(selected.length/2)],selected.at(-1)];
  const notes=notePicks.map((c,n)=>{
    const date=new Date(`${issue.date}T12:00:00Z`);date.setUTCDate(date.getUTCDate()-(3-n));
    const scheduledAt=zonedInstant(date.toISOString().slice(0,10),'09:45',config.timeZone);
    return {id:`${issue.slug}:substack:note:${c.id}`,channel:'substack-note',candidateId:c.id,text:`${c.copy.noteText}\n\n${c.url}`,html:noteHtml(c),
      scheduledAt,state:Date.parse(scheduledAt)<=now.getTime()?'needs-reschedule':'manual-scheduling',requiresLiveIssue:false};
  });
  const releaseAt=zonedInstant(issue.date,'09:30',config.timeZone);
  jobs.push(...notes,{id:`${issue.slug}:substack:edition`,channel:'substack-edition',scheduledAt:releaseAt,state:'manual-scheduling',requiresLiveIssue:!substackSource,exclusiveDeliveryGroup:`${issue.slug}:weekly-email`});
  jobs.push({id:`${issue.slug}:email:edition`,channel:'email',scheduledAt:releaseAt,state:site.subscription?.provider==='substack'?'disabled-use-substack':'choose-email-provider',requiresLiveIssue:true,exclusiveDeliveryGroup:`${issue.slug}:weekly-email`});
  const waiting=batch.candidates.filter(c=>c.decision==='approved'&&!selected.some(s=>s.id===c.id)).map(c=>c.id);
  return {issue,postHtml,emailHtml,notes,manifest:{version:1,batch:batch.date,issue:issue.slug,contentHash:fingerprint,
    generatedAt:at,reviewHash:digest(batch),delivery:'export-only',selected:selected.map(c=>c.id),waitingForEdits:waiting,
    pending:batch.candidates.filter(c=>c.decision==='pending').map(c=>c.id),rejected:batch.candidates.filter(c=>c.decision==='rejected').map(c=>c.id),
    discoveryPlan:selected.map(c=>({candidateId:c.id,title:c.title,sourceUrl:c.url,discovery:c.discovery||null})),
    emailPolicy:site.subscription?.provider==='substack'?'Substack is the selected weekly email sender. The provider-neutral email is backup source only; do not send it separately.':'Send through one provider only; Substack email and a separate email broadcast are alternatives, not two sends to the same list.',jobs}};
}

export function reviewPreview(batch) {
  const lines=[`# Picks for ${batch.date}`,'','Reply in chat with the candidate ID, thumbs up/down, and any editing note. Nothing is approved by default.',''];
  for(const c of batch.candidates)lines.push(`## ${c.id}: ${c.title}`,'',`[Read the source](${c.url}) · ${c.publishedDate||'Publication date unconfirmed'} · ${c.decision}`,'',c.summary,'',`Why it fits: ${c.whyItFits}`,'',`Draft commentary: ${c.copy.bodyHtml.replace(/<[^>]*>/g,'')}`,'',`X draft: ${c.copy.xText}`,'',`Notes draft: ${c.copy.noteText}`,'');
  return lines.join('\n');
}
