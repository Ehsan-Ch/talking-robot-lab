import http from 'node:http';
import {readFile} from 'node:fs/promises';
import {fileURLToPath} from 'node:url';
import {resolve,extname,sep} from 'node:path';
const root=fileURLToPath(new URL('.',import.meta.url));
const types={'.html':'text/html','.css':'text/css','.mjs':'text/javascript','.svg':'image/svg+xml','.json':'application/json','.jpg':'image/jpeg'};
http.createServer(async(req,res)=>{
  try {
    const pathname=decodeURIComponent(new URL(req.url,'http://localhost').pathname);
    const path=resolve(root,'.'+(pathname==='/'?'/index.html':pathname));
    if(!path.startsWith(root.endsWith(sep)?root:root+sep)) {res.writeHead(403);res.end();return;}
    const data=await readFile(path);res.writeHead(200,{'Content-Type':types[extname(path)]||'application/octet-stream','Cache-Control':'no-store'});res.end(data);
  }catch{res.writeHead(404);res.end('Not found');}
}).listen(Number(process.env.PORT||8795),'127.0.0.1',()=>console.log('Milo: http://127.0.0.1:'+(process.env.PORT||8795)));
