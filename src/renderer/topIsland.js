
import './topIsland.css';

const esc=s=>String(s??'').replace(/[&<>"']/g,c=>({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[c]));
const fmt=v=>{if(!v)return '—';try{return new Intl.DateTimeFormat('fa-IR',{dateStyle:'short',timeStyle:'short'}).format(new Date(v));}catch{return String(v)}};
const $=(s,r=document)=>r.querySelector(s), $$=(s,r=document)=>[...r.querySelectorAll(s)];
let mode='compact', tab='live', utility='shortcuts', events=[], idleTimer=null;

function setMode(next){
  mode=next;
  document.body.dataset.islandMode=next;
  $('.top-island')?.setAttribute('data-mode',next);
  window.blackClover?.setIslandMode?.(next).catch(()=>{});
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
  events.unshift({at:new Date().toISOString(),type:e.type||'event',text:String(text)});
  events=events.slice(0,40); renderLive();
}
function renderLive(){
  const host=$('[data-live-events]'); if(!host)return;
  host.innerHTML=events.length?events.map(e=>`<article class="live-event"><i></i><div><b>${esc(e.text)}</b><small>${esc(e.type)} • ${fmt(e.at)}</small></div></article>`).join(''):'<div class="island-empty">هنوز رویدادی ثبت نشده.</div>';
}
async function refreshPins(){
  const items=await window.blackClover.listPins().catch(()=>[]);
  $('[data-pin-count]').textContent=String(items.length);
  $('[data-pins-list]').innerHTML=items.length?items.map(x=>`<article class="island-card" data-pin="${esc(x.id)}"><div><b>${esc(x.title||'پین')}</b><p>${esc(x.text)}</p><small>${fmt(x.updatedAt)}</small></div><button data-pin-copy>⧉</button><button data-pin-delete>×</button></article>`).join(''):'<div class="island-empty">چیزی پین نشده.</div>';
}
async function refreshReminders(){
  const items=await window.blackClover.listReminders().catch(()=>[]);
  $('[data-reminder-list]').innerHTML=items.length?items.map(x=>`<article class="island-card" data-reminder="${esc(x.id)}"><div><b>${esc(x.label||x.message||x.instruction)}</b><small>${x.kind==='action'?'اجرای خودکار':'یادآوری'} • ${fmt(x.dueAt)}${x.intervalMinutes?` • هر ${x.intervalMinutes} دقیقه`:''}</small>${x.lastResult?`<p class="${x.lastResult.ok?'result-ok':'result-bad'}">${esc(x.lastResult.text||'')}</p>`:''}</div><button data-reminder-cancel>لغو</button></article>`).join(''):'<div class="island-empty">برنامه فعالی نداری.</div>';
}
async function renderShortcuts(){
  const host=$('[data-utility-body]'),items=await window.blackClover.listShortcuts().catch(()=>[]);
  host.innerHTML=`<div class="view-title"><div><small>FAST ACCESS</small><h2>میان‌برها</h2></div><button class="soft-btn" data-add-shortcut>＋ افزودن</button></div><div class="shortcut-grid">${items.map(x=>`<button class="shortcut-tile" data-shortcut="${esc(x.id)}" title="${esc(x.target)}"><span>${esc(x.icon||'◆')}</span><b>${esc(x.label)}</b><small>${esc(x.kind||'auto')}</small></button>`).join('')||'<div class="island-empty wide">هنوز میان‌بری نساختی.</div>'}</div>${items.length>8?'<div class="scroll-hint">با اسکرول همه میان‌برها را ببین.</div>':''}`;
  $('[data-add-shortcut]',host)?.addEventListener('click',async()=>{
    const label=prompt('اسم میان‌بر؟',''); if(label===null)return;
    const target=prompt('مسیر فایل، پوشه، برنامه یا آدرس سایت؟',''); if(!target)return;
    const icon=prompt('آیکون/ایموجی؟','◆')||'◆';
    await window.blackClover.createShortcut({label:label||target,target,icon,kind:'auto'}); renderShortcuts();
  });
}
async function renderReports(){
  const host=$('[data-utility-body]'),rows=await window.blackClover.accountingDashboard().catch(()=>[]);
  const totalMissing=rows.reduce((n,x)=>n+Number(x.result?.missing||0),0);
  host.innerHTML=`<div class="view-title"><div><small>ACCOUNTING WATCH</small><h2>گزارش ثبت عکس‌ها</h2></div><div><button class="soft-btn" data-report-refresh>↻ بروزرسانی</button><button class="soft-btn" data-report-add>＋ فایل</button></div></div><div class="report-summary"><span><b>${rows.length}</b> فایل</span><span><b>${rows.filter(x=>x.result?.complete).length}</b> کامل</span><span><b>${totalMissing}</b> ثبت‌نشده</span></div><div class="report-list">${rows.map(({monitor:m,result:r})=>`<article class="report-row ${r?.complete?'complete':''}" data-monitor="${esc(m.id)}"><button class="star" data-monitor-pin>${m.pinned?'★':'☆'}</button><div class="report-main"><div class="report-name"><b>${esc(r?.displayName||m.name||'Excel')}</b>${r?.invoiceNumber?`<em>#${esc(r.invoiceNumber)}</em>`:''}</div><div class="meter"><i style="width:${Number(r?.completion||0)}%"></i></div><div class="stats"><span>کل <b>${Number(r?.total||0)}</b></span><span class="good">${m.type==='transport'?'تخلیه‌شده':'ثبت'} <b>${Number(r?.registered||0)}</b></span><span class="bad">${m.type==='transport'?'تخلیه‌نشده':'ثبت‌نشده'} <b>${Number(r?.missing||0)}</b></span></div><small>بررسی: ${fmt(r?.scannedAt)} • بازشدن از MARIA: ${fmt(m.lastOpenedByMaria)}</small>${r?.status&&r.status!=='ok'?`<p class="warning">${esc(r.status)}${r.error?' • '+esc(r.error):''}</p>`:''}</div><div class="report-actions"><button data-monitor-detail>جزئیات</button><button data-monitor-open>↗ باز کردن</button></div></article>`).join('')||'<div class="island-empty">هنوز فایل Excel تعریف نشده. فایل‌ها بعداً از تنظیمات محلی اضافه می‌شوند.</div>'}</div><div class="report-detail" data-report-detail hidden></div>`;
  $('[data-report-refresh]',host)?.addEventListener('click',async e=>{e.currentTarget.disabled=true;await window.blackClover.refreshAccountingReports({force:true});e.currentTarget.disabled=false;renderReports()});
  $('[data-report-add]',host)?.addEventListener('click',async()=>{
    const p=prompt('مسیر کامل فایل Excel:','');if(!p)return;
    const name=prompt('اسم نمایشی؟',p.split(/[\\\\/]/).pop()||'Excel');
    await window.blackClover.createAccountingMonitor({name:name||'',path:p,type:'invoice',pinned:true,profile:{startRow:2,anchorColumns:['C'],evidence:[]}});
    await window.blackClover.rebuildAccountingWatchers(); renderReports();
  });
}
function renderUtility(){
  $$('[data-utility-page]').forEach(b=>b.classList.toggle('active',b.dataset.utilityPage===utility));
  if(utility==='shortcuts')renderShortcuts();
  else if(utility==='reports')renderReports();
  else $('[data-utility-body]').innerHTML='<div class="future-slot"><span>03</span><b>فضای قابلیت بعدی</b><p>این صفحه عمداً خالی است تا قابلیت بعدی بدون تغییر معماری پنل اضافه شود.</p></div>';
}
function setTab(next){
  tab=next;
  $$('[data-tab]').forEach(b=>b.classList.toggle('active',b.dataset.tab===next));
  $$('[data-view]').forEach(v=>v.hidden=v.dataset.view!==next);
  if(next==='pins')refreshPins(); if(next==='automation')refreshReminders(); if(next==='utility')renderUtility();
  setMode('expanded');
}
function bindReportClicks(){
  $('[data-utility-body]').addEventListener('click',async e=>{
    const shortcut=e.target.closest('[data-shortcut]'); if(shortcut){await window.blackClover.openShortcut(shortcut.dataset.shortcut);return}
    const row=e.target.closest('[data-monitor]'); if(!row)return;
    const id=row.dataset.monitor;
    if(e.target.closest('[data-monitor-open]')){await window.blackClover.openAccountingMonitor(id);renderReports();return}
    if(e.target.closest('[data-monitor-pin]')){const rows=await window.blackClover.accountingDashboard(),entry=rows.find(x=>x.monitor.id===id);if(entry)await window.blackClover.updateAccountingMonitor(id,{pinned:!entry.monitor.pinned});renderReports();return}
    if(e.target.closest('[data-monitor-detail]')){
      const rows=await window.blackClover.accountingDashboard(),entry=rows.find(x=>x.monitor.id===id),detail=$('[data-report-detail]'); if(!entry||!detail)return;
      const r=entry.result;
      detail.hidden=false;
      detail.innerHTML=`<div class="detail-head"><b>${esc(r?.displayName||entry.monitor.name)}</b><button data-detail-close>×</button></div>${(r?.sheets||[]).map(s=>`<section><h4>${esc(s.sheet)} — ${s.registered}/${s.total}</h4>${s.missingRows?.length?`<div class="missing-lines">${s.missingRows.slice(0,200).map(x=>`<span>ردیف ${x.row}: ${esc(x.missing.join('، '))}</span>`).join('')}</div>`:'<p class="all-good">همه موارد این شیت ثبت هستند.</p>'}</section>`).join('')||'<p>هنوز Scan معتبر نداریم.</p>'}`;
      $('[data-detail-close]',detail).onclick=()=>detail.hidden=true;
    }
  });
}
export async function mountTopIsland(){
  document.body.classList.add('top-island-surface');
  document.body.innerHTML=`<main class="top-island" data-mode="compact"><header class="island-bar"><button class="island-character" data-state="online" data-toggle-mode><span class="face"><i class="eye e1"></i><i class="eye e2"></i><i class="mouth"></i></span></button><div class="island-status"><small>MARIA</small><b data-status>Online • آماده</b></div><nav class="island-tabs"><button data-tab="live" class="active">✦ Live</button><button data-tab="pins">📌 Pin <em data-pin-count>0</em></button><button data-tab="automation">⏱ زمان‌بندی</button><button data-tab="utility">☷ منو</button></nav><button class="collapse" data-toggle-mode>⌄</button></header><section class="island-body"><section class="island-view" data-view="live"><div class="live-hero"><div><small>COMPANION ACTIVITY</small><h1>MARIA Live</h1><p>وضعیت Agentها، اجراها، هشدارها و کارهای در انتظار.</p></div><div><button class="soft-btn" data-open-chat>💬 چت</button><button class="soft-btn" data-clear-events>پاک‌کردن</button></div></div><div class="drop-zone" data-drop-zone><b>فایل را اینجا رها کن</b><span>اتصال مسیر واقعی فایل هنگام اجرای محلی Verify می‌شود.</span></div><div class="live-events" data-live-events></div></section><section class="island-view" data-view="pins" hidden><div class="view-title"><div><small>KEEP CLOSE</small><h2>پین‌ها</h2></div></div><form class="pin-form" data-pin-form><input name="title" placeholder="عنوان"><input name="text" placeholder="متن، لینک، پرامپت یا پیام مهم…" required><button>پین</button></form><div class="island-list" data-pins-list></div></section><section class="island-view" data-view="automation" hidden><div class="view-title"><div><small>REMIND OR EXECUTE</small><h2>یادآور و اجرای خودکار</h2></div></div><form class="automation-form" data-reminder-form><select name="kind"><option value="reminder">فقط یادآوری</option><option value="action">خودش انجام بده</option></select><input name="instruction" placeholder="مثلاً ساعت ۹ تحقیق کن و گزارش را برایم بخوان…" required><input name="dueAt" type="datetime-local" required><select name="repeat"><option value="0">یک‌بار</option><option value="15">هر ۱۵ دقیقه</option><option value="60">هر ساعت</option><option value="1440">هر روز</option><option value="10080">هر هفته</option></select><button>افزودن</button></form><p class="policy-note">اجرای خودکار همچنان از Brain/Planner، Permission و Verification عبور می‌کند.</p><div class="island-list" data-reminder-list></div></section><section class="island-view utility-view" data-view="utility" hidden><aside class="utility-rail"><button class="active" data-utility-page="shortcuts"><span>⌘</span><b>میان‌برها</b></button><button data-utility-page="reports"><span>▦</span><b>گزارش</b></button><button data-utility-page="slot3"><span>＋</span><b>بعدی</b></button></aside><div class="utility-body" data-utility-body></div></section></section></main>`;
  const due=new Date(Date.now()+10*60*1000); due.setMinutes(due.getMinutes()-due.getTimezoneOffset()); $('[name="dueAt"]').value=due.toISOString().slice(0,16);
  $$('[data-tab]').forEach(b=>b.onclick=()=>setTab(b.dataset.tab));
  $$('[data-toggle-mode]').forEach(b=>b.onclick=()=>setMode(mode==='expanded'?'compact':'expanded'));
  $$('[data-utility-page]').forEach(b=>b.onclick=()=>{utility=b.dataset.utilityPage;renderUtility()});
  $(''[data-open-chat]').onclick=()=>window.blackClover.showChat();
  $('[data-clear-events]').onclick=()=>{events=[];renderLive()};
  $('[data-pin-form]').onsubmit=async e=>{e.preventDefault();const fd=new FormData(e.currentTarget),text=String(fd.get('text')||'').trim();if(!text)return;await window.blackClover.createPin({title:String(fd.get('title')||'').trim(),text,pinned:true});e.currentTarget.reset();refreshPins()};
  $('[data-pins-list]').onclick=async e=>{const card=e.target.closest('[data-pin]');if(!card)return;if(e.target.closest('[data-pin-delete]')){await window.blackClover.removePin(card.dataset.pin);refreshPins()}if(e.target.closest('[data-pin-copy]')){const item=(await window.blackClover.listPins()).find(x=>x.id===card.dataset.pin);if(item)navigator.clipboard?.writeText(item.text).catch(()=>{})}};
  $('[data-reminder-form]').onsubmit=async e=>{e.preventDefault();const fd=new FormData(e.currentTarget),d=new Date(String(fd.get('dueAt')||'')),instruction=String(fd.get('instruction')||'').trim();if(!instruction||Number.isNaN(d.getTime()))return;const kind=String(fd.get('kind')||'reminder'),intervalMinutes=Number(fd.get('repeat'))||0;if(kind==='action')await window.blackClover.createReminder({kind:'action',instruction,label:instruction,dueAt:d.toISOString(),intervalMinutes});else await window.blackClover.createReminder({kind:'reminder',message:instruction,dueAt:d.toISOString(),intervalMinutes});e.currentTarget.querySelector('[name="instruction"]').value='';refreshReminders()};
  $('[data-reminder-list]').onclick=async e=>{const card=e.target.closest('[data-reminder]');if(card&&e.target.closest('[data-reminder-cancel]')){await window.blackClover.cancelReminder(card.dataset.reminder);refreshReminders()}};
  bindReportClicks();
  document.addEventListener('pointermove',e=>{wake();const root=$('.top-island'),r=root.getBoundingClientRect(),x=Math.max(-1,Math.min(1,(e.clientX-(r.left+r.width/2))/(r.width/2))),y=Math.max(-1,Math.min(1,(e.clientY-40)/60));root.style.setProperty('--look-x',`${x*3}px`);root.style.setProperty('--look-y',`${y*2}px`)},{passive:true});
  document.addEventListener('keydown',wake);document.addEventListener('click',wake);
  const drop=$('[data-drop-zone]');drop.ondragover=e=>{e.preventDefault();drop.classList.add('dragging')};drop.ondragleave=()=>drop.classList.remove('dragging');drop.ondrop=e=>{e.preventDefault();drop.classList.remove('dragging');const names=[...e.dataTransfer.files].map(f=>f.name);pushEvent({type:'drop',text:names.length?'فایل دریافت شد: '+names.join('، '):'فایل دریافت شد'})};
  window.blackClover.onEvent?.(e=>{if(e?.type==='ui-state'){ $('[data-status]').textContent=e.detail||e.mode||'MARIA';setCharacterState(e.mode);pushEvent(e)}else if(e?.type==='thinking'){setCharacterState('working');pushEvent(e)}else if(e?.type==='tool'){setCharacterState('executing');pushEvent(e)}else if(e?.type==='reminder'||e?.type==='scheduled-action'){pushEvent(e);refreshReminders()}else if(e?.type==='accounting-report-updated'&&tab==='utility'&&utility==='reports')renderReports();else if(e?.type==='data-changed'&&e.store==='pins')refreshPins()});
  await Promise.all([refreshPins(),refreshReminders()]); renderUtility(); renderLive(); setMode('compact');
}
