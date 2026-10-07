import './chatSurfaceV2.css';
import {voice} from './voice.js';

const MODEL_ID='auto';
const MODEL_LABEL='Auto • Maria Runtime V2';
const HISTORY_KEY='blackClover:chatV2History';
const MAX_HISTORY=220;
const $=q=>document.querySelector(q);
const esc=s=>String(s??'').replace(/[&<>"']/g,c=>({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[c]));
const icon=name=>({
  send:'<svg viewBox="0 0 24 24"><path d="m21 3-7 18-4-8-8-4Z"/><path d="m21 3-11 10"/></svg>',
  mic:'<svg viewBox="0 0 24 24"><rect x="9" y="3" width="6" height="11" rx="3"/><path d="M5 11a7 7 0 0 0 14 0M12 18v3"/></svg>',
  sound:'<svg viewBox="0 0 24 24"><path d="M11 5 6 9H3v6h3l5 4Z"/><path d="M15 9a4 4 0 0 1 0 6M18 6a8 8 0 0 1 0 12"/></svg>',
  clear:'<svg viewBox="0 0 24 24"><path d="M4 7h16M9 7V4h6v3M8 7l1 13h6l1-13"/></svg>',
  settings:'<svg viewBox="0 0 24 24"><circle cx="12" cy="12" r="3"/><path d="M19 12a7 7 0 0 0-.1-1.2l2-1.6-2-3.4-2.5 1a7 7 0 0 0-2.2-1.3L14 3h-4l-.2 2.5a7 7 0 0 0-2.2 1.3l-2.5-1-2 3.4 2 1.6A7 7 0 0 0 5 12c0 .4 0 .8.1 1.2l-2 1.6 2 3.4 2.5-1a7 7 0 0 0 2.2 1.3L10 21h4l.2-2.5a7 7 0 0 0 2.2-1.3l2.5 1 2-3.4-2-1.6c.1-.4.1-.8.1-1.2Z"/></svg>',
  minimize:'<svg viewBox="0 0 24 24"><path d="M5 12h14"/></svg>',
  close:'<svg viewBox="0 0 24 24"><path d="m7 7 10 10M17 7 7 17"/></svg>'
}[name]||'');

function loadHistory(){
  try{const x=JSON.parse(localStorage.getItem(HISTORY_KEY)||'[]');return Array.isArray(x)?x.slice(-MAX_HISTORY):[];}catch{return[];}
}
function saveHistory(items){localStorage.setItem(HISTORY_KEY,JSON.stringify(items.slice(-MAX_HISTORY)));}
function now(){return Date.now();}

export async function mountChatSurface(){
  document.body.classList.add('chat-v2','surface-chat');
  if(!window.localStorage.getItem('blackClover:selectedModel'))window.localStorage.setItem('blackClover:selectedModel',MODEL_ID);
  const root=$('#app');
  root.innerHTML=`
  <main class="chat-shell">
    <section class="chat">
      <header class="chat-head">
        <div class="chat-brand">
          <div class="core-orb">✦</div>
          <div><b>Maria • Black Clover</b><span id="status">آماده</span></div>
        </div>
        <div class="chat-head-actions">
          <div class="core-badge"><i></i><span>${MODEL_LABEL}</span></div>
          <button id="clearChat" class="head-btn" title="پاک کردن تاریخچه">${icon('clear')}</button>
          <button id="settings" class="head-btn" title="تنظیمات">${icon('settings')}</button>
          <button id="speaker" class="head-btn" title="صدای پاسخ">${icon('sound')}</button>
          <span class="head-divider"></span>
          <button id="minimizeChat" class="head-btn window-control" title="کمینه">${icon('minimize')}</button>
          <button id="closeChat" class="head-btn window-control close-control" title="بستن چت">${icon('close')}</button>
        </div>
      </header>

      <div id="activity" class="chat-activity" hidden>
        <span class="pulse"></span><span id="activityText">در حال پردازش…</span>
      </div>

      <div id="messages" class="chat-messages">
        <div class="welcome" id="welcome">
          <div class="welcome-mark">✦</div>
          <b>Maria Core آماده است</b>
          <span>فرمان‌های ویندوز مستقیم اجرا می‌شوند؛ سؤال‌ها با Auto Router و fallback هوشمند پاسخ داده می‌شوند.</span>
        </div>
      </div>

      <div id="confirm" class="confirm-box" hidden></div>

      <form id="form" class="composer">
        <button id="mic" class="round-btn" type="button" title="میکروفن">${icon('mic')}</button>
        <div class="composer-field">
          <input id="input" autocomplete="off" spellcheck="false" placeholder="پیام یا دستور بنویس…">
          <small>Enter برای ارسال • می‌توانی پشت‌سرهم پیام بدهی</small>
        </div>
        <button class="send-btn" type="submit" title="ارسال">${icon('send')}</button>
      </form>
    </section>
  </main>

  <div id="setup" class="chat-settings" hidden>
    <section class="setup-panel">
      <header><div><b>تنظیمات Maria Core</b><span>مغز، صدا و وضعیت سیستم</span></div><button id="setupClose">×</button></header>
      <div class="settings-grid">
        <article><small>مغز اصلی</small><b>Auto Router</b><select id="modelSelect" class="model-select"><option value="auto">Auto • Maria V2</option></select><span>Cloud آماده → مدل آنلاین؛ در غیر این صورت fallback محلی</span></article>
        <article><small>فرمان‌های سیستم</small><b>Direct Tools</b><span>بدون انتظار برای مدل</span></article>
        <article><small>وضعیت</small><b id="diagState">در حال بررسی…</b><span id="diagDetail">—</span></article>
      </div>
      <div id="depList"></div>
      <div class="settings-actions">
        <button id="setupRefresh">بررسی دوباره</button>
        <button id="startupToggle">شروع همراه Windows</button>
        <button id="restartAdmin">اجرا با Administrator</button>
      </div>
    </section>
  </div>`;

  const messages=$('#messages'),input=$('#input'),form=$('#form'),status=$('#status'),activity=$('#activity'),activityText=$('#activityText'),confirmBox=$('#confirm');
  const queue=[];let running=false;let streamRow=null,streamBody=null,streamText='';let history=loadHistory();let listening=false;

  const setActivity=text=>{activity.hidden=!text;if(text)activityText.textContent=text;};
  const scroll=()=>messages.scrollTo({top:messages.scrollHeight,behavior:'auto'});

  function bubble(role,text,{persist=true,meta=''}={}){
    $('#welcome')?.remove();
    const row=document.createElement('div');row.className='message-row '+role;
    row.innerHTML=`<small>${role==='user'?'شما':'Maria'}${meta?' • '+esc(meta):''}</small><div class="msg"></div>`;
    row.querySelector('.msg').textContent=String(text||'');
    messages.append(row);requestAnimationFrame(()=>row.classList.add('show'));scroll();
    if(persist){history.push({role,text:String(text||''),at:now()});saveHistory(history);}
    return row;
  }

  function appendStream(delta){
    if(!streamRow){streamRow=bubble('bot','',{persist:false,meta:'در حال پاسخ'});streamBody=streamRow.querySelector('.msg');}
    streamText+=String(delta||'');streamBody.textContent=streamText;scroll();
  }
  function finishStream(finalText){
    if(!streamRow)return false;
    const text=String(finalText||streamText||'').trim();streamBody.textContent=text;
    history.push({role:'bot',text,at:now()});saveHistory(history);
    streamRow=null;streamBody=null;streamText='';return true;
  }

  for(const item of history){if(item?.text)bubble(item.role==='user'?'user':'bot',item.text,{persist:false});}

  function showConfirm(id,text){
    confirmBox.hidden=false;confirmBox.innerHTML=`<div><b>تأیید لازم</b><span>${esc(text)}</span></div><div class="confirm-actions"><button data-no>انجام نده</button><button data-yes>تأیید و ادامه</button></div>`;
    const done=async approved=>{confirmBox.hidden=true;setActivity('در حال ادامه…');try{const r=await window.blackClover.confirm(id,approved);bubble('bot',r?.text||'انجام شد.');if(r?.requiresConfirmation)showConfirm(r.confirmationId,r.text);}finally{setActivity('');}};
    confirmBox.querySelector('[data-yes]').onclick=()=>done(true);confirmBox.querySelector('[data-no]').onclick=()=>done(false);
  }

  async function pump(){
    if(running)return;running=true;
    try{
      while(queue.length){
        const text=queue.shift();const started=performance.now();
        setActivity(queue.length?`در حال اجرا • ${queue.length} پیام در صف`:'در حال پردازش…');status.textContent='در حال انجام…';
        try{
          const selectedModel=window.localStorage.getItem('blackClover:selectedModel')||MODEL_ID;
          const response=await window.blackClover.chat(text,selectedModel==='auto'?{}:{modelOverride:selectedModel});
          const ms=Math.round(performance.now()-started),hadStream=Boolean(streamRow);
          if(hadStream)finishStream(response?.text);else bubble('bot',response?.text||'جوابی دریافت نشد.',{meta:response?.direct?`${ms}ms • مستقیم`:`${(ms/1000).toFixed(1)}s`});
          if(response?.requiresConfirmation)showConfirm(response.confirmationId,response.text);
          if(response?.text&&voice.enabled)voice.speak(response.text);
          status.textContent=response?.brain?.model?`آماده • ${response.brain.model}`:'آماده';
        }catch(error){
          if(streamRow){streamRow.remove();streamRow=null;streamBody=null;streamText='';}
          bubble('bot','خطا: '+(error?.message||error));status.textContent='خطا';
        }
      }
    }finally{running=false;setActivity('');if(!voice.speaking)status.textContent='آماده';input.focus();}
  }

  function enqueue(text){
    text=String(text||'').trim();if(!text)return;
    voice.stop?.('user-input');bubble('user',text);queue.push(text);pump();
  }

  form.onsubmit=e=>{e.preventDefault();const text=input.value;input.value='';enqueue(text);};

  $('#clearChat').onclick=()=>{
    history=[];saveHistory(history);messages.innerHTML='<div class="welcome" id="welcome"><div class="welcome-mark">✦</div><b>تاریخچه پاک شد</b><span>Maria Core آماده است.</span></div>';
  };

  function syncSpeaker(){const b=$('#speaker');b.classList.toggle('off',!voice.enabled);b.title=voice.enabled?'صدای پاسخ روشن است':'صدای پاسخ خاموش است';}
  syncSpeaker();$('#speaker').onclick=()=>{voice.setEnabled(!voice.enabled);syncSpeaker();};voice.addEventListener?.('enabled',syncSpeaker);

  async function startMic(){
    if(listening)return;
    voice.stop?.('listening');
    const Rec=window.SpeechRecognition||window.webkitSpeechRecognition;
    if(Rec){
      const rec=new Rec();rec.lang='fa-IR';rec.interimResults=false;rec.continuous=false;listening=true;$('#mic').classList.add('active');status.textContent='گوش می‌دهم…';window.blackClover.setUiState?.('listening','Listening • در حال شنیدن').catch(()=>{});
      rec.onresult=e=>{const t=e.results?.[0]?.[0]?.transcript;if(t)enqueue(t);};
      rec.onerror=e=>{bubble('bot','میکروفن: '+(e.error||'خطا'));window.blackClover.setUiState?.('error','Voice • خطای میکروفن').catch(()=>{});};
      rec.onend=()=>{listening=false;$('#mic').classList.remove('active');status.textContent='آماده';window.blackClover.setUiState?.('online','Online • آماده').catch(()=>{});};
      rec.start();return;
    }
    bubble('bot','Speech Recognition مرورگر روی این سیستم آماده نیست.');
  }
  $('#mic').onclick=()=>startMic().catch(e=>bubble('bot','میکروفن آماده نشد: '+(e.message||e)));

  async function refreshModels(){
    const select=$('#modelSelect');if(!select)return;
    try{
      const catalog=await window.blackClover.modelCatalog();
      select.innerHTML='';
      for(const item of catalog||[]){
        const option=document.createElement('option');
        option.value=item.id||'auto';
        option.disabled=item.available===false;
        const state=item.id==='auto'?'خودکار':item.available===false?' • نیاز به اتصال':'';
        option.textContent=`${item.label||item.id||'Model'}${state}`;
        select.append(option);
      }
      if(!select.options.length)select.innerHTML='<option value="auto">Auto • Maria V2</option>';
      const selected=window.localStorage.getItem('blackClover:selectedModel')||MODEL_ID;
      select.value=[...select.options].some(o=>o.value===selected&&!o.disabled)?selected:'auto';
      window.localStorage.setItem('blackClover:selectedModel',select.value);
      select.onchange=()=>window.localStorage.setItem('blackClover:selectedModel',select.value);
    }catch{
      select.innerHTML='<option value="auto">Auto • Maria V2</option>';
      select.value='auto';
    }
  }

  async function refreshSettings(){
    const state=$('#diagState'),detail=$('#diagDetail');state.textContent='در حال بررسی…';
    try{
      const [d]=await Promise.all([window.blackClover.diagnostics(),refreshModels()]);
      state.textContent=d.dependencies?.recommendedReady?'آماده':'نیاز به تکمیل';
      detail.textContent=`${d.admin?'Administrator':'Standard'} • ${d.speech?.localStt?'STT محلی':'STT جایگزین'}`;
      const st=await window.blackClover.getStartup();
      $('#startupToggle').textContent=st.openAtLogin?'شروع همراه Windows: روشن':'شروع همراه Windows: خاموش';
    }catch(e){state.textContent='خطا';detail.textContent=String(e.message||e);}
  }
  $('#settings').onclick=()=>{$('#setup').hidden=false;refreshSettings();};$('#setupClose').onclick=()=>{$('#setup').hidden=true;};$('#setupRefresh').onclick=refreshSettings;
  $('#closeChat').onclick=()=>window.blackClover.hideChat();$('#minimizeChat').onclick=()=>window.blackClover.minimizeChat();
  $('#restartAdmin').onclick=()=>window.blackClover.restartAsAdmin().catch(e=>bubble('bot',String(e.message||e)));
  $('#startupToggle').onclick=async()=>{const s=await window.blackClover.getStartup();await window.blackClover.setStartup(!s.openAtLogin);await refreshSettings();};

  window.blackClover.onEvent?.(event=>{
    if(event.type==='stream'){appendStream(event.delta||'');return;}
    if(event.type==='thinking'){setActivity('در حال فکر کردن…');return;}
    if(event.type==='tool'){setActivity('در حال اجرای '+event.name+'…');status.textContent='اجرای '+event.name;return;}
    if(event.type==='reminder'||event.type==='break-reminder'){const t=event.text||event.item?.message;if(t)bubble('bot',t);}
  });
  window.blackClover.onFocusInput?.(()=>{input.focus();input.select();});
  window.blackClover.onOpenSettings?.(payload=>{$('#setup').hidden=false;refreshSettings();if(payload?.section==='voice')setTimeout(()=>document.querySelector('#voicePersonalityPanel')?.scrollIntoView({behavior:'smooth',block:'start'}),180);});
  window.blackClover.onPrefillPrompt?.(payload=>{const t=payload?.text||'';if(!t)return;input.value=t;if(payload.submit){const v=input.value;input.value='';enqueue(v);}});

  input.focus();
}
