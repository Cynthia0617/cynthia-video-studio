import fs from 'node:fs';
import path from 'node:path';
import {fileURLToPath} from 'node:url';
import {sourceFiles} from './package-source.mjs';
const root=path.resolve(path.dirname(fileURLToPath(import.meta.url)),'..');
const files=sourceFiles(root);const issues=[];
for(const file of files){
 if(/(^|\/)\.env($|\.)/.test(file)&&file!=='.env.example')issues.push('Unexpected environment file: '+file);
 if(/\.(key|pem|p12|pcm|mp4|mov|zip)$/i.test(file))issues.push('Private/generated file: '+file);
 if(fs.statSync(path.join(root,file)).size>10*1024*1024)issues.push('Large source asset: '+file);
 if(/\.(json|mjs|cjs|tsx?|md|txt)$/.test(file)){
  const text=fs.readFileSync(path.join(root,file),'utf8');
  if(/\/Users\/[^/]+\/|C:\\\\Users\\\\/.test(text))issues.push('Machine-specific path: '+file);
  if(/(?:gh[pousr]_[A-Za-z0-9]{25,}|github_pat_[A-Za-z0-9_]{30,}|-----BEGIN (?:RSA |OPENSSH )?PRIVATE KEY-----)/.test(text))issues.push('Possible credential: '+file);
 }
}
for(const name of fs.readdirSync(path.join(root,'projects'))){
 const p=path.join(root,'projects',name);if(!fs.statSync(p).isDirectory())continue;
 const read=n=>JSON.parse(fs.readFileSync(path.join(p,n),'utf8'));const t=read('src/timeline.json');let end=0;
 for(const s of t.shots){if(s.from!==end||s.duration<=0)issues.push('Invalid timeline: '+name);end=s.from+s.duration;for(const v of s.voice)if(!fs.existsSync(path.join(p,'public',v.src)))issues.push('Missing narration: '+v.src);}
 if(end!==t.total)issues.push('Invalid total: '+name);
 for(const c of read('src/sfx-plan.json'))if(!fs.existsSync(path.join(p,'public',c.src)))issues.push('Missing SFX: '+c.src);
 const b=read('brand.json');if(b.bgmSrc&&!fs.existsSync(path.join(p,'public',b.bgmSrc)))issues.push('Missing BGM: '+b.bgmSrc);
}
if(issues.length){console.error(issues.join('\n'));process.exit(1);}console.log('PASS:',files.length,'source files; timeline/assets/portable paths and basic credential checks.');
