import { mkdir, cp, readdir, readFile, writeFile, rm } from 'node:fs/promises';
import { resolve, isAbsolute } from 'node:path';
const destination=resolve('../ruckuslabs.co/verycoolweekly');
async function files(dir,prefix='') {return (await Promise.all((await readdir(dir,{withFileTypes:true})).map(async d=>d.isDirectory()?files(`${dir}/${d.name}`,`${prefix}${d.name}/`):[`${prefix}${d.name}`]))).flat();}
const current=await files('dist');
await mkdir(destination,{recursive:true});
let previous=[];
try{previous=JSON.parse(await readFile(`${destination}/.vcw-export.json`));}catch{
 if((await readdir(destination)).length)throw new Error('Destination is not empty and has no export manifest. Review it before exporting.');
}
for(const file of previous){
 if(typeof file!=='string'||isAbsolute(file)||file.split('/').includes('..'))throw new Error('Unsafe previous export manifest');
 if(!current.includes(file))await rm(`${destination}/${file}`,{force:true});
}
for(const entry of await readdir('dist'))await cp(`dist/${entry}`,`${destination}/${entry}`,{recursive:true});
await writeFile(`${destination}/.vcw-export.json`,JSON.stringify(current,null,2)+'\n');
console.log(`Exported to ${destination}. Publish through the Ruckus Labs repository's normal deployment. Submit https://ruckuslabs.co/verycoolweekly/sitemap.xml to Search Console.`);
