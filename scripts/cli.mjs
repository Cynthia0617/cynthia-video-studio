import fs from 'node:fs';
import path from 'node:path';
import {spawnSync} from 'node:child_process';
import {fileURLToPath} from 'node:url';
const root=path.resolve(path.dirname(fileURLToPath(import.meta.url)),'..');
const [action='studio',name='demo',...rest]=process.argv.slice(2);
if(!/^[a-z0-9][a-z0-9-]*$/.test(name))throw Error('Project name must use lowercase letters, numbers and hyphens.');
const project=path.join(root,'projects',name);
const read=n=>JSON.parse(fs.readFileSync(path.join(project,n),'utf8'));
const write=(n,v)=>fs.writeFileSync(path.join(project,n),JSON.stringify(v,null,2)+'\n');
if(action==='new'){
 if(fs.existsSync(project))throw Error('Project already exists; choose a new name.');
 fs.cpSync(path.join(root,'projects/demo'),project,{recursive:true});
 const e=read('src/episode.json');e.stem=`001-${name}`;write('src/episode.json',e);
 console.log(`Created projects/${name}. Edit script.json, brand.json and src/Scenes.tsx.`);
}else if(action==='prepare'){
 const audio=read('audio-timings.json'),lines=read('script.json'),timeline=read('src/timeline.json'),episode=read('src/episode.json');
 if(audio.length!==lines.length||timeline.shots.length!==lines.length)throw Error('One narration line per shot is required.');
 let from=0;timeline.shots.forEach((s,i)=>{const v=audio[i];if(v.text!==lines[i])throw Error('Narration changed. Run npm run tts first.');s.from=from;s.duration=Math.max(s.duration,Math.ceil(v.seconds*30)+42);s.voice=[{...v,offset:12}];from+=s.duration;});
 timeline.total=from;episode.captions=lines.map(t=>t.match(/[^，。！？；、]{1,15}[，。！？；、]?/gu)??[t]);write('src/timeline.json',timeline);write('src/episode.json',episode);
 console.log(`Prepared ${from} frames / ${(from/30).toFixed(2)}s. Subtitles use phrase/character proportions; review synchronization.`);
}else if(action==='doctor'){
 console.log('Node:',process.version,'Project:',name);
 console.log('Narration:',read('audio-timings.json').length,'shots:',read('src/timeline.json').shots.length);
 for(const cmd of ['ffmpeg','ffprobe'])console.log(cmd,spawnSync(cmd,['-version'],{stdio:'ignore'}).status===0?'OK':'not installed (needed for TTS/audio inspection)');
 console.log('Optional browser:',process.env.REMOTION_BROWSER_EXECUTABLE?'configured':'Remotion managed browser');
 console.log('Optional compatibility binaries:',process.env.REMOTION_BINARIES_DIRECTORY?'configured':'Remotion default');
}else if(action==='studio'){
 const cli=path.join(root,'node_modules/@remotion/cli/remotion-cli.js');
 const result=spawnSync(process.execPath,[cli,'studio',path.join(project,'src/index.ts'),'--public-dir',path.join(project,'public'),...rest],{cwd:root,stdio:'inherit'});process.exit(result.status??1);
}else if(action==='render'||action==='still'||action==='smoke'){
 const {bundle}=await import('@remotion/bundler');
 const {openBrowser,selectComposition,renderMedia,renderStill}=await import('@remotion/renderer');
 const serveUrl=await bundle({entryPoint:path.join(project,'src/index.ts'),publicDir:path.join(project,'public')});
 const browser=await openBrowser('chrome',{browserExecutable:process.env.REMOTION_BROWSER_EXECUTABLE||undefined});
 const binaryOptions=process.env.REMOTION_BINARIES_DIRECTORY?{binariesDirectory:path.resolve(process.env.REMOTION_BINARIES_DIRECTORY)}:{};
 const output=path.join(root,'out',name);fs.mkdirSync(output,{recursive:true});
 let status=0;
 try{
  if(action==='still'){
   const composition=await selectComposition({serveUrl,id:'Video',puppeteerInstance:browser});const frame=Number(rest[0]??90);
   await renderStill({composition,serveUrl,frame,output:path.join(output,`frame-${frame}.png`),imageFormat:'png',puppeteerInstance:browser,...binaryOptions});
  }else{
   const episode=read('src/episode.json');
   for(const bgm of (action==='smoke'?[false]:[true,false])){
    const composition=await selectComposition({serveUrl,id:'Video',inputProps:{bgm},puppeteerInstance:browser});
    const dest=path.join(output,action==='smoke'?'smoke.mp4':`${episode.stem}${bgm?'':'-无配乐版'}.mp4`);let last=-1;
    await renderMedia({composition,serveUrl,inputProps:{bgm},...(action==='smoke'?{frameRange:[0,Math.min(59,composition.durationInFrames-1)]}:{}),outputLocation:dest,codec:'h264',audioCodec:'aac',audioBitrate:'192k',pixelFormat:'yuv420p',crf:19,imageFormat:'png',concurrency:1,puppeteerInstance:browser,...binaryOptions,onProgress:({progress})=>{const n=Math.floor(progress*10);if(n!==last){last=n;console.log(bgm?'MAIN':'NO-BGM',n*10+'%');}}});
    console.log('Saved:',dest);
   }
  }
 }catch(e){console.error(e.message);status=1;}finally{await Promise.race([browser.close({silent:true}),new Promise(r=>setTimeout(r,4000))]);}
 process.exit(status);
}else if(action==='pack'){
 const {packageSource}=await import('./package-source.mjs');await packageSource(root);
}else throw Error('Use new, prepare, studio, still, render, doctor or pack.');
