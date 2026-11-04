import test from 'node:test';
import assert from 'node:assert/strict';
import { readFile, writeFile, mkdtemp, cp, symlink, rm } from 'node:fs/promises';
import { join, resolve } from 'node:path';
import { tmpdir } from 'node:os';
import { execFileSync } from 'node:child_process';
import * as cheerio from 'cheerio';
test('Substack signup uses its hosted subscribe page and fails closed without a verified publication URL',async()=>{
 const dir=await mkdtemp(join(tmpdir(),'vcw-signup-'));
 try{
  for(const path of ['scripts','assets','content'])await cp(resolve(path),join(dir,path),{recursive:true});
  for(const path of ['site.config.json','favicon-32x32.png','apple-touch-icon-152x152.png'])await cp(resolve(path),join(dir,path));
  await symlink(resolve('node_modules'),join(dir,'node_modules'),'dir');
  const config=JSON.parse(await readFile(join(dir,'site.config.json'),'utf8'));
  config.subscription={enabled:true,provider:'substack',publicationUrl:'https://verycoolweekly.substack.com/'};
  await writeFile(join(dir,'site.config.json'),JSON.stringify(config));
  execFileSync(process.execPath,['scripts/build.mjs'],{cwd:dir});
  const $=cheerio.load(await readFile(join(dir,'dist/signup/index.html'),'utf8'));
  assert.equal($('a[href="https://verycoolweekly.substack.com/subscribe"]').length,1);
  assert.equal($('form').length,0);
  assert.ok(!$.text().includes('reopen'));
  config.subscription.publicationUrl='';
  await writeFile(join(dir,'site.config.json'),JSON.stringify(config));
  assert.throws(()=>execFileSync(process.execPath,['scripts/build.mjs'],{cwd:dir,stdio:'pipe'}));
 }finally{await rm(dir,{recursive:true,force:true});}
});
