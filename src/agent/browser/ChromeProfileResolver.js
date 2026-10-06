import fs from 'node:fs/promises';
import path from 'node:path';

const normalize=s=>String(s||'').normalize('NFKC').toLowerCase().replace(/ي/g,'ی').replace(/ك/g,'ک').replace(/[^\p{L}\p{N}]+/gu,' ').trim();
const fields=meta=>[meta?.name,meta?.gaia_name,meta?.user_name,meta?.shortcut_name].filter(Boolean).map(String);
const matchScore=(meta,wanted)=>{
  const q=normalize(wanted);if(!q)return 0;
  let best=0;for(const raw of fields(meta)){const x=normalize(raw);if(x===q)best=Math.max(best,100);else if(x.includes(q)||q.includes(x))best=Math.max(best,80);else{const qt=q.split(' '),xt=x.split(' '),shared=qt.filter(t=>t.length>1&&xt.includes(t)).length;if(shared)best=Math.max(best,40+shared*10);}}
  return best;
};

export function resolveChromeProfilesFromState(localState,{personalName='Amir Mohamed',businessName='شرکت',personalFallback='Profile 1',businessFallback='Profile 19'}={}){
  const info=localState?.profile?.info_cache&&typeof localState.profile.info_cache==='object'?localState.profile.info_cache:{};
  const rows=Object.entries(info).map(([directory,meta])=>({directory,displayName:meta?.name||meta?.gaia_name||meta?.user_name||directory,meta}));
  const pick=(wanted,fallback)=>{
    const ranked=rows.map(x=>({...x,score:matchScore(x.meta,wanted)})).sort((a,b)=>b.score-a.score);
    if(ranked[0]?.score>0)return {...ranked[0],matchedBy:'display-name'};
    const byDir=rows.find(x=>normalize(x.directory)===normalize(fallback));if(byDir)return {...byDir,matchedBy:'directory-fallback'};
    return {directory:fallback,displayName:fallback,meta:null,matchedBy:'configured-fallback',score:0};
  };
  return {personal:pick(personalName,personalFallback),business:pick(businessName,businessFallback),profiles:rows.map(({meta,...x})=>x)};
}

export class ChromeProfileResolver{
  constructor({userDataDir=path.join(process.env.LOCALAPPDATA||'','Google','Chrome','User Data'),personalName=process.env.BLACK_CLOVER_CHROME_PERSONAL_NAME||'Amir Mohamed',businessName=process.env.BLACK_CLOVER_CHROME_BUSINESS_NAME||'شرکت',personalFallback=process.env.BLACK_CLOVER_CHROME_DEFAULT_PROFILE||'Profile 1',businessFallback=process.env.BLACK_CLOVER_CHROME_BUSINESS_PROFILE||'Profile 19'}={}){
    this.userDataDir=userDataDir;this.personalName=personalName;this.businessName=businessName;this.personalFallback=personalFallback;this.businessFallback=businessFallback;this.cache=null;this.cachedAt=0;
  }
  async load({fresh=false}={}){
    if(!fresh&&this.cache&&Date.now()-this.cachedAt<60000)return this.cache;
    let state={};try{state=JSON.parse(await fs.readFile(path.join(this.userDataDir,'Local State'),'utf8'));}catch{}
    this.cache=resolveChromeProfilesFromState(state,{personalName:this.personalName,businessName:this.businessName,personalFallback:this.personalFallback,businessFallback:this.businessFallback});this.cachedAt=Date.now();return this.cache;
  }
  async personal(){return (await this.load()).personal.directory;}
  async business(){return (await this.load()).business.directory;}
}
export const chromeProfiles=new ChromeProfileResolver();
