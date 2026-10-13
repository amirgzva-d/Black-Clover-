import {mountMochi,renderMochi,readAppearance,applyMochiEquipment,destroyMochi} from './mochiCharacter.js';
const esc=s=>String(s??'').replace(/[&<>"']/g,c=>({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[c]));
const accepted=new Set(['ui-state','thinking','tool','tool-started','tool-progress','tool-finished','task-finished','task-success','task-ended','error','failure','approval','confirmation','permission','confirm','question','clarification','rate-limit','upload','file-upload','voice-listening','voice-speaking','voice-ended','scheduled-action','dev-session']);
const textValue=value=>typeof value==='string'?value:typeof value==='number'?String(value):'';
export function reduceMochiActivity(previous=[],event={}){
 if(!accepted.has(event.type))return previous;
 const text=[event.detail,event.message,event.text,event.tool,event.name,event.action].map(textValue).find(Boolean);
 if(!text)return previous;
 const key=String(event.taskId||event.sessionId||event.requestId||'current');
 const raw=event.progress??event.percent;
 const progress=raw!==undefined&&raw!==null&&Number.isFinite(Number(raw))?Math.max(0,Math.min(100,Number(raw))):null;
 const item={key,text:text.slice(0,180),type:event.type,progress,at:Date.now()};
 return [item,...previous.filter(x=>x.key!==key)].slice(0,4);
}
export function createMochiActivity(root,{getState=()=>({state:'idle',label:'آماده'}),onOpen=()=>{}}={}){
 const host=root.querySelector('.v4-preview');if(!host)return {update(){},destroy(){}};
 const card=document.createElement('button');card.type='button';card.className='mochi-live-summary';card.setAttribute('aria-label','باز کردن جزئیات فعالیت ماریا');card.hidden=true;
 card.innerHTML='<span class="mochi-live-character"></span><span class="mochi-live-copy" dir="rtl"><small>MARIA · فعالیت زنده</small><b data-live-heading></b><span data-live-detail></span><progress data-live-progress max="100" hidden></progress></span><span class="mochi-live-sessions" dir="rtl"></span>';
 host.append(card);const avatar=card.querySelector('.mochi-live-character');
 mountMochi(avatar,{equipment:readAppearance()?.equipment||root.dataset.outfit,motion:readAppearance()?.motion||'full'});
 card.onclick=e=>{e.stopPropagation();onOpen();};let entries=[];
 const sync=()=>{const prefs=readAppearance();applyMochiEquipment(avatar,prefs?.equipment||root.dataset.outfit);avatar.dataset.mochiMotion=prefs?.motion||root.dataset.motionLevel||'full';};
 window.addEventListener('maria:appearance',sync);window.addEventListener('storage',sync);
 return {update(event){const next=reduceMochiActivity(entries,event);if(next===entries||!next.length)return;entries=next;
   const {state,label}=getState();renderMochi(avatar,state);sync();card.hidden=false;root.dataset.hasLive='true';card.dataset.activityState=state;
   card.querySelector('[data-live-heading]').textContent=label;card.querySelector('[data-live-detail]').textContent=entries[0].text;
   const bar=card.querySelector('[data-live-progress]');bar.hidden=entries[0].progress===null;if(!bar.hidden)bar.value=entries[0].progress;
   card.querySelector('.mochi-live-sessions').innerHTML=entries.slice(1).map((e,i)=>`<span><i style="--activity-hue:${[172,270,35][i]}"></i>${esc(e.text)}</span>`).join('');
  },destroy(){destroyMochi(avatar);window.removeEventListener('maria:appearance',sync);window.removeEventListener('storage',sync);card.remove();}}
}
