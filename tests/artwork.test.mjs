import test from 'node:test';
import assert from 'node:assert/strict';
import { mkdtemp, mkdir, writeFile, readFile, rm } from 'node:fs/promises';
import { tmpdir } from 'node:os';
import { join } from 'node:path';
import sharp from 'sharp';
import { saveArtwork, readArtwork, mediaHash } from '../scripts/artwork.mjs';

test('image replacement, crop, metadata and restore preserve originals and invalidate prepared exports',async t=>{
 const root=await mkdtemp(join(tmpdir(),'vcw-artwork-'));t.after(()=>rm(root,{recursive:true,force:true}));
 const date='2026-11-13',dir=join(root,'exports/media',date);await mkdir(dir,{recursive:true});
 const source=await sharp({create:{width:900,height:600,channels:3,background:'#e3ff24'}}).png().toBuffer();
 await writeFile(join(dir,'original.png'),source);
 const asset={candidateId:'one',file:'original.png',original:'original.png',alt:'Original artwork',credit:'Original credit'};
 const initial={version:1,date,selected:[],thumbnails:[asset],cover:{...asset,file:'original.png'}};
 await writeFile(join(dir,'manifest.json'),JSON.stringify(initial));
 await mkdir(join(root,'exports/hopper',date),{recursive:true});
 const queue=join(root,'exports/hopper',date,'queue.json');await writeFile(queue,JSON.stringify({jobs:[{state:'draft'}]}));
 const batch={candidates:[{id:'one',url:'https://example.org/article'}]};
 const input={date,target:'thumbnail',candidateId:'one',action:'save',mediaRevision:mediaHash(initial),alt:'A tighter crop',credit:'Updated credit',crop:{zoom:2,x:25,y:75}};
 const cropped=await saveArtwork(root,input,batch),image=cropped.thumbnails[0];
 assert.notEqual(image.file,asset.file);assert.equal(image.original,'original.png');assert.equal(image.alt,'A tighter crop');assert.equal(image.credit,'Updated credit');assert.equal(cropped.coverNeedsRefresh,true);
 assert.deepEqual(await readFile(join(dir,'original.png')),source);
 const dimensions=await sharp(await readFile(join(dir,image.file))).metadata();assert.equal(dimensions.width,1200);assert.equal(dimensions.height,800);
 assert.equal(JSON.parse(await readFile(queue)).jobs[0].state,'invalidated');
 await assert.rejects(()=>saveArtwork(root,input,batch),/changed elsewhere/);
 const data=`data:image/png;base64,${source.toString('base64')}`;
 const uploaded=await saveArtwork(root,{...input,mediaRevision:mediaHash(cropped),imageData:data},batch);
 assert.equal(uploaded.thumbnails[0].origin,'user-upload');assert.notEqual(uploaded.thumbnails[0].original,'original.png');assert.equal(uploaded.thumbnails[0].baseline.original,'original.png');
 const restored=await saveArtwork(root,{...input,action:'restore',mediaRevision:mediaHash(uploaded)},batch);
 assert.equal(restored.thumbnails[0].file,'original.png');assert.equal(restored.thumbnails[0].credit,'Original credit');
 assert.equal((await readArtwork(root,date)).thumbnails[0].alt,'Original artwork');
 const revision=mediaHash(restored);
 for(const patch of [{imageData:'data:image/svg+xml;base64,PHN2Zz4='},{imageData:'data:image/png;base64,YmFk'},{crop:{zoom:0,x:0,y:0}},{crop:{zoom:1,x:101,y:0}},{alt:''},{candidateId:'missing'},{target:'../../other'}]){
  await assert.rejects(()=>saveArtwork(root,{...input,mediaRevision:revision,...patch},batch));
  assert.equal(mediaHash(await readArtwork(root,date)),revision);
 }
 const cover=await saveArtwork(root,{...input,target:'cover',mediaRevision:revision},batch);
 const coverSize=await sharp(await readFile(join(dir,cover.cover.file))).metadata();assert.equal(coverSize.width,1600);assert.equal(coverSize.height,800);
});

test('a pick without a generated thumbnail can receive a user upload',async t=>{
 const root=await mkdtemp(join(tmpdir(),'vcw-new-art-'));t.after(()=>rm(root,{recursive:true,force:true}));
 const date='2026-11-13',media=await readArtwork(root,date);
 const bytes=await sharp({create:{width:60,height:60,channels:3,background:'black'}}).png().toBuffer();
 const result=await saveArtwork(root,{date,target:'thumbnail',candidateId:'new',action:'save',mediaRevision:mediaHash(media),imageData:`data:image/png;base64,${bytes.toString('base64')}`,crop:{zoom:1,x:50,y:50},alt:'New image',credit:'My image'},{candidates:[{id:'new',url:'https://example.org/new'}]});
 assert.equal(result.thumbnails[0].candidateId,'new');assert.equal(result.thumbnails[0].baseline,null);
});
