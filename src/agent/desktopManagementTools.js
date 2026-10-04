import fs from 'node:fs/promises';
import path from 'node:path';
import { execFile } from 'node:child_process';
import { promisify } from 'node:util';
const execFileAsync=promisify(execFile);
const result=(name,success,message,data=null)=>({tool_name:name,success,message,data});
const tool=(risk,description,schema,run)=>({risk,description,schema,run});
const quote=s=>String(s??'').replaceAll("'","''");
async function ps(script,timeout=45000){const {stdout}=await execFileAsync('powershell.exe',['-NoProfile','-NonInteractive','-Command',script],{windowsHide:true,timeout,maxBuffer:6_000_000});return stdout.trim();}
async function desktopDir(){const d=await ps("[Environment]::GetFolderPath('Desktop')");if(!d)throw new Error('Windows Desktop path unavailable');return d;}
const buckets={
  Images:new Set(['.png','.jpg','.jpeg','.gif','.webp','.bmp','.tif','.tiff','.svg','.heic']),
  Videos:new Set(['.mp4','.mkv','.mov','.avi','.webm','.wmv','.m4v']),
  Audio:new Set(['.mp3','.wav','.flac','.m4a','.aac','.ogg','.wma']),
  Documents:new Set(['.pdf','.doc','.docx','.txt','.rtf','.odt','.ppt','.pptx','.csv','.xlsx','.xlsm','.xls']),
  Archives:new Set(['.zip','.rar','.7z','.tar','.gz','.bz2']),
  Installers:new Set(['.exe','.msi','.msix','.appx']),
  Code:new Set(['.js','.mjs','.cjs','.ts','.tsx','.jsx','.py','.java','.cs','.cpp','.c','.h','.html','.css','.json','.yaml','.yml','.md','.sql'])
};
function bucketFor(file){const e=path.extname(file).toLowerCase();for(const [name,set] of Object.entries(buckets))if(set.has(e))return name;return 'Other';}
async function uniqueDest(dir,name){const parsed=path.parse(name);let p=path.join(dir,name),n=2;while(true){try{await fs.access(p);p=path.join(dir,`${parsed.name} (${n++})${parsed.ext}`);}catch{return p;}}}

export const desktopManagementTools={
  set_wallpaper:tool('low','Set the Windows desktop wallpaper to a local image file. This is reversible and does not delete the source image.',{type:'object',properties:{image:{type:'string'}},required:['image']},async({image})=>{const p=path.resolve(image);await fs.access(p);if(!/\.(png|jpe?g|bmp|webp)$/i.test(p))throw new Error('Wallpaper must be a common image file');await ps(`$p='${quote(p)}';Set-ItemProperty -Path 'HKCU:\\Control Panel\\Desktop' -Name Wallpaper -Value $p;Add-Type -TypeDefinition @'\nusing System;using System.Runtime.InteropServices;public static class W{[DllImport("user32.dll",SetLastError=true)]public static extern bool SystemParametersInfo(int a,int b,string c,int d);}\n'@;[W]::SystemParametersInfo(20,0,$p,3)|Out-Null`);return result('set_wallpaper',true,'Desktop wallpaper changed',{image:p});}),
  organize_desktop:tool('sensitive','Organize ordinary files on the Windows Desktop into type folders. Keeps folders, shortcuts (.lnk/.url), and system/hidden files in place; never deletes anything.',{type:'object',properties:{mode:{type:'string',enum:['by-type']}},required:[]},async()=>{const desktop=await desktopDir(),entries=await fs.readdir(desktop,{withFileTypes:true}),moved=[];for(const entry of entries){if(!entry.isFile()||/\.(lnk|url)$/i.test(entry.name)||entry.name.startsWith('.'))continue;const from=path.join(desktop,entry.name),folder=path.join(desktop,bucketFor(entry.name));await fs.mkdir(folder,{recursive:true});const to=await uniqueDest(folder,entry.name);await fs.rename(from,to);moved.push({from,to});}return result('organize_desktop',true,`Desktop organized; ${moved.length} file(s) moved`,{desktop,moved});})
};
