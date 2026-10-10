import './topIslandV4.css';
import { createSmartShortcutEditor } from './shortcutEditorV4.js';
import { IslandHoverController } from './islandHoverController.js';
import {taskForm,pinForm,reportForm} from './workflowFormsV4.js';

const $=(s,r=document)=>r.querySelector(s);
const $$=(s,r=document)=>[...r.querySelectorAll(s)];
const esc=v=>String(v??'').replace(/[&<>"']/g,c=>({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[c]));
const fmt=v=>{if(!v)return '—';try{return new Intl.DateTimeFormat('fa-IR',{dateStyle:'short',timeStyle:'short'}).format(new Date(v));}catch{return String(v)}};
const DEFAULT_EVIDENCE_ROOT='\\\\Alimohajeristee\\حسابداری\\share 1405\\pic\\New folder (2)';
const PREF_KEY='maria:top-island-v4:ui';

const I={
  home:'<svg viewBox="0 0 24 24"><path d="M4 11.5 12 4l8 7.5v8H15v-5H9v5H4z"/></svg>',
  chat:'<svg viewBox="0 0 24 24"><path d="M5 5h14v11H9l-4 3z"/></svg>',
  plus:'<svg viewBox="0 0 24 24"><path d="M12 5v14M5 12h14"/></svg>',
  pin:'<svg viewBox="0 0 24 24"><path d="M8 4h8l-1 6 3 3v2h-5v5l-1 1-1-1v-5H6v-2l3-3z"/></svg>',
  sound:'<svg viewBox="0 0 24 24"><path d="M5 10h4l4-4v12l-4-4H5z"/><path d="M16 9c1.5 1.5 1.5 4.5 0 6M18.5 6.5c3.2 3 3.2 8 0 11"/></svg>',
  gear:'<svg viewBox="0 0 24 24"><circle cx="12" cy="12" r="3"/><path d="M12 3v2M12 19v2M3 12h2M19 12h2M5.7 5.7 7 7M17 17l1.3 1.3M18.3 5.7 17 7M7 17l-1.3 1.3"/></svg>',
  close:'<svg viewBox="0 0 24 24"><path d="m7 7 10 10M17 7 7 17"/></svg>',
  launch:'<svg viewBox="0 0 24 24"><rect x="3.5" y="3.5" width="7" height="7" rx="1.5"/><rect x="13.5" y="3.5" width="7" height="7" rx="1.5"/><rect x="3.5" y="13.5" width="7" height="7" rx="1.5"/><rect x="13.5" y="13.5" width="7" height="7" rx="1.5"/></svg>',
  folder:'<svg viewBox="0 0 24 24"><path d="M3 6.5h6l2 2h9a1 1 0 0 1 1 1v9a1.5 1.5 0 0 1-1.5 1.5h-15A1.5 1.5 0 0 1 3 18.5z"/></svg>',
  copy:'<svg viewBox="0 0 24 24"><rect x="8" y="8" width="12" height="12" rx="2"/><path d="M16 8V5a2 2 0 0 0-2-2H5a2 2 0 0 0-2 2v9a2 2 0 0 0 2 2h3"/></svg>',
  edit:'<svg viewBox="0 0 24 24"><path d="M4 17.5 16.9 4.6a2 2 0 0 1 2.8 2.8L6.8 20.3 3 21z"/><path d="m14.7 6.8 2.8 2.8"/></svg>',
  trash:'<svg viewBox="0 0 24 24"><path d="M4.5 7h15M9 7V4h6v3M7 7l.7 13h8.6L17 7M10 11v6M14 11v6"/></svg>',
  report:'<svg viewBox="0 0 24 24"><rect x="5" y="3.5" width="14" height="17" rx="2"/><path d="M8.5 9h7M8.5 13h7M8.5 17H13"/></svg>',
  clock:'<svg viewBox="0 0 24 24"><circle cx="12" cy="12" r="8"/><path d="M12 8v5l3 2"/></svg>',
  reserved:'<svg viewBox="0 0 24 24"><path d="M12 5v14M5 12h14"/></svg>',
  refresh:'<svg viewBox="0 0 24 24"><path d="M20 11a8 8 0 1 0-2 5"/><path d="M20 5v6h-6"/></svg>',
  open:'<svg viewBox="0 0 24 24"><path d="M8 16 16 8M10 7h7v7"/><path d="M18 13v5a2 2 0 0 1-2 2H6a2 2 0 0 1-2-2V8a2 2 0 0 1 2-2h5"/></svg>',
  search:'<svg viewBox="0 0 24 24"><circle cx="11" cy="11" r="6"/><path d="m16 16 4 4"/></svg>',
  check:'<svg viewBox="0 0 24 24"><path d="m5 12 4 4 10-10"/></svg>',
  warn:'<svg viewBox="0 0 24 24"><path d="m12 4 9 16H3z"/><path d="M12 9v5M12 17v.1"/></svg>',
  eye:'<svg viewBox="0 0 24 24"><path d="M3 12s3-6 9-6 9 6 9 6-3 6-9 6-9-6-9-6z"/><circle cx="12" cy="12" r="2.5"/></svg>',
  truck:'<svg viewBox="0 0 24 24"><path d="M3 6h11v10H3zM14 10h4l3 3v3h-7z"/><circle cx="7" cy="18" r="2"/><circle cx="18" cy="18" r="2"/></svg>',
  link:'<svg viewBox="0 0 24 24"><path d="m10 13-2 2a3 3 0 0 1-4-4l3-3a3 3 0 0 1 4 0"/><path d="m14 11 2-2a3 3 0 0 1 4 4l-3 3a3 3 0 0 1-4 0"/><path d="m9 15 6-6"/></svg>',
  play:'<svg viewBox="0 0 24 24"><path d="m8 5 11 7-11 7z"/></svg>'
};

const PAGES=[
  {id:'home',label:'خانه',sub:'Agent Monitor',icon:I.home},
  {id:'shortcuts',label:'میان‌برها',sub:'Quick Launch',icon:I.launch},
  {id:'reports',label:'گزارش ثبت',sub:'Accounting Watch',icon:I.report},
  {id:'pins',label:'پین‌ها',sub:'Pinned',icon:I.pin},
  {id:'tasks',label:'یادآور و اجرا',sub:'Automations',icon:I.clock},
  {id:'reserved',label:'بخش بعدی',sub:'Reserved',icon:I.reserved}
];

function loadPrefs(){
  try{return {autoHideSeconds:60,collapseDelayMs:5000,pinned:false,sound:true,lastPage:'home',...(JSON.parse(localStorage.getItem(PREF_KEY)||'{}')||{})};}
  catch{return {autoHideSeconds:60,collapseDelayMs:5000,pinned:false,sound:true,lastPage:'home'};}
}
let prefs=loadPrefs();
let page=PAGES.some(x=>x.id===prefs.lastPage)?prefs.lastPage:'home';
let mode='compact';
let timer=null;
let hoverController=null;
let events=[];
let filter='all';
let audio=null;
let greetingTimer=null;
let shortcutIconObserver=null;
let nativeShortcutPickerOpen=false;
let workbarPinned=false;
let draggingIntoIsland=false;
let avatarVisibilityState={enabled:false,visible:false};

function savePrefs(patch){prefs={...prefs,...patch};try{localStorage.setItem(PREF_KEY,JSON.stringify(prefs));}catch{};syncChrome();}
function playTone(kind='tap'){
  if(!prefs.sound)return;
  try{
    audio=audio||new (window.AudioContext||window.webkitAudioContext)();
    const o=audio.createOscillator(),g=audio.createGain(),now=audio.currentTime;
    o.type='sine';o.frequency.value=kind==='ok'?760:kind==='warn'?380:520;
    g.gain.setValueAtTime(.0001,now);g.gain.exponentialRampToValueAtTime(.024,now+.008);g.gain.exponentialRampToValueAtTime(.0001,now+.08);
    o.connect(g);g.connect(audio.destination);o.start(now);o.stop(now+.09);
  }catch{}
}
function setMode(next){
  const requested=['peek','preview','compact','expanded'].includes(next)?next:'preview';
  const safe=requested==='compact'?'preview':prefs.pinned&&requested==='peek'?'preview':requested;
  if(mode===safe){syncChrome();return;}
  mode=safe;
  document.body.dataset.islandMode=mode;
  $('.maria-island-v4')?.setAttribute('data-mode',mode);
  window.blackClover?.setIslandMode?.(mode).catch(()=>{});
  syncChrome();
  armIdle();
}
function armIdle(){
  clearTimeout(timer);
  if(mode!=='peek')hoverController?.refresh();
}
function wake(){
  if(mode!=='peek'&&!hoverController?.inside)armIdle();
}
function protectedPanel(){
  return Boolean(workbarPinned||draggingIntoIsland||nativeShortcutPickerOpen||$('.v4-modal')||$('input:focus,textarea:focus,select:focus,[contenteditable="true"]:focus'));
}
function setPanelPinned(pinned){
  savePrefs({pinned:Boolean(pinned)});
  if(!pinned)armIdle();
}
function syncChrome(){
  const root=$('.maria-island-v4');
  root?.classList.toggle('is-pinned',Boolean(prefs.pinned));
  root?.classList.toggle('is-muted',!prefs.sound);
  $$('[data-page].v4-right-module').forEach(button=>{
    const active=mode==='expanded'&&button.dataset.page===page;
    button.classList.toggle('active',active);
    if(active)button.setAttribute('aria-current','page');
    else button.removeAttribute('aria-current');
  });
  $('[data-panel-pin]')?.classList.toggle('active',Boolean(prefs.pinned));
  $('[data-panel-sound]')?.classList.toggle('active',Boolean(prefs.sound));
  $('[data-panel-pin]')?.setAttribute('aria-pressed',String(Boolean(prefs.pinned)));
  $('[data-panel-sound]')?.setAttribute('aria-pressed',String(Boolean(prefs.sound)));
}
function setCharacter(state='idle'){
  $('.v4-character')?.setAttribute('data-state',state);
}
function greetCharacter(){
  const avatar=$('[data-character]');if(!avatar)return;
  if(['thinking','executing','error','offline'].includes(avatar.dataset.state))return;
  clearTimeout(greetingTimer);
  avatar.dataset.state='hello';
  greetingTimer=setTimeout(()=>{if(avatar.isConnected&&avatar.dataset.state==='hello')avatar.dataset.state='idle';},1850);
}
function readableEventValue(v){
  if(v===null||v===undefined)return '';
  if(typeof v==='string'||typeof v==='number'||typeof v==='boolean')return String(v);
  if(Array.isArray(v))return v.map(readableEventValue).filter(Boolean).slice(0,3).join(' • ');
  if(typeof v==='object'){
    for(const key of ['text','message','detail','title','label','name','state','mode','tool','action','kind']){const x=v[key];if(x!==undefined&&x!==v){const out=readableEventValue(x);if(out)return out;}}
    return '';
  }
  return '';
}
function pushEvent(e={}){
  const text=readableEventValue(e.text)||readableEventValue(e.detail)||readableEventValue(e.message)||readableEventValue(e.name)||readableEventValue(e.state)||readableEventValue(e)||'رویداد MARIA';
  const rawProgress=e.progress??e.percent??e.payload?.progress??e.payload?.percent;
  const progress=Number.isFinite(Number(rawProgress))?Math.max(0,Math.min(100,Number(rawProgress))):null;
  events.unshift({id:String(Date.now()+Math.random()),type:e.type||'event',state:readableEventValue(e.mode||e.state),text,at:new Date().toISOString(),progress,payload:e});
  events=events.slice(0,80);
  renderTopPills();
}
function renderTopPills(){
  const host=$('[data-live-pills]');if(!host)return;
  host.innerHTML=events.slice(0,3).map(e=>`<button class="v4-live-pill ${esc(e.type)}" title="${esc(e.text)}"><i></i><span>${esc(e.text)}</span></button>`).join('');
}
function pageMeta(){return PAGES.find(x=>x.id===page)||PAGES[0];}

function openModal({title,kicker='',body='',submit='ذخیره',onSubmit=null,wide=false}={}){
  $('.v4-modal')?.remove();
  const wrap=document.createElement('div');
  wrap.className='v4-modal';
  wrap.innerHTML=`<section class="v4-dialog ${wide?'wide':''}">
    <header><div><small>${esc(kicker)}</small><h3>${esc(title)}</h3></div><button type="button" data-modal-close>${I.close}</button></header>
    <form data-modal-form><div class="v4-dialog-body">${body}</div><footer><button type="button" data-modal-close>لغو</button>${onSubmit?`<button class="accent" type="submit">${esc(submit)}</button>`:''}</footer></form>
  </section>`;
  $('.maria-island-v4').append(wrap);
  $$('[data-modal-close]',wrap).forEach(x=>x.onclick=()=>wrap.remove());
  if(onSubmit)$('[data-modal-form]',wrap).onsubmit=async e=>{
    e.preventDefault();
    const b=e.submitter;if(b)b.disabled=true;
    try{const keep=await onSubmit(new FormData(e.currentTarget),wrap);if(keep!==false)wrap.remove();}
    catch(err){let box=$('.v4-error',wrap);if(!box){box=document.createElement('div');box.className='v4-error';$('.v4-dialog-body',wrap).prepend(box)}box.textContent=String(err?.message||err);}
    finally{if(b)b.disabled=false;}
  };
  requestAnimationFrame(()=>{wrap.classList.add('open');wrap.querySelector('input:not([type=radio]),textarea')?.focus();});
  return wrap;
}
const field=(label,control,help='')=>`<label class="v4-field"><span>${esc(label)}</span>${control}${help?`<small>${esc(help)}</small>`:''}</label>`;

function approvalCard(e){
  const p=e?.payload||e||{};
  const id=String(p.id||p.confirmationId||p.requestId||e?.id||'');
  return `<article class="v4-approval" data-approval-id="${esc(id)}">
    <div class="agent-avatar"><div class="mini-face"><i></i><i></i></div><b></b></div>
    <div class="approval-copy"><small>${esc(p.app||p.tool||p.source||'MARIA')}</small><b>${esc(e?.text||p.title||p.message||'در انتظار تأیید شما')}</b><span>${esc(p.detail||p.action||'این مرحله برای ادامه به اجازه شما نیاز دارد.')}</span><time data-approval-wait data-start="${Number(p.createdAt||Date.parse(e?.at||'')||Date.now())}">0:00</time></div>
    <div class="approval-actions"><button class="deny" data-approval-deny>${I.close}<span>Deny</span></button><button class="allow" data-approval-allow>${I.check}<span>Allow</span></button></div>
  </article>`;
}

async function renderHome(){
  const host=$('[data-page-body]');if(!host)return;
  const [status,tasks,reports,shortcuts,pins]=await Promise.all([
    window.blackClover.getStatus?.().catch(()=>null),
    window.blackClover.listReminders?.().catch(()=>[]),
    window.blackClover.accountingDashboard?.().catch(()=>[]),
    window.blackClover.listShortcuts?.().catch(()=>[]),
    window.blackClover.listPins?.().catch(()=>[])
  ]);
  const active=(tasks||[]).filter(x=>x.enabled!==false&&!x.paused).sort((a,b)=>new Date(a.dueAt)-new Date(b.dueAt));
  const next=active[0];
  const missing=(reports||[]).reduce((n,x)=>n+Number(x.result?.missing||0),0);
  const issues=(reports||[]).reduce((n,x)=>n+Number(x.result?.brokenLinks||0)+Number(x.result?.duplicateIdCount||0)+Number(x.result?.idMismatches||0),0);
  const pending=events.find(e=>['approval','confirmation','permission','confirm'].includes(String(e.type||'').toLowerCase())||e.payload?.requiresConfirmation===true);
  host.innerHTML=`
    <section class="v4-home-hero">
      <div class="v4-hero-character"><div class="mini-face"><i></i><i></i><b></b></div><span class="halo"></span></div>
      <div class="v4-hero-copy"><small>MARIA • LIVE AGENT MONITOR</small><h1>${esc(status?.detail||'Online • آماده')}</h1><p>مرکز زنده کارها، وضعیت‌ها، هشدارها و اجرای سریع.</p></div>
      <button class="v4-primary" data-open-chat>${I.chat}<span>چت با MARIA</span></button>
    </section>
    ${pending?approvalCard(pending):''}
    <section class="v4-stat-grid">
      <article><span class="violet">${I.clock}</span><div><small>وظیفه بعدی</small><b>${next?fmt(next.dueAt):'—'}</b></div></article>
      <article><span class="blue">${I.report}</span><div><small>ثبت‌نشده</small><b>${missing}</b></div></article>
      <article><span class="${issues?'amber':'green'}">${issues?I.warn:I.check}</span><div><small>نیاز به بررسی</small><b>${issues}</b></div></article>
    </section>
    <section class="v4-activity">
      <header><div><small>LIVE ACTIVITY</small><b>فعالیت MARIA</b></div><button data-home-refresh>${I.refresh}</button></header>
      <div class="v4-activity-list">${events.slice(0,7).map(e=>`<article><i class="${esc(e.type)}"></i><div><b>${esc(e.text)}</b><small>${fmt(e.at)}</small>${e.progress!==null?`<span class="event-progress"><em style="width:${e.progress}%"></em></span>`:''}</div></article>`).join('')||'<div class="v4-empty">هنوز رویداد زنده‌ای ثبت نشده.</div>'}</div>
    </section>
    <section class="v4-home-media" aria-label="کنترل رسانهٔ ویندوز">
      <header><b>پخش رسانه</b><small>Spotify • مرورگر • پخش‌کنندهٔ ویندوز</small></header>
      <div>
        <button type="button" data-media-command="previous" title="قبلی">⏮</button>
        <button type="button" data-media-command="play_pause" title="پخش یا توقف">⏯</button>
        <button type="button" data-media-command="next" title="بعدی">⏭</button>
        <button type="button" data-media-command="mute" title="قطع صدا">◖</button>
      </div>
    </section>
    <section class="v4-home-quick">
      <header><b>دسترسی سریع</b><small>موارد اخیر و مهم</small></header>
      <div class="v4-home-quick-items">
        ${(shortcuts||[]).slice(0,3).map(s=>`<button data-home-shortcut="${esc(s.id)}" title="${esc(s.target)}">${esc(s.label)}</button>`).join('')}
        ${(pins||[]).filter(p=>p.favorite).slice(0,2).map(p=>`<button data-home-module="pins">★ ${esc(p.title)}</button>`).join('')}
        <button data-home-module="tasks">یادآورها</button>
        <button data-home-module="reports">گزارش‌ها</button>
      </div>
    </section>`;
}
function shortcutCard(x){
  const target=String(x.target||'');
  const filename=target.split(/[\\/]/).pop()||'';
  const extension=x.kind==='url'?'':filename.includes('.')?filename.slice(filename.lastIndexOf('.')).toUpperCase():'';
  const kind={app:'برنامه',file:'فایل',folder:'پوشه',url:'وب‌سایت',media:'رسانه'}[x.kind]||String(x.kind||'میان‌بر');
  const details=kind+(extension?' • '+extension:'');
  const image=x.customIcon?`<img src="${esc(x.customIcon)}" alt="" loading="lazy">`:esc(x.icon||'◆');
  const isImage=x.kind!=='folder'&&/\.(png|jpe?g|gif|webp|bmp)$/i.test(target);
  return `<article class="v4-shortcut" data-shortcut-id="${esc(x.id)}" data-shortcut-kind="${esc(x.kind)}" data-shortcut-preview="${isImage?'image':'icon'}" title="${esc(target)}">
    <button type="button" data-shortcut-open title="باز کردن ${esc(x.label)}" aria-label="باز کردن ${esc(x.label)}">
      <span class="v4-app-icon" data-shortcut-icon="${esc(x.id)}">${image}</span>
      <span class="v4-shortcut-info"><b>${esc(x.label)}</b><small>${esc(details)}</small><span class="v4-shortcut-path" dir="auto" title="${esc(target)}">${esc(target)}</span></span>
    </button>
    ${x.pinned?'<span class="v4-shortcut-favorite" title="میان‌بر ثابت‌شده">★</span>':''}
    <button type="button" class="more" data-shortcut-edit title="گزینه‌های میان‌بر" aria-label="گزینه‌های ${esc(x.label)}">•••</button>
  </article>`;
}
function hydrateShortcutIcons(host){
  shortcutIconObserver?.disconnect();
  const elements=$$('[data-shortcut-icon]',host);
  const fetchIcon=async node=>{
    const id=node.dataset.shortcutIcon;
    if(!id||!window.blackClover.shortcutFileIcon)return;
    try{
      const data=await window.blackClover.shortcutFileIcon(id);
      if(!node.isConnected||!data||!data.startsWith('data:image/png;base64,'))return;
      const picture=document.createElement('img');
      picture.alt='';picture.src=data;picture.loading='lazy';
      node.replaceChildren(picture);
    }catch{/* Keep the built-in fallback icon. */}
  };
  if('IntersectionObserver' in window){
    shortcutIconObserver=new IntersectionObserver(entries=>{
      for(const entry of entries)if(entry.isIntersecting){
        shortcutIconObserver?.unobserve(entry.target);
        void fetchIcon(entry.target);
      }
    },{rootMargin:'120px'});
    for(const item of elements)shortcutIconObserver.observe(item);
  }else for(const item of elements)void fetchIcon(item);
}
async function renderShortcuts(){
  const host=$('[data-page-body]');if(!host)return;
  const items=await window.blackClover.listShortcuts().catch(()=>[]);
  host.innerHTML=`
    <header class="v4-page-head"><div><small>QUICK LAUNCH</small><h2>میان‌برها</h2><p>دو روش ساده: فایل را بکش و رها کن، یا روی + بزن و انتخاب کن.</p></div><button type="button" class="v4-head-add" data-context-add>${I.plus} افزودن میان‌بر</button></header>
    <div class="v4-toolbar"><label>${I.search}<input data-shortcut-search placeholder="جستجوی نام، نوع یا مسیر…" aria-label="جستجوی میانبر"></label><span>${items.length} میان‌بر</span></div>
    <div class="v4-shortcut-notice" data-shortcut-message role="status" aria-live="polite" hidden></div>
    ${items.length?`<div class="v4-shortcut-grid" data-shortcut-grid>${items.map(shortcutCard).join('')}</div>`:`<section class="v4-shortcut-empty"><span class="v4-shortcut-empty-icon">${I.launch}</span><h3>هنوز میان‌بری نداری</h3><p>فایل را از ویندوز بکش و رها کن، یا از + یک برنامه، پوشه یا لینک انتخاب کن.</p><button type="button" data-context-add>${I.plus} افزودن اولین میان‌بر</button></section>`}`;
  $('[data-shortcut-search]',host)?.addEventListener('input',e=>{
    const q=e.currentTarget.value.trim().toLowerCase();$$('.v4-shortcut',host).forEach(x=>x.hidden=q&&!x.textContent.toLowerCase().includes(q));
  });
  hydrateShortcutIcons(host);
}
function reportStatus(r){
  if(!r)return 'در انتظار';
  if(r.stale||r.status==='evidence_unavailable')return 'منبع قطع';
  if(r.status==='needs_configuration')return 'نیاز به تعریف';
  if((r.brokenLinks||0)>0)return 'لینک خراب';
  if((r.duplicateIdCount||0)>0)return 'شماره تکراری';
  if((r.idMismatches||0)>0)return 'عدم تطابق';
  if(r.complete)return 'کامل';
  if((r.missing||0)>0)return 'ناقص';
  return 'بررسی شد';
}
function rankReport(x){
  const r=x.result;
  if(x.monitor?.pinned)return 0;
  if(r?.stale||r?.status==='evidence_unavailable')return 1;
  if((r?.brokenLinks||0)||(r?.duplicateIdCount||0)||(r?.idMismatches||0))return 2;
  if((r?.missing||0)>0||r?.status==='needs_configuration')return 3;
  if(r?.complete)return 5;
  return 4;
}
function reportMatches(x){
  const r=x.result;
  if(filter==='all')return true;
  if(filter==='pinned')return x.monitor?.pinned;
  if(filter==='incomplete')return (r?.missing||0)>0||r?.status==='needs_configuration';
  if(filter==='issues')return (r?.brokenLinks||0)||(r?.duplicateIdCount||0)||(r?.idMismatches||0);
  if(filter==='complete')return r?.complete;
  return true;
}
function reportRow({monitor:m,result:r}){
  const transport=m.type==='transport';
  const photoOnly=transport&&r?.transportPhotoOnly;
  const completion=Number(r?.completion||0);
  const issues=Number(r?.brokenLinks||0)+Number(r?.duplicateIdCount||0)+Number(r?.idMismatches||0);
  return `<article class="v4-report ${r?.complete?'complete':''} ${r?.stale?'stale':''}" data-monitor="${esc(m.id)}">
    <button class="v4-star ${m.pinned?'on':''}" data-monitor-pin>${m.pinned?'★':'☆'}</button>
    <div class="identity"><b>${esc(r?.partyName||m.displayName||m.name||'Excel')}</b><small>${r?.invoiceNumber?`فاکتور ${esc(r.invoiceNumber)}`:transport?'باربری':'Excel'}</small></div>
    <div class="progress"><div><i style="width:${completion}%"></i></div><span>${photoOnly?`${Number(r?.photoCount||0)} تخلیه‌شده`:`${Number(r?.registered||0)} / ${Number(r?.total||0)} ثبت`}</span></div>
    <div class="metric"><b>${photoOnly?'—':Number(r?.missing||0)}</b><small>${photoOnly?'Photo count':'ثبت‌نشده'}</small></div>
    <div class="metric issue"><b>${issues}</b><small>خطا</small></div>
    <div class="time"><b>${esc(reportStatus(r))}</b><small>بررسی: ${fmt(r?.scannedAt)}</small><small>بازشدن: ${fmt(m.lastOpenedByMaria)}</small></div>
    <div class="actions"><button data-monitor-detail>${I.eye}</button><button class="open" data-monitor-open>${I.open}</button></div>
  </article>`;
}
async function renderReports(){
  const host=$('[data-page-body]');if(!host)return;
  const rows=(await window.blackClover.accountingDashboard().catch(()=>[])).sort((a,b)=>Number(a.monitor?.type==='transport')-Number(b.monitor?.type==='transport')||rankReport(a)-rankReport(b));
  const visible=rows.filter(reportMatches);
  const missing=rows.reduce((n,x)=>n+Number(x.result?.missing||0),0);
  const issues=rows.reduce((n,x)=>n+Number(x.result?.brokenLinks||0)+Number(x.result?.duplicateIdCount||0)+Number(x.result?.idMismatches||0),0);
  host.innerHTML=`
    <header class="v4-page-head"><div><small>ACCOUNTING WATCH</small><h2>گزارش ثبت</h2><p>حسابداری: پلاک C، مبلغ فیش D، تصویر H از ردیف ۱۴؛ باربری در انتهای فهرست.</p></div><button class="v4-head-add" data-context-add>＋ افزودن گزارش</button><button class="v4-soft" data-report-refresh>${I.refresh}<span>بررسی</span></button></header>
    <section class="v4-report-summary">
      <article><b>${rows.length}</b><small>فایل فعال</small></article>
      <article><b>${rows.filter(x=>x.result?.complete).length}</b><small>کامل</small></article>
      <article class="warn"><b>${missing}</b><small>ثبت‌نشده</small></article>
      <article class="bad"><b>${issues}</b><small>نیاز به بررسی</small></article>
    </section>
    <nav class="v4-filter">${[['all','همه'],['pinned','پین‌شده'],['incomplete','ناقص'],['issues','خطا'],['complete','کامل']].map(([id,l])=>`<button class="${filter===id?'active':''}" data-report-filter="${id}">${l}</button>`).join('')}</nav>
    <section class="v4-report-list">${visible.map(reportRow).join('')||'<div class="v4-empty">موردی نیست.</div>'}</section>
    <aside class="v4-detail" data-report-detail hidden></aside>`;
}
function pinCard(x){
  return `<article class="v4-pin-card" data-pin-id="${esc(x.id)}"><span class="kind">${esc(x.icon||'◆')}</span><div><small>${esc(x.type||'text')}</small><b>${esc(x.title||'پین')}</b><p>${esc(x.body||x.text||'')}</p></div><footer><button data-pin-favorite title="مهم">${x.favorite?'★':'☆'}</button><button data-pin-copy>کپی</button><button data-pin-edit>ویرایش</button></footer></article>`;
}
async function renderPins(){
  const host=$('[data-page-body]');if(!host)return;
  const items=await window.blackClover.listPins().catch(()=>[]);
  host.innerHTML=`
    <header class="v4-page-head"><div><small>PIN LIBRARY</small><h2>پین‌ها</h2><p>پیام، Prompt، لینک، فایل، گفتگو، پروژه و چیزهای مهم.</p></div><button class="v4-head-add" data-context-add>＋ افزودن پین</button></header>
    <div class="v4-toolbar"><label>${I.search}<input data-pin-search placeholder="جستجوی پین…"></label><span>${items.length} مورد</span></div>
    <section class="v4-pin-grid">${items.map(pinCard).join('')||'<div class="v4-empty">هنوز چیزی پین نشده.</div>'}</section>`;
  $('[data-pin-search]',host)?.addEventListener('input',e=>{const q=e.currentTarget.value.trim().toLowerCase();$$('.v4-pin-card',host).forEach(x=>x.hidden=q&&!x.textContent.toLowerCase().includes(q));});
}
function taskCard(x){
  const isAction=x.kind==='action';
  return `<article class="v4-task-card ${x.paused?'paused':''}" data-reminder-id="${esc(x.id)}">
    <span class="task-icon ${isAction?'action':'reminder'}">${isAction?I.play:I.clock}</span>
    <div><small>${isAction?'SCHEDULED ACTION':'REMINDER'}</small><b>${esc(x.title||x.label||x.message||x.instruction)}</b><p>${x.paused?'متوقف':fmt(x.dueAt)}${x.intervalMinutes?` • هر ${x.intervalMinutes} دقیقه`:''}</p>${x.lastResult?`<em class="${x.lastResult.ok?'ok':'bad'}">${esc(x.lastResult.text||'')}</em>`:''}</div>
    <footer>${isAction?'<button data-reminder-run>اجرا</button>':''}<button data-reminder-snooze="5">۵ دقیقه بعد</button><button data-reminder-edit>ویرایش</button><button ${x.paused?'data-reminder-resume':'data-reminder-pause'}>${x.paused?'ادامه':'توقف'}</button><button data-reminder-cancel>لغو</button></footer>
  </article>`;
}
async function renderTasks(){
  const host=$('[data-page-body]');if(!host)return;
  const items=(await window.blackClover.listReminders().catch(()=>[])).filter(x=>x.enabled!==false||Boolean(x.lastResult));
  host.innerHTML=`
    <header class="v4-page-head"><div><small>TASKS & AUTOMATIONS</small><h2>یادآور و اجرا</h2><p>فقط یادآوری یا اجرای واقعی از طریق Planner و Verify.</p></div><button class="v4-head-add" data-context-add>＋ افزودن یادآور</button></header>
    <div class="v4-workflow-count">${items.filter(x=>x.enabled!==false).length} کار فعال • ${items.filter(x=>x.kind==='action').length} عملیات</div>
    <section class="v4-task-list">${items.map(taskCard).join('')||'<div class="v4-empty">وظیفه فعالی نیست.</div>'}</section>`;
}
function renderReserved(){
  const host=$('[data-page-body]');if(!host)return;
  host.innerHTML='<section class="v4-reserved"><span>03</span><small>RESERVED MODULE</small><h2>این صفحه برای قابلیت بعدی آماده است</h2><p>بدون تغییر ساختار Top Island، قابلیت بعدی اینجا اضافه می‌شود.</p></section>';
}
function renderSettings(){
  const host=$('[data-page-body]');if(!host)return;
  host.innerHTML=`
    <header class="v4-page-head"><div><small>TOP ISLAND SETTINGS</small><h2>تنظیمات پنل</h2><p>فقط تنظیمات همین پنل بالای صفحه.</p></div></header>
    <section class="v4-settings">
      <button data-setting-pin><span>${I.pin}</span><div><b>پین پنل</b><small>${workbarPinned?'ثابت است؛ تا آزاد نکنی جمع نمی‌شود':'پنل را برای درگ و کار با فایل ثابت کن'}</small></div><i class="${workbarPinned?'on':''}"></i></button>
      <button data-setting-avatar aria-pressed="${avatarVisibilityState.enabled?'true':'false'}"><span>${I.eye}</span><div><b>کاراکتر بزرگ روی دسکتاپ</b><small>${avatarVisibilityState.enabled?'نمایش فعال است؛ برای پنهان‌کردن کلیک کن':'به‌صورت پیش‌فرض پنهان است؛ با کلیک نمایش بده'}</small></div><i class="${avatarVisibilityState.enabled?'on':''}"></i></button>
      <button data-setting-sound><span>${I.sound}</span><div><b>صدای پنل</b><small>مستقل از صدای Windows و MARIA Voice</small></div><i class="${prefs.sound?'on':''}"></i></button>
      <label><span>${I.clock}</span><div><b>جمع‌شدن خودکار</b><small>زمان بی‌استفاده‌ماندن قبل از کوچک‌شدن</small></div><select data-setting-collapse><option value="2000" ${prefs.collapseDelayMs===2000?'selected':''}>۲ ثانیه</option><option value="2800" ${prefs.collapseDelayMs===2800?'selected':''}>۳ ثانیه</option><option value="5000" ${prefs.collapseDelayMs===5000?'selected':''}>۵ ثانیه</option><option value="10000" ${prefs.collapseDelayMs===10000?'selected':''}>۱۰ ثانیه</option><option value="0" ${prefs.collapseDelayMs===0?'selected':''}>هرگز</option></select></label>
      <button data-full-settings><span>${I.gear}</span><div><b>تنظیمات کامل MARIA</b><small>Voice، مدل‌ها، سیستم و اتصال‌ها</small></div><strong>›</strong></button>
    </section>`;
}
async function renderPage(){
  $$('[data-page]').forEach(b=>b.classList.toggle('active',b.dataset.page===page));
  const title=$('[data-page-title]');if(title)title.textContent=page==='settings'?'تنظیمات پنل':pageMeta().label;
  savePrefs({lastPage:page==='settings'?prefs.lastPage:page});
  const body=$('[data-page-body]');body?.classList.add('switching');
  await new Promise(r=>setTimeout(r,40));
  if(page==='home')await renderHome();
  else if(page==='shortcuts')await renderShortcuts();
  else if(page==='reports')await renderReports();
  else if(page==='pins')await renderPins();
  else if(page==='tasks')await renderTasks();
  else if(page==='settings')renderSettings();
  else renderReserved();
  if(body)body.scrollTop=0;
  requestAnimationFrame(()=>body?.classList.remove('switching'));
}
function selectPage(id,{pin=false}={}){
  if(id!=='settings'&&!PAGES.some(x=>x.id===id))return;
  const unchanged=page===id&&mode==='expanded';
  if(pin)setPanelPinned(true);
  page=id;setMode('expanded');
  if(unchanged)return;
  playTone();renderPage();
}
let shortcutNoticeTimer=null;
function showShortcutNotice(message,{error=false}={}){
  const host=$('[data-page-body]');
  if(page!=='shortcuts'||!host)return;
  let notice=$('[data-shortcut-message]',host);
  if(!notice){
    notice=document.createElement('div');
    notice.className='v4-shortcut-notice';
    notice.dataset.shortcutMessage='';
    notice.setAttribute('role','status');
    host.querySelector('.v4-page-head')?.after(notice);
  }
  notice.textContent=String(message);
  notice.hidden=false;
  notice.classList.toggle('error',error);
  clearTimeout(shortcutNoticeTimer);
  shortcutNoticeTimer=setTimeout(()=>{if(notice.isConnected)notice.hidden=true;},5200);
}
function normalizeQuickShortcutInput(value){
  const raw=String(value||'').trim();
  // Paste a bare website like youtube.com without making the user type https://.
  if(/^(?:www\.)?[a-z0-9-]+(?:\.[a-z0-9-]+)*\.(?:com|org|net|io|dev|app|ir|co|tv|me|info|edu|gov|xyz|ai)(?:[/?#][^\s]*)?$/i.test(raw))return 'https://'+raw;
  return raw;
}
async function quickAddShortcut(input){
  if(!input)return {status:'cancelled'};
  const resolved=typeof input==='string'?await window.blackClover.resolveShortcut(normalizeQuickShortcutInput(input)):input;
  if(!resolved?.target)return {status:'cancelled'};
  const key=String(resolved.target).toLowerCase();
  const current=await window.blackClover.listShortcuts();
  const prior=current.find(x=>String(x.target).toLowerCase()===key);
  if(prior){
    await renderShortcuts();
    showShortcutNotice('«'+prior.label+'» قبلاً اضافه شده است.');
    return {status:'existing',item:prior};
  }
  try{
    const created=await window.blackClover.createShortcut({
      target:resolved.target,label:resolved.label,kind:resolved.kind,icon:resolved.icon
    });
    await renderShortcuts();
    showShortcutNotice('«'+created.label+'» اضافه شد. برای بازکردن، روی کارت کلیک کن.');
    const card=$$('[data-shortcut-id]').find(x=>x.dataset.shortcutId===created.id);
    card?.classList.add('just-added');
    return {status:'created',item:created};
  }catch(error){
    // The main process also guards against duplicates (including .lnk aliases).
    if(/قبلاً ثبت شده|already exists|duplicate/i.test(String(error?.message||error))){
      await renderShortcuts();
      showShortcutNotice('این میان‌بر قبلاً اضافه شده است.');
      return {status:'existing'};
    }
    showShortcutNotice(String(error?.message||error),{error:true});
    throw error;
  }
}
function openShortcutQuickMenu(){
  if(mode!=='expanded')setMode('expanded');
  const modal=openModal({
    title:'افزودن میان‌بر',kicker:'QUICK LAUNCH',
    body:`<p class="v4-shortcut-add-intro">فقط یکی از گزینه‌ها را انتخاب کن. نام، نوع و تصویر میان‌بر به‌صورت خودکار شناسایی می‌شود.</p>
      <div class="v4-shortcut-pick-actions">
        <button type="button" data-quick-pick="file">${I.launch}<b>فایل یا برنامه</b><small>Excel، PDF، عکس، ویدیو، EXE و…</small></button>
        <button type="button" data-quick-pick="folder">${I.folder||I.pin}<b>پوشه</b><small>یک پوشه از ویندوز انتخاب کن</small></button>
      </div>
      ${field('آدرس وب‌سایت یا مسیر فایل', '<input name="quick-target" dir="auto" placeholder="https://example.com یا C:\\\\..." autocomplete="off">','برای لینک یا مسیر دستی، آدرس را وارد کن و «افزودن» را بزن.')}
      <p class="v4-shortcut-safe">فقط یک میان‌بر ساخته می‌شود؛ فایل اصلی جابه‌جا، کپی یا حذف نمی‌شود.</p>
      <div class="v4-shortcut-add-error" data-quick-error role="alert" hidden></div>`,
    submit:'افزودن',
    onSubmit:async fd=>{
      const target=String(fd.get('quick-target')||'').trim();
      if(!target){modal.querySelector('[name="quick-target"]')?.focus();return false;}
      try{await quickAddShortcut(target);}
      catch(error){modal.querySelector('[data-quick-error]').textContent=String(error?.message||error);modal.querySelector('[data-quick-error]').hidden=false;return false;}
    }
  });
  for(const button of $$('[data-quick-pick]',modal)){
    button.onclick=async()=>{
      button.disabled=true;
      nativeShortcutPickerOpen=true;
      try{
        const chosen=await window.blackClover.pickShortcutTarget(button.dataset.quickPick);
        if(chosen){
          await quickAddShortcut(chosen);
          modal.remove();
        }
      }catch(error){
        const errorHost=$('[data-quick-error]',modal);
        if(errorHost){errorHost.textContent=String(error?.message||error);errorHost.hidden=false;}
      }finally{nativeShortcutPickerOpen=false;button.disabled=false;}
    };
  }
  return modal;
}
function contextAdd(){
  if(page==='shortcuts')return openShortcutQuickMenu();
  if(mode!=='expanded')setMode('expanded');
  if(page==='reports')return addAccounting();
  if(page==='pins')return editPin();
  if(page==='tasks')return editTask();
  openModal({title:'ایجاد سریع',kicker:'QUICK CREATE',body:'<div class="v4-quick-create"><button type="button" data-quick="shortcut">میان‌بر</button><button type="button" data-quick="report">Excel Watch</button><button type="button" data-quick="pin">پین</button><button type="button" data-quick="task">وظیفه</button></div>'});
}
function editShortcut(item=null,initialTarget=''){return createSmartShortcutEditor({openModal,field,esc,renderShortcuts},item,initialTarget);}
async function openShortcutOptions(id){
  const item=(await window.blackClover.listShortcuts()).find(x=>x.id===id);
  if(!item)return;
  const local=!['url','webapp'].includes(item.kind);
  const modal=openModal({
    title:item.label,kicker:'SHORTCUT OPTIONS',
    body:`<p class="v4-shortcut-options-path" dir="auto" title="${esc(item.target)}">${esc(item.target)}</p>
      <div class="v4-shortcut-option-grid">
        <button type="button" data-shortcut-action="open">${I.open}<span>بازکردن</span></button>
        <button type="button" data-shortcut-action="copy">${I.copy}<span>کپی مسیر یا لینک</span></button>
        ${local?`<button type="button" data-shortcut-action="reveal">${I.folder}<span>نمایش در پوشه</span></button>`:''}
        <button type="button" data-shortcut-action="favorite">${I.pin}<span>${item.pinned?'برداشتن از اول فهرست':'ثابت در بالای فهرست'}</span></button>
        <button type="button" data-shortcut-action="edit">${I.edit}<span>تغییر نام و جزئیات</span></button>
        <button type="button" data-shortcut-action="remove" class="danger">${I.trash}<span>حذف فقط میان‌بر</span></button>
      </div>
      <p class="v4-shortcut-safe">حذف یا ویرایش میان‌بر، فایل اصلی را حذف یا جابه‌جا نمی‌کند.</p>
      <div class="v4-shortcut-add-error" data-shortcut-options-error role="alert" hidden></div>`
  });
  for(const actionButton of $$('[data-shortcut-action]',modal)){
    actionButton.onclick=async()=>{
      const kind=actionButton.dataset.shortcutAction;
      if(kind==='remove'&&!confirm('فقط میان‌بر حذف شود؟ فایل اصلی دست‌نخورده می‌ماند.'))return;
      if(kind==='edit'){modal.remove();editShortcut(item);return;}
      actionButton.disabled=true;
      try{
        if(kind==='open')await window.blackClover.openShortcut(item.id);
        else if(kind==='copy')await window.blackClover.copyShortcutTarget(item.id);
        else if(kind==='reveal')await window.blackClover.revealShortcut(item.id);
        else if(kind==='favorite')await window.blackClover.updateShortcut(item.id,{pinned:!item.pinned});
        else if(kind==='remove')await window.blackClover.removeShortcut(item.id);
        modal.remove();
        if(['favorite','remove'].includes(kind))await renderShortcuts();
        if(kind==='copy')showShortcutNotice('مسیر یا لینک در کلیپ‌بورد کپی شد.');
        if(kind==='remove')showShortcutNotice('میان‌بر حذف شد؛ فایل اصلی محفوظ است.');
      }catch(error){
        const errorHost=$('[data-shortcut-options-error]',modal);
        if(errorHost){errorHost.textContent=String(error?.message||error);errorHost.hidden=false;}
      }finally{actionButton.disabled=false;}
    };
  }
  return modal;
}
function editPin(item=null){
  return pinForm({openModal,field,esc,bridge:window.blackClover,refresh:renderPins},item);
}
function editTask(item=null){
  return taskForm({openModal,field,esc,bridge:window.blackClover,refresh:renderTasks},item);
}
function addAccounting(){
  return reportForm({openModal,field,esc,bridge:window.blackClover,refresh:renderReports,defaultRoot:DEFAULT_EVIDENCE_ROOT});
}
async function showReportDetails(id){
  const rows=await window.blackClover.accountingDashboard();
  const x=rows.find(y=>y.monitor.id===id),host=$('[data-report-detail]');if(!x||!host)return;
  const {monitor:m,result:r}=x;host.hidden=false;
  host.innerHTML=`<header><div><small>ACCOUNTING DETAILS</small><b>${esc(r?.displayName||m.name||'Excel')}</b></div><button data-detail-close>${I.close}</button></header>
    <nav><button data-detail-config>تعریف سلول‌ها</button><button data-detail-refresh>${I.refresh} بررسی</button><button data-detail-open>${I.open} بازکردن</button></nav>
    <div class="v4-evidence-stats"><span>فایل مدرک <b>${Number(r?.evidenceSummary?.fileCount||0)}</b></span><span>شماره بعدی <b>${r?.evidenceSummary?.nextCandidate??'—'}</b></span><span>لینک خراب <b>${Number(r?.brokenLinks||0)}</b></span><span>تکراری <b>${Number(r?.duplicateIdCount||0)}</b></span></div>
    ${r?.stale?'<div class="v4-stale">منبع فعلاً در دسترس نیست؛ آخرین نتیجه معتبر حفظ شده است.</div>':''}
    <div class="v4-sheet-list">${(r?.sheets||[]).map(s=>`<section><h4>${esc(s.sheet)} <span>${m.type==='transport'?`${Number(s.validPhotoCount||s.registered||0)} تخلیه‌شده`:`${Number(s.registered||0)}/${Number(s.total||0)} ثبت`}</span></h4>${s.missingRows?.length?`<div class="v4-issues">${s.missingRows.slice(0,250).map(row=>`<article><b>ردیف ${row.row}</b><span>${esc(row.sourceSummary||'')}</span><em>${esc((row.issues||[]).map(i=>i.label||i.type).join('، ')||row.missing.join('، '))}</em></article>`).join('')}</div>`:'<p class="v4-good">همه موارد قابل بررسی کامل هستند.</p>'}</section>`).join('')||'<div class="v4-empty">هنوز Scan معتبر نداریم.</div>'}</div>`;
  $('[data-detail-close]',host).onclick=()=>host.hidden=true;
  $('[data-detail-open]',host).onclick=()=>window.blackClover.openAccountingMonitor(id);
  $('[data-detail-refresh]',host).onclick=async()=>{await window.blackClover.refreshAccountingReports({force:true});await renderReports();};
  $('[data-detail-config]',host).onclick=()=>editAccountingRules(m);
}
function editAccountingRules(m){
  const p=m.profile||{},receipt=(p.rules||[]).find(r=>r.type==='receipt')||{},plate=(p.rules||[]).find(r=>r.type==='plate')||{},generic=(p.evidence||[])[0]||{};
  openModal({
    title:'تعریف دقیق سلول‌ها',kicker:'CELL RULE WIZARD',wide:true,
    body:`<div class="v4-rule-note"><b>بدون حدس</b><span>ستون‌ها و Ruleها باید از فایل واقعی مشخص شوند. در اتصال محلی، انتخاب مستقیم Excel به همین Wizard اضافه می‌شود.</span></div>
      <div class="v4-fields-2">${field('ستون رکورد',`<input name="anchors" value="${esc((p.anchorColumns||['C']).join(','))}">`)}${field('شروع ردیف',`<input name="start" type="number" value="${Number(p.startRow||2)}">`)}</div>
      ${field('شیت‌ها',`<input name="sheets" value="${esc((p.sheets||[]).join(', '))}">`)}
      <section class="v4-rule"><header><span class="green">${I.check}</span><div><b>Rule عمومی</b><small>وقتی نوع خاص تشخیص داده نشد</small></div></header><div class="v4-fields-2">${field('ستون مدرک',`<input name="genericCols" value="${esc((generic.columns||[]).join(','))}" placeholder="H یا H,I">`)}${field('تعداد لازم',`<input name="genericRequired" type="number" min="1" max="4" value="${Number(generic.required||1)}">`)}</div></section>
      <section class="v4-rule receipt"><header><span class="amber">${I.link}</span><div><b>فیش</b><small>معمولاً یک عکس</small></div></header><div class="v4-fields-2">${field('ستون نوع',`<input name="receiptType" value="${esc(receipt.when?.column||'')}">`)}${field('متن تشخیص',`<input name="receiptKey" value="${esc(receipt.when?.includes||'')}" placeholder="فیش">`)}</div><div class="v4-fields-2">${field('ستون عکس',`<input name="receiptCols" value="${esc((receipt.evidence?.[0]?.columns||[]).join(','))}" placeholder="H">`)}${field('تعداد لازم',`<input name="receiptRequired" type="number" value="${Number(receipt.evidence?.[0]?.required||1)}">`)}</div></section>
      <section class="v4-rule plate"><header><span class="blue">${I.eye}</span><div><b>پلاک</b><small>می‌تواند دو عکس لازم داشته باشد</small></div></header><div class="v4-fields-2">${field('ستون نوع',`<input name="plateType" value="${esc(plate.when?.column||'')}">`)}${field('متن تشخیص',`<input name="plateKey" value="${esc(plate.when?.includes||'')}" placeholder="پلاک">`)}</div><div class="v4-fields-2">${field('ستون‌های عکس',`<input name="plateCols" value="${esc((plate.evidence?.[0]?.columns||[]).join(','))}" placeholder="H,I">`)}${field('تعداد لازم',`<input name="plateRequired" type="number" value="${Number(plate.evidence?.[0]?.required||2)}">`)}</div></section>
      <div class="v4-fields-2">${field('پوشه مدرک',`<input name="root" value="${esc(p.evidenceRoot||DEFAULT_EVIDENCE_ROOT)}">`)}${field('باربری',`<select name="transport"><option value="" ${!p.transportCountMode?'selected':''}>عادی</option><option value="photo_count" ${p.transportCountMode==='photo_count'?'selected':''}>هر عکس معتبر = تخلیه‌شده</option></select>`)}</div>`,
    onSubmit:async fd=>{
      const cols=v=>String(v||'').split(',').map(x=>x.trim().toUpperCase()).filter(Boolean),rules=[];
      const genericCols=cols(fd.get('genericCols'));
      const evidence=genericCols.length?[{label:'مدرک',columns:genericCols,required:Number(fd.get('genericRequired'))||1,mode:'verified_numeric_hyperlink'}]:[];
      const add=(type,label,tcol,key,ecount,required)=>{const cc=cols(ecount),tc=String(tcol||'').trim().toUpperCase(),kk=String(key||'').trim();if(tc&&kk&&cc.length)rules.push({type,recordType:type,when:{column:tc,includes:kk},evidence:[{label,columns:cc,required:Number(required)||1,mode:'verified_numeric_hyperlink'}]})};
      add('receipt','عکس فیش',fd.get('receiptType'),fd.get('receiptKey'),fd.get('receiptCols'),fd.get('receiptRequired'));
      add('plate','عکس پلاک',fd.get('plateType'),fd.get('plateKey'),fd.get('plateCols'),fd.get('plateRequired'));
      await window.blackClover.updateAccountingMonitor(m.id,{profile:{...p,startRow:Number(fd.get('start'))||2,dataStartRow:Number(fd.get('start'))||2,anchorColumns:cols(fd.get('anchors')).length?cols(fd.get('anchors')):['C'],sheets:String(fd.get('sheets')||'').split(',').map(x=>x.trim()).filter(Boolean),evidenceRoot:String(fd.get('root')||'').trim(),requireVerifiedAttachment:true,evidence,rules,transportCountMode:String(fd.get('transport')||'')}});
      await window.blackClover.rebuildAccountingWatchers();await window.blackClover.refreshAccountingReports({force:true});await renderReports();
    }
  });
}

function bindPageActions(){
  const body=$('[data-page-body]');
  body.addEventListener('click',async e=>{
    const shortcut=e.target.closest('[data-shortcut-id]');
    if(shortcut){
      const id=shortcut.dataset.shortcutId;
      if(e.target.closest('[data-shortcut-edit]')){await openShortcutOptions(id);}
      else if(e.target.closest('[data-shortcut-open]')){
        try{await window.blackClover.openShortcut(id);}
        catch(error){
          let status=$('[data-shortcut-message]',body);
          if(!status){
            status=document.createElement('p');status.className='v4-shortcut-message';
            status.dataset.shortcutMessage='';status.setAttribute('role','alert');
            body.querySelector('.v4-page-head')?.after(status);
          }
          status.textContent=String(error?.message||error);
        }
      }
      return;
    }
    const monitor=e.target.closest('[data-monitor]');
    if(monitor){
      const id=monitor.dataset.monitor;
      if(e.target.closest('[data-monitor-open]')){await window.blackClover.openAccountingMonitor(id);await renderReports();return;}
      if(e.target.closest('[data-monitor-detail]')){await showReportDetails(id);return;}
      if(e.target.closest('[data-monitor-pin]')){const x=(await window.blackClover.accountingDashboard()).find(y=>y.monitor.id===id);if(x)await window.blackClover.updateAccountingMonitor(id,{pinned:!x.monitor.pinned});await renderReports();return;}
    }
    const f=e.target.closest('[data-report-filter]')?.dataset.reportFilter;if(f){filter=f;await renderReports();return;}
    if(e.target.closest('[data-report-refresh]')){await window.blackClover.refreshAccountingReports({force:true});await renderReports();return;}
    const pin=e.target.closest('[data-pin-id]');
    if(pin){
      const id=pin.dataset.pinId,item=(await window.blackClover.listPins()).find(x=>x.id===id);
      if(e.target.closest('[data-pin-copy]')&&item){await navigator.clipboard.writeText(item.body||item.text||'');return;}
      if(e.target.closest('[data-pin-favorite]')&&item){await window.blackClover.updatePin({id,favorite:!item.favorite});await renderPins();return;}
      if(e.target.closest('[data-pin-edit]')&&item){editPin(item);return;}
    }
    const task=e.target.closest('[data-reminder-id]');
    if(task){
      const id=task.dataset.reminderId;
      try{
        if(e.target.closest('[data-reminder-run]'))await window.blackClover.runReminderNow(id);
        else if(e.target.closest('[data-reminder-snooze]'))await window.blackClover.snoozeReminder(id,5);
        else if(e.target.closest('[data-reminder-edit]')){
          const item=(await window.blackClover.listReminders()).find(x=>x.id===id);
          if(item)editTask(item);
          return;
        }
        else if(e.target.closest('[data-reminder-pause]'))await window.blackClover.pauseReminder(id);
        else if(e.target.closest('[data-reminder-resume]'))await window.blackClover.resumeReminder(id);
        else if(e.target.closest('[data-reminder-cancel]'))await window.blackClover.cancelReminder(id);
        else return;
        await renderTasks();
      }catch(error){pushEvent({type:'error',text:String(error?.message||error)});}
      return;
    }
    const approval=e.target.closest('[data-approval-id]');
    if(approval){
      const id=approval.dataset.approvalId;
      if(e.target.closest('[data-approval-allow]')){await window.blackClover.confirm?.(id,true);playTone('ok');approval.remove();return;}
      if(e.target.closest('[data-approval-deny]')){await window.blackClover.confirm?.(id,false);playTone('warn');approval.remove();return;}
    }
    const media=e.target.closest('[data-media-command]');
    if(media){
      media.disabled=true;
      try{await window.blackClover.mediaControl(media.dataset.mediaCommand);}
      catch(error){pushEvent({type:'warning',text:'کنترل رسانه: '+String(error.message||error)});}
      finally{media.disabled=false;}
      return;
    }
    const quickShortcut=e.target.closest('[data-home-shortcut]');
    if(quickShortcut){try{await window.blackClover.openShortcut(quickShortcut.dataset.homeShortcut);}catch(e){pushEvent({type:'error',text:String(e.message||e)});}return;}
    const quickModule=e.target.closest('[data-home-module]');
    if(quickModule){selectPage(quickModule.dataset.homeModule,{pin:true});return;}
    if(e.target.closest('[data-home-refresh]'))renderHome();
    if(e.target.closest('[data-open-chat]'))window.blackClover.showChat();
  });
}
function updateApprovalTimers(){for(const el of $$('[data-approval-wait]')){const start=Number(el.dataset.start)||Date.now(),sec=Math.max(0,Math.floor((Date.now()-start)/1000));el.textContent=`${Math.floor(sec/60)}:${String(sec%60).padStart(2,'0')}`;}}
function bindGlobalActions(){
  const moduleId=element=>element?.dataset.page||(element?.hasAttribute('data-settings')?'settings':element?.hasAttribute('data-home')?'home':null);
  const moduleSelector='[data-page],[data-settings],[data-home]';
  document.addEventListener('pointerover',e=>{
    const icon=e.target.closest('[data-page],[data-settings],[data-home],[data-context-add],[data-panel-sound],[data-open-chat]');
    if(!icon||icon.contains(e.relatedTarget))return;
    const character=$('[data-character]');if(!character)return;
    const center=icon.getBoundingClientRect().left+icon.getBoundingClientRect().width/2;
    character.dataset.waveSide=center<(window.innerWidth/2)?'left':'right';
    greetCharacter(); // A greeting never opens a module.
  });
  document.addEventListener('click',async e=>{
    const button=e.target.closest(moduleSelector);
    if(button){
      e.preventDefault();
      hoverController?.clickModule(moduleId(button));
      return;
    }
    if(e.target.closest('[data-workflow-lock]')){
      workbarPinned=!workbarPinned;
      const control=$('[data-workflow-lock]');
      if(control){
        control.setAttribute('aria-pressed',String(workbarPinned));
        control.textContent=workbarPinned?'📌 صفحه ثابت است':'📌 ثابت نگه دار';
        control.classList.toggle('active',workbarPinned);
      }
      hoverController?.refresh();
      return;
    }
    if(e.target.closest('[data-context-add]')){playTone();contextAdd();return;}
    if(e.target.closest('[data-panel-pin]')){const pin=hoverController?.togglePin();playTone(pin?'ok':'tap');return;}
    if(e.target.closest('[data-panel-sound]')){savePrefs({sound:!prefs.sound});if(prefs.sound)playTone('ok');return;}
    const quick=e.target.closest('[data-quick]')?.dataset.quick;
    if(quick){$('.v4-modal')?.remove();if(quick==='shortcut')editShortcut();else if(quick==='report')addAccounting();else if(quick==='pin')editPin();else editTask();return;}
    if(e.target.closest('[data-setting-pin]')){workbarPinned=!workbarPinned;renderSettings();hoverController?.refresh();return;}
    if(e.target.closest('[data-setting-sound]')){savePrefs({sound:!prefs.sound});if(prefs.sound)playTone('ok');renderSettings();return;}
    if(e.target.closest('[data-setting-avatar]')){
      try{avatarVisibilityState=await window.blackClover.setAvatarVisibility(!avatarVisibilityState.enabled);renderSettings();}
      catch(error){console.warn('Avatar visibility:',error);}
      return;
    }
    if(e.target.closest('[data-full-settings]'))window.blackClover.openSettings?.('general');
  });
  document.addEventListener('change',e=>{
    if(e.target.matches('[data-setting-collapse]')){
      savePrefs({collapseDelayMs:Number(e.target.value)});
      hoverController?.refresh();
    }
  });
  document.addEventListener('keydown',e=>{
    wake();
    if(e.key!=='Escape')return;
    if(workbarPinned){workbarPinned=false;$('[data-workflow-lock]')?.setAttribute('aria-pressed','false');}
    if($('.v4-modal')){$('.v4-modal').remove();hoverController?.refresh();return;}
    hoverController?.collapseNow();
  });
  document.addEventListener('pointermove',e=>{
    wake();
    const root=$('.maria-island-v4'),r=root?.getBoundingClientRect();if(!r)return;
    const face=$('[data-character]')?.getBoundingClientRect(),cx=face?face.left+face.width/2:r.left+r.width/2,cy=face?face.top+face.height/2:r.top+r.height/2;
    const x=Math.max(-1,Math.min(1,(e.clientX-cx)/Math.max(68,(face?.width||r.width)/1.2))),y=Math.max(-1,Math.min(1,(e.clientY-cy)/Math.max(52,(face?.height||r.height)/1.2)));
    root.style.setProperty('--look-x',`${(x*4.0).toFixed(1)}px`);
    root.style.setProperty('--look-y',`${(y*2.5).toFixed(1)}px`);
    root.style.setProperty('--head-x',`${(x*5.8).toFixed(1)}px`);
    root.style.setProperty('--head-y',`${(y*2.9).toFixed(1)}px`);
    root.style.setProperty('--head-tilt',`${(x*4).toFixed(1)}deg`);
    root.style.setProperty('--hand-x',`${(x*3.0).toFixed(1)}px`);
    root.style.setProperty('--hand-y',`${(y*2.0).toFixed(1)}px`);
  },{passive:true});
}

export async function mountTopIslandV4(){
  // Every fresh launch starts in mini, regardless of an old pinned session.
  prefs={...prefs,pinned:false,collapseDelayMs:5000};
  try{localStorage.setItem(PREF_KEY,JSON.stringify(prefs));}catch{}
  document.body.className='top-island-v4-surface';
  document.body.innerHTML=`<main class="maria-island-v4" data-mode="compact">
    <div class="v4-stars" aria-hidden="true"></div>
    <header class="v4-topbar">
      <nav class="v4-left-tools">
        <button data-home title="خانه">${I.home}</button>
        <button data-open-chat class="v4-chat-launch" title="باز کردن گفتگوی ماریا" aria-label="باز کردن چت با ماریا">${I.chat}</button>
        <button class="plus" data-context-add title="افزودن">${I.plus}</button>
      </nav>
      <section class="v4-center">
        <button class="v4-character" data-state="idle" data-character aria-label="باز کردن یا ثابت کردن MARIA"><i class="v4-arm left" aria-hidden="true"><i class="v4-limb"></i><i class="v4-palm"></i></i><span class="face"><i class="eye left"></i><i class="eye right"></i><i class="mouth"></i></span><i class="v4-arm right" aria-hidden="true"><i class="v4-limb"></i><i class="v4-palm"></i></i></button>
        <div class="v4-peek-dots"><i></i><i></i><i></i></div>
        <div class="v4-status"><small>MARIA</small><b data-status>Online • آماده</b></div>
        <div class="v4-live-pills" data-live-pills></div>
      </section>
      <nav class="v4-right-tools" aria-label="بخش‌ها و تنظیمات ماریا">
        ${PAGES.filter(x=>['shortcuts','pins','tasks','reports'].includes(x.id)).map(x=>`<button class="v4-right-module" type="button" data-page="${x.id}" aria-label="نمایش ${esc(x.label)}" title="${esc(x.label)}">${x.icon}</button>`).join('')}
        <button data-settings type="button" title="تنظیمات" aria-label="تنظیمات">${I.gear}</button>
        <button data-panel-sound type="button" title="صدای پنل" aria-label="صدای پنل">${I.sound}</button>
      </nav>
    </header>
    <section class="v4-preview" aria-label="نمای مستطیلی کاراکتر ماریا">
      <div class="v4-preview-aura" aria-hidden="true"></div>
    </section>
    <section class="v4-expanded">
      <section class="v4-page" data-page-body></section>
    </section>
    <div class="v4-drop" aria-live="polite"><b data-drop-title>فایل را رها کن</b><span data-drop-subtitle>Ask MARIA • Pin • Translate • Send • Convert</span></div>
  </main>`;

  const root=$('.maria-island-v4');
  const pinbar=document.createElement('div');
  pinbar.className='v4-workflow-lock';
  pinbar.innerHTML='<button type="button" data-workflow-lock aria-pressed="false" title="برای نگه‌داشتن صفحه هنگام درگ و انتخاب فایل">📌 ثابت نگه دار</button>';
  $('.v4-expanded')?.append(pinbar);
  hoverController?.destroy();
  hoverController=new IslandHoverController({
    getMode:()=>mode,
    getPinned:()=>prefs.pinned,
    setPinned:setPanelPinned,
    setMode,
    selectModule:(id,pin)=>selectPage(id,{pin}),
    isProtected:protectedPanel,
    getCollapseDelay:()=>Math.max(0,Number(prefs.collapseDelayMs)||0)
  });
  $$('[data-open-chat]').forEach(b=>b.onclick=()=>{playTone();void window.blackClover.showChat().catch(console.warn);});
  $('[data-character]').onclick=e=>{e.stopPropagation();workbarPinned=false;hoverController.clickCharacter();};
  $('[data-character]').addEventListener('pointerenter',greetCharacter);
  // A resize can synthesize mouseenter: require pointer movement before opening preview.
  root.addEventListener('pointermove',()=>{
    if(!hoverController.inside){hoverController.enter();greetCharacter();}
    else hoverController.activity();
  },{passive:true});
  root.addEventListener('mouseleave',()=>{
    if(draggingIntoIsland||workbarPinned)return;
    hoverController.leave();
    for(const [prop,value] of [['--look-x','0px'],['--look-y','0px'],['--head-x','0px'],['--head-y','0px'],['--head-tilt','0deg'],['--hand-x','0px'],['--hand-y','0px']])root.style.setProperty(prop,value);
  });
  root.addEventListener('click',e=>{
    if(e.target.closest('button,a,input,textarea,select,label,form,[contenteditable],.v4-modal,.v4-expanded'))return;
    if(mode==='peek'||mode==='preview')hoverController.pinPreview();
  });
  for(const ev of ['dragenter','dragover'])root.addEventListener(ev,e=>{
    draggingIntoIsland=true;hoverController?.activity();
    if(e.target.closest('.v4-modal'))return;
    e.preventDefault();
    root.classList.add('drop-active');
    if(page==='shortcuts'){
      $('[data-drop-title]')?.replaceChildren(document.createTextNode('رها کن تا میان‌بر ساخته شود'));
      $('[data-drop-subtitle]')?.replaceChildren(document.createTextNode('برنامه، فایل، پوشه یا لینک • بدون تغییر فایل اصلی'));
    }else{
      $('[data-drop-title]')?.replaceChildren(document.createTextNode('فایل را رها کن'));
      $('[data-drop-subtitle]')?.replaceChildren(document.createTextNode('Ask MARIA • Pin • Translate • Send • Convert'));
    }
  });
  root.addEventListener('dragleave',e=>{if(!root.contains(e.relatedTarget)){draggingIntoIsland=false;root.classList.remove('drop-active');}});
  root.addEventListener('drop',e=>{
    if(e.target.closest('.v4-modal'))return;
    e.preventDefault();draggingIntoIsland=false;root.classList.remove('drop-active');
    const file=e.dataTransfer?.files?.[0];
    const location=file?window.blackClover.getDroppedFilePath(file):'';
    const url=e.dataTransfer?.getData('text/uri-list')||e.dataTransfer?.getData('text/plain')||'';
    if(page==='shortcuts'){
      const files=[...(e.dataTransfer?.files||[])].slice(0,16);
      const targets=files.map(f=>window.blackClover.getDroppedFilePath(f)).filter(Boolean);
      const link=String(url||'').split(/[\r\n]/).find(s=>/^https?:\/\//i.test(s.trim()))?.trim();
      if(!targets.length&&link)targets.push(link);
      if(!targets.length){
        showShortcutNotice('فایل، پوشه یا لینک معتبر را رها کن.',{error:true});
        return;
      }
      // Add multiple real OS files sequentially; one invalid item must not drop the rest.
      void (async()=>{
        let added=0,already=0,failed=0;
        for(const target of targets){
          try{
            const result=await quickAddShortcut(target);
            if(result.status==='created')added++;
            else if(result.status==='existing')already++;
          }catch{failed++;}
        }
        showShortcutNotice(
          added?`${added} میان‌بر اضافه شد${already?` • ${already} مورد تکراری`:''}${failed?` • ${failed} خطا`:''}.`:
          already&&!failed?'این میان‌برها قبلاً وجود دارند.':'فایل قابل‌افزودن نبود.',
          {error:failed>0&&!added}
        );
      })();
      return;
    }
    if(location)openModal({title:'فایل دریافت شد',kicker:'CONTEXT DROP',body:'<div class="v4-drop-choice"><b>'+esc(file.name)+'</b><p>برای ساخت میان‌بر وارد بخش میان‌برها شو و فایل را رها کن.</p></div>'});
  });

  bindPageActions();bindGlobalActions();
  avatarVisibilityState=await window.blackClover.avatarVisibility?.().catch(()=>({enabled:false,visible:false}))||{enabled:false,visible:false};
  window.blackClover.onIslandRequestMini?.(()=>{workbarPinned=false;hoverController?.collapseNow();});
  window.blackClover.onIslandWindowBlur?.(()=>{
    // A click in another application releases the floating panel.
    // Dialogs and native pickers are protected from accidental closure.
    if(!workbarPinned&&!draggingIntoIsland&&!$('.v4-modal')&&!nativeShortcutPickerOpen&&mode!=='peek')hoverController?.collapseNow();
  });
  window.blackClover.onEvent?.(e=>{
    if(e?.type==='ui-state'){
      const status=e.detail||e.mode||'MARIA';
      $('[data-status]').textContent=status;
      if($('[data-preview-status]'))$('[data-preview-status]').textContent=status;
      setCharacter(e.mode==='working'?'thinking':e.mode==='error'?'error':e.mode==='offline'?'offline':'idle');
      pushEvent(e);
    }
    else if(e?.type==='avatar-visibility-changed'){
      avatarVisibilityState={enabled:Boolean(e.enabled),visible:Boolean(e.enabled)};
      if(page==='settings'&&mode==='expanded')renderSettings();
    }
    else if(e?.type==='thinking'){setCharacter('thinking');pushEvent(e);}
    else if(e?.type==='tool'){setCharacter('executing');pushEvent(e);}
    else if(e?.type==='scheduled-action'||e?.type==='reminder'){pushEvent(e);if(page==='tasks')renderTasks();}
    else if(e?.type==='accounting-report-updated'){pushEvent({type:'accounting',text:'گزارش حسابداری بروزرسانی شد'});if(page==='reports')renderReports();}
    else if(e?.type==='accounting-watch-unavailable'){pushEvent({type:'warning',text:'مسیر حسابداری در دسترس نیست'});}
    else if(e?.type==='data-changed'){if(e.store==='shortcuts'&&page==='shortcuts')renderShortcuts();if(e.store==='pins'&&page==='pins')renderPins();if(e.store==='reminders'&&page==='tasks')renderTasks();if(e.store==='accounting'&&page==='reports')renderReports();}
    else {pushEvent(e);if(page==='home'&&(['approval','confirmation','permission','confirm'].includes(String(e?.type||'').toLowerCase())||e?.requiresConfirmation===true))renderHome();}
  });
  window.blackClover.onIslandModule?.(payload=>selectPage(String(payload?.module||payload||'home'),{pin:true}));
  syncChrome();renderTopPills();await renderPage();updateApprovalTimers();setInterval(updateApprovalTimers,1000);setMode('peek');
}
