import './devSession.css';

const $=(s,r=document)=>r.querySelector(s);
const $$=(s,r=document)=>[...r.querySelectorAll(s)];
const esc=v=>String(v??'').replace(/[&<>"']/g,c=>({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[c]));
const fmt=v=>{try{return new Intl.DateTimeFormat('fa-IR',{hour:'2-digit',minute:'2-digit',second:'2-digit'}).format(new Date(v))}catch{return String(v||'')}};
const ICON={
  close:'<svg viewBox="0 0 24 24"><path d="m7 7 10 10M17 7 7 17"/></svg>',
  min:'<svg viewBox="0 0 24 24"><path d="M5 12h14"/></svg>',
  refresh:'<svg viewBox="0 0 24 24"><path d="M20 11a8 8 0 1 0-2 5"/><path d="M20 5v6h-6"/></svg>',
  play:'<svg viewBox="0 0 24 24"><path d="m8 5 11 7-11 7z"/></svg>',
  code:'<svg viewBox="0 0 24 24"><path d="m8 8-4 4 4 4m8-8 4 4-4 4m-3-11-2 14"/></svg>',
  check:'<svg viewBox="0 0 24 24"><path d="m5 12 4 4 10-10"/></svg>',
  git:'<svg viewBox="0 0 24 24"><circle cx="7" cy="6" r="2"/><circle cx="17" cy="18" r="2"/><circle cx="7" cy="18" r="2"/><path d="M7 8v8M9 7c5 0 6 2 6 6v3"/></svg>',
  terminal:'<svg viewBox="0 0 24 24"><path d="m5 7 4 5-4 5M11 18h8"/></svg>'
};
let snapshot=null,events=[],busy=false,lastCheck=null;
const phases=['Inspect','Edit','Test','Verify','Sync'];

function log(type,text,detail=''){
  events.unshift({id:crypto.randomUUID?.()||String(Date.now()+Math.random()),type,text,detail,at:new Date().toISOString()});
  events=events.slice(0,120);renderTimeline();
}
function phaseState(name){
  if(name==='Inspect')return snapshot?'done':'active';
  if(name==='Edit')return snapshot?.changes?.length?'active':'done';
  const recent=events.find(e=>e.type===name.toLowerCase());
  return recent?.detail==='success'?'done':recent?.detail==='error'?'error':recent?'active':'idle';
}
function renderPhases(){
  const host=$('[data-phases]');if(!host)return;
  host.innerHTML=phases.map((p,i)=>`<div class="phase ${phaseState(p)}"><i>${i+1}</i><span>${p}</span></div>`).join('');
}
function renderStatus(){
  if(!snapshot)return;
  $('[data-repo]').textContent=snapshot.root||'—';
  $('[data-branch]').textContent=snapshot.branch||'detached';
  $('[data-head]').textContent=snapshot.head||'—';
  $('[data-count]').textContent=String(snapshot.changes?.length||0);
  const changes=$('[data-changes]');
  changes.innerHTML=(snapshot.changes||[]).map(x=>{
    const kind=/\?\?/.test(x.code)?'new':/D/.test(x.code)?'del':/M/.test(x.code)?'mod':'other';
    return `<article><b class="${kind}">${esc(x.code)}</b><code>${esc(x.path)}</code></article>`;
  }).join('')||'<div class="empty">Working tree clean</div>';
  $('[data-commits]').innerHTML=(snapshot.recent||[]).map(x=>`<article><code>${esc(x.sha)}</code><div><b>${esc(x.message)}</b><small>${esc(x.when)}</small></div></article>`).join('');
  renderCodeFeed();
  renderPhases();
}
function renderCodeFeed(){
  const out=$('[data-output]');if(!out||!snapshot)return;
  const changed=(snapshot.changes||[]).slice(0,8);
  const rows=[`<span class="prompt">maria@windows:~/Black-Clover-Live$</span> <span class="command">remote coding session</span>`];
  for(const item of changed){const add=Number(item.additions||0),del=Number(item.deletions||0),label=/\?\?/.test(item.code)?'Create':'Update';rows.push(`<span class="code-step"><i></i><b>${label}(${esc(item.path)})</b></span>`);if(add||del)rows.push(`<span class="diff-line">└ <em>+${add}</em> <strong>-${del}</strong></span>`);}
  if(lastCheck){const pass=String(lastCheck.summary||'').match(/(?:pass|passed)\s+(\d+)|(\d+)\s+passed/i),count=pass?.[1]||pass?.[2]||'';rows.push(`<span class="code-step ${lastCheck.ok?'success':'error'}"><i></i><b>Bash(npm ${esc(lastCheck.kind)})</b></span>`);rows.push(`<span class="diff-line ${lastCheck.ok?'ok':'bad'}">└ ${lastCheck.ok?(count?`${esc(count)} passed`:'passed'):'failed'}</span>`);}
  if(!changed.length&&!lastCheck)rows.push('<span class="dim">Working tree clean. Waiting for MARIA or Remote Desktop changes.</span>');
  out.innerHTML=rows.join('\n');
}
function renderTimeline(){
  const host=$('[data-timeline]');if(!host)return;
  host.innerHTML=events.map(e=>`<article class="${esc(e.detail)}"><i></i><div><b>${esc(e.text)}</b><small>${esc(e.type)} • ${fmt(e.at)}</small></div></article>`).join('')||'<div class="empty">Ready for MARIA Dev Session.</div>';
}
function approvalCard(e){
  const p=e||{},id=p.confirmationId||p.id||'';
  return `<section class="approval" data-approval="${esc(id)}">
    <div class="approval-avatar"><span class="mini-face"><i></i><i></i></span><em></em></div>
    <div class="approval-copy"><small>${esc(p.tool||p.source||'MARIA')}</small><b>${esc(p.text||p.message||'waiting for your OK')}</b><span>${esc(p.detail||p.action||'این عملیات برای ادامه به تأیید شما نیاز دارد.')}</span></div>
    <div class="approval-buttons"><button class="deny" data-deny>${ICON.close}<span>Deny</span></button><button class="allow" data-allow>${ICON.check}<span>Allow</span></button></div>
  </section>`;
}
function showApproval(e){
  const host=$('[data-approval-host]');if(!host)return;
  host.innerHTML=approvalCard(e);host.hidden=false;
}
async function refresh(){
  const btn=$('[data-refresh]');if(btn)btn.disabled=true;
  try{snapshot=await window.blackClover.devStatus();renderStatus();log('inspect','Repository inspected','success');}
  catch(error){log('inspect','Inspect failed: '+String(error?.message||error),'error');}
  finally{if(btn)btn.disabled=false;}
}
async function runCheck(kind){
  if(busy)return;busy=true;
  const name=kind==='build'?'Build':'Test',button=$(`[data-${kind}]`);
  if(button)button.disabled=true;log(kind,name+' started','running');renderPhases();
  try{
    const result=await window.blackClover.runDevCheck(kind);
    lastCheck=result;
    log(kind,result.ok?name+' passed':name+' failed',result.ok?'success':'error');
    renderCodeFeed();
  }catch(error){log(kind,name+' failed: '+String(error?.message||error),'error');}
  finally{busy=false;if(button)button.disabled=false;renderPhases();await refresh();}
}
function mount(){
  document.body.className='dev-session-surface';
  document.body.innerHTML=`<main class="dev-shell">
    <header class="dev-titlebar">
      <div class="title-left"><span class="status-dot"></span><b>MARIA Dev Session</b><small data-branch>loading…</small></div>
      <div class="title-actions"><button data-refresh title="Refresh">${ICON.refresh}</button><button data-vscode title="VS Code">${ICON.code}</button><button data-min title="Minimize">${ICON.min}</button><button class="close" data-close title="Close">${ICON.close}</button></div>
    </header>
    <section class="dev-meta"><div><small>REPOSITORY</small><code data-repo>—</code></div><div><small>HEAD</small><code data-head>—</code></div><div><small>CHANGED</small><b data-count>0</b></div></section>
    <section class="phase-strip" data-phases></section>
    <section class="approval-host" data-approval-host hidden></section>
    <section class="workspace">
      <div class="terminal-panel">
        <header><span>${ICON.terminal}</span><div><b>Execution Log</b><small>Remote / Local Coding Monitor</small></div><div class="terminal-actions"><button data-test>${ICON.play} Test</button><button data-build>${ICON.play} Build</button></div></header>
        <div class="terminal-output" data-output><span class="prompt">maria@windows:~/Black-Clover-Live$</span>
<span class="dim">Ready. Select Test or Build, or follow live Remote Desktop changes.</span></div>
        <div class="timeline" data-timeline></div>
      </div>
      <aside class="side-panel">
        <section><header><b>Changed files</b><small>Git working tree</small></header><div class="change-list" data-changes></div></section>
        <section><header><b>Recent commits</b><small>Last 5</small></header><div class="commit-list" data-commits></div></section>
      </aside>
    </section>
    <div class="dev-character" data-character><span class="face"><i></i><i></i><em></em></span></div>
  </main>`;

  $('[data-refresh]').onclick=refresh;
  $('[data-test]').onclick=()=>runCheck('test');
  $('[data-build]').onclick=()=>runCheck('build');
  $('[data-vscode]').onclick=()=>window.blackClover.openDevVsCode();
  $('[data-min]').onclick=()=>window.blackClover.minimizeSurface('dev');
  $('[data-close]').onclick=()=>window.blackClover.hideDevSession();
  document.addEventListener('click',async e=>{
    const card=e.target.closest('[data-approval]');if(!card)return;
    const id=card.dataset.approval;
    if(e.target.closest('[data-allow]')){await window.blackClover.confirm(id,true);log('approval','Action allowed','success');card.parentElement.hidden=true;}
    if(e.target.closest('[data-deny]')){await window.blackClover.confirm(id,false);log('approval','Action denied','error');card.parentElement.hidden=true;}
  });
  window.blackClover.onEvent?.(e=>{
    if(['approval','confirmation','permission','confirm'].includes(String(e?.type||'').toLowerCase())||e?.requiresConfirmation)showApproval(e);
    const map={tool:'edit',thinking:'inspect','scheduled-action':'sync',accounting:'verify','dev-session':e?.phase||'dev'};
    log(map[e?.type]||e?.type||'event',String(e?.text||e?.detail||e?.message||e?.type||'MARIA event'),e?.state||'');
    renderPhases();
  });
  window.blackClover.onSurfaceOpening?.(()=>document.body.classList.add('surface-opening'));
  window.blackClover.onSurfaceClosing?.(()=>document.body.classList.add('surface-closing'));
  refresh();
}
export function mountDevSession(){mount();}