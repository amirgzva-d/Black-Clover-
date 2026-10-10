// Phase 5 end-to-end test against a dedicated Electron process, NOT the user's MARIA.
// Launch with BLACK_CLOVER_DEBUG_PORT=9552 and BLACK_CLOVER_DATA_DIR set to isolated fixture.
import assert from 'node:assert/strict';
import fs from 'node:fs/promises';
import path from 'node:path';
const debugUrl='http://127.0.0.1:'+String(process.env.MARIA_CDP_PORT||9552);
const pages=await(await fetch(debugUrl+'/json/list')).json();
const island=pages.find(x=>x.url.includes('surface=island'));
if(!island)throw Error('Isolated MARIA island missing');
const ws=new WebSocket(island.webSocketDebuggerUrl);
await new Promise((resolve,reject)=>{ws.onopen=resolve;ws.onerror=reject;});
let id=0;const pending=new Map();
ws.onmessage=e=>{const x=JSON.parse(e.data);if(pending.has(x.id)){pending.get(x.id)(x);pending.delete(x.id);}};
const sleep=ms=>new Promise(r=>setTimeout(r,ms));
function send(method,params={}){
 return new Promise((resolve,reject)=>{
  const n=++id;pending.set(n,resolve);ws.send(JSON.stringify({id:n,method,params}));
  setTimeout(()=>{if(pending.has(n)){pending.delete(n);reject(Error('Timed out: '+method));}},12000).unref();
 });
}
async function evalExpr(expression){
 const v=await send('Runtime.evaluate',{expression,returnByValue:true,awaitPromise:true});
 if(v.error||v.result?.exceptionDetails)throw Error(JSON.stringify(v.error||v.result.exceptionDetails));
 return v.result?.result?.value;
}
async function screenshot(name){
 const v=await send('Page.captureScreenshot',{format:'png',captureBeyondViewport:false});
 await fs.writeFile(path.resolve(name),Buffer.from(v.result.data,'base64'));
}
async function inspect(){
 return evalExpr("({mode:document.querySelector('.maria-island-v4')?.dataset.mode,window:{w:innerWidth,h:innerHeight},page:document.querySelector('.v4-page-head h2')?.textContent,dialog:Boolean(document.querySelector('.v4-modal')),gaze:document.querySelector('.maria-island-v4')?.style.getPropertyValue('--look-x')})");
}
const report={};
const target=process.env.MARIA_TEST_FILE||path.resolve('.runtime-data-phase5','گزارش-نمونه.xlsx');
await fs.mkdir(path.dirname(target),{recursive:true});
if(!await fs.stat(target).catch(()=>null))await fs.writeFile(target,'temporary MARIA fixture');
try{
 await sleep(420);
 report.boot=await inspect();assert.equal(report.boot.mode,'peek');
 report.state=await evalExpr('window.blackClover.windowState()');
 assert.equal(report.state.avatarVisible,false,'Floating avatar must start hidden');
 assert.equal(report.state.avatarEnabled,false,'Floating avatar preference defaults off');
 await evalExpr("document.querySelector('.maria-island-v4').dispatchEvent(new PointerEvent('pointermove',{bubbles:true,clientX:98,clientY:22}));true");
 await sleep(950);
 report.hover=await inspect();assert.equal(report.hover.mode,'peek','Hover alone must NOT open');
 await screenshot('phase5-mini-hover.png');
 await evalExpr("document.querySelector('[data-character]').click();true");
 await sleep(130);
 report.clickPreview=await inspect();assert.equal(report.clickPreview.mode,'preview');
 await screenshot('phase5-preview.png');
 await evalExpr("document.querySelector('[data-open-chat]').click();true");
 await sleep(230);
 report.openChat=await evalExpr('window.blackClover.windowState()');
 assert.equal(report.openChat.avatarVisible,false,'Chat may not reveal the large avatar');
 assert.equal(report.openChat.chatVisible,true);
 await evalExpr("window.blackClover.hideChat();true");
 await evalExpr("document.querySelector('[data-settings]').click();true");
 await sleep(170);
 report.settings=await inspect();assert.equal(report.settings.mode,'expanded');
 assert.equal(report.settings.page,'تنظیمات پنل');
 report.avatarControl=await evalExpr("({exists:Boolean(document.querySelector('[data-setting-avatar]')),pressed:document.querySelector('[data-setting-avatar]')?.getAttribute('aria-pressed')})");
 assert.equal(report.avatarControl.pressed,'false');
 await evalExpr("document.querySelector('[data-setting-avatar]').click();true");
 await sleep(210);
 report.avatarShown=await evalExpr('window.blackClover.avatarVisibility()');
 assert.equal(report.avatarShown.enabled,true);assert.equal(report.avatarShown.visible,true);
 await evalExpr("document.querySelector('[data-setting-avatar]').click();true");
 await sleep(210);
 report.avatarHiddenAgain=await evalExpr('window.blackClover.avatarVisibility()');
 assert.equal(report.avatarHiddenAgain.enabled,false);assert.equal(report.avatarHiddenAgain.visible,false);
 await evalExpr("document.querySelector('[data-page=shortcuts]').click();true");
 await sleep(210);
 report.shortcuts=await inspect();assert.equal(report.shortcuts.page,'میان‌برها');
 await evalExpr("document.querySelector('[data-page-body] [data-context-add]').click();true");
 await sleep(90);
 report.shortcutModal=await evalExpr("({visible:Boolean(document.querySelector('.v4-modal')),filePicker:Boolean(document.querySelector('[data-pick-file]')),folderPicker:Boolean(document.querySelector('[data-pick-folder]')),dropArea:Boolean(document.querySelector('[data-shortcut-drop]'))})");
 assert.ok(report.shortcutModal.visible&&report.shortcutModal.filePicker&&report.shortcutModal.folderPicker&&report.shortcutModal.dropArea);
 await evalExpr("(()=>{const t=document.querySelector('.v4-modal [name=target]');t.value="+JSON.stringify(target)+";t.dispatchEvent(new Event('change',{bubbles:true}));return true;})()");
 await sleep(240);
 report.detected=await evalExpr("({name:document.querySelector('.v4-modal [name=label]')?.value,metadata:document.querySelector('[data-shortcut-meta]')?.textContent,type:document.querySelector('[data-shortcut-kind]')?.textContent})");
 assert.match(report.detected.metadata,/\.XLSX/);
 assert.match(report.detected.metadata,/گزارش-نمونه/);
 await screenshot('phase5-shortcut-dialog.png');
 await evalExpr("document.querySelector('[data-modal-form]').requestSubmit();true");
 await sleep(280);
 report.list=await evalExpr('window.blackClover.listShortcuts()');
 const created=report.list.find(x=>x.target===target);
 assert.ok(created,'Real shortcut did not persist');assert.equal(created.kind,'file');
 report.savedCard=await evalExpr("document.querySelector('[data-shortcut-id]')?.textContent");
 assert.match(report.savedCard,/\.XLSX/);
 await evalExpr("window.blackClover.removeShortcut("+JSON.stringify(created.id)+")");
 await evalExpr("document.querySelector('[data-page=pins]').click();true");
 await sleep(140);
 await evalExpr("document.querySelector('[data-page-body] [data-context-add]').click();true");
 report.pinModal=await evalExpr("({modal:Boolean(document.querySelector('.v4-modal')),body:Boolean(document.querySelector('.v4-modal [name=body]'))})");
 assert.ok(report.pinModal.modal&&report.pinModal.body);
 await evalExpr("document.querySelector('.v4-modal [data-modal-close]').click();document.querySelector('[data-page=tasks]').click();true");
 await sleep(145);
 await evalExpr("document.querySelector('[data-page-body] [data-context-add]').click();true");
 report.reminderModal=await evalExpr("({modal:Boolean(document.querySelector('.v4-modal')),instruction:Boolean(document.querySelector('.v4-modal [name=instruction]'))})");
 assert.ok(report.reminderModal.modal&&report.reminderModal.instruction);
 await evalExpr("document.querySelector('.v4-modal [data-modal-close]').click();true");
 await evalExpr("document.querySelector('[data-character]').click();true");
 await sleep(100);
 report.close=await inspect();assert.equal(report.close.mode,'peek');
 console.log(JSON.stringify({success:true,...report},null,2));
}finally{ws.close();}
