import './assetSurface.css';
import { listMotions } from './motionStorage.js';

const esc=s=>String(s??'').replace(/[&<>"']/g,c=>({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[c]));
const size=n=>{n=Number(n)||0;if(n<1024)return n+' B';if(n<1048576)return (n/1024).toFixed(1)+' KB';return (n/1048576).toFixed(1)+' MB';};
const fmt=s=>String(s||'').replace(/^\./,'').toUpperCase()||'FILE';
const unique=(items,key=x=>x.name)=>{const seen=new Set();return (items||[]).filter(x=>{const k=key(x);if(seen.has(k))return false;seen.add(k);return true;});};

async function catalog(){
  const [base,local]=await Promise.all([
    fetch('/library/catalog.json').then(r=>r.ok?r.json():{}).catch(()=>({})),
    window.blackClover.listLocalAssets().catch(()=>({root:null,items:[]}))
  ]);
  return {...base,localRoot:local?.root||null,localAssets:local?.items||[]};
}
function windowButtons(surface){
  return '<div class="asset-win-actions"><button data-min title="کمینه">—</button><button data-close title="بستن">×</button></div>';
}
function badge(text,type=''){return '<span class="asset-badge '+type+'">'+esc(text)+'</span>';}
function row(item,actions='',extra=''){
  const sub=[item.package,item.logical,item.note].filter(Boolean).join(' • ');
  return '<article class="library-row" data-search="'+esc([item.name,sub,item.format,item.category].join(' ').toLowerCase())+'"><div class="library-row-main"><b>'+esc(item.name)+'</b><small>'+esc(sub)+'</small></div><div class="library-row-meta">'+extra+actions+'</div></article>';
}

function makeShell(surface){
  const root=document.querySelector('#app');root.innerHTML='';
  const motion=surface==='motions';
  root.innerHTML='<section class="asset-surface"><header class="asset-head"><div><small>MARIA LIBRARY</small><h2>'+(motion?'حرکت‌ها و واکنش‌ها':'لباس، وسایل و کاراکترها')+'</h2><p>'+(motion?'Motion • Pose • Expression • Preview':'Avatar • Wardrobe • Accessory • Material')+'</p></div>'+windowButtons(surface)+'</header><div class="asset-toolbar"><input class="asset-search" placeholder="جستجو در کتابخانه…"><div class="asset-tabs"></div></div><main class="asset-content"><div class="asset-loading">در حال خواندن پوشه و Library…</div></main><footer class="asset-footer"><span class="asset-root"></span><button data-open-folder>باز کردن پوشه 21</button></footer></section>';
  root.querySelector('[data-close]').onclick=()=>motion?window.blackClover.hideMotions():window.blackClover.hideWardrobe();
  root.querySelector('[data-min]').onclick=()=>window.blackClover.minimizeSurface(surface);
  root.querySelector('[data-open-folder]').onclick=()=>window.blackClover.openLocalAssetFolder();
  return root.querySelector('.asset-surface');
}
function tabButton(id,label,count){return '<button data-tab="'+id+'">'+esc(label)+' <span>'+count+'</span></button>';}
function setupSearch(shell){
  const input=shell.querySelector('.asset-search');
  input.oninput=()=>{const q=input.value.trim().toLowerCase();for(const el of shell.querySelectorAll('[data-search]'))el.hidden=Boolean(q&&!el.dataset.search.includes(q));};
}
function setTabs(shell,tabs,active,render){
  const host=shell.querySelector('.asset-tabs');host.innerHTML=tabs.map(t=>tabButton(t.id,t.label,t.count)).join('');
  const select=id=>{for(const b of host.querySelectorAll('[data-tab]'))b.classList.toggle('active',b.dataset.tab===id);render(id);};
  host.onclick=e=>{const b=e.target.closest('[data-tab]');if(b)select(b.dataset.tab);};
  select(active);
}

async function mountMotions(shell,data){
  const direct=await listMotions().catch(()=>[]);
  const localMotion=data.localAssets.filter(x=>x.category==='motion'&&!x.blocked);
  const pending=data.animations||[],expressions=data.expressions||[],previews=data.previews||[];
  const localPoses=data.localAssets.filter(x=>x.category==='animation'&&!x.blocked),localExpr=data.localAssets.filter(x=>x.category==='expression'&&!x.blocked),localPreview=data.localAssets.filter(x=>x.category==='preview'&&!x.blocked);
  const tabs=[
    {id:'direct',label:'قابل اجرا',count:direct.length},
    {id:'packs',label:'Motion Pack',count:localMotion.length},
    {id:'poses',label:'Pose / Animation',count:pending.length+localPoses.length},
    {id:'expressions',label:'Expression',count:expressions.length+localExpr.length},
    {id:'previews',label:'Preview',count:previews.length+localPreview.length}
  ];
  const content=shell.querySelector('.asset-content');
  const render=id=>{
    if(id==='direct'){
      content.innerHTML='<div class="asset-summary"><b>'+direct.length+' حرکت VRMA آماده</b><span>این‌ها مستقیم روی کاراکتر اجرا می‌شوند.</span></div><div class="library-list">'+(direct.map(x=>row({name:x.name||x.id,format:'vrma',note:'VRMA مستقیم'},'<button class="asset-use" data-play="'+esc(x.id)+'">اجرا</button>',badge('VRMA','ready'))).join('')||'<div class="asset-empty">هنوز VRMA Import نشده.</div>')+'</div>';
    }else if(id==='packs'){
      content.innerHTML='<div class="asset-summary"><b>پک‌های حرکت محلی</b><span>VRMA_MotionPack شامل ۷ حرکت است و مستقیم Import می‌شود.</span></div><div class="library-list">'+(localMotion.map(x=>row(x,'<button class="asset-use" data-import-motion="'+esc(x.name)+'">Import</button>',badge(x.direct?'مستقیم':'پک','ready'))).join('')||'<div class="asset-empty">پک محلی پیدا نشد.</div>')+'</div>';
    }else if(id==='poses'){
      content.innerHTML='<div class="asset-summary"><b>'+(pending.length+localPoses.length)+' Pose / Animation</b><span>پک‌های اصلی پوشه و Animationهای استخراج‌شده کنار هم دیده می‌شوند؛ Unity .anim برای VRM وبی باید Retarget شود.</span></div><div class="library-list">'+localPoses.map(x=>row(x,'',badge('Pose Pack','source'))).join('')+pending.map(x=>row(x,'',badge('نیاز به تبدیل','pending'))).join('')+'</div>';
    }else if(id==='expressions'){
      content.innerHTML='<div class="asset-summary"><b>'+(expressions.length+localExpr.length)+' Expression / BlendShape</b><span>Face Animation و ShapeKeyهای پوشه همراه Expressionهای استخراج‌شده فهرست شده‌اند.</span></div><div class="library-list">'+localExpr.map(x=>row(x,'',badge('Face Pack','source'))).join('')+expressions.map(x=>row(x,'',badge('Expression','expression'))).join('')+'</div>';
    }else{
      content.innerHTML='<div class="asset-summary"><b>'+previews.length+' تصویر Preview • '+localPreview.length+' بسته اصلی</b><span>Previewهای استخراج‌شده برای انتخاب Poseها؛ فایل اصلی هم در Library ثبت است.</span></div><div class="library-list">'+localPreview.map(x=>row(x,'',badge('Preview Pack','source'))).join('')+'</div><div class="preview-library">'+previews.map(x=>'<figure data-search="'+esc((x.name||'').toLowerCase())+'"><img src="'+esc(x.publicUrl)+'" loading="lazy"><figcaption>'+esc(x.name)+'</figcaption></figure>').join('')+'</div>';
    }
  };
  setTabs(shell,tabs,'direct',render);
  content.onclick=async e=>{
    const play=e.target.closest('[data-play]')?.dataset.play;if(play){e.target.disabled=true;try{await window.blackClover.playAvatarMotion(play);e.target.textContent='اجرا شد';setTimeout(()=>{e.target.disabled=false;e.target.textContent='اجرا';},900);}catch(err){e.target.disabled=false;e.target.textContent='خطا';}return;}
    const pack=e.target.closest('[data-import-motion]')?.dataset.importMotion;if(pack){e.target.disabled=true;e.target.textContent='در حال Import…';try{await window.blackClover.importLocalMotion(pack);setTimeout(()=>location.reload(),900);}catch(err){e.target.disabled=false;e.target.textContent='خطا';}return;}
  };
}

async function mountWardrobe(shell,data){
  const local=data.localAssets||[],localAv=local.filter(x=>x.category==='avatar'&&x.direct==='avatar'&&!x.blocked),avatarArchives=local.filter(x=>x.category==='avatar'&&x.direct!=='avatar'&&!x.blocked),wardrobe=data.wardrobe||[],materials=data.materials||[],localWardrobe=local.filter(x=>x.category==='wardrobe'&&!x.blocked),localMaterials=local.filter(x=>x.category==='material'&&!x.blocked);
  const existingAv=unique(data.avatars||[],x=>String(x.name).toLowerCase());
  const tabs=[
    {id:'avatars',label:'کاراکترها',count:localAv.length+existingAv.length+avatarArchives.length},
    {id:'wardrobe',label:'لباس و وسایل',count:wardrobe.length+localWardrobe.length},
    {id:'materials',label:'متریال',count:materials.length+localMaterials.length},
    {id:'local',label:'فایل‌های پوشه',count:local.length}
  ];
  const content=shell.querySelector('.asset-content');
  const render=id=>{
    if(id==='avatars'){
      const locals=localAv.map(x=>{const label=x.meta?.title||x.name.replace(/\.vrm$/i,''),details=[x.meta?.author,x.meta?.license,x.meta?.commercial&&('Commercial: '+x.meta.commercial)].filter(Boolean).join(' • ');return row({...x,name:label,note:details},'<button class="asset-use" data-avatar="'+esc(x.name)+'">استفاده</button>',badge('VRM','ready'));}).join('');
      const built=existingAv.map(x=>row({...x,note:'مدل آماده Library'},x.publicUrl?'<button class="asset-use" data-public-avatar="'+esc(x.publicUrl)+'">استفاده</button>':'',badge('Library','ready'))).join('');
      const archives=avatarArchives.map(x=>row(x,'',badge('Archive • تبدیل لازم','pending'))).join('');content.innerHTML='<div class="asset-summary"><b>Character Library</b><span>VRMهای مستقیم با یک کلیک فعال می‌شوند؛ Avatarهای داخل ZIP/RAR جدا با برچسب تبدیل نمایش داده می‌شوند.</span></div><div class="library-list">'+locals+built+archives+'</div>';
    }else if(id==='wardrobe'){
      const groups={};for(const x of wardrobe){const k=String(x.format||'other').toLowerCase();(groups[k]??=[]).push(x);}
      content.innerHTML='<div class="asset-summary"><b>'+(wardrobe.length+localWardrobe.length)+' Asset لباس/وسیله</b><span>Armor، XWear، Accessory و بسته‌های اصلی پوشه در کنار فایل‌های استخراج‌شده نمایش داده می‌شوند.</span></div><section class="library-group"><h3>بسته‌های اصلی <span>'+localWardrobe.length+'</span></h3><div class="library-list">'+localWardrobe.map(x=>row(x,'',badge('بسته محلی','source'))).join('')+'</div></section>'+Object.entries(groups).map(([k,arr])=>'<section class="library-group"><h3>'+fmt(k)+' <span>'+arr.length+'</span></h3><div class="library-list">'+arr.map(x=>row(x,'',badge(/png|wav|ogg|psd|json/.test(k)?'منبع':'نیاز به تبدیل',/png|wav|ogg|psd|json/.test(k)?'source':'pending'))).join('')+'</div></section>').join('');
    }else if(id==='materials'){
      content.innerHTML='<div class="asset-summary"><b>'+(materials.length+localMaterials.length)+' Material / MatCap</b><span>MatCapهای آماده و فایل‌های طراحی/PSD اصلی پوشه.</span></div><div class="library-list">'+localMaterials.map(x=>row(x,'',badge('Material Pack','source'))).join('')+'</div><div class="material-grid">'+materials.map(x=>'<article data-search="'+esc([x.name,x.package].join(' ').toLowerCase())+'">'+(x.publicUrl?'<img src="'+esc(x.publicUrl)+'" loading="lazy">':'<div class="material-icon">MAT</div>')+'<b>'+esc(x.name)+'</b><small>'+esc(x.package||'Material')+'</small></article>').join('')+'</div>';
    }else{
      content.innerHTML='<div class="asset-summary"><b>'+local.length+' فایل در پوشه‌ی محلی</b><span>'+esc(data.localRoot||'پوشه پیدا نشد')+'</span></div><div class="library-list">'+local.map(x=>row(x,'',x.blocked?badge('محدودیت مجوز','blocked'):badge(x.direct?'مستقیم':x.category,x.direct?'ready':'source'))).join('')+'</div>';
    }
  };
  setTabs(shell,tabs,'avatars',render);
  content.onclick=async e=>{
    const localName=e.target.closest('[data-avatar]')?.dataset.avatar;if(localName){e.target.disabled=true;e.target.textContent='در حال بارگذاری…';try{await window.blackClover.applyLocalAvatar(localName);e.target.textContent='فعال شد';setTimeout(()=>{e.target.disabled=false;e.target.textContent='استفاده';},1200);}catch(err){e.target.disabled=false;e.target.textContent='خطا';}return;}
    const publicUrl=e.target.closest('[data-public-avatar]')?.dataset.publicAvatar;if(publicUrl){window.blackClover.showAvatar();return;}
  };
}

export async function mountAssetSurface(surface){
  const shell=makeShell(surface),data=await catalog();shell.querySelector('.asset-root').textContent=data.localRoot||'پوشه 21 پیدا نشد';setupSearch(shell);
  if(surface==='motions')await mountMotions(shell,data);else await mountWardrobe(shell,data);
}
