import {createServer} from 'node:http';import{createReadStream}from'node:fs';import fs from'node:fs/promises';import path from'node:path';import{fileURLToPath}from'node:url';
const root=path.dirname(fileURLToPath(import.meta.url)),project=path.resolve(root,'../../..');
const built=path.join(project,'.production/typography-portal/hero-site');
const review=path.join(project,'.production/typography-portal/hero-review');
const types={'.html':'text/html; charset=utf-8','.js':'text/javascript','.css':'text/css','.json':'application/json','.svg':'image/svg+xml','.woff2':'font/woff2','.webp':'image/webp','.png':'image/png','.mp4':'video/mp4','.xml':'application/xml','.txt':'text/plain'};
export function startServer(port=4341){const server=createServer(async(req,res)=>{try{
 const pathname=decodeURIComponent(new URL(req.url,'http://localhost').pathname);let file;
 if(pathname==='/__portal/portal.js')file=path.join(root,'portal.js');
 else if(pathname==='/__portal/style.css')file=path.join(root,'style.css');
 else if(pathname==='/__portal/glyph.json')file=path.join(root,'glyph.json');
 else if(pathname==='/review/')file=path.join(root,'review.html');
 else if(['/review/desktop.mp4','/review/mobile.mp4'].includes(pathname))file=path.join(review,path.basename(pathname));
 else{file=path.resolve(built,'.'+pathname);if(file!==built&&!file.startsWith(built+path.sep)){res.writeHead(403).end();return}if((await fs.stat(file)).isDirectory())file=path.join(file,'index.html');}
 const stat=await fs.stat(file);const headers={'Content-Type':types[path.extname(file)]??'application/octet-stream','Cache-Control':'no-store','Accept-Ranges':'bytes'};
 if(pathname==='/'&&!new URL(req.url,'http://localhost').searchParams.has('baseline')){let html=await fs.readFile(file,'utf8');html=html.replace('</head>','<meta name="robots" content="noindex,nofollow"><link rel="stylesheet" href="/__portal/style.css"></head>').replace('</body>','<script type="module" src="/__portal/portal.js"></script></body>');res.writeHead(200,{'Content-Type':types['.html'],'Cache-Control':'no-store'}).end(html);return;}
 const range=req.headers.range?.match(/^bytes=(\d+)-(\d*)$/);let start=0,end=stat.size-1,status=200;if(range){start=+range[1];end=Math.min(+(range[2]||end),end);if(start>end){res.writeHead(416).end();return}status=206;headers['Content-Range']=`bytes ${start}-${end}/${stat.size}`;}headers['Content-Length']=end-start+1;res.writeHead(status,headers);if(req.method==='HEAD')res.end();else createReadStream(file,{start,end}).pipe(res);
 }catch{res.writeHead(404).end('Not found')}});return new Promise((resolve,reject)=>{server.once('error',reject);server.listen(port,'127.0.0.1',()=>resolve(server))})}
if(process.argv[1]===fileURLToPath(import.meta.url)){const server=await startServer(Number(process.env.PORT??4341));console.log(`Hero → Servicios: http://127.0.0.1:${server.address().port}/`)}
