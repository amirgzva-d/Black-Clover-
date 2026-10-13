import fs from 'node:fs';
const main='src/main/ChatGPTPlanService.js';
let s=fs.readFileSync(main,'utf8');
s=s.replace("import path from 'node:path';","import path from 'node:path';\nimport fs from 'node:fs';\nimport {spawn} from 'node:child_process';");
const old="        await shell.openExternal(target.href);";
if(!s.includes(old))throw Error('browser hook not found');
s=s.replace(old,`        // Use the user's existing Chrome identity (Amir Mohmd), not the Windows default browser.
        // Never read Chrome cookies or authentication data.
        if(process.platform==='win32'){
          const chrome=path.join(process.env.PROGRAMFILES||'C:\\\\Program Files','Google','Chrome','Application','chrome.exe');
          const profileState=path.join(process.env.LOCALAPPDATA||'', 'Google','Chrome','User Data','Local State');
          try{
            const profiles=JSON.parse(fs.readFileSync(profileState,'utf8')).profile?.info_cache||{};
            const matched=Object.entries(profiles).find(([,v])=>/Amir\\s*Moh(?:a)?md/i.test(String(v.gaia_name||'')));
            if(matched&&fs.existsSync(chrome)){
              const child=spawn(chrome,['--profile-directory='+matched[0],target.href],{detached:true,stdio:'ignore',windowsHide:false});
              child.once('error',error=>console.warn('Chrome profile opener:',error.message));
              child.unref();
              return;
            }
          }catch(error){console.warn('Chrome profile lookup:',error.message);}
        }
        await shell.openExternal(target.href);`);
fs.writeFileSync(main,s);
const ui='src/renderer/chatSurfaceV2.js';let u=fs.readFileSync(ui,'utf8');
const marker="    '<section id=\"panel-privacy\"";
if(!u.includes(marker))throw Error('UI marker missing');
const intro="      '<div class=\"maria-free-gemini\"><strong>Gemini — سهمیه رایگان API</strong><p>برای اتصال رایگان، از Google AI Studio کلید بگیر؛ میزان سهمیه به حساب و منطقه بستگی دارد. نیازی به خرید اشتراک ChatGPT یا Gemini نیست.</p><button id=\"openGeminiKeys\" type=\"button\">ساخت کلید رایگان Gemini</button></div>'+\n";
const providerMarker="      '<div id=\"providerCards\"";
if(u.includes(providerMarker))u=u.replace(providerMarker,intro+providerMarker);else {const ix=u.indexOf("    '<section id=\"panel-providers\"");if(ix<0)throw Error('providers tab missing');const end=u.indexOf("\n",ix);u=u.slice(0,end+1)+intro+u.slice(end+1);}
const init="  $('#autoSpeak').classList.toggle";
if(!u.includes(init))throw Error('init hook missing');
u=u.replace(init,"  $('#openGeminiKeys').onclick=()=>api().openExternal('https://aistudio.google.com/api-keys').catch(withError);\n"+init);
fs.writeFileSync(ui,u);
fs.appendFileSync('src/renderer/chatSurfaceV2.css',"\nbody.chat-v3 .maria-free-gemini{border:1px solid #446b60;background:#18362e66;padding:13px;border-radius:12px;margin-bottom:14px}body.chat-v3 .maria-free-gemini strong{font-size:14px;color:#a8f2d6}body.chat-v3 .maria-free-gemini p{font-size:12px;line-height:1.8;color:#c5d7d0}body.chat-v3 .maria-free-gemini button{padding:9px 13px;border-radius:9px;border:1px solid #6da58e;background:#244c3d;color:#e3fff0}\n");
console.log('Chrome Amir profile OAuth opener and Gemini free key guide added');
