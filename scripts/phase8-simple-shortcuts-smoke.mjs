// Real Electron integration: two clean ways of adding shortcuts (+ URL and OS-backed drop).
// Requires isolated dev slot BLACK_CLOVER_DEBUG_PORT=9583 and a temporary BLACK_CLOVER_DATA_DIR.
import assert from 'node:assert/strict';
import fs from 'node:fs/promises';
import path from 'node:path';
const port=process.env.MARIA_CDP_PORT||'9583';
const target=(await(await fetch('http://127.0.0.1:'+port+'/json/list')).json()).find(x=>x.url.includes('surface=island'));
assert.ok(target,'Isolated island window is available');
const ws=new WebSocket(target.webSocketDebuggerUrl);
await new Promise((ok,fail)=>{ws.onopen=ok;ws.onerror=fail});
let serial=0;const awaiting=new Map();
ws.onmessage=e=>{const r=JSON.parse(e.data);if(awaiting.has(r.id)){awaiting.get(r.id)(r);awaiting.delete(r.id)}};
const sleep=ms=>new Promise(resolve=>setTimeout(resolve,ms));
const send=(method,params={})=>new Promise((resolve,reject)=>{
 const n=++serial;awaiting.set(n,resolve);ws.send(JSON.stringify({id:n,method,params}));
 setTimeout(()=>{if(awaiting.has(n)){awaiting.delete(n);reject(Error('CDP timed out: '+method))}},13000).unref();
});
async function evaluate(expression){
 const response=await send('Runtime.evaluate',{expression,awaitPromise:true,returnByValue:true});
 if(response.error||response.result?.exceptionDetails)throw Error(JSON.stringify(response.error||response.result?.exceptionDetails));
 return response.result?.result?.value;
}
async function photo(filename){
 const r=await send('Page.captureScreenshot',{format:'png',captureBeyondViewport:false});
 await fs.writeFile(path.resolve(filename),Buffer.from(r.result.data,'base64'));
}
const fixtures=path.resolve('.runtime-data-phase8');
await fs.mkdir(fixtures,{recursive:true});
const png=path.join(fixtures,'نمونه-عکس.png');
const excel=path.join(fixtures,'فهرست.xlsx');
// Create a real 128x96 image with native Node zlib, so thumbnail testing
// verifies actual photo content rather than an OS file-type fallback.
const {deflateSync}=await import('node:zlib');
const crc32=buffer=>{
  let crc=0xffffffff;
  for(const byte of buffer){
    crc^=byte;
    for(let i=0;i<8;i++)crc=(crc>>>1)^((crc&1)?0xedb88320:0);
  }
  return (crc^0xffffffff)>>>0;
};
const pngChunk=(type,data)=>{
  const head=Buffer.alloc(8),name=Buffer.from(type);
  head.writeUInt32BE(data.length,0);name.copy(head,4);
  const tail=Buffer.alloc(4);tail.writeUInt32BE(crc32(Buffer.concat([name,data])),0);
  return Buffer.concat([head,data,tail]);
};
const raw=[];
for(let y=0;y<96;y++){
  const row=Buffer.alloc(1+128*4);
  for(let x=0;x<128;x++){
    const index=1+x*4;
    row[index]=75+Math.round(x*0.8);
    row[index+1]=48+Math.round(y*1.5);
    row[index+2]=190+Math.round((128-x)*0.3);
    row[index+3]=255;
  }
  raw.push(row);
}
const ihdr=Buffer.alloc(13);ihdr.writeUInt32BE(128,0);ihdr.writeUInt32BE(96,4);
ihdr[8]=8;ihdr[9]=6;
await fs.writeFile(png,Buffer.concat([
  Buffer.from('89504e470d0a1a0a','hex'),pngChunk('IHDR',ihdr),
  pngChunk('IDAT',deflateSync(Buffer.concat(raw))),pngChunk('IEND',Buffer.alloc(0))
]));
await fs.writeFile(excel,'phase8 source file must not be changed');
const before=await Promise.all([fs.readFile(png),fs.readFile(excel)]);
const url='https://example.org/maria/shortcuts-test';
const history={};
try{
 const oldTests=await evaluate('window.blackClover.listShortcuts()');
 for(const entry of oldTests.filter(x=>[png,excel,url,'https://www.example.com/'].includes(x.target))){
   await evaluate("window.blackClover.removeShortcut("+JSON.stringify(entry.id)+")");
 }
 await evaluate("document.dispatchEvent(new KeyboardEvent('keydown',{key:'Escape',bubbles:true}));true");
 await sleep(120);
 history.initial=await evaluate("document.querySelector('.maria-island-v4').dataset.mode");
 assert.equal(history.initial,'peek');
 await evaluate("document.querySelector('[data-character]').click();true");
 await sleep(140);
 await evaluate("document.querySelector('.v4-right-module[data-page=shortcuts]').click();true");
 await sleep(230);
 history.page=await evaluate("({title:document.querySelector('.v4-page-head h2')?.textContent,empty:!!document.querySelector('.v4-shortcut-empty'),drop:!!document.querySelector('[data-shortcut-drop-area]')})");
 assert.equal(history.page.title,'میان‌برها');
 assert.ok(history.page.drop);
 await photo('phase8-shortcuts-empty.png');
 // Both top toolbar '+' and the in-page '+' must open the same contextual picker.
 await evaluate("document.querySelector('.v4-left-tools [data-context-add]').click();true");
 await sleep(95);
 history.topPlus=await evaluate("({modal:!!document.querySelector('.v4-modal'),picker:!!document.querySelector('[data-quick-pick=file]')})");
 assert.ok(history.topPlus.modal&&history.topPlus.picker,'Global top + must create Shortcut on the Shortcuts page');
 await evaluate("document.querySelector('.v4-modal [data-modal-close]').click();true");
 await evaluate("document.querySelector('.v4-page-head [data-context-add]').click();true");
 await sleep(110);
 history.addMenu=await evaluate("({modal:!!document.querySelector('.v4-modal'),file:!!document.querySelector('[data-quick-pick=file]'),folder:!!document.querySelector('[data-quick-pick=folder]'),url:!!document.querySelector('[name=quick-target]'),oldEditor:!!document.querySelector('[name=label]')})");
 assert.ok(history.addMenu.modal&&history.addMenu.file&&history.addMenu.folder&&history.addMenu.url);
 assert.equal(history.addMenu.oldEditor,false,'Quick add must not show the advanced editor');
 await photo('phase8-shortcut-add-menu.png');
 await evaluate("(()=>{const input=document.querySelector('.v4-modal [name=quick-target]');input.value="+JSON.stringify(url)+";document.querySelector('.v4-modal [data-modal-form]').requestSubmit();return true;})()");
 await sleep(470);
 history.afterUrl=await evaluate("({modal:!!document.querySelector('.v4-modal'),items:document.querySelectorAll('[data-shortcut-id]').length,card:document.querySelector('.v4-shortcut')?.textContent,notice:document.querySelector('[data-shortcut-message]')?.textContent})");
 assert.equal(history.afterUrl.modal,false);
 assert.equal(history.afterUrl.items,1);
 assert.match(history.afterUrl.card,/وب‌سایت/);
 await evaluate("document.querySelector('.v4-page-head [data-context-add]').click();true");
 await evaluate("(()=>{document.querySelector('.v4-modal [name=quick-target]').value="+JSON.stringify(url)+";document.querySelector('.v4-modal [data-modal-form]').requestSubmit();return true;})()");
 await sleep(430);
 history.duplicate=await evaluate("({items:document.querySelectorAll('[data-shortcut-id]').length,notice:document.querySelector('[data-shortcut-message]')?.textContent})");
 assert.equal(history.duplicate.items,1);
 assert.match(history.duplicate.notice,/قبلاً/);
 const inputId='phase8-native-osfiles';
 await evaluate("(()=>{const el=document.createElement('input');el.id="+JSON.stringify(inputId)+";el.type='file';el.multiple=true;el.style.position='absolute';el.style.left='-90000px';document.body.append(el);return true;})()");
 const dom=await send('DOM.getDocument',{depth:-1});
 const node=await send('DOM.querySelector',{nodeId:dom.result.root.nodeId,selector:'#'+inputId});
 assert.ok(node.result.nodeId);
 await send('DOM.setFileInputFiles',{nodeId:node.result.nodeId,files:[png,excel]});
 history.windowsPaths=await evaluate("Array.from(document.getElementById('phase8-native-osfiles').files).map(f=>window.blackClover.getDroppedFilePath(f))");
 assert.deepEqual(history.windowsPaths,[png,excel]);
 history.dropPrevented=await evaluate("(()=>{const data=new DataTransfer();for(const f of document.getElementById('phase8-native-osfiles').files)data.items.add(f);const e=new DragEvent('drop',{bubbles:true,cancelable:true,dataTransfer:data});document.querySelector('[data-shortcut-drop-area]').dispatchEvent(e);return e.defaultPrevented;})()");
 assert.equal(history.dropPrevented,true);
 await sleep(1050);
 history.afterDrop=await evaluate("({count:document.querySelectorAll('[data-shortcut-id]').length,modal:!!document.querySelector('.v4-modal'),cards:[...document.querySelectorAll('[data-shortcut-id]')].map(x=>({kind:x.dataset.shortcutKind,preview:x.dataset.shortcutPreview,title:x.querySelector('.v4-shortcut-info b')?.textContent,details:x.querySelector('small')?.textContent,path:x.querySelector('.v4-shortcut-path')?.textContent,icon:!!x.querySelector('.v4-app-icon img')}))})");
 assert.equal(history.afterDrop.count,3);
 assert.equal(history.afterDrop.modal,false,'Native drag/drop should save without advanced modal');
 assert.ok(history.afterDrop.cards.some(x=>x.title.includes('نمونه-عکس')&&x.preview==='image'));
 assert.ok(history.afterDrop.cards.some(x=>x.title.includes('فهرست')&&x.details.includes('.XLSX')));
 await photo('phase8-shortcut-cards.png');
 const list=await evaluate('window.blackClover.listShortcuts()');
 const photoShortcut=list.find(x=>x.target===png);
 const sheetShortcut=list.find(x=>x.target===excel);
 assert.ok(photoShortcut&&sheetShortcut);
 const nativeThumb=await evaluate("window.blackClover.shortcutFileIcon("+JSON.stringify(photoShortcut.id)+")");
 assert.match(nativeThumb||'',/^data:image\/png;base64,/);
 history.nativePreview=await evaluate("(async()=>{const src=await window.blackClover.shortcutFileIcon("+JSON.stringify(photoShortcut.id)+");const img=new Image();return new Promise((ok,bad)=>{img.onload=()=>ok({width:img.naturalWidth,height:img.naturalHeight});img.onerror=bad;img.src=src;});})()");
 assert.equal(history.nativePreview.width,96);
 assert.equal(history.nativePreview.height,72);
 const firstCard=await evaluate("(()=>{const card=[...document.querySelectorAll('[data-shortcut-id]')].find(x=>x.dataset.shortcutId==="+JSON.stringify(photoShortcut.id)+");return {imageFit:getComputedStyle(card.querySelector('.v4-app-icon img')).objectFit,visible:!!card}})()");
 assert.equal(firstCard.imageFit,'cover','Photographs should display as thumbnails rather than generic icons');
 await evaluate("document.querySelector('[data-shortcut-id="+JSON.stringify(photoShortcut.id)+"] [data-shortcut-edit]').click();true");
 await sleep(140);
 history.options=await evaluate("({title:document.querySelector('.v4-modal h3')?.textContent,actions:[...document.querySelectorAll('[data-shortcut-action]')].map(x=>x.dataset.shortcutAction)})");
 assert.deepEqual(history.options.actions,['open','copy','reveal','favorite','edit','remove']);
 await evaluate("document.querySelector('[data-shortcut-action=favorite]').click();true");
 await sleep(270);
 const favorited=await evaluate("window.blackClover.listShortcuts()");
 assert.equal(favorited.find(x=>x.id===photoShortcut.id)?.pinned,true);
 history.favorite=true;
 await evaluate("document.querySelector('[data-shortcut-id="+JSON.stringify(photoShortcut.id)+"] [data-shortcut-edit]').click();true");
 await sleep(110);
 await evaluate("document.querySelector('[data-shortcut-action=copy]').click();true");
 await sleep(120);
 history.copy=await evaluate("document.querySelector('[data-shortcut-message]')?.textContent");
 assert.match(history.copy,/کپی/);
 await evaluate("document.querySelector('[data-shortcut-id="+JSON.stringify(photoShortcut.id)+"] [data-shortcut-edit]').click();true");
 await sleep(95);
 await evaluate("document.querySelector('[data-shortcut-action=edit]').click();true");
 await sleep(95);
 history.advanced=await evaluate("Boolean(document.querySelector('.v4-modal [name=label]'))");
 assert.equal(history.advanced,true,'Advanced controls remain available from options');
 await evaluate("document.querySelector('.v4-modal [data-modal-close]').click();true");
 await evaluate("document.querySelector('.v4-page-head [data-context-add]').click();true");
 await sleep(80);
 await evaluate("(()=>{document.querySelector('[name=quick-target]').value='www.example.com';document.querySelector('.v4-modal [data-modal-form]').requestSubmit();return true;})()");
 await sleep(260);
 history.bareDomain=await evaluate("window.blackClover.listShortcuts()");
 assert.ok(history.bareDomain.some(x=>x.target==='https://www.example.com/'&&x.kind==='url'));
 history.bareDomain='https://www.example.com/';
 // Remove TEST shortcuts only, never the originals.
 const testEntries=await evaluate("window.blackClover.listShortcuts()");
 for(const item of testEntries.filter(x=>[png,excel,url,'https://www.example.com/'].includes(x.target))){
   await evaluate("window.blackClover.removeShortcut("+JSON.stringify(item.id)+")");
 }
 assert.deepEqual(await fs.readFile(png),before[0]);
 assert.deepEqual(await fs.readFile(excel),before[1]);
 history.originalsUnchanged=true;
 console.log(JSON.stringify({success:true,...history},null,2));
}finally{ws.close()}
