import fs from 'node:fs/promises';
import path from 'node:path';
import os from 'node:os';
import { execFile } from 'node:child_process';
import { promisify } from 'node:util';
const execFileAsync=promisify(execFile);

const destructiveTools=new Set([
  'delete_path','uninstall_app','shutdown_pc','restart_pc','sleep_pc','sign_out',
  'forget_memory','clear_memories','unprotect_resource','empty_recycle_bin','clean_user_temp_files','renew_network_lease','stop_service','restart_service','run_sfc_scan','run_dism_restore_health','hibernate_pc'
]);
const persistentWriteTools=new Set(['install_app','excel_set_cells','excel_append_rows','excel_add_image','zip_files','extract_archive']);
const destructiveWords=/(حذف|پاک|فرمت|فرمتش|آن.?اینستال|uninstall|remove|delete|wipe|shutdown|خاموش|ری.?استارت|restart|sleep|sign.?out)/i;
const protectPattern=/(?:هیچ.?وقت|هرگز)\s+(.+?)\s+(?:رو|را)?\s*(?:حذف|پاک|آن.?اینستال|remove|delete)\s*(?:نکن|نکنید)/i;
const unprotectPattern=/(?:دیگه|حالا)?\s*(.+?)\s+(?:رو|را)?\s*(?:از محافظت دربیار|محافظتش رو بردار|می.?تونی حذف کنی|اجازه حذف داری)/i;
const saveWords=/(^|\b|\s)(save|save as|ذخیره|ذخیره کن|سیو|سیو کن)(\b|\s|$)/i;
const installerFile=/\.(exe|msi|msix|appx|appxbundle|msixbundle)(?:\s|$)/i;
const defaultDir=()=>process.env.BLACK_CLOVER_DATA_DIR||path.join(process.env.APPDATA||path.join(os.homedir(),'.black-clover'),'BlackClover');
const norm=v=>String(v??'').trim().toLowerCase().replace(/[\s\\/]+/g,' ');

async function foregroundProcess(){
  if(process.platform!=='win32')return '';
  const script=`Add-Type -TypeDefinition @'\nusing System;using System.Runtime.InteropServices;public static class FG{[DllImport("user32.dll")]public static extern IntPtr GetForegroundWindow();[DllImport("user32.dll")]public static extern uint GetWindowThreadProcessId(IntPtr hWnd,out uint pid);}\n'@;$h=[FG]::GetForegroundWindow();[uint32]$p=0;[FG]::GetWindowThreadProcessId($h,[ref]$p)|Out-Null;if($p){(Get-Process -Id $p -ErrorAction SilentlyContinue).ProcessName}`;
  try{const {stdout}=await execFileAsync('powershell.exe',['-NoProfile','-NonInteractive','-Command',script],{windowsHide:true,timeout:10000,maxBuffer:100000});return stdout.trim();}catch{return '';}
}

export class PermissionPolicy{
  constructor({directory=defaultDir()}={}){this.directory=directory;this.file=path.join(directory,'permissions.json');this.loaded=false;this.state={version:1,profile:'autonomous',protectedResources:[],updatedAt:null};}
  async load(){if(this.loaded)return this.state;this.loaded=true;try{const raw=JSON.parse(await fs.readFile(this.file,'utf8'));this.state={...this.state,...raw,protectedResources:Array.isArray(raw?.protectedResources)?raw.protectedResources:[]};}catch(e){if(e.code!=='ENOENT')console.warn('Permission policy load failed:',e.message);}return this.state;}
  async save(){await fs.mkdir(this.directory,{recursive:true});this.state.updatedAt=new Date().toISOString();const tmp=`${this.file}.tmp`;await fs.writeFile(tmp,JSON.stringify(this.state,null,2),'utf8');await fs.rename(tmp,this.file);return this.state;}
  async setProfile(profile){await this.load();if(!['autonomous','balanced','cautious'].includes(profile))throw new Error('Unknown permission profile');this.state.profile=profile;await this.save();return profile;}
  async protect(resource,{note='user rule'}={}){await this.load();const text=String(resource||'').trim();if(!text)return null;const key=norm(text);const existing=this.state.protectedResources.find(x=>x.key===key);if(existing){existing.note=note;existing.updatedAt=new Date().toISOString();await this.save();return existing;}const item={key,label:text,note,createdAt:new Date().toISOString(),updatedAt:new Date().toISOString()};this.state.protectedResources.push(item);await this.save();return item;}
  async unprotect(resource){await this.load();const key=norm(resource);const before=this.state.protectedResources.length;this.state.protectedResources=this.state.protectedResources.filter(x=>x.key!==key&&norm(x.label)!==key);if(this.state.protectedResources.length!==before)await this.save();return this.state.protectedResources.length!==before;}
  async parseUserRule(text){await this.load();const s=String(text||'').trim();const p=s.match(protectPattern);if(p?.[1])return {type:'protected',item:await this.protect(p[1],{note:'natural-language never-delete rule'})};const u=s.match(unprotectPattern);if(u?.[1]&&destructiveWords.test(s))return {type:'unprotected',resource:u[1],changed:await this.unprotect(u[1])};return null;}
  _argsText(args={}){return norm(Object.values(args).filter(v=>['string','number'].includes(typeof v)).join(' '));}
  async protectedMatch(name,args={}){await this.load();if(!destructiveTools.has(name)&&!/(delete|uninstall|remove)/i.test(name))return null;const hay=this._argsText(args);if(!hay)return null;return this.state.protectedResources.find(x=>hay.includes(x.key)||x.key.includes(hay))||null;}
  async isProtectedDocumentSave(name,args={}){
    // Foreground-process inspection is relatively expensive on Windows. Only
    // do it for the two UI actions that can actually trigger a document save.
    if(name!=='press_key'&&name!=='invoke_ui_element')return false;
    const candidate=name==='press_key'?/^(CTRL\+S|CTRL\+SHIFT\+S)$/i.test(String(args?.key||'')):saveWords.test(this._argsText(args));
    if(!candidate)return false;
    const app=await foregroundProcess();if(!/(photoshop|illustrator|excel)/i.test(app))return false;
    return true;
  }
  isInstallerExecution(name,args={}){return ['open_file','open_named_file'].includes(name)&&installerFile.test(this._argsText(args));}
  async assertAllowed(name,args={}){const match=await this.protectedMatch(name,args);if(match)throw new Error(`این مورد با قانون دائمی شما محافظت شده و حذف/پاک نمی‌شود: ${match.label}`);return true;}
  async shouldConfirm(name,tool,args={}){
    await this.load();
    if(await this.protectedMatch(name,args))return true;
    if(destructiveTools.has(name)||persistentWriteTools.has(name))return true;
    if(this.isInstallerExecution(name,args))return true;
    if(await this.isProtectedDocumentSave(name,args))return true;
    if(this.state.profile==='cautious')return tool?.risk==='sensitive';
    if(this.state.profile==='balanced')return tool?.risk==='sensitive'&&/(install|upgrade|write|move|copy|type|click)/i.test(name);
    return false;
  }
  async status(){await this.load();return {profile:this.state.profile,protectedResources:this.state.protectedResources.map(x=>({label:x.label,note:x.note})),destructiveTools:[...destructiveTools],alwaysConfirm:[...persistentWriteTools,'opening downloaded installer files (.exe/.msi/.msix/.appx)','CTRL+S / CTRL+SHIFT+S / Save/Save As in Photoshop/Illustrator/Excel']};}
}

export const permissions=new PermissionPolicy();
export const isDestructiveTool=name=>destructiveTools.has(name);
