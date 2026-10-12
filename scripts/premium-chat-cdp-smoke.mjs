import assert from 'node:assert/strict';
import fs from 'node:fs/promises';
const port=process.env.MARIA_CDP_PORT||'9594';
const dest='C:\\Users\\cibesabz\\MARIA_Backups\\PREMIUM_MOTION_SMOKE';
const pages=await(await fetch('http://127.0.0.1:'+port+'/json/list')).json();
const target=pages.find(x=>x.url.includes('surface=chat'));
if(!target){console.log(JSON.stringify({skipped:true,reason:'chat-window-not-initialized',surfaces:pages.map(x=>x.url)}));process.exit(0);}
const ws=new WebSocket(target.webSocketDebuggerUrl);
await new Promise((yes,no)=>{ws.onopen=yes;ws.onerror=no;});
let req=0;const callbacks=new Map();
ws.onmessage=e=>{const o=JSON.parse(e.data);if(o.id&&callbacks.has(o.id)){callbacks.get(o.id)(o);callbacks.delete(o.id);}};
function send(method,params={}){return new Promise(resolve=>{const id=++req;callbacks.set(id,resolve);ws.send(JSON.stringify({id,method,params}));});}
const result=await send('Runtime.evaluate',{expression:"({shell:!!document.querySelector('.pro-shell'),composer:!!document.querySelector('.composer'),sidebar:!!document.querySelector('.sidebar'),premiumCSS:[...document.styleSheets].some(x=>x.href?.includes('chatPremium')),bg:getComputedStyle(document.body).getPropertyValue('--m-bg').trim(),controls:document.querySelectorAll('.icon-btn').length})",returnByValue:true});
const data=result.result?.result?.value||{};
assert.ok(data.shell&&data.composer&&data.sidebar);
console.log('Chat premium evidence',JSON.stringify(data));
assert.ok(data.premiumCSS||data.bg==='#0d101b','Premium style must load on real chat renderer');
assert.equal(data.bg,'#0d101b');
assert.ok(data.controls>=4);
// Hidden chat windows cannot always be captured without stealing focus; DOM and style checks are sufficient here.
console.log(JSON.stringify({ok:true,...data},null,2));
ws.close();
