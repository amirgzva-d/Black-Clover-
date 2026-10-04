import path from 'node:path';
import { execFile } from 'node:child_process';
import { promisify } from 'node:util';
const execFileAsync=promisify(execFile);
const result=(name,success,message,data=null)=>({tool_name:name,success,message,data});
const tool=(risk,description,schema,run)=>({risk,description,schema,run});
const schema=(properties,required=[])=>({type:'object',properties,required});
const q=s=>String(s??'').replaceAll("'","''");
async function ps(script,timeout=60000){const {stdout}=await execFileAsync('powershell.exe',['-NoProfile','-NonInteractive','-Command',script],{windowsHide:true,timeout,maxBuffer:4_000_000});return stdout.trim();}
async function available(progId){try{return (await ps(`try{$a=New-Object -ComObject '${q(progId)}';[Runtime.InteropServices.Marshal]::ReleaseComObject($a)|Out-Null;'true'}catch{'false'}`))==='true';}catch{return false;}}
async function openCom(progId,file){const p=path.resolve(file);const raw=await ps(`$ErrorActionPreference='Stop';$a=New-Object -ComObject '${q(progId)}';try{$a.Visible=$true}catch{};$d=$a.Open('${q(p)}');[pscustomobject]@{path='${q(p)}';app='${q(progId)}';opened=$true}|ConvertTo-Json -Compress`,90000);return JSON.parse(raw);}
export const adobeTools={
  adobe_status:tool('read','Check whether Photoshop and Illustrator COM automation endpoints are available on this Windows installation',schema({}),async()=>result('adobe_status',true,'Adobe automation status checked',{photoshop:await available('Photoshop.Application'),illustrator:await available('Illustrator.Application')})),
  photoshop_open_document:tool('low','Open a local document directly in Adobe Photoshop through its Windows COM automation endpoint when available. Use UI/Vision for edits after opening.',schema({file:{type:'string'}},['file']),async({file})=>{try{return result('photoshop_open_document',true,'Document opened in Photoshop',await openCom('Photoshop.Application',file));}catch(e){return result('photoshop_open_document',false,`Photoshop COM open failed: ${e.message}`,{file:path.resolve(file)});}}),
  illustrator_open_document:tool('low','Open a local document directly in Adobe Illustrator through its Windows COM automation endpoint when available. Use UI/Vision for edits after opening.',schema({file:{type:'string'}},['file']),async({file})=>{try{return result('illustrator_open_document',true,'Document opened in Illustrator',await openCom('Illustrator.Application',file));}catch(e){return result('illustrator_open_document',false,`Illustrator COM open failed: ${e.message}`,{file:path.resolve(file)});}})
};
