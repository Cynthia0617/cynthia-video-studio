import fs from 'node:fs';
import path from 'node:path';
import {spawnSync} from 'node:child_process';
export const TOP=['package.json','package-lock.json','tsconfig.json','.gitignore','.env.example','README.md','LICENSE','NOTICE','THIRD_PARTY.md','scripts','projects','docs','.github'];
export function sourceFiles(root){const files=[];const visit=p=>{const rel=path.relative(root,p),name=path.basename(p);if((name.startsWith('.env')&&rel!=='.env.example')||['node_modules','.git','cache','out','dist','private'].includes(name)||/\.(key|pem|p12|pcm|mp4|mov|zip)$/i.test(name))return;const s=fs.lstatSync(p);if(s.isSymbolicLink())throw Error('Source package contains symlink: '+p);if(s.isDirectory()){for(const n of fs.readdirSync(p))visit(path.join(p,n));}else files.push(path.relative(root,p));};for(const n of TOP)if(fs.existsSync(path.join(root,n)))visit(path.join(root,n));visit(path.join(root,'licenses'));return files;}
export async function packageSource(root){
 const files=sourceFiles(root);const dir=path.join(root,'dist');fs.mkdirSync(dir,{recursive:true});
 const out=path.join(dir,'cynthia-video-studio-source.zip');fs.rmSync(out,{force:true});
 const py='import json,sys,zipfile\nr,o=sys.argv[1:]\nwith zipfile.ZipFile(o,"w",zipfile.ZIP_DEFLATED) as z:\n for f in json.load(sys.stdin):z.write(r+"/"+f,"cynthia-video-studio/"+f)\n';
 const proc=spawnSync(process.platform==='win32'?'python':'python3',['-c',py,root,out],{input:JSON.stringify(files),encoding:'utf8'});if(proc.status!==0)throw Error(proc.stderr||'Python 3 required for ZIP export.');console.log(out,files.length,'files');
}
