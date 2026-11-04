import { readFile, writeFile, rename, mkdir } from 'node:fs/promises';
import { resolve } from 'node:path';
import { createHash, randomUUID } from 'node:crypto';
import sharp from 'sharp';

export const mediaHash = media => createHash('sha256').update(JSON.stringify(media)).digest('hex');
const filename = value => /^[a-z0-9-]+\.(png|webp|jpg|gif)$/.test(value||'');

export async function readArtwork(root,date){
 try{return JSON.parse(await readFile(resolve(root,'exports/media',date,'manifest.json'),'utf8'));}
 catch(error){if(error.code==='ENOENT')return {version:1,date,status:'draft',selected:[],thumbnails:[]};throw error;}
}

export async function saveArtwork(root,input,batch){
 if(!/^\d{4}-\d{2}-\d{2}$/.test(input.date||'')||!['thumbnail','cover'].includes(input.target)||!['save','restore'].includes(input.action))throw new Error('Invalid image edit');
 if(input.target==='thumbnail'&&!batch.candidates.some(c=>c.id===input.candidateId))throw new Error('Unknown article');
 const manifest=await readArtwork(root,input.date);
 if(input.mediaRevision!==mediaHash(manifest)){const error=new Error('Artwork changed elsewhere. Reload before editing it.');error.status=409;throw error;}
 const existing=input.target==='cover'?manifest.cover:manifest.thumbnails.find(a=>a.candidateId===input.candidateId);
 const dir=resolve(root,'exports/media',input.date);
 let next;
 if(input.action==='restore'){
  if(!existing?.baseline)throw new Error('No earlier image to restore');
  next={...existing.baseline,baseline:existing.baseline,history:[...(existing.history||[]),{at:new Date().toISOString(),action:'restored',previousFile:existing.file}]};
 }else{
  if(typeof input.alt!=='string'||!input.alt.trim()||input.alt.length>2000||typeof input.credit!=='string'||input.credit.length>2000)throw new Error('Add alt text and keep image details under 2000 characters');
  const crop=input.crop;
  if(!crop||!Number.isFinite(crop.zoom)||crop.zoom<1||crop.zoom>3||!Number.isFinite(crop.x)||crop.x<0||crop.x>100||!Number.isFinite(crop.y)||crop.y<0||crop.y>100)throw new Error('Invalid crop');
  let original=existing?.original,bytes,format;
  if(input.imageData!==undefined){
   if(typeof input.imageData!=='string')throw new Error('Invalid upload');
   const match=input.imageData.match(/^data:image\/(png|jpeg|webp|gif);base64,([A-Za-z0-9+/]+={0,2})$/);
   if(!match)throw new Error('Choose a PNG, JPG, WebP, or GIF image');
   bytes=Buffer.from(match[2],'base64');if(bytes.length>8*1024*1024)throw new Error('Use an image under 8 MB');
   format=(await sharp(bytes,{limitInputPixels:40000000}).metadata()).format;
   if(!['png','jpeg','webp','gif'].includes(format)||format!==({jpeg:'jpeg',png:'png',webp:'webp',gif:'gif'}[match[1]]))throw new Error('Image type does not match the uploaded file');
  }else{
   if(!filename(original))throw new Error('Upload an image first');
   bytes=await readFile(resolve(dir,original));
  }
  const oriented=await sharp(bytes,{limitInputPixels:40000000}).rotate().toBuffer({resolveWithObject:true});
  const ratio=input.target==='cover'?2:1.5,{width,height}=oriented.info;
  const cropWidth=Math.max(1,Math.floor(Math.min(width,height*ratio)/crop.zoom)),cropHeight=Math.max(1,Math.floor(cropWidth/ratio));
  if(cropHeight>height)throw new Error('Image is too small');
  const left=Math.round((width-cropWidth)*crop.x/100),top=Math.round((height-cropHeight)*crop.y/100);
  const preview=await sharp(oriented.data).extract({left,top,width:cropWidth,height:cropHeight}).resize(input.target==='cover'?1600:1200,input.target==='cover'?800:800,{fit:'fill'}).webp({quality:85}).toBuffer();
  await mkdir(dir,{recursive:true});
  const version=randomUUID(),prefix=input.target==='cover'?'cover':input.candidateId;
  if(input.imageData!==undefined){original=`${prefix}-source-${version}.${format==='jpeg'?'jpg':format}`;await writeFile(resolve(dir,original),bytes);}
  const file=`${prefix}-${version}.webp`;await writeFile(resolve(dir,file),preview);
  const baseline=existing?.baseline||(existing?Object.fromEntries(Object.entries(existing).filter(([key])=>key!=='history')):null);
  next={...existing,...(input.target==='thumbnail'?{candidateId:input.candidateId,sourceUrl:batch.candidates.find(c=>c.id===input.candidateId).url}:{}),file,original,alt:input.alt.trim(),credit:input.credit.trim(),crop,status:'draft',baseline,
   ...(input.imageData!==undefined?{origin:'user-upload',rights:'User-provided image; permission not independently verified.',motion:format==='gif'?'Uploaded GIF retained as original; crop preview is a static fallback.':'Static image.'}:{}),
   history:[...(existing?.history||[]),{at:new Date().toISOString(),action:input.imageData!==undefined?'uploaded':'edited',previousFile:existing?.file}]};
 }
 if(input.target==='cover')manifest.cover=next;
 else{const index=manifest.thumbnails.findIndex(a=>a.candidateId===input.candidateId);if(index<0)manifest.thumbnails.push(next);else manifest.thumbnails[index]=next;manifest.coverNeedsRefresh=!!manifest.cover;}
 manifest.status='draft';manifest.updatedAt=new Date().toISOString();
 // Prepared exports must never continue with an image that was replaced after preparation.
 try{const path=resolve(root,'exports/hopper',input.date,'queue.json'),queue=JSON.parse(await readFile(path));queue.invalidatedAt=manifest.updatedAt;queue.jobs=queue.jobs.map(j=>({...j,state:'invalidated'}));await writeFile(path,JSON.stringify(queue,null,2)+'\n');}catch(error){if(error.code!=='ENOENT')throw error;}
 const path=resolve(dir,'manifest.json');await writeFile(path+'.tmp',JSON.stringify(manifest,null,2)+'\n');await rename(path+'.tmp',path);
 return manifest;
}
