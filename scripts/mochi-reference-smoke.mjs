import assert from 'node:assert/strict';
import fs from 'node:fs/promises';
import path from 'node:path';
import os from 'node:os';
const port=process.env.MARIA_CDP_PORT||'9613';
const folder=path.join(os.homedir(),'MARIA_Backups','MOCHI_QA_20261013');await fs.mkdir(folder,{recursive:true});
const delay=ms=>new Promise(ok=>setTimeout(ok,ms));
const pages=await(await fetch('http://127.0.0.1:'+port+'/json/list')).json();
const target=pages.find(x=>x.url.includes('surface=island'));assert.ok(target,'Island window exists');
const ws=new WebSocket(target.webSocketDebuggerUrl);await new Promise((ok,no)=>{ws.onopen=ok;ws.onerror=no;});
let cursor=0;const pending=new Map(),errors=[];
ws.onmessage=e=>{const x=JSON.parse(e.data);if(x.method==='Runtime.exceptionThrown')errors.push(x.params.exceptionDetails);if(x.id&&pending.has(x.id)){pending.get(x.id)(x);pending.delete(x.id);}};
const cmd=(method,params={})=>new Promise((ok,no)=>{const id=++cursor;pending.set(id,ok);ws.send(JSON.stringify({id,method,params}));setTimeout(()=>{if(pending.has(id)){pending.delete(id);no(Error('Timeout '+method));}},15000).unref();});
const run=async expression=>{const x=await cmd('Runtime.evaluate',{expression,awaitPromise:true,returnByValue:true});if(x.error||x.result?.exceptionDetails)throw Error(JSON.stringify(x.error||x.result.exceptionDetails));return x.result?.result?.value;};
const click=selector=>run(`(()=>{const b=document.querySelector(${JSON.stringify(selector)});if(!b)throw Error('Missing '+${JSON.stringify(selector)});b.click();return true;})()`);
const shot=async name=>{const x=await cmd('Page.captureScreenshot',{format:'png'});await fs.writeFile(path.join(folder,name+'.png'),Buffer.from(x.result.data,'base64'));};
const report={};
try{
 await cmd('Runtime.enable');await cmd('Page.reload');await delay(1600);await run("window.blackClover.showIslandModule('motion')");await delay(700);await click('[data-workflow-lock]');
 report.size=await run('({width:innerWidth,height:innerHeight})');
 report.layout=await run("(()=>{const s=document.querySelector('[data-mochi-apply]').getBoundingClientRect(),p=document.querySelector('.mochi-studio-footer').getBoundingClientRect();return {applyBottom:s.bottom,footerBottom:p.bottom,height:innerHeight};})()");
 assert.ok(report.layout.applyBottom<=report.layout.height,'Apply is visible without scrolling');assert.ok(report.layout.footerBottom<=report.layout.height,'Motion controls visible');
 report.expressions=await run("[...document.querySelectorAll('[data-motion-state]')].map(x=>x.dataset.motionState)");assert.equal(report.expressions.length,25);
 for(const state of report.expressions){await click('[data-motion-state="'+state+'"]');assert.equal(await run("document.querySelector('[data-companion-preview]').dataset.mochiState"),state);assert.ok(['idle','greeting'].includes(await run("document.querySelector('[data-character]').dataset.companionState")),'Preview cannot change real task state');}
 await click('[data-motion-state="idle"]');await shot('02-expressions');
 await click('[data-mochi-tab="equipment"]');report.outfits=await run("[...document.querySelectorAll('[data-mochi-outfit]')].map(x=>x.dataset.mochiOutfit)");assert.equal(report.outfits.length,14);
 const original=await run("({...document.querySelector('[data-character]').dataset})");
 await click('[data-mochi-outfit="classic"]');for(const key of ['wizard','sunglasses','scarf'])await click('[data-mochi-outfit="'+key+'"]');
 assert.equal(await run("document.querySelector('[data-companion-preview]').dataset.mochiHead"),'wizard');assert.equal(await run("document.querySelector('[data-character]').dataset.mochiHead"),original.mochiHead,'Preview does not apply prematurely');
 await shot('03-equipment-preview');await click('[data-mochi-apply]');await delay(100);
 report.applied=await run("(()=>{const d=document.querySelector('[data-character]').dataset;return {head:d.mochiHead,face:d.mochiFace,neck:d.mochiNeck};})()");assert.deepEqual(report.applied,{head:'wizard',face:'sunglasses',neck:'scarf'});
 await click('[data-mochi-outfit="crown"]');await click('[data-mochi-reset]');assert.equal(await run("document.querySelector('[data-companion-preview]').dataset.mochiHead"),'wizard');
 await cmd('Page.reload');await delay(1300);assert.equal(await run("document.querySelector('[data-character]').dataset.mochiHead"),'wizard');
 await run("window.blackClover.showIslandModule('motion')");await delay(450);await click('[data-workflow-lock]');await click('[data-mochi-tab="sequences"]');
 report.sequences=await run("[...document.querySelectorAll('[data-mochi-play]')].map(x=>x.dataset.mochiPlay)");assert.equal(report.sequences.length,9);
 for(const id of report.sequences){await click('[data-mochi-play="'+id+'"]');await delay(180);assert.equal(await run("document.querySelector('[data-mochi-stop]').disabled"),false);await click('[data-mochi-stop]');}
 await click('[data-mochi-play="1000311262"]');await delay(6900);assert.equal(await run("document.querySelector('[data-companion-preview]').dataset.mochiState"),'uploading');await shot('04-upload');
 await delay(10200);assert.equal(await run("document.querySelector('[data-companion-preview]').dataset.mochiState"),'success');await delay(3300);assert.equal(await run("document.querySelector('[data-mochi-stop]').disabled"),true);
 await click('[data-mochi-tab="expressions"]');await click('[data-motion-state="affection"]');await delay(600);await shot('05-affection');
 await cmd('Emulation.setEmulatedMedia',{features:[{name:'prefers-reduced-motion',value:'reduce'}]});
 assert.equal(await run("getComputedStyle(document.querySelector('[data-companion-preview] .mochi-float')).animationName"),'none');await cmd('Emulation.setEmulatedMedia',{features:[]});
 await click('[data-mochi-tab="equipment"]');await click('[data-mochi-outfit="classic"]');await click('[data-mochi-apply]');
 await run("window.blackClover.showWardrobe()");await delay(1600);
 report.wardrobeCreated=(await(await fetch('http://127.0.0.1:'+port+'/json/list')).json()).some(x=>x.url.includes('surface=wardrobe'));assert.ok(report.wardrobeCreated);
 assert.equal(errors.length,0,JSON.stringify(errors));report.errors=errors;report.ok=true;
 console.log(JSON.stringify(report,null,2));await fs.writeFile(path.join(folder,'functional-smoke.json'),JSON.stringify(report,null,2));
}finally{ws.close();}
