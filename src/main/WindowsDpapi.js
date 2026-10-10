import {execFileSync} from 'node:child_process';

const PREFIX='MARIADPAPI1:';
const psProtect=`
$ErrorActionPreference='Stop'
Add-Type -AssemblyName System.Security
$text=[Console]::In.ReadToEnd()
$data=[Text.Encoding]::UTF8.GetBytes($text)
$entropy=[Text.Encoding]::UTF8.GetBytes('MARIA Black Clover persistent identity v1')
$out=[Security.Cryptography.ProtectedData]::Protect($data,$entropy,[Security.Cryptography.DataProtectionScope]::CurrentUser)
[Console]::Out.Write([Convert]::ToBase64String($out))
`;
const psUnprotect=`
$ErrorActionPreference='Stop'
Add-Type -AssemblyName System.Security
$raw=[Console]::In.ReadToEnd().Trim()
$data=[Convert]::FromBase64String($raw)
$entropy=[Text.Encoding]::UTF8.GetBytes('MARIA Black Clover persistent identity v1')
$out=[Security.Cryptography.ProtectedData]::Unprotect($data,$entropy,[Security.Cryptography.DataProtectionScope]::CurrentUser)
[Console]::Out.Write([Text.Encoding]::UTF8.GetString($out))
`;
const run=(script,input)=>execFileSync('powershell.exe',['-NoProfile','-NonInteractive','-Command',script],{input:String(input??''),encoding:'utf8',windowsHide:true,timeout:8000,maxBuffer:2000000}).trim();

export function dpapiAvailable(){return process.platform==='win32';}
export function protectString(value){
  if(!dpapiAvailable())throw new Error('Windows DPAPI is unavailable.');
  return PREFIX+run(psProtect,String(value??''));
}
export function unprotectString(value){
  const raw=String(value??'');if(!raw.startsWith(PREFIX))return null;
  return run(psUnprotect,raw.slice(PREFIX.length));
}
export function protectBuffer(value){return Buffer.from(protectString(value),'utf8');}
export function unprotectBuffer(value){
  const raw=Buffer.from(value||[]).toString('utf8');
  return unprotectString(raw);
}
export function isDpapiValue(value){return String(value??'').startsWith(PREFIX);}
