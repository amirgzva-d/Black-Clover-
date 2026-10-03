import './style.css';
import { mountAvatar } from './avatar.js';

document.querySelector('#app').innerHTML=`<main><section class="avatar"><div id="avatar3d"></div><div class="brand">BLACK CLOVER <span id="status">در حال بررسی…</span></div></section><section class="chat"><header><b>دستیار ویندوز</b><small>Ctrl + Shift + Space • Local AI Agent</small></header><div id="messages"></div><div id="confirm" hidden></div><form id="form"><button type="button" id="mic" title="فرمان صوتی">🎙</button><input id="input" autocomplete="off" placeholder="دستور بده یا با من حرف بزن…"/><button>ارسال</button></form></section></main>`;
mountAvatar(document.querySelector('#avatar3d'));
const messages=document.querySelector('#messages'),input=document.querySelector('#input'),form=document.querySelector('#form'),status=document.querySelector('#status'),confirmBox=document.querySelector('#confirm'),mic=document.querySelector('#mic');
function bubble(who,text){const d=document.createElement('div');d.className=`msg ${who}`;d.textContent=text;messages.append(d);messages.scrollTop=messages.scrollHeight;}
async function refresh(){try{const s=await window.blackClover.getStatus();status.textContent=s.ollama?`آماده • ${s.model}`:'Ollama در دسترس نیست';}catch{status.textContent='خطا در اتصال';}}refresh();
async function send(text){text=String(text||'').trim();if(!text)return;bubble('user',text);status.textContent='در حال فکر…';try{const r=await window.blackClover.chat(text);bubble('bot',r.text);status.textContent='آماده';if(r.requiresConfirmation)showConfirm(r.confirmationId,r.text);}catch(err){bubble('bot',`خطا: ${err.message||err}`);status.textContent='خطا';}}
form.addEventListener('submit',async e=>{e.preventDefault();const text=input.value;input.value='';await send(text);});
function showConfirm(id,text){confirmBox.hidden=false;confirmBox.innerHTML='';const p=document.createElement('span');p.textContent=text;const yes=document.createElement('button');yes.textContent='تأیید';const no=document.createElement('button');no.textContent='لغو';confirmBox.append(p,yes,no);const done=async approved=>{confirmBox.hidden=true;const r=await window.blackClover.confirm(id,approved);bubble('bot',r.text);};yes.onclick=()=>done(true);no.onclick=()=>done(false);}
const SR=window.SpeechRecognition||window.webkitSpeechRecognition;
if(SR){const rec=new SR();rec.lang='fa-IR';rec.interimResults=false;rec.continuous=false;rec.onresult=async e=>{const text=e.results[0][0].transcript;input.value='';await send(text);};rec.onerror=e=>{status.textContent=`خطای میکروفن: ${e.error}`;};rec.onstart=()=>{mic.classList.add('active');status.textContent='گوش می‌دهم…';};rec.onend=()=>mic.classList.remove('active');mic.onclick=()=>rec.start();}else{mic.disabled=true;mic.title='SpeechRecognition در این محیط در دسترس نیست';}
window.blackClover.onEvent(e=>{if(e.type==='tool')status.textContent=`در حال اجرا: ${e.name}`;});
window.blackClover.onFocusInput?.(()=>{input.focus();input.select();});
input.focus();
