
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
  host.innerHTML=`<div class="view-title"><div><small>FAST ACCESS</small><h2>میان‌برها</h2></div><button class="soft-btn" dat