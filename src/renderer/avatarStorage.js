import { isRemovedAvatarRecord } from '../main/RemovedAvatars.js';
const DB_NAME='black-clover-avatar';
const STORE='models';
const KEY='current';
const MAX_BYTES=120*1024*1024;

function openDb(){
  return new Promise((resolve,reject)=>{
    const req=indexedDB.open(DB_NAME,1);
    req.onupgradeneeded=()=>{const db=req.result;if(!db.objectStoreNames.contains(STORE))db.createObjectStore(STORE);};
    req.onsuccess=()=>resolve(req.result);
    req.onerror=()=>reject(req.error||new Error('Avatar database failed to open'));
  });
}

async function withStore(mode,fn){
  const db=await openDb();
  try{return await new Promise((resolve,reject)=>{const tx=db.transaction(STORE,mode),store=tx.objectStore(STORE);let out;try{out=fn(store);}catch(e){reject(e);return;}tx.oncomplete=()=>resolve(out);tx.onerror=()=>reject(tx.error||new Error('Avatar database transaction failed'));tx.onabort=()=>reject(tx.error||new Error('Avatar database transaction aborted'));});}finally{db.close();}
}

export function validateAvatarFile(file){
  if(!file)throw new Error('فایل انتخاب نشده.');
  const name=String(file.name||'').toLowerCase();
  if(!name.endsWith('.vrm'))throw new Error('فقط فایل VRM قابل انتخاب است.');
  if(!file.size||file.size<1024)throw new Error('فایل VRM معتبر نیست.');
  if(file.size>MAX_BYTES)throw new Error('حجم مدل بیش از حد بزرگ است.');
  return true;
}

export async function saveCurrentAvatar(file){
  validateAvatarFile(file);
  const bytes=await file.arrayBuffer();
  const record={kind:'file',name:file.name,size:file.size,type:file.type||'model/gltf-binary',updatedAt:Date.now(),bytes};
  if(isRemovedAvatarRecord(record))throw new Error('این کاراکتر به درخواست شما حذف شده است.');
  await withStore('readwrite',store=>store.put(record,KEY));
  return {name:record.name,size:record.size,updatedAt:record.updatedAt};
}

export async function saveCurrentAvatarUrl(url,name='Built-in Character'){
  const raw=String(url||'').trim();if(!/^\/models\/[A-Za-z0-9._%()+ -]+\.vrm(?:[?#].*)?$/i.test(raw))throw new Error('Built-in avatar URL must be a local model.');
  const record={kind:'url',name:String(name||'Built-in Character'),url:raw,updatedAt:Date.now()};
  if(isRemovedAvatarRecord(record))throw new Error('این کاراکتر به درخواست شما حذف شده است.');
  await withStore('readwrite',store=>store.put(record,KEY));
  return {name:record.name,url:record.url,updatedAt:record.updatedAt};
}

export async function getCurrentAvatar(){
  const db=await openDb();
  try{return await new Promise((resolve,reject)=>{const tx=db.transaction(STORE,'readwrite'),store=tx.objectStore(STORE),req=store.get(KEY);let record=null;req.onsuccess=()=>{record=req.result||null;if(isRemovedAvatarRecord(record)){store.delete(KEY);record=null;}};tx.oncomplete=()=>resolve(record);tx.onerror=()=>reject(tx.error||new Error('Avatar could not be read'));tx.onabort=()=>reject(tx.error||new Error('Avatar read aborted'));});}finally{db.close();}
}

export async function clearCurrentAvatar(){await withStore('readwrite',store=>store.delete(KEY));}

export async function getCurrentAvatarUrl(){
  const record=await getCurrentAvatar();
  if(record?.url)return {url:record.url,info:{name:record.name,updatedAt:record.updatedAt,kind:'url'},revoke:()=>{}};
  if(!record?.bytes)return {url:null,info:null,revoke:()=>{}};
  const blob=new Blob([record.bytes],{type:record.type||'model/gltf-binary'}),url=URL.createObjectURL(blob);
  return {url,info:{name:record.name,size:record.size,updatedAt:record.updatedAt,kind:'file'},revoke:()=>URL.revokeObjectURL(url)};
}
