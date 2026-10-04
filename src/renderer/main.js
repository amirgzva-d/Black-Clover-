import './style.css';
import './avatarPicker.css';
import './setup.css';
import { mountAvatar } from './avatar.js';
import { importMotionPack, listMotions } from './motionStorage.js';
import { voice } from './voice.js';
import { detectEmotion, emotionDuration } from './emotion.js';
import { PresenceManager } from './presence.js';

const icon = name => ({
  mic: '<svg viewBox="0 0 24 24"><path d="M12 15a4 4 0 0 0 4-4V5a4 4 0 1 0-8 0v6a4 4 0 0 0 4 4Z"/><path d="M19 11a7 7 0 0 1-14 0M12 18v4M8 22h8"/></svg>',
  send: '<svg viewBox="0 0 24 24"><path d="m22 2-7 20-4-9-9-4Z"/><path d="M22 2 11 13"/></svg>',
  sound: '<svg viewBox="0 0 24 24"><path d="M11 5 6 9H2v6h4l5 4Z"/><path d="M15 9a4 4 0 0 1 0 6M18 6a8 8 0 0 1 0 12"/></svg>',
  mute: '<svg viewBox="0 0 24 24"><path d="M11 5 6 9H2v6h4l5 4Z"/><path d="m22 9-6 6M16 9l6 6"/></svg>',
  avatar: '<svg viewBox="0 0 24 24"><circle cx="12" cy="8" r="4"/><path d="M4 21a8 8 0 0 1 16 0"/></svg>',
  settings: '<svg viewBox="0 0 24 24"><circle cx="12" cy="12" r="3"/><path d="M19.4 15a1.7 1.7 0 0 0 .34 1.88l.06.06-2.83 2.83-.06-.06A1.7 1.7 0 0 0 15 19.4a1.7 1.7 0 0 0-1 .6 1.7 1.7 0 0 0-.4 1.1V21h-4v-.1A1.7 1.7 0 0 0 8 19.4a1.7 1.7 0 0 0-1.88.34l-.06.06-2.83-2.83.06-.06A1.7 1.7 0 0 0 3.6 15a1.7 1.7 0 0 0-.6-1 1.7 1.7 0 0 0-1.1-.4H2v-4h.1A1.7 1.7 0 0 0 3.6 8a1.7 1.7 0 0 0-.34-1.88l-.06-.06 2.83-2.83.06.06A1.7 1.7 0 0 0 8 3.6a1.7 1.7 0 0 0 1-.6 1.7 1.7 0 0 0 .4-1.1V2h4v.1A1.7 1.7 0 0 0 15 3.6a1.7 1.7 0 0 0 1.88-.34l.06-.06 2.83 2.83-.06.06A1.7 1.7 0 0 0 19.4 8c.13.37.34.7.6 1 .3.3.68.5 1.1.5h.1v4h-.1a1.7 1.7 0 0 0-1.7 1.5Z"/></svg>'
}[name] || '');

document.querySelector('#app').innerHTML = `
<main>
  <section class="avatar" id="avatarPanel">
    <div id="avatar3d"></div>
    <div class="brand"><span class="brand-mark">✦</span><div>BLACK CLOVER<small>MARIA • HYBRID AI COMPANION</small></div></div>
    <button class="motion-pick" id="motionPick" type="button">حرکت‌های VRMA</button>
    <button class="avatar-pick" id="avatarPick" type="button">${icon('avatar')}<span>تغییر شخصیت</span></button>
    <input id="avatarFile" type="file" accept=".vrm,model/gltf-binary" hidden />
    <input id="motionFile" type="file" accept=".zip,.vrma,application/zip" hidden />
    <div class="avatar-drop-hint">VRM یا Motion Pack را اینجا رها کن</div>
  </section>
  <section class="chat-shell"><section class="chat">
    <header>
      <div class="assistant-id"><div class="orb">✦</div><div><b>Maria • Black Clover</b><div class="presence"><i></i><span id="status">در حال بررسی…</span></div></div></div>
      <div class="header-actions"><span class="shortcut">Ctrl + Shift + Space</span><button class="icon-btn settings-btn" id="settings" type="button" title="آماده‌سازی و تنظیمات">${icon('settings')}</button><button class="icon-btn" type="button" id="speaker"></button></div>
    </header>
    <div id="activity" class="activity" hidden><span class="spinner"></span><span id="activityText">در حال فکر کردن…</span></div>
    <div id="messages"><div class="welcome"><div class="welcome-icon">✦</div><b>آماده‌ام.</b><span>دستور بده، سؤال بپرس یا فقط باهام حرف بزن.</span></div></div>
    <div id="confirm" hidden></div>
    <form id="form"><button type="button" class="composer-btn" id="mic">${icon('mic')}</button><div class="input-wrap"><input id="input" autocomplete="off" placeholder="پیام یا دستور بنویس…"/><span class="input-hint">Enter</span></div><button class="send-btn" title="ارسال">${icon('send')}</button></form>
  </section></section>
</main>
<div id="setup" class="setup-backdrop" hidden>
  <section class="setup-panel">
    <div class="setup-head"><div><h2>آماده‌سازی حرفه‌ای ماریا</h2><p>موتورهای هوش مصنوعی، Vision، صدا، کدنویسی و دسترسی Windows اینجا بررسی می‌شوند. نصب فقط با کلیک خودت انجام می‌شود.</p></div><button id="setupClose" class="setup-close">×</button></div>
    <div id="setupSummary" class="setup-summary"></div>
    <div class="setup-actions"><button id="installRecommended" class="primary">نصب همه موارد پیشنهادی</button><button id="restartAdmin">اجرا با Administrator</button><button id="startupToggle">شروع همراه Windows</button><button id="setupRefresh">بررسی دوباره</button></div>
    <div id="depList" class="dep-list"></div>
    <div class="setup-note">حذف فایل/برنامه، خاموش‌کردن و کارهای برگشت‌ناپذیر همچنان محافظت می‌شوند. بقیه کارهای معمول در حالت Autonomous بدون سؤال اضافه انجام می‌شوند.</div>
  </section>
</div>`;

const $ = q => document.querySelector(q);
const avatarRoot = $('#avatar3d');
const avatarPanel = $('#avatarPanel');
const avatarFile = $('#avatarFile');
const avatarPick = $('#avatarPick');
const motionFile = $('#motionFile');
const motionPick = $('#motionPick');
const messages = $('#messages');
const input = $('#input');
const form = $('#form');
const status = $('#status');
const confirmBox = $('#confirm');
const mic = $('#mic');
const speaker = $('#speaker');
const activity = $('#activity');
const activityText = $('#activityText');
const setup = $('#setup');
const depList = $('#depList');
const setupSummary = $('#setupSummary');

const avatarControllerPromise = mountAvatar(avatarRoot);
let diagnostics = null;
let lastMotionAt = 0;
let localRecording = null;
let browserRec = null;

function setActivity(text = '') {
  activity.hidden = !text;
  if (text) activityText.textContent = text;
}

function showEmotion(text) {
  const emotion = detectEmotion(text);
  avatarRoot.dispatchEvent(new CustomEvent('blackclover:emotion', { detail: { emotion, duration: emotionDuration(emotion) } }));
  return emotion;
}

async function contextualMotion(text, emotion) {
  if (Date.now() - lastMotionAt < 9000) return;
  let id = null;
  if (/(^|\s)(سلام|درود|صبح بخیر|شب بخیر|خوش اومد|خوش آمد)/i.test(text)) id = 'greeting';
  else if (/(انجام شد|موفق|عالی|تموم شد|تمام شد|よし|はい)/i.test(text)) id = 'peace';
  else if (emotion === 'surprised' && Math.random() < 0.35) id = 'spin';
  else if (/(بزن بریم|حمله|شروع کنیم|شوخی|هه|خخ)/i.test(text) && Math.random() < 0.35) id = 'shoot';
  if (!id) return;
  try {
    const controller = await avatarControllerPromise;
    await controller.playMotion(id);
    lastMotionAt = Date.now();
  } catch {}
}

function bubble(who, text) {
  $('.welcome')?.remove();
  const row = document.createElement('div');
  row.className = `message-row ${who}`;
  const body = document.createElement('div');
  body.className = 'msg';
  body.textContent = text;
  const meta = document.createElement('small');
  meta.textContent = who === 'user' ? 'شما' : 'Maria';
  row.append(meta, body);
  messages.append(row);
  requestAnimationFrame(() => row.classList.add('show'));
  messages.scrollTo({ top: messages.scrollHeight, behavior: 'smooth' });
  if (who === 'bot') {
    const emotion = showEmotion(text);
    contextualMotion(text, emotion);
  }
}

async function useAvatarFile(file) {
  if (!file) return;
  avatarPanel.classList.add('avatar-importing');
  status.textContent = 'در حال آماده‌کردن شخصیت…';
  try {
    const controller = await avatarControllerPromise;
    const result = await controller.loadFile(file, { persist: true });
    status.textContent = 'شخصیت آماده است';
    avatarPick.title = `مدل فعلی: ${result.name}`;
  } catch (error) {
    bubble('bot', `این مدل VRM لود نشد: ${error.message || error}`);
  } finally {
    avatarPanel.classList.remove('avatar-importing', 'dragging');
    avatarFile.value = '';
  }
}

async function useMotionFile(file) {
  if (!file) return;
  setActivity('در حال واردکردن حرکت‌های VRMA…');
  try {
    const items = await importMotionPack(file);
    if (!items.length) throw new Error('هیچ حرکت VRMA معتبری پیدا نشد');
    motionPick.textContent = `حرکت‌ها • ${items.length}`;
    const controller = await avatarControllerPromise;
    await controller.playMotion(items.find(x => x.id === 'greeting') ? 'greeting' : items[0].id);
    bubble('bot', `よし، ${items.length} حرکت نصب شد؛ الان می‌تونم ازشون موقع واکنش‌ها استفاده کنم.`);
  } catch (error) {
    bubble('bot', `Motion Pack لود نشد: ${error.message || error}`);
  } finally {
    setActivity('');
    motionFile.value = '';
  }
}

avatarPick.onclick = () => avatarFile.click();
avatarFile.onchange = () => useAvatarFile(avatarFile.files?.[0]);
motionPick.onclick = () => motionFile.click();
motionFile.onchange = () => useMotionFile(motionFile.files?.[0]);
avatarPanel.addEventListener('dragover', event => { event.preventDefault(); avatarPanel.classList.add('dragging'); });
avatarPanel.addEventListener('dragleave', () => avatarPanel.classList.remove('dragging'));
avatarPanel.addEventListener('drop', event => {
  event.preventDefault();
  avatarPanel.classList.remove('dragging');
  const file = [...event.dataTransfer.files][0];
  if (!file) return;
  if (file.name.toLowerCase().endsWith('.vrm')) useAvatarFile(file);
  else if (/\.(zip|vrma)$/i.test(file.name)) useMotionFile(file);
});
avatarRoot.addEventListener('blackclover:avatar-loaded', event => {
  const meta = event.detail?.meta || {};
  const name = meta.name || meta.title || meta.meta?.title;
  avatarPick.title = name ? `مدل فعلی: ${name}` : 'تغییر کاراکتر VRM';
});
listMotions().then(items => { if (items.length) motionPick.textContent = `حرکت‌ها • ${items.length}`; }).catch(() => {});

function setSpeaker() {
  speaker.innerHTML = icon(voice.enabled ? 'sound' : 'mute');
  speaker.classList.toggle('off', !voice.enabled);
  speaker.title = voice.enabled ? 'صدای دستیار روشن است' : 'صدای دستیار خاموش است';
}
setSpeaker();
speaker.onclick = () => voice.setEnabled(!voice.enabled);
voice.addEventListener('enabled', setSpeaker);
voice.addEventListener('state', event => {
  const speaking = event.detail.state === 'speaking';
  document.body.classList.toggle('assistant-speaking', speaking);
  avatarRoot.dataset.voiceState = speaking ? 'speaking' : 'idle';
  if (speaking) {
    status.textContent = 'در حال صحبت…';
    setActivity('');
  } else if (!input.disabled) status.textContent = 'آماده';
});
voice.addEventListener('boundary', () => avatarRoot.dispatchEvent(new CustomEvent('blackclover:voice-pulse')));

const presence = new PresenceManager({
  onLine: text => { bubble('bot', text); voice.speak(text); },
  onStatus: state => {
    const localOk = Boolean(state.ollama);
    const internet = Boolean(state.brain?.internet);
    const onlineBrain = state.brain?.mode === 'online';
    document.body.classList.toggle('offline', !internet);
    status.textContent = localOk ? `${onlineBrain ? 'آنلاین' : 'محلی'} • ${state.model}${internet ? '' : ' • بدون اینترنت'}` : 'Ollama در دسترس نیست';
  }
});
presence.start();

async function send(text) {
  text = String(text || '').trim();
  if (!text) return;
  voice.stop('user-input');
  bubble('user', text);
  input.disabled = true;
  setActivity('در حال فکر کردن…');
  status.textContent = 'در حال فکر…';
  try {
    const response = await window.blackClover.chat(text);
    setActivity('');
    bubble('bot', response.text);
    voice.speak(response.text);
    if (!voice.enabled) status.textContent = 'آماده';
    if (response.requiresConfirmation) showConfirm(response.confirmationId, response.text);
  } catch (error) {
    setActivity('');
    bubble('bot', `خطا: ${error.message || error}`);
    status.textContent = 'خطا';
  } finally {
    input.disabled = false;
    input.focus();
  }
}

form.addEventListener('submit', async event => {
  event.preventDefault();
  const text = input.value;
  input.value = '';
  await send(text);
});

function showConfirm(id, text) {
  confirmBox.hidden = false;
  confirmBox.innerHTML = '';
  const badge = document.createElement('div');
  badge.className = 'confirm-icon';
  badge.textContent = '!';
  const body = document.createElement('div');
  body.className = 'confirm-copy';
  const title = document.createElement('b');
  title.textContent = 'کار مخرب/برگشت‌ناپذیر';
  const message = document.createElement('span');
  message.textContent = text;
  body.append(title, message);
  const actions = document.createElement('div');
  actions.className = 'confirm-actions';
  const yes = document.createElement('button');
  yes.className = 'approve';
  yes.textContent = 'تأیید و ادامه';
  const no = document.createElement('button');
  no.className = 'cancel';
  no.textContent = 'انجام نده';
  actions.append(no, yes);
  confirmBox.append(badge, body, actions);
  const done = async approved => {
    voice.stop('confirmation');
    confirmBox.hidden = true;
    setActivity('در حال ادامه کار…');
    const response = await window.blackClover.confirm(id, approved);
    setActivity('');
    bubble('bot', response.text);
    voice.speak(response.text);
    if (response.requiresConfirmation) showConfirm(response.confirmationId, response.text);
  };
  yes.onclick = () => done(true);
  no.onclick = () => done(false);
}

function listening(on, text = 'دارم گوش می‌دم…') {
  mic.classList.toggle('active', on);
  document.body.classList.toggle('assistant-listening', on);
  avatarRoot.dataset.voiceState = on ? 'listening' : 'idle';
  setActivity(on ? text : '');
  status.textContent = on ? 'گوش می‌دهم…' : 'آماده';
}

async function recordLocal() {
  if (localRecording) {
    localRecording.stop();
    return;
  }
  voice.stop('listening');
  const stream = await navigator.mediaDevices.getUserMedia({ audio: { echoCancellation: true, noiseSuppression: true, autoGainControl: true } });
  const mime = MediaRecorder.isTypeSupported('audio/webm;codecs=opus') ? 'audio/webm;codecs=opus' : 'audio/webm';
  const recorder = new MediaRecorder(stream, { mimeType: mime });
  const chunks = [];
  const audioContext = new AudioContext();
  const source = audioContext.createMediaStreamSource(stream);
  const analyser = audioContext.createAnalyser();
  analyser.fftSize = 1024;
  source.connect(analyser);
  const data = new Uint8Array(analyser.fftSize);
  const started = performance.now();
  let speechSeen = false;
  let lastVoice = started;
  let raf = 0;
  localRecording = { stop: () => { if (recorder.state !== 'inactive') recorder.stop(); } };
  listening(true, 'Whisper محلی گوش می‌ده…');
  recorder.ondataavailable = event => { if (event.data.size) chunks.push(event.data); };
  recorder.onstop = async () => {
    cancelAnimationFrame(raf);
    stream.getTracks().forEach(track => track.stop());
    audioContext.close().catch(() => {});
    localRecording = null;
    listening(false);
    try {
      setActivity('در حال فهمیدن صدای فارسی…');
      const bytes = new Uint8Array(await new Blob(chunks, { type: mime }).arrayBuffer());
      const result = await window.blackClover.transcribeAudio(bytes, 'fa');
      setActivity('');
      if (result?.text) await send(result.text);
    } catch (error) {
      setActivity('');
      bubble('bot', `Whisper محلی نتونست صدا رو بخونه: ${error.message || error}`);
      if (diagnostics?.speech) diagnostics.speech.localStt = false;
    }
  };
  recorder.start(250);
  const monitor = () => {
    if (recorder.state === 'inactive') return;
    analyser.getByteTimeDomainData(data);
    let sum = 0;
    for (const value of data) {
      const normalized = (value - 128) / 128;
      sum += normalized * normalized;
    }
    const rms = Math.sqrt(sum / data.length);
    const now = performance.now();
    if (rms > 0.025) { speechSeen = true; lastVoice = now; }
    if ((speechSeen && now - lastVoice > 1300 && now - started > 1200) || now - started > 20000) {
      recorder.stop();
      return;
    }
    raf = requestAnimationFrame(monitor);
  };
  raf = requestAnimationFrame(monitor);
}

function setupBrowserRecognition() {
  const SpeechRecognition = window.SpeechRecognition || window.webkitSpeechRecognition;
  if (!SpeechRecognition) return null;
  const recognition = new SpeechRecognition();
  recognition.lang = 'fa-IR';
  recognition.interimResults = false;
  recognition.continuous = false;
  recognition.maxAlternatives = 1;
  recognition.onresult = event => send(event.results[0][0].transcript);
  recognition.onerror = event => {
    listening(false);
    status.textContent = event.error === 'no-speech' ? 'صدایی نشنیدم' : `خطای میکروفن: ${event.error}`;
  };
  recognition.onstart = () => { voice.stop('listening'); listening(true); };
  recognition.onend = () => listening(false);
  return recognition;
}

browserRec = setupBrowserRecognition();
mic.onclick = async () => {
  try {
    const speech = diagnostics?.speech || await window.blackClover.speechStatus();
    if (speech?.localStt) { await recordLocal(); return; }
    if (browserRec) { browserRec.start(); return; }
    openSetup();
  } catch (error) {
    listening(false);
    bubble('bot', `میکروفن آماده نشد: ${error.message || error}`);
  }
};

async function refreshSetup() {
  setupSummary.innerHTML = '<div class="setup-stat"><b>در حال بررسی…</b><span>چند ثانیه</span></div>';
  diagnostics = await window.blackClover.diagnostics();
  const items = diagnostics.dependencies.items;
  const ready = items.filter(item => item.installed).length;
  setupSummary.innerHTML = `<div class="setup-stat"><b>${ready}/${items.length}</b><span>ابزار آماده</span></div><div class="setup-stat"><b>${diagnostics.admin ? 'Administrator' : 'Standard'}</b><span>سطح دسترسی Windows</span></div><div class="setup-stat"><b>${diagnostics.speech.localStt ? 'Whisper محلی' : browserRec ? 'Web Speech' : 'بدون STT'}</b><span>میکروفن</span></div>`;
  depList.innerHTML = '';
  for (const item of items) {
    const row = document.createElement('div');
    row.className = `dep-row ${item.installed ? 'ok' : ''}`;
    row.dataset.id = item.id;
    row.innerHTML = `<i class="dep-dot"></i><div class="dep-main"><b>${item.name}${item.required ? ' • ضروری' : ''}</b><span>${item.detail}</span></div>${item.installed ? '<span class="dep-state">آماده ✓</span>' : `<button class="dep-install" data-install="${item.id}">نصب خودکار</button>`}<div class="dep-progress" hidden><i></i></div>`;
    depList.append(row);
  }
  $('#restartAdmin').disabled = diagnostics.admin;
  $('#restartAdmin').textContent = diagnostics.admin ? 'Administrator فعال است' : 'اجرا با Administrator';
  $('#startupToggle').textContent = diagnostics.startup.openAtLogin ? 'شروع با Windows: روشن' : 'شروع با Windows: خاموش';
  voice.refreshLocalStatus();
  return diagnostics;
}

async function installOne(id) {
  const button = depList.querySelector(`[data-install="${id}"]`);
  if (button) { button.disabled = true; button.textContent = 'در حال نصب…'; }
  try {
    await window.blackClover.installDependency(id);
    await refreshSetup();
  } catch (error) {
    bubble('bot', `نصب ${id} کامل نشد: ${error.message || error}`);
    if (button) { button.disabled = false; button.textContent = 'تلاش دوباره'; }
  }
}

depList.addEventListener('click', event => {
  const id = event.target?.dataset?.install;
  if (id) installOne(id);
});

async function openSetup() {
  setup.hidden = false;
  try { await refreshSetup(); }
  catch (error) { setupSummary.textContent = `خطا در بررسی: ${error.message || error}`; }
}

$('#settings').onclick = openSetup;
$('#setupClose').onclick = () => { setup.hidden = true; };
$('#setupRefresh').onclick = refreshSetup;
$('#restartAdmin').onclick = () => window.blackClover.restartAsAdmin().catch(error => bubble('bot', String(error)));
$('#startupToggle').onclick = async () => {
  const current = await window.blackClover.getStartup();
  await window.blackClover.setStartup(!current.openAtLogin);
  await refreshSetup();
};
$('#installRecommended').onclick = async () => {
  const order = ['ollama', 'qwen', 'vision', 'ffmpeg', 'whisper_runtime', 'whisper_model', 'python', 'piper', 'piper_voice', 'git', 'vscode'];
  $('#installRecommended').disabled = true;
  try {
    for (const id of order) {
      const item = diagnostics?.dependencies?.items?.find(candidate => candidate.id === id);
      if (item && !item.installed) await installOne(id);
    }
  } finally {
    $('#installRecommended').disabled = false;
  }
};

window.blackClover.onEvent(event => {
  if (event.type === 'thinking') setActivity('در حال فکر کردن…');
  if (event.type === 'tool') {
    setActivity('در حال انجام کار…');
    status.textContent = `در حال اجرا: ${event.name}`;
  }
  if (event.type === 'dependency') {
    const row = depList.querySelector(`[data-id="${event.id}"]`);
    const bar = row?.querySelector('.dep-progress');
    const fill = bar?.querySelector('i');
    if (bar) {
      bar.hidden = false;
      if (fill && Number.isFinite(event.percent)) fill.style.width = `${event.percent}%`;
    }
  }
  if (event.type === 'break-reminder' || event.type === 'reminder') {
    const text = event.text || event.item?.message;
    if (text) { bubble('bot', text); voice.speak(text); }
  }
});

window.blackClover.onFocusInput?.(() => {
  voice.stop('focus-input');
  input.focus();
  input.select();
});

setTimeout(async () => {
  try {
    const result = await window.blackClover.diagnostics();
    diagnostics = result;
    if (!result.dependencies.recommendedReady) openSetup();
    else voice.refreshLocalStatus();
  } catch {}
}, 700);

input.focus();
window.addEventListener('beforeunload', () => presence.stop());
