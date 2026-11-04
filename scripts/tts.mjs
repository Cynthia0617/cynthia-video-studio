import fs from 'node:fs';
import path from 'node:path';
import {spawnSync} from 'node:child_process';
import {fileURLToPath} from 'node:url';
const root=path.resolve(path.dirname(fileURLToPath(import.meta.url)),'..');
const name=process.argv[2]??'demo';
if(!/^[a-z0-9][a-z0-9-]*$/.test(name))throw Error('Invalid project name.');
if(!process.env.VOLCENGINE_TTS_API_KEY)throw Error('Set VOLCENGINE_TTS_API_KEY in your local .env.');
if(spawnSync('ffmpeg',['-version'],{stdio:'ignore'}).status!==0)throw Error('Install FFmpeg first.');
const p=path.join(root,'projects',name),cache=path.join(root,'cache',name);fs.mkdirSync(cache,{recursive:true});
const lines=JSON.parse(fs.readFileSync(path.join(p,'script.json'),'utf8'));const records=[];
for(const [i,text]of lines.entries()){
 const base=`line-${String(i+1).padStart(2,'0')}`;const pcm=path.join(cache,`${base}.pcm`),wav=path.join(p,'public/audio',`${base}.wav`);
 const run=spawnSync(process.execPath,[path.join(root,'scripts/volcengine-tts.cjs'),'--text',text,'--output',pcm,'--speaker',process.env.VOLCENGINE_TTS_SPEAKER??'zh_female_yingyujiaoxue_uranus_bigtts','--speech-rate',process.env.VOLCENGINE_TTS_SPEECH_RATE??'40','--format','pcm'],{stdio:'inherit',env:process.env});
 if(run.status!==0)throw Error(`TTS failed at line ${i+1}; timing file was not replaced.`);
 const convert=spawnSync('ffmpeg',['-y','-v','error','-f','s16le','-ar','24000','-ac','1','-i',pcm,'-af','loudnorm=I=-18:TP=-2:LRA=7',wav],{stdio:'inherit'});
 if(convert.status!==0)throw Error('Audio conversion failed.');
 records.push({line:i+1,text,seconds:fs.statSync(pcm).size/48000,src:`audio/${base}.wav`});
}
fs.writeFileSync(path.join(p,'audio-timings.json'),JSON.stringify(records,null,2));
console.log('Narration measured. Next: npm run timeline --',name);
