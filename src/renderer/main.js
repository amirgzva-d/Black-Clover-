import './style.css';
import { mountAvatar } from './avatar.js';
import { voice } from './voice.js';
import { detectEmotion,emotionDuration } from './emotion.js';
import { PresenceManager } from './presence.js';

const icon=(name)=>({
  mic:'<svg viewBox="0 0 24 24"><path d="M12 15a4 4 0 0 0 4-4V5a4 4 0 1 0-8 0v6a4 4 0 0 0 4 4Z"/><path d="M19 11a7 7 0 0 1-14 0M12 18v4M8 22h8"/></svg>',
  send:'<svg viewBox="0 0 24 24"><path d="m22 2-7 20-4-9-9-4Z"/><path d="M22 2 11 13"/></svg>',
  sound:'<svg viewBox="0 0 24 24"><path d="M11 5 6 9H2v6h4l5 4Z"/><path d="M15 9a4 4 0 0 1 0 6M18 6a8 8 0 0 1 0 12"/></svg>',
  mute:'<svg viewBox="0 0 24 24"><path d="M11 5 6 9H2v6h4l5 4Z"/><path d="m22 9-6 6M16 9l6 6"/></svg>',
  avatar:'<svg viewBox="0 0 24 24"><circle cx="12" cy="8" r="4"/><path d="M4 21a8 8 0 0 1 16 0"/></svg>'
}[name]||'');

document.querySelector('#app').innerHTML=`<main>
<section class="avatar" id="avatarPanel">
  <div id="avatar3d"></div>
  <div class="brand"><span class="brand-mark">✦</span><div>BLACK CLOVER<small>MARIA • LOCAL AI COMPANION</small></div></div>
  <button class="avatar-pick" id="avatarPick" type="button" title="انتخاب یا تغییر کاراکتر VRM">${icon('avatar')}<span>تغییر شخصیت</span></button>
  <input id="avatarFile" type="file" accept=".vrm,model/gltf-binary" hidden />
  <div class="avatar-drop-hint">فایل VRM را اینجا رها کن</div>
</section>
<section class="chat-shell"><section class="chat">
<header><div class="assistant-id"><div class="orb">✦</div><div><b>Maria • Black Clover</b><div class="presence"><i></i><span id="status">در حال بررسی…</span></div></div></div><div class="header-actions"><span class="shortcut">Ctrl + Shift + Space</span><button class="icon-btn" type="button" id="speaker" aria-label="صدای دستیار"></button></div></header>
<div id="activity" class="activity" hidden><span class="spinner"></span><span id="activityText">در حال فکر کردن…</span></div>
<div id="messages"><div class="welcome"><div class="welcome-icon">✦</div><b>آماده‌ام.</b><span>دستور بده، سؤال بپرس یا فقط باهام حرف بزن.</span></div></div>
<div id="confirm" hidden></div>
<form id="form"><button type="button" class="composer-btn" id="mic" title="فرمان صوتی">${icon('mic')}</button><div class="input-wrap"><input id="input" autocomplete="off" placeholder="پیام یا دستور بنویس…"/><span class="input-hint">Enter</span></div><button class="send-btn" title="ارسال">${icon('send')}</button></form>
</section></section></main>`;

const avatarRoot=document.querySelector('#avatar3d'),avatarPanel=document.querySelector('#avatarPanel'),avatarFile=document.querySelector('#avatarFile'),avatarPick=document.querySelector('#avatarPick');
const avatarControllerPromise=mountAvatar(avatarRoot);
const messages=document.querySelector('#messages'),input=document.querySelector('#input'),form=document.querySelector('#form'),status=document.querySelector('#status'),confirmBox=document.querySelector('#confirm'),mic=document.querySelector('#mic'),speaker=document.querySelector('#speaker'),activity=document.querySelector('#activity'),activityText=document.querySelector('#activityText');

function setActivity(text=''){activity.hidden=!text;if(text)activityText.textContent=text;}
function showEmotion(text){const emotion=detectEmotion(text),duration=emotionDuration(emotion);avatarRoot.dispatchEvent(new CustomEvent('blackclover:emotion',{detail:{emotion,duration}}));}
function bubble(who,text){document.querySelector('.welcome')?.remove();const row=document.createElement('div');row.className=`message-row ${who}`;const d=document.createElement('div');d.className='msg';d.textContent=text;const meta=document.createElement('small');meta.textContent=who==='user'?'شما':'Maria';row.append(meta,d);messages.append(row);requestAnimationFrame(()=>row.classList.add('show'));messages.scrollTo({top:messages.scrollHeight,behavior:'smooth'});if(who==='bot')showEmotion(text);}

async function useAvatarFile(file){
  if(!file)return;
  avatarPanel.classList.add('avatar-importing');status.textContent='در حال آماده‌کردن شخصیت…';
  try{const controller=await avatarControllerPromise;const result=await controller.loadFile(file,{persist:true});status.textContent='شخصیت آماده است';avatarPick.querySelector('span').textContent='تغییر شخصیت';avatarPick.title=`مدل فعلی: ${result.name}`;}
  catch(err){bubble('bot',`این مدل VRM لود نشد: ${err.message||err}`);status.textContent='خطای مدل VRM';}
  finally{avatarPanel.classList.remove('avatar-importing','dragging');avatarFile.value='';}
}
avatarPick.addEventListener('click',()=>avatarFile.click());avatarFile.addEventListener('change',()=>useAvatarFile(avatarFile.files?.[0]));
avatarPanel.addEventListener('dragover',e=>{e.preventDefault();if([...e.dataTransfer.items].some(x=>x.kind==='file'))avatarPanel.classList.add('dragging');});
avatarPanel.addEventListener('dragleave',e=>{if(!avatarPanel.contains(e.relatedTarget))avatarPanel.classList.remove('dragging');});
avatarPanel.addEventListener('drop',e=>{e.preventDefault();avatarPanel.classList.remove('dragging');const file=[...e.dataTransfer.files].find(f=>f.name.toLowerCase().endsWith('.vrm'));if(file)useAvatarFile(file);});
avatarRoot.addEventListener('blackclover:avatar-loaded',e=>{const meta=e.detail?.meta||{},name=meta.name||meta.title||meta.meta?.title;avatarPick.title=name?`مدل فعلی: ${name}`:'تغییر کاراکتر VRM';});

function setSpeaker(){speaker.innerHTML=icon(voice.enabled?'sound':'mute');speaker.classList.toggle('off',!voice.enabled);speaker.title=voice.enabled?'صدای دستیار روشن است':'صدای دستیار خاموش است';}setSpeaker();speaker.onclick=()=>voice.setEnabled(!voice.enabled);voice.addEventListener('enabled',setSpeaker);
voice.addEventListener('state',e=>{const speaking=e.detail.state==='speaking';document.body.classList.toggle('assistant-speaking',speaking);avatarRoot.dataset.voiceState=speaking?'speaking':'idle';if(speaking){status.textContent='در حال صحبت…';setActivity('');}else if(!input.disabled)status.textContent='آماده';});voice.addEventListener('boundary',()=>avatarRoot.dispatchEvent(new CustomEvent('blackclover:voice-pulse')));

const presence=new PresenceManager({onLine:text=>{bubble('bot',text);voice.speak(text);},onStatus:s=>{const localOk=Boolean(s.ollama),internet=Boolean(s.brain?.internet),onlineBrain=s.brain?.mode==='online';document.body.classList.toggle('offline',!internet);status.textContent=localOk?`${onlineBrain?'آنلاین':'محلی'} • ${s.model}${internet?'':' • بدون اینترنت'}`:'Ollama در دسترس نیست';}});presence.start();

async function send(text){text=String(text||'').trim();if(!text)return;voice.stop('user-input');bubble('user',text);input.disabled=true;setActivity('در حال فکر کردن…');status.textContent='در حال فکر…';try{const r=await window.blackClover.chat(text);setActivity('');bubble('bot',r.text);input.disabled=false;voice.speak(r.text);if(!voice.enabled)status.textContent='آماده';if(r.requiresConfirmation)showConfirm(r.confirmationId,r.text);}catch(err){setActivity('');const msg=`خطا: ${err.message||err}`;bubble('bot',msg);status.textContent='خطا';}finally{input.disabled=false;input.focus();}}
form.addEventListener('submit',async e=>{e.preventDefault();const text=input.value;input.value='';await send(text);});
function showConfirm(id,text){confirmBox.hidden=false;confirmBox.innerHTML='';const badge=document.createElement('div');badge.className='confirm-icon';badge.textContent='!';const body=document.createElement('div');body.className='confirm-copy';const title=document.createElement('b');title.textContent='نیاز به تأیید شما';const p=document.createElement('span');p.textContent=text;body.append(title,p);const actions=document.createElement('div');actions.className='confirm-actions';const yes=document.createElement('button');yes.className='approve';yes.textContent='تأیید و اجرا';const no=document.createElement('button');no.className='cancel';no.textContent='لغو';actions.append(no,yes);confirmBox.append(badge,body,actions);const done=async approved=>{voice.stop('confirmation');confirmBox.hidden=true;setActivity(approved?'در حال اجرای دستور…':'');const r=await window.blackClover.confirm(id,approved);setActivity('');bubble('bot',r.text);voice.speak(r.text);};yes.onclick=()=>done(true);no.onclick=()=>done(false);}

const SR=window.SpeechRecognition||window.webkitSpeechRecognition;
if(SR){const rec=new SR();rec.lang='fa-IR';rec.interimResults=false;rec.continuous=false;rec.maxAlternatives=1;rec.onresult=async e=>{const text=e.results[0][0].transcript;input.value='';await send(text);};rec.onerror=e=>{setActivity('');status.textContent=e.error==='no-speech'?'صدایی نشنیدم':`خطای میکروفن: ${e.error}`;};rec.onstart=()=>{voice.stop('listening');mic.classList.add('active');document.body.classList.add('assistant-listening');avatarRoot.dataset.voiceState='listening';setActivity('دارم گوش می‌دم…');status.textContent='گوش می‌دهم…';};rec.onend=()=>{mic.classList.remove('active');document.body.classList.remove('assistant-listening');avatarRoot.dataset.voiceState='idle';if(activityText.textContent==='دارم گوش می‌دم…')setActivity('');};mic.onclick=()=>{try{rec.start();}catch{}};}else{mic.disabled=true;mic.title='SpeechRecognition در این محیط در دسترس نیست';}
window.blackClover.onEvent(e=>{if(e.type==='thinking')setActivity('در حال فکر کردن…');if(e.type==='tool'){setActivity('در حال انجام کار…');status.textContent=`در حال اجرا: ${e.name}`;}});window.blackClover.onFocusInput?.(()=>{voice.stop('focus-input');input.focus();input.select();});input.focus();window.addEventListener('beforeunload',()=>presence.stop());
