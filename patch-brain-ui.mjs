import fs from 'node:fs';
const p='C:\\Users\\cibesabz\\Black-Clover-Live\\src\\renderer\\main.js';
let s=fs.readFileSync(p,'utf8');
if(!s.includes("import './brain.css';")) s=s.replace("import './setup.css';","import './setup.css';\nimport './brain.css';");

s=s.replace(
  '<div class="header-actions"><span class="shortcut">Ctrl + Shift + Space</span><button class="icon-btn settings-btn" id="settings" type="button" title="آماده‌سازی و تنظیمات">${icon(\'settings\')}</button><button class="icon-btn" type="button" id="speaker"></button></div>',
  '<div class="header-actions"><div class="brain-picker-wrap"><button class="brain-select-btn" id="brainSelect" type="button"><i></i><span id="brainSelectLabel">Auto</span><b>⌄</b></button><div class="brain-menu" id="brainMenu" hidden></div></div><span class="shortcut">Ctrl + Shift + Space</span><button class="icon-btn settings-btn" id="settings" type="button" title="آماده‌سازی و تنظیمات">${icon(\'settings\')}</button><button class="icon-btn" type="button" id="speaker"></button></div>'
);
s=s.replace(
  '<div id="setupSummary" class="setup-summary"></div>',
  '<div id="setupSummary" class="setup-summary"></div><section class="brain-settings"><div class="brain-settings-head"><div><b>Brain Pool</b><span>مغز چت را انتخاب کن؛ کلیدها با Windows رمزنگاری می‌شوند.</span></div><span id="brainSecureState"></span></div><div id="brainProviderList" class="brain-provider-list"></div></section>'
);

s=s.replace(
  "const setupSummary = $('#setupSummary');",
  "const setupSummary = $('#setupSummary');\nconst brainSelect=$('#brainSelect'),brainSelectLabel=$('#brainSelectLabel'),brainMenu=$('#brainMenu'),brainProviderList=$('#brainProviderList'),brainSecureState=$('#brainSecureState');\nlet brainCatalog=[],brainSettings=null;"
);

if(!s.includes('async function refreshBrainUI')){
  const marker="function showEmotion(text) {";
  const code=`
function selectedBrainId(){return localStorage.getItem('blackClover:selectedModel')||'auto';}
function brainLabel(item){if(!item)return'Auto';if(item.id==='auto')return'Auto';if(item.provider==='ollama')return item.model.replace(/^qwen/i,'Qwen');return item.label?.split(' • ')[0]||item.provider||item.model;}
function updateBrainButton(){
  const id=selectedBrainId(),item=brainCatalog.find(x=>x.id===id)||brainCatalog.find(x=>x.id==='auto');
  if(!item||item.available===false){localStorage.setItem('blackClover:selectedModel','auto');brainSelectLabel.textContent='Auto';return;}
  brainSelectLabel.textContent=brainLabel(item);brainSelect.title=item.description||item.label||'انتخاب مغز';
}
function renderBrainMenu(){
  if(!brainMenu)return;brainMenu.innerHTML='';
  for(const item of brainCatalog){
    const b=document.createElement('button');b.type='button';b.className='brain-menu-item'+(selectedBrainId()===item.id?' active':'')+(item.available===false?' unavailable':'');
    const state=item.id==='auto'?'خودکار':item.provider==='ollama'?'محلی':item.available?'Cloud آماده':'نیاز به API Key';
    b.innerHTML=\`<span><b>\${brainLabel(item)}</b><small>\${item.model==='auto'?'':item.model||''}</small></span><em>\${state}</em>\`;
    b.onclick=()=>{if(item.available===false){brainMenu.hidden=true;openSetup();return;}localStorage.setItem('blackClover:selectedModel',item.id);brainMenu.hidden=true;renderBrainMenu();updateBrainButton();};
    brainMenu.append(b);
  }
}
function renderBrainSettings(){
  if(!brainProviderList||!brainSettings)return;brainProviderList.innerHTML='';brainSecureState.textContent=brainSettings.secure?'🔒 Windows Secure Storage':'⚠ رمزنگاری آماده نیست';
  for(const p of brainSettings.providers||[]){
    const row=document.createElement('article');row.className='brain-provider';row.dataset.provider=p.provider;
    row.innerHTML=\`<div class="brain-provider-title"><div><b>\${p.label}</b><span>\${p.note||''}</span></div><i class="\${p.configured?'ready':''}">\${p.configured?'آماده':'بدون کلید'}</i></div>
      <div class="brain-provider-fields"><input data-key type="password" autocomplete="off" placeholder="\${p.configured?'API Key ذخیره شده • برای تغییر، کلید جدید را بنویس':'API Key'}"><input data-model value="\${String(p.model||'').replaceAll('"','&quot;')}" placeholder="Model"><input data-base value="\${String(p.baseUrl||'').replaceAll('"','&quot;')}" placeholder="Base URL"></div>
      <div class="brain-provider-actions"><button data-save>ذخیره و فعال‌سازی</button><button data-test \${p.configured?'':'disabled'}>تست اتصال</button><button data-remove \${p.configured?'':'disabled'}>حذف کلید</button><span data-result></span></div>\`;
    brainProviderList.append(row);
  }
}
async function refreshBrainUI(){
  if(!IS_CHAT)return;const [catalog,settings]=await Promise.all([window.blackClover.modelCatalog(),window.blackClover.brainSettings()]);
  brainCatalog=catalog||[];brainSettings=settings;renderBrainMenu();renderBrainSettings();updateBrainButton();return {catalog,settings};
}
brainSelect?.addEventListener('click',e=>{e.stopPropagation();brainMenu.hidden=!brainMenu.hidden;});
document.addEventListener('click',e=>{if(brainMenu&&!e.target.closest('.brain-picker-wrap'))brainMenu.hidden=true;});
brainProviderList?.addEventListener('click',async e=>{
  const row=e.target.closest('.brain-provider');if(!row)return;const provider=row.dataset.provider,result=row.querySelector('[data-result]');
  try{
    if(e.target.matches('[data-save]')){e.target.disabled=true;result.textContent='در حال ذخیره…';await window.blackClover.saveBrainProvider({provider,apiKey:row.querySelector('[data-key]').value,model:row.querySelector('[data-model]').value,baseUrl:row.querySelector('[data-base]').value,enabled:true});await refreshBrainUI();result.textContent='ذخیره شد ✓';}
    if(e.target.matches('[data-test]')){e.target.disabled=true;result.textContent='در حال تست…';const r=await window.blackClover.testBrainProvider(provider);result.textContent=r.ok?'اتصال سالم ✓':'اتصال برقرار نشد';e.target.disabled=false;}
    if(e.target.matches('[data-remove]')){await window.blackClover.removeBrainProvider(provider);await refreshBrainUI();}
  }catch(err){result.textContent='خطا: '+(err.message||err);}finally{const save=row.querySelector('[data-save]');if(save)save.disabled=false;}
});
`;
  s=s.replace(marker,code+"\n"+marker);
}

s=s.replace(
  "diagnostics = await window.blackClover.diagnostics();",
  "diagnostics = await window.blackClover.diagnostics();\n  await refreshBrainUI().catch(()=>{});"
);

if(!s.includes("refreshBrainUI().catch(()=>{});\nif (IS_CHAT) input.focus();")){
  s=s.replace("if (IS_CHAT) input.focus();","if (IS_CHAT) { refreshBrainUI().catch(()=>{}); input.focus(); }");
}
fs.writeFileSync(p,s,'utf8');
console.log('brain selector UI patched');