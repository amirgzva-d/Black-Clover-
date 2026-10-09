import './topIsland.css';

const esc=s=>String(s??'').replace(/[&<>"']/g,c=>({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[c]));
const fmt=v=>{if(!v)return '—';try{return new Intl.DateTimeFormat('fa-IR',{dateStyle:'short',timeStyle:'short'}).format(new Date(v));}catch{return String(v)}};
const $=(s,r=document)=>r.querySelector(s), $$=(s,r=document)=>[...r.querySelectorAll(s)];
const DEFAULT_EVIDENCE_ROOT='\\\\Alimohajeristee\\حسابداری\\share 1405\\pic\\New folder (2)';
const ICON={
  home:'<svg viewBox="0 0 24 24" aria-hidden="true"><path d="M4 11.4 12 4l8 7.4v8.1a.9.9 0 0 1-.9.9h-4.5v-5.6H9.4v5.6H4.9a.9.9 0 0 1-.9-.9z"/></svg>',
  launch:'<svg viewBox="0 0 24 24" aria-hidden="true"><path d="M8 16 16 8M10 7h7v7"/><path d="M18 13v5a2 2 0 0 1-2 2H6a2 2 0 0 1-2-2V8a2 2 0 0 1 2-2h5"/></svg>',
  report:'<svg viewBox="0 0 24 24" aria-hidden="true"><path d="M6 3h9l4 4v14H6z"/><path d="M15 3v5h5M9 12h7M9 16h7"/></svg>',
  pin:'<svg viewBox="0 0 24 24" aria-hidden="true"><path d="m9 4 6 0 1 6 3 3v2h-6v5l-1 1-1-1v-5H5v-2l3-3z"/></svg>',
  clock:'<svg viewBox="0 0 24 24" aria-hidden="true"><circle cx="12" cy="12" r="8"/><path d="M12 8v5l3 2"/></svg>',
  reserve:'<svg viewBox="0 0 24 24" aria-hidden="true"><path d="M12 5v14M5 12h14"/></svg>',
  chat:'<svg viewBox="0 0 24 24" aria-hidden="true"><path d="M5 5h14v11H9l-4 3z"/></svg>',
  plus:'<svg viewBox="0 0 24 24" aria-hidden="true"><path d="M12 5v14M5 12h14"/></svg>',
  panelPin:'<svg viewBox="0 0 24 24" aria-hidden="true"><path d="m8 4 8 0-1 6 3 3v2h-5v5l-1 1-1-1v-5H6v-2l3-3z"/></svg>',
  sound:'<svg viewBox="0 0 24 24" aria-hidden="true"><path d="M5 10h4l4-4v12l-4-4H5z"/><path d="M16 9c1.5 1.6 1.5 4.4 0 6M18.5 6.5c3.2 3.1 3.2 7.9 0 11"/></svg>',
  settings:'<svg viewBox="0 0 24 24" aria-hidden="true"><circle cx="12" cy="12" r="3"/><path d="M12 3v2M12 19v2M3 12h2M19 12h2M5.6 5.6 7 7M17 17l1.4 1.4M18.4 5.6 17 7M7 17l-1.4 1.4"/></svg>',
  collapse:'<svg viewBox="0 0 24 24" aria-hidden="true"><path d="m7 10 5 5 5-5"/></svg>'
};
const MODULES=[
  {id:'home',label:'خانه',icon:ICON.home,sub:'Agent Monitor'},
  {id:'shortcuts',label:'میان‌برها',icon:ICON.launch,sub:'Quick Launch'},
  {id:'reports',label:'گزارش ثبت',icon:ICON.report,sub:'Accounting Watch'},
  {id:'pins',label:'پین‌ها',icon:ICON.pin,sub:'Pinned Items'},
  {id:'tasks',label:'یادآور و اجرا',icon:ICON.clock,sub:'Tasks & Automations'},
  {id:'slot4',label:'بخش بعدی',icon:ICON.reserve,sub:'Reserved'}
];

const PREF_KEY='maria:top-island:v3';
function loadPrefs(){
  try{return {autoHideSeconds:60,panelPinned:false,soundMuted:false,lastPage:'home',...(JSON.parse(localStorage.getItem(PREF_KEY)||'{}')||{})};}
  catch{return {autoHideSeconds:60,panelPinned:false,soundMuted:false,lastPage:'home'};}
}
let prefs=loadPrefs();
let mode='compact',moduleId=MODULES.some(x=>x.id===prefs.lastPage)?prefs.lastPage:'home',events=[],idleTimer=null,reportFilter='all',audioCtx=null;

function savePrefs(patch={}){
  prefs={...prefs,...patch};
  try{localStorage.setItem(PREF_KEY,JSON.stringify(prefs));}catch{}
  syncHeaderState();
}
function setMode(next){
  const safe=['peek','compact','expanded'].includes(next)?next:'compact';
  if(prefs.panelPinned&&safe==='peek')next=mode==='expanded'?'expanded':'compact';else next=safe;
  mode=next;
  document.body.dataset.islandMode=mode;
  $('.top-island')?.setAttribute('data-mode',mode);
  window.blackClover?.setIslandMode?.(mode).catch(()=>{});
  syncHeaderState();
  armIdle();
}
function armIdle(){
  clearTimeout(idleTimer);
  if(prefs.panelPinned)return;
  if(Number(prefs.autoHideSeconds)===0)return;
  const delay=Math.max(15,Number(prefs.autoHideSeconds)||60)*1000;
  idleTimer=setTimeout(()=>{
    if($('.hub-overlay')||$('input:focus,textarea:focus,select:focus,button:focus-visible')){armIdle();return;}
    setMode('peek');
  },delay);
}
function wake(){if(mode==='peek')setMode('compact');armIdle();}
function syncHeaderState(){
  const root=$('.top-island');
  root?.classList.toggle('panel-pinned',Boolean(prefs.panelPinned));
  root?.classList.toggle('panel-muted',Boolean(prefs.soundMuted));
  $('[data-panel-pin]')?.classList.toggle('active',Boolean(prefs.panelPinned));
  $('[data-panel-sound]')?.classList.toggle('active',!prefs.soundMuted);
  $('[data-panel-pin]')?.setAttribute('aria-pressed',String(Boolean(prefs.panelPinned)));
  $('[data-panel-sound]')?.setAttribute('aria-pressed',String(!prefs.soundMuted));
}
function playIslandTone(kind='tap'){
  if(prefs.soundMuted)return;
  try{
    audioCtx=audioCtx||new (window.AudioContext||window.webkitAudioContext)();
    const osc=audioCtx.createOscillator(),gain=audioCtx.createGain(),now=audioCtx.currentTime;
    const freq=kind==='success'?720:kind==='warning'?360:520;
    osc.type='sine';osc.frequency.setValueAtTime(freq,now);
    gain.gain.setValueAtTime(.0001,now);gain.gain.exponentialRampToValueAtTime(.028,now+.008);gain.gain.exponentialRampToValueAtTime(.0001,now+.085);
    osc.connect(gain);gain.connect(audioCtx.destination);osc.start(now);osc.stop(now+.09);
  }catch{}
}
function setCharacterState(state='online'){$('.island-character')?.setAttribute('data-state',state)}
function pushEvent(e={}){
  const text=e.detail||e.message||e.text||e.name||e.mode||e.state||'رویداد MARIA';
  events.unshift({id:crypto.randomUUID?.()||String(Date.now()+Math.random()),at:new Date().toISOString(),type:e.type||'event',text:String(text),mode:e.mode||''});
  events=events.slice(0,50);
  renderLivePills();
}
function renderLivePills(){
  const host=$('[data-live-pills]');if(!host)return;
  const important=events.slice(0,4);
  host.innerHTML=important.map(e=>`<button class="live-pill ${esc(e.mode||e.type)}" title="${esc(e.text)}"><i></i><span>${esc(e.text)}</span></button>`).join('');
}

function openOverlay({title,subtitle='',body='',submitText='ذخیره',onSubmit=null,wide=false}={}){
  $('.hub-overlay')?.remove();
  const overlay=document.createElement('div');
  overlay.className='hub-overlay';
  overlay.innerHTML=`<section class="hub-dialog ${wide?'wide':''}"><header><div><small>${esc(subtitle)}</small><h3>${esc(title)}</h3></div><button type="button" data-dialog-close>×</button></header><form data-dialog-form><div class="dialog-body">${body}</div><footer><button type="button" class="ghost" data-dialog-close>لغو</button>${onSubmit?`<button class="primary" type="submit">${esc(submitText)}</button>`:''}</footer></form></section>`;
  $('.top-island').append(overlay);
  $$('[data-dialog-close]',overlay).forEach(b=>b.onclick=()=>overlay.remove());
  if(onSubmit){
    $('[data-dialog-form]',overlay).onsubmit=async e=>{
      e.preventDefault();
      const submit=e.submitter; if(submit)submit.disabled=true;
      try{const keep=await onSubmit(new FormData(e.currentTarget),overlay);if(keep!==false)overlay.remove();}
      catch(error){showInlineError(overlay,error?.message||error);}
      finally{if(submit)submit.disabled=false;}
    };
  }
  requestAnimationFrame(()=>overlay.classList.add('open'));
  return overlay;
}
function showInlineError(root,message){
  let el=$('.dialog-error',root);
  if(!el){el=document.createElement('div');el.className='dialog-error';$('.dialog-body',root)?.prepend(el);}
  el.textContent=String(message||'خطا');
}
const field=(label,input,help='')=>`<label class="field"><span>${esc(label)}</span>${input}${help?`<small>${esc(help)}</small>`:''}</label>`;

async function renderHome(){
  const host=$('[data-module-body]');if(!host)return;
  const [status,reminders,reports]=await Promise.all([
    window.blackClover.getStatus?.().catch(()=>null),
    window.blackClover.listReminders?.().catch(()=>[]),
    window.blackClover.accountingDashboard?.().catch(()=>[])
  ]);
  const active=events.slice(0,6);
  const next=(reminders||[]).filter(x=>x.enabled!==false&&!x.paused).sort((a,b)=>new Date(a.dueAt)-new Date(b.dueAt))[0];
  const incomplete=(reports||[]).filter(x=>(x.result?.missing||0)>0||x.result?.status==='needs_configuration').length;
  const blocked=(reports||[]).filter(x=>x.result?.stale||(x.result?.brokenLinks||0)||(x.result?.duplicateIdCount||0)||(x.result?.idMismatches||0)).length;
  host.innerHTML=`
    <div class="module-head home-head">
      <div><small>MARIA AGENT MONITOR</small><h2>خانه</h2><p>وضعیت زنده MARIA، کارهای در حال اجرا و هشدارهای مهم.</p></div>
      <button class="primary-btn" data-home-chat>✦ چت با MARIA</button>
    </div>
    <div class="home-grid">
      <article class="hero-status"><span class="hero-orb"></span><div><small>CORE STATUS</small><b>${esc(status?.state||status?.status||'Online • آماده')}</b><p>${esc(status?.detail||'Planner و Skillها آماده دریافت دستور هستند.')}</p></div></article>
      <article class="mini-stat"><span>◷</span><div><b>${next?fmt(next.dueAt):'—'}</b><small>وظیفه بعدی</small></div></article>
      <article class="mini-stat"><span>▦</span><div><b>${incomplete}</b><small>فایل حسابداری ناقص</small></div></article>
      <article class="mini-stat ${blocked?'warn':''}"><span>!</span><div><b>${blocked}</b><small>نیاز به بررسی</small></div></article>
    </div>
    <div class="activity-board">
      <div class="board-head"><div><b>فعالیت زنده</b><small>${active.length} رویداد اخیر</small></div><button data-home-refresh>↻</button></div>
      <div class="activity-list">${active.map(e=>`<article><i class="${esc(e.mode||e.type)}"></i><div><b>${esc(e.text)}</b><small>${fmt(e.at)}</small></div></article>`).join('')||'<div class="empty">فعلاً رویداد فعالی نیست.</div>'}</div>
    </div>`;
}

async function renderShortcuts(){
  const host=$('[data-module-body]');if(!host)return;
  const items=await window.blackClover.listShortcuts().catch(()=>[]);
  host.innerHTML=`
    <div class="module-head">
      <div><small>FAST ACCESS</small><h2>میان‌برها</h2><p>فایل، پوشه، برنامه، سایت، رسانه، پروژه یا Routine را سریع باز کن.</p></div>
      <button class="primary-btn" data-add-shortcut>＋ افزودن میان‌بر</button>
    </div>
    <div class="module-toolbar">
      <div class="search-box">⌕ <input data-shortcut-search placeholder="جستجو…"></div>
      <span>${items.length} مورد</span>
    </div>
    <div class="shortcut-strip" data-shortcut-strip>
      ${items.slice(0,8).map(x=>shortcutCard(x,false)).join('')||'<div class="empty wide">هنوز میان‌بری اضافه نشده.</div>'}
    </div>
    ${items.length>8?`<button class="view-all" data-view-all>دیدن همه • ${items.length}</button>`:''}
    <div class="shortcut-grid" data-shortcut-grid>
      ${items.map(x=>shortcutCard(x,true)).join('')}
    </div>`;
  const q=$('[data-shortcut-search]',host);
  q?.addEventListener('input',()=>{
    const value=q.value.trim().toLowerCase();
    $$('.shortcut-card',host).forEach(card=>card.hidden=value&&!card.textContent.toLowerCase().includes(value));
  });
  const strip=$('[data-shortcut-strip]',host);
  strip?.addEventListener('wheel',e=>{if(Math.abs(e.deltaY)>Math.abs(e.deltaX)){e.preventDefault();strip.scrollLeft+=e.deltaY;}},{passive:false});
}
function shortcutCard(x,grid){
  return `<article class="shortcut-card ${grid?'grid':''}" data-shortcut-id="${esc(x.id)}">
    <button class="shortcut-run" data-shortcut-open title="${esc(x.target)}">
      <span class="shortcut-icon">${x.customIcon?`<img src="${esc(x.customIcon)}" alt="">`:esc(x.icon||'◆')}</span>
      <span class="shortcut-copy"><b>${esc(x.label)}</b><small>${esc(x.kind||x.targetType||'auto')}${x.hotkey?` • ${esc(x.hotkey)}`:''}</small></span>
      <i class="health ${esc(x.health||'unknown')}"></i>
    </button>
    ${grid?'<button class="shortcut-more" data-shortcut-edit title="ویرایش">•••</button>':''}
  </article>`;
}
function shortcutEditor(item=null){
  const overlay=openOverlay({
    title:item?'ویرایش میان‌بر':'میان‌بر جدید',
    subtitle:'QUICK LAUNCH',
    body:`
      <div class="field-grid">
        ${field('عنوان',`<input name="label" value="${esc(item?.label||'')}" required>`)}
        ${field('نوع',`<select name="kind">${['auto','app','file','folder','url','media','project','routine','workspace','conversation','command'].map(k=>`<option value="${k}" ${item?.kind===k?'selected':''}>${k}</option>`).join('')}</select>`)}
      </div>
      ${field('مسیر / URL / فرمان',`<input name="target" value="${esc(item?.target||'')}" required>`)}
      <div class="field-grid">
        ${field('آیکون',`<input name="icon" value="${esc(item?.icon||'◆')}" placeholder="◆">`)}
        ${field('گروه',`<input name="group" value="${esc(item?.group||'')}" placeholder="کار، شخصی…">`)}
      </div>
      <div class="field-grid">
        ${field('کلید میانبر',`<input name="hotkey" value="${esc(item?.hotkey||'')}" placeholder="مثلاً Ctrl+Alt+1">`,'فعال‌سازی Global Hotkey هنگام اتصال محلی Verify می‌شود.')}
        ${field('حالت بازکردن',`<select name="openMode"><option value="default">پیش‌فرض</option><option value="new-window" ${item?.openMode==='new-window'?'selected':''}>پنجره جدید</option><option value="background" ${item?.openMode==='background'?'selected':''}>پس‌زمینه</option></select>`)}
      </div>
      <label class="check-row"><input type="checkbox" name="pinned" ${item?.pinned?'checked':''}> در اولویت نمایش باشد</label>
      ${item?`<button type="button" class="danger-link" data-delete-shortcut="${esc(item.id)}">حذف میان‌بر</button>`:''}
    `,
    onSubmit:async fd=>{
      const payload={label:fd.get('label'),kind:fd.get('kind'),target:fd.get('target'),icon:fd.get('icon'),group:fd.get('group'),hotkey:fd.get('hotkey'),openMode:fd.get('openMode'),pinned:fd.get('pinned')==='on'};
      if(item)await window.blackClover.updateShortcut(item.id,payload);else await window.blackClover.createShortcut(payload);
      await renderShortcuts();
    }
  });
  if(item)$('[data-delete-shortcut]',overlay)?.addEventListener('click',async()=>{
    if(!confirm(`میان‌بر «${item.label}» حذف شود؟`))return;
    await window.blackClover.removeShortcut(item.id);
    overlay.remove();
    await renderShortcuts();
  });
  return overlay;
}

function statusText(r){
  if(!r)return 'در انتظار بررسی';
  if(r.stale||r.status==='evidence_unavailable')return 'Share / منبع در دسترس نیست';
  if(r.status==='needs_configuration')return 'نیاز به تعریف سلول';
  if((r.brokenLinks||0)>0)return 'لینک خراب';
  if((r.duplicateIdCount||0)>0)return 'شماره تکراری';
  if((r.idMismatches||0)>0)return 'شماره با فایل نمی‌خواند';
  if(r.complete)return 'کامل';
  if((r.missing||0)>0)return 'ناقص';
  return r.status==='ok'?'بررسی شد':String(r.status||'نامشخص');
}
function reportRank(entry){
  if(entry.monitor?.pinned)return 0;
  const r=entry.result;
  if(r?.stale||r?.status==='evidence_unavailable')return 1;
  if((r?.brokenLinks||0)||(r?.duplicateIdCount||0)||(r?.idMismatches||0))return 2;
  if((r?.missing||0)>0||r?.status==='needs_configuration')return 3;
  if(r?.complete)return 5;
  return 4;
}
function reportVisible(entry){
  const r=entry.result;
  if(reportFilter==='all')return true;
  if(reportFilter==='pinned')return Boolean(entry.monitor?.pinned);
  if(reportFilter==='incomplete')return Boolean((r?.missing||0)>0||r?.status==='needs_configuration');
  if(reportFilter==='broken')return Boolean((r?.brokenLinks||0)||(r?.duplicateIdCount||0)||(r?.idMismatches||0));
  if(reportFilter==='complete')return Boolean(r?.complete);
  if(reportFilter==='stale')return Boolean(r?.stale||r?.status==='evidence_unavailable');
  return true;
}
async function renderReports(){
  const host=$('[data-module-body]');if(!host)return;
  const rows=(await window.blackClover.accountingDashboard().catch(()=>[])).sort((a,b)=>reportRank(a)-reportRank(b));
  const visible=rows.filter(reportVisible);
  const totalMissing=rows.reduce((n,x)=>n+Number(x.result?.missing||0),0);
  const errors=rows.reduce((n,x)=>n+Number(x.result?.brokenLinks||0)+Number(x.result?.duplicateIdCount||0)+Number(x.result?.idMismatches||0),0);
  host.innerHTML=`
    <div class="module-head">
      <div><small>ACCOUNTING WATCH</small><h2>گزارش ثبت</h2><p>کنترل عکس/فیش/پلاک و فایل‌های باربری با Verify لینک و فایل واقعی.</p></div>
      <div class="head-actions"><button class="soft-btn" data-report-refresh>↻ بررسی</button><button class="primary-btn" data-report-add>＋ فایل Excel</button></div>
    </div>
    <div class="report-summary">
      <span><b>${rows.length}</b><small>فایل فعال</small></span>
      <span><b>${rows.filter(x=>x.result?.complete).length}</b><small>کامل</small></span>
      <span class="warn"><b>${totalMissing}</b><small>ناقص</small></span>
      <span class="bad"><b>${errors}</b><small>نیاز به بررسی</small></span>
    </div>
    <div class="filter-row">
      ${[['all','همه'],['pinned','پین‌شده'],['incomplete','ناقص'],['broken','خطا/لینک'],['complete','کامل'],['stale','Share قطع']].map(([id,label])=>`<button data-report-filter="${id}" class="${reportFilter===id?'active':''}">${label}</button>`).join('')}
    </div>
    <div class="report-list">
      ${visible.map(({monitor:m,result:r})=>reportRow(m,r)).join('')||'<div class="empty">موردی با این فیلتر نیست.</div>'}
    </div>
    <div class="report-detail" data-report-detail hidden></div>`;
}
function reportRow(m,r){
  const transport=m.type==='transport';
  const photoOnly=transport&&r?.transportPhotoOnly;
  const total=Number(r?.total||0),done=Number(r?.registered||0),missing=Number(r?.missing||0);
  const completion=Number(r?.completion||0);
  return `<article class="report-row ${r?.complete?'complete':''} ${r?.stale?'stale':''}" data-monitor="${esc(m.id)}">
    <button class="star ${m.pinned?'active':''}" data-monitor-pin title="پین">${m.pinned?'★':'☆'}</button>
    <div class="report-identity"><b>${esc(r?.partyName||m.displayName||m.name||'Excel')}</b><small>${r?.invoiceNumber?'فاکتور '+esc(r.invoiceNumber):transport?'باربری':'Excel'}</small></div>
    <div class="report-progress">
      <div class="meter"><i style="width:${completion}%"></i></div>
      <span>${photoOnly?`${Number(r?.photoCount||0)} تخلیه‌شده`:`${done} / ${total} ثبت`}</span>
    </div>
    <div class="report-metric warn"><b>${photoOnly?'—':missing}</b><small>${photoOnly?'بدون کل تعریف‌شده':'ثبت‌نشده'}</small></div>
    <div class="report-metric bad"><b>${Number(r?.brokenLinks||0)+Number(r?.duplicateIdCount||0)+Number(r?.idMismatches||0)}</b><small>خطا</small></div>
    <div class="report-time"><b>${esc(statusText(r))}</b><small>بازشدن: ${fmt(m.lastOpenedByMaria)}</small><small>بررسی: ${fmt(r?.scannedAt)}</small></div>
    <div class="report-actions"><button data-monitor-detail>جزئیات</button><button class="open" data-monitor-open>بازکردن</button></div>
  </article>`;
}
function accountingEditor(){
  return openOverlay({
    title:'افزودن فایل حسابداری',
    subtitle:'ACCOUNTING PROFILE',
    wide:true,
    body:`
      ${field('مسیر کامل فایل Excel','<input name="path" required placeholder="\\\\server\\...\\file.xlsx">')}
      <div class="field-grid">
        ${field('اسم نمایشی','<input name="name" placeholder="مثلاً اسماعیل زاده 112">')}
        ${field('نوع',`<select name="type"><option value="invoice">فاکتور / حسابداری</option><option value="transport">باربری</option></select>`)}
      </div>
      ${field('پوشه عکس/مدرک',`<input name="evidenceRoot" value="${esc(DEFAULT_EVIDENCE_ROOT)}">`,'در اجرای محلی وجود مسیر و دسترسی شبکه Verify می‌شود.')}
      <div class="field-grid">
        ${field('شروع ردیف','<input name="startRow" type="number" min="1" value="2">')}
        ${field('ستون تشخیص رکورد','<input name="anchorColumns" value="C" placeholder="C">')}
      </div>
      ${field('شیت‌ها (اختیاری)','<input name="sheets" placeholder="مثلاً باربری همتی, اظهار">','اگر خالی باشد همه شیت‌ها بررسی می‌شوند.')}
      <div class="config-note"><b>تعریف H / I را فعلاً Hard-code نمی‌کنیم.</b><span>بعد از آنلاین شدن سیستم، با Wizard و انتخاب مستقیم سلول/ستون در Excel تعیین می‌کنی کدام رکورد یک عکس یا دو عکس لازم دارد. تا آن زمان فایل با وضعیت «نیاز به تعریف سلول» نمایش داده می‌شود.</span></div>
      <label class="check-row"><input type="checkbox" name="pinned" checked> بالای لیست پین شود</label>
    `,
    onSubmit:async fd=>{
      const type=String(fd.get('type')||'invoice');
      const sheets=String(fd.get('sheets')||'').split(',').map(x=>x.trim()).filter(Boolean);
      await window.blackClover.createAccountingMonitor({
        name:String(fd.get('name')||'').trim(),
        path:String(fd.get('path')||'').trim(),
        type,
        pinned:fd.get('pinned')==='on',
        profile:{
          startRow:Number(fd.get('startRow'))||2,
          dataStartRow:Number(fd.get('startRow'))||2,
          anchorColumns:String(fd.get('anchorColumns')||'C').split(',').map(x=>x.trim().toUpperCase()).filter(Boolean),
          sheets,
          evidenceRoot:String(fd.get('evidenceRoot')||'').trim(),
          requireVerifiedAttachment:true,
          transportCountMode:type==='transport'?'photo_count':'',
          evidence:[]
        }
      });
      await window.blackClover.rebuildAccountingWatchers();
      await renderReports();
    }
  });
}
async function showReportDetails(id){
  const rows=await window.blackClover.accountingDashboard();
  const entry=rows.find(x=>x.monitor.id===id),detail=$('[data-report-detail]');
  if(!entry||!detail)return;
  const {monitor:m,result:r}=entry;
  detail.hidden=false;
  detail.innerHTML=`
    <div class="detail-head"><div><small>ACCOUNTING DETAILS</small><b>${esc(r?.displayName||m.name)}</b></div><button data-detail-close>×</button></div>
    <div class="detail-actions"><button data-detail-configure>تعریف سلول‌ها</button><button data-detail-refresh>↻ بررسی دوباره</button><button data-detail-open>بازکردن Excel</button></div>
    <div class="evidence-summary">
      <span>فایل مدرک <b>${Number(r?.evidenceSummary?.fileCount||0)}</b></span>
      <span>بیشترین شماره <b>${r?.evidenceSummary?.maxNumericId??'—'}</b></span>
      <span>شماره بعدی <b>${r?.evidenceSummary?.nextCandidate??'—'}</b></span>
      <span>لینک خراب <b>${Number(r?.brokenLinks||0)}</b></span>
      <span>شماره تکراری <b>${Number(r?.duplicateIdCount||0)}</b></span>
      <span>عدم تطابق <b>${Number(r?.idMismatches||0)}</b></span>
    </div>
    ${r?.stale?`<div class="stale-banner">منبع فعلاً در دسترس نیست؛ آخرین نتیجه معتبر حفظ شده است.</div>`:''}
    <div class="sheet-details">
      ${(r?.sheets||[]).map(s=>`<section><h4>${esc(s.sheet)} <span>${m.type==='transport'?`${Number(s.validPhotoCount||s.registered||0)} تخلیه‌شده`:`${Number(s.registered||0)}/${Number(s.total||0)} ثبت`}</span></h4>
      ${s.missingRows?.length?`<div class="issue-list">${s.missingRows.slice(0,250).map(row=>`<article><b>ردیف ${row.row}</b><span>${esc(row.sourceSummary||'')}</span><em>${esc((row.issues||[]).map(i=>i.label||i.type).join('، ')||row.missing.join('، '))}</em></article>`).join('')}</div>`:'<p class="all-good">همه موارد قابل بررسی این شیت کامل هستند.</p>'}</section>`).join('')||'<div class="empty">هنوز Scan معتبر نداریم.</div>'}
    </div>`;
  $('[data-detail-close]',detail).onclick=()=>detail.hidden=true;
  $('[data-detail-open]',detail).onclick=()=>window.blackClover.openAccountingMonitor(id);
  $('[data-detail-refresh]',detail).onclick=async()=>{await window.blackClover.refreshAccountingReports({force:true});await renderReports();};
  $('[data-detail-configure]',detail).onclick=()=>openCellDefinition(m);
}
function openCellDefinition(m){
  const p=m.profile||{};
  const receiptRule=(p.rules||[]).find(r=>r.type==='receipt')||{};
  const plateRule=(p.rules||[]).find(r=>r.type==='plate')||{};
  const generic=(p.evidence||[])[0]||{};
  openOverlay({
    title:'تعریف دقیق سلول‌های بررسی',
    subtitle:'ACCOUNTING CELL RULE WIZARD',
    wide:true,
    body:`
      <div class="config-note"><b>مرحله آنلاین: انتخاب مستقیم از Excel</b><span>وقتی سیستم در دسترس باشد، همین Wizard از Selection واقعی Excel می‌گیرد: ستون رکورد، ستون نوع، عکس ۱، عکس ۲ و شیت‌ها. هیچ ستون ناشناخته‌ای خودکار حدس زده نمی‌شود.</span></div>
      <div class="field-grid">
        ${field('ستون رکورد',`<input name="anchors" value="${esc((p.anchorColumns||['C']).join(','))}" placeholder="C">`)}
        ${field('شروع ردیف',`<input name="startRow" type="number" min="1" value="${Number(p.startRow||2)}">`)}
      </div>
      ${field('شیت‌های مورد بررسی',`<input name="sheets" value="${esc((p.sheets||[]).join(', '))}" placeholder="مثلاً همتی, اظهار">`,'خالی = همه شیت‌ها؛ برای باربری فقط شیت‌های انتخاب‌شده را وارد کن.')}
      <div class="rule-block">
        <header><b>Rule عمومی</b><small>اگر نوع رکورد تشخیص داده نشد</small></header>
        <div class="field-grid">
          ${field('ستون/ستون‌های مدرک',`<input name="genericEvidence" value="${esc((generic.columns||[]).join(','))}" placeholder="مثلاً H یا H,I">`)}
          ${field('تعداد لازم',`<input name="genericRequired" type="number" min="1" max="4" value="${Number(generic.required||1)}">`)}
        </div>
      </div>
      <div class="rule-block receipt">
        <header><b>فیش</b><small>معمولاً یک عکس</small></header>
        <div class="field-grid">
          ${field('ستون تشخیص نوع',`<input name="receiptTypeColumn" value="${esc(receiptRule.when?.column||'')}" placeholder="مثلاً D">`)}
          ${field('متن تشخیص فیش',`<input name="receiptKeyword" value="${esc(receiptRule.when?.includes||'')}" placeholder="مثلاً فیش">`)}
        </div>
        <div class="field-grid">
          ${field('ستون مدرک فیش',`<input name="receiptEvidence" value="${esc((receiptRule.evidence?.[0]?.columns||[]).join(','))}" placeholder="مثلاً H">`)}
          ${field('تعداد عکس لازم',`<input name="receiptRequired" type="number" min="1" max="4" value="${Number(receiptRule.evidence?.[0]?.required||1)}">`)}
        </div>
      </div>
      <div class="rule-block plate">
        <header><b>پلاک</b><small>می‌تواند دو عکس لازم داشته باشد</small></header>
        <div class="field-grid">
          ${field('ستون تشخیص نوع',`<input name="plateTypeColumn" value="${esc(plateRule.when?.column||'')}" placeholder="مثلاً D">`)}
          ${field('متن تشخیص پلاک',`<input name="plateKeyword" value="${esc(plateRule.when?.includes||'')}" placeholder="مثلاً پلاک">`)}
        </div>
        <div class="field-grid">
          ${field('ستون‌های عکس پلاک',`<input name="plateEvidence" value="${esc((plateRule.evidence?.[0]?.columns||[]).join(','))}" placeholder="مثلاً H,I">`)}
          ${field('تعداد عکس لازم',`<input name="plateRequired" type="number" min="1" max="4" value="${Number(plateRule.evidence?.[0]?.required||2)}">`)}
        </div>
      </div>
      <div class="field-grid">
        ${field('پوشه مدرک',`<input name="evidenceRoot" value="${esc(p.evidenceRoot||DEFAULT_EVIDENCE_ROOT)}">`)}
        ${field('حالت شمارش باربری',`<select name="transportCountMode"><option value="" ${!p.transportCountMode?'selected':''}>عادی</option><option value="photo_count" ${p.transportCountMode==='photo_count'?'selected':''}>هر عکس معتبر = تخلیه‌شده</option></select>`)}
      </div>
      <div class="config-note"><b>ثبت فقط با Verify واقعی</b><span>پر بودن H/I کافی نیست: شماره باید معتبر باشد، Hyperlink وجود داشته باشد، فایل مقصد واقعاً باشد و شماره با فایل تطبیق کند. برای پلاک ۱/۲ به‌صورت «ناقص» نمایش داده می‌شود.</span></div>
    `,
    onSubmit:async fd=>{
      const cols=value=>String(value||'').split(',').map(x=>x.trim().toUpperCase()).filter(Boolean);
      const genericCols=cols(fd.get('genericEvidence'));
      const evidence=genericCols.length?[{label:'مدرک',columns:genericCols,required:Number(fd.get('genericRequired'))||1,mode:'verified_numeric_hyperlink'}]:[];
      const rules=[];
      const addRule=(type,label,column,keyword,evidenceCols,required)=>{
        const ec=cols(evidenceCols),col=String(column||'').trim().toUpperCase(),key=String(keyword||'').trim();
        if(!col||!key||!ec.length)return;
        rules.push({type,recordType:type,when:{column:col,includes:key},evidence:[{label,columns:ec,required:Number(required)||1,mode:'verified_numeric_hyperlink'}]});
      };
      addRule('receipt','عکس فیش',fd.get('receiptTypeColumn'),fd.get('receiptKeyword'),fd.get('receiptEvidence'),fd.get('receiptRequired'));
      addRule('plate','عکس پلاک',fd.get('plateTypeColumn'),fd.get('plateKeyword'),fd.get('plateEvidence'),fd.get('plateRequired'));
      const sheets=String(fd.get('sheets')||'').split(',').map(x=>x.trim()).filter(Boolean);
      await window.blackClover.updateAccountingMonitor(m.id,{profile:{
        ...p,
        startRow:Number(fd.get('startRow'))||2,
        dataStartRow:Number(fd.get('startRow'))||2,
        anchorColumns:cols(fd.get('anchors')).length?cols(fd.get('anchors')):['C'],
        sheets,
        evidenceRoot:String(fd.get('evidenceRoot')||'').trim(),
        requireVerifiedAttachment:true,
        evidence,
        rules,
        transportCountMode:String(fd.get('transportCountMode')||'')
      }});
      await window.blackClover.rebuildAccountingWatchers();
      await window.blackClover.refreshAccountingReports({force:true});
      await renderReports();
    }
  });
}

async function renderPins(){
  const host=$('[data-module-body]');if(!host)return;
  const pins=await window.blackClover.listPins().catch(()=>[]);
  host.innerHTML=`
    <div class="module-head">
      <div><small>PIN LIBRARY</small><h2>پین‌ها</h2><p>پیام، لینک، فایل، متن، گفتگو، پروژه و چیزهای مهم را یک‌جا نگه دار.</p></div>
      <button class="primary-btn" data-add-pin>＋ پین جدید</button>
    </div>
    <div class="module-toolbar"><div class="search-box">⌕ <input data-pin-search placeholder="جستجوی پین…"></div><span>${pins.length} مورد</span></div>
    <div class="board-list pin-grid">${pins.map(pinCard).join('')||'<div class="empty wide">هنوز چیزی پین نشده.</div>'}</div>`;
  const q=$('[data-pin-search]',host);
  q?.addEventListener('input',()=>{const v=q.value.trim().toLowerCase();$$('.pin-card',host).forEach(x=>x.hidden=v&&!x.textContent.toLowerCase().includes(v));});
}
async function renderTasks(){
  const host=$('[data-module-body]');if(!host)return;
  const reminders=await window.blackClover.listReminders().catch(()=>[]);
  const active=reminders.filter(x=>x.enabled!==false),actions=active.filter(x=>x.kind==='action').length;
  host.innerHTML=`
    <div class="module-head">
      <div><small>TASKS & AUTOMATIONS</small><h2>یادآور و اجرا</h2><p>فقط یادآوری، اجرای واقعی در زمان مشخص، یا Workflow شرطی از طریق Planner.</p></div>
      <button class="primary-btn" data-add-automation>＋ ایجاد وظیفه</button>
    </div>
    <div class="task-summary"><span><b>${active.length}</b><small>فعال</small></span><span><b>${actions}</b><small>اجرای خودکار</small></span><span><b>${active.filter(x=>x.paused).length}</b><small>Pause</small></span></div>
    <div class="board-list">${active.map(automationCard).join('')||'<div class="empty">برنامه فعالی نیست.</div>'}</div>`;
}
function pinCard(x){return `<article class="pin-card" data-pin-id="${esc(x.id)}"><span class="pin-type">${esc(x.icon||'◆')}</span><div><b>${esc(x.title||'پین')}</b><small>${esc(x.type||'text')} • ${fmt(x.updatedAt)}</small><p>${esc(x.body||x.text||'')}</p></div><div><button data-pin-copy>کپی</button><button data-pin-edit>•••</button></div></article>`;}
function automationCard(x){return `<article class="automation-card ${x.paused?'paused':''}" data-reminder-id="${esc(x.id)}"><span class="auto-kind ${x.kind==='action'?'execute':'notify'}">${x.kind==='action'?'▶':'◷'}</span><div><b>${esc(x.title||x.label||x.message||x.instruction)}</b><small>${x.kind==='action'?'خودش انجام بده':'فقط یادآوری'} • ${x.paused?'متوقف':fmt(x.dueAt)}${x.intervalMinutes?` • هر ${x.intervalMinutes} دقیقه`:''}</small>${x.lastResult?`<p class="${x.lastResult.ok?'ok':'bad'}">${esc(x.lastResult.text||'')}</p>`:''}</div><div class="auto-actions"><button ${x.paused?'data-reminder-resume':'data-reminder-pause'}>${x.paused?'ادامه':'Pause'}</button><button data-reminder-cancel>لغو</button></div></article>`;}
function pinEditor(item=null){
  const overlay=openOverlay({
    title:item?'ویرایش پین':'پین جدید',
    subtitle:'UNIVERSAL PIN',
    body:`
      <div class="field-grid">${field('عنوان',`<input name="title" value="${esc(item?.title||'')}">`)}${field('نوع',`<select name="type">${['text','prompt','url','file','folder','message','conversation','routine','project','workspace','note'].map(t=>`<option ${item?.type===t?'selected':''} value="${t}">${t}</option>`).join('')}</select>`)}</div>
      ${field('محتوا / مرجع',`<textarea name="body" rows="5" required>${esc(item?.body||item?.text||'')}</textarea>`)}
      <div class="field-grid">${field('تگ‌ها',`<input name="tags" value="${esc((item?.tags||[]).join(', '))}">`)}${field('گروه',`<input name="group" value="${esc(item?.group||'')}">`)}</div>
      ${item?`<button type="button" class="danger-link" data-delete-pin="${esc(item.id)}">حذف پین</button>`:''}
    `,
    onSubmit:async fd=>{
      const payload={id:item?.id,title:fd.get('title'),type:fd.get('type'),body:fd.get('body'),text:fd.get('body'),tags:String(fd.get('tags')||'').split(',').map(x=>x.trim()).filter(Boolean),group:fd.get('group'),pinned:true};
      if(item)await window.blackClover.updatePin(payload);else await window.blackClover.createPin(payload);
      await renderPins();
    }
  });
  if(item)$('[data-delete-pin]',overlay)?.addEventListener('click',async()=>{
    if(!confirm(`پین «${item.title||'این مورد'}» حذف شود؟`))return;
    await window.blackClover.removePin(item.id);
    overlay.remove();
    await renderPins();
  });
  return overlay;
}
function automationEditor(){
  const due=new Date(Date.now()+10*60*1000);due.setMinutes(due.getMinutes()-due.getTimezoneOffset());
  openOverlay({
    title:'زمان‌بندی جدید',
    subtitle:'REMIND OR EXECUTE',
    wide:true,
    body:`
      <div class="mode-choice"><label><input type="radio" name="kind" value="reminder" checked><span><b>فقط یادآوری کن</b><small>MARIA فقط خبر می‌دهد.</small></span></label><label><input type="radio" name="kind" value="action"><span><b>خودش انجام بده</b><small>Planner کار را در زمان تعیین‌شده اجرا می‌کند.</small></span></label></div>
      ${field('دستور / متن یادآوری','<textarea name="instruction" rows="4" required placeholder="مثلاً ساعت ۹ تحقیق کن و گزارش را برام بخون…"></textarea>')}
      <div class="field-grid">${field('زمان',`<input name="dueAt" type="datetime-local" value="${due.toISOString().slice(0,16)}" required>`)}${field('تکرار',`<select name="repeat"><option value="0">یک‌بار</option><option value="15">هر ۱۵ دقیقه</option><option value="60">هر ساعت</option><option value="1440">هر روز</option><option value="10080">هر هفته</option></select>`)}</div>
      ${field('اگر زمانش گذشت',`<select name="missedRunPolicy"><option value="grace_or_ask">اگر نزدیک بود اجرا / در غیر این صورت بپرس</option><option value="skip">رد کن</option><option value="run_immediately">به محض برگشت اجرا کن</option><option value="ask">از من بپرس</option></select>`)}
      <div class="policy-note">اجرای خودکار همچنان از Planner، Permission، Risk، Idempotency و Verify عبور می‌کند؛ زمان‌بندی مجوز نامحدود نیست.</div>
    `,
    onSubmit:async fd=>{
      const kind=String(fd.get('kind')||'reminder'),instruction=String(fd.get('instruction')||'').trim(),date=new Date(String(fd.get('dueAt')||'')),intervalMinutes=Number(fd.get('repeat'))||0;
      if(!instruction||Number.isNaN(date.getTime()))throw new Error('دستور و زمان معتبر لازم است.');
      const common={dueAt:date.toISOString(),intervalMinutes,missedRunPolicy:String(fd.get('missedRunPolicy')||'grace_or_ask')};
      if(kind==='action')await window.blackClover.createReminder({kind:'action',instruction,label:instruction,...common});
      else await window.blackClover.createReminder({kind:'reminder',message:instruction,...common});
      await renderTasks();
    }
  });
}
function renderSlot4(){
  const host=$('[data-module-body]');if(!host)return;
  host.innerHTML='<div class="future-slot"><span>04</span><b>این بخش برای قابلیت بعدی آماده است</b><p>ساختار Hub ماژولار است؛ بعداً بدون تغییر صفحات فعلی قابلیت جدید اینجا می‌آید.</p></div>';
}

function renderSettings(){
  const host=$('[data-module-body]');if(!host)return;
  host.innerHTML=`
    <div class="module-head"><div><small>TOP ISLAND SETTINGS</small><h2>تنظیمات پنل</h2><p>رفتار، صدا و نحوه پنهان‌شدن Top Island را تنظیم کن.</p></div></div>
    <div class="settings-grid">
      <button class="setting-card" data-setting-pin><span>${ICON.panelPin}</span><div><b>پین پنل</b><small>${prefs.panelPinned?'پنل باز می‌ماند':'بعد از بی‌کاری جمع می‌شود'}</small></div><i class="toggle ${prefs.panelPinned?'on':''}"></i></button>
      <button class="setting-card" data-setting-sound><span>${ICON.sound}</span><div><b>صدای پنل</b><small>فقط افکت‌های خود Top Island</small></div><i class="toggle ${prefs.soundMuted?'':'on'}"></i></button>
      <label class="setting-card static"><span>◷</span><div><b>زمان پنهان‌شدن</b><small>در حالت بدون پین</small></div><select data-setting-timeout><option value="30" ${prefs.autoHideSeconds===30?'selected':''}>۳۰ ثانیه</option><option value="60" ${prefs.autoHideSeconds===60?'selected':''}>۱ دقیقه</option><option value="120" ${prefs.autoHideSeconds===120?'selected':''}>۲ دقیقه</option><option value="0" ${prefs.autoHideSeconds===0?'selected':''}>هرگز</option></select></label>
      <button class="setting-card" data-full-settings><span>${ICON.settings}</span><div><b>تنظیمات کامل MARIA</b><small>مدل‌ها، Voice، سیستم و اتصال‌ها</small></div><b>›</b></button>
    </div>`;
}
async function renderModule(){
  $('.module-nav button[data-module]').forEach(b=>b.classList.toggle('active',b.dataset.module===moduleId));
  const meta=MODULES.find(x=>x.id===moduleId);
  $('[data-current-module]').textContent=meta?.label||'MARIA';
  savePrefs({lastPage:moduleId});
  const host=$('[data-module-body]');host?.classList.add('module-changing');
  await new Promise(r=>setTimeout(r,35));
  if(moduleId==='home')await renderHome();
  else if(moduleId==='shortcuts')await renderShortcuts();
  else if(moduleId==='reports')await renderReports();
  else if(moduleId==='pins')await renderPins();
  else if(moduleId==='tasks')await renderTasks();
  else if(moduleId==='settings')renderSettings();
  else renderSlot4();
  requestAnimationFrame(()=>host?.classList.remove('module-changing'));
}
function selectModule(id){
  if(id!=='settings'&&!MODULES.some(x=>x.id===id))return;
  moduleId=id;setMode('expanded');playIslandTone('tap');renderModule();
}
function runContextAdd(){
  if(moduleId==='shortcuts')return shortcutEditor();
  if(moduleId==='reports')return accountingEditor();
  if(moduleId==='pins')return pinEditor();
  if(moduleId==='tasks')return automationEditor();
  openOverlay({title:'ایجاد سریع',subtitle:'MARIA QUICK CREATE',body:'<div class="quick-create-grid"><button type="button" data-quick-create="shortcut">میان‌بر</button><button type="button" data-quick-create="pin">پین</button><button type="button" data-quick-create="task">وظیفه</button><button type="button" data-quick-create="report">Excel Watch</button></div>'});
}

function bindDelegation(){
  const body=$('[data-module-body]');
  body.addEventListener('click',async e=>{
    const shortcut=e.target.closest('[data-shortcut-id]');
    if(shortcut){
      const id=shortcut.dataset.shortcutId;
      if(e.target.closest('[data-shortcut-edit]')){
        const item=(await window.blackClover.listShortcuts()).find(x=>x.id===id);if(item)shortcutEditor(item);
      }else if(e.target.closest('[data-shortcut-open]'))await window.blackClover.openShortcut(id);
      return;
    }
    if(e.target.closest('[data-add-shortcut]')){shortcutEditor();return;}
    if(e.target.closest('[data-report-add]')){accountingEditor();return;}
    if(e.target.closest('[data-report-refresh]')){await window.blackClover.refreshAccountingReports({force:true});await renderReports();return;}
    const filter=e.target.closest('[data-report-filter]')?.dataset.reportFilter;
    if(filter){reportFilter=filter;await renderReports();return;}
    const row=e.target.closest('[data-monitor]');
    if(row){
      const id=row.dataset.monitor;
      if(e.target.closest('[data-monitor-open]')){await window.blackClover.openAccountingMonitor(id);await renderReports();return;}
      if(e.target.closest('[data-monitor-detail]')){await showReportDetails(id);return;}
      if(e.target.closest('[data-monitor-pin]')){
        const entry=(await window.blackClover.accountingDashboard()).find(x=>x.monitor.id===id);
        if(entry)await window.blackClover.updateAccountingMonitor(id,{pinned:!entry.monitor.pinned});
        await renderReports();return;
      }
    }
    if(e.target.closest('[data-add-pin]')){pinEditor();return;}
    if(e.target.closest('[data-add-automation]')){automationEditor();return;}
    const pin=e.target.closest('[data-pin-id]');
    if(pin){
      const id=pin.dataset.pinId,item=(await window.blackClover.listPins()).find(x=>x.id===id);
      if(e.target.closest('[data-pin-copy]')&&item){await navigator.clipboard?.writeText(item.body||item.text||'');return;}
      if(e.target.closest('[data-pin-edit]')&&item){pinEditor(item);return;}
    }
    const rem=e.target.closest('[data-reminder-id]');
    if(rem){
      const id=rem.dataset.reminderId;
      if(e.target.closest('[data-reminder-pause]')){await window.blackClover.pauseReminder(id);await renderTasks();return;}
      if(e.target.closest('[data-reminder-resume]')){await window.blackClover.resumeReminder(id);await renderTasks();return;}
      if(e.target.closest('[data-reminder-cancel]')){await window.blackClover.cancelReminder(id);await renderTasks();return;}
    }
  });
}

export async function mountTopIsland(){
  document.body.classList.add('top-island-surface');
  document.body.innerHTML=`<main class="top-island" data-mode="compact">
    <header class="island-bar">
      <button class="island-character" data-state="online" data-home-toggle aria-label="MARIA Home"><span class="face"><i class="eye e1"></i><i class="eye e2"></i><i class="mouth"></i></span></button>
      <div class="peek-dots" aria-hidden="true"><i></i><i></i><i></i></div>
      <div class="island-status"><small>MARIA</small><b data-status>Online • آماده</b></div>
      <div class="live-pills" data-live-pills></div>
      <nav class="island-actions" aria-label="Top Island controls">
        <button data-home title="خانه">${ICON.home}</button>
        <button data-open-chat title="چت">${ICON.chat}</button>
        <button data-context-add title="افزودن">${ICON.plus}</button>
        <button data-panel-pin title="پین پنل">${ICON.panelPin}</button>
        <button data-panel-sound title="صدای پنل">${ICON.sound}</button>
        <button data-panel-settings title="تنظیمات">${ICON.settings}</button>
        <button data-toggle-mode title="جمع کردن">${ICON.collapse}</button>
      </nav>
    </header>
    <div class="drop-overlay" data-drop-overlay><b>فایل را رها کن</b><span>Pin • Ask MARIA • Translate • Send • Convert</span></div>
    <section class="island-body">
      <aside class="module-nav">
        <div class="nav-title"><small>MODULES</small><b data-current-module>خانه</b></div>
        ${MODULES.map(m=>`<button data-module="${m.id}" class="${m.id===moduleId?'active':''}"><span class="nav-icon">${m.icon}</span><div><b>${m.label}</b><small>${m.sub}</small></div></button>`).join('')}
        <div class="nav-spacer"></div>
        <button data-open-chat><span class="nav-icon">${ICON.chat}</span><div><b>چت MARIA</b><small>AI / Agent</small></div></button>
      </aside>
      <section class="module-body" data-module-body></section>
    </section>
  </main>`;

  $('[data-toggle-mode]').forEach(b=>b.onclick=()=>setMode(mode==='expanded'?'compact':'expanded'));
  $('[data-module]').forEach(b=>b.onclick=()=>selectModule(b.dataset.module));
  $('[data-open-chat]').forEach(b=>b.onclick=()=>{playIslandTone();window.blackClover.showChat();});
  $('[data-home]').onclick=()=>selectModule('home');
  $('[data-home-toggle]').onclick=()=>{if(mode==='peek'||mode==='compact')selectModule('home');else setMode('compact');};
  $('[data-context-add]').onclick=()=>{playIslandTone();runContextAdd();};
  $('[data-panel-pin]').onclick=()=>{savePrefs({panelPinned:!prefs.panelPinned});playIslandTone(prefs.panelPinned?'success':'tap');armIdle();};
  $('[data-panel-sound]').onclick=()=>{const muted=!prefs.soundMuted;savePrefs({soundMuted:muted});if(!muted)playIslandTone('success');};
  $('[data-panel-settings]').onclick=()=>selectModule('settings');
  bindDelegation();

  const root=$('.top-island'),dropOverlay=$('[data-drop-overlay]');
  root.addEventListener('mouseenter',()=>{if(mode==='peek')setMode('compact');});
  for(const eventName of ['dragenter','dragover']){
    root.addEventListener(eventName,e=>{e.preventDefault();root.classList.add('drop-active');});
  }
  root.addEventListener('dragleave',e=>{if(!root.contains(e.relatedTarget))root.classList.remove('drop-active');});
  root.addEventListener('drop',e=>{
    e.preventDefault();root.classList.remove('drop-active');
    const files=[...(e.dataTransfer?.files||[])];
    const names=files.map(x=>x.name).filter(Boolean);
    if(names.length){
      pushEvent({type:'drop',text:`فایل دریافت شد: ${names.join('، ')}`});
      openOverlay({
        title:'فایل دریافت شد',
        subtitle:'CONTEXT DROP',
        body:`<div class="drop-choice"><b>${esc(names.join('، '))}</b><span>در اتصال محلی، مسیر امن فایل گرفته می‌شود و می‌توانی Ask MARIA، Pin، Translate، Send یا Convert را انتخاب کنی.</span></div>`,
        onSubmit:null
      });
    }
  });

  document.addEventListener('pointermove',e=>{
    wake();
    const root=$('.top-island'),r=root.getBoundingClientRect();
    const x=Math.max(-1,Math.min(1,(e.clientX-(r.left+r.width/2))/(r.width/2))),y=Math.max(-1,Math.min(1,(e.clientY-35)/60));
    root.style.setProperty('--look-x',`${x*2.5}px`);root.style.setProperty('--look-y',`${y*1.7}px`);
  },{passive:true});
  document.addEventListener('keydown',e=>{wake();if(e.key==='Escape'){if($('.hub-overlay'))$('.hub-overlay')?.remove();else if(mode==='expanded')setMode('compact');else if(mode==='compact')setMode('peek');}});
  document.addEventListener('click',wake);

  window.blackClover.onEvent?.(e=>{
    if(e?.type==='ui-state'){ $('[data-status]').textContent=e.detail||e.mode||'MARIA';setCharacterState(e.mode);pushEvent(e);}
    else if(e?.type==='thinking'){setCharacterState('working');pushEvent(e);}
    else if(e?.type==='tool'){setCharacterState('executing');pushEvent(e);}
    else if(e?.type==='accounting-report-updated'){pushEvent({type:'accounting',text:'گزارش حسابداری بروزرسانی شد'});if(moduleId==='reports')renderReports();}
    else if(e?.type==='accounting-watch-unavailable'){pushEvent({type:'warning',text:'دسترسی یکی از مسیرهای حسابداری قطع شد'});}
    else if(e?.type==='reminder'||e?.type==='scheduled-action'){pushEvent(e);if(moduleId==='tasks')renderTasks();}
    else if(e?.type==='data-changed'){
      if(e.store==='pins'&&moduleId==='pins')renderPins();
      if(e.store==='reminders'&&moduleId==='tasks')renderTasks();
      if(e.store==='shortcuts'&&moduleId==='shortcuts')renderShortcuts();
      if(e.store==='accounting'&&moduleId==='reports')renderReports();
    }
  });
  window.blackClover.onIslandModule?.(payload=>selectModule(String(payload?.module||payload||'home')));

  document.body.addEventListener('change',e=>{
    if(e.target.matches('[data-setting-timeout]')){
      const value=Number(e.target.value);
      savePrefs({autoHideSeconds:value});
      armIdle();
    }
  });
  document.body.addEventListener('click',e=>{
    if(e.target.closest('[data-setting-pin]')){savePrefs({panelPinned:!prefs.panelPinned});renderSettings();armIdle();}
    if(e.target.closest('[data-setting-sound]')){savePrefs({soundMuted:!prefs.soundMuted});if(!prefs.soundMuted)playIslandTone('success');renderSettings();}
    if(e.target.closest('[data-full-settings]'))window.blackClover.openSettings?.('general');
    const quick=e.target.closest('[data-quick-create]')?.dataset.quickCreate;
    if(quick){$('.hub-overlay')?.remove();if(quick==='shortcut')shortcutEditor();else if(quick==='pin')pinEditor();else if(quick==='task')automationEditor();else if(quick==='report')accountingEditor();}
    if(e.target.closest('[data-home-chat]'))window.blackClover.showChat();
    if(e.target.closest('[data-home-refresh]')&&moduleId==='home')renderHome();
  });

  await renderModule();renderLivePills();syncHeaderState();setMode(prefs.panelPinned?'compact':'compact');
}
