import './luxuryUI.css';

const ready = fn => document.readyState === 'loading' ? document.addEventListener('DOMContentLoaded', fn, { once:true }) : fn();

ready(() => {
  document.body.classList.add('luxury-ui');
  const chatShell = document.querySelector('.chat-shell');
  const chat = document.querySelector('.chat');
  const header = chat?.querySelector('header');
  const input = document.querySelector('#input');
  const form = document.querySelector('#form');
  if (!chatShell || !chat || !header) return;

  chatShell.classList.add('chat-hidden');

  const windowActions = document.createElement('div');
  windowActions.className = 'window-actions';
  windowActions.innerHTML = '<button class="window-btn minimize" type="button" title="جمع کردن">−</button><button class="window-btn close" type="button" title="بستن">×</button>';
  header.querySelector('.header-actions')?.append(windowActions);

  const dock = document.createElement('nav');
  dock.className = 'maria-dock';
  dock.setAttribute('aria-label','Maria quick controls');
  dock.innerHTML = `
    <button class="dock-btn dock-core" data-action="chat" data-tip="چت">✦</button>
    <button class="dock-btn" data-action="mic" data-tip="صحبت">◉</button>
    <span class="dock-sep"></span>
    <button class="dock-btn" data-action="pins" data-tip="پین‌ها">⌖</button>
    <button class="dock-btn" data-action="reminders" data-tip="یادآورها">◷</button>
    <button class="dock-btn" data-action="motions" data-tip="حرکت‌ها">◇</button>
    <button class="dock-btn" data-action="avatar" data-tip="کاراکتر">♙</button>
    <button class="dock-btn" data-action="settings" data-tip="تنظیمات">⚙</button>`;
  document.body.append(dock);

  const quick = document.createElement('section');
  quick.className = 'quick-panel';
  quick.innerHTML = '<div class="quick-head"><b>Maria</b><span>دسترسی سریع</span></div><div class="quick-actions"></div>';
  document.body.append(quick);

  let panelMode = '';
  const openChat = (focus=true) => {
    quick.classList.remove('open');
    panelMode = '';
    chatShell.classList.remove('chat-hidden','chat-minimized');
    dock.querySelector('[data-action="chat"]')?.classList.add('active');
    if (focus) setTimeout(() => input?.focus(), 80);
  };
  const closeChat = () => {
    chatShell.classList.add('chat-hidden');
    chatShell.classList.remove('chat-minimized');
    dock.querySelector('[data-action="chat"]')?.classList.remove('active');
  };
  const minimizeChat = () => chatShell.classList.toggle('chat-minimized');

  const ask = text => {
    openChat(false);
    if (!input || !form) return;
    input.value = text;
    form.dispatchEvent(new Event('submit',{bubbles:true,cancelable:true}));
  };

  const showQuick = (mode) => {
    if (panelMode === mode && quick.classList.contains('open')) { quick.classList.remove('open'); panelMode=''; return; }
    panelMode = mode;
    const actions = quick.querySelector('.quick-actions');
    const title = quick.querySelector('.quick-head b');
    if (mode === 'pins') {
      title.textContent = 'پین‌شده‌ها';
      actions.innerHTML = '<button class="quick-action" data-prompt="پین‌های من رو نشون بده">نمایش پین‌ها</button><button class="quick-action" data-prompt="آخرین چیزی که پین کردم رو باز کن">آخرین پین</button>';
    } else {
      title.textContent = 'یادآورها';
      actions.innerHTML = '<button class="quick-action" data-prompt="یادآوری‌های فعال من رو نشون بده">یادآوری‌های فعال</button><button class="quick-action" data-prompt="کارهای زمان‌بندی‌شده من رو نشون بده">کارهای زمان‌بندی‌شده</button>';
    }
    quick.classList.add('open');
  };

  dock.addEventListener('click', e => {
    const button = e.target.closest('[data-action]');
    if (!button) return;
    const action = button.dataset.action;
    if (action === 'chat') chatShell.classList.contains('chat-hidden') ? openChat() : closeChat();
    if (action === 'mic') { openChat(false); document.querySelector('#mic')?.click(); }
    if (action === 'pins' || action === 'reminders') showQuick(action);
    if (action === 'motions') { document.body.classList.add('avatar-tools'); document.querySelector('#motionPick')?.click(); setTimeout(()=>document.body.classList.remove('avatar-tools'),800); }
    if (action === 'avatar') { document.body.classList.add('avatar-tools'); document.querySelector('#avatarPick')?.click(); setTimeout(()=>document.body.classList.remove('avatar-tools'),800); }
    if (action === 'settings') document.querySelector('#settings')?.click();
  });
  quick.addEventListener('click', e => { const p=e.target.closest('[data-prompt]')?.dataset.prompt; if(p) ask(p); });
  windowActions.querySelector('.close').onclick = e => { e.stopPropagation(); closeChat(); };
  windowActions.querySelector('.minimize').onclick = e => { e.stopPropagation(); minimizeChat(); };

  let drag = null;
  header.addEventListener('pointerdown', e => {
    if (e.target.closest('button,input,.header-actions')) return;
    const rect = chatShell.getBoundingClientRect();
    drag = {x:e.clientX,y:e.clientY,left:rect.left,top:rect.top};
    chatShell.style.transform='none';
    chatShell.style.left=`${rect.left}px`;
    chatShell.style.top=`${rect.top}px`;
    header.setPointerCapture?.(e.pointerId);
  });
  header.addEventListener('pointermove', e => {
    if (!drag) return;
    const maxX=Math.max(8,innerWidth-chatShell.offsetWidth-8),maxY=Math.max(8,innerHeight-chatShell.offsetHeight-8);
    chatShell.style.left=`${Math.min(maxX,Math.max(8,drag.left+e.clientX-drag.x))}px`;
    chatShell.style.top=`${Math.min(maxY,Math.max(8,drag.top+e.clientY-drag.y))}px`;
  });
  const stopDrag=()=>{drag=null;};
  header.addEventListener('pointerup',stopDrag);header.addEventListener('pointercancel',stopDrag);

  window.blackClover?.onEvent?.(event => {
    if ((event.type === 'reminder' || event.type === 'break-reminder') && chatShell.classList.contains('chat-hidden')) {
      const btn=dock.querySelector('[data-action="reminders"]');btn?.animate([{transform:'scale(1)'},{transform:'scale(1.16)'},{transform:'scale(1)'}],{duration:700});
    }
  });
});