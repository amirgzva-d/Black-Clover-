import fs from 'node:fs/promises';
import path from 'node:path';
import crypto from 'node:crypto';

const NUMERIC=/^(\d+)(?:\.[^.]+)?$/;

async function numericIds(root){
  const ids=new Set();
  for(const entry of await fs.readdir(root,{withFileTypes:true})){
    if(!entry.isFile())continue;
    const m=entry.name.match(NUMERIC);
    if(m)ids.add(Number(m[1]));
  }
  const reservationDir=path.join(root,'.maria-id-reservations');
  try{
    for(const entry of await fs.readdir(reservationDir,{withFileTypes:true})){
      const m=entry.name.match(/^(\d+)\./);
      if(m)ids.add(Number(m[1]));
    }
  }catch(e){if(e.code!=='ENOENT')throw e;}
  return ids;
}

export class AttachmentIdAllocator{
  constructor({maxAttempts=1000}={}){this.maxAttempts=maxAttempts;}
  async inspect(root){
    const ids=await numericIds(root);
    const max=ids.size?Math.max(...ids):0;
    return {count:ids.size,max,next:max+1};
  }
  async reserve(root){
    await fs.access(root);
    const dir=path.join(root,'.maria-id-reservations');
    await fs.mkdir(dir,{recursive:true});
    for(let attempt=0;attempt<this.maxAttempts;attempt++){
      const ids=await numericIds(root);
      const id=(ids.size?Math.max(...ids):0)+1;
      const token=crypto.randomUUID();
      const lockPath=path.join(dir,id+'.'+token+'.lock');
      try{
        const handle=await fs.open(lockPath,'wx');
        await handle.writeFile(JSON.stringify({id,token,createdAt:new Date().toISOString()}),'utf8');
        await handle.close();
        return {id,token,lockPath,root};
      }catch(e){
        if(e.code==='EEXIST')continue;
        throw e;
      }
    }
    throw new Error('Unable to reserve a unique attachment ID');
  }
  async release(reservation){
    if(!reservation?.lockPath)return false;
    try{await fs.unlink(reservation.lockPath);return true;}
    catch(e){if(e.code==='ENOENT')return false;throw e;}
  }
}

export const attachmentIdAllocator=new AttachmentIdAllocator();
