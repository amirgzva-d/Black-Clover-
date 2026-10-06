import { voice } from './voice.js';
import { listMotions } from './motionStorage.js';
import { listAssets, getAssetFile } from './assetLibrary.js';
import './referenceUI.css';

const ready = fn => document.readyState === 'loading'
  ? document.addEventListener('DOMContentLoaded', () => setTimeout(fn, 0), { once: true })
  : setTimeout(fn, 0);

const SURFACE = new URLSearchParams(location.search).get('surface') || 'avatar';
const esc = value => String(value ?? '').replace(/[&<>"']/g, char => ({
  '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;'
}[char]));
const svg = d => `<svg viewBox="0 0 24 24" aria-hidden="true">${d}</svg>`;
const ICON = {
  search: svg('<circle cx="11" cy="11" r="7"/><path d="m20 20-4-4"/>'),
  chat: svg('<path d="M5 5h14v10H9l-4 3V5Z"/><path d="M8 9h8M8 12h5"/>'),
  pin: svg('<path d="m9 3 6 2-1 5 3 3-5 1-4 7 1-8-3-3 4-1-1-6Z"/>'),
  clock: svg('<circle cx="12" cy="12" r="8"/><path d="M12 7v5l3 2"/>'),
  home: svg('<path d="m3 11 9-7 9 7"/><path d="M5 10v10h14V10M9 20v-6h6v6"/>'),
  sound: svg('<path d="M11 5 6 9H3v6h3l5 4Z"/><path d="M15 9a4 4 0 0 1 0 6M18 6a8 8 0 0 1 0 12"/>'),
  tools: svg('<path d="m14 6 4-4 4 4-4 4M4 20l7-7"/><path d="m5 4 4 4-2 2-4-4Z"/><path d="m14 14 6 6"/>'),
  settings: svg('<circle cx="12" cy="12" r="3"/><path d="M19 12a7 7 0 0 0-.12-1.3l2-1.55-2-3.46-2.43 1A7 7 0 0 0 14.2 5.4L14 3h-4l-.2 2.4a7 7 0 0 0-2.25 1.3l-2.43-1-2 3.46 2 1.55A7 7 0 0 0 5 12c0 .44.04.87.12 1.3l-2 1.55 2 3.46 2.43-1a7 7 0 0 0 2.25 1.3L10 21h4l.2-2.4a7 7 0 0 0 2.25-1.3l2.43 1 2-3.46-2-1.55c.08-.43.12-.86.12-1.3Z"/>'),
  wave: svg('<path d="M5 9v6M9 6v12M13 3v18M17 7v10M21 10v4"/>'),
  clip: svg('<path d="m8 12 6-6a4 4 0 1 1 6 6l-8 8a6 6 0 1 1-8-8l8-8"/>'),
  smile: svg('<circle cx="12" cy="12" r="9"/><path d="M8 10h.01M16 10h.01M8 15c2.5 2 5.5 2 8 0"/>'),
  send: svg('<path d="m22 2-7 20-4-9-9-4Z"/><path d="M22 2 11 13"/>'),
  spark: svg('<path d="m12 2 1.7 5.3L19 9l-5.3 1.7L12 16l-1.7-5.3L5 9l5.3-1.7L12 2Z"/>'),
  shirt: svg('<path d="m8 4 4 2 4-2 5 4-3 4-2-1v9H8v-9l-2 1-3-4Z"/>'),
  person: svg('<circle cx="12" cy="7" r="3"/><path d="M6 21v-5a6 6 0 0 1 12 0v5"/>'),
  motion: svg('<circle cx="8" cy="5" r="2"/><path d="m9 8 4 4 4-2M11 11l-3 5-4 3M13 12l2 5 4 2"/>'),
  crown: svg('<path d="m4 8 4 4 4-7 4 7 4-4-2 11H6Z"/>')
};

const fmtTime = () => new Intl.DateTimeFormat('fa-IR', { hour: '2-digit', minute: '2-digit' }).format(new Date());
const human = raw => {
  const text = String(raw || '').replace(/\.(vrm|zip|unitypackage|xwear|fbx|glb|gltf|png|jpg|jpeg|webp|anim)$/i, '').replace(/[_-]+/g, ' ').trim();
  const map = [
    [/alien girl/i, 'دختر فضایی'], [/moso/i, 'استایل سفید ماریا'], [/wolf/i, 'Wolf-chan'], [/evilfall/i, 'زره EvilFall'],
    [/sea themed|jellyfish|horn/i, 'اکسسوری دریایی'], [/manuka/i, 'حالت Manuka'], [/milltina/i, 'حالت Milltina'],
    [/sit/i, 'ژست نشستن'], [/pose/i, 'پک ژست'], [/face/i, 'حالت‌های چهره'], [/motion/i, 'پک حرکت']
  ];
  for (const [re, label] of map) if (re.test(text)) return label;
  return text.length > 30 ? `${text.slice(0, 28)}…` : text || 'آیتم ماریا';
};

function toast(text) {
  let el = document.querySelector('.maria-ref-toast');
  if (!el) { el = document.createElement('div'); el.className = 'maria-ref-toast'; document.body.append(el); }
  el.textContent = text;
  el.classList.add('show');
  clearTimeout(el._t);
  el._t = setTimeout(() => el.classList.remove('show'), 2600);
}

function decorateMessage(row) {
  if (!row || row.dataset.refDecorated) return;
  row.dataset.refDecorated = '1';
  const meta = row.querySelector(':scope > small');
  if (meta) {
    const who = row.classList.contains('user') ? 'شما' : 'MARIA';
    meta.innerHTML = `<span>${who}</span><time>${fmtTime()}</time>`;
  }
  if (row.classList.contains('bot')) {
    const avatar = document.createElement('img');
    avatar.className = 'message-avatar';
    avatar.src = '/reference/maria-avatar.png';
    avatar.alt = 'Maria';
    row.prepend(avatar);
  }
}

async function buildModelPanel(nativeSelect) {
  const host = document.createElement('section');
  host.className = 'reference-model-panel';
  host.hidden = true;
  host.innerHTML = `
    <div class="ref-model-head"><div><small>MARIA BRAIN</small><b>انتخاب مدل هوش مصنوعی</b></div><button type="button" data-close>×</button></div>
    <div class="ref-model-tabs"><button class="active" data-kind="all">همه</button><button data-kind="local">محلی</button><button data-kind="cloud">ابری</button></div>
    <div class="ref-model-grid"></div>
    <div class="ref-model-foot">مدل‌های محلی فقط وقتی در Ollama نصب باشند اجرا می‌شوند؛ سرویس‌های ابری به اتصال API خودت نیاز دارند.</div>`;
  document.body.append(host);
  const grid = host.querySelector('.ref-model-grid');
  let activeKind = 'all';
  let catalog = [];
  const localSuggestions = [
    { id: 'ollama:qwen2.5:3b', provider: 'ollama', model: 'qwen2.5:3b', label: 'Qwen 2.5 • 3B', quality: 'سریع و پایدار', badge: '⚡ سریع', kind: 'local' },
    { id: 'ollama:llama3.2:3b', provider: 'ollama', model: 'llama3.2:3b', label: 'Llama 3.2 • 3B', quality: 'گفتگوی عمومی', badge: 'سریع', kind: 'local' },
    { id: 'ollama:gemma3:4b', provider: 'ollama', model: 'gemma3:4b', label: 'Gemma 3 • 4B', quality: 'تعادل کیفیت/سرعت', badge: 'متعادل', kind: 'local' },
    { id: 'ollama:qwen2.5:7b', provider: 'ollama', model: 'qwen2.5:7b', label: 'Qwen 2.5 • 7B', quality: 'کیفیت بالاتر', badge: 'سنگین', kind: 'local' },
    { id: 'ollama:deepseek-r1:7b', provider: 'ollama', model: 'deepseek-r1:7b', label: 'DeepSeek R1 • 7B', quality: 'استدلال', badge: 'سنگین', kind: 'local' },
    { id: 'ollama:llama3.1:8b', provider: 'ollama', model: 'llama3.1:8b', label: 'Llama 3.1 • 8B', quality: 'کیفیت عمومی بالا', badge: 'سنگین+', kind: 'local' },
    { id: 'ollama:qwen2.5-coder:7b', provider: 'ollama', model: 'qwen2.5-coder:7b', label: 'Qwen Coder • 7B', quality: 'کدنویسی', badge: 'CODE', kind: 'local' }
  ];
  const cloudSuggestions = [
    { id: 'online:openai', provider: 'openai', label: 'ChatGPT / OpenAI', quality: 'هوش عمومی و ابزار', badge: 'CLOUD', kind: 'cloud' },
    { id: 'online:deepseek', provider: 'deepseek', label: 'DeepSeek Cloud', quality: 'استدلال و کدنویسی', badge: 'CLOUD', kind: 'cloud' },
    { id: 'online:anthropic', provider: 'anthropic', label: 'Claude', quality: 'متن و کدنویسی', badge: 'CLOUD', kind: 'cloud' },
    { id: 'online:qwen', provider: 'qwen', label: 'Qwen Cloud', quality: 'سریع و چندمنظوره', badge: 'CLOUD', kind: 'cloud' }
  ];
  const refresh = async () => {
    try { catalog = await window.blackClover?.modelCatalog?.() || []; } catch { catalog = []; }
    const available = new Map(catalog.map(x => [x.id, x]));
    const current = localStorage.getItem('blackClover:selectedModel') || 'auto';
    const merged = [{ id: 'auto', label: 'Auto • Maria', quality: 'انتخاب خودکار سریع‌ترین مسیر مناسب', badge: 'پیشنهادی', kind: 'all', available: true },
      ...localSuggestions.map(x => ({ ...x, available: available.has(x.id) })),
      ...cloudSuggestions.map(x => ({ ...x, available: available.has(x.id) })),
      ...catalog.filter(x => x.id !== 'auto' && !localSuggestions.some(s => s.id === x.id) && !cloudSuggestions.some(s => s.id === x.id)).map(x => ({ ...x, kind: x.provider === 'ollama' ? 'local' : 'cloud', quality: x.provider === 'ollama' ? 'مدل نصب‌شده' : 'اتصال فعال', badge: x.provider === 'ollama' ? 'LOCAL' : 'CLOUD', available: true }))];
    grid.innerHTML = merged.filter(x => activeKind === 'all' || x.kind === activeKind || x.id === 'auto').map(x => `
      <button type="button" class="ref-model-card ${x.id === current ? 'selected' : ''} ${x.available ? '' : 'unavailable'}" data-model="${esc(x.id)}" data-available="${x.available ? '1' : '0'}">
        <span class="model-provider">${x.provider === 'ollama' || x.kind === 'local' ? 'LOCAL' : x.id === 'auto' ? 'MARIA' : esc(String(x.provider || 'cloud').toUpperCase())}</span>
        <b>${esc(x.label)}</b><small>${esc(x.quality || x.model || '')}</small>
        <em>${esc(x.badge || (x.available ? 'آماده' : 'نیاز به اتصال'))}</em>
      </button>`).join('');
  };
  host.querySelector('[data-close]').onclick = () => { host.hidden = true; };
  host.querySelector('.ref-model-tabs').onclick = event => {
    const button = event.target.closest('[data-kind]'); if (!button) return;
    activeKind = button.dataset.kind;
    host.querySelectorAll('[data-kind]').forEach(x => x.classList.toggle('active', x === button));
    refresh();
  };
  grid.onclick = event => {
    const card = event.target.closest('[data-model]'); if (!card) return;
    const id = card.dataset.model;
    if (card.dataset.available !== '1') {
      toast(id.startsWith('ollama:') ? 'این مدل هنوز روی Ollama نصب نیست. از تنظیمات ماریا بخش مدل‌ها نصبش کن.' : 'این سرویس هنوز به API متصل نشده است.');
      return;
    }
    localStorage.setItem('blackClover:selectedModel', id);
    if (nativeSelect && [...nativeSelect.options].some(o => o.value === id)) nativeSelect.value = id;
    document.querySelector('.reference-model-button b').textContent = card.querySelector('b')?.textContent || 'Auto • Maria';
    host.hidden = true;
    toast(`مدل فعال: ${card.querySelector('b')?.textContent || id}`);
  };
  await refresh();
  return { host, refresh };
}

async function enhanceChat() {
  const chat = document.querySelector('.chat');
  const header = chat?.querySelector('header');
  const messages = document.querySelector('#messages');
  const form = document.querySelector('#form');
  if (!chat || !header || !messages || !form) return;
  document.body.classList.add('maria-reference-chat');

  const assistantId = header.querySelector('.assistant-id');
  if (assistantId) assistantId.innerHTML = `
    <img class="reference-head-avatar" src="/reference/maria-avatar.png" alt="Maria">
    <div class="reference-brand-copy"><div class="reference-name">MARIA <i></i></div><span>آنلاین همیشه در کنارتان</span></div>`;

  const headerActions = header.querySelector('.header-actions');
  headerActions?.querySelectorAll('.shortcut,.settings-btn,#speaker').forEach(x => x.classList.add('reference-hidden-control'));
  const nativeSelect = headerActions?.querySelector('.chat-model-select');
  nativeSelect?.classList.add('reference-native-model');

  const search = document.createElement('label');
  search.className = 'reference-search';
  search.innerHTML = `<input type="search" placeholder="جستجو در چت‌ها…" autocomplete="off">${ICON.search}`;
  headerActions?.prepend(search);

  const modelButton = document.createElement('button');
  modelButton.type = 'button';
  modelButton.className = 'reference-model-button';
  modelButton.innerHTML = `${ICON.spark}<span><small>مدل فعال</small><b>Auto • Maria</b></span><i>⌄</i>`;
  assistantId?.append(modelButton);
  const panel = await buildModelPanel(nativeSelect);
  const current = localStorage.getItem('blackClover:selectedModel') || 'auto';
  const currentOption = nativeSelect?.querySelector(`option[value="${CSS.escape(current)}"]`);
  if (currentOption) modelButton.querySelector('b').textContent = currentOption.textContent;
  modelButton.onclick = async event => { event.stopPropagation(); panel.host.hidden = !panel.host.hidden; if (!panel.host.hidden) await panel.refresh(); };

  const tabs = document.createElement('div');
  tabs.className = 'reference-chat-tabs';
  tabs.innerHTML = `
    <button class="active" type="button" data-chat-tab="chat">${ICON.chat}<span>چت</span></button>
    <button type="button" data-chat-tab="reminders">${ICON.clock}<span>یادآوری‌ها</span></button>
    <button type="button" data-chat-tab="pins">${ICON.pin}<span>پین‌شده‌ها</span></button>`;
  header.insertAdjacentElement('afterend', tabs);
  tabs.onclick = event => {
    const target = event.target.closest('[data-chat-tab]'); if (!target) return;
    const key = target.dataset.chatTab;
    if (key === 'pins') window.blackClover?.showPins?.();
    if (key === 'reminders') window.blackClover?.showReminders?.();
  };

  const quick = document.createElement('div');
  quick.className = 'reference-quick-row';
  quick.innerHTML = `
    <button type="button" data-ref-prompt="برنامه روزانه امروز من را مرتب و اولویت‌بندی کن">${ICON.pin}<span>برنامه‌ریزی روزانه</span></button>
    <button type="button" data-ref-prompt="برای محتوای من چند ایده حرفه‌ای و قابل اجرا پیشنهاد بده">${ICON.pin}<span>ایده‌های محتوا</span></button>
    <button type="button" data-open-projects>${ICON.pin}<span>پروژه وبسایت</span></button>
    <button type="button" data-ref-prompt="فهرست مهم‌ترین دستورهایی که می‌توانم به تو بدهم را دسته‌بندی کن">${ICON.pin}<span>دستورهای من</span></button>`;
  tabs.insertAdjacentElement('afterend', quick);
  quick.onclick = event => {
    if (event.target.closest('[data-open-projects]')) { window.blackClover?.showProjects?.(); return; }
    const button = event.target.closest('[data-ref-prompt]'); if (!button) return;
    const input = document.querySelector('#input'); if (!input) return;
    input.value = button.dataset.refPrompt;
    input.focus();
  };

  search.querySelector('input').addEventListener('input', event => {
    const q = event.target.value.trim().toLowerCase();
    messages.querySelectorAll('.message-row').forEach(row => { row.hidden = q && !row.textContent.toLowerCase().includes(q); });
  });

  const composerTools = document.createElement('div');
  composerTools.className = 'reference-composer-tools';
  composerTools.innerHTML = `<button type="button" data-attach title="پیوست">${ICON.clip}</button><button type="button" data-emoji title="ایموجی">${ICON.smile}</button>`;
  form.prepend(composerTools);
  composerTools.querySelector('[data-attach]').onclick = () => toast('پیوست فایل در نسخه بعدی به همین کادر وصل می‌شود.');
  composerTools.querySelector('[data-emoji]').onclick = () => {
    const input = document.querySelector('#input'); if (!input) return;
    input.value += ' 😊'; input.focus();
  };
  const send = form.querySelector('.send-btn'); if (send) send.innerHTML = ICON.send;

  messages.querySelectorAll('.message-row').forEach(decorateMessage);
  new MutationObserver(records => records.forEach(record => [...record.addedNodes].forEach(node => {
    if (node.nodeType === 1 && node.matches?.('.message-row')) decorateMessage(node);
    node.querySelectorAll?.('.message-row').forEach(decorateMessage);
  }))).observe(messages, { childList: true, subtree: true });
}

function visualTileImage(index = 0) { return `/reference/style-${(index % 4) + 1}.png`; }

async function buildCustomizer() {
  let panel = document.querySelector('.reference-customizer');
  if (panel) return panel;
  panel = document.createElement('section');
  panel.className = 'reference-customizer';
  panel.hidden = true;
  panel.innerHTML = `
    <header><div><small>MARIA CUSTOMIZE</small><b>شخصی‌سازی کاراکتر</b></div><button data-close>×</button></header>
    <nav><button class="active" data-custom-tab="character">کاراکتر</button><button data-custom-tab="wardrobe">لباس</button><button data-custom-tab="accessory">اکسسوری</button><button data-custom-tab="motion">انیمیشن</button></nav>
    <div class="reference-custom-body"></div>`;
  document.body.append(panel);
  const body = panel.querySelector('.reference-custom-body');
  const avatarRoot = document.querySelector('#avatar3d');
  const render = async mode => {
    body.innerHTML = '<div class="reference-loading">در حال ساخت گالری…</div>';
    let catalog = {}; try { catalog = await fetch('/library/catalog.json').then(r => r.ok ? r.json() : {}).catch(() => ({})); } catch {}
    if (mode === 'character') {
      const avatars = (catalog.avatars || []).filter(x => x.publicUrl);
      body.innerHTML = `<div class="custom-hero"><span>${ICON.crown}</span><div><b>Character Library</b><small>مدل را مثل بازی از روی تصویر انتخاب کن.</small></div></div><div class="visual-grid">${avatars.map((x, i) => `
        <button class="visual-card" data-avatar-url="${esc(x.publicUrl)}"><img src="${visualTileImage(i)}" alt=""><span><b>${esc(human(x.name || `کاراکتر ${i + 1}`))}</b><small>VRM • آماده</small></span></button>`).join('') || `
        <button class="visual-card" data-native-avatar><img src="/reference/style-1.png" alt=""><span><b>ماریا</b><small>افزودن مدل VRM</small></span></button>`}</div><button class="custom-add" data-native-avatar>＋ افزودن کاراکتر جدید</button>`;
    } else if (mode === 'motion') {
      const direct = await listMotions().catch(() => []), previews = catalog.previews || [];
      const count = Math.max(direct.length, previews.length);
      body.innerHTML = `<div class="custom-hero"><span>${ICON.motion}</span><div><b>Animation Gallery</b><small>حرکت‌ها را با پیش‌نمایش انتخاب و تست کن.</small></div></div><div class="visual-grid motion-grid">${Array.from({ length: count || 1 }, (_, i) => {
        const motion = direct[i % Math.max(1, direct.length)], preview = previews[i % Math.max(1, previews.length)];
        const img = preview?.publicUrl || visualTileImage(i);
        return `<button class="visual-card ${motion ? '' : 'locked'}" ${motion ? `data-motion-id="${esc(motion.id)}"` : ''}><img src="${esc(img)}" alt=""><span><b>${esc(human(motion?.name || preview?.name || `حرکت ${i + 1}`))}</b><small>${motion ? '▶ قابل اجرا' : 'پیش‌نمایش'}</small></span></button>`;
      }).join('')}</div>`;
    } else {
      const local = await listAssets('wardrobe').catch(() => []), packed = catalog.wardrobe || [];
      const source = [...local.map(x => ({ ...x, _local: true })), ...packed];
      const filtered = mode === 'accessory' ? source.filter(x => /access|horn|ear|hat|sea|jelly|اکسسوری/i.test(`${x.kind || ''} ${x.name || ''}`)) : source.filter(x => !/access|horn|ear|hat|sea|jelly|اکسسوری/i.test(`${x.kind || ''} ${x.name || ''}`));
      const items = filtered.length ? filtered : source;
      body.innerHTML = `<div class="custom-hero"><span>${mode === 'wardrobe' ? ICON.shirt : ICON.spark}</span><div><b>${mode === 'wardrobe' ? 'Wardrobe' : 'Accessories'}</b><small>به‌جای نام فایل، آیتم‌ها را بصری انتخاب کن.</small></div></div><div class="visual-grid">${items.map((x, i) => {
        const preview = x.previewUrl || x.thumbnail || x.publicPreview || visualTileImage(i + (mode === 'accessory' ? 2 : 0));
        const direct = x.direct === 'avatar' || x._local && x.direct === 'avatar';
        return `<button class="visual-card ${direct ? '' : 'locked'}" ${x._local && direct ? `data-wear-id="${esc(x.id)}"` : ''}><img src="${esc(preview)}" alt=""><span><b>${esc(human(x.name))}</b><small>${direct ? 'پوشیدن' : 'نیاز به تبدیل برای VRM'}</small></span></button>`;
      }).join('') || `<div class="custom-empty">هنوز آیتم آماده‌ای در این دسته نیست.</div>`}</div>`;
    }
  };
  panel.querySelector('[data-close]').onclick = () => { panel.hidden = true; };
  panel.querySelector('nav').onclick = event => {
    const tab = event.target.closest('[data-custom-tab]'); if (!tab) return;
    panel.querySelectorAll('[data-custom-tab]').forEach(x => x.classList.toggle('active', x === tab));
    render(tab.dataset.customTab);
  };
  body.onclick = async event => {
    const avatarUrl = event.target.closest('[data-avatar-url]')?.dataset.avatarUrl;
    if (avatarUrl) { avatarRoot?.dispatchEvent(new CustomEvent('blackclover:load-built-in', { detail: { url: avatarUrl } })); toast('کاراکتر انتخاب شد'); return; }
    if (event.target.closest('[data-native-avatar]')) { document.querySelector('#avatarPick')?.click(); return; }
    const motion = event.target.closest('[data-motion-id]')?.dataset.motionId;
    if (motion) { avatarRoot?.dispatchEvent(new CustomEvent('blackclover:motion', { detail: { id: motion } })); return; }
    const wear = event.target.closest('[data-wear-id]')?.dataset.wearId;
    if (wear) { const file = await getAssetFile(wear); if (file) avatarRoot?.dispatchEvent(new CustomEvent('blackclover:wardrobe-file', { detail: { file } })); return; }
    if (event.target.closest('.locked')) toast('این آیتم هنوز برای VRM تبدیل نشده و فعلاً فقط پیش‌نمایش است.');
  };
  panel._render = render;
  await render('character');
  return panel;
}

async function enhanceAvatarDock() {
  const dock = document.querySelector('.maria-dock');
  if (!dock) return;
  document.body.classList.add('maria-reference-avatar');
  dock.classList.add('reference-dock');
  dock.innerHTML = `
    <button data-action="chat" class="ref-dock-item active">${ICON.home}<span>خانه</span></button>
    <button data-ref-action="sound" class="ref-dock-item">${ICON.sound}<span>صدا</span></button>
    <button data-action="pins" class="ref-dock-item">${ICON.pin}<span>پین‌شده</span></button>
    <button data-action="reminders" class="ref-dock-item">${ICON.clock}<span>یادآور</span></button>
    <button data-ref-action="tools" class="ref-dock-item">${ICON.tools}<span>ابزارها</span></button>
    <button data-action="settings" class="ref-dock-item">${ICON.settings}<span>تنظیمات</span></button>
    <i class="ref-dock-divider"></i>
    <button data-ref-action="voice" class="ref-voice-button">${ICON.wave}</button>`;
  const customizer = await buildCustomizer();
  dock.addEventListener('click', event => {
    const own = event.target.closest('[data-ref-action]'); if (!own) return;
    event.stopPropagation();
    const action = own.dataset.refAction;
    if (action === 'sound') { voice.setEnabled(!voice.enabled); own.classList.toggle('muted', !voice.enabled); toast(voice.enabled ? 'صدای ماریا روشن شد' : 'صدای ماریا خاموش شد'); }
    if (action === 'voice') document.querySelector('#mic')?.click();
    if (action === 'tools') { customizer.hidden = !customizer.hidden; if (!customizer.hidden) customizer._render?.('character'); }
  }, true);
  dock.querySelector('[data-ref-action="sound"]')?.classList.toggle('muted', !voice.enabled);
}

ready(async () => {
  if (SURFACE === 'chat') await enhanceChat();
  else if (SURFACE === 'avatar') await enhanceAvatarDock();
});
