// Play/pause and transport keys are sent only after the user clicks a button.
// Native Windows global media keys do not require inspecting private playback apps.
export const MEDIA_KEY_CODES=Object.freeze({
  play_pause:0xB3,next:0xB0,previous:0xB1,mute:0xAD
});
export function mediaVirtualKey(command){
  const code=MEDIA_KEY_CODES[String(command||'')];
  if(!code)throw new Error('فرمان رسانه پشتیبانی نمی‌شود.');
  return code;
}
export async function sendMediaKey(command,{platform=process.platform,exec}={}){
  if(platform!=='win32')throw new Error('کنترل رسانه فقط در ویندوز فعال است.');
  const key=mediaVirtualKey(command);
  if(typeof exec!=='function')throw new Error('Windows key executor is unavailable.');
  const script=`$sig='[DllImport("user32.dll")] public static extern void keybd_event(byte vk,byte scan,uint flags,UIntPtr extraInfo);';Add-Type -Namespace Maria -Name MediaKeys -MemberDefinition $sig -ErrorAction SilentlyContinue;[Maria.MediaKeys]::keybd_event([byte]${key},0,0,[UIntPtr]::Zero);[Maria.MediaKeys]::keybd_event([byte]${key},0,2,[UIntPtr]::Zero)`;
  await exec('powershell.exe',['-NoProfile','-NonInteractive','-Command',script],{windowsHide:true,timeout:10000});
  return {ok:true,command};
}
