import fs from 'node:fs/promises';
import path from 'node:path';
import os from 'node:os';

const normalize=value=>String(value??'')
  .normalize('NFKC')
  .replace(/[يى]/g,'ی')
  .replace(/ك/g,'ک')
  .replace(/[\u200c\u200d]/g,' ')
  .replace(/\s+/g,' ')
  .trim()
  .toLocaleLowerCase();

function candidateUserDataDirs(){
  const local=process.env.LOCALAPPDATA;
  const home=process.env.USERPROFILE||os.homedir();
  return [
    local&&path.join(local,'Google','Chrome','User Data'),
    path.join(home,'AppData','Local','Google','Chrome','User Data')
  ].filter(Boolean);
}

async function readProfileInfo(userDataDir){
  try{
    const raw=await fs.readFile(path.join(userDataDir,'Local State'),'utf8');
    const state=JSON.parse(raw);
    return {userDataDir,infoCache:state?.profile?.info_cache||{}};
  }catch{return {userDataDir,infoCache:{}};}
}

function scoreProfile(alias,key,info){
  const target=normalize(alias), values=[
    key,info?.name,info?.gaia_name,info?.user_name,info?.email,
    info?.account_name,info?.hosted_domain
  ].map(normalize).filter(Boolean);
  if(!target)return 0;
  if(values.includes(target))return 100;
  if(values.some(value=>value.startsWith(target)||target.startsWith(value)))return 75;
  if(values.some(value=>value.includes(target)||target.includes(value)))return 50;
  const tokens=target.split(' ').filter(Boolean);
  return tokens.length&&tokens.every(token=>values.some(value=>value.includes(token)))?35:0;
}

export async function listChromeProfiles(){
  const results=[];
  for(const userDataDir of candidateUserDataDirs()){
    const {infoCache}=await readProfileInfo(userDataDir);
    for(const [directory,info] of Object.entries(infoCache)){
      results.push({
        directory,
        userDataDir,
        name:info?.name||directory,
        email:info?.user_name||info?.email||'',
        accountName:info?.gaia_name||'',
        raw:info
      });
    }
  }
  const seen=new Set();
  return results.filter(item=>{
    const key=item.userDataDir+'\\0'+item.directory;
    if(seen.has(key))return false;
    seen.add(key);return true;
  });
}

export async function resolveChromeProfile(alias,kind='default'){
  const requested=String(alias||'').trim();
  const envValue=kind==='business'
    ? process.env.BLACK_CLOVER_CHROME_BUSINESS_PROFILE
    : process.env.BLACK_CLOVER_CHROME_DEFAULT_PROFILE;
  const target=requested||envValue||(kind==='business'?'شرکت':'Amir Mohamed');
  const profiles=await listChromeProfiles();
  if(!profiles.length)return envValue|| (kind==='business'?'Profile 19':'Profile 1');
  if(/^Profile \d+$/i.test(target)||target==='Default'){
    const direct=profiles.find(item=>item.directory.toLowerCase()===target.toLowerCase());
    if(direct)return direct.directory;
  }
  const ranked=profiles.map(item=>({item,score:scoreProfile(target,item.directory,item.raw)}))
    .sort((a,b)=>b.score-a.score);
  if(ranked[0]?.score>0)return ranked[0].item.directory;
  const fallback=kind==='business'
    ? process.env.BLACK_CLOVER_CHROME_BUSINESS_FALLBACK||'Profile 19'
    : process.env.BLACK_CLOVER_CHROME_DEFAULT_FALLBACK||'Profile 1';
  return profiles.some(item=>item.directory===fallback)?fallback:profiles[0].directory;
}

export async function resolveDefaultChromeProfile(alias){
  return resolveChromeProfile(alias,'default');
}

export async function resolveBusinessChromeProfile(alias){
  return resolveChromeProfile(alias,'business');
}

export function profileDisplayLabel(kind='default'){
  return kind==='business'?'شرکت':'Amir Mohamed';
}
