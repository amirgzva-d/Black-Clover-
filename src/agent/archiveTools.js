// Safe ZIP skill for MARIA. No source files are moved or removed.
// Archive extraction refuses path traversal, symlinks and pre-existing targets.
import fs from 'node:fs/promises';
import path from 'node:path';
import JSZip from 'jszip';

const MB=1024*1024,MAX_ENTRIES=3500,MAX_TOTAL=512*MB;
const result=(name,success,message,data=null)=>({tool_name:name,success,message,data});
const schema=(properties,required)=>({type:'object',properties,required});
const tool=(risk,description,schema,run)=>({risk,description,schema,run});
const positivePath=p=>{
  const s=String(p??'').trim();
  if(!s||!path.isAbsolute(s))throw Error('یک مسیر کامل و مشخص برای فایل لازم است.');
  return path.normalize(s);
};
async function withoutCollision(target){
  try{await fs.access(target);throw Error('مقصد از قبل وجود دارد؛ فایل موجود را بازنویسی نمی‌کنم.');}
  catch(e){if(e.code!=='ENOENT')throw e;}
}
async function collect(folder,root,zip,limits){
  const entries=await fs.readdir(folder,{withFileTypes:true});
  for(const entry of entries){
    const target=path.join(folder,entry.name);
    const info=await fs.lstat(target);
    if(info.isSymbolicLink())throw Error('پیوندهای نمادین داخل پوشه قابل فشرده‌سازی خودکار نیستند.');
    if(info.isDirectory()){await collect(target,root,zip,limits);continue;}
    if(!info.isFile())continue;
    if(++limits.count>MAX_ENTRIES)throw Error('تعداد فایل‌های آرشیو از حد مجاز بیشتر است.');
    if((limits.total+=info.size)>MAX_TOTAL)throw Error('حجم آرشیو از حد ایمن بیشتر است.');
    const relative=path.relative(root,target).split(path.sep).join('/');
    zip.file(relative,await fs.readFile(target),{date:info.mtime,createFolders:false});
  }
}
async function zipFiles({source,output}={}){
  const input=positivePath(source),info=await fs.stat(input),name=path.parse(input);
  const dest=positivePath(output||path.join(name.dir,name.name+'.zip'));
  if(dest===input)throw Error('فایل خروجی نمی‌تواند همان فایل اصلی باشد.');
  await withoutCollision(dest);
  const archive=new JSZip(),limits={count:0,total:0};
  if(info.isDirectory())await collect(input,input,archive,limits);
  else if(info.isFile()){
    if(info.size>MAX_TOTAL)throw Error('حجم فایل از حد ایمن بیشتر است.');
    limits.count=1;limits.total=info.size;
    archive.file(name.base,await fs.readFile(input));
  }else throw Error('ورودی، فایل یا پوشهٔ معتبر نیست.');
  const buffer=await archive.generateAsync({type:'nodebuffer',compression:'DEFLATE',compressionOptions:{level:5}});
  const handle=await fs.open(dest,'wx');
  try{await handle.writeFile(buffer);}
  catch(error){await handle.close();await fs.rm(dest,{force:true});throw error;}
  await handle.close();
  return result('zip_files',true,'فایل ZIP ساخته شد؛ اصل فایل‌ها تغییری نکردند.',{source:input,output:dest,files:limits.count,bytes:buffer.length});
}
async function extractArchive({archive,destination}={}){
  const source=positivePath(archive);
  if(path.extname(source).toLowerCase()!=='.zip')throw Error('فعلاً فقط فایل ZIP پشتیبانی می‌شود.');
  const info=await fs.stat(source);
  if(info.size>MAX_TOTAL)throw Error('فایل ZIP بزرگ‌تر از حد مجاز است.');
  const zip=await JSZip.loadAsync(await fs.readFile(source),{checkCRC32:true});
  const entries=Object.values(zip.files);
  if(entries.length>MAX_ENTRIES)throw Error('تعداد فایل‌های داخل ZIP زیاد است.');
  const root=positivePath(destination||path.join(path.dirname(source),path.basename(source,'.zip')+' extracted'));
  await withoutCollision(root);
  // Validate ALL entries before writing anything.
  const validated=[];
  let estimated=0;
  for(const item of entries){
    const name=String(item.name||'').replace(/\\/g,'/');
    const unsafeName=String(item.unsafeOriginalName||name).replace(/\\/g,'/');
    if(!name||name.startsWith('/')||/^(?:[a-z]:|\\\\)/i.test(name)||/(?:^|\/)\.\.(?:\/|$)/.test(unsafeName))throw Error('نام مسیر داخل ZIP غیرمجاز است.');
    const resolved=path.resolve(root,...name.split('/'));
    if(resolved!==root&&!resolved.startsWith(root+path.sep))throw Error('ZIP دارای مسیر خروج از پوشهٔ مقصد است.');
    if(item.unixPermissions&&((Number(item.unixPermissions)&0o170000)===0o120000))throw Error('پیوند نمادین داخل ZIP مجاز نیست.');
    const uncompressed=Number(item._data?.uncompressedSize)||0;
    if((estimated+=uncompressed)>MAX_TOTAL)throw Error('حجم استخراج بیش از حد ایمن است.');
    validated.push({item,target:resolved});
  }
  await fs.mkdir(root,{recursive:false});
  try{
    let extractedBytes=0;
    for(const {item,target} of validated){
      if(item.dir){await fs.mkdir(target,{recursive:true});continue;}
      await fs.mkdir(path.dirname(target),{recursive:true});
      const payload=await item.async('nodebuffer');
      if((extractedBytes+=payload.length)>MAX_TOTAL)throw Error('حجم استخراج بیش از حد ایمن است.');
      const handle=await fs.open(target,'wx');
      try{await handle.writeFile(payload);}finally{await handle.close();}
    }
  }catch(error){await fs.rm(root,{recursive:true,force:true});throw error;}
  return result('extract_archive',true,'فایل ZIP در پوشهٔ جدید استخراج شد؛ اصل آرشیو حفظ شد.',{source,destination:root,files:validated.filter(x=>!x.item.dir).length});
}
export const archiveTools={
  zip_files:tool('sensitive','Create ZIP from a selected file or directory. Preserve the original items and never overwrite an output.',schema({source:{type:'string'},output:{type:'string'}},['source']),async args=>{
    try{return await zipFiles(args);}catch(e){return result('zip_files',false,String(e?.message||e));}
  }),
  extract_archive:tool('sensitive','Safely extract ZIP into a new folder; defend against path traversal and existing files.',schema({archive:{type:'string'},destination:{type:'string'}},['archive']),async args=>{
    try{return await extractArchive(args);}catch(e){return result('extract_archive',false,String(e?.message||e));}
  })
};
