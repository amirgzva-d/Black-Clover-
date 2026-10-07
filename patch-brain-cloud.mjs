import fs from 'node:fs';
const p='C:\\Users\\cibesabz\\Black-Clover-Live\\src\\agent\\BrainRouter.js';
let s=fs.readFileSync(p,'utf8');
s=s.replace("const badGeneralModel=name=>/(embed|embedding|rerank|vision-only|whisper|stable-diffusion|flux|nomic)/i.test(name);",
"const badGeneralModel=name=>/(embed|embedding|rerank|vision-only|whisper|stable-diffusion|flux|nomic|:cloud$)/i.test(name);");
s=s.replace(
"return [{id:'auto',provider:'auto',model:'auto',label:'Auto • Maria',description:'Maria بر اساس نوع کار سریع‌ترین و مناسب‌ترین مغز آماده را انتخاب می‌کند.',available:true,configured:true},...installed.map(model=>({id:`ollama:${model}`,provider:'ollama',model,label:`Ollama • ${model}`,description:'مدل محلی؛ داده روی همین سیستم می‌ماند.',available:true,configured:true})),...online];",
"return [{id:'auto',provider:'auto',model:'auto',label:'Auto • Maria',description:'Maria بر اساس نوع کار سریع‌ترین و مناسب‌ترین مغز آماده را انتخاب می‌کند.',available:true,configured:true},...installed.map(model=>{const cloud=/:cloud$/i.test(model);return {id:cloud?`ollama-cloud:${model}`:`ollama:${model}`,provider:cloud?'ollama-cloud':'ollama',model,label:`${cloud?'Ollama Cloud':'Ollama'} • ${model}`,description:cloud?'مدل Cloud از مسیر Ollama؛ داده برای پاسخ به سرویس آنلاین فرستاده می‌شود.':'مدل محلی؛ داده روی همین سیستم می‌ماند.',available:true,configured:true};}),...online];"
);
s=s.replace(
"if(modelOverride&&modelOverride!=='auto'){const selected=String(modelOverride);if(selected.startsWith('ollama:')){provider='ollama';model=selected.slice(7);}else if(selected.startsWith('online:')){provider=selected.slice(7);model='auto';}}",
"if(modelOverride&&modelOverride!=='auto'){const selected=String(modelOverride);if(selected.startsWith('ollama-cloud:')){provider='ollama-cloud';model=selected.slice(13);}else if(selected.startsWith('ollama:')){provider='ollama';model=selected.slice(7);}else if(selected.startsWith('online:')){provider=selected.slice(7);model='auto';}}"
);
s=s.replace(
"const forceLocal=provider==='ollama'||provider==='local',forceOnline=!['auto','ollama','local'].includes(provider),policy=String(process.env.BLACK_CLOVER_BRAIN_POLICY||'online-first').toLowerCase();",
"const forceLocal=provider==='ollama'||provider==='local',forceOllamaCloud=provider==='ollama-cloud',forceOnline=!['auto','ollama','local','ollama-cloud'].includes(provider),policy=String(process.env.BLACK_CLOVER_BRAIN_POLICY||'online-first').toLowerCase();"
);
const marker="if(forceOnline){if(!allowOnline)throw new Error('This project contains private/local context, so cloud model use is blocked for this turn.');if(!await this.network())throw new Error('Internet is unavailable for the selected cloud provider.');const out=await this.online.chat(messages,tools,{profile,provider,model});this.lastMode='online';this.lastProvider=out.provider;this.lastModel=out.model;this.lastFallbackReason='';return out;}";
if(!s.includes("forceOllamaCloud){")){
 s=s.replace(marker,
 "if(forceOllamaCloud){if(!allowOnline)throw new Error('Private/local context cannot use an Ollama Cloud model.');if(!await this.network())throw new Error('Internet is unavailable for the selected Ollama Cloud model.');const cloud=await this.chooseLocal(profile,model);this.lastMode='ollama-cloud';this.lastProvider='ollama-cloud';this.lastModel=cloud.model;this.lastFallbackReason='';return cloud.chat(messages,tools);}\n    "+marker);
}
fs.writeFileSync(p,s,'utf8');
console.log('BrainRouter cloud privacy patched');