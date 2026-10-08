import './chatSurfaceV2.css';
import {voice} from './voice.js';
import {marked} from 'marked';
import DOMPurify from 'dompurify';

const $=q=>document.querySelector(q);
const esc=value=>String(value??'').replace(/[&<>"']/g,c=>({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[c]));
const CHATGPT_AUTO='chatgpt:auto';
const PROVIDERS=['gemini','anthropic','deepseek','github','groq','openrouter','qwen','mistral','openai'];
const PROVIDER_NAMES={gemini:'Gemini',anthropic:'Claude',deepseek:'DeepSeek',github:'GitHub Models',groq:'Groq',openrouter:'OpenRouter',qwen:'Qwen',mistral:'Mistral',openai:'OpenAI API'};
const VOICE_READ_KEY='maria:chat:autoRead';
const ICONS={
  menu:'<path d="M4 6h16M4 12h16M4 18h16"/>',
  plus:'<path d="M12 5v14M5 12h14"/>',
  search:'<circle cx="11" cy="11" r="8"/><path d="m21 21-4.35-4.35"/>',
  chat:'<path d="M21 11.5a8.4 8.4 0 0 1-.9 3.8A8.5 8.5 0 0 1 12.5 20a8.4 8.4 0 0 1-3.8-.9L3 21l1.9-5.7A8.4 8.4 0 0 1 4 11.5a8.5 8.5 0 0 1 8.5-8.5h.5a8.5 8.5 0 0 1 8 8z"/>',
  folder:'<path d="M3 7a2 2 0 0 1 2-2h5l2 2h7a2 2 0 0 1 2 2v10H3z"/>',
  settings:'<path d="M12 15.5a3.5 3.5 0 1 0 0-7 3.5 3.5 0 0 0 0 7Z"/><path d="M19.4 15a1.7 1.7 0 0 0 .3 1.9l.1.1-2.1 2.1-.1-.1a1.7 1.7 0 0 0-1.9-.3l-.2.1V21h-3v-2.2l-.3-.1a1.7 1.7 0 0 0-1.9.3l-.1.1-2.1-2.1.1-.1a1.7 1.7 0 0 0 .3-1.9l-.1-.2H6v-3h2.2l.1-.3a1.7 1.7 0 0 0-.3-1.9L8 9.5l2.1-2.1.1.1a1.7 1.7 0 0 0 1.9.3l.2-.1V5h3v2.2l.3.1a1.7 1.7 0 0 0 1.9-.3l.1-.1L19.7 9l-.1.1a1.7 1.7 0 0 0-.3 1.9l.1.2H21v3h-1.8Z" transform="translate(-1.5,-1.1) scale(1.12)"/>',
  copy:'<rect x="8" y="8" width="13" height="13" rx="2"/><path d="M16 8V5a2 2 0 0 0-2-2H5a2 2 0 0 0-2 2v9a2 2 0 0 0 2 2h3"/>',
  edit:'<path d="m16 4 4 4M4 20l4-.8L20 7a2.8 2.8 0 0 0-4-4L4 15z"/>',
  trash:'<path d="M3 6h18M8 6V4h8v2M6 6l1 15h10l1-15M10 10v7M14 10v7"/>',
  retry:'<path d="M3 11a9 9 0 1 1 2.6 6.4M3 4v7h7"/>',
  pin:'<path d="m9 4 6 0 1 5 3 3H5l3-3zM12 12v9"/>',
  mic:'<rect x="9" y="2" width="6" height="13" rx="3"/><path d="M5 11a7 7 0 0 0 14 0M12 18v4"/>',
  sound:'<path d="M11 5 6 9H3v6h3l5 4zM15 9a5 5 0 0 1 0 6M18 6a9 9 0 0 1 0 12"/>',
  send:'<path d="m22 2-7 20-4-9-9-4Z M22 2 11 13"/>',
  stop:'<rect x="6" y="6" width="12" height="12" rx="2"/>',
  globe:'<circle cx="12" cy="12" r="9"/><path d="M3 12h18M12 3c3 3 4 6 4 9s-1 6-4 9M12 3c-3 3-4 6-4 9s1 6 4 9"/>',
  check:'<path d="m5 12 4 4L19 6"/>',
  arrow:'<path d="m9 18 6-6-6-6"/>',
  chevron:'<path d="m6 9 6 6 6-6"/>',
  refresh:'<path d="M20 11a8 8 0 0 0-14-5L4 8M4 4v4h4M4 13a8 8 0 0 0 14 5l2-2m0 4v-4h-4"/>',
  cloud:'<path d="M20 16a4 4 0 0 0-4-4h-1a6 6 0 1 0-11 4h16Z"/>',
  minimize:'<path d="M5 12h14"/>',
  close:'<path d="M6 6l12 12M18 6 6 18"/>',
  code:'<path d="m8 8-4 4 4 4m8-8 4 4-4 4m-3-11-2 14"/>',
  work:'<rect x="3" y="7" width="18" height="14" rx="2"/><path d="M8 7V5a2 2 0 0 1 2-2h4a2 2 0 0 1 2 2v2M3 12h18"/>',
  spark:'<path d="m12 2 2.5 7.5L22 12l-7.5 2.5L12 22l-2.5-7.5L2 12l7.5-2.5z"/>',
  export:'<path d="M12 3v13m-5-5 5 5 5-5M4 17v4h16v-4"/>'
};
const icon=(name,size=18)=>'<svg width="'+size+'" height="'+size+'" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.8" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true">'+(ICONS[name]||ICONS.spark)+'</svg>';
marked.setOptions({gfm:true,breaks:true});
const markdown=s=>DOMPurify.sanitize(marked.parse(String(s||'')),{USE_PROFILES:{html:true}});
const safeUrl=raw=>{try{const u=new URL(raw);return /^https?:$/.test(u.protocol)?u.href:null;}catch{return null;}};
const api=()=>window.blackClover;
const state={id:null,chat:null,list:[],folders:[],folder:'all',search:'',model:CHATGPT_AUTO,connected:false,connecting:false,account:null,models:[],sidebar:true,web:false,deep:false,autoRead:localStorage.getItem(VOICE_READ_KEY)==='1',checking:false,testing:false,providerSettings:[],configuredProviders:[]};
let busy=false,cancelled=false,activeChatId=null,streamContent='',activeStream=null,mic=null,toastTimer=null;
const button=(id,label,ico,extra='')=>'<button type="button" id="'+id+'" class="icon-btn" title="'+esc(label)+'" aria-label="'+esc(label)+'" '+extra+'>'+icon(ico)+'</button>';
function notice(message){const n=$('#notice');if(!n)return;n.textContent=message;n.hidden=false;clearTimeout(toastTimer);toastTimer=setTimeout(()=>n.hidden=true,3800);}
function setStatus(message){const x=$('#status');if(x)x.textContent=message;}
function withError(error){notice(String(error?.message||error||'خطای نامشخص'));}
function scrollEnd(){const x=$('#messages');if(x)x.scrollTop=x.scrollHeight;}
function grow(){const input=$('#input');if(!input)return;input.style.height='auto';input.style.height=Math.min(180,Math.max(45,input.scrollHeight))+'px';}
function wipeStream(){activeStream?.remove();activeStream=null;streamContent='';}
function accountName(){return String(state.account?.session?.identity?.email||state.account?.session?.profileLabel||'حساب ChatGPT');}
function showDialog({title,description='',value=null,confirmText='ذخیره',danger=false,multiline=false}={}){
  const modal=$('#actionDialog'),heading=$('#actionDialogTitle'),desc=$('#actionDialogDescription'),input=$('#actionDialogInput'),textarea=$('#actionDialogTextarea'),accept=$('#actionDialogAccept'),cancel=$('#actionDialogCancel');
  return new Promise(resolve=>{
    let finished=false;
    const close=result=>{if(finished)return;finished=true;modal.hidden=true;input.onkeydown=null;modal.onkeydown=null;accept.onclick=null;cancel.onclick=null;modal.onclick=null;resolve(result);};
    heading.textContent=title;desc.textContent=description;desc.hidden=!description;input.hidden=value===null||multiline;textarea.hidden=!multiline;input.value=value===null?'':String(value);textarea.value=value===null?'':String(value);accept.textContent=confirmText;accept.classList.toggle('danger-button',danger);modal.hidden=false;
    accept.onclick=()=>{const text=value===null?true:(multiline?textarea:input).value.trim();if(text===false||text==='')return;close(text);};
    cancel.onclick=()=>close(null);modal.onclick=e=>{if(e.target===modal)close(null);};
    modal.onkeydown=e=>{if(e.key==='Escape'){e.preventDefault();close(null);}if(e.key==='Enter'&&e.target===input){e.preventDefault();accept.click();}};
    queueMicrotask(()=>{if(!modal.hidden)(value===null?cancel:(multiline?textarea:input)).focus();});
  });
}
function updateAccountUi(){
  const usable=state.connected;
  const s=state.account?.session||{},inProgress=state.connecting||s.status==='connecting';
  const chip=$('#accountChip');if(chip){chip.classList.toggle('online',usable);chip.classList.toggle('pending',!usable&&inProgress);chip.innerHTML='<span class="state-dot"></span>'+(usable?'ChatGPT · متصل':inProgress?'ChatGPT · در حال اتصال':'اتصال به ChatGPT');}
  const label=$('#accountStatus');if(label)label.textContent=usable?'متصل به '+accountName():inProgress?'ورود در مرورگر هنوز کامل نشده است':s.status==='connected'?'حساب شناسایی شد، ولی مجوز استفاده از سهمیه فعال نیست':s.status==='reauth_required'?'اتصال منقضی شده؛ دوباره وارد شو':'حساب ChatGPT هنوز متصل نیست';
  const picker=$('#accountPicker');if(picker){const profiles=state.account?.profiles||[];const active=s.profileId||'';picker.innerHTML='<option value="">انتخاب حساب ChatGPT</option>'+profiles.map(p=>'<option value="'+esc(p.id)+'">'+esc(p.identity?.email||p.label||'حساب بدون نام')+(p.sharing?' · مجاز':p.status==='connecting'?' · در حال اتصال':' · نیازمند ورود')+'</option>').join('');picker.value=profiles.some(p=>p.id===active)?active:'';picker.disabled=inProgress||profiles.length===0;}
  const addAccount=$('#addChatGPTAccount');if(addAccount)addAccount.disabled=inProgress;
  const blocked=/(subscription_sharing_user_not_eligible|permission.*unavailable|required.*permission|مجوز الزامی|طرح.*ادامه دهید|workspace.*plan)/i.test([s.error?.code,s.error?.message].filter(Boolean).join(' '));
  const diagnostic=$('#chatgptDiagnosis');if(diagnostic){const c=String(s.error?.code||'');diagnostic.textContent=usable?'ChatGPT: connected and authorized':inProgress?'Waiting for browser authorization':blocked?'OpenAI denied plan sharing for this app/workspace. Plus alone does not guarantee eligibility.':s.status==='connected'?'Signed in, but plan sharing is not granted':'ChatGPT plan sharing is not connected';if(c)diagnostic.textContent+=' | Error code: '+c;}
  const details=$('#accountDetails');if(details)details.textContent=blocked?'OpenAI اجازه استفاده از سهمیه این حساب یا فضای کاری را صادر نکرده است. تکرار ورود این محدودیت را برطرف نمی‌کند؛ ابتدا وضعیت حساب/فضای کاری را بررسی کن یا در تنظیمات MARIA از مسیر API مستقل استفاده کن.':s.error?.message||(usable?'مجوز استفاده از ChatGPT فعال است. برای بررسی واقعی یک پاسخ، دکمه «آزمایش پاسخ» را بزن.':inProgress?'مرورگر را بررسی کن: باید دسترسی را تأیید کنی و صفحه به 127.0.0.1 برگردد. فقط وارد شدن به ایمیل کافی نیست.':s.status==='connected'?'در تنظیمات حساب روی Continue with ChatGPT بزن و اجازه استفاده از سهمیه را تأیید کن.':'برای اتصال، دکمه ورود را بزن و در صفحه رسمی OpenAI مجوز را تأیید کن.');
  const hint=$('#connectionHelp');if(hint){hint.hidden=usable;hint.textContent=blocked?'دسترسی به سهمیه ChatGPT برای این حساب تأیید نشده است. این محدودیت را با دورزدن مجوز نمی‌توان رفع کرد.':inProgress?'در حال انتظار برای پاسخ صفحه ورود… اگر پنجره مرورگر بسته شده یا گیر کرده، «لغو ورود» را بزن و دوباره امتحان کن.':s.status==='connected'?'ورود هویتی انجام شده، اما اختیار استفاده از سهمیه ChatGPT صادر نشده است. با تأیید مجدد می‌توان آن را فعال کرد.':s.error?.message?'پیام بالا از سرویس ورود است. برای تلاش دوباره ابتدا وضعیت فعلی را بررسی کن.':'برای امنیت، ایمیل و رمز خود را فقط در صفحه رسمی OpenAI وارد کن.';}
  const cancel=$('#cancelChatGPTSignIn');if(cancel)cancel.hidden=!inProgress;
  const test=$('#testChatGPTConnection');if(test){test.hidden=!usable;test.disabled=state.testing;}
  const connect=$('#connectChatGPT');if(connect){connect.hidden=usable||inProgress;connect.disabled=inProgress;connect.textContent=s.status==='connected'?'تأیید مجوز استفاده از ChatGPT':'Continue with ChatGPT';}
  const disconnect=$('#disconnectChatGPT');if(disconnect)disconnect.hidden=!usable;
  const usage=$('#chatgptUsage');if(usage)usage.hidden=!usable;
  const model=$('#modelSelect');if(model)model.disabled=false;
  const banner=$('#connectBanner');if(banner)banner.hidden=usable||state.model!==CHATGPT_AUTO&& !state.model.startsWith('chatgpt:');
  const select=$('#modelSelect');if(select){
    const previous=state.model;
    select.innerHTML='<option value="'+CHATGPT_AUTO+'">ChatGPT · خودکار'+(usable?'':' (نیازمند مجوز)')+'</option>'+state.models.map(m=>'<option value="chatgpt:'+esc(m.slug)+'">'+esc(m.displayName||m.slug)+'</option>').join('')+state.configuredProviders.map(p=>'<option value="online:'+esc(p.provider)+'">'+esc(PROVIDER_NAMES[p.provider]||p.label)+' · '+esc(p.model)+'</option>').join('');
    state.model=previous;
    if(!Array.from(select.options).some(o=>o.value===state.model))state.model=CHATGPT_AUTO;
    select.value=state.model;
  }
}
async function syncProviders(){try{const result=await api().brainSettings();state.providerSettings=result.providers||[];state.configuredProviders=state.providerSettings.filter(p=>p.configured&&p.enabled);renderProviderSettings();updateAccountUi();}catch(e){notice('خواندن اتصال مدل‌ها ناموفق بود: '+String(e.message||e));}}
function renderProviderSettings(){const host=$('#providerCards');if(!host)return;host.innerHTML=state.providerSettings.filter(p=>PROVIDERS.includes(p.provider)).map(p=>'<div class="maria-provider-card"><div class="maria-provider-heading"><strong>'+esc(PROVIDER_NAMES[p.provider]||p.label)+'</strong><small>'+(p.configured?'کلید ذخیره شده':'بدون کلید')+'</small></div><p>'+esc(p.note||'')+'</p><label>مدل<input data-provider-model="'+esc(p.provider)+'" value="'+esc(p.model)+'" spellcheck="false"></label><label>کلید API<input data-provider-key="'+esc(p.provider)+'" type="password" placeholder="'+(p.configured?'کلید قبلی محفوظ است':'API key')+'" autocomplete="off"></label><div class="maria-provider-actions"><button data-provider-save="'+esc(p.provider)+'">ذخیره اتصال</button><button data-provider-test="'+esc(p.provider)+'" '+(!p.configured?'disabled':'')+'>آزمایش</button><button data-provider-remove="'+esc(p.provider)+'" '+(!p.configured?'disabled':'')+'>حذف کلید</button></div></div>').join('');}
async function syncAccount(fresh=false){
  try{const r=fresh?await api().refreshChatGPTModels():{status:await api().chatgptStatus()};
    state.account=r.status||r;const s=state.account?.session||{};state.connected=s.status==='connected'&&s.sharing===true&&!s.error;state.models=state.connected?(state.account.models||[]):[];updateAccountUi();
  }catch(e){state.connected=false;state.account={session:{status:'disconnected',error:{message:String(e.message||e)}}};state.models=[];updateAccountUi();}
}
async function connectChatGPT(){
  if(state.connecting||state.account?.session?.status==='connecting'){notice('ورود قبلی هنوز در جریان است. ابتدا آن را تکمیل یا لغو کن.');return;}
  state.connecting=true;updateAccountUi();setStatus('منتظر تأیید حساب در مرورگر…');
  try{
    await api().signInChatGPT({...(state.account?.session?.profileId?{profileId:state.account.session.profileId}:{}),reconsent:state.account?.session?.status==='connected'});
    await syncAccount(true);
    notice(state.connected?'حساب ChatGPT متصل شد.':'اتصال انجام شد، اما مجوز استفاده از سهمیه فعال نیست.');
  }catch(e){withError(e);await syncAccount();}finally{state.connecting=false;updateAccountUi();setStatus('آماده');}
}
async function cancelChatGPTSignIn(){
  try{await api().cancelChatGPTSignIn();notice('تلاش قبلی لغو شد. حالا می‌توانی دوباره وارد شوی.');}
  catch(e){withError(e)}finally{await syncAccount();}
}
async function checkAccountStatus(){
  if(state.checking)return;state.checking=true;const btn=$('#setupRefresh');btn.disabled=true;btn.textContent='در حال بررسی…';
  try{await syncAccount(true);const s=state.account?.session||{};notice(state.connected?'حساب آماده است.':s.status==='connecting'?'ورود هنوز تکمیل نشده؛ مرورگر و تأیید مجوز را بررسی کن.':s.status==='connected'?'حساب شناسایی شد؛ مجوز استفاده از ChatGPT هنوز فعال نیست.':'اتصال فعال نیست. برای اتصال دوباره وارد شو.');}
  catch(e){withError(e)}finally{state.checking=false;btn.disabled=false;btn.textContent='بررسی وضعیت';}
}
async function testConnection(){
  if(state.testing)return;state.testing=true;updateAccountUi();setStatus('آزمایش پاسخ ChatGPT…');
  try{const result=await api().testChatGPTConnection();if(result?.ok)notice('پاسخ واقعی از '+String(result.model||'ChatGPT')+' دریافت شد ('+Math.round(result.latencyMs/1000)+' ثانیه).');else notice('آزمایش پاسخ ناموفق بود: '+String(result?.error||'خطای نامشخص'));}
  catch(e){withError(e)}finally{state.testing=false;updateAccountUi();setStatus('آماده');}
}
async function addChatGPTAccount(){
  if(state.connecting)return;state.connecting=true;updateAccountUi();
  try{await api().signInChatGPT({newProfile:true});await syncAccount(true);notice(state.connected?'حساب جدید فعال شد.':'حساب اضافه شد؛ برای ادامه مجوز را بررسی کن.');}
  catch(error){withError(error);await syncAccount();}
  finally{state.connecting=false;updateAccountUi();}
}
async function switchChatGPTAccount(id){
  if(!id||state.connecting)return;const old=state.account?.session?.profileId;
  if(id===old)return;state.connecting=true;updateAccountUi();
  try{await api().selectChatGPTProfile(id);state.model=CHATGPT_AUTO;await syncAccount(true);notice(state.connected?'حساب انتخاب‌شده فعال شد.':'حساب انتخاب شد؛ برای فعال شدن با آن وارد شو.');}
  catch(error){withError(error);await syncAccount();}
  finally{state.connecting=false;updateAccountUi();}
}
async function disconnectChatGPT(){
  if(!await showDialog({title:'قطع اتصال ChatGPT',description:'اتصال حساب فعال از MARIA قطع می‌شود؛ گفتگوهای ذخیره‌شده پاک نخواهند شد.',danger:true,confirmText:'قطع اتصال'}))return;
  try{await api().disconnectChatGPT();state.model=CHATGPT_AUTO;await syncAccount();notice('اتصال حساب قطع شد.');}catch(e){withError(e);}
}
function editProjectDialog(folder){
  const modal=$('#projectDialog'),name=$('#projectEditName'),instructions=$('#projectEditInstructions'),save=$('#projectEditSave'),cancel=$('#projectEditCancel');
  return new Promise(resolve=>{
    let done=false;const close=result=>{if(done)return;done=true;modal.hidden=true;save.onclick=null;cancel.onclick=null;modal.onclick=null;modal.onkeydown=null;resolve(result);};
    $('#projectDialogTitle').textContent='تنظیمات پروژه';name.value=folder.name;instructions.value=folder.instructions||'';modal.hidden=false;
    save.onclick=()=>{if(!name.value.trim()){name.focus();return;}close({name:name.value.trim(),instructions:instructions.value.trim()});};
    cancel.onclick=()=>close(null);modal.onclick=e=>{if(e.target===modal)close(null);};modal.onkeydown=e=>{if(e.key==='Escape')close(null);};
    queueMicrotask(()=>name.focus());
  });
}
function messageButtons(message,index){
  if(message.role==='user')return '<button title="کپی پیام" data-message-action="copy">'+icon('copy',15)+'</button><button title="ویرایش پیام" data-message-action="edit">'+icon('edit',15)+'</button>';
  return '<button title="کپی پاسخ" data-message-action="copy">'+icon('copy',15)+'</button><button title="پخش صدا" data-message-action="speak">'+icon('sound',15)+'</button>'+(index>0?'<button title="تولید دوباره پاسخ" data-message-action="retry">'+icon('retry',15)+'</button>':'');
}
function sourceMarkup(message){
  const sources=Array.isArray(message.meta?.sources)?message.meta.sources:[];
  const html=sources.slice(0,8).map((s,i)=>{const url=safeUrl(s?.url);return url?'<button type="button" class="source-chip" data-link="'+esc(url)+'">'+(i+1)+' · '+esc(s.title||new URL(url).host)+'</button>':'';}).join('');
  return html?'<div class="sources">'+html+'</div>':'';
}
function renderMessages(){
  const root=$('#messages');if(!root)return;
  const rows=state.chat?.messages||[];
  if(!rows.length){
    root.innerHTML='<div class="welcome"><div class="welcome-symbol">'+icon('spark',36)+'</div><h1>چطور می‌تونم کمکت کنم؟</h1><p>از MARIA سؤال بپرس یا ازش بخواه کاری روی کامپیوتر انجام بده.</p><div class="ideas"><button data-starter="سلام ماریا، خودت رو معرفی کن">گفتگوی دوستانه</button><button data-starter="صدای ویندوز را قطع کن">کنترل کامپیوتر</button><button data-starter="آخرین اخبار هوش مصنوعی را همراه منابع پیدا کن">جستجو و تحقیق</button></div></div>';
    scrollEnd();return;
  }
  root.innerHTML=rows.map((m,i)=>'<article class="message '+(m.role==='user'?'user':'assistant')+'" data-id="'+esc(m.id)+'" data-index="'+i+'"><div class="message-line"><div class="bubble">'+markdown(m.text)+'</div></div>'+sourceMarkup(m)+'<div class="message-actions">'+messageButtons(m,i)+'</div></article>').join('');
  scrollEnd();
}
function renderChats(){
  const root=$('#chatList');if(!root)return;
  root.innerHTML=state.list.map(c=>'<div class="chat-entry '+(c.id===state.id?'selected':'')+'" data-chat="'+esc(c.id)+'"><button type="button" data-chat-open="'+esc(c.id)+'" title="'+esc(c.title)+'"><span>'+esc(c.title)+'</span></button><div class="item-actions"><button title="'+(c.pinned?'برداشتن پین':'پین گفتگو')+'" data-chat-action="pin">'+icon('pin',14)+'</button><button title="تغییر نام" data-chat-action="rename">'+icon('edit',14)+'</button><button title="حذف گفتگو" data-chat-action="delete">'+icon('trash',14)+'</button></div></div>').join('')||'<p class="empty-list">گفتگویی پیدا نشد.</p>';
  const folders=$('#folderList');folders.innerHTML=state.folders.map(f=>'<div class="folder-entry '+(state.folder===f.id?'selected':'')+'" data-folder="'+esc(f.id)+'"><button data-folder-open="'+esc(f.id)+'">'+icon('folder',15)+'<span>'+esc(f.name)+(f.instructions?' · ✦':'')+'</span></button><button title="دستورالعمل‌ها و تنظیمات پروژه" data-folder-action="settings">'+icon('settings',14)+'</button><button title="حذف پروژه" data-folder-action="delete">'+icon('trash',14)+'</button></div>').join('')||'<p class="empty-list">هنوز پروژه‌ای ساخته نشده.</p>';
  const select=$('#folderSelect');if(select){select.innerHTML='<option value="">بدون پروژه</option>'+state.folders.map(f=>'<option value="'+esc(f.id)+'">'+esc(f.name)+'</option>').join('');select.value=state.chat?.folderId||'';}
}
async function refreshList(){
  const filters={query:state.search};if(state.folder!=='all')filters.folderId=state.folder;
  [state.list,state.folders]=await Promise.all([api().listChats(filters),api().listChatFolders()]);
  renderChats();
}
async function loadChat(id){
  const c=await api().getChat(id);if(!c)throw Error('این گفتگو پیدا نشد.');
  state.id=c.id;state.chat=c;renderMessages();renderHeader();await refreshList();
}
async function createChat(){
  if(busy)return notice('ابتدا پاسخ فعلی را متوقف کن.');
  const c=await api().createChat({folderId:state.folder==='all'?null:state.folder});
  state.id=c.id;state.chat=c;state.search='';$('#chatSearch').value='';await refreshList();renderHeader();renderMessages();$('#input').focus();
}
async function ensureChat(){if(state.id&&state.chat)return;const list=await api().listChats({});if(list.length)await loadChat(list[0].id);else await createChat();}
function renderHeader(){
  $('#chatTitle').textContent=state.chat?.title||'گفتگوی جدید';
  $('#pinChat').classList.toggle('active',Boolean(state.chat?.pinned));
  $('#webToggle').classList.toggle('active',state.web);$('#webToggle').setAttribute('aria-pressed',String(state.web));
  $('#deepToggle').classList.toggle('active',state.deep);$('#deepToggle').setAttribute('aria-pressed',String(state.deep));
}
function pushStream(delta){
  if(!busy||cancelled||activeChatId!==state.id)return;
  if(!activeStream){$('#messages .welcome')?.remove();activeStream=document.createElement('article');activeStream.className='message assistant stream';activeStream.innerHTML='<div class="message-line"><div class="bubble"></div></div>';$('#messages').appendChild(activeStream);}
  streamContent+=String(delta||'');activeStream.querySelector('.bubble').innerHTML=markdown(streamContent);scrollEnd();
}
function busyUI(){
  const send=$('#send');send.innerHTML=icon(busy?'stop':'send');send.title=busy?'توقف پاسخ':'ارسال پیام';send.classList.toggle('danger',busy);
}
async function sendMessage(text){
  const value=String(text||'').trim();if(!value||busy)return;
  if(!state.connected&&state.model.startsWith('chatgpt:'))notice('حساب ChatGPT مجوز ندارد؛ می‌توانی از مدل‌های دیگر استفاده کنی.');
  await ensureChat();busy=true;cancelled=false;activeChatId=state.id;busyUI();const start=performance.now();
  const current=state.id;const old=state.chat;
  $('#input').value='';grow();state.chat={...old,messages:[...(old.messages||[]),{id:'pending-'+Date.now(),role:'user',text:value}]};renderMessages();
  setStatus('در حال پاسخ…');try{
    const response=await api().chat(value,{conversationId:current,modelOverride:state.model,provider:state.model.startsWith('online:')?state.model.slice(7):'chatgpt',profile:state.deep?'complex':'chat',webSearch:state.web});
    wipeStream();await loadChat(current);
    if(response?.requiresConfirmation&&response.confirmationId)confirmation(response.confirmationId,response.text);
    if(response?.cancelled){setStatus('متوقف شد');return;}
    if(response?.ok===false){notice(response.text||'درخواست انجام نشد.');setStatus('خطا در پاسخ');}
    else {$('#latency').textContent=((performance.now()-start)/1000).toFixed(1)+'s';setStatus('آماده');if(response?.text&&state.autoRead&&voice.enabled)voice.speak(response.text);}
  }catch(e){wipeStream();await loadChat(current).catch(()=>{});withError(e);setStatus('خطا در اتصال');}
  finally{busy=false;activeChatId=null;busyUI();}
}
async function stopResponse(){
  if(!busy)return;cancelled=true;setStatus('در حال توقف…');try{await api().cancelChat(activeChatId||'');}catch(e){withError(e);}
}
async function retryMessage(userMessage){
  if(busy)return;const current=state.id;busy=true;cancelled=false;activeChatId=current;busyUI();setStatus('در حال بازنویسی…');
  try{const r=await api().replayMessage({conversationId:current,messageId:userMessage.id,model:state.model,provider:state.model.startsWith('online:')?state.model.slice(7):'chatgpt',profile:state.deep?'complex':'chat'});
    wipeStream();await loadChat(current);if(r?.requiresConfirmation)confirmation(r.confirmationId,r.text);if(r?.ok===false)notice(r?.text||'تولید دوباره موفق نبود.');
  }catch(e){withError(e);}finally{busy=false;activeChatId=null;busyUI();setStatus('آماده');}
}
function confirmation(id,description){
  const modal=$('#confirm');modal.hidden=false;modal.innerHTML='<div><b>تأیید اجرای دستور</b><p>'+esc(description||'این فرمان نیازمند اجازه تو است.')+'</p></div><div class="confirm-actions"><button type="button" id="decline">لغو</button><button type="button" id="approve">تأیید و اجرا</button></div>';
  async function resolve(approved){modal.hidden=true;setStatus('در حال اجرای دستور…');try{const r=await api().confirm(id,approved);await loadChat(state.id);if(r?.requiresConfirmation&&r.confirmationId)confirmation(r.confirmationId,r.text);else if(r?.ok===false)notice(r.text);}catch(e){withError(e);}finally{setStatus('آماده');}}
  $('#approve').onclick=()=>resolve(true);$('#decline').onclick=()=>resolve(false);
}
function openSettings(tab='account'){
  $('#setup').hidden=false;chooseSettingsTab(tab);syncAccount().catch(()=>{});
}
function chooseSettingsTab(tab){
  for(const key of ['account','providers','voice','privacy']){$('#tab-'+key).classList.toggle('active',tab===key);$('#panel-'+key).hidden=tab!==key;}
}
function startMicrophone(){
  const Rec=window.SpeechRecognition||window.webkitSpeechRecognition;
  if(!Rec){notice('تبدیل گفتار به متن در نسخه فعلی مرورگر/ویندوز فعال نیست.');return;}
  if(mic)return;
  voice.stop('listen');
  const rec=new Rec();mic=rec;rec.lang='fa-IR';rec.interimResults=false;$('#mic').classList.add('active');setStatus('در حال گوش دادن…');api().setUiState?.('listening','در حال شنیدن').catch(()=>{});
  rec.onresult=e=>{const text=e.results?.[0]?.[0]?.transcript;if(text){$('#input').value=text;grow();$('#input').focus();}};
  rec.onerror=e=>notice('میکروفن: '+(e.error||'خطا'));
  rec.onend=()=>{mic=null;$('#mic').classList.remove('active');setStatus('آماده');api().setUiState?.('online','آماده').catch(()=>{});};
  try{rec.start();}catch(e){mic=null;withError(e);}
}
function template(){
  return '<div class="pro-shell">'+
  '<aside id="sidebar" class="sidebar">'+
    '<div class="brand"><div class="brand-icon">'+icon('spark',21)+'</div><strong>MARIA</strong><span>Assistant</span></div>'+
    '<button class="new-chat" id="newChat">'+icon('plus',18)+'گفتگوی جدید</button>'+
    '<label class="search-box">'+icon('search',16)+'<input id="chatSearch" autocomplete="off" placeholder="جستجو در گفتگوها"></label>'+
    '<div class="side-scroll"><button class="side-caption" id="allChats">گفتگوهای اخیر</button><div id="chatList"></div>'+
    '<div class="projects-label"><span>پروژه‌ها</span><button title="ساخت پروژه" id="newFolder">'+icon('plus',16)+'</button></div><div id="folderList"></div></div>'+
    '<div class="side-foot"><button id="workMode">'+icon('work',17)+'پروژه‌های MARIA</button><button id="settings">'+icon('settings',17)+'تنظیمات</button></div>'+
  '</aside>'+
  '<main class="workspace">'+
    '<header class="topbar">'+
      '<div class="top-left">'+button('sidebarToggle','باز و بسته کردن منو','menu')+'<div class="app-title">MARIA</div><select id="modelSelect" title="انتخاب مدل ChatGPT"><option value="chatgpt:auto">ChatGPT · خودکار</option></select></div>'+
      '<div class="top-right"><button id="accountChip" class="account-chip"><span class="state-dot"></span>اتصال به ChatGPT</button>'+button('minimizeChat','کوچک‌کردن','minimize')+button('closeChat','بستن پنجره','close')+'</div>'+
    '</header>'+
    '<div class="subbar"><button id="chatTitle" title="تغییر نام گفتگو">گفتگوی جدید</button><span id="status">آماده</span><small id="latency"></small><select id="folderSelect" title="انتقال گفتگو به پوشه"><option value="">بدون پروژه</option></select>'+button('pinChat','پین گفتگو','pin')+button('shareChat','کپی تمام گفتگو','copy')+button('exportChat','ذخیره گفتگو به فایل','export')+'</div>'+
    '<div id="connectBanner" class="connect-banner" hidden><span>برای پاسخ گرفتن از ChatGPT، حسابت را متصل کن.</span><button id="bannerConnect">اتصال حساب '+icon('arrow',14)+'</button></div>'+
    '<div id="activity" class="activity" hidden><span class="pulse"></span><span id="activityText"></span></div>'+
    '<section class="messages" id="messages" aria-live="polite"></section>'+
    '<div id="confirm" class="confirm-box" hidden></div>'+
    '<footer class="composer-wrap"><form id="form" class="composer"><textarea id="input" placeholder="پیامی برای MARIA بنویس…" rows="1" aria-label="متن پیام"></textarea>'+
      '<div class="composer-bottom"><div class="composer-left"><button type="button" id="webToggle" class="tool-chip" title="جستجوی منابع به‌روز">'+icon('globe',17)+'جستجو</button><button type="button" id="deepToggle" class="tool-chip" title="پاسخ دقیق‌تر">'+icon('spark',16)+'عمیق</button><button type="button" id="autoSpeak" class="tool-chip" title="خواندن خودکار جواب">'+icon('sound',16)+'صدا</button></div>'+
      '<div class="composer-right">'+button('mic','گفتن پیام با میکروفن','mic')+'<button type="submit" id="send" title="ارسال پیام" class="send-btn">'+icon('send',19)+'</button></div></div></form>'+
      '<small class="composer-hint">MARIA ممکن است اشتباه کند. نتیجه فرمان‌های مهم را بررسی کن.</small></footer>'+
  '</main></div>'+
  '<div id="notice" role="status" class="toast" hidden></div>'+
  '<div id="setup" class="settings-overlay" hidden><section class="settings-panel" role="dialog" aria-modal="true" aria-label="تنظیمات MARIA">'+
    '<header><strong>تنظیمات MARIA</strong>'+button('setupClose','بستن تنظیمات','close')+'</header>'+
    '<nav class="settings-tabs"><button id="tab-account" class="active">حساب ChatGPT</button><button id="tab-providers">مدل‌های دیگر</button><button id="tab-voice">صدا</button><button id="tab-privacy">حریم خصوصی</button></nav>'+
    '<section id="panel-account" class="settings-content">'+
      '<div class="account-identity"><div class="account-symbol">'+icon('spark',22)+'</div><div><strong id="accountStatus">متصل نیست</strong><p id="accountDetails">با ChatGPT وارد شو تا گفتگو فعال شود.</p></div></div>'+
      '<div class="account-switcher"><label for="accountPicker">حساب فعال</label><select id="accountPicker" aria-label="انتخاب حساب ChatGPT"><option value="">انتخاب حساب ChatGPT</option></select><button id="addChatGPTAccount" type="button">'+icon('plus',16)+' افزودن حساب دیگر</button></div>'+
      '<p id="connectionHelp" class="connection-help" role="status">برای ورود، حساب OpenAI مورد نظرت را در مرورگر انتخاب کن.</p><div class="settings-actions"><button id="connectChatGPT" class="primary-button">Continue with ChatGPT</button><button id="cancelChatGPTSignIn" hidden>لغو ورود معلق</button><button id="testChatGPTConnection" hidden>آزمایش پاسخ واقعی</button><button id="chatgptUsage" hidden>نمایش مصرف و محدودیت</button><button id="disconnectChatGPT" hidden>قطع اتصال</button><button id="setupRefresh">بررسی وضعیت</button></div>'+
      '<p id="chatgptDiagnosis" class="settings-note" role="status"></p>'+
      '<p class="settings-note">ورود در مرورگر رسمی انجام می‌شود. حساب Chrome به‌طور خودکار انتخاب نمی‌شود؛ در صفحه ورود حساب موردنظرت را انتخاب کن. این اتصال ممکن است محدودیت سهمیه داشته باشد.</p>'+
    '</section>'+
    '<section id="panel-providers" class="settings-content" hidden><p class="settings-note">Gemini، Claude و DeepSeek با کلید API رسمی وصل می‌شوند. کلیدها در فضای امن ویندوز رمزگذاری می‌شوند. اشتراک سایت این سرویس‌ها الزاماً اعتبار API نیست.</p><div id="providerCards" class="maria-provider-list"></div></section>'+ 
    '<section id="panel-voice" class="settings-content" hidden>'+
      '<label class="setting-row"><span><b>فعال بودن صدای MARIA</b><small>پخش صوتی پاسخ‌ها با موتور صوتی نصب‌شده</small></span><input id="voiceEnabled" type="checkbox"></label>'+
      '<label class="setting-row"><span><b>خواندن خودکار پاسخ</b><small>پس از دریافت پاسخ، MARIA آن را می‌خواند</small></span><input id="voiceAutoRead" type="checkbox"></label>'+
      '<label class="setting-slider"><b>سرعت گفتار</b><input id="voiceRate" type="range" min="0.75" max="1.3" step="0.05"><output id="voiceRateValue"></output></label>'+
      '<label class="setting-slider"><b>زیر و بمی صدا</b><input id="voicePitch" type="range" min="0.75" max="1.3" step="0.05"><output id="voicePitchValue"></output></label>'+
      '<div class="settings-actions"><button id="voicePreview">آزمایش صدا</button><button id="voiceStop">توقف صدا</button></div>'+
      '<small class="settings-note" id="voiceEngineNote">کیفیت صدا به موتور صوتی و صداهای نصب‌شده در ویندوز بستگی دارد.</small>'+
    '</section>'+
    '<section id="panel-privacy" class="settings-content" hidden><p>گفتگوهای MARIA روی این کامپیوتر ذخیره می‌شوند. متن درخواست‌های مجاز برای پاسخ به مدل ChatGPT ارسال می‌شود. ابزارهای کنترل کامپیوتر از مسیر بررسی مجوزهای MARIA اجرا می‌شوند.</p><p>فایل‌های خصوصی به‌صورت خودکار به ChatGPT فرستاده نمی‌شوند. برای حذف گفتگوها از کنار نام گفتگو گزینه حذف را بزن.</p></section>'+
  '</section></div><div id="projectDialog" class="action-dialog-overlay" hidden><section class="action-dialog project-edit" role="dialog" aria-modal="true" aria-labelledby="projectDialogTitle"><div class="dialog-icon">'+icon('folder',23)+'</div><h3 id="projectDialogTitle">تنظیمات پروژه</h3><label>نام پروژه<input type="text" id="projectEditName" maxlength="120" aria-label="نام پروژه"></label><label>دستورالعمل مخصوص این پروژه<textarea id="projectEditInstructions" maxlength="5000" rows="7" placeholder="مثلاً همیشه برای این پروژه کوتاه و دقیق جواب بده و از اصطلاحات فارسی استفاده کن."></textarea></label><p>این دستورالعمل در تمام گفتگوهای این پروژه به MARIA داده می‌شود؛ فایل‌های خصوصی خودکار ارسال نمی‌شوند.</p><div class="action-dialog-buttons"><button id="projectEditCancel" type="button">انصراف</button><button id="projectEditSave" type="button">ذخیره پروژه</button></div></section></div><div id="actionDialog" class="action-dialog-overlay" hidden><section class="action-dialog" role="dialog" aria-modal="true" aria-labelledby="actionDialogTitle"><div class="dialog-icon">'+icon('chat',23)+'</div><h3 id="actionDialogTitle"></h3><p id="actionDialogDescription"></p><input type="text" id="actionDialogInput" maxlength="120" aria-label="نام جدید" autocomplete="off"><textarea id="actionDialogTextarea" rows="5" maxlength="5000" hidden aria-label="متن جدید"></textarea><div class="action-dialog-buttons"><button type="button" id="actionDialogCancel">انصراف</button><button type="button" id="actionDialogAccept">ذخیره</button></div></section></div>';
}
export async function mountChatSurface(){
  document.body.classList.add('chat-v3','surface-chat');
  $('#app').innerHTML=template();
  $('#autoSpeak').classList.toggle('active',state.autoRead);$('#voiceEnabled').checked=voice.enabled;$('#voiceAutoRead').checked=state.autoRead;
  $('#voiceRate').value=voice.rate;$('#voiceRateValue').textContent=voice.rate.toFixed(2)+'×';
  $('#voicePitch').value=voice.pitch;$('#voicePitchValue').textContent=voice.pitch.toFixed(2)+'×';
  await syncAccount();await syncProviders();await refreshList();await ensureChat();renderHeader();renderMessages();
  $('#newChat').onclick=()=>createChat().catch(withError);
  $('#allChats').onclick=()=>{state.folder='all';refreshList().catch(withError);};
  $('#chatSearch').oninput=e=>{state.search=e.target.value;refreshList().catch(withError);};
  $('#newFolder').onclick=async()=>{const name=await showDialog({title:'پروژه جدید',description:'برای مرتب کردن گفتگوها یک پروژه بساز.',value:'',confirmText:'ساخت پروژه'});if(name){try{const folder=await api().createChatFolder(name);state.folder=folder.id;await refreshList();notice('پروژه ساخته شد.');}catch(e){withError(e);}}};
  $('#chatList').onclick=async e=>{if(busy)return notice('برای تغییر گفتگو ابتدا پاسخ را متوقف کن.');
    const row=e.target.closest('[data-chat]');if(!row)return;const id=row.dataset.chat,action=e.target.closest('[data-chat-action]')?.dataset.chatAction;
    try{if(!action)return await loadChat(id);const item=state.list.find(c=>c.id===id);if(!item)return;
      if(action==='pin'){await api().updateChat(id,{pinned:!item.pinned});notice(item.pinned?'گفتگو از پین خارج شد.':'گفتگو پین شد.');}
      if(action==='rename'){const title=await showDialog({title:'تغییر نام گفتگو',description:'نام جدید گفتگو را وارد کن.',value:item.title,confirmText:'ذخیره نام'});if(title){await api().updateChat(id,{title});notice('نام گفتگو تغییر کرد.');}}
      if(action==='delete'){const ok=await showDialog({title:'حذف گفتگو',description:'«'+item.title+'» به‌طور دائمی حذف می‌شود و بازگردانی ندارد.',confirmText:'حذف گفتگو',danger:true});if(!ok)return;await api().removeChat(id);if(id===state.id){state.id=null;state.chat=null;await ensureChat();}notice('گفتگو حذف شد.');}
      if(id===state.id&&state.id)await loadChat(id);else await refreshList();
    }catch(error){withError(error);}};
  $('#folderList').onclick=async e=>{const row=e.target.closest('[data-folder]');if(!row)return;const id=row.dataset.folder,action=e.target.closest('[data-folder-action]')?.dataset.folderAction;
    if(busy)return notice('بعد از پایان پاسخ، پوشه را تغییر بده.');
    try{
      if(action==='settings'){const f=state.folders.find(x=>x.id===id),changes=f&&await editProjectDialog(f);if(changes){await api().updateChatFolder(id,changes);notice('تنظیمات پروژه ذخیره شد.');}}
      if(action==='rename'){const f=state.folders.find(x=>x.id===id),name=await showDialog({title:'تغییر نام پروژه',value:f?.name||'',confirmText:'ذخیره'});if(name)await api().renameChatFolder(id,name);}
      else if(action==='delete'){const ok=await showDialog({title:'حذف پروژه',description:'فقط پوشه حذف می‌شود و گفتگوهای داخل آن باقی می‌مانند.',confirmText:'حذف پوشه',danger:true});if(ok){await api().removeChatFolder(id);state.folder='all';}}
      else state.folder=id;
      await refreshList();
    }catch(error){withError(error);}};
  $('#messages').onclick=async e=>{
    const starter=e.target.closest('[data-starter]');if(starter)return sendMessage(starter.dataset.starter);
    const link=e.target.closest('[data-link]');if(link)return api().openExternal(link.dataset.link).catch(withError);
    const anchor=e.target.closest('a[href]');if(anchor){e.preventDefault();const url=safeUrl(anchor.getAttribute('href'));if(url)api().openExternal(url).catch(withError);return;}
    const row=e.target.closest('[data-id]');if(!row||busy)return;const action=e.target.closest('[data-message-action]')?.dataset.messageAction;
    const message=state.chat?.messages?.find(m=>m.id===row.dataset.id);if(!action||!message)return;
    try{
      if(action==='copy'){await navigator.clipboard.writeText(message.text);notice('متن کپی شد.');}
      if(action==='speak')voice.speak(message.text);
      if(action==='edit'){const edited=await showDialog({title:'ویرایش پیام',description:'متن جدید پیام را وارد کن.',value:message.text,multiline:true,confirmText:'ذخیره پیام'});if(edited?.trim()){await api().updateChatMessage(state.id,message.id,{text:edited});if(message.role==='user')await retryMessage(message);else await loadChat(state.id);}}
      if(action==='retry'){const i=state.chat.messages.findIndex(m=>m.id===message.id),prior=state.chat.messages.slice(0,i).reverse().find(m=>m.role==='user');if(prior)await retryMessage(prior);}
    }catch(error){withError(error);}};
  $('#form').onsubmit=e=>{e.preventDefault();if(busy)return stopResponse();sendMessage($('#input').value).catch(withError);};
  $('#input').oninput=grow;
  $('#input').onkeydown=e=>{if(e.key==='Enter'&&!e.shiftKey&&!e.isComposing){e.preventDefault();$('#form').requestSubmit();}};
  $('#sidebarToggle').onclick=()=>{state.sidebar=!state.sidebar;$('#sidebar').classList.toggle('collapsed',!state.sidebar);};
  $('#webToggle').onclick=()=>{state.web=!state.web;renderHeader();};
  $('#deepToggle').onclick=()=>{state.deep=!state.deep;renderHeader();};
  $('#autoSpeak').onclick=()=>{state.autoRead=!state.autoRead;localStorage.setItem(VOICE_READ_KEY,state.autoRead?'1':'0');$('#autoSpeak').classList.toggle('active',state.autoRead);$('#voiceAutoRead').checked=state.autoRead;};
  $('#mic').onclick=startMicrophone;
  $('#workMode').onclick=()=>api().showProjects().catch(withError);
  $('#pinChat').onclick=async()=>{if(!state.id)return;try{await api().updateChat(state.id,{pinned:!state.chat.pinned});await loadChat(state.id);}catch(e){withError(e);}};
  $('#shareChat').onclick=async()=>{if(state.id){try{await api().copyChat(state.id);notice('کل گفتگو کپی شد.');}catch(e){withError(e);}}};
  $('#exportChat').onclick=()=>state.id&&api().exportChat(state.id).catch(withError);
  $('#chatTitle').onclick=async()=>{if(!state.id)return;try{const title=await showDialog({title:'تغییر نام گفتگو',value:state.chat?.title||'',confirmText:'ذخیره نام'});if(title){await api().updateChat(state.id,{title});await loadChat(state.id);notice('نام گفتگو تغییر کرد.');}}catch(e){withError(e);}};
  $('#folderSelect').onchange=async e=>{await api().updateChat(state.id,{folderId:e.target.value||null});await loadChat(state.id);};
  $('#accountChip').onclick=()=>openSettings('account');
  $('#bannerConnect').onclick=()=>openSettings('account');
  $('#settings').onclick=()=>openSettings('account');
  $('#setupClose').onclick=()=>{$('#setup').hidden=true;};
  $('#setup').onclick=e=>{if(e.target===$('#setup'))$('#setup').hidden=true;};
  window.addEventListener('keydown',e=>{if(e.key==='Escape'&&!$('#setup').hidden){$('#setup').hidden=true;}});
  for(const tab of ['account','providers','voice','privacy'])$('#tab-'+tab).onclick=()=>chooseSettingsTab(tab);
  $('#connectChatGPT').onclick=connectChatGPT;
  $('#cancelChatGPTSignIn').onclick=cancelChatGPTSignIn;
  $('#testChatGPTConnection').onclick=testConnection;
  $('#addChatGPTAccount').onclick=addChatGPTAccount;
  $('#accountPicker').onchange=e=>switchChatGPTAccount(e.target.value);
  $('#disconnectChatGPT').onclick=disconnectChatGPT;
  $('#chatgptUsage').onclick=()=>api().openChatGPTUsage().catch(withError);
  $('#setupRefresh').onclick=checkAccountStatus;
  $('#providerCards').onclick=async e=>{const b=e.target.closest('button[data-provider-save],button[data-provider-test],button[data-provider-remove]');if(!b)return;const provider=b.dataset.providerSave||b.dataset.providerTest||b.dataset.providerRemove;try{b.disabled=true;if(b.dataset.providerSave){const key=$('[data-provider-key="'+provider+'"]').value,model=$('[data-provider-model="'+provider+'"]').value.trim();await api().saveBrainProvider({provider,apiKey:key,model,enabled:true});await syncProviders();notice('اتصال '+PROVIDER_NAMES[provider]+' ذخیره شد.');}else if(b.dataset.providerRemove){const yes=await showDialog({title:'حذف کلید '+PROVIDER_NAMES[provider],description:'کلید ذخیره‌شده از MARIA پاک می‌شود.',danger:true,confirmText:'حذف کلید'});if(yes){await api().removeBrainProvider(provider);state.model=CHATGPT_AUTO;await syncProviders();notice('کلید حذف شد.');}}else{const result=await api().testBrainProvider(provider);notice(result.ok?'اتصال '+PROVIDER_NAMES[provider]+' برقرار است.':'آزمایش '+PROVIDER_NAMES[provider]+' ناموفق بود؛ کلید، سهمیه و شبکه را بررسی کن.');}}catch(error){withError(error);}finally{b.disabled=false;}};
  $('#modelSelect').onchange=e=>{state.model=e.target.value;updateAccountUi();notice('مدل '+(state.model.startsWith('online:')?PROVIDER_NAMES[state.model.slice(7)]:'ChatGPT')+' انتخاب شد.');};
  $('#voiceEnabled').onchange=e=>voice.setEnabled(e.target.checked);
  $('#voiceAutoRead').onchange=e=>{state.autoRead=e.target.checked;localStorage.setItem(VOICE_READ_KEY,state.autoRead?'1':'0');$('#autoSpeak').classList.toggle('active',state.autoRead);};
  $('#voiceRate').oninput=e=>{voice.configure({rate:Number(e.target.value)});$('#voiceRateValue').textContent=Number(e.target.value).toFixed(2)+'×';};
  $('#voicePitch').oninput=e=>{voice.configure({pitch:Number(e.target.value)});$('#voicePitchValue').textContent=Number(e.target.value).toFixed(2)+'×';};
  $('#voicePreview').onclick=()=>voice.speak('سلام! من ماریا هستم. صدای من رو می‌شنوی؟').then(ok=>{if(!ok)notice('موتور صدای فارسی در دسترس نیست.');});
  $('#voiceStop').onclick=()=>voice.stop('user-stop');
  $('#minimizeChat').onclick=()=>api().minimizeChat().catch(withError);
  $('#closeChat').onclick=()=>api().hideChat().catch(withError);
  api().onEvent?.(event=>{
    if(event.type==='stream')pushStream(event.delta);
    if(event.type==='thinking'&&busy)setStatus(event.kind==='grounded-research'?'در حال بررسی منابع…':'در حال پردازش…');
    if(event.type==='tool'&&busy)setStatus('در حال اجرای دستور…');
    if(event.type==='reminder'||event.type==='break-reminder')notice(event.text||event.item?.message||'یادآوری');
  });
  api().onFocusInput?.(()=>$('#input').focus());
  api().onOpenSettings?.(payload=>openSettings(payload?.section==='voice'?'voice':'account'));
  api().onPrefillPrompt?.(payload=>{const text=payload?.text||'';if(text){$('#input').value=text;grow();if(payload.submit)sendMessage(text);}});
  const poll=setInterval(()=>{if(state.account?.session?.status==='connecting'&&!state.connecting)syncAccount().catch(()=>{});},3000);
  window.addEventListener('beforeunload',()=>clearInterval(poll),{once:true});
  busyUI();grow();$('#input').focus();
}
