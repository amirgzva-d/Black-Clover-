const cleanForSpeech=text=>String(text??'')
  .replace(/https?:\/\/\S+/gi,' لینک ')
  .replace(/[`*_#>|~]/g,' ')
  .replace(/\b([A-Z]{2,})\b/g,m=>m.split('').join(' '))
  .replace(/\s*([،؛:!?؟.])\s*/g,'$1 ')
  .replace(/\s+/g,' ')
  .trim();

const scoreVoice=v=>{
  let score=0;
  const lang=String(v.lang||'').toLowerCase(),name=String(v.name||'').toLowerCase();
  if(lang==='fa-ir')score+=120; else if(lang.startsWith('fa'))score+=95;
  if(/female|woman|زن|dilara|heera|ava|aria/.test(name))score+=25;
  if(/natural|neural|online/.test(name))score+=8;
  if(v.localService)score+=4;
  return score;
};
const clamp=(v,a,b)=>Math.max(a,Math.min(b,v));
const splitSpeech=text=>{
  const parts=cleanForSpeech(text).match(/[^.!?؟\n]+[.!?؟]?/g)||[];
  const out=[];
  for(const raw of parts){let s=raw.trim();while(s.length>190){let i=Math.max(s.lastIndexOf('،',175),s.lastIndexOf(' ',175));if(i<70)i=175;out.push(s.slice(0,i+1).trim());s=s.slice(i+1).trim();}if(s)out.push(s);}
  return out.length?out:[cleanForSpeech(text)];
};

export class VoiceController extends EventTarget{
  constructor(){super();this.enabled=localStorage.getItem('blackClover:speech')!=='off';this.rate=Number(localStorage.getItem('blackClover:voiceRate')||1.03);this.pitch=Number(localStorage.getItem('blackClover:voicePitch')||1.05);this.volume=Number(localStorage.getItem('blackClover:voiceVolume')||1);this.speaking=false;this.generation=0;this.voices=[];this.preferredVoice=localStorage.getItem('blackClover:voiceName')||'';this.refreshVoices();globalThis.speechSynthesis?.addEventListener?.('voiceschanged',()=>this.refreshVoices());}
  refreshVoices(){this.voices=globalThis.speechSynthesis?.getVoices?.()||[];this.dispatchEvent(new CustomEvent('voices',{detail:{voices:this.voices,voice:this.bestVoice()}}));}
  bestVoice(){return this.voices.find(v=>v.name===this.preferredVoice)||[...this.voices].sort((a,b)=>scoreVoice(b)-scoreVoice(a))[0]||null;}
  settings(){const v=this.bestVoice();return {enabled:this.enabled,rate:this.rate,pitch:this.pitch,volume:this.volume,voice:v?{name:v.name,lang:v.lang}:null,available:this.voices.map(x=>({name:x.name,lang:x.lang,local:x.localService}))};}
  configure({rate,pitch,volume,voiceName}={}){if(Number.isFinite(rate)){this.rate=clamp(rate,.75,1.3);localStorage.setItem('blackClover:voiceRate',this.rate);}if(Number.isFinite(pitch)){this.pitch=clamp(pitch,.75,1.3);localStorage.setItem('blackClover:voicePitch',this.pitch);}if(Number.isFinite(volume)){this.volume=clamp(volume,0,1);localStorage.setItem('blackClover:voiceVolume',this.volume);}if(typeof voiceName==='string'){this.preferredVoice=voiceName;localStorage.setItem('blackClover:voiceName',voiceName);}this.dispatchEvent(new CustomEvent('settings',{detail:this.settings()}));}
  setEnabled(value){this.enabled=Boolean(value);localStorage.setItem('blackClover:speech',this.enabled?'on':'off');if(!this.enabled)this.stop('disabled');this.dispatchEvent(new CustomEvent('enabled',{detail:{enabled:this.enabled}}));}
  stop(reason='interrupted'){this.generation++;globalThis.speechSynthesis?.cancel?.();if(this.speaking){this.speaking=false;this.dispatchEvent(new CustomEvent('state',{detail:{state:'idle',reason}}));}}
  speak(text){if(!this.enabled||!('speechSynthesis'in globalThis))return false;const chunks=splitSpeech(text).filter(Boolean);if(!chunks.length)return false;this.stop('replace');const generation=++this.generation,voice=this.bestVoice();let index=0;
    const next=()=>{if(generation!==this.generation||index>=chunks.length){if(generation===this.generation){this.speaking=false;this.dispatchEvent(new CustomEvent('state',{detail:{state:'idle',reason:'ended'}}));}return;}const chunk=chunks[index++],u=new SpeechSynthesisUtterance(chunk);u.lang=voice?.lang||'fa-IR';u.rate=clamp(this.rate,.75,1.3);u.pitch=clamp(this.pitch,.75,1.3);u.volume=clamp(this.volume,0,1);if(voice)u.voice=voice;u.onstart=()=>{if(generation!==this.generation)return;this.speaking=true;this.dispatchEvent(new CustomEvent('state',{detail:{state:'speaking',text:chunk,voice:voice?.name||null,chunk:index,total:chunks.length}}));};u.onboundary=e=>{if(generation===this.generation)this.dispatchEvent(new CustomEvent('boundary',{detail:{charIndex:e.charIndex,charLength:e.charLength||0,name:e.name||'',chunk:index}}));};u.onend=next;u.onerror=e=>{if(e.error==='interrupted'||e.error==='canceled')return;this.speaking=false;this.dispatchEvent(new CustomEvent('state',{detail:{state:'idle',reason:e.error||'error'}}));};globalThis.speechSynthesis.speak(u);};next();return true;
  }
}
export const voice=new VoiceController();
