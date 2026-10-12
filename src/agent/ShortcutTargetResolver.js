import fs from 'node:fs/promises';
import path from 'node:path';

const mediaVideo=new Set(['.mp4','.mkv','.mov','.avi','.webm','.wmv']);
const mediaAudio=new Set(['.mp3','.wav','.flac','.aac','.ogg','.m4a']);
const validProtocol=/^https?:\/\//i;
const protocol=/^[a-z][a-z0-9+.-]*:/i;

export function shortcutIdentity(value=''){
  const target=String(value||'').trim();
  if(validProtocol.test(target)){
    try{const url=new URL(target);if(!url.hostname)throw Error();return url.toString();}
    catch{throw new Error('آدرس سایت معتبر نیست.');}
  }
  if(protocol.test(target)&&!/^[a-z]:[\\/]/i.test(target))throw new Error('فقط لینک‌های امن HTTP و HTTPS مجاز هستند.');
  return path.normalize(target).toLowerCase();
}

export async function resolveShortcutTarget(value,{stat=fs.stat,readLink=null}={}){
  const target=String(value||'').trim();
  if(!target)throw new Error('ابتدا فایل، پوشه، برنامه یا لینک را انتخاب کن.');
  if(validProtocol.test(target)){
    const href=shortcutIdentity(target);
    const url=new URL(href);
    return {target:href,kind:'url',label:url.hostname,icon:'🌐',health:'ok'};
  }
  shortcutIdentity(target);
  let info;
  try{info=await stat(target);}catch{throw new Error('این مسیر پیدا نشد. فایل اصلی را دوباره انتخاب کن.');}
  const ext=path.extname(target).toLowerCase();
  const file=typeof info.isFile==='function'&&info.isFile();
  const folder=typeof info.isDirectory==='function'&&info.isDirectory();
  if(!file&&!folder)throw new Error('نوع هدف پشتیبانی نمی‌شود.');
  let kind=folder?'folder':'file';
  if(file&&['.exe','.com','.bat','.cmd','.msi','.lnk'].includes(ext))kind='app';
  else if(file&&(mediaVideo.has(ext)||mediaAudio.has(ext)))kind='media';
  if(ext==='.lnk'&&readLink){
    try{
      const destination=await readLink(target);
      if(destination?.target){
        const linked=await stat(destination.target).catch(()=>null);
        if(linked?.isDirectory?.())kind='folder';
        else if(linked?.isFile?.()&&!['.exe','.com','.bat','.cmd','.msi'].includes(path.extname(destination.target).toLowerCase()))kind='file';
      }
    }catch{/* The .lnk itself remains the launch target. */}
  }
  const icon=kind==='folder'?'📁':kind==='app'?'⚙️':kind==='media'?'🎵':'📄';
  return {target,kind,label:path.basename(target,ext)||path.basename(target),icon,health:'ok'};
}
