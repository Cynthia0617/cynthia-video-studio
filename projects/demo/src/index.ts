import React from 'react';
import {Composition,registerRoot} from 'remotion';
import {Main,TOTAL} from './Main';
registerRoot(()=>React.createElement(Composition,{id:'Video',component:Main,durationInFrames:TOTAL,fps:30,width:1080,height:1920,defaultProps:{bgm:true}}));
