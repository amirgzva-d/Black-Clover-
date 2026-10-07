import fs from 'node:fs/promises';
import path from 'node:path';
import os from 'node:os';
import { spawn } from 'node:child_process';
import { isRemovedAvatar } from './RemovedAvatars.js';

const IGNORE=new Set(['_asset_audit.json','_audit_assets.py']);
const BLOCKED=new Set(['大星蒼-sirius-.zip']);

function categoryFor(name=''){
  const n=String(name).toLowerCase();
  if(n.endsWith('.vrm')||/alien_girl|model_moso/.test(n))return 'avatar';
  if(/vrma_motionpack/.test(n)||n.endsWith('.vrma'))return 'motion';
  if(/faceanimation|shapekey/.test(n))return 'expression';
  if(/pose|purupuru|sexy_pose|sample\.zip/.test(n))return 'animation';
  if(/evilfallarmar|wolfchan|sea_themed|cookies/.test(n))return 'wardrobe';
  if(/matcap|ps_filer/.test(n))return 'material';
  if(/preview/.test(n))return 'preview';
  if(/vn3/.test(n))return 'docs';
  if(/sirius/.test(n))return 'blocked';
  return 'other';
}
function directFor(name=''){
  const n=String(name).toLowerCase();
  if(n.endsWith('.vrm'))return 'avatar';
  if(n.endsWith('.vrma')||/vrma_motionpack\.zip$/.test(n))return 'motion';
  return null;
}
function noteFor(name,category){
  if(BLOCKED.has(name))return 'طبق Readme این بسته، استفاده خارج از نرم‌افزارهای UTAU و استفاده برای AI مجاز نیست؛ فقط فهرست می‌شود.';
  if(category==='avatar')return 'مدل شخصیت VRM؛ فایل .vrm مستقیم قابل استفاده است.';
  if(category==='motion')return 'حرکت VRMA؛ MotionPack مستقیماً قابل Import است.';
  if(category==='animation')return 'Pose/Animation یونیتی؛ برای Three-VRM نیاز به Retarget/Conversion دارد.';
  if(category==='expression')return 'Face/Blendshape pack؛ برای مدل سازگار نیاز به Mapping/Conversion دارد.';
  if(category==='wardrobe')return 'لباس/Armor/Accessory؛ بعضی فرمت‌ها مثل XWear/Unity نیاز به تبدیل دارند.';
  if(category==='material')return 'Material/MatCap/Design source برای ظاهر و Customization.';
  if(category==='preview')return 'تصاویر Preview برای انتخاب Pose/Animation.';
  if(category==='docs')return 'مجوز/متادیتا؛ همراه Assetها نگه‌داری می‌شود.';
  return 'Asset محلی.';
}
async function exists(p){try{return (await fs.stat(p)).isDirectory();}catch{return false;}}
async function vrmMeta(p){
  try{
    const fd=await fs.open(p,'r');
    const h=Buffer.alloc(20);await fd.read(h,0,20,0);
    if(h.subarray(0,4).toString('ascii')!=='glTF'){await fd.close();return null;}
    const len=h.readUInt32LE(12),b=Buffer.alloc(len);await fd.read(b,0,len,20);await fd.close();
    const json=JSON.parse(b.toString('utf8').replace(/\0+$/,'').trim()),ext=json.extensions||{},m=ext.VRM?.meta||ext.VRMC_vrm?.meta||{};
    return {title:m.title||m.name||'',author:m.author||(Array.isArray(m.authors)?m.authors.join(', '):''),license:m.licenseName||m.licenseUrl||'',commercial:m.commercialUssageName||m.commercialUsage||''};
  }catch{return null;}
}

export class LocalAssetLibrary{
  constructor(getDesktopPath){this.getDesktopPath=getDesktopPath;this.cachedRoot=null;}
  candidateDesktops(){
    const out=[this.getDesktopPath?.(),path.join(os.homedir(),'Desktop')];
    for(const key of ['OneDrive','OneDriveConsumer','OneDriveCommercial'])if(process.env[key])out.push(path.join(process.env[key],'Desktop'));
    out.push(path.join(os.homedir(),'OneDrive','Desktop'));
    return [...new Set(out.filter(Boolean))];
  }
  async root(){
    if(this.cachedRoot&&await exists(this.cachedRoot))return this.cachedRoot;
    for(const desktop of this.candidateDesktops()){
      if(!await exists(desktop))continue;
      let entries=[];try{entries=await fs.readdir(desktop,{withFileTypes:true});}catch{continue;}
      const hit=entries.find(x=>x.isDirectory()&&/^21\s/.test(x.name));
      if(hit){this.cachedRoot=path.join(desktop,hit.name);return this.cachedRoot;}
    }
    return null;
  }
  async list(){
    const root=await this.root();if(!root)return {root:null,items:[]};
    const names=await fs.readdir(root,{withFileTypes:true}),items=[];
    for(const e of names){
      if(!e.isFile()||IGNORE.has(e.name))continue;
      const p=path.join(root,e.name),s=await fs.stat(p),category=categoryFor(e.name),direct=directFor(e.name);
      const meta=direct==='avatar'?await vrmMeta(p):null;
      if(isRemovedAvatar({name:e.name,meta}))continue;
      items.push({name:e.name,size:s.size,category,direct,blocked:BLOCKED.has(e.name),note:noteFor(e.name,category),meta});
    }
    const order={avatar:1,motion:2,animation:3,expression:4,wardrobe:5,material:6,preview:7,docs:8,blocked:9,other:10};
    items.sort((a,b)=>(order[a.category]||99)-(order[b.category]||99)||a.name.localeCompare(b.name));
    return {root,items};
  }
  async read(name){
    const root=await this.root();if(!root)throw new Error('پوشه Asset پیدا نشد.');
    const safe=path.basename(String(name||''));if(!safe||safe!==name)throw new Error('نام Asset نامعتبر است.');
    if(BLOCKED.has(safe))throw new Error('این Asset طبق مجوز خودش برای Maria/AI قابل استفاده نیست.');
    const p=path.join(root,safe);
    if(isRemovedAvatar({name:safe,meta:/\.vrm$/i.test(safe)?await vrmMeta(p):null}))throw new Error('این کاراکتر به درخواست شما حذف شده است.');
    const buf=await fs.readFile(p);
    return {name:safe,bytes:buf.buffer.slice(buf.byteOffset,buf.byteOffset+buf.byteLength),size:buf.length};
  }
  async openFolder(){
    const root=await this.root();if(!root)throw new Error('پوشه Asset پیدا نشد.');
    spawn('explorer.exe',[root],{detached:true,windowsHide:true});return {ok:true,root};
  }
}
