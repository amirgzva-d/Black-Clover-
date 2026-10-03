const cleanForSpeech=text=>String(text??'')
  .replace(/https?:\/\/\S+/gi,' لینک ')
  .replace(/[`*_#>|~]/g,' ')
  .replace(/\s+/g,' ')
  .trim();

const scoreVoice=v=>{
  let score=0;
  const lang=String(v.lang||'').toLowerCase(),name=String(v.name||'').toLowerCase();
  if(lang==='fa-ir')score+=100;
  else if(lang.startsWith('fa'))score+=80;
  if(/female|woman|زن|dilara|heera/.test(name))score+=20;
  if(v.localService)score+=5;
  return score;
};

export class VoiceController extends EventTarget{
  constructor(){
    super();
    this.enabled=localStorage.getItem('blackClover:speech')!=='off';
    this.rate=Number(localStorage.getItem('blackClover:voiceRate')||1.04);
    this.pitch=Number(localStorage.getItem('blackClover:voicePitch')||1.06);
    this.volume=1;
    this.speaking=false;
    this.generation=0;
    this.voices=[];
    this.refreshVoices();
    globalThis.speechSynthesis?.addEventListener?.('voiceschanged',()=>this.refreshVoices());
  }
  refreshVoices(){this.voices=globalThis.speechSynthesis?.getVoices?.()||[];this.dispatchEvent(new CustomEvent('voices',{detail:{voice:this.bestVoice()}}));}
  bestVoice(){return [...this.voices].sort((a,b)=>scoreVoice(b)-scoreVoice(a))[0]||null;}
  setEnabled(value){this.enabled=Boolean(value);localStorage.setItem('blackClover:speech',this.enabled?'on':'off');if(!this.enabled)this.stop('disabled');this.dispatchEvent(new CustomEvent('enabled',{detail:{enabled:this.enabled}}));}
  stop(reason='interrupted'){
    this.generation++;
    globalThis.speechSynthesis?.cancel?.();
    if(this.speaking){this.speaking=false;this.dispatchEvent(new CustomEvent('state',{detail:{state:'idle',reason}}));}
  }
  speak(text){
    if(!this.enabled||!('speechSynthesis'in globalThis))return false;
    const clean=cleanForSpeech(text);if(!clean)return false;
    this.stop('replace');
    const generation=++this.generation,u=new SpeechSynthesisUtterance(clean),voice=this.bestVoice();
    u.lang=voice?.lang||'fa-IR';u.rate=Math.max(.75,Math.min(1.3,this.rate));u.pitch=Math.max(.75,Math.min(1.3,this.pitch));u.volume=this.volume;if(voice)u.voice=voice;
    u.onstart=()=>{if(generation!==this.generation)return;this.speaking=true;this.dispatchEvent(new CustomEvent('state',{detail:{state:'speaking',text:clean,voice:voice?.name||null}}));};
    u.onboundary=e=>{if(generation===this.generation)this.dispatchEvent(new CustomEvent('boundary',{detail:{charIndex:e.charIndex,charLength:e.charLength||0,name:e.name||''}}));};
    const finish=reason=>{if(generation!==this.generation)return;this.speaking=false;this.dispatchEvent(new CustomEvent('state',{detail:{state:'idle',reason}}));};
    u.onend=()=>finish('ended');u.onerror=e=>finish(e.error||'error');
    globalThis.speechSynthesis.speak(u);return true;
  }
}

export const voice=new VoiceController();
