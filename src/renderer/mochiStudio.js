import './mochiCharacter.css';
import './mochiStudio.css';
import {MOCHI_EXPRESSIONS,MOCHI_OUTFITS,mountMochi,renderMochi,applyMochiEquipment,destroyMochi,normalizeEquipment,equipItem,readAppearance,saveAppearance} from './mochiCharacter.js';
import {MOCHI_SEQUENCES,createMochiSequence} from './mochiSequences.js';
const esc=s=>String(s??'').replace(/[&<>"']/g,c=>({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[c]));
export function mountMochiStudio(host,{equipment='classic',motion='full',onApply=()=>{},onModels=null,onMotions=null,getLive=()=>null,onBack=null}={}){
 const appearance=readAppearance();let draft=normalizeEquipment(appearance?.equipment||equipment),saved=normalizeEquipment(draft),quality=appearance?.motion||motion,savedQuality=quality,state='idle',tab='expressions',filter='',disposed=false;
 const expressions=new Map(MOCHI_EXPRESSIONS);let liveTimer=null,thumbnailObserver=null;
 host.innerHTML=`<section class="mochi-studio" data-mochi-studio>
  <header class="mochi-studio-head" dir="rtl"><div><small>MARIA / CHARACTER STUDIO</small><h2>کاراکتر و تجهیزات</h2></div><div class="mochi-head-actions">${onModels?'<button data-mochi-models>مدل‌های سه‌بعدی</button>':''}${onMotions?'<button data-mochi-motions>حرکت‌های VRM</button>':''}${onBack?'<button data-mochi-back aria-label="بازگشت">بازگشت</button>':''}</div></header>
  <div class="mochi-studio-layout"><aside class="mochi-preview-panel">
   <div class="mochi-preview-top"><span>MOCHI</span><span class="mochi-preview-label">پیش‌نمایش</span></div>
   <div class="mochi-preview-stage" data-mochi-stage data-preview-mode="portrait"><div class="mochi-stage-avatar" data-companion-preview role="img" aria-label="پیش‌نمایش موچی"></div><div class="mochi-demo-activity" dir="rtl"><b data-demo-title>در حال کار</b><span>نمونهٔ نمای فعالیت</span><i></i></div></div>
   <div class="mochi-preview-caption" dir="rtl"><h3 data-motion-stage-status role="status" aria-live="polite" aria-atomic="true">آماده</h3><p data-mochi-caption>اشاره‌گر را حرکت بده؛ موچی نگاهت می‌کند.</p></div>
   <div class="mochi-slot-list" dir="rtl" data-mochi-slots></div>
   <div class="mochi-save-row"><button class="mochi-primary" data-mochi-apply>اعمال روی ماریا</button><button data-mochi-reset title="بازگشت به ظاهر ذخیره‌شده">بازگردانی</button></div><p class="mochi-save-status" data-mochi-save-status role="status" dir="rtl">ظاهر ذخیره‌شده</p>
  </aside><section class="mochi-browser">
   <nav class="mochi-tabs" role="tablist" aria-label="بخش‌های کاراکتر" dir="rtl"><button role="tab" data-mochi-tab="expressions" aria-selected="true">حالت‌ها <small>۲۵</small></button><button role="tab" data-mochi-tab="equipment" aria-selected="false">تجهیزات <small>۱۴</small></button><button role="tab" data-mochi-tab="sequences" aria-selected="false">توالی‌ها <small>۹</small></button><button role="tab" data-mochi-tab="live" aria-selected="false">فعالیت زنده</button></nav>
   <div class="mochi-browser-toolbar" dir="rtl"><span data-mochi-section-title>حالت چشم‌ها و حرکت‌ها</span><input data-mochi-search aria-label="جستجوی حالت یا تجهیزات" placeholder="جستجو…"></div>
   <div class="mochi-browser-content" data-mochi-content role="tabpanel"></div>
   <footer class="mochi-studio-footer" dir="rtl"><span>شدت حرکت</span><div>${[['full','کامل'],['subtle','ملایم'],['none','خاموش']].map(([key,label])=>`<button data-mochi-quality="${key}" aria-pressed="${quality===key}">${label}</button>`).join('')}</div><small>واکنش‌ها با وضعیت واقعی ماریا هماهنگ‌اند.</small></footer>
  </section></div></section>`;
 const $=s=>host.querySelector(s),$$=s=>[...host.querySelectorAll(s)],preview=$('[data-companion-preview]');
 const onVisibility=()=>{const panel=$('.mochi-studio');if(panel)panel.dataset.mochiDocHidden=String(document.hidden);};
 document.addEventListener('visibilitychange',onVisibility);onVisibility();
 mountMochi(preview,{equipment:draft,motion:quality});
 const status=text=>{$('[data-mochi-save-status]').textContent=text;};
 const updateSlots=()=>{
  const slots={head:'سر',face:'صورت',neck:'گردن',body:'بدنه'};
  $('[data-mochi-slots]').innerHTML=Object.entries(slots).map(([key,label])=>`<button data-mochi-clear="${key}" ${draft[key]?'':'disabled'} title="حذف ${label}"><span>${label}</span><b>${esc(MOCHI_OUTFITS[draft[key]]?.label||'—')}</b>${draft[key]?'<i>×</i>':''}</button>`).join('');
  $('[data-mochi-apply]').disabled=JSON.stringify(saved)===JSON.stringify(draft)&&quality===savedQuality;
 };
 const setState=(next,{fromTimeline=false,mode='portrait'}={})=>{
  // Timeline ticks update progress frequently, but facial SVG/state and live text
  // change only at actual sequence boundaries. Avoid needless DOM/layout work.
  const changed=state!==next;
  state=next;
  if(changed){
   renderMochi(preview,next);preview.dataset.companionState=next;
   $('[data-motion-stage-status]').textContent=expressions.get(next)||({waiting:'بازیابی',offline:'آفلاین'}[next])||next;
   $('[data-demo-title]').textContent=$('[data-motion-stage-status]').textContent;
   for(const button of $$('[data-motion-state]'))button.setAttribute('aria-pressed',String(button.dataset.motionState===next));
  }
  $('[data-mochi-stage]').dataset.previewMode=mode;
  if(!fromTimeline)$('[data-mochi-caption]').textContent=next==='uploading'?'تبدیل نرم به جعبه و دریافت فایل':next==='dancing'?'حرکت ریتمیک و مستقل از فعالیت واقعی':'اشاره‌گر را حرکت بده؛ موچی نگاهت می‌کند.';
 };
 const timeline=createMochiSequence({onFrame:(frame,time,seq)=>{
   setState(frame.state,{fromTimeline:true,mode:frame.mode});applyMochiEquipment(preview,frame.equipment?normalizeEquipment(frame.equipment):draft);
   const bar=$('[data-mochi-progress]');if(bar){bar.value=time;bar.max=seq.duration;}
   const clock=$('[data-mochi-clock]');if(clock)clock.textContent=(time/1000).toFixed(1)+' / '+(seq.duration/1000).toFixed(1)+'s';
   $('[data-mochi-caption]').textContent=seq.title+' · پیش‌نمایش';
  },onEnd:()=>{setState('idle');applyMochiEquipment(preview,draft);syncPlayback();}});
 const syncPlayback=()=>{$$('[data-mochi-play]').forEach(b=>b.disabled=timeline.running);const b=$('[data-mochi-stop]');if(b)b.disabled=!timeline.running;};
 const stop=()=>{timeline.stop();applyMochiEquipment(preview,draft);syncPlayback();};
 const card=(key,label,kind,en='')=>`<button class="mochi-card" data-${kind==='state'?'motion-state':'mochi-outfit'}="${key}" aria-pressed="${kind==='state'?state===key:Object.values(draft).includes(key)}" data-search="${esc((label+' '+key+' '+en).toLowerCase())}"><span class="mochi-card-preview" data-card-state="${kind==='state'?key:'idle'}" data-card-outfit="${kind==='state'?'classic':key}"></span><b>${esc(label)}</b><small>${esc(en||key)}</small></button>`;
 const renderLive=()=>{
  const info=getLive();const current=info?.state||'idle';const entries=info?.history||[];
  $('[data-mochi-content]').innerHTML=`<section class="mochi-live-panel" dir="rtl"><small>وضعیت واقعی ماریا</small><h3>${esc(expressions.get(current)||current)}</h3><p>این بخش از رویدادهای اجرای ماریا به‌روز می‌شود.</p><div class="mochi-state-flow">${['idle','thinking','working','approval','success','error'].map(key=>`<span class="${current===key?'active':''}" data-live-state="${key}">${esc(expressions.get(key))}</span>`).join('')}</div><ol>${entries.slice(-8).reverse().map(e=>`<li><time>${esc(new Date(e.at).toLocaleTimeString('fa-IR',{hour:'2-digit',minute:'2-digit',second:'2-digit'}))}</time><b>${esc(expressions.get(e.to)||e.to)}</b><span>${e.origin==='preview'?'واکنش اشاره‌گر':'رویداد اجرا'}</span></li>`).join('')||'<li>هنوز فعالیتی ثبت نشده است.</li>'}</ol></section>`;
 };
 const render=()=>{
  clearInterval(liveTimer);liveTimer=null;
  thumbnailObserver?.disconnect();thumbnailObserver=null;
  for(const button of $$('[data-mochi-tab]'))button.setAttribute('aria-selected',String(button.dataset.mochiTab===tab));
  const title={expressions:'حالت چشم‌ها و حرکت‌ها',equipment:'انتخاب تجهیزات؛ ترکیب سر، صورت، گردن و بدنه',sequences:'توالی حرکت‌های مرجع',live:'وضعیت و تاریخچهٔ واقعی'};
  $('[data-mochi-section-title]').textContent=title[tab];$('[data-mochi-search]').hidden=!['expressions','equipment'].includes(tab);
  const content=$('[data-mochi-content]');
  if(tab==='expressions')content.innerHTML='<div class="mochi-card-grid">'+MOCHI_EXPRESSIONS.map(([key,label])=>card(key,label,'state')).join('')+'</div>';
  else if(tab==='equipment')content.innerHTML='<div class="mochi-card-grid mochi-equipment-grid">'+Object.entries(MOCHI_OUTFITS).map(([key,item])=>card(key,item.label,'outfit',item.en)).join('')+'</div>';
  else if(tab==='sequences')content.innerHTML=`<div class="mochi-sequence-list" dir="rtl">${MOCHI_SEQUENCES.map((seq,i)=>`<article><span>${String(i+1).padStart(2,'0')}</span><div><b>${seq.title}</b><small dir="ltr">${seq.id} · ${(seq.duration/1000).toFixed(1)}s</small></div><button data-mochi-play="${seq.id}" aria-label="پخش ${seq.title}">پخش <span>▷</span></button></article>`).join('')}</div><div class="mochi-playback"><button data-mochi-stop disabled>توقف</button><progress data-mochi-progress value="0" max="100"></progress><small data-mochi-clock>0.0s</small></div>`;
  else{renderLive();liveTimer=setInterval(()=>{if(!disposed&&host.isConnected)renderLive();},1200);}
  const thumbnails=$$('[data-card-state]');
  for(const node of thumbnails)mountMochi(node,{state:node.dataset.cardState,equipment:node.dataset.cardOutfit,motion:'none',track:false});
  // Keep reusable scenes but suspend offscreen preview work. The native scrolling
  // container is the observer root; disconnect before each filter/tab rerender.
  if(thumbnails.length&&typeof IntersectionObserver==='function'){
   thumbnailObserver=new IntersectionObserver(entries=>{
    for(const entry of entries)entry.target.dataset.mochiVisible=String(entry.isIntersecting);
   },{root:$('[data-mochi-content]'),rootMargin:'64px 0px'});
   for(const node of thumbnails){node.dataset.mochiVisible='false';thumbnailObserver.observe(node);}
  }
  for(const node of $$('[data-search]'))node.hidden=!!filter&&!node.dataset.search.includes(filter);
  syncPlayback();
 };
 const handle=async e=>{
  const button=e.target.closest('button');if(!button||!host.contains(button))return;e.stopPropagation();
  if(button.hasAttribute('data-motion-state')){stop();setState(button.dataset.motionState);}
  else if(button.hasAttribute('data-mochi-outfit')){stop();draft=equipItem(draft,button.dataset.mochiOutfit);applyMochiEquipment(preview,draft);status('پیش‌نمایش تجهیزات؛ برای ذخیره اعمال را بزن.');render();updateSlots();}
  else if(button.hasAttribute('data-mochi-clear')){stop();draft[button.dataset.mochiClear]='';applyMochiEquipment(preview,draft);render();updateSlots();}
  else if(button.hasAttribute('data-mochi-tab')){stop();tab=button.dataset.mochiTab;render();}
  else if(button.hasAttribute('data-mochi-play')){timeline.play(MOCHI_SEQUENCES.find(x=>x.id===button.dataset.mochiPlay));syncPlayback();}
  else if(button.hasAttribute('data-mochi-stop')){stop();setState('idle');}
  else if(button.hasAttribute('data-mochi-quality')){quality=button.dataset.mochiQuality;preview.dataset.mochiMotion=quality;$$('[data-mochi-quality]').forEach(b=>b.setAttribute('aria-pressed',String(b.dataset.mochiQuality===quality)));updateSlots();}
  else if(button.hasAttribute('data-mochi-apply')){try{const value=saveAppearance({equipment:draft,motion:quality});await onApply(value);saved=normalizeEquipment(draft);savedQuality=quality;status('ذخیره شد و روی کاراکتر ماریا اعمال شد.');updateSlots();}catch(err){status('ذخیره نشد: '+err.message);}}
  else if(button.hasAttribute('data-mochi-reset')){stop();draft=normalizeEquipment(saved);quality=savedQuality;preview.dataset.mochiMotion=quality;$$('[data-mochi-quality]').forEach(b=>b.setAttribute('aria-pressed',String(b.dataset.mochiQuality===quality)));applyMochiEquipment(preview,draft);status('ظاهر ذخیره‌شده بازگردانده شد.');render();updateSlots();}
  else if(button.hasAttribute('data-mochi-models'))onModels?.();
  else if(button.hasAttribute('data-mochi-motions'))onMotions?.();
  else if(button.hasAttribute('data-mochi-back'))onBack?.();
 };
 host.addEventListener('click',handle);
 $('[data-mochi-search]').oninput=e=>{filter=e.target.value.trim().toLowerCase();for(const node of $$('[data-search]'))node.hidden=!!filter&&!node.dataset.search.includes(filter);};
 const onKeys=e=>{const btn=e.target.closest('[data-mochi-tab]');if(!btn||!['ArrowLeft','ArrowRight','Home','End'].includes(e.key))return;e.preventDefault();const all=$$('[data-mochi-tab]'),idx=all.indexOf(btn),next=e.key==='Home'?0:e.key==='End'?all.length-1:(idx+(e.key==='ArrowLeft'?1:-1)+all.length)%all.length;all[next].click();all[next].focus();};
 host.addEventListener('keydown',onKeys);
 render();updateSlots();
 return {setState,stop,get playing(){return timeline.running;},destroy(){disposed=true;stop();clearInterval(liveTimer);thumbnailObserver?.disconnect();document.removeEventListener('visibilitychange',onVisibility);destroyMochi(preview);host.removeEventListener('click',handle);host.removeEventListener('keydown',onKeys);}};
}
