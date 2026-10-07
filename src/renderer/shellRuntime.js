import './shellDesign.css';

const surface=new URLSearchParams(location.search).get('surface')||'avatar';
const labels={
  online:'Online • آماده',
  working:'Working • در حال فکر کردن',
  listening:'Listening • در حال شنیدن',
  executing:'Executing • در حال اجرا',
  offline:'Offline • بدون شبکه',
  error:'Attention • نیاز به بررسی'
};
let currentMode=navigator.onLine?'online':'offline';
let currentDetail='';

function statusHost(){
  let el=document.querySelector('.maria-shell-status');
  if(el)return el;
  el=document.createElement('div');
  el.className='maria-shell-status';
  el.innerHTML='<i></i><span></span>';
  document.body.append(el);
  return el;
}
function renderStatus(mode=currentMode,detail=currentDetail){
  currentMode=mode||'online';currentDetail=detail||'';
  const el=statusHost();el.dataset.mode=currentMode;
  el.querySelector('span').textContent=currentDetail||labels[currentMode]||labels.online;
  document.documentElement.dataset.mariaState=currentMode;
  const voice=document.querySelector('.dock-btn[data-action="voice"]');
  voice?.classList.toggle('listening',currentMode==='listening');
  document.querySelector('.dock-core')?.classList.toggle('busy',['working','executing'].includes(currentMode));
}
function networkState(){
  if(!navigator.onLine&&!['working','executing','listening'].includes(currentMode))renderStatus('offline');
  else if(navigator.onLine&&currentMode==='offline')renderStatus('online');
}
window.addEventListener('online',networkState);window.addEventListener('offline',networkState);

function decorateDock(){
  for(const btn of document.querySelectorAll('.dock-btn[data-action]')){
    if(!btn.querySelector('.dock-state-dot'))btn.insertAdjacentHTML('beforeend','<i class="dock-state-dot"></i>');
    btn.setAttribute('aria-label',btn.dataset.tip||btn.dataset.action||'Maria');
  }
}
function syncDock(state={}){
  decorateDock();
  const active={
    chat:state.chatVisible,
    pins:state.pinsVisible,
    reminders:state.remindersVisible,
    projects:state.projectsVisible,
    motions:state.motionsVisible,
    wardrobe:state.wardrobeVisible,
    avatar:state.wardrobeVisible
  };
  for(const btn of document.querySelectorAll('.dock-btn[data-action]')){
    const action=btn.dataset.action;
    btn.classList.toggle('active',Boolean(active[action]));
  }
}
async function refresh(){
  try{const state=await window.blackClover?.windowState?.();if(state){syncDock(state);if(state.uiState?.mode)renderStatus(state.uiState.mode,state.uiState.detail);}}
  catch{}
}

window.blackClover?.onEvent?.(event=>{
  if(event?.type==='ui-state'){renderStatus(event.mode,event.detail);return;}
  if(event?.type==='surface-state'){syncDock(event.state||{});return;}
  if(event?.type==='thinking'){renderStatus('working','Working • در حال فکر کردن');return;}
  if(event?.type==='tool'){renderStatus('executing',`Executing • ${event.name||'ابزار'}`);return;}
  if(event?.type==='provision'&&event.state==='needed')renderStatus('working','Working • آماده‌سازی ابزارها');
  if(event?.type==='provision'&&event.state==='partial')renderStatus('error','Attention • آماده‌سازی ناقص');
});

window.blackClover?.onSurfaceOpening?.(()=>{
  document.body.classList.remove('maria-surface-closing');
  document.body.classList.remove('maria-surface-ready');
  requestAnimationFrame(()=>document.body.classList.add('maria-surface-ready'));
  setTimeout(refresh,20);
});
window.blackClover?.onSurfaceClosing?.(()=>{
  document.body.classList.remove('maria-surface-ready');
  document.body.classList.add('maria-surface-closing');
});

document.body.classList.add('maria-shell-runtime',`maria-${surface}`);
requestAnimationFrame(()=>document.body.classList.add('maria-surface-ready'));
setTimeout(()=>{decorateDock();refresh();},120);
setInterval(refresh,1800);
renderStatus(currentMode);
