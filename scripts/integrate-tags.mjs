import twitterText from 'twitter-text';
import { httpUrl, escape as e } from './lib.mjs';

// Run before review, never at export time: the reader approves the exact tagged copy.
export function integrateTags(candidate, at=new Date().toISOString()) {
  const next=structuredClone(candidate),d=next.discovery;
  if(!d)return next;
  const entities=d.entities||[],names=d.x?.mentionCandidates||[];
  let x=next.copy.xText;
  const fits=text=>twitterText.parseTweet(`${text}\n\n${next.url}`).valid;
  const used=new Set((x.match(/@[A-Za-z0-9_]+/g)||[]).map(h=>h.toLowerCase()));
  for(const name of names){
    const entity=entities.find(e=>e.name===name),a=entity?.accounts?.x;
    if(used.size>=2)break;
    if(!a||!['official-link','native-verified'].includes(a.verification)||!a.checkedAt||!httpUrl(a.evidenceUrl)||!/^@[A-Za-z0-9_]{1,15}$/.test(a.handle)||used.has(a.handle.toLowerCase()))continue;
    let profile;try{profile=new URL(a.url);}catch{continue;}
    if(!['x.com','www.x.com','twitter.com','www.twitter.com'].includes(profile.hostname)||profile.pathname.replace(/\/$/,'').toLowerCase()!==`/${a.handle.slice(1).toLowerCase()}`)continue;
    // Only replace an existing name. Introducing a new subject needs an editorial rewrite.
    if(!x.includes(entity.name))continue;
    const revised=x.replace(entity.name,a.handle);
    if(fits(revised)){x=revised;used.add(a.handle.toLowerCase());}
  }
  if(!/(?:^|\s)#[\p{L}\p{N}_]+/u.test(x)){
    const tag=(d.x?.hashtags||[]).find(t=>/^#[\p{L}\p{N}_]+$/u.test(t));
    if(tag&&fits(`${x} ${tag}`))x+=` ${tag}`;
  }
  const note=next.copy.noteText,links=[];
  // Keep plain text readable and carry linked names separately for rich-text delivery.
  for(const entity of entities){
    if(!note.includes(entity.name))continue;
    const a=entity.accounts?.substack;
    const verified=a?.verification==='native-verified'&&a.checkedAt&&httpUrl(a.evidenceUrl)&&httpUrl(a.url);
    const url=verified?a.url:entity.url;
    if(httpUrl(url)&&!links.some(link=>link.text===entity.name))links.push({text:entity.name,url});
  }
  if(x!==next.copy.xText||JSON.stringify(links)!==JSON.stringify(next.copy.noteLinks||[])){
    next.copy={...next.copy,xText:x,noteText:note,noteLinks:links};
    next.approvedHash=null;
    next.history=[...(next.history||[]),{at,action:'tags-integrated'}];
  }
  return next;
}

// HTML accompanies plain Note text so delivery can paste linked prose without a credit footer.
export function noteHtml(candidate){
 const text=candidate.copy.noteText,links=(candidate.copy.noteLinks||[]).filter(l=>l.text&&httpUrl(l.url)).sort((a,b)=>b.text.length-a.text.length);
 let html='',offset=0;
 while(offset<text.length){
  const link=links.find(l=>text.startsWith(l.text,offset));
  if(link){html+=`<a href="${e(link.url)}">${e(link.text)}</a>`;offset+=link.text.length;}
  else{html+=e(text[offset]);offset++;}
 }
 return `<p>${html.replace(/\n\n/g,'</p><p>').replace(/\n/g,'<br>')}</p><p><a href="${e(candidate.url)}">${e(candidate.url)}</a></p>`;
}
