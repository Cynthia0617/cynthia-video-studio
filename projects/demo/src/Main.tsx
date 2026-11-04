// Adapted for Cynthia Video Studio (2026): portable configuration and personal branding.
// Motion recipes informed by video-shotcraft, Copyright 2026 Wei Yihao; see NOTICE and licenses/.
import React from 'react';
import {AbsoluteFill,Audio,Img,Sequence,staticFile,useCurrentFrame} from 'remotion';
import data from './timeline.json';
import episode from './episode.json';
import plan from './sfx-plan.json';
import brand from '../brand.json';
import {Scene} from './Scenes';
import {C} from './Shared';

export const SHOTS=data.shots;
export const TOTAL=data.total;
export const beatF=(n:number)=>Math.round((data.sourceBeat0+data.outputAudioOffsetSec+n*data.beatInterval)*30);
export const CAPTIONS=SHOTS.flatMap(s=>s.voice.flatMap(v=>{
 const parts=episode.captions[v.line-1]??[v.text];const total=parts.reduce((a,b)=>a+b.length,0);const dur=Math.ceil(v.seconds*30);let cursor=0;
 return parts.map((text,i)=>{const from=s.from+v.offset+Math.round(cursor/total*dur);cursor+=text.length;const end=s.from+v.offset+Math.round(cursor/total*dur);return {id:`caption-${v.line}-${i}`,from,duration:Math.max(1,end-from),text};});
}));
export const VOICES=SHOTS.flatMap(s=>s.voice.map(v=>({from:s.from+v.offset,duration:Math.ceil(v.seconds*30)+1,src:v.src,volume:1,label:`旁白 ${v.line}`})));
type Cue={shot:string;offset:number;duration:number;src:string;volume:number;peakSeconds:number;label:string};
export const SFX=(plan as Cue[]).map(c=>{const shot=SHOTS.find(s=>s.id===c.shot)!;const targetFrame=shot.from+c.offset;return {...c,targetFrame,sourcePeakFrames:c.peakSeconds*30,from:Math.max(0,Math.round(targetFrame-c.peakSeconds*30-data.outputAudioOffsetSec*30))};});
export const Caption:React.FC<{text?:string;fontSize?:number;color?:string}>=({text='',fontSize=62,color=C.ink})=><AbsoluteFill style={{pointerEvents:'none',fontFamily:brand.fontFamily}}><div style={{position:'absolute',left:65,right:65,bottom:205,minHeight:130,display:'flex',alignItems:'center',justifyContent:'center',textAlign:'center',fontSize,fontWeight:560,lineHeight:1.34,color,textShadow:'0 2px 5px #FFF'}}>{text}</div></AbsoluteFill>;
export const Overlay:React.FC=()=>{const f=useCurrentFrame();return <AbsoluteFill style={{pointerEvents:'none',fontFamily:brand.fontFamily}}><div style={{position:'absolute',left:78,right:78,top:92,display:'flex',alignItems:'center',justifyContent:'space-between'}}><div style={{fontSize:42,fontWeight:750,color:C.blue}}>{brand.name}</div><div style={{fontSize:38,color:C.blue,fontWeight:500}}>{brand.series}</div></div><div style={{position:'absolute',left:78,right:78,bottom:84,fontSize:36,color:C.muted,paddingTop:26,borderTop:`2px solid ${C.line}`}}>{brand.footer} · {episode.name}</div><div style={{position:'absolute',left:78,bottom:154,width:924*Math.min(1,f/(TOTAL-1)),height:4,background:C.blue}}/></AbsoluteFill>};
export const Main:React.FC<{bgm?:boolean}>=({bgm=true})=><AbsoluteFill style={{background:C.pale}}>{SHOTS.map(s=><Sequence key={s.id} from={s.from} durationInFrames={s.duration}><Scene id={s.id} title={s.title} kicker={s.kicker}/></Sequence>)}<Overlay/>{CAPTIONS.map(c=><Sequence key={c.id} from={c.from} durationInFrames={c.duration}><Caption text={c.text}/></Sequence>)}{[...VOICES,...SFX].map((a,i)=><Sequence key={i} from={a.from} durationInFrames={a.duration}><Audio src={staticFile(a.src)} volume={a.volume}/></Sequence>)}{bgm&&brand.bgmSrc&&<Audio src={staticFile(brand.bgmSrc)} volume={brand.bgmVolume}/>} </AbsoluteFill>;
