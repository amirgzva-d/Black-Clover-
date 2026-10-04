import './voiceSettings.css';
import { voice } from './voice.js';

const PRESETS={
  playful:{label:'بازیگوش و انیمه‌ای',rate:1.07,pitch:1.08,volume:1},
  caring:{label:'آرام و همدل',rate:.94,pitch:1.03,volume:.96},
  cool:{label:'خنک و جدی',rate:.96,pitch:.97,volume:.98},
  energetic:{label:'پرانرژی',rate:1.13,pitch:1.07,volume:1},
  natural:{label:'طبیعی و متعادل',rate:1.02,pitch:1.02,volume:1}
};

const SPOKEN_JAPANESE=new Map([
  ['あらあら','آرا آرا'],['やれやれ','یاره یاره'],['もう','موو'],['はい','های'],['よし','یوشی'],
  ['えっ','اِ'],['なるほど','نارو هودو'],['お疲れ','اوتسوکاره'],['大丈夫','دایجوبو'],['すごい','سوگوی'],
  ['ばか','باکا'],['うん','اون'],['なんで','نانده'],['どこ','دوکو']
]);
const pronounceJapanese=text=>{
  let out=String(text??'');
  for(const [jp,spoken] of SPOKEN_JAPANESE)out=out.split(jp).join(spoken);
  return out;
};

const originalSpeak=voice.speak.bind(voice);
voice.speak=text=>originalSpeak(pronounceJapanese(text));

const $=q=>document.querySelector(q);
const clamp=(v,a,b)=>Math.max(a,Math.min(b,Number(v)));
const savedPreset=()=>localStorage.getItem('blackClover:voicePreset')||'playful';

function row(label,control,description=''){
  const wrap=document.createElement('label');
  wrap.className='voice-setting-row';
  const copy=document.createElement('span');
  copy.className='voice-setting-copy';
  const title=document.createElement('b');title.textContent=label;
  const desc=document.createElement('small');desc.textContent=description;
  copy.append(title,desc);wrap.append(copy,control);return wrap;
}

function select(options,value){
  const el=document.createElement('select');
  for(const [v,label] of options){const o=document.createElement('option');o.value=v;o.textContent=label;el.append(o);}el.value=value;return el;
}

function range(min,max,step,value){const el=document.createElement('input');el.type='range';el.min=min;el.max=max;el.step=step;el.value=value;return el;}

function mount(){
  const panel=$('#setup .setup-panel');
  const depList=$('#depList');
  if(!panel||!depList||$('#voicePersonalityPanel'))return;

  const section=document.createElement('section');
  section.id='voicePersonalityPanel';
  section.className='voice-personality-panel';
  section.innerHTML='<div class="voice-personality-head"><div><b>شخصیت صدا</b><span>صدای طبیعی فارسی + حالت آفلاین، هماهنگ با حرکت دهان</span></div><i id="voiceReadyDot"></i></div>';

  const current=voice.settings();
  const preset=select([...Object.entries(PRESETS).map(([id,p])=>[id,p.label]),['custom','سفارشی']],savedPreset());
  const engine=select([
    ['auto','خودکار • Dilara طبیعی، سپس پشتیبان'],
    ['local','صدای طبیعی/محلی • Edge TTS → Piper'],
    ['system','صدای Windows']
  ],current.engine||'auto');
  const rate=range('.75','1.3','.01',current.rate||1.03);
  const pitch=range('.75','1.3','.01',current.pitch||1.05);
  const volume=range('0','1','.01',current.volume??1);

  section.append(
    row('حال‌وهوای صدا',preset,'بازیگوش، آرام، خنک، پرانرژی یا سفارشی'),
    row('موتور صدا',engine,'پیشنهاد: خودکار؛ اینترنت = Dilara، آفلاین = Piper'),
    row('سرعت',rate,'ریتم حرف‌زدن ماریا'),
    row('زیر و بمی',pitch,'برای حس دخترانه/جدی‌تر؛ روی صدای Windows اثر بیشتری دارد'),
    row('بلندی',volume,'صدای خروجی')
  );

  const actions=document.createElement('div');actions.className='voice-setting-actions';
  const test=document.createElement('button');test.type='button';test.textContent='تست صدای ماریا';
  const install=document.createElement('button');install.type='button';install.textContent='نصب صدای طبیعی رایگان';
  const status=document.createElement('span');status.id='voiceEngineStatus';status.textContent='در حال بررسی…';
  actions.append(test,install,status);section.append(actions);
  depList.before(section);

  const apply=()=>voice.configure({rate:clamp(rate.value,.75,1.3),pitch:clamp(pitch.value,.75,1.3),volume:clamp(volume.value,0,1),engine:engine.value});
  const applyPreset=id=>{
    const p=PRESETS[id];if(!p)return;
    rate.value=p.rate;pitch.value=p.pitch;volume.value=p.volume;
    localStorage.setItem('blackClover:voicePreset',id);apply();
  };
  preset.onchange=()=>{if(preset.value==='custom'){localStorage.setItem('blackClover:voicePreset','custom');return;}applyPreset(preset.value);};
  engine.onchange=apply;
  for(const slider of [rate,pitch,volume])slider.oninput=()=>{preset.value='custom';localStorage.setItem('blackClover:voicePreset','custom');apply();};

  test.onclick=()=>voice.speak('あらあら… سلام ارباب. من ماریا هستم؛ خب، امروز قراره چه مأموریتی رو با هم جمع کنیم؟');
  install.onclick=async()=>{
    install.disabled=true;install.textContent='در حال نصب…';
    try{await window.blackClover.installDependency('natural_tts');await voice.refreshLocalStatus();await refreshStatus();}
    catch(error){status.textContent=`نصب نشد: ${error.message||error}`;}
    finally{install.disabled=false;install.textContent='نصب صدای طبیعی رایگان';}
  };

  async function refreshStatus(){
    const s=await voice.refreshLocalStatus();
    const dot=$('#voiceReadyDot');
    if(s?.naturalTts){status.textContent=`طبیعی آماده • ${s.preferredVoice||'fa-IR-DilaraNeural'}`;dot?.classList.add('ok');install.hidden=true;}
    else if(s?.localTts){status.textContent='فعلاً آفلاین • Piper';dot?.classList.remove('ok');install.hidden=false;}
    else{status.textContent='موتور صدا کامل نصب نشده';dot?.classList.remove('ok');install.hidden=false;}
  }

  if(PRESETS[preset.value]&&!localStorage.getItem('blackClover:voicePreset'))applyPreset(preset.value);
  else apply();
  refreshStatus().catch(()=>{status.textContent='وضعیت صدا نامشخص';});
}

if(document.readyState==='loading')document.addEventListener('DOMContentLoaded',mount,{once:true});else mount();
setTimeout(mount,250);
