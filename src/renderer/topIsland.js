
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
  host.innerHTML=`<div class="view-title"><div><small>ACCOUNTING WATCH</small><h2>گزارش ثبت عکس‌ها</h2></div><div><button class="soft-btn" data-report-refresh>↻ بروزرسانی</button><button class="soft-btn" data-report-add>＋ فایل</button></div></div><div class="report-summary"><span><b>${rows.length}</b> فایل</span><span><b>${rows.filter(x=>x.result?.complete).length}</b> کامل</span><span><b>${totalMissing}</b> ثبت‌نشده</span></div><div class="report-list">${rows.map(({monitor:m,result:r})=>`<article class="report-row ${r?.complete?'complete':''}" data-monitor="${esc(m.id)}"><button class="star" data-monitor-pin>${m.pinned?'★':'☆'}</button><div class="report-main"><div class="report-name"><b>${esc(r?.displayName||m.name||'Excel')}</b>${r?.invoiceNumber?`<em>#${esc(r.invoiceNumber)}</em>`:''}</div><div class="meter"><i style="width:${Number(r?.completion||0)}%"></i></div><div class="stats"><span>کل <b>${Number(r?.total||0)}</b></span><span class="good">ثبت <b>${Number(r?.registered||0)}</b></span><span class="bad">ثبت‌نشده <b>${Number(r?.missing||0)}</b></span></div><small>بررسی: ${fmt(r?.scannedAt)} • بازشدن از MARIA: ${fmt(m.lastOpenedByMaria)}</small>${r?.status&&r.status!=='ok'?`<p class="warning">${esc(r.status)}${r.error?' • '+esc(r.error):''}</p>`:''}</div><div class="report-actions"><button data-monitor-detail>جزئیات</button><button data-monitor-open>↗ باز کردن</button></div></article>`).join('')||'<div class="island-empty">هنوز فایل Excel تعریف نشده. فایل‌ها بعداً از تنظیمات محلی اضافه می‌شوند.</div>'}</div><div class="report-detail" data-report-detail hidden></div>`;
  $('[data-report-refresh]',host)?.addEventListener('click',async e=>{e.currentTarget.disabled=true;await window.blackClover.refreshAccountingReports({force:true});e.currentTarget.disabled=false;renderReports()});
  $('[data-report-add]',host)?.addEventListener('click',async()=>{
    const p=prompt('مسیر کامل فایل Excel:','');if(!p)return;
    const name=promp