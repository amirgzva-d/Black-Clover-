import './chatSurfaceV2.css';
import {voice} from './voice.js';
import {marked} from 'marked';
import DOMPurify from 'dompurify';

const $=q=>document.querySelector(q);
const esc=s=>String(s??'').replace(/[&<>"']/g,c=>({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[c]));
const LEGACY_HISTORY_KEY='blackClover:chatV2History';
const MODEL_KEY='blackClover:selectedModel';
const V3_KEY='blackClover:chatV3Ready';
const MODEL_MIGRATION_KEY='blackClover:chatV5AutoModel';
const icon=name=>({
  menu:'<svg viewBox="0 0 24 24"><path d="M4 7h16M4 12h16M4 17h16"/></svg>',
  plus:'<svg viewBox="0 0 24 24"><path d="M12 5v14M5 12h14"/></svg>',
  search:'<svg viewBox="0 0 24 24"><circle cx="11" cy="11" r="6"/><path d="m16 16 4 4"/></svg>',
  folder:'<svg viewBox="0 0 24 24"><path d="M3 6h7l2 2h9v10H3z"/></svg>',
  paperclip:'<svg viewBox="0 0 24 24"><path d="m9 12 6-6a4 4 0 0 1 6 6l-8 8a6 6 0 0 1-8-8l8-8"/></svg>',
  globe:'<svg viewBox="0 0 24 24"><circle cx="12" cy="12" r="9"/><path d="M3 12h18M12 3c2.3 2.5 3.4 5.5 3.4 9S14.3 18.5 12 21M12 3C9.7 5.5 8.6 8.5 8.6 12S9.7 18.5 12 21"/></svg>',
  work:'<svg viewBox="0 0 24 24"><rect x="4" y="6" width="16" height="13" rx="2"/><path d="M9 6V4h6v2M4 11h16"/></svg>',
  send:'<svg viewBox="0 0 24 24"><path d="m21 3-7 18-4-8-8-4Z"/><path d="m21 3-11 10"/></svg>',
  stop:'<svg viewBox="0 0 24 24"><rect x="7" y="7" width="10" height="10" rx="2"/></svg>',
  mic:'<svg viewBox="0 0 24 24"><rect x="9" y="3" width="6" height="11" rx="3"/><path d="M5 11a7 7 0 0 0 14 0M12 18v3"/></svg>',
  sound:'<svg viewBox="0 0 24 24"><path d="M11 5 6 9H3v6h3l5 4Z"/><path d="M15 9a4 4 0 0 1 0 6M18 6a8 8 0 0 1 0 12"/></svg>',
  copy:'<svg viewBox="0 0 24 24"><rect x="8" y="8" width="11" height="11" rx="2"/><path d="M16 8V5H5v11h3"/></svg>',
  edit:'<svg viewBox="0 0 24 24"><path d="m4 20 4-1 11-11-3-3L5 16z"/><path d="m14 7 3 3"/></svg>',
  trash:'<svg viewBox="0 0 24 24"><path d="M4 7h16M9 7V4h6v3M8 7l1 13h6l1-13"/></svg>',
  retry:'<svg viewBox="0 0 24 24"><path d="M20 11a8 8 0 1 0-2 5"/><path d="M20 4v7h-7"/></svg>',
  branch:'<svg viewBox="0 0 24 24"><circle cx="6" cy="5" r="2"/><circle cx="18" cy="7" r="2"/><circle cx="6" cy="19" r="2"/><path d="M6 7v10M8 11h5a5 5 0 0 0 5-2"/></svg>',
  pin:'<svg viewBox="0 0 24 24"><path d="m9 4 6 0 1 5 3 3H5l3-3z"/><path d="M12 12v8"/></svg>',
  share:'<svg viewBox="0 0 24 24"><circle cx="18" cy="5" r="2"/><circle cx="6" cy="12" r="2"/><circle cx="18" cy="19" r="2"/><path d="m8 11 8-5M8 13l8 5"/></svg>',
  export:'<svg viewBox="0 0 24 24"><path d="M12 3v12M8 11l4 4 4-4"/><path d="M5 20h14"/></svg>',
  settings:'<svg viewBox="0 0 24 24"><circle cx="12" cy="12" r="3"/><path d="M19 12a7 7 0 0 0-.1-1.2l2-1.6-2-3.4-2.5 1a7 7 0 0 0-2.2-1.3L14 3h-4l-.2 2.5a7 7 0 0 0-2.2 1.3l-2.5-1-2 3.4 2 1.6A7 7 0 0 0 5 12c0 .4 0 .8.1 1.2l-2 1.6 2 3.4 2.5-1a7 7 0 0 0 2.2 1.3L10 21h4l.2-2.5a7 7 0 0 0 2.2-1.3l2.5 1 2-3.4-2-1.6c.1-.4.1-.8.1-1.2Z"/></svg>',
  minimize:'<svg viewBox="0 0 24 24"><path d="M5 12h14"/></svg>',
  close:'<svg viewBox="0 0 24 24"><path d="m7 7 10 10M17 7 7 17"/></svg>'
}[name]||'');

marked.setOptions({gfm:true,breaks:true});
const markdown=text=>DOMPurify.sanitize(marked.parse(String(text||'')),{USE_PROFILES:{html:true}});
const safeHttp=raw=>{try{const u=new URL(String(raw||''));return ['http:','https:'].includes(u.protocol)?u.href:'';}catch{return'';}};
const sourceHtml=message=>{const sources=Array.isArray(message?.meta?.sources)?message.meta.sources:[],rows=sources.map((s,i)=>{const url=safeHttp(s?.url);return url?`<button class="source-chip" data-source-url="${esc(url)}"><span>${i+1}</span>${esc(s?.title||new URL(url).hostname)}</button>`:'';}).filter(Boolean);return rows.length?`<div class="message-sources"><small>منابع</small>${rows.join('')}</div>`:'';};
const attachmentHtml=message=>{const items=Array.isArray(message?.meta?.attachments)?message.meta.attachments:[];return items.length?`<div class="message-attachments">${items.map(x=>`<span class="attachment-chip">${icon('paperclip')}<b>${esc(x.name||'فایل')}</b></span>`).join('')}</div>`:'';};
const state={currentId:null,conversation:null,chats:[],folders:[],folderFilter:'all',search:'',model:'auto',web:false,depth:'auto',sidebar:true,attachments:[]};
const queue=[];let running=false,listening=false,streamRow=null,streamBody=null,streamText='',ignoreCurrent=false;

function toast(text){
  const el=$('#toast');if(!el)return;el.textContent=text;el.classList.add('show');clearTimeout(toast.t);toast.t=setTimeout(()=>el.classList.remove('show'),1800);
}
function setActivity(text=''){const el=$('#activity');if(!el)return;el.hidden=!text;$('#activityText').textContent=text||'';}
function scrollBottom(){const m=$('#messages');if(m)m.scrollTo({top:m.scrollHeight,behavior:'auto'});}
function autoGrow(){const el=$('#input');if(!el)return;el.style.height='auto';el.style.height=Math.min(180,Math.max(44,el.scrollHeight))+'px';}
function renderPendingAttachments(){const tray=$('#attachmentTray');if(!tray)return;tray.innerHTML=state.attachments.map((x,i)=>`<span class="pending-file">${icon('paperclip')}<b>${esc(x.name||'فایل')}</b><button type="button" data-remove-attachment="${i}">×</button></span>`).join('');tray.hidden=!state.attachments.length;}
function currentUserBefore(index){for(let i=index-1;i>=0;i--)if(state.conversation?.messages?.[i]?.role==='user')return state.conversation.messages[i];return null;}

function messageActions(message,index){
  const common=`
    <button data-msg-action="copy" title="کپی">${icon('copy')}</button>
    <button data-msg-action="speak" title="خواندن با صدا">${icon('sound')}</button>
    <button data-msg-action="branch" title="ساخت چت جدید از اینجا">${icon('branch')}</button>
    <button data-msg-action="edit" title="ویرایش">${icon('edit')}</button>
    <button data-msg-action="delete" title="حذف">${icon('trash')}</button>`;
  const retry=message.role==='assistant'&&currentUserBefore(index)?`<button data-msg-action="retry" title="پاسخ دوباره">${icon('retry')}</button>`:'';
  return retry+common;
}

function renderMessages(){
  const box=$('#messages');if(!box)return;
  const rows=state.conversation?.messages||[];
  if(!rows.length){
    box.innerHTML=`<section class="empty-chat"><div class="maria-mark">✦</div><h2>چطور می‌تونم کمکت کنم؟</h2><p>سؤال بپرس، تحقیق بخواه یا چند کار را در یک پیام بگو. Maria ادامه همین گفتگو را به خاطر می‌سپارد.</p><div class="starter-grid"><button data-starter="در مورد یک موضوع جدید تحقیق عمیق کن و با منبع توضیح بده">تحقیق عمیق</button><button data-starter="این مشکل را مرحله به مرحله تحلیل کن و بهترین راه حل را بده">حل مسئله</button><button data-starter="چند کار مختلف برای کامپیوترم دارم؛ یکی یکی انجام بده و نتیجه هر مرحله را بررسی کن">اجرای چندکار</button></div></section>`;
    return;
  }
  box.innerHTML=rows.map((m,i)=>`
    <article class="message-row ${m.role}" data-message-id="${esc(m.id)}" data-index="${i}">
      <div class="message-avatar">${m.role==='user'?'ش':'✦'}</div>
      <div class="message-main">
        <div class="message-meta"><b>${m.role==='user'?'شما':'Maria'}</b>${m.editedAt?'<span>ویرایش‌شده</span>':''}</div>
        ${attachmentHtml(m)}
        <div class="message-content">${markdown(m.text)}</div>
        ${sourceHtml(m)}
        <div class="message-tools">${messageActions(m,i)}</div>
      </div>
    </article>`).join('');
  scrollBottom();
}

function renderSidebar(){
  const list=$('#chatList');if(!list)return;
  const rows=state.chats||[];
  list.innerHTML=rows.length?rows.map(c=>`
    <div class="chat-item ${c.id===state.currentId?'active':''}" data-chat-id="${esc(c.id)}">
      <button class="chat-open" title="${esc(c.title)}"><span class="chat-pin">${c.pinned?'◆':''}</span><span class="chat-title">${esc(c.title)}</span></button>
      <div class="chat-item-actions">
        <button data-chat-action="pin" title="پین">${c.pinned?'◆':'◇'}</button>
        <button data-chat-action="rename" title="تغییر نام">✎</button>
        <button data-chat-action="delete" title="حذف">×</button>
      </div>
    </div>`).join(''):'<div class="side-empty">گفتگویی پیدا نشد</div>';
  const folders=$('#folderList');
  folders.innerHTML=state.folders.map(f=>`<div class="folder-wrap"><button class="folder-row ${state.folderFilter===f.id?'active':''}" data-folder-id="${esc(f.id)}">${icon('folder')}<span>${esc(f.name)}</span></button><button class="folder-rename" data-folder-rename="${esc(f.id)}" title="تغییر نام پروژه">✎</button><button class="folder-delete" data-folder-delete="${esc(f.id)}" title="حذف پروژه">×</button></div>`).join('')||'<div class="side-empty project-empty">هنوز پروژه‌ای نیست</div>';
  const folderSelect=$('#folderSelect');
  if(folderSelect){
    folderSelect.innerHTML='<option value="">بدون پروژه</option>'+state.folders.map(f=>`<option value="${esc(f.id)}">${esc(f.name)}</option>`).join('');
    folderSelect.value=state.conversation?.folderId||'';
  }
}

function updateHeader(){
  const c=state.conversation;
  $('#chatTitle').textContent=c?.title||'گفتگوی جدید';
  $('#pinChat').classList.toggle('active',Boolean(c?.pinned));
  $('#webToggle').classList.toggle('active',state.web);
  $('#webToggle').innerHTML=icon('globe')+`<span>${state.web?'وب روشن':'وب'}</span>`;
}

async function refreshList(){
  const filter={query:state.search};
  if(state.folderFilter!=='all')filter.folderId=state.folderFilter||null;
  state.chats=await window.blackClover.listChats(filter);
  state.folders=await window.blackClover.listChatFolders();
  renderSidebar();
}
async function loadConversation(id){
  const c=await window.blackClover.getChat(id);if(!c)return false;
  state.currentId=c.id;state.conversation=c;renderMessages();updateHeader();await refreshList();return true;
}
async function newChat(folderId=null){
  const c=await window.blackClover.createChat({folderId});state.currentId=c.id;state.conversation=c;state.search='';$('#chatSearch').value='';await refreshList();renderMessages();updateHeader();$('#input').focus();
}
async function ensureCurrent(){if(state.currentId&&state.conversation)return;const rows=await window.blackClover.listChats({});if(rows.length)await loadConversation(rows[0].id);else await newChat();}

async function migrateLegacy(){
  if(localStorage.getItem(V3_KEY)==='1')return;
  const old=(()=>{try{return JSON.parse(localStorage.getItem(LEGACY_HISTORY_KEY)||'[]');}catch{return[];}})();
  const existing=await window.blackClover.listChats({});
  if(!existing.length&&Array.isArray(old)&&old.some(x=>x?.text)){
    const c=await window.blackClover.createChat({title:'گفتگوی قبلی'});
    for(const item of old.slice(-220))if(item?.text)await window.blackClover.appendChatMessage(c.id,{role:item.role==='user'?'user':'assistant',text:item.text,at:item.at});
  }
  localStorage.setItem(V3_KEY,'1');
}

function addStream(delta){
  if(ignoreCurrent)return;
  if(!streamRow){
    const box=$('#messages');$('#messages .empty-chat')?.remove();
    streamRow=document.createElement('article');streamRow.className='message-row assistant streaming';
    streamRow.innerHTML='<div class="message-avatar">✦</div><div class="message-main"><div class="message-meta"><b>Maria</b><span>در حال نوشتن…</span></div><div class="message-content"></div></div>';
    box.append(streamRow);streamBody=streamRow.querySelector('.message-content');
  }
  streamText+=String(delta||'');streamBody.innerHTML=markdown(streamText);scrollBottom();
}
function clearStream(){streamRow?.remove();streamRow=null;streamBody=null;streamText='';}

async function sendOne(item){
  const text=String(item?.text??item??''),attachments=Array.isArray(item?.attachments)?item.attachments:[];
  await ensureCurrent();ignoreCurrent=false;const started=performance.now();
  setActivity('در حال فکر کردن…');$('#status').textContent='در حال پاسخ…';
  const model=state.model||'auto',profile=state.depth==='deep'?'complex':state.depth==='fast'?'chat':null;
  try{
    const response=await window.blackClover.chat(text,{conversationId:state.currentId,modelOverride:model,profile,webSearch:state.web,attachments});
    if(ignoreCurrent)return;
    clearStream();await loadConversation(state.currentId);
    const ms=Math.round(performance.now()-started),brain=response?.brain||{};
    $('#status').textContent=brain.model?`آماده • ${brain.model}`:'آماده';
    $('#latency').textContent=ms<1000?`${ms}ms`:`${(ms/1000).toFixed(1)}s`;
    if(response?.requiresConfirmation)showConfirm(response.confirmationId,response.text);
    if(response?.text&&voice.enabled&&$('#autoSpeak').checked)voice.speak(response.text);
  }catch(error){
    clearStream();toast('خطا: '+(error?.message||error));$('#status').textContent='خطا';
  }finally{setActivity('');await refreshList();}
}

async function pump(){
  if(running)return;running=true;syncSendButton();
  try{while(queue.length){const item=queue.shift();await sendOne(item);}}finally{running=false;syncSendButton();if(!voice.speaking)$('#status').textContent='آماده';$('#input').focus();}
}
function enqueue(text){
  text=String(text||'').trim();const attachments=[...state.attachments];if(!text&&!attachments.length)return;
  if(!text&&attachments.length)text='این فایل را بررسی کن.';
  voice.stop?.('user-input');queue.push({text,attachments});state.attachments=[];renderPendingAttachments();$('#input').value='';autoGrow();
  if(state.conversation){const temp={id:'temp-'+Date.now(),role:'user',text,at:Date.now(),meta:{attachments}};state.conversation={...state.conversation,messages:[...(state.conversation.messages||[]),temp]};renderMessages();}
  pump();
}
function syncSendButton(){
  const btn=$('#send');if(!btn)return;btn.innerHTML=running?icon('stop'):icon('send');btn.title=running?'توقف':'ارسال';btn.classList.toggle('stop',running);
}

async function replayFrom(messageId){
  ignoreCurrent=false;setActivity('در حال ساخت پاسخ جدید…');clearStream();
  try{await window.blackClover.replayMessage({conversationId:state.currentId,messageId,model:state.model||'auto',profile:state.depth==='deep'?'complex':null,provider:'auto'});await loadConversation(state.currentId);}catch(e){toast('بازسازی پاسخ ناموفق بود: '+(e.message||e));}finally{setActivity('');}
}
function editMessage(message,row){
  const body=row.querySelector('.message-content'),actions=row.querySelector('.message-tools');
  const area=document.createElement('textarea');area.className='inline-edit';area.value=message.text;body.replaceChildren(area);
  actions.innerHTML='<button data-edit-save>ذخیره</button><button data-edit-cancel>لغو</button>';area.focus();area.setSelectionRange(area.value.length,area.value.length);
  actions.querySelector('[data-edit-cancel]').onclick=()=>renderMessages();
  actions.querySelector('[data-edit-save]').onclick=async()=>{
    const text=area.value.trim();if(!text)return;
    await window.blackClover.updateChatMessage(state.currentId,message.id,{text});
    if(message.role==='user')await replayFrom(message.id);else await loadConversation(state.currentId);
  };
}
async function deleteMessage(message){
  if(!confirm('این پیام حذف شود؟'))return;await window.blackClover.removeChatMessage(state.currentId,message.id);await loadConversation(state.currentId);
}
async function branchFrom(message){const c=await window.blackClover.branchChat(state.currentId,message.id);await loadConversation(c.id);toast('شاخه جدید ساخته شد');}

function showConfirm(id,text){
  const box=$('#confirm');box.hidden=false;box.innerHTML=`<div><b>تأیید لازم</b><span>${esc(text)}</span></div><div><button data-no>انجام نده</button><button data-yes>تأیید و ادامه</button></div>`;
  const done=async approved=>{box.hidden=true;setActivity('در حال ادامه…');try{const r=await window.blackClover.confirm(id,approved);await loadConversation(state.currentId);if(r?.requiresConfirmation)showConfirm(r.confirmationId,r.text);}finally{setActivity('');}};
  box.querySelector('[data-yes]').onclick=()=>done(true);box.querySelector('[data-no]').onclick=()=>done(false);
}

async function populateModels(){
  const select=$('#modelSelect');
  try{
    const catalog=await window.blackClover.modelCatalog();select.innerHTML=catalog.filter(x=>x.available||x.id==='auto').map(x=>`<option value="${esc(x.id)}">${esc(x.label)}</option>`).join('');
    const saved=localStorage.getItem(MODEL_KEY);if(localStorage.getItem(MODEL_MIGRATION_KEY)!=='1'||!catalog.some(x=>x.id===saved)){localStorage.setItem(MODEL_KEY,'auto');localStorage.setItem(MODEL_MIGRATION_KEY,'1');}
    state.model=localStorage.getItem(MODEL_KEY)||'auto';select.value=state.model;
  }catch{select.innerHTML='<option value="auto">Auto • Maria</option>';state.model='auto';}
}
async function refreshBrainSettings(){
  try{
    const [s,cg]=await Promise.all([window.blackClover.brainSettings(),window.blackClover.chatgptStatus?.().catch(()=>null)]),root=$('#providerList'),session=cg?.session||{status:'disconnected',sharing:false};
    const chatgptUsable=session.status==='connected'&&session.sharing&&!session.error,chatgptLabel=session.error?'اتصال انجام شده • استفاده از پلن برای این اتصال در دسترس نیست':session.status==='connected'?(chatgptUsable?'متصل و آماده':'متصل • دسترسی مدل فعال نیست'):session.status==='connecting'?'در حال اتصال…':'متصل نیست';
    root.innerHTML=`<article class="provider-card featured"><div><b>ChatGPT • OpenAI</b><span>اتصال رسمی حساب ChatGPT؛ برای تحلیل و سؤال‌های سنگین در حالت Auto.</span></div><i class="${chatgptUsable?'ok':''}">${esc(chatgptLabel)}</i></article>`+
      s.providers.map(p=>`<article class="provider-card" data-provider="${esc(p.provider)}"><div><b>${esc(p.label)}</b><span>${esc(p.note||'')}</span></div><div class="provider-side"><i class="${p.configured?'ok':''}">${p.configured?'متصل':'اختیاری'}</i>${['groq','gemini','openrouter','qwen'].includes(p.provider)?`<button data-provider-config="${esc(p.provider)}">${p.configured?'ویرایش':'اتصال'}</button>`:''}${p.configured&&p.provider!=='github'?`<button data-provider-remove="${esc(p.provider)}">حذف</button>`:''}</div></article>`).join('');
    const chatBtn=$('#chatgptConnect');chatBtn.dataset.connected=session.status==='connected'?'1':'0';chatBtn.dataset.sharing=chatgptUsable?'1':'0';chatBtn.textContent=session.status==='connected'?(chatgptUsable?'قطع اتصال ChatGPT':'اتصال دوباره ChatGPT'):'Continue with ChatGPT';
    $('#chatgptUsage').hidden=session.status!=='connected';
    $('#githubBrain').textContent=s.githubCli?.authenticated?'GitHub Models متصل است':'اتصال رایگان GitHub Models';
  }catch{}
}

async function startMic(){
  if(listening)return;voice.stop?.('listening');
  const Rec=window.SpeechRecognition||window.webkitSpeechRecognition;
  if(!Rec){toast('Speech Recognition مرورگر در دسترس نیست');return;}
  const rec=new Rec();rec.lang='fa-IR';rec.interimResults=false;rec.continuous=false;listening=true;$('#mic').classList.add('active');$('#status').textContent='گوش می‌دهم…';window.blackClover.setUiState?.('listening','Listening • در حال شنیدن').catch(()=>{});
  rec.onresult=e=>{const t=e.results?.[0]?.[0]?.transcript;if(t)enqueue(t);};
  rec.onerror=e=>{toast('میکروفن: '+(e.error||'خطا'));window.blackClover.setUiState?.('error','Voice • خطای میکروفن').catch(()=>{});};
  rec.onend=()=>{listening=false;$('#mic').classList.remove('active');$('#status').textContent='آماده';window.blackClover.setUiState?.('online','Online • آماده').catch(()=>{});};rec.start();
}

export async function mountChatSurface(){
  document.body.classList.add('chat-v3','surface-chat');
  const root=$('#app');
  root.innerHTML=`
  <div class="pro-shell">
    <aside id="sidebar" class="sidebar">
      <div class="sidebar-top">
        <div class="app-switcher"><span class="app-logo">✦</span><div><b>MARIA</b><small>Chat</small></div></div>
        <button id="newChat" class="new-chat" title="گفتگوی جدید">${icon('plus')}<span>گفتگوی جدید</span></button>
        <label class="search-box">${icon('search')}<input id="chatSearch" placeholder="جستجو"></label>
      </div>
      <div class="side-scroll">
        <div class="side-section-head"><button id="allChats" class="side-heading-button">گفتگوهای اخیر</button></div>
        <div id="chatList" class="chat-list"></div>
        <div class="side-section-head project-head"><span>پروژه‌ها</span><button id="newFolder" title="پروژه / پوشه جدید">${icon('plus')}</button></div>
        <div id="folderList" class="folder-list"></div>
      </div>
      <div class="side-foot">
        <button id="settings">${icon('settings')}<span>تنظیمات</span></button>
      </div>
    </aside>

    <section class="workspace">
      <header class="topbar">
        <div class="top-left">
          <button id="sidebarToggle" class="icon-btn" title="فهرست">${icon('menu')}</button>
          <div class="mode-switch">
            <button id="chatMode" class="mode-tab active">Chat</button>
            <button id="workMode" class="mode-tab">${icon('work')}<span>Work</span></button>
          </div>
          <select id="modelSelect" class="model-select" title="انتخاب مدل"><option value="auto">Auto • Maria</option></select>
        </div>
        <div class="top-actions">
          <button id="shareChat" class="share-btn" title="اشتراک">${icon('share')}<span>اشتراک</span></button>
          <button id="pinChat" class="icon-btn" title="پین">${icon('pin')}</button>
          <button id="exportChat" class="icon-btn" title="ذخیره">${icon('export')}</button>
          <button id="minimizeChat" class="icon-btn window-btn">${icon('minimize')}</button>
          <button id="closeChat" class="icon-btn window-btn close">${icon('close')}</button>
        </div>
      </header>

      <div class="chat-subbar">
        <button id="chatTitle" class="title-btn">گفتگوی جدید</button>
        <div class="chat-submeta"><span id="status">آماده</span><small id="latency"></small><select id="folderSelect" title="پروژه / پوشه"><option value="">بدون پروژه</option></select></div>
      </div>

      <div id="activity" class="activity" hidden><span class="pulse"></span><span id="activityText"></span></div>
      <section id="messages" class="messages"></section>
      <div id="confirm" class="confirm-box" hidden></div>

      <footer class="composer-wrap">
        <form id="form" class="composer">
          <div id="attachmentTray" class="attachment-tray" hidden></div>
          <textarea id="input" rows="1" placeholder="پیامی برای Maria بنویس…"></textarea>
          <div class="composer-bottom">
            <div class="composer-tools">
              <button id="attach" type="button" class="round-tool" title="پیوست فایل">${icon('paperclip')}</button>
              <button id="webToggle" type="button" class="tool-pill">${icon('globe')}<span>وب</span></button>
              <select id="depthSelect" class="depth-select" title="عمق پاسخ"><option value="auto">خودکار</option><option value="fast">سریع</option><option value="deep">عمیق</option></select>
              <label class="voice-toggle" title="خواندن پاسخ"><input id="autoSpeak" type="checkbox">${icon('sound')}</label>
            </div>
            <div class="composer-actions">
              <button id="mic" type="button" class="round-tool" title="صدا">${icon('mic')}</button>
              <button id="send" type="submit" class="send-btn">${icon('send')}</button>
            </div>
          </div>
        </form>
        <small class="composer-hint">Maria ممکن است اشتباه کند؛ برای کارهای مهم نتیجه را بررسی کن.</small>
      </footer>
    </section>
  </div>
  <div id="toast" class="toast"></div>
  <div id="setup" class="settings-overlay" hidden>
    <section class="settings-panel">
      <header><div><b>تنظیمات چت و مغز</b><span>Maria به‌صورت خودکار بهترین مسیر آماده را انتخاب می‌کند.</span></div><button id="setupClose">×</button></header>
      <div class="settings-callout"><b>Smart Brain</b><span>فرمان‌های ساده مستقیم اجرا می‌شوند؛ سؤال‌های سنگین به Provider قوی آنلاین می‌روند و در صورت خطا Local جایگزین می‌شود.</span></div>
      <div id="providerList" class="provider-list"></div>
      <div class="settings-actions"><button id="chatgptConnect">Continue with ChatGPT</button><button id="chatgptUsage" hidden>مدیریت مصرف ChatGPT</button><button id="githubBrain">اتصال رایگان GitHub Models</button><button id="setupRefresh">بررسی دوباره</button></div>
    </section>
  </div>`;

  await migrateLegacy();await populateModels();await refreshList();await ensureCurrent();updateHeader();renderMessages();renderPendingAttachments();
  if(state.currentId)await loadConversation(state.currentId);

  $('#newChat').onclick=()=>newChat(state.folderFilter==='all'?null:state.folderFilter);
  $('#allChats').onclick=async()=>{state.folderFilter='all';await refreshList();};
  $('#newFolder').onclick=async()=>{const name=prompt('نام پوشه جدید');if(name?.trim()){await window.blackClover.createChatFolder(name.trim());await refreshList();}};
  $('#chatSearch').oninput=async e=>{state.search=e.target.value;await refreshList();};
  $('#folderList').onclick=async e=>{
    const rename=e.target.closest('[data-folder-rename]');if(rename){e.stopPropagation();const f=state.folders.find(x=>x.id===rename.dataset.folderRename),name=prompt('نام جدید پوشه',f?.name||'');if(name?.trim()){await window.blackClover.renameChatFolder(rename.dataset.folderRename,name.trim());await refreshList();}return;}
    const del=e.target.closest('[data-folder-delete]');if(del){e.stopPropagation();if(confirm('پوشه حذف شود؟ گفتگوها حذف نمی‌شوند.')){await window.blackClover.removeChatFolder(del.dataset.folderDelete);state.folderFilter='all';await refreshList();}return;}
    const row=e.target.closest('[data-folder-id]');if(row){state.folderFilter=row.dataset.folderId;await refreshList();}
  };
  $('#chatList').onclick=async e=>{
    const row=e.target.closest('[data-chat-id]');if(!row)return;const id=row.dataset.chatId,action=e.target.closest('[data-chat-action]')?.dataset.chatAction;
    if(!action){await loadConversation(id);return;}
    const item=state.chats.find(x=>x.id===id);if(!item)return;
    if(action==='pin'){await window.blackClover.updateChat(id,{pinned:!item.pinned});await refreshList();if(id===state.currentId)await loadConversation(id);}
    if(action==='rename'){const name=prompt('نام گفتگو',item.title);if(name?.trim()){await window.blackClover.updateChat(id,{title:name.trim()});if(id===state.currentId)await loadConversation(id);else await refreshList();}}
    if(action==='delete'&&confirm('این گفتگو کامل حذف شود؟')){await window.blackClover.removeChat(id);if(id===state.currentId){state.currentId=null;state.conversation=null;await ensureCurrent();}await refreshList();}
  };

  $('#messages').onclick=async e=>{
    const starter=e.target.closest('[data-starter]');if(starter){enqueue(starter.dataset.starter);return;}
    const source=e.target.closest('[data-source-url]');if(source){await window.blackClover.openExternal(source.dataset.sourceUrl);return;}
    const link=e.target.closest('a[href]');if(link){e.preventDefault();const url=safeHttp(link.getAttribute('href'));if(url)await window.blackClover.openExternal(url);return;}
    const row=e.target.closest('[data-message-id]');if(!row)return;const message=state.conversation?.messages?.find(x=>x.id===row.dataset.messageId);if(!message)return;
    const action=e.target.closest('[data-msg-action]')?.dataset.msgAction;if(!action)return;
    if(action==='copy'){await navigator.clipboard.writeText(message.text);toast('پیام کپی شد');}
    if(action==='speak'){voice.speak(message.text);}
    if(action==='edit'){editMessage(message,row);}
    if(action==='delete'){await deleteMessage(message);}
    if(action==='branch'){await branchFrom(message);}
    if(action==='retry'){const index=state.conversation.messages.findIndex(x=>x.id===message.id),user=currentUserBefore(index);if(user)await replayFrom(user.id);}
  };

  $('#form').onsubmit=async e=>{e.preventDefault();if(running){ignoreCurrent=true;await window.blackClover.cancelChat?.(state.currentId);clearStream();setActivity('');toast('پاسخ متوقف شد');return;}enqueue($('#input').value);};
  $('#input').oninput=autoGrow;
  $('#input').onkeydown=e=>{if(e.key==='Enter'&&!e.shiftKey){e.preventDefault();$('#form').requestSubmit();}};
  $('#mic').onclick=()=>startMic().catch(e=>toast(String(e.message||e)));
  $('#attach').onclick=async()=>{try{const picked=await window.blackClover.pickChatFiles();if(picked?.length){const seen=new Set(state.attachments.map(x=>x.path));for(const item of picked)if(item?.path&&!seen.has(item.path)&&state.attachments.length<8){state.attachments.push(item);seen.add(item.path);}renderPendingAttachments();}}catch(e){toast('پیوست فایل ناموفق بود: '+(e?.message||e));}};
  $('#attachmentTray').onclick=e=>{const b=e.target.closest('[data-remove-attachment]');if(!b)return;state.attachments.splice(Number(b.dataset.removeAttachment),1);renderPendingAttachments();};
  $('#workMode').onclick=()=>window.blackClover.showProjects();
  $('#chatMode').onclick=()=>$('#input').focus();
  $('#sidebarToggle').onclick=()=>{state.sidebar=!state.sidebar;$('#sidebar').classList.toggle('collapsed',!state.sidebar);};
  $('#modelSelect').onchange=e=>{state.model=e.target.value;localStorage.setItem(MODEL_KEY,state.model);toast(state.model==='auto'?'انتخاب مغز روی Auto':'مدل انتخاب شد');};
  $('#depthSelect').onchange=e=>{state.depth=e.target.value;};
  $('#webToggle').onclick=()=>{state.web=!state.web;updateHeader();};
  $('#folderSelect').onchange=async e=>{if(!state.currentId)return;await window.blackClover.updateChat(state.currentId,{folderId:e.target.value||null});await loadConversation(state.currentId);};
  $('#pinChat').onclick=async()=>{if(!state.currentId)return;await window.blackClover.updateChat(state.currentId,{pinned:!state.conversation.pinned});await loadConversation(state.currentId);};
  $('#chatTitle').onclick=async()=>{if(!state.currentId)return;const name=prompt('نام گفتگو',state.conversation.title);if(name?.trim()){await window.blackClover.updateChat(state.currentId,{title:name.trim()});await loadConversation(state.currentId);}};
  $('#shareChat').onclick=async()=>{if(state.currentId){await window.blackClover.copyChat(state.currentId);toast('کل گفتگو برای اشتراک کپی شد');}};
  $('#exportChat').onclick=()=>state.currentId&&window.blackClover.exportChat(state.currentId);
  $('#settings').onclick=()=>{$('#setup').hidden=false;refreshBrainSettings();};
  $('#setupClose').onclick=()=>{$('#setup').hidden=true;};
  $('#setupRefresh').onclick=async()=>{await refreshBrainSettings();await populateModels();};
  $('#providerList').onclick=async e=>{
    const config=e.target.closest('[data-provider-config]'),remove=e.target.closest('[data-provider-remove]');
    if(config){const provider=config.dataset.provider,key=prompt(`کلید API رایگان ${provider} را وارد کن. کلید به‌صورت رمز‌شده در Windows ذخیره می‌شود:`);if(!key?.trim())return;try{const settings=await window.blackClover.brainSettings(),p=settings.providers.find(x=>x.provider===provider),model=prompt('مدل (خالی = مدل پیشنهادی):',p?.model||'')||p?.model||'';await window.blackClover.saveBrainProvider({provider,apiKey:key.trim(),model});const test=await window.blackClover.testBrainProvider(provider);toast(test.ok?`${provider} متصل شد`:`${provider} ذخیره شد ولی تست اتصال موفق نبود`);await refreshBrainSettings();await populateModels();}catch(err){toast(err?.message||String(err));}return;}
    if(remove){const provider=remove.dataset.provider;if(confirm(`اتصال ${provider} حذف شود؟`)){await window.blackClover.removeBrainProvider(provider);await refreshBrainSettings();await populateModels();}}
  };
  $('#chatgptConnect').onclick=async e=>{const b=e.currentTarget;try{b.disabled=true;if(b.dataset.connected==='1'&&b.dataset.sharing==='1'){if(confirm('اتصال ChatGPT از MARIA قطع شود؟'))await window.blackClover.disconnectChatGPT();}else await window.blackClover.signInChatGPT({reconsent:b.dataset.connected==='1'});await refreshBrainSettings();await populateModels();toast('وضعیت ChatGPT به‌روز شد');}catch(err){toast(err?.message||String(err));}finally{b.disabled=false;}};
  $('#chatgptUsage').onclick=()=>window.blackClover.openChatGPTUsage();
  $('#githubBrain').onclick=async()=>{try{await window.blackClover.connectGithubBrain();toast('پنجره اتصال GitHub باز شد');}catch(e){toast(e.message||String(e));}};
  $('#minimizeChat').onclick=()=>window.blackClover.minimizeChat();
  $('#closeChat').onclick=()=>window.blackClover.hideChat();

  window.blackClover.onEvent?.(event=>{
    if(event.type==='stream'){addStream(event.delta||'');return;}
    if(event.type==='thinking'){if(running)setActivity(event.kind==='grounded-research'?'در حال تحقیق و خواندن منابع…':'در حال فکر کردن…');return;}
    if(event.type==='tool'){if(running)setActivity('در حال اجرای '+event.name+'…');return;}
    if(event.type==='reminder'||event.type==='break-reminder'){toast(event.text||event.item?.message||'یادآوری');}
  });
  window.blackClover.onFocusInput?.(()=>{$('#input').focus();});
  window.blackClover.onOpenSettings?.(payload=>{$('#setup').hidden=false;refreshBrainSettings();if(payload?.section==='voice')setTimeout(()=>document.querySelector('#voicePersonalityPanel')?.scrollIntoView({behavior:'smooth',block:'start'}),160);});
  window.blackClover.onPrefillPrompt?.(payload=>{const t=payload?.text||'';if(!t)return;$('#input').value=t;autoGrow();if(payload.submit)enqueue(t);});
  autoGrow();syncSendButton();$('#input').focus();
}
