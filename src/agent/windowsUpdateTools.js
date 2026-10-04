import { execFile } from 'node:child_process';
import { promisify } from 'node:util';
const execFileAsync=promisify(execFile);
const result=(name,success,message,data=null)=>({tool_name:name,success,message,data});
const tool=(risk,description,schema,run)=>({risk,description,schema,run});
const empty={type:'object',properties:{},required:[]};
async function ps(script,timeout=180000){const {stdout}=await execFileAsync('powershell.exe',['-NoProfile','-NonInteractive','-Command',script],{windowsHide:true,timeout,maxBuffer:8_000_000});return stdout.trim();}
const parse=raw=>{if(!raw)return[];const x=JSON.parse(raw);return Array.isArray(x)?x:[x];};
export const windowsUpdateTools={
  windows_update_scan:tool('read','Scan Windows Update Agent for currently applicable software updates without installing them. Use before opening Settings so Maria knows what is pending.',empty,async()=>{try{const raw=await ps(`$ErrorActionPreference='Stop';$s=New-Object -ComObject Microsoft.Update.Session;$s.ClientApplicationID='Black Clover Maria';$q=$s.CreateUpdateSearcher();$r=$q.Search("IsInstalled=0 and Type='Software'");$out=@();for($i=0;$i -lt $r.Updates.Count;$i++){$u=$r.Updates.Item($i);$out+=[pscustomobject]@{title=$u.Title;kb=($u.KBArticleIDs -join ',');downloaded=$u.IsDownloaded;mandatory=$u.IsMandatory;rebootBehavior=[string]$u.InstallationBehavior.RebootBehavior}};$out|ConvertTo-Json -Depth 4 -Compress`);const updates=parse(raw);return result('windows_update_scan',true,`${updates.length} pending update(s) found`,{updates,count:updates.length});}catch(e){return result('windows_update_scan',false,`Windows Update scan failed: ${e.message}`);}}),
  windows_update_history:tool('read','Read recent Windows Update Agent history for troubleshooting update failures',empty,async()=>{try{const raw=await ps(`$ErrorActionPreference='Stop';$s=New-Object -ComObject Microsoft.Update.Session;$q=$s.CreateUpdateSearcher();$count=[Math]::Min(30,$q.GetTotalHistoryCount());if($count -le 0){'[]'}else{$q.QueryHistory(0,$count)|Select-Object Title,Date,ResultCode,HResult,Operation|ConvertTo-Json -Depth 3 -Compress}`);return result('windows_update_history',true,'Windows Update history loaded',{items:parse(raw)});}catch(e){return result('windows_update_history',false,`Windows Update history failed: ${e.message}`);}})
};
