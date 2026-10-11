// One authoritative provider selection for normal and retry requests.
// A selected Gemini/Ollama/Auto model must never be relabeled as ChatGPT.
export const DEFAULT_CHAT_MODEL='auto';

export function routeChosenChatModel(selection=DEFAULT_CHAT_MODEL){
  const selected=String(selection||DEFAULT_CHAT_MODEL).trim();
  if(selected==='auto')return {modelOverride:'auto',provider:'auto',label:'Auto • MARIA'};
  if(selected.startsWith('chatgpt:'))return {modelOverride:selected,provider:'chatgpt',label:'ChatGPT'};
  if(selected.startsWith('online:')){
    const provider=selected.slice(7).trim().toLowerCase();
    if(!/^[a-z][a-z0-9-]{1,32}$/.test(provider))throw new Error('مدل ابری انتخاب‌شده معتبر نیست.');
    return {modelOverride:selected,provider,label:provider};
  }
  if(selected.startsWith('ollama-cloud:'))return {modelOverride:selected,provider:'ollama-cloud',label:'Ollama Cloud'};
  if(selected.startsWith('ollama:'))return {modelOverride:selected,provider:'ollama',label:'Ollama'};
  throw new Error('مدل انتخاب‌شده در فهرست MARIA معتبر نیست.');
}
export const fallbackChatModel=({selected,models=[],chatgptConnected=false}={})=>{
  const candidate=String(selected||DEFAULT_CHAT_MODEL);
  if(candidate==='auto')return 'auto';
  const known=Array.isArray(models)&&models.some(model=>model.id===candidate);
  if(candidate==='chatgpt:auto')return chatgptConnected?candidate:'auto';
  return known?candidate:'auto';
};
export function executionStatus(response={}){
  if(response?.requiresConfirmation)return {kind:'pending',label:'نیازمند تأیید قبل از اجرا'};
  if(response?.ok===false)return {kind:'error',label:'انجام نشد'};
  const route=Number(response?.toolsRouted||0);
  const successes=Number(response?.toolSummary?.taskExecutions??response?.toolSummary?.successes??0);
  const failures=Number(response?.toolSummary?.failures||0);
  if(failures)return {kind:'error',label:'بخشی از عملیات ناموفق بود'};
  if(successes)return {kind:'success',label:successes+' عملیات اجرا شد'};
  if(response?.direct===true&&response?.tool)return {kind:'success',label:'فرمان اجرا و بررسی شد'};
  if(route)return {kind:'info',label:'پاسخ بدون اجرای عملیات'};
  return {kind:'info',label:'پاسخ متنی'};
}
