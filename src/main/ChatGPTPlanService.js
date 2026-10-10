import path from 'node:path';
import fs from 'node:fs';
import {spawn} from 'node:child_process';
import {app,safeStorage,shell} from 'electron';
import {createChatGPT,CHATGPT_USAGE_URL,ChatGPTError} from '@siwc/local';

function credentialEncryption(){
  const isAvailable=()=>app.isReady()&&safeStorage.isEncryptionAvailable()&&(process.platform!=='linux'||['gnome_libsecret','kwallet','kwallet5','kwallet6'].includes(safeStorage.getSelectedStorageBackend()));
  const requireAvailable=()=>{if(!isAvailable())throw new Error('OS credential encryption is unavailable.');};
  return {
    id:'electron-safe-storage-v1',
    isAvailable,
    encrypt(plaintext){requireAvailable();return safeStorage.encryptString(String(plaintext));},
    decrypt(ciphertext){requireAvailable();return safeStorage.decryptString(Buffer.from(ciphertext));}
  };
}
const cleanError=error=>{
  if(error instanceof ChatGPTError)return error;
  if(error?.name==='AbortError')return new Error('Request cancelled');
  return error instanceof Error?error:new Error(String(error||'ChatGPT request failed'));
};
const usableSession=s=>Boolean(s?.status==='connected'&&s?.sharing===true&&!s?.error);
const publicSession=s=>({status:String(s?.status||'disconnected'),sharing:Boolean(s?.sharing),profileId:s?.profileId||null,profileLabel:s?.profileLabel||null,identity:s?.identity?{name:s.identity.name||null,email:s.identity.email||null}:null,error:s?.error?{code:s.error.code||'',message:s.error.message||'',retryable:Boolean(s.error.retryable),status:s.error.status||null}:null});

export class ChatGPTPlanService{
  constructor(){this.client=null;this.controllers=new Set();this.modelsCache=[];this.modelsAt=0;}
  ensure(){
    if(this.client)return this.client;
    if(!app.isReady())throw new Error('ChatGPT sign-in is available after MARIA starts.');
    this.client=createChatGPT({
      appName:'MARIA Black Clover',
      appId:'black-clover-maria',
      redirectPort:0,
      storageDir:path.join(app.getPath('userData'),'chatgpt'),
      credentialEncryption:credentialEncryption(),
      sendHostId:true,
      openBrowser:async raw=>{
        const target=new URL(raw);
        if(target.origin!=='https://auth.openai.com')throw new Error('Unexpected ChatGPT sign-in destination.');
        // Use the user's existing Chrome identity (Amir Mohmd), not the Windows default browser.
        // Never read Chrome cookies or authentication data.
        if(process.platform==='win32'){
          const chrome=path.join(process.env.PROGRAMFILES||'C:\\Program Files','Google','Chrome','Application','chrome.exe');
          const profileState=path.join(process.env.LOCALAPPDATA||'', 'Google','Chrome','User Data','Local State');
          try{
            const profiles=JSON.parse(fs.readFileSync(profileState,'utf8')).profile?.info_cache||{};
            const matched=Object.entries(profiles).find(([,v])=>/Amir\s*Moh(?:a)?md/i.test(String(v.gaia_name||'')));
            if(matched&&fs.existsSync(chrome)){
              const child=spawn(chrome,['--profile-directory='+matched[0],target.href],{detached:true,stdio:'ignore',windowsHide:false});
              child.once('error',error=>console.warn('Chrome profile opener:',error.message));
              child.unref();
              return;
            }
          }catch(error){console.warn('Chrome profile lookup:',error.message);}
        }
        await shell.openExternal(target.href);
      }
    });
    return this.client;
  }
  async session(){try{return await this.ensure().getSession();}catch(error){return {status:'disconnected',sharing:false,error:{message:String(error?.message||error)}};}}
  async profiles(){try{return await this.ensure().listProfiles();}catch{return[];}}
  async signIn(options={}){const state=await this.ensure().signIn(options);this.modelsCache=[];this.modelsAt=0;return state;}
  async selectProfile(profileId){if(!profileId||typeof profileId!=='string')throw new Error('A saved ChatGPT profile must be selected.');const state=await this.ensure().selectProfile(profileId);this.modelsCache=[];this.modelsAt=0;return state;}
  cancelSignIn(){this.client?.cancelSignIn?.();}
  async disconnect(){if(this.client)await this.client.disconnect();this.modelsCache=[];this.modelsAt=0;return this.session();}
  async openUsage(){await shell.openExternal(CHATGPT_USAGE_URL);return {ok:true};}
  async models({fresh=false}={}){
    const session=await this.session();if(!usableSession(session)){this.modelsCache=[];this.modelsAt=0;return[];}
    if(!fresh&&this.modelsCache.length&&Date.now()-this.modelsAt<5*60*1000)return this.modelsCache;
    try{this.modelsCache=await this.ensure().listModels();this.modelsAt=Date.now();return this.modelsCache;}catch{return[];}
  }
  async status(){
    const [session,profiles,models]=await Promise.all([this.session(),this.profiles(),this.models()]);
    return {session:publicSession(session),profiles:profiles.map(x=>({id:x.id,label:x.label,status:x.status,sharing:Boolean(x.sharing),identity:x.identity?{name:x.identity.name||null,email:x.identity.email||null}:null})),models:models.map(x=>({slug:x.slug,displayName:x.displayName}))};
  }
  async available(){const s=await this.session();return usableSession(s);}
  cancel(){for(const c of this.controllers)try{c.abort();}catch{}this.controllers.clear();}
  async chat(messages=[],{model='auto',onDelta=null,tools=[]}={}){
    const session=await this.session();if(session.status!=='connected')throw new Error('Sign in with ChatGPT to continue.');if(!session.sharing||session.error)throw new Error(session.error?.message||'ChatGPT plan usage is not enabled for this connection.');
    const models=await this.models(),picked=model&&model!=='auto'?model:models[0]?.slug;if(!picked)throw new Error('No ChatGPT model is available for this account.');
    let instructions=messages.filter(m=>m?.role==='system').map(m=>String(m.content||'')).filter(Boolean).join('\n\n');
    // The current sign-in SDK handles text Responses only. Send an allowlisted tool
    // description as instructions; the host validates any JSON tool request and
    // executes it through MARIA's existing confirmation/permission layer.
    if(tools.length){
      const available=tools.slice(0,20).filter(x=>x?.function?.name).map(x=>({
        name:x.function.name,description:String(x.function.description||'').slice(0,450),
        parameters:x.function.parameters||{type:'object',properties:{}}
      }));
      instructions+='\n\nMARIA TOOL ROUTING: Choose from ONLY the permitted tools in the following JSON list. If a tool must run, output ONLY JSON of the form {"name":"tool_name","arguments":{"key":"value"}}. Never claim an action succeeded before its tool result is provided. When a tool result is present, answer using the actual result. If no tool is needed, reply naturally in Persian. Tools: '+JSON.stringify(available);
    }
    const input=messages.filter(m=>['user','assistant','developer','tool'].includes(m?.role)&&String(m.content||'').trim()).map(m=>({role:m.role==='tool'?'user':m.role,content:m.role==='tool'?'[MARIA TOOL RESULT '+String(m.tool_name||'')+'] '+String(m.content).slice(0,6000):String(m.content)}));
    const controller=new AbortController();this.controllers.add(controller);
    try{
      const result=await this.ensure().streamResponse({model:picked,input,instructions:instructions||undefined,signal:controller.signal,onDelta:delta=>{if(!tools.length)onDelta?.(delta);}});
      return {message:{role:'assistant',content:result.text},provider:'chatgpt',model:picked};
    }catch(error){const typed=cleanError(error);if(controller.signal.aborted||typed?.code==='cancelled')throw new Error('Request cancelled');throw typed;}finally{this.controllers.delete(controller);}
  }
  async catalog(){
    const status=await this.status();
    return status.models.map(x=>({id:`chatgpt:${x.slug}`,provider:'chatgpt',model:x.slug,label:`ChatGPT • ${x.displayName||x.slug}`,description:'استفاده از حساب ChatGPT متصل‌شده از مسیر رسمی OpenAI',available:status.session.status==='connected'&&status.session.sharing&&!status.session.error,configured:status.session.status==='connected'}));
  }
}
export const chatgptPlan=new ChatGPTPlanService();
