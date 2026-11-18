import { comparisons, nonRigid } from './demos.js';

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
  const names={anchor:'Frame',consistent:'Consistent',inconsistent:'Inconsistent',revisit:'Revisit'};
  const previews=markers.map(marker=>{
    const preview=button('',()=>seek(marker.time),'frame-preview marker-'+marker.state);
    preview.title=names[marker.state]+' · '+marker.time+' s';
    preview.setAttribute('aria-label',label+', '+names[marker.state]+', '+marker.time+' seconds');
    const img=document.createElement('img');img.src=marker.thumbnail;img.alt=label+' at '+marker.time+' seconds';img.loading='lazy';img.decoding='async';
    preview.append(img,element('span','frame-time',marker.time+' s'));strip.append(preview);
    return {marker,preview};
  });return {strip,previews};
}
function comparePlayer(item, parent) {
  const root=element('div','compare-player');
  const pair=element('div','pair');
  const definitions=[{key:'sana',label:'SANA-WM',src:item.sana},{key:'grome',label:'SANA-WM + GROME',src:item.grome}];
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
    videos.forEach(v=>v.pause());play.textContent='Play both';play.disabled=false;
  }
  const controller={stop};players.add(controller);
  for(const view of views){
    const {video,figure,key,label}=view;
    const timeline=element('input','timeline');timeline.type='range';timeline.min='0';timeline.max=String(item.durations?.[key]??item.duration);timeline.step='.01';timeline.value='0';
    timeline.setAttribute('aria-label',`${item.title}: ${label} timeline`);
    const time=element('output','time-output');
    const track=element('div','marked-timeline');
    const markerLayer=element('div','timeline-markers');markerLayer.setAttribute('role','group');markerLayer.setAttribute('aria-label',`${item.title}: ${label} comparison frames`);
    const names={anchor:'Frame',consistent:'Consistent',inconsistent:'Inconsistent'};
    const buttons=(item.markers?.[key]??[]).map(marker=>{
      const mark=button(`${marker.time} s`,()=>seek(marker.time),`timeline-marker marker-${marker.state}`);
      mark.title=`${names[marker.state]} · ${marker.time} s`;
      mark.setAttribute('aria-label',`${item.title}: ${label}, ${names[marker.state]}, ${marker.time} seconds`);
      markerLayer.append(mark);return {marker,mark};
    });
    track.append(timeline,markerLayer);
    const {strip,previews}=frameStrip(item.frames?.[key]??item.markers?.[key]??[],time=>seek(time),item.title+': '+label);
    const panel=element('div','model-timeline');panel.append(track,time,strip);figure.append(panel);pair.append(figure);
    let pending=null,seekGeneration=0,resumeAfterSeek=false;
    function update(){
      const duration=Number.isFinite(video.duration)?video.duration:(item.durations?.[key]??item.duration);
      const position=pending??video.currentTime;
      timeline.max=String(duration);timeline.value=String(position);timeline.setAttribute('aria-valuetext',formatTime(position));
      time.textContent=`${formatTime(position)} / ${formatTime(duration)}`;
      for(const {marker,mark} of buttons){
        mark.hidden=marker.time>=duration;
        const ratio=marker.time/duration;
        mark.style.left=`calc(${ratio*100}% + ${8-16*ratio}px)`;
        mark.classList.toggle('active',Math.abs(position-marker.time)<.12);
      }
      for(const {marker,preview} of previews)preview.classList.toggle('active',Math.abs(position-marker.time)<.12);
      if(videos.every(v=>Number.isFinite(v.duration))&&Math.abs(videos[0].duration-videos[1].duration)>.1)note.textContent=`Play both: ${sharedDuration().toFixed(2)} s shared duration.`;
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
  function tick(){
    if(!synchronized)return;
    const [master,follower]=videos;
    if(master.currentTime>=sharedDuration()-.045){stop();return}
    if(!buffering&&follower.readyState>=3&&Math.abs(master.currentTime-follower.currentTime)>.12)setVideoTime(follower,master.currentTime);
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
      synchronized=true;starting=false;play.disabled=false;play.textContent='Pause both';tick();
    }catch{if(run!==generation)return;stop();status.textContent='Playback could not start. Please retry.';status.classList.add('error')}
  }
  const play=button('Play both',start);
  const restart=button('Restart both',async()=>{
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
render(nonRigid,document.querySelector('#non-rigid-groups'),false);
document.addEventListener('visibilitychange',()=>{if(document.hidden)for(const player of players)player.stop()});
