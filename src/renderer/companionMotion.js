/**
 * MARIA Companion Motion Director.
 * A deterministic, UI-only state coordinator: business operations remain in Electron.
 * "success" requires independently confirmed completion; preview mode is explicitly local.
 */
export const COMPANION_STATES=Object.freeze({
  idle:{label:'آماده',accent:'#dce7ff',priority:0,ttl:0},
  greeting:{label:'سلام!',accent:'#f5dcc1',priority:1,ttl:1700},
  thinking:{label:'در حال فکر',accent:'#a68cff',priority:3,ttl:0},
  searching:{label:'در حال جستجو',accent:'#84baff',priority:3,ttl:0},
  working:{label:'در حال اجرا',accent:'#69aaff',priority:4,ttl:0},
  uploading:{label:'در حال بارگذاری',accent:'#65c6ed',priority:4,ttl:0},
  listening:{label:'گوش می‌دهم',accent:'#77bfff',priority:4,ttl:0},
  speaking:{label:'پاسخ می‌دهم',accent:'#b8a1ff',priority:4,ttl:0},
  waiting:{label:'منتظر پاسخ',accent:'#e3b078',priority:5,ttl:0},
  approval:{label:'نیاز به تأیید',accent:'#f6bb65',priority:7,ttl:0},
  question:{label:'یک سؤال',accent:'#69e4ea',priority:2,ttl:2200},
  shy:{label:'خجالتی',accent:'#ffb5d8',priority:1,ttl:2200},
  happy:{label:'خوشحال',accent:'#8ae5b0',priority:1,ttl:1800},
  surprised:{label:'متعجب',accent:'#c2b4ff',priority:1,ttl:1600},
  dizzy:{label:'سرگیجه',accent:'#e9a8de',priority:2,ttl:1800},
  dancing:{label:'رقص شادی',accent:'#f6c77e',priority:1,ttl:2700},
  success:{label:'با موفقیت انجام شد',accent:'#6bdf9a',priority:5,ttl:2400},
  error:{label:'عملیات ناموفق',accent:'#fa8b98',priority:8,ttl:4400},
  offline:{label:'اتصال قطع است',accent:'#a3a8bb',priority:9,ttl:0}
});
export const COMPANION_OUTFITS=Object.freeze({
 classic:'ساده',studio:'استودیو',wizard:'جادوگر',crown:'تاج',headphones:'هدفون',beanie:'کلاه',party:'جشن',night:'شب'
});
const ALIAS=Object.freeze({hello:'greeting',executing:'working',finished:'success',dance:'dancing',upload:'uploading',slap:'surprised',sleep:'waiting'});
export function normalizeCompanionState(state){
  const key=String(state||'idle').trim().toLowerCase();
  const canonical=ALIAS[key]||key;
  return Object.hasOwn(COMPANION_STATES,canonical)?canonical:'idle';
}
/** The actual n=2.7 Lamé curve, generated in relative percent geometry. */
export function superellipsePolygon(exponent=2.7,segments=96){
  const n=Number.isFinite(exponent)?Math.max(2,Math.min(6,exponent)):2.7;
  const count=Math.max(32,Math.min(192,Math.trunc(segments)||96));
  const point=(a,b)=>100*Math.min(1,Math.max(0,a+b));
  const points=[];
  for(let i=0;i<count;i++){
    const theta=2*Math.PI*i/count;
    const c=Math.cos(theta),s=Math.sin(theta);
    const x=point(.5,Math.sign(c)*.5*Math.abs(c)**(2/n));
    const y=point(.5,Math.sign(s)*.5*Math.abs(s)**(2/n));
    points.push(x.toFixed(3)+'% '+y.toFixed(3)+'%');
  }
  return 'polygon('+points.join(',')+')';
}
export function verifiedCompletion(event={}){
  const data=event&&typeof event==='object'?event:{};
  return data.verified===true||data.result?.verified===true||
    data.outcome?.verified===true||data.verification?.ok===true;
}
/** Converts actual MARIA backend events into safe visual states. */
export function mapCompanionEvent(event={}){
  if(!event||typeof event!=='object')return null;
  const type=String(event.type||'').toLowerCase();
  const mode=String(event.mode||event.state||'').toLowerCase();
  const description=[event.action,event.tool,event.name,event.detail,event.message]
    .filter(v=>typeof v==='string').join(' ').toLowerCase();
  if(type==='avatar-visibility-changed'||type==='data-changed'||type==='accounting-report-updated')return null;
  if(type==='error'||type==='failure'||type==='tool-error'||mode==='error'||mode==='failed'||event.ok===false){
    return {state:'error',origin:'system'};
  }
  if(type==='approval'||type==='confirmation'||type==='permission'||type==='confirm'||
    event.requiresConfirmation===true||event.payload?.requiresConfirmation===true){
    return {state:'approval',origin:'system'};
  }
  if(mode==='offline'||type==='offline')return {state:'offline',origin:'system'};
  if(type==='ui-state'){
    if(mode==='working'||mode==='executing')return {state:'working',origin:'system',force:true};
    if(mode==='thinking')return {state:'thinking',origin:'system',force:true};
    if(mode==='listening'||mode==='speaking')return {state:mode,origin:'system'};
    if(mode==='idle'||mode==='ready'||mode==='online')return {state:'idle',origin:'system',force:true};
    return null;
  }
  if(type==='thinking')return {state:'thinking',origin:'system'};
  if(type==='tool'||type==='tool-started'||type==='tool-progress'){
    if(/upload|attach|بارگذار/.test(description))return {state:'uploading',origin:'system'};
    if(/search|find|جستجو/.test(description))return {state:'searching',origin:'system'};
    return {state:'working',origin:'system'};
  }
  if(type==='scheduled-action'||type==='dev-session'){
    if(mode==='needs-confirmation')return {state:'approval',origin:'system',force:true};
    if(mode==='error'||mode==='failed')return {state:'error',origin:'system',force:true};
    if(mode==='running'||mode==='researching')return {state:'working',origin:'system',force:true};
    if(mode==='done'||mode==='success')return verifiedCompletion(event)?{state:'success',origin:'system',force:true}:{state:'idle',origin:'system',force:true};
  }
  if(type==='voice-listening')return {state:'listening',origin:'system'};
  if(type==='voice-speaking')return {state:'speaking',origin:'system'};
  if(type==='voice-ended')return {state:'idle',origin:'system',force:true};
  if(type==='upload'||type==='file-upload')return {state:'uploading',origin:'system'};
  if(type==='task-success'||type==='tool-finished'||type==='task-finished'||type==='success'){
    return verifiedCompletion(event)?{state:'success',origin:'system',force:true}:{state:'working',origin:'system',force:true};
  }
  if(type==='task-ended'||type==='tool-cancelled')return {state:'idle',origin:'system',force:true};
  return null;
}
export class CompanionStateMachine{
  constructor({now=()=>Date.now(),schedule=(fn,ms)=>setTimeout(fn,ms),cancel=id=>clearTimeout(id),onChange=()=>{}}={}){
    this.now=now;this.schedule=schedule;this.cancel=cancel;this.onChange=onChange;
    this.state='idle';this.origin='system';this.startedAt=now();this.timeout=null;this.destroyed=false;
    this.history=[];this.generation=0;
  }
  set(state,{origin='system',force=false,ttl,reason=''}={}){
    if(this.destroyed)return false;
    const next=normalizeCompanionState(state),prev=this.state;
    const higher=COMPANION_STATES[prev].priority>COMPANION_STATES[next].priority;
    if(!force&&next!=='idle'&&higher&&this.origin==='system')return false;
    if(!force&&next==='idle'&&higher&&origin==='preview')return false;
    this.cancel(this.timeout);this.timeout=null;
    this.state=next;this.origin=origin;this.startedAt=this.now();this.generation++;
    const duration=ttl===undefined?COMPANION_STATES[next].ttl:Math.max(0,Number(ttl)||0);
    const transition={from:prev,to:next,at:this.startedAt,origin,reason};
    this.history.push(transition);if(this.history.length>48)this.history.shift();
    this.onChange(next,transition);
    if(duration>0&&next!=='idle'){
      const generation=this.generation;
      this.timeout=this.schedule(()=>{
        if(this.destroyed||generation!==this.generation)return;
        this.set('idle',{force:true,reason:'animation-expired'});
      },duration);
    }
    return true;
  }
  dispatch(event){const next=mapCompanionEvent(event);return next?this.set(next.state,next):false;}
  preview(state){return this.set(state,{origin:'preview',force:true});}
  destroy(){this.destroyed=true;this.cancel(this.timeout);this.timeout=null;this.history=[];}
}
export function createCompanionSystem(root,{prefersReducedMotion=false,outfit='classic',motion='full'}={}){
  if(!root)throw new TypeError('Companion root is required');
  const avatar=root.querySelector('[data-character]');
  if(!avatar)throw new TypeError('Companion character is required');
  let lastAnnouncement='';
  const announcer=root.querySelector('[data-companion-announcement]');
  const machine=new CompanionStateMachine({onChange:(state)=>{
    root.dataset.companionState=state;
    root.style.setProperty('--maria-state-accent',COMPANION_STATES[state].accent);
    for(const view of [avatar,...root.querySelectorAll('[data-companion-preview]')]){
      view.dataset.state=state==='working'?'executing':state;
      view.dataset.companionState=state;
      const badge=view.querySelector('[data-companion-badge]');
      if(badge){badge.textContent=state==='idle'?'':COMPANION_STATES[state].label;badge.hidden=state==='idle';}
    }
    const stage=root.querySelector('[data-motion-stage-status]');
    if(stage)stage.textContent=COMPANION_STATES[state].label;
    if(announcer&&lastAnnouncement!==state&&['success','error','approval','offline'].includes(state))
      announcer.textContent=COMPANION_STATES[state].label;
    lastAnnouncement=state;
  }});
  root.style.setProperty('--maria-mochi-shape',superellipsePolygon());
  const reduceMotion=Boolean(prefersReducedMotion);
  root.dataset.motionLevel=reduceMotion?'none':motion;
  root.dataset.outfit=Object.hasOwn(COMPANION_OUTFITS,outfit)?outfit:'classic';
  const methods={
    machine,
    setState:(state,options)=>machine.set(state,options),
    onEvent:event=>machine.dispatch(event),
    greet:()=>machine.set('greeting',{origin:'preview'}),
    preview:state=>machine.preview(state),
    setOutfit:next=>{if(!Object.hasOwn(COMPANION_OUTFITS,next))return false;root.dataset.outfit=next;return true;},
    setMotion:next=>{if(!['full','subtle','none'].includes(next))return false;root.dataset.motionLevel=reduceMotion?'none':next;return true;},
    destroy:()=>machine.destroy()
  };
  machine.set('idle',{force:true});
  return methods;
}
