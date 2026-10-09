import './topIsland.css';

const esc=s=>String(s??'').replace(/[&<>"']/g,c=>({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[c]));
const fmt=v=>{if(!v)return '—';try{return new Intl.DateTimeFormat('fa-IR',{dateStyle:'short',timeStyle:'short'}).format(new Date(v));}catch{return String(v)}};
const $=(s,r=document)=>r.querySelector(s), $$=(s,r=document)=>[...r.querySelectorAll(s)];
const DEFAULT_EVIDENCE_ROOT='\\\\Alimohajeristee\\حسابداری\\share 1405\\pic\\New folder (2)';
const MODULES=[
  {id:'shortcuts',label:'میان‌برها',icon:'⌁',sub:'Quick Launch'},
  {id:'reports',label:'گزارش ثبت',icon:'▦',sub:'Accounting Watch'},
  {id:'pins-automation',label:'پین و زمان‌بندی',icon:'◆',sub:'Pins & Automations'},
  {id:'slot4',label:'بخش بعدی',icon:'＋',sub:'Reserved'}
];

let mode='compact',moduleId='shortcuts',events=[],idleTimer=null,reportFilter='all';

function setMode(next){
  mode=['peek','compact','expanded'].includes(next)?next:'compact';
  document.body.dataset.islandMode=mode;
  $('.top-island')?.setAttribute('data-mode',mode);
  window.blackClover?.setIslandMode?.(mode).catch(()=>{});
  armIdle();
}
function armIdle(){
  clearTimeout(idleTimer);
  if(mode==='expanded')return;
  idleTimer=setTimeout(()=>{if(!$('input:focus,textarea:focus,select:focus'))setMode('peek')},18000);
}
function wake(){if(mode==='peek')setMode('compact');armIdle();}
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
  return openOverlay({
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
  openOverlay({
    title:'تعریف سلول‌های بررسی',
    subtitle:'CELL RULE WIZARD • STAGED',
    wide:true,
    body:`
      <div class="config-note"><b>مرحله آنلاین: انتخاب مستقیم از Excel</b><span>وقتی سیستم در دسترس باشد، دکمه‌های «این ستون = رکورد»، «این ستون = عکس ۱» و «این ستون = عکس ۲» از Selection واقعی Excel مقدار می‌گیرند. فعلاً می‌توانی تعریف متنی را ذخیره کنی.</span></div>
      <div class="field-grid">
        ${field('ستون رکورد',`<input name="anchors" value="${esc((p.anchorColumns||['C']).join(','))}">`)}
        ${field('شروع ردیف',`<input name="startRow" type="number" value="${Number(p.startRow||2)}">`)}
      </div>
      <div class="field-grid">
        ${field('ستون/ستون‌های مدرک حالت عمومی','<input name="genericEvidence" placeholder="مثلاً H یا H,I">')}
        ${field('تعداد لازم حالت عمومی','<input name="genericRequired" type="number" min="1" max="4" value="1">')}
      </div>
      ${field('پوشه مدرک',`<input name="evidenceRoot" value="${esc(p.evidenceRoot||DEFAULT_EVIDENCE_ROOT)}">`)}
      <div class="config-note"><b>فیش و پلاک با Rule جدا</b><span>برای اینکه پلاک دو عکس و فیش یک عکس بخواهد، باید شرط تشخیص نوع رکورد را از فایل واقعی تعیین کنیم. این بخش عمداً به یک حدس خطرناک تبدیل نشده است.</span></div>
    `,
    onSubmit:async fd=>{
      const cols=String(fd.get('genericEvidence')||'').split(',').map(x=>x.trim().toUpperCase()).filter(Boolean);
      const evidence=cols.length?[{label:'مدرک',columns:cols,required:Number(fd.get('genericRequired'))||1,mode:'verified_numeric_hyperlink'}]:[];
      await window.blackClover.updateAccountingMonitor(m.id,{profile:{...p,startRow:Number(fd.get('startRow'))||2,dataStartRow:Number(fd.get('startRow'))||2,anchorColumns:String(fd.get('anchors')||'C').split(',').map(x=>x.trim().toUpperCase()).filter(Boolean),evidenceRoot:String(fd.get('evidenceRoot')||'').trim(),requireVerifiedAttachment:true,evidence}});
      await window.blackClover.rebuildAccountingWatchers();
      await window.blackClover.refreshAccountingReports({force:true});
      await renderReports();
    }
  });
}

async function renderPinsAutomation(){
  const host=$('[data-module-body]');if(!host)return;
  const [pins,reminders]=await Promise.all([window.blackClover.listPins().catch(()=>[]),window.blackClover.listReminders().catch(()=>[])]);
  host.innerHTML=`
    <div class="module-head">
      <div><small>KEEP + AUTOMATE</small><h2>پین و زمان‌بندی</h2><p>چیزهای مهم را نگه دار یا به MARIA بگو فقط یادآوری کند / خودش اجرا کند.</p></div>
    </div>
    <div class="dual-board">
      <section>
        <div class="board-head"><div><b>پین‌ها</b><small>${pins.length} مورد</small></div><button data-add-pin>＋ پین</button></div>
        <div class="board-list">${pins.map(pinCard).join('')||'<div class="empty">هنوز چیزی پین نشده.</div>'}</div>
      </section>
      <section>
        <div class="board-head"><div><b>یادآور و اجرا</b><small>${reminders.length} فعال</small></div><button data-add-automation>＋ زمان‌بندی</button></div>
        <div class="board-list">${reminders.map(automationCard).join('')||'<div class="empty">برنامه فعالی نیست.</div>'}</div>
      </section>
    </div>`;
}
function pinCard(x){return `<article class="pin-card" data-pin-id="${esc(x.id)}"><span class="pin-type">${esc(x.icon||'◆')}</span><div><b>${esc(x.title||'پین')}</b><small>${esc(x.type||'text')} • ${fmt(x.updatedAt)}</small><p>${esc(x.body||x.text||'')}</p></div><div><button data-pin-copy>کپی</button><button data-pin-edit>•••</button></div></article>`;}
function automationCard(x){return `<article class="automation-card" data-reminder-id="${esc(x.id)}"><span class="auto-kind ${x.kind==='action'?'execute':'notify'}">${x.kind==='action'?'▶':'◷'}</span><div><b>${esc(x.title||x.label||x.message||x.instruction)}</b><small>${x.kind==='action'?'خودش انجام بده':'فقط یادآوری'} • ${fmt(x.dueAt)}${x.intervalMinutes?` • هر ${x.intervalMinutes} دقیقه`:''}</small>${x.lastResult?`<p class="${x.lastResult.ok?'ok':'bad'}">${esc(x.lastResult.text||'')}</p>`:''}</div><button data-reminder-cancel>لغو</button></article>`;}
function pinEditor(item=null){
  openOverlay({
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
      await renderPinsAutomation();
    }
  });
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
      await renderPinsAutomation();
    }
  });
}
function renderSlot4(){
  const host=$('[data-module-body]');if(!host)return;
  host.innerHTML='<div class="future-slot"><span>04</span><b>این بخش برای قابلیت بعدی آماده است</b><p>ساختار Hub ماژولار است؛ بعداً بدون تغییر صفحات فعلی قابلیت جدید اینجا می‌آید.</p></div>';
}

async function renderModule(){
  $$('.module-nav button').forEach(b=>b.classList.toggle('active',b.dataset.module===moduleId));
  const meta=MODULES.find(x=>x.id===moduleId);
  $('[data-current-module]').textContent=meta?.label||'MARIA';
  if(moduleId==='shortcuts')return renderShortcuts();
  if(moduleId==='reports')return renderReports();
  if(moduleId==='pins-automation')return renderPinsAutomation();
  return renderSlot4();
}
function selectModule(id){
  if(!MODULES.some(x=>x.id===id))return;
  moduleId=id;setMode('expanded');renderModule();
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
    if(rem&&e.target.closest('[data-reminder-cancel]')){await window.blackClover.cancelReminder(rem.dataset.reminderId);await renderPinsAutomation();}
  });
}

export async function mountTopIsland(){
  document.body.classList.add('top-island-surface');
  document.body.innerHTML=`<main class="top-island" data-mode="compact">
    <header class="island-bar">
      <button class="island-character" data-state="online" data-toggle-mode aria-label="باز کردن MARIA"><span class="face"><i class="eye e1"></i><i class="eye e2"></i><i class="mouth"></i></span></button>
      <div class="island-status"><small>MARIA</small><b data-status>Online • آماده</b></div>
      <div class="live-pills" data-live-pills></div>
      <button class="chat-quick" data-open-chat title="چت">✦</button>
      <button class="collapse" data-toggle-mode>⌄</button>
    </header>
    <section class="island-body">
      <aside class="module-nav">
        <div class="nav-title"><small>MODULES</small><b data-current-module>میان‌برها</b></div>
        ${MODULES.map((m,i)=>`<button data-module="${m.id}" class="${i===0?'active':''}"><span>${m.icon}</span><div><b>${m.label}</b><small>${m.sub}</small></div></button>`).join('')}
        <div class="nav-spacer"></div>
        <button data-open-chat><span>✦</span><div><b>چت MARIA</b><small>AI / Agent</small></div></button>
      </aside>
      <section class="module-body" data-module-body></section>
    </section>
  </main>`;

  $$('[data-toggle-mode]').forEach(b=>b.onclick=()=>setMode(mode==='expanded'?'compact':'expanded'));
  $$('[data-module]').forEach(b=>b.onclick=()=>selectModule(b.dataset.module));
  $$('[data-open-chat]').forEach(b=>b.onclick=()=>window.blackClover.showChat());
  bindDelegation();

  document.addEventListener('pointermove',e=>{
    wake();
    const root=$('.top-island'),r=root.getBoundingClientRect();
    const x=Math.max(-1,Math.min(1,(e.clientX-(r.left+r.width/2))/(r.width/2))),y=Math.max(-1,Math.min(1,(e.clientY-35)/60));
    root.style.setProperty('--look-x',`${x*2.5}px`);root.style.setProperty('--look-y',`${y*1.7}px`);
  },{passive:true});
  document.addEventListener('keydown',e=>{wake();if(e.key==='Escape'&&mode==='expanded')setMode('compact')});
  document.addEventListener('click',wake);

  window.blackClover.onEvent?.(e=>{
    if(e?.type==='ui-state'){ $('[data-status]').textContent=e.detail||e.mode||'MARIA';setCharacterState(e.mode);pushEvent(e);}
    else if(e?.type==='thinking'){setCharacterState('working');pushEvent(e);}
    else if(e?.type==='tool'){setCharacterState('executing');pushEvent(e);}
    else if(e?.type==='accounting-report-updated'){pushEvent({type:'accounting',text:'گزارش حسابداری بروزرسانی شد'});if(moduleId==='reports')renderReports();}
    else if(e?.type==='accounting-watch-unavailable'){pushEvent({type:'warning',text:'دسترسی یکی از مسیرهای حسابداری قطع شد'});}
    else if(e?.type==='reminder'||e?.type==='scheduled-action'){pushEvent(e);if(moduleId==='pins-automation')renderPinsAutomation();}
    else if(e?.type==='data-changed'){
      if(e.store==='pins'&&moduleId==='pins-automation')renderPinsAutomation();
      if(e.store==='shortcuts'&&moduleId==='shortcuts')renderShortcuts();
      if(e.store==='accounting'&&moduleId==='reports')renderReports();
    }
  });

  await renderModule();renderLivePills();setMode('compact');
}
