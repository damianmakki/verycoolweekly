import { readdir, readFile, writeFile, mkdir, stat } from 'node:fs/promises';
import { createHash } from 'node:crypto';
import sharp from 'sharp';
const output='assets/optimized';
await mkdir(output,{recursive:true}); await mkdir('.cache/images',{recursive:true}); await mkdir('assets/originals',{recursive:true});
const issues=await Promise.all((await readdir('content/issues')).filter(f=>f.endsWith('.json')).map(async f=>JSON.parse(await readFile(`content/issues/${f}`))));
const sources=[...new Set(issues.flatMap(i=>[i.hero,...i.items.map(x=>x.image),...(i.products||[]).map(x=>x.image),i.sponsor?.image].filter(Boolean).map(x=>x.src)))];
let manifest={};try{manifest=JSON.parse(await readFile(`${output}/manifest.json`));}catch{}
let before=0, after=0; const failures=[];
for(const src of sources){
 try{
  if(manifest[src]?.animated && /^https?:/.test(src) && !manifest[src].originalSrc) {
    const key=createHash('sha256').update(src).digest('hex').slice(0,16);
    const original=`assets/originals/${key}.gif`;
    await writeFile(original,await readFile(`.cache/images/${key}`)); manifest[src].originalSrc=original;
  }
  if(manifest[src] && (!manifest[src].animated || manifest[src].posterFrame!==undefined) && await Promise.all(manifest[src].variants.map(x=>stat(x.src))).then(()=>true,()=>false)) {before+=manifest[src].originalBytes;after+=manifest[src].variants.at(-1).bytes;continue;}
  const key=createHash('sha256').update(src).digest('hex').slice(0,16);
  let input;
  if(/^https?:/.test(src)){
   const cache=`.cache/images/${key}`;
   try{input=await readFile(cache);}catch{
    const response=await fetch(src.replace(/^http:/,'https:'),{signal:AbortSignal.timeout(20000)});
    if(!response.ok)throw new Error(`HTTP ${response.status}`);
    input=Buffer.from(await response.arrayBuffer());await writeFile(cache,input);
   }
  }else input=await readFile(src);
  const meta=await sharp(input).metadata();
  const animated=(meta.pages||1)>1;
  const posterFrame=animated?Math.floor(meta.pages/3):0;
  const variants=[];
  for(const width of [...new Set([400,800,1200].map(w=>Math.min(w,meta.width)))]){
   const dest=`${output}/${key}-${width}.webp`;
   const result=await sharp(input,{page:posterFrame,pages:1}).rotate().resize({width,withoutEnlargement:true}).webp({quality:78,effort:5}).toFile(dest);
   variants.push({src:dest,width:result.width,height:result.height,bytes:result.size});
  }
  let originalSrc=src;
  if(animated && /^https?:/.test(src)){originalSrc=`assets/originals/${key}.gif`;await writeFile(originalSrc,input);}
  manifest[src]={variants,originalBytes:input.length,animated,originalSrc,posterFrame};before+=input.length;after+=variants.at(-1).bytes;
  console.log(`${src}: ${input.length} → ${variants.at(-1).bytes} bytes${animated?' (poster; original animation retained)':''}`);
 }catch(error){failures.push({src,error:error.message});console.warn(`Unable to optimize ${src}: ${error.message}`);}
}
await writeFile(`${output}/manifest.json`,JSON.stringify(manifest,null,2)+'\n');
await writeFile(`${output}/report.json`,JSON.stringify({sources:sources.length,originalBytes:before,largestVariantBytes:after,failures},null,2)+'\n');
console.log(`${sources.length-failures.length}/${sources.length} images ready; ${before} → ${after} bytes (${before?Math.round((1-after/before)*100):0}% smaller).`);
if(failures.length)process.exitCode=1;
