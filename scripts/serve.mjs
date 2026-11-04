import http from 'node:http';
import { readFile, stat } from 'node:fs/promises';
import { resolve, sep, extname } from 'node:path';
const config=JSON.parse(await readFile('site.config.json'));
const base=new URL(config.url).pathname,root=resolve('dist');
const types={'.html':'text/html; charset=utf-8','.css':'text/css','.json':'application/json','.xml':'application/xml','.webp':'image/webp','.jpg':'image/jpeg','.jpeg':'image/jpeg','.png':'image/png','.gif':'image/gif','.svg':'image/svg+xml','.txt':'text/plain'};
const server=http.createServer(async(req,res)=>{
 try{
  const path=decodeURIComponent(new URL(req.url,'http://localhost').pathname);
  if(path==='/'){res.writeHead(302,{Location:base});return res.end();}
  if(!path.startsWith(base)){res.writeHead(404);return res.end('Not found');}
  let file=resolve(root,path.slice(base.length)||'.');
  if(file!==root&&!file.startsWith(root+sep)){res.writeHead(403);return res.end();}
  if((await stat(file)).isDirectory()){
    if(!path.endsWith('/')){res.writeHead(301,{Location:path+'/'});return res.end();}
    file=resolve(file,'index.html');
  }
  const bytes=await readFile(file);res.writeHead(200,{'Content-Type':types[extname(file)]||'application/octet-stream','Cache-Control':'no-store'});res.end(bytes);
 }catch{res.writeHead(404,{'Content-Type':'text/html; charset=utf-8'});res.end(await readFile('dist/404.html').catch(()=>Buffer.from('Not found')));}
});
server.listen(Number(process.env.PORT||8765),'127.0.0.1',()=>console.log(`Local: http://127.0.0.1:${server.address().port}${base}`));
