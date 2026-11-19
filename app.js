import { comparisons, nonRigid, solarComparisons } from './demos.js';
import { cameraPaths } from './camera-paths.js';

const players = new Set();
// Load only metadata until playback or a seek is requested.
const previewObserver = 'IntersectionObserver' in window ? new IntersectionObserver(entries=>{
  for(const entry of entries)if(entry.isIntersecting){
    const video=entry.target;
    if(video.preload==='none'&&video.paused){video.preload='metadata';video.load()}
    previewObserver.unobserve(video);
  }
},{rootMargin:'100px'}) : null;
const metadataLoads = new WeakMap();
function loadMetadata(video) {
  if(video.readyState >= 1) return Promise.resolve();
  if(metadataLoads.has(video)) return metadataLoads.get(video);
  const pending = new Promise((resolve,reject)=>{
    const cleanup=()=>{clearTimeout(timer);video.removeEventListener('loadedmetadata',ready);video.removeEventListener('error',failed)};
    const ready=()=>{cleanup();resolve()};
    const failed=()=>{cleanup();reject(new Error('Video unavailable'))};
    const timer=setTimeout(()=>{cleanup();reject(new Error('Video loading timed out'))},25000);
    video.addEventListener('loadedmetadata',ready,{once:true});video.addEventListener('error',failed,{once:true});
    video.preload='auto';if(video.networkState===HTMLMediaElement.NETWORK_EMPTY)video.load();
  });
  metadataLoads.set(video,pending);pending.finally(()=>metadataLoads.delete(video)).catch(()=>{});return pending;
}
const formatTime = t => `${Math.floor(Math.max(0,t)/60).toString().padStart(2,'0')}:${Math.floor(Math.max(0,t)%60).toString().padStart(2,'0')}`;
function element(tag, className, text) {
  const el = document.createElement(tag);
  if (className) el.className = className;
  if (text !== undefined) el.textContent = text;
  return el;
}
function button(text, action, className) {
  const el = element('button', className, text);
  el.type = 'button'; el.addEventListener('click', action); return el;
}
function videoFigure(src, caption, poster) {
  const figure = element('figure');
  if(caption) figure.append(element('figcaption', '', caption));
  const video = document.createElement('video');
  video.controls = true; video.preload = 'none'; video.muted = true;
  video.playsInline = true; video.src = src;
  video.poster = poster ?? src.replace(/\.mp4$/, '.jpg');
  video.setAttribute('aria-label', caption ?? 'Scene video');
  if(previewObserver)previewObserver.observe(video);
  figure.append(video); return {figure, video};
}
function addMoments(parent, moments, seek) {
  if(!moments?.length) return;
  const row = element('div', 'moment-list');
  row.append(element('span', '', 'Inspect:'));
  for(const m of moments) row.append(button(m.label, () => seek(m.time), 'moment-button'));
  parent.append(row);
}
function frameStrip(markers,seek,label){
  const strip=element('div','comparison-frames');strip.setAttribute('role','group');strip.setAttribute('aria-label',label+' comparison frames');
  strip.style.setProperty('--frame-count',String(markers.length||1));
  const names={anchor:'Frame',comparison:'Frame',consistent:'Consistent',inconsistent:'Inconsistent',revisit:'Revisit'};
  const previews=markers.map(marker=>{
    const preview=button('',()=>seek(marker.time),'frame-preview marker-'+marker.state);
    preview.title=names[marker.state]+' · '+marker.time+' s';
    preview.setAttribute('aria-label',label+', '+names[marker.state]+', '+marker.time+' seconds');
    const img=document.createElement('img');img.src=marker.thumbnail;img.alt=label+' at '+marker.time+' seconds';img.loading='lazy';img.decoding='async';
    preview.append(img,element('span','frame-time',marker.time+' s'));strip.append(preview);
    return {marker,preview};
  });return {strip,previews};
}
// Express each camera transform in its initial camera frame, then align translation scales.
function relativeCamera(camera) {
  const first=camera.poses[0];
  const poses=camera.poses.map(p=>{
    const relative=new Array(16).fill(0);relative[15]=1;
    for(let row=0;row<3;row++){
      for(let col=0;col<3;col++)for(let k=0;k<3;k++)relative[row*4+col]+=first[k*4+row]*p[k*4+col];
      for(let k=0;k<3;k++)relative[row*4+3]+=first[k*4+row]*(p[k*4+3]-first[k*4+3]);
    }
    return relative;
  });
  const distance=Math.max(...poses.map(p=>Math.hypot(p[3],p[7],p[11])))||1;
  for(const p of poses)for(const index of [3,7,11])p[index]/=distance;
  return {fps:camera.fps,poses};
}
const relativeCameraPaths=Object.fromEntries(Object.entries(cameraPaths).map(([key,camera])=>[key,relativeCamera(camera)]));
const relativeSamples=Object.values(relativeCameraPaths).flatMap(camera=>camera.poses);
const sharedPoseBounds={
  x:[Math.floor((Math.min(...relativeSamples.map(p=>p[3]))-.04)*10)/10,Math.ceil((Math.max(...relativeSamples.map(p=>p[3]))+.04)*10)/10],
  z:[Math.floor((Math.min(...relativeSamples.map(p=>p[11]))-.04)*10)/10,Math.ceil((Math.max(...relativeSamples.map(p=>p[11]))+.04)*10)/10]
};
function cameraYaw(camera) {
  let previous=0;
  return camera.poses.map((p,index)=>{
    let yaw=Math.atan2(p[2],p[10])*180/Math.PI;
    if(index){while(yaw-previous>180)yaw-=360;while(yaw-previous< -180)yaw+=360}
    previous=yaw;return yaw;
  });
}
const relativeCameraYaws=Object.fromEntries(Object.entries(relativeCameraPaths).map(([key,camera])=>[key,cameraYaw(camera)]));
const allCameraYaws=Object.values(relativeCameraYaws).flat();
const sharedYawBounds=[Math.floor((Math.min(...allCameraYaws)-5)/10)*10,Math.ceil((Math.max(...allCameraYaws)+5)/10)*10];
const sharedCameraTime=Math.ceil(Math.max(...Object.values(relativeCameraPaths).map(camera=>camera.poses.length/camera.fps))/5)*5;
function cameraContext(item,definitions) {
  const entries=definitions.filter(def=>item.conditions?.[def.key]);
  if(!entries.length)return null;
  const root=element('aside','case-context');root.setAttribute('aria-label',item.title+': prompts and relative camera poses');
  root.append(element('h5','context-title','Prompt'));
  const prompts=new Map();
  if(item.displayPrompt)prompts.set(item.displayPrompt,[]);
  else for(const def of entries){const value=item.conditions[def.key].prompt;if(!prompts.has(value))prompts.set(value,[]);prompts.get(value).push(def.label)}
  for(const [prompt,labels] of prompts){
    const block=element('div','context-prompt');
    if(prompts.size>1)block.append(element('strong','context-prompt-label',labels.join(' / ')));
    block.append(element('p','',prompt));root.append(block);
  }
  const poseEntries=entries.filter(def=>relativeCameraPaths[item.conditions[def.key].camera]);
  if(!poseEntries.length)return {root,update(){}};
  const rotationOnly=poseEntries.every(def=>relativeCameraPaths[item.conditions[def.key].camera].poses.every(p=>Math.hypot(p[3],p[7],p[11])<1e-6));
  const poseRoot=element('div','camera-pose');poseRoot.dataset.projection=rotationOnly?'yaw-time':'xz';poseRoot.append(element('h5','pose-heading','Relative camera pose'));
  poseRoot.title=rotationOnly?'Camera yaw relative to the initial view, in degrees, over video time.':'Relative to each initial camera frame. Translation is normalized by maximum displacement. The same axis limits and scale are used for every example.';
  const ns='http://www.w3.org/2000/svg';
  function svgNode(tag,attrs={},text){const node=document.createElementNS(ns,tag);for(const [key,value] of Object.entries(attrs))node.setAttribute(key,String(value));if(text!==undefined)node.textContent=text;return node}
  const svg=svgNode('svg',{viewBox:'0 0 400 280',role:'img','aria-label':item.title+(rotationOnly?': relative camera yaw over time':': normalized relative camera trajectories in the X–Z plane')});
  svg.append(svgNode('title',{},poseRoot.title));
  const [minX,maxX]=rotationOnly?[0,sharedCameraTime]:sharedPoseBounds.x,[minZ,maxZ]=rotationOnly?sharedYawBounds:sharedPoseBounds.z;
  const scale=Math.min(320/(maxX-minX),210/(maxZ-minZ));
  const scaleX=rotationOnly?320/(maxX-minX):scale,scaleZ=rotationOnly?210/(maxZ-minZ):scale;
  const offsetX=58+(320-(maxX-minX)*scaleX)/2,offsetZ=14+(210-(maxZ-minZ)*scaleZ)/2;
  const project=(x,z)=>[offsetX+(x-minX)*scaleX,offsetZ+(maxZ-z)*scaleZ];
  const projectPose=(camera,id,index)=>rotationOnly?project(index/camera.fps,relativeCameraYaws[id][index]):project(camera.poses[index][3],camera.poses[index][11]);
  const [left,bottom]=project(minX,minZ),[right,top]=project(maxX,maxZ);
  const number=n=>Math.abs(n)<.00001?'0':String(Number(n.toFixed(2)));
  for(let i=0;i<4;i++){
    const x=minX+(maxX-minX)*i/3,z=minZ+(maxZ-minZ)*i/3;
    const [px]=project(x,minZ),[,py]=project(minX,z);
    svg.append(svgNode('line',{x1:px,y1:top,x2:px,y2:bottom,class:'pose-grid'}),svgNode('text',{x:px,y:bottom+18,'text-anchor':'middle',class:'pose-tick'},number(x)));
    svg.append(svgNode('line',{x1:left,y1:py,x2:right,y2:py,class:'pose-grid'}),svgNode('text',{x:left-9,y:py+4,'text-anchor':'end',class:'pose-tick'},number(z)));
  }
  const [originX,originZ]=project(0,0);
  svg.append(svgNode('line',{x1:left,y1:originZ,x2:right,y2:originZ,class:'pose-origin-axis'}),svgNode('line',{x1:originX,y1:top,x2:originX,y2:bottom,class:'pose-origin-axis'}));
  svg.append(svgNode('text',{x:220,y:268,'text-anchor':'middle',class:'pose-axis'},rotationOnly?'Time (s)':'X (normalized)'),svgNode('text',{transform:'translate(14 118) rotate(-90)','text-anchor':'middle',class:'pose-axis'},rotationOnly?'Yaw (°)':'Z (normalized)'));
  const palette={sana:'#2267b5',grome:'#168044',solar:'#a65f17',solarGrome:'#784da5'};
  const pathData=pts=>pts.map((p,i)=>(i?'L':'M')+p.map(v=>v.toFixed(2)).join(',')).join(' ');
  for(const def of poseEntries){
    const id=item.conditions[def.key].camera,camera=relativeCameraPaths[id];
    const withMemory=def.key==='grome'||def.key==='solarGrome';
    const path=svgNode('path',{d:pathData(camera.poses.map((p,index)=>projectPose(camera,id,index))),class:'pose-path',stroke:palette[def.key],'stroke-dasharray':withMemory?'7 4':'none','data-camera':id,'data-model':def.key});
    path.append(svgNode('title',{},def.label));svg.append(path);
  }
  const origin=svgNode('circle',{cx:originX,cy:originZ,r:3,class:'pose-start'});origin.append(svgNode('title',{},'Shared initial camera origin'));svg.append(origin);
  const legend=element('div','pose-models');const states=new Map();const markers=[];
  for(const [index,def] of poseEntries.entries()){
    const camera=relativeCameraPaths[item.conditions[def.key].camera],color=palette[def.key];
    const row=element('div','pose-model-state');row.dataset.model=def.key;row.style.setProperty('--pose-color',color);
    const name=element('span','pose-model-name',def.label),clock=element('output','pose-time');row.append(name,clock);legend.append(row);
    const marker=svgNode('g',{'data-model':def.key,'aria-hidden':'true'});
    const radius=3+index*1.5;marker.append(svgNode('circle',{r:radius,fill:'none',stroke:color,'stroke-width':2}),svgNode('path',{d:`M 0 0 L ${10+index*2} 0 M ${7+index*2} -3 L ${10+index*2} 0 L ${7+index*2} 3`,fill:'none',stroke:color,'stroke-width':1.5}));markers.push(marker);
    states.set(def.key,{camera,id:item.conditions[def.key].camera,row,clock,marker,previous:-1});
  }
  for(const marker of markers.reverse())svg.append(marker);
  poseRoot.append(svg,legend);root.append(poseRoot);
  function update(key,seconds){
    const state=states.get(key);if(!state)return;
    const index=Math.max(0,Math.min(state.camera.poses.length-1,Math.floor(seconds*state.camera.fps+1e-5)));
    if(index===state.previous)return;state.previous=index;state.row.dataset.frame=String(index);
    const pose=state.camera.poses[index],[x,y]=projectPose(state.camera,state.id,index);
    state.row.dataset.position=[pose[3],pose[7],pose[11]].map(n=>n.toFixed(6)).join(',');
    state.marker.setAttribute('transform',`translate(${x} ${y}) rotate(${rotationOnly?0:Math.atan2(-pose[10],pose[2])*180/Math.PI})`);
    state.clock.textContent=(index/state.camera.fps).toFixed(2)+' s';
  }
  for(const def of poseEntries)update(def.key,0);
  return {root,update};
}

function comparePlayer(item, parent) {
  const root=element('div','compare-player');
  const pair=element('div','pair');
  const definitions=item.models?item.models.map(def=>({...def,src:def.src??item[def.key]})):[{key:'sana',label:'SANA-WM',src:item.sana},{key:'grome',label:'GROME (based on SANA-WM)',src:item.grome}];
  if(!item.models&&item.solar)definitions.push({key:'solar',label:'Solar-WM',src:item.solar});
  if(!item.models&&item.solarGrome)definitions.push({key:'solarGrome',label:'GROME (based on Solar-WM)',src:item.solarGrome});
  if(definitions.length>2)pair.classList.add('pair--four','pair--stacked-models');
  if(definitions.every(def=>def.key.startsWith('solar')))pair.classList.add('pair--solar');
  pair.style.setProperty('--model-count',String(definitions.length+(item.solarGromePending?1:0)));
  const playLabel=definitions.length>2?'Play all':'Play both',pauseLabel=definitions.length>2?'Pause all':'Pause both';
  const context=cameraContext(item,definitions);
  if(context){pair.classList.add('pair--with-context');pair.append(context.root)}
  const views=definitions.map(def=>({...def,...videoFigure(def.src,def.label)}));
  const videos=views.map(view=>view.video);
  const controls=element('div','sync-controls');
  const status=element('p','status');status.setAttribute('role','status');
  const note=element('p','duration-note');
  const internalSeeks=new WeakMap();
  let synchronized=false,starting=false,buffering=false,generation=0,raf=0;
  const sharedDuration=()=>videos.every(v=>Number.isFinite(v.duration))?Math.min(...videos.map(v=>v.duration)):item.duration;
  function setVideoTime(video,time){internalSeeks.set(video,time);video.currentTime=time;}
  function stop(){
    synchronized=false;starting=false;buffering=false;generation++;cancelAnimationFrame(raf);
    videos.forEach(v=>v.pause());play.textContent=playLabel;play.disabled=false;
  }
  const controller={stop};players.add(controller);
  for(const view of views){
    const {video,figure,key,label}=view;
    figure.dataset.model=key;
    const timeline=element('input','timeline');timeline.type='range';timeline.min='0';timeline.max=String(item.durations?.[key]??item.duration);timeline.step='.01';timeline.value='0';
    timeline.setAttribute('aria-label',`${item.title}: ${label} timeline`);
    const time=element('output','time-output');
    const track=element('div','marked-timeline');
    const markerLayer=element('div','timeline-markers');markerLayer.setAttribute('role','group');markerLayer.setAttribute('aria-label',`${item.title}: ${label} comparison frames`);
    const names={anchor:'Frame',comparison:'Frame',consistent:'Consistent',inconsistent:'Inconsistent'};
    const buttons=(item.markers?.[key]??[]).map(marker=>{
      const mark=button(`${marker.time} s`,()=>seek(marker.time),`timeline-marker marker-${marker.state}`);
      mark.title=`${names[marker.state]} · ${marker.time} s`;
      mark.setAttribute('aria-label',`${item.title}: ${label}, ${names[marker.state]}, ${marker.time} seconds`);
      markerLayer.append(mark);return {marker,mark};
    });
    track.append(timeline,markerLayer);
    const {strip,previews}=frameStrip(item.frames?.[key]??item.markers?.[key]??[],time=>seek(time),item.title+': '+label);
    const panel=element('div','model-timeline');panel.append(track,time);if(previews.length)panel.append(strip);else panel.classList.add('model-timeline--unmarked');figure.append(panel);
    pair.append(figure);
    let pending=null,seekGeneration=0,resumeAfterSeek=false;
    function update(){
      const duration=Number.isFinite(video.duration)?video.duration:(item.durations?.[key]??item.duration);
      const position=pending??video.currentTime;
      timeline.max=String(duration);timeline.value=String(position);timeline.setAttribute('aria-valuetext',formatTime(position));
      time.textContent=`${formatTime(position)} / ${formatTime(duration)}`;
      context?.update(key,position);
      for(const {marker,mark} of buttons){
        mark.hidden=marker.time>=duration;
        const ratio=marker.time/duration;
        mark.style.left=`calc(${ratio*100}% + ${8-16*ratio}px)`;
        mark.classList.toggle('active',Math.abs(position-marker.time)<.12);
      }
      for(const {marker,preview} of previews)preview.classList.toggle('active',Math.abs(position-marker.time)<.12);
      if(videos.every(v=>Number.isFinite(v.duration))&&Math.max(...videos.map(v=>v.duration))-sharedDuration()>.1)note.textContent=`${playLabel}: ${sharedDuration().toFixed(2)} s shared duration.`;
    }
    async function seek(t,resume=false){
      stop();const run=++seekGeneration;pending=t;update();status.textContent='';status.classList.remove('error');
      try{
        await loadMetadata(video);if(run!==seekGeneration)return;
        setVideoTime(video,Math.max(0,Math.min(t,video.duration-.04)));pending=null;update();
        if(resume)await video.play();
      }catch{pending=null;update();status.textContent='Unable to load this video. Please retry.';status.classList.add('error')}
    }
    timeline.addEventListener('pointerdown',()=>{resumeAfterSeek=!video.paused});
    timeline.addEventListener('keydown',()=>{resumeAfterSeek=!video.paused});
    timeline.addEventListener('input',()=>seek(Number(timeline.value),resumeAfterSeek));
    for(const event of ['loadedmetadata','timeupdate','seeked'])video.addEventListener(event,update);
    video.addEventListener('seeking',()=>{
      const expected=internalSeeks.get(video);
      if(expected!==undefined&&Math.abs(video.currentTime-expected)<.2){internalSeeks.delete(video);return}
      if(synchronized)stop();
    });
    video.addEventListener('play',()=>{
      if(!synchronized&&!starting)for(const player of players)if(player!==controller)player.stop();
    });
    video.addEventListener('pause',()=>{if(synchronized&&!buffering)stop()});
    video.addEventListener('ended',()=>{if(synchronized)stop()});
    video.addEventListener('waiting',()=>{
      if(!synchronized||buffering)return;buffering=true;videos.forEach(v=>v.pause());status.textContent='Buffering…';
    });
    video.addEventListener('canplay',async()=>{
      if(!synchronized||!buffering||!videos.every(v=>v.readyState>=3))return;
      buffering=false;status.textContent='';try{await Promise.all(videos.map(v=>v.play()))}catch{stop()}
    });
    video.addEventListener('error',()=>{stop();status.textContent='This video could not be loaded. Please retry.';status.classList.add('error')});
    view.update=update;update();
  }
  if(item.solarGromePending){
    const pending=element('figure','model-pending');
    const blank=element('div','video-placeholder','—');blank.setAttribute('role','img');blank.setAttribute('aria-label','GROME based on Solar-WM video not provided');
    pending.append(element('figcaption','','GROME (based on Solar-WM)'),blank);pair.append(pending);
  }
  function tick(){
    if(!synchronized)return;
    const [master,...followers]=videos;
    if(master.currentTime>=sharedDuration()-.045){stop();return}
    if(!buffering)for(const follower of followers)if(follower.readyState>=3&&Math.abs(master.currentTime-follower.currentTime)>.12)setVideoTime(follower,master.currentTime);
    views.forEach(view=>view.update());raf=requestAnimationFrame(tick);
  }
  async function start(){
    if(synchronized){stop();return}
    for(const player of players)player.stop();
    const run=++generation;starting=true;play.disabled=true;play.textContent='Loading…';status.textContent='';status.classList.remove('error');
    try{
      await Promise.all(videos.map(loadMetadata));if(run!==generation)return;
      const position=videos[0].currentTime>=sharedDuration()-.08?0:videos[0].currentTime;
      videos.forEach(v=>{setVideoTime(v,position);v.playbackRate=Number(rate.value)});
      await Promise.all(videos.map(v=>v.play()));
      if(run!==generation){videos.forEach(v=>v.pause());return}
      synchronized=true;starting=false;play.disabled=false;play.textContent=pauseLabel;tick();
    }catch{if(run!==generation)return;stop();status.textContent='Playback could not start. Please retry.';status.classList.add('error')}
  }
  const play=button(playLabel,start);
  const restart=button(definitions.length>2?'Restart all':'Restart both',async()=>{
    stop();status.textContent='';try{await Promise.all(videos.map(loadMetadata));videos.forEach(v=>setVideoTime(v,0));views.forEach(view=>view.update())}catch{status.textContent='Unable to load this video. Please retry.'}
  });
  const rate=document.createElement('select');rate.setAttribute('aria-label',`${item.title}: playback speed`);
  for(const value of [.5,1]){const option=element('option','',`${value}×`);option.value=String(value);rate.append(option)}rate.value='1';
  rate.addEventListener('change',()=>videos.forEach(v=>v.playbackRate=Number(rate.value)));
  const label=element('label','rate-label','Speed ');label.append(rate);
  const fullscreen=button('Full screen',async()=>{try{if(document.fullscreenElement)await document.exitFullscreen();else await root.requestFullscreen()}catch{}});
  if(!document.fullscreenEnabled)fullscreen.hidden=true;
  controls.append(play,restart,label,fullscreen);root.append(pair,controls,note,status);parent.append(root);
}
function singlePlayer(item,parent) {
  const {figure,video}=videoFigure(item.video,null);
  const root=element('div','single-player');
  const stage=element('div','video-stage');
  figure.className='single-video';video.setAttribute('aria-label',`Non-rigid ${item.title}`);
  stage.append(video);figure.append(stage);root.append(figure);parent.append(root);
  const controller={video,stop:()=>video.pause()};players.add(controller);
  video.addEventListener('play',()=>{for(const p of players)if(p!==controller)p.stop()});
  const status=element('p','status');status.setAttribute('role','status');
  const controls=element('div','sync-controls');
  const play=button('Play',async()=>{
    if(!video.paused){video.pause();return}
    try{await loadMetadata(video);await video.play()}
    catch{status.textContent='Playback could not start. Please retry.';status.classList.add('error')}
  });
  const timeline=document.createElement('input');
  timeline.type='range';timeline.min='0';timeline.max=String(item.duration);timeline.step='.01';timeline.value='0';
  timeline.className='timeline';timeline.setAttribute('aria-label',`Non-rigid ${item.title}: video timeline`);
  const time=element('output','time-output');
  const markedTimeline=element('div','marked-timeline');
  const markerLayer=element('div','timeline-markers');
  markerLayer.setAttribute('role','group');markerLayer.setAttribute('aria-label',`Non-rigid ${item.title}: comparison frames`);
  const names={anchor:'Frame',revisit:'Revisit'};
  const markerButtons=(item.markers??[]).map(marker=>{
    const mark=button(`${marker.time} s`,()=>seek(marker.time),`timeline-marker marker-${marker.state}`);
    mark.title=`${names[marker.state]} · ${marker.time} s`;
    mark.setAttribute('aria-label',`Non-rigid ${item.title}: ${names[marker.state]}, ${marker.time} seconds`);
    markerLayer.append(mark);return {marker,mark};
  });
  markedTimeline.append(timeline,markerLayer);
  const {strip,previews}=frameStrip(item.markers??[],time=>seek(time),'Non-rigid '+item.title);
  const panel=element('div','model-timeline');panel.append(markedTimeline,time,strip);figure.append(panel);
  let seekGeneration=0,resumeAfterSeek=false,pendingSeek=null;
  function update(){
    timeline.max=String(Number.isFinite(video.duration)?video.duration:item.duration);
    const position=pendingSeek??video.currentTime;
    timeline.value=String(position);timeline.setAttribute('aria-valuetext',formatTime(position));
    time.textContent=`${formatTime(position)} / ${formatTime(Number(timeline.max))}`;
    play.textContent=video.paused?'Play':'Pause';
    for(const {marker,preview} of previews)preview.classList.toggle('active',Math.abs(position-marker.time)<.12);
    for(const {marker,mark} of markerButtons){
      const duration=Number(timeline.max);mark.hidden=marker.time>=duration;
      const ratio=marker.time/duration;
      mark.style.left=`calc(${ratio*100}% + ${8-16*ratio}px)`;
      mark.classList.toggle('active',Math.abs(position-marker.time)<.12);
    }
  }
  async function seek(t,resume=false){
    const run=++seekGeneration;pendingSeek=t;video.pause();update();
    try{
      await loadMetadata(video);if(run!==seekGeneration)return;
      video.currentTime=Math.max(0,Math.min(t,video.duration-.04));pendingSeek=null;update();
      if(resume)await video.play();
    }catch{pendingSeek=null;update();status.textContent='Unable to load this video. Please retry.';status.classList.add('error')}
  }
  timeline.addEventListener('pointerdown',()=>{resumeAfterSeek=!video.paused});
  timeline.addEventListener('keydown',()=>{resumeAfterSeek=!video.paused});
  timeline.addEventListener('input',()=>seek(Number(timeline.value),resumeAfterSeek));
  const fullscreen=button('Full screen',async()=>{try{if(document.fullscreenElement)await document.exitFullscreen();else await root.requestFullscreen()}catch{}});
  if(!document.fullscreenEnabled)fullscreen.hidden=true;
  controls.append(play,button('Restart',()=>seek(0)),fullscreen);root.append(controls,status);
  for(const name of ['loadedmetadata','timeupdate','seeked','play','pause','ended'])video.addEventListener(name,update);
  video.addEventListener('error',()=>{status.textContent='This video could not be loaded. Please retry.';status.classList.add('error')});update();
}
function render(groups,target,paired) {
  function renderCases(cases,parent,heading='h4',grid=false){
    const list=element('div',grid?'non-rigid-grid':'');
    for(const item of cases){
      const article=element('article','demo');article.id=item.id;
      article.append(element(heading,'',item.title));
      if(item.description)article.append(element('p','demo-description',item.description));
      if(paired)comparePlayer(item,article);else singlePlayer(item,article);
      list.append(article);
    }
    parent.append(list);
  }
  for(const group of groups){
    const section=element('section','category');section.id=group.id;
    if(group.title){const title=element('h3','',group.title);title.id=group.id+'-title';section.setAttribute('aria-labelledby',title.id);section.append(title)}
    if(group.description)section.append(element('p','category-description',group.description));
    if(group.points?.length){
      const points=element('ul','category-points');
      for(const point of group.points){
        const li=element('li');li.append(element('strong','',point.label+': '),document.createTextNode(point.text));points.append(li);
      }
      section.append(points);
    }
    if(group.cases)renderCases(group.cases,section,'h4',group.grid);
    for(const subgroup of group.sections??[]){
      const sub=element('section','case-subgroup');sub.id=subgroup.id;
      const title=element('h4','subgroup-title',subgroup.title);title.id=subgroup.id+'-title';sub.setAttribute('aria-labelledby',title.id);sub.append(title);
      renderCases(subgroup.cases,sub,'h5');section.append(sub);
    }
    target.append(section);
  }
}
render(comparisons,document.querySelector('#comparison-groups'),true);
const additionalSolar=element('section','category additional-comparisons');additionalSolar.id='solar-wm';
const additionalSolarTitle=element('h3','','Additional Solar-WM vs GROME (based on Solar-WM)');additionalSolarTitle.id='solar-comparison-title';additionalSolar.setAttribute('aria-labelledby',additionalSolarTitle.id);
const additionalSolarGroups=element('div');additionalSolarGroups.id='solar-comparison-groups';additionalSolar.append(additionalSolarTitle,additionalSolarGroups);
document.querySelector('#entity-consistency').after(additionalSolar);
render(solarComparisons,additionalSolarGroups,true);
render(nonRigid,document.querySelector('#non-rigid-groups'),false);
document.addEventListener('visibilitychange',()=>{if(document.hidden)for(const player of players)player.stop()});
