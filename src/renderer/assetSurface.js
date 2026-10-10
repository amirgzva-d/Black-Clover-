import './assetSurface.css';
import {listMotions} from './motionStorage.js';
import {mountAvatar} from './avatar.js';
import {getCurrentAvatar} from './avatarStorage.js';

const esc=s=>String(s??'').replace(/[&<>"']/g,c=>({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[c]));
const fmt=s=>String(s||'').replace(/^\./,'').toUpperCase()||'FILE';
const unique=(items,key=x=>x.name)=>{const seen=new Set();return (items||[]).filter(x=>{const k=key(x);if(seen.has(k))return false;seen.add(k);return true;});};

async function catalog(){
  const [base,local]=await Promise.all([
    fetch('/library/catalog.json').then(r=>r.ok?r.json():{}).catch(()=>({})),
    window.blackClover.listLocalAssets().catch(()=>({root:null,items:[]}))
  ]);
  return {...base,localRoot:local?.root||null,localAssets:local?.items||[]};
}

function windowButtons(){return '<div class="asset-win-actions"><button data-min title="کمینه">—</button><button data-close title="بستن">×</button></div>';}
function badge(text,type=''){return '<span class="asset-badge '+type+'">'+esc(text)+'</span>';}
function row(item,actions='',extra='',attrs=''){
  const sub=[item.package,item.logical,item.note].filter(Boolean).join(' • ');
  return '<article class="library-row" '+attrs+' data-search="'+esc([item.name,sub,item.format,item.category].join(' ').toLowerCase())+'"><div class="library-row-main"><b>'+esc(item.name)+'</b><small>'+esc(sub)+'</small></div><div class="library-row-meta">'+extra+actions+'</div></article>';
}
function tabButton(id,label,count){return '<button data-tab="'+id+'">'+esc(label)+' <span>'+count+'</span></button>';}

function makeShell(surface){
  const root=document.querySelector('#app');root.innerHTML='';const motion=surface==='motions';
  root.innerHTML='<section class="asset-surface"><header class="asset-head"><div><small>MARIA LIVE LIBRARY</small><h2>'+(motion?'حرکت‌ها و انیمیشن‌ها':'Character • Wardrobe')+'</h2><p>'+(motion?'Preview first • Apply to Maria':'Preview first • Apply when ready')+'</p></div>'+windowButtons()+'</header><div class="asset-toolbar"><input class="asset-search" placeholder="جستجو در کتابخانه…"><div class="asset-tabs"></div></div><main class="asset-content"><div class="asset-loading">در حال ساخت Preview زنده…</div></main><footer class="asset-footer"><span class="asset-root"></span><button data-open-folder>باز کردن پوشه Asset</button></footer></section>';
  root.querySelector('[data-close]').onclick=()=>motion?window.blackClover.hideMotions():window.blackClover.hideWardrobe();
  root.querySelector('[data-min]').onclick=()=>window.blackClover.minimizeSurface(surface);
  root.querySelector('[data-open-folder]').onclick=()=>window.blackClover.openLocalAssetFolder();
  return root.querySelector('.asset-surface');
}
function setupSearch(shell){
  const input=shell.querySelector('.asset-search');
  input.oninput=()=>{const q=input.value.trim().toLowerCase();for(const el of shell.querySelectorAll('[data-search]'))el.hidden=Boolean(q&&!el.dataset.search.includes(q));};
}
function setTabs(shell,tabs,active,render){
  const host=shell.querySelector('.asset-tabs');host.innerHTML=tabs.map(t=>tabButton(t.id,t.label,t.count)).join('');
  const select=id=>{for(const b of host.querySelectorAll('[data-tab]'))b.classList.toggle('active',b.dataset.tab===id);render(id);};
  host.onclick=e=>{const b=e.target.closest('[data-tab]');if(b)select(b.dataset.tab);};select(active);
}
function liveStage(content,{title='Live Preview',subtitle='مدل فعلی ماریا'}={}){
  content.innerHTML='<div class="studio-layout"><aside class="studio-preview"><div class="studio-preview-head"><span class="studio-kicker">MARIA • LIVE CHARACTER</span><span class="studio-live-dot"><i></i> LIVE</span></div><div class="live-stage-view" id="liveAvatar"><div class="live-chip">REAL-TIME PREVIEW</div><div class="stage-vignette"></div><div class="stage-floor"></div></div><div class="live-stage-info"><small>PREVIEW SANDBOX</small><b id="liveTitle">'+esc(title)+'</b><span id="liveSubtitle">'+esc(subtitle)+'</span><div id="liveActions" class="live-stage-actions"></div></div></aside><section class="studio-browser"><div class="studio-browser-head"><div><small>MARIA CUSTOMIZATION</small><b>انتخاب و شخصی‌سازی</b></div><span>Preview → Apply</span></div><div class="asset-tab-body"></div></section></div>';
  const host=content.querySelector('#liveAvatar'),controller=mountAvatar(host);
  window.addEventListener('beforeunload',()=>controller.then(x=>x.dispose()).catch(()=>{}),{once:true});
  return {controller,body:content.querySelector('.asset-tab-body'),title:content.querySelector('#liveTitle'),subtitle:content.querySelector('#liveSubtitle'),actions:content.querySelector('#liveActions'),host};
}
async function localAvatarFile(name){
  const payload=await window.blackClover.readLocalAsset(name);
  return new File([payload.bytes],payload.name,{type:'model/gltf-binary'});
}

async function mountMotions(shell,data){
  const direct=await listMotions().catch(()=>[]),localMotion=data.localAssets.filter(x=>x.category==='motion'&&!x.blocked),pending=data.animations||[],expressions=data.expressions||[],previews=data.previews||[];
  const localPoses=data.localAssets.filter(x=>x.category==='animation'&&!x.blocked),localExpr=data.localAssets.filter(x=>x.category==='expression'&&!x.blocked);
  const content=shell.querySelector('.asset-content'),live=liveStage(content,{title:'Maria Motion Stage',subtitle:'حرکت را Preview کن؛ تا Apply نزنی روی Maria اصلی اجرا نمی‌شود'});
  let pendingMotion=null;
  const syncActions=()=>{
    live.actions.innerHTML='<button class="asset-use primary" data-apply-motion '+(!pendingMotion?'disabled':'')+'>'+(pendingMotion?'Apply • '+esc(pendingMotion.name):'اول یک حرکت را Preview کن')+'</button><button class="asset-use ghost" data-open-main>نمایش Maria اصلی</button>';
  };
  syncActions();
  live.actions.onclick=async e=>{
    if(e.target.closest('[data-open-main]')){window.blackClover.showAvatar();return;}
    if(e.target.closest('[data-apply-motion]')&&pendingMotion){const b=e.target.closest('[data-apply-motion]');b.disabled=true;try{await window.blackClover.playAvatarMotion(pendingMotion.id);live.subtitle.textContent='Apply شد • '+pendingMotion.name+' روی Maria اصلی اجرا شد';}catch(err){live.subtitle.textContent='Apply خطا: '+(err.message||err);}finally{syncActions();}}
  };
  const tabs=[
    {id:'direct',label:'حرکت‌های زنده',count:direct.length},
    {id:'packs',label:'Motion Pack',count:localMotion.length},
    {id:'poses',label:'Pose / Animation',count:pending.length+localPoses.length},
    {id:'expressions',label:'Expression',count:expressions.length+localExpr.length},
    {id:'previews',label:'Preview',count:previews.length}
  ];
  const render=id=>{
    const body=live.body;
    if(id==='direct')body.innerHTML='<div class="asset-summary"><b>'+direct.length+' حرکت VRMA آماده</b><span>کلیک = Preview فقط در همین صفحه. دکمه Apply = اجرای همان حرکت روی Maria اصلی.</span></div><div class="motion-grid">'+(direct.map(x=>'<button class="motion-card" data-search="'+esc((x.name||x.id).toLowerCase())+'" data-play="'+esc(x.id)+'" data-motion-name="'+esc(x.name||x.id)+'"><span>▶</span><b>'+esc(x.name||x.id)+'</b><small>VRMA • Preview first</small></button>').join('')||'<div class="asset-empty">هنوز Motion Pack وارد نشده.</div>')+'</div>';
    else if(id==='packs')body.innerHTML='<div class="asset-summary"><b>Motion Packهای محلی</b><span>VRMA مستقیم Import می‌شود؛ بعد از Import در تب حرکت‌های زنده Preview می‌شود.</span></div><div class="library-list">'+localMotion.map(x=>row(x,'<button class="asset-use" data-import-motion="'+esc(x.name)+'">Import</button>',badge('VRMA','ready'))).join('')+'</div>';
    else if(id==='poses')body.innerHTML='<div class="asset-summary"><b>'+(pending.length+localPoses.length)+' Pose / Animation</b><span>Unity .anim برای Three-VRM باید Retarget شود؛ تا تبدیل نشود Apply جعلی نمایش داده نمی‌شود.</span></div><div class="library-list">'+localPoses.map(x=>row(x,'',badge('Retarget لازم','pending'))).join('')+pending.map(x=>row(x,'',badge('Retarget لازم','pending'))).join('')+'</div>';
    else if(id==='expressions')body.innerHTML='<div class="asset-summary"><b>'+(expressions.length+localExpr.length)+' Expression</b><span>بعد از Mapping به BlendShapeهای VRM قابل Preview و Apply می‌شوند.</span></div><div class="library-list">'+localExpr.map(x=>row(x,'',badge('Mapping لازم','pending'))).join('')+expressions.map(x=>row(x,'',badge('Expression','expression'))).join('')+'</div>';
    else body.innerHTML='<div class="asset-summary"><b>'+previews.length+' تصویر Preview</b><span>برای انتخاب Pose و Animation.</span></div><div class="preview-library">'+previews.map(x=>'<figure data-search="'+esc((x.name||'').toLowerCase())+'"><img src="'+esc(x.publicUrl)+'" loading="lazy"><figcaption>'+esc(x.name)+'</figcaption></figure>').join('')+'</div>';
  };
  setTabs(shell,tabs,'direct',render);
  live.body.onclick=async e=>{
    const card=e.target.closest('[data-play]'),play=card?.dataset.play;
    if(play){for(const x of live.body.querySelectorAll('.motion-card'))x.classList.toggle('selected',x===card);pendingMotion={id:play,name:card.dataset.motionName||play};live.title.textContent=pendingMotion.name;live.subtitle.textContent='Preview در حال اجرا • هنوز Apply نشده';syncActions();card.disabled=true;try{const c=await live.controller;await c.playMotion(play);live.subtitle.textContent='Preview زنده • برای Maria اصلی Apply را بزن';}catch(err){live.subtitle.textContent='Preview خطا: '+(err.message||err);}finally{setTimeout(()=>card.disabled=false,350);}return;}
    const pack=e.target.closest('[data-import-motion]')?.dataset.importMotion;
    if(pack){e.target.disabled=true;e.target.textContent='Import…';try{await window.blackClover.importLocalMotion(pack);location.reload();}catch(err){e.target.disabled=false;e.target.textContent='خطا';}}
  };
}

async function mountWardrobe(shell,data){
  const local=data.localAssets||[],localAv=local.filter(x=>x.category==='avatar'&&x.direct==='avatar'&&!x.blocked),avatarArchives=local.filter(x=>x.category==='avatar'&&x.direct!=='avatar'&&!x.blocked);
  const wardrobe=data.wardrobe||[],materials=data.materials||[],localWardrobe=local.filter(x=>x.category==='wardrobe'&&!x.blocked),localMaterials=local.filter(x=>x.category==='material'&&!x.blocked),existingAv=unique((data.avatars||[]).filter(x=>x.publicUrl),x=>String(x.name).toLowerCase());
  const content=shell.querySelector('.asset-content'),live=liveStage(content,{title:'Maria Character Studio',subtitle:'کاراکتر را انتخاب کن؛ Preview اینجا زنده است و Maria اصلی تا Apply دست‌نخورده می‌ماند'});
  const currentAvatar=await getCurrentAvatar().catch(()=>null),currentMatch=currentAvatar?.url?existingAv.find(x=>x.publicUrl===currentAvatar.url):localAv.find(x=>x.name===currentAvatar?.name),fallbackCurrent=existingAv.find(x=>x.publicUrl==='/models/Model_MOSO.vrm');
  let pendingAvatar=null,appliedName=currentMatch?.name||currentAvatar?.name||fallbackCurrent?.name||'Model MOSO',lock=await window.blackClover.avatarLockState().catch(()=>({locked:false,name:''}));
  const displayName=x=>x.meta?.title||String(x.name||'Character').replace(/\.vrm$/i,'').replace(/[_-]+/g,' ');
  let miniObserver=null;const miniControllers=new Map();
  const clearMiniAvatars=()=>{miniObserver?.disconnect();miniObserver=null;for(const c of miniControllers.values())try{c.dispose();}catch{}miniControllers.clear();};
  const mountMini=async host=>{if(!host||host.dataset.liveMounted==='1'||host.dataset.liveMounted==='loading')return;host.dataset.liveMounted='loading';try{const c=await mountAvatar(host,{autoLoad:false,mini:true});if(!host.isConnected){c.dispose();return;}if(host.dataset.miniKind==='local'){const f=await localAvatarFile(host.dataset.miniName);await c.loadFile(f,{persist:false});}else await c.loadBuiltIn(host.dataset.miniUrl,{persist:false,name:host.dataset.miniName||'Character'});if(!host.isConnected){c.dispose();return;}host.dataset.liveMounted='1';miniControllers.set(host,c);}catch(err){host.dataset.liveMounted='error';host.dataset.liveError=String(err?.message||err);host.classList.add('mini-failed');}};
  const hydrateMiniAvatars=()=>{miniObserver?.disconnect();const rootRect=live.body.getBoundingClientRect(),hosts=[...live.body.querySelectorAll('[data-live-mini]')];miniObserver=new IntersectionObserver(entries=>{for(const entry of entries)if(entry.isIntersecting)mountMini(entry.target);},{root:live.body,rootMargin:'160px 0px',threshold:.01});for(const host of hosts){miniObserver.observe(host);const r=host.getBoundingClientRect();if(r.bottom>=rootRect.top-160&&r.top<=rootRect.bottom+160)mountMini(host);}};
  const markSelection=name=>{
    for(const card of live.body.querySelectorAll('[data-avatar-card]'))card.classList.toggle('selected',card.dataset.avatarCard===name);
  };
  const syncActions=()=>{
    const lockText=lock.locked?'🔒 '+esc(lock.name):'🔓 آزاد';
    live.actions.innerHTML='<span class="lock-state '+(lock.locked?'locked':'')+'">'+lockText+'</span>'+
      (pendingAvatar?'<button class="asset-use primary" data-apply-preview>Apply • '+esc(pendingAvatar.label)+'</button><button class="asset-use ghost" data-cancel-preview>لغو Preview</button>':'')+
      (lock.locked?'<button class="asset-use ghost" data-unlock>باز کردن قفل</button>':(appliedName?'<button class="asset-use ghost" data-lock-current>قفل '+esc(appliedName)+'</button>':''));
  };
  const previewAvatar=async item=>{
    pendingAvatar=item;live.title.textContent=item.label;live.subtitle.textContent='در حال بارگذاری Preview…';markSelection(item.key);syncActions();
    try{const c=await live.controller;if(item.kind==='local'){const f=await localAvatarFile(item.name);await c.loadFile(f,{persist:false});}else await c.loadBuiltIn(item.url,{persist:false,name:item.label});live.subtitle.textContent='Preview زنده • Maria اصلی هنوز تغییر نکرده';}
    catch(err){live.subtitle.textContent='Preview خطا: '+(err.message||err);}
  };
  const applyPending=async()=>{
    if(!pendingAvatar)return;
    if(lock.locked&&lock.name&&lock.name!==pendingAvatar.key)throw new Error('اول قفل '+lock.name+' را باز کن.');
    if(pendingAvatar.kind==='local')await window.blackClover.applyLocalAvatar(pendingAvatar.name);
    else await window.blackClover.applyBuiltInAvatar({name:pendingAvatar.key,url:pendingAvatar.url});
    appliedName=pendingAvatar.key;live.subtitle.textContent='Apply شد • '+pendingAvatar.label+' روی Maria اصلی فعال است';pendingAvatar=null;markSelection(appliedName);syncActions();
  };
  const cancelPreview=async()=>{
    pendingAvatar=null;markSelection(appliedName);const c=await live.controller;await c.loadCurrent?.();live.title.textContent='Maria Character Studio';live.subtitle.textContent='Preview لغو شد • مدل اعمال‌شده دوباره نمایش داده شد';syncActions();
  };
  syncActions();
  live.actions.onclick=async e=>{
    if(e.target.closest('[data-apply-preview]')){try{await applyPending();}catch(err){live.subtitle.textContent=String(err.message||err);}return;}
    if(e.target.closest('[data-cancel-preview]')){try{await cancelPreview();}catch{location.reload();}return;}
    if(e.target.closest('[data-unlock]')){lock=await window.blackClover.setAvatarLock({locked:false,name:''});syncActions();live.subtitle.textContent='قفل کاراکتر باز شد.';return;}
    if(e.target.closest('[data-lock-current]')&&appliedName){lock=await window.blackClover.setAvatarLock({locked:true,name:appliedName});syncActions();live.subtitle.textContent='کاراکتر فعلی قفل شد.';}
  };

  const tabs=[
    {id:'avatars',label:'کاراکترها',count:localAv.length+existingAv.length+avatarArchives.length},
    {id:'wardrobe',label:'لباس و وسایل',count:wardrobe.length+localWardrobe.length},
    {id:'materials',label:'متریال',count:materials.length+localMaterials.length},
    {id:'local',label:'همه فایل‌ها',count:local.length}
  ];
  const render=id=>{
    const body=live.body;clearMiniAvatars();
    if(id==='avatars'){
      const localCards=localAv.map(x=>{const label=displayName(x),current=x.name===appliedName;return '<article class="character-card '+(current?'current':'')+'" data-avatar-card="'+esc(x.name)+'" data-search="'+esc([label,x.name,x.meta?.author].join(' ').toLowerCase())+'"><div class="character-card-head"><span>LOCAL CHARACTER</span><i>'+(current?'CURRENT':'LIVE VRM')+'</i></div><div class="character-portrait character-live-mini" data-live-mini data-mini-kind="local" data-mini-name="'+esc(x.name)+'"><span>LIVE</span><div class="mini-loader">در حال بارگذاری…</div></div><b>'+esc(label)+'</b><small>'+esc(x.meta?.author||'Local Character')+'</small><div class="character-card-actions"><button data-preview-local="'+esc(x.name)+'">Preview زنده</button></div></article>';}).join('');
      const builtCards=existingAv.map(x=>{const label=x.meta?.title||x.name,author=x.meta?.author||x.package||'Library Character',current=x.name===appliedName;return '<article class="character-card library '+(current?'current':'')+'" data-avatar-card="'+esc(x.name)+'" data-search="'+esc([label,x.name,author].join(' ').toLowerCase())+'"><div class="character-card-head"><span>LIBRARY CHARACTER</span><i>'+(current?'CURRENT':esc(fmt(x.format)))+'</i></div><div class="character-portrait character-live-mini" data-live-mini data-mini-kind="built" data-mini-name="'+esc(x.name)+'" data-mini-url="'+esc(x.publicUrl)+'"><span>LIVE</span><div class="mini-loader">در حال بارگذاری…</div></div><b>'+esc(label)+'</b><small>'+esc(author)+'</small><div class="character-card-actions"><button data-preview-built="'+esc(x.publicUrl)+'" data-built-name="'+esc(x.name)+'" data-built-label="'+esc(label)+'">Preview زنده</button></div></article>';}).join('');
      const archives=avatarArchives.map(x=>'<article class="character-card pending" data-search="'+esc(x.name.toLowerCase())+'"><div class="character-card-head"><span>ARCHIVE</span><i>Convert</i></div><b>'+esc(x.name)+'</b><small>برای Preview زنده باید ابتدا VRM استخراج/تبدیل شود.</small><div class="character-card-actions"><button disabled>نیاز به تبدیل</button></div></article>').join('');
      body.innerHTML='<div class="asset-summary"><b>Character Select • '+(localAv.length+existingAv.length+avatarArchives.length)+' کاراکتر</b><span>کاراکترهای VRM آماده داخل کارت خودشان زنده Render می‌شوند. Preview بزرگ سمت چپ فقط برای بررسی دقیق است؛ تغییر Maria اصلی فقط با Apply انجام می‌شود.</span></div><div class="character-grid">'+localCards+builtCards+archives+'</div>';markSelection(pendingAvatar?.key||appliedName);setTimeout(hydrateMiniAvatars,60);
    }else if(id==='wardrobe'){
      const source=localWardrobe.map(x=>row(x,'<button class="asset-use ghost" data-stage-asset="'+esc(x.name)+'">انتخاب</button>',badge(x.direct?'آماده':'تبدیل لازم',x.direct?'ready':'pending'),'data-asset-name="'+esc(x.name)+'"')).join('');
      const extracted=wardrobe.map(x=>row(x,'<button class="asset-use ghost" data-stage-asset="'+esc(x.name)+'">جزئیات</button>',badge('تبدیل/اتصال لازم','pending'),'data-asset-name="'+esc(x.name)+'"')).join('');
      body.innerHTML='<div class="asset-summary"><b>'+(wardrobe.length+localWardrobe.length)+' لباس / Armor / Accessory / XWear</b><span>انتخاب در این تب فقط Stage می‌شود و روی Maria اصلی چیزی عوض نمی‌کند. XWear، UnityPackage و FBX تا وقتی Retarget/Conversion واقعی ندارند Apply نمی‌شوند.</span></div><div class="library-list">'+source+extracted+'</div>';
    }else if(id==='materials'){
      body.innerHTML='<div class="asset-summary"><b>'+(materials.length+localMaterials.length)+' Material / MatCap</b><span>انتخاب متریال فقط Preview/Stage است؛ تا Mapping واقعی به VRM آماده نشود روی Maria اصلی Apply نمی‌شود.</span></div><div class="library-list">'+localMaterials.map(x=>row(x,'<button class="asset-use ghost" data-stage-asset="'+esc(x.name)+'">انتخاب</button>',badge('Material Pack','source'),'data-asset-name="'+esc(x.name)+'"')).join('')+'</div><div class="material-grid">'+materials.map(x=>'<article data-search="'+esc([x.name,x.package].join(' ').toLowerCase())+'" data-stage-asset="'+esc(x.name)+'">'+(x.publicUrl?'<img src="'+esc(x.publicUrl)+'" loading="lazy">':'<div class="material-icon">MAT</div>')+'<b>'+esc(x.name)+'</b><small>'+esc(x.package||'Material')+'</small></article>').join('')+'</div>';
    }else body.innerHTML='<div class="asset-summary"><b>'+local.length+' فایل محلی</b><span>'+esc(data.localRoot||'پوشه پیدا نشد')+'</span></div><div class="library-list">'+local.map(x=>row(x,'',x.blocked?badge('محدودیت مجوز','blocked'):badge(x.direct?'مستقیم':x.category,x.direct?'ready':'source'))).join('')+'</div>';
  };
  setTabs(shell,tabs,'avatars',render);
  window.addEventListener('beforeunload',clearMiniAvatars,{once:true});

  live.body.onclick=async e=>{
    const localName=e.target.closest('[data-preview-local]')?.dataset.previewLocal;
    if(localName){const x=localAv.find(a=>a.name===localName);await previewAvatar({kind:'local',name:localName,key:localName,label:displayName(x||{name:localName})});return;}
    const builtBtn=e.target.closest('[data-preview-built]');
    if(builtBtn){const url=builtBtn.dataset.previewBuilt,name=builtBtn.dataset.builtName||'Library Character',label=builtBtn.dataset.builtLabel||name;await previewAvatar({kind:'built',url,key:name,label});return;}
    const asset=e.target.closest('[data-stage-asset]')?.dataset.stageAsset;
    if(asset){for(const x of live.body.querySelectorAll('[data-asset-name],[data-stage-asset]'))x.classList.toggle?.('selected',x.dataset.assetName===asset||x.dataset.stageAsset===asset);live.title.textContent=asset;live.subtitle.textContent='Stage شده • این Asset تا آماده شدن Mapping/Conversion روی Maria اصلی تغییر نمی‌کند';}
  };
}

export async function mountAssetSurface(surface){
  const shell=makeShell(surface),data=await catalog();shell.querySelector('.asset-root').textContent=data.localRoot||'پوشه Asset پیدا نشد';setupSearch(shell);
  if(surface==='motions')await mountMotions(shell,data);else await mountWardrobe(shell,data);
}
