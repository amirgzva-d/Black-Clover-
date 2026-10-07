import { execFile } from 'node:child_process';
import { promisify } from 'node:util';
import fs from 'node:fs/promises';
import path from 'node:path';
import os from 'node:os';
const execFileAsync=promisify(execFile);
const result=(name,success,message,data=null)=>({tool_name:name,success,message,data});
const tool=(risk,description,schema,run)=>({risk,description,schema,run});
const clamp=(v,a,b)=>Math.max(a,Math.min(b,Number(v)));
const dataDir=()=>process.env.BLACK_CLOVER_DATA_DIR||path.join(process.env.APPDATA||path.join(os.homedir(),'.black-clover'),'BlackClover');
const helperDir=()=>path.join(dataDir(),'runtime','audio'),helperExe=()=>path.join(helperDir(),'BlackCloverAudio.exe');
const csc='C:\\Windows\\Microsoft.NET\\Framework64\\v4.0.30319\\csc.exe';
let helperPromise=null;
const source=String.raw`using System;
using System.Runtime.InteropServices;
public class BlackCloverAudio {
 [ComImport, Guid("BCDE0395-E52F-467C-8E3D-C4579291692E")] class MMDeviceEnumeratorComObject {}
 enum EDataFlow { eRender,eCapture,eAll } enum ERole { eConsole,eMultimedia,eCommunications }
 [Guid("A95664D2-9614-4F35-A746-DE8DB63617E6"),InterfaceType(ComInterfaceType.InterfaceIsIUnknown)] interface IMMDeviceEnumerator { int NotImpl1(); [PreserveSig] int GetDefaultAudioEndpoint(EDataFlow flow,ERole role,out IMMDevice device); }
 [Guid("D666063F-1587-4E43-81F1-B948E807363F"),InterfaceType(ComInterfaceType.InterfaceIsIUnknown)] interface IMMDevice { [PreserveSig] int Activate(ref Guid iid,int clsctx,IntPtr p,[MarshalAs(UnmanagedType.IUnknown)] out object o); }
 [Guid("5CDF2C82-841E-4546-9722-0CF74078229A"),InterfaceType(ComInterfaceType.InterfaceIsIUnknown)] interface IAudioEndpointVolume {
  int RegisterControlChangeNotify(IntPtr p);int UnregisterControlChangeNotify(IntPtr p);int GetChannelCount(out uint n);
  int SetMasterVolumeLevel(float db,Guid g);int SetMasterVolumeLevelScalar(float v,Guid g);int GetMasterVolumeLevel(out float db);int GetMasterVolumeLevelScalar(out float v);
  int SetChannelVolumeLevel(uint c,float db,Guid g);int SetChannelVolumeLevelScalar(uint c,float v,Guid g);int GetChannelVolumeLevel(uint c,out float db);int GetChannelVolumeLevelScalar(uint c,out float v);
  int SetMute([MarshalAs(UnmanagedType.Bool)] bool m,Guid g);int GetMute(out bool m);
 }
 static IAudioEndpointVolume Endpoint(){var e=(IMMDeviceEnumerator)new MMDeviceEnumeratorComObject();IMMDevice d;Marshal.ThrowExceptionForHR(e.GetDefaultAudioEndpoint(EDataFlow.eRender,ERole.eMultimedia,out d));Guid iid=typeof(IAudioEndpointVolume).GUID;object o;Marshal.ThrowExceptionForHR(d.Activate(ref iid,23,IntPtr.Zero,out o));return (IAudioEndpointVolume)o;}
 static float Get(){float v;Marshal.ThrowExceptionForHR(Endpoint().GetMasterVolumeLevelScalar(out v));return v;}
 static bool Muted(){bool m;Marshal.ThrowExceptionForHR(Endpoint().GetMute(out m));return m;}
 static void Set(float v){Marshal.ThrowExceptionForHR(Endpoint().SetMasterVolumeLevelScalar(Math.Max(0,Math.Min(1,v)),Guid.Empty));}
 static void Mute(bool m){Marshal.ThrowExceptionForHR(Endpoint().SetMute(m,Guid.Empty));}
 public static int Main(string[] a){try{string cmd=a.Length>0?a[0].ToLowerInvariant():"get";if(cmd=="set"){Set(float.Parse(a[1],System.Globalization.CultureInfo.InvariantCulture)/100f);}else if(cmd=="mute"){Mute(bool.Parse(a[1]));}else if(cmd=="toggle"){Mute(!Muted());}float v=Get();bool m=Muted();Console.Write(Math.Round(v*100)+"|"+(m?"1":"0"));return 0;}catch(Exception ex){Console.Error.Write(ex.Message);return 2;}}
}`;
async function exists(p){try{await fs.access(p);return true;}catch{return false;}}
async function ensureHelper(){
 if(await exists(helperExe()))return helperExe();
 if(helperPromise)return helperPromise;
 helperPromise=(async()=>{await fs.mkdir(helperDir(),{recursive:true});const cs=path.join(helperDir(),'BlackCloverAudio.cs');await fs.writeFile(cs,source,'utf8');if(!await exists(csc))throw new Error('Windows .NET compiler is unavailable');await execFileAsync(csc,['/nologo','/optimize+','/target:exe',`/out:${helperExe()}`,cs],{windowsHide:true,timeout:60000,maxBuffer:2_000_000});if(!await exists(helperExe()))throw new Error('Audio helper build failed');return helperExe();})().finally(()=>{helperPromise=null;});
 return helperPromise;
}
async function audio(args=[]){const exe=await ensureHelper();const {stdout}=await execFileAsync(exe,args.map(String),{windowsHide:true,timeout:10000,maxBuffer:100000});const [percent,muted]=stdout.trim().split('|');return {percent:Number(percent),muted:muted==='1'};}
async function ps(script,timeout=15000){const {stdout}=await execFileAsync('powershell.exe',['-NoProfile','-NonInteractive','-Command',script],{windowsHide:true,timeout,maxBuffer:500000});return stdout.trim();}
async function readBrightness(){return Number(await ps('Get-CimInstance -Namespace root/WMI -ClassName WmiMonitorBrightness -ErrorAction Stop|Select-Object -First 1 -ExpandProperty CurrentBrightness'));}
async function writeBrightness(percent){const n=Math.round(clamp(percent,0,100));await ps(`$m=Get-CimInstance -Namespace root/WMI -ClassName WmiMonitorBrightnessMethods -ErrorAction Stop|Select-Object -First 1;Invoke-CimMethod -InputObject $m -MethodName WmiSetBrightness -Arguments @{Timeout=1;Brightness=${n}}|Out-Null`);return n;}
async function mediaKey(vk,count=1){const n=Math.max(1,Math.min(20,Math.round(count)));await ps(`Add-Type -TypeDefinition 'using System; using System.Runtime.InteropServices; public static class BCK { [DllImport(\"user32.dll\")] public static extern void keybd_event(byte v,byte s,uint f,UIntPtr e); }';1..${n}|%{[BCK]::keybd_event(${vk},0,0,[UIntPtr]::Zero);[BCK]::keybd_event(${vk},0,2,[UIntPtr]::Zero)}`);}
export const nativeWindowsTools={
 get_volume:tool('read','Read Windows default multimedia endpoint master volume through the native CoreAudio helper',{type:'object',properties:{},required:[]},async()=>result('get_volume',true,'Master volume read',await audio(['get']))),
 set_volume:tool('low','Set Windows default multimedia endpoint master volume 0-100 through the native CoreAudio helper',{type:'object',properties:{percent:{type:'number'}},required:['percent']},async({percent})=>{const n=Math.round(clamp(percent,0,100)),data=await audio(['set',n]);return result('set_volume',true,`Volume set to ${n}%`,data);}),
 set_mute:tool('low','Set Windows speaker mute state',{type:'object',properties:{muted:{type:'boolean'}},required:['muted']},async({muted})=>result('set_mute',true,muted?'Muted':'Unmuted',await audio(['mute',Boolean(muted)]))),
 toggle_mute:tool('low','Toggle Windows default audio endpoint mute',{type:'object',properties:{},required:[]},async()=>result('toggle_mute',true,'Mute toggled',await audio(['toggle']))),
 volume_up:tool('low','Increase Windows master volume by amount percentage points (default 10; a little is 3)',{type:'object',properties:{amount:{type:'number',minimum:0,maximum:100}},required:[]},async({amount=10}={})=>{if(!Number.isFinite(amount))throw new Error('Volume change must be a number');const before=await audio(['get']),n=Math.round(clamp(before.percent+clamp(amount,0,100),0,100)),data=await audio(['set',n]);return result('volume_up',true,`Volume increased to ${n}%`,{...data,before:before.percent,expected:n});}),
 volume_down:tool('low','Decrease Windows master volume by amount percentage points (default 10; a little is 3)',{type:'object',properties:{amount:{type:'number',minimum:0,maximum:100}},required:[]},async({amount=10}={})=>{if(!Number.isFinite(amount))throw new Error('Volume change must be a number');const before=await audio(['get']),n=Math.round(clamp(before.percent-clamp(amount,0,100),0,100)),data=await audio(['set',n]);return result('volume_down',true,`Volume decreased to ${n}%`,{...data,before:before.percent,expected:n});}),
 brightness_up:tool('low','Increase built-in display brightness by 10 percent',{type:'object',properties:{},required:[]},async()=>{const current=await readBrightness(),percent=await writeBrightness(current+10);return result('brightness_up',true,`Brightness increased to ${percent}%`,{percent});}),
 brightness_down:tool('low','Decrease built-in display brightness by 10 percent',{type:'object',properties:{},required:[]},async()=>{const current=await readBrightness(),percent=await writeBrightness(current-10);return result('brightness_down',true,`Brightness decreased to ${percent}%`,{percent});}),
 media_play_pause:tool('low','Toggle active media play/pause',{type:'object',properties:{},required:[]},async()=>{await mediaKey(0xB3);return result('media_play_pause',true,'Play/pause sent');}),
 media_next:tool('low','Next media track',{type:'object',properties:{},required:[]},async()=>{await mediaKey(0xB0);return result('media_next',true,'Next track sent');}),
 media_previous:tool('low','Previous media track',{type:'object',properties:{},required:[]},async()=>{await mediaKey(0xB1);return result('media_previous',true,'Previous track sent');})
};
export { ensureHelper as ensureAudioHelper };
