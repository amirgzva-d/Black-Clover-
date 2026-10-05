import './luxuryUI.css';

const ready=fn=>document.readyState==='loading'?document.addEventListener('DOMContentLoaded',fn,{once:true}):fn();

ready(()=>{
  const surface=new URLSearchParams(location.search).get('surface')||'avatar';
  const isAvatar=surface==='avatar',isChat=surface==='chat';
  document.body.classList.add('luxury-ui',`surface-${surface}`);
  const chatShell=document.querySelector('.chat-shell'),chat=document.querySelector('.chat'),header=chat?.querySelector('header'),input=document.querySelector('#input'),form=document.querySelector('#form');
  if(!chatShell||!chat||!header)return;

  if(isAvatar)chatShell.classList.add('chat-hidden');else chatShell.classList.remove('chat-hidden','chat-minimized');

  const windowActions=document.createElement('div');
  windowActions.className='window-actions';
  windowActions.innerHTML='<button class="window-btn minimize" type="button" title="کمینه">−</button><button class="window-btn close" type="button" title="بستن چت">×</button>';
  header.querySelector('.header-actions')?.append(windowActions);
  windowActions.querySelector('.close').onclick=e=>{e.stopPropagation();if(isChat)window.blackClover?.hideChat?.();else chatShell.classList.add('chat-hidden');};
  windowActions.querySelector('.minimize').onclick=e=>{e.stopPropagation();if(isChat)window.blackClover?.minimizeChat?.();else chatShell.classList.toggle('chat-minimized');};

  if(isAvatar){
    const dock=document.createElement('nav');
    dock.className='maria-dock';
    dock.setAttribute('aria-label','Maria quick controls');
    dock.innerHTML=`
      <button class="dock-btn dock-core" data-action="chat" data-tip="چت">✦</button>
      <button class="dock-btn" data-action="mic" data-tip="صحبت">◉</button>
      <span class="dock-sep"></span>
      <button class="dock-btn" data-action="pins" data-tip="پین‌ها">⌖</button>
      <button class="dock-btn" data-action="reminders" data-tip="یادآورها">◷</button>
      <button class="dock-btn" data-action="motions" data-tip="حرکت‌ها">◇</button>
      <button class="dock-btn" data-action="avatar" data-tip="کاراکتر">♙</button>
      <button class="dock-btn" data-action="settings" data-tip="تنظیمات">⚙</button>`;
    document.body.append(dock);

    const quick=document.createElement('section');
    quick.className='quick-panel';
    quick.innerHTML='<div class="quick-head"><b>Maria</b><span>دسترسی سریع</span></div><div class="quick-actions"></div>';
    document.body.append(quick);
    let panelMode='';
    const showQuick=mode=>{
      if(panelMode===mode&&quick.classList.contains('open')){quick.classList.remove('open');panelMode='';return;}
      panelMode=mode;const actions=quick.querySelector('.quick-actions'),title=quick.querySelector('.quick-head b');
      if(mode==='pins'){title.textContent='پین‌شده‌ها';actions.innerHTML='<button class="quick-action" data-prompt="پین‌های من رو نشون بده">نمایش پین‌ها</button><button class="quick-action" data-prompt="آخرین چیزی که پین کردم رو باز کن">آخرین پین</button>';}
      else{title.textContent='یادآورها';actions.innerHTML='<button class="quick-action" data-prompt="یادآوری‌های فعال من رو نشون بده">یادآوری‌های فعال</button><button class="quick-action" data-prompt="کارهای زمان‌بندی‌شده من رو نشون بده">کارهای زمان‌بندی‌شده</button>';}
      quick.classList.add('open');
    };
    dock.addEventListener('click',e=>{
      const button=e.target.closest('[data-action]');if(!button)return;const action=button.dataset.action;
      if(action==='chat')window.blackClover?.showChat?.();
      if(action==='mic')document.querySelector('#mic')?.click();
      if(action==='pins'||action==='reminders')showQuick(action);
      if(action==='motions'){document.body.classList.add('avatar-tools');document.querySelector('#motionPick')?.click();setTimeout(()=>document.body.classList.remove('avatar-tools'),800);}
      if(action==='avatar'){document.body.classList.add('avatar-tools');document.querySelector('#avatarPick')?.click();setTimeout(()=>document.body.classList.remove('avatar-tools'),800);}
      if(action==='settings')window.blackClover?.openSettings?.();
    });
    quick.addEventListener('click',e=>{const p=e.target.closest('[data-prompt]')?.dataset.prompt;if(p){quick.classList.remove('open');window.blackClover?.prompt?.(p);}});
    window.blackClover?.onEvent?.(event=>{if(event.type==='reminder'||event.type==='break-reminder'){const btn=dock.querySelector('[data-action="reminders"]');btn?.animate([{transform:'scale(1)'},{transform:'scale(1.16)'},{transform:'scale(1)'}],{duration:700});}});
  }

  if(isChat){
    window.blackClover?.onOpenSettings?.(()=>document.querySelector('#settings')?.click());
    window.blackClover?.onPrefillPrompt?.(payload=>{const text=payload?.text||'';if(!text||!input||!form)return;input.value=text;if(payload.submit)form.dispatchEvent(new Event('submit',{bubbles:true,cancelable:true}));});
  }
});
