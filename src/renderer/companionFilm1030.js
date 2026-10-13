/**
 * MARIA / reference video 1000311030 — expressive mascot direction.
 *
 * Visual language is recreated with original CSS/DOM assets (not extracted artwork).
 * This timeline is a DESIGN PREVIEW only. It never reports real tool completion.
 */
export const FILM_1030_DURATION=12100;
export const FILM_1030_SHOTS=Object.freeze([
  {at:0,state:'idle',scene:'neutral',description:'Floating, matte-white soft superellipse'},
  {at:470,state:'greeting',scene:'greet',description:'Bright smile, hand wave and short light flecks'},
  {at:1700,state:'happy',scene:'greet-settle',description:'Bouncy expression settles gently'},
  {at:2480,state:'shy',scene:'blush',description:'Blush and lavender circular aura'},
  {at:2950,state:'thinking',scene:'thinking',description:'Violet badge with three dots, thoughtful bob'},
  {at:3970,state:'working',scene:'working',description:'Blue badge, cyan halo and active movement'},
  {at:5380,state:'approval',scene:'approval',description:'Warm amber warning badge; still, readable'},
  {at:6840,state:'success',scene:'success',description:'Mint success orb, soft sparks and smiling eyes'},
  {at:8430,state:'affection',scene:'affection',description:'Pink heart eyes and floating hearts'},
  {at:10330,state:'idle',scene:'reset',description:'Eyes return to dots; glow fades'},
  {at:11030,state:'happy',scene:'wink',description:'Gentle wink / short smile'},
  {at:11930,state:'idle',scene:'neutral',description:'Recover stable idle posture'}
]);
export const FILM_1030_SCENES=Object.freeze({
  idle:'neutral',greeting:'greet',happy:'greet',shy:'blush',
  thinking:'thinking',searching:'working',working:'working',
  uploading:'working',listening:'working',speaking:'working',
  waiting:'approval',approval:'approval',error:'approval',offline:'neutral',
  success:'success',affection:'affection',dancing:'success',
  question:'thinking',surprised:'greet',dizzy:'thinking'
});
export function frameForFilm1030(timeMs){
 const at=Math.max(0,Math.min(FILM_1030_DURATION,Number(timeMs)||0));
 let current=FILM_1030_SHOTS[0];
 for(const frame of FILM_1030_SHOTS){if(at<frame.at)break;current=frame;}
 return current;
}
export function decorateFilm1030Character(view){
 if(!view)return null;
 if(!view.querySelector('[data-film-glow]')){
  const glow=document.createElement('span');glow.className='maria-film-glow';glow.dataset.filmGlow='';
  glow.setAttribute('aria-hidden','true');view.prepend(glow);
 }
 if(!view.querySelector('[data-film-ring]')){
  const ring=document.createElement('span');ring.className='maria-film-ring';ring.dataset.filmRing='';
  ring.setAttribute('aria-hidden','true');view.append(ring);
 }
 if(!view.querySelector('[data-film-fx]')){
  const fx=document.createElement('span');fx.className='maria-film-fx';fx.dataset.filmFx='';
  fx.setAttribute('aria-hidden','true');
  for(let i=0;i<9;i++){
   const dot=document.createElement('i');dot.className='maria-film-particle';
   dot.style.setProperty('--i',String(i));
   dot.style.setProperty('--angle',String(-75+i*29)+'deg');
   dot.style.setProperty('--spread',String(36+(i%3)*12)+'px');
   fx.append(dot);
  }
  for(let i=0;i<6;i++){
   const heart=document.createElement('i');heart.className='maria-film-heart';
   heart.textContent='♥';heart.style.setProperty('--i',String(i));
   fx.append(heart);
  }
  view.append(fx);
 }
 return view;
}
export function renderFilm1030Character(view,state,{scene=null}={}){
 if(!view)return;
 const phase=scene||FILM_1030_SCENES[state]||'neutral';
 view.dataset.filmScene=phase;
 view.dataset.companionState=state||'idle';
 const badge=view.querySelector('[data-companion-badge]');
 if(badge&&view.hasAttribute('data-companion-preview')){
  badge.hidden=true;
 }
}
/**
 * A restartable sequence with clean cancellation. If a second playback begins
 * before the first finishes, all previous timers are cancelled.
 */
export function createFilm1030Timeline({
 onFrame=()=>{},onEnd=()=>{},
 schedule=(callback,delay)=>setTimeout(callback,delay),
 cancel=handle=>clearTimeout(handle)
}={}){
 let handles=[],generation=0,running=false;
 const stop=({restore=true}={})=>{
  generation++;
  handles.forEach(cancel);handles=[];running=false;
  if(restore)onFrame({...FILM_1030_SHOTS[0],at:FILM_1030_DURATION,stopped:true});
 };
 const play=()=>{
  stop({restore:false});
  const myGeneration=generation;
  running=true;
  FILM_1030_SHOTS.forEach(shot=>{
   const handle=schedule(()=>{
    if(generation!==myGeneration)return;
    onFrame(shot);
   },shot.at);
   handles.push(handle);
  });
  handles.push(schedule(()=>{
   if(generation!==myGeneration)return;
   running=false;handles=[];onEnd();
  },FILM_1030_DURATION));
 };
 return {play,stop,get running(){return running;},get queued(){return handles.length;}};
}
