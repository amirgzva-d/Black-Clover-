import fs from 'node:fs';
const f='src/renderer/chatSurfaceV2.js';let s=fs.readFileSync(f,'utf8');
const old="button('minimizeChat','";const at=s.indexOf(old);if(at<0)throw Error('topbar missing');
s=s.slice(0,at)+"'<button id=\"showAvatar\" class=\"maria-avatar-return\" type=\"button\" title=\"بازگشت به کاراکتر و منوی پایین\">کاراکتر و منو</button>'+"+s.slice(at);
const hook="  $('#minimizeChat').onclick=";if(!s.includes(hook))throw Error('event hook missing');
s=s.replace(hook,"  $('#showAvatar').onclick=()=>api().hideChat().catch(withError);\n"+hook);
fs.writeFileSync(f,s);
fs.appendFileSync('src/renderer/chatSurfaceV2.css','\nbody.chat-v3 .maria-avatar-return{background:#393342;border:1px solid #665575;border-radius:9px;color:#f0e7ff;font-size:12px;font-weight:600;padding:8px 12px;white-space:nowrap}body.chat-v3 .maria-avatar-return:hover{background:#524365} @media(max-width:700px){body.chat-v3 .maria-avatar-return{font-size:10px;padding:7px 8px}}\n');
console.log('avatar return button restored');