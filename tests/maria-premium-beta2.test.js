import test from 'node:test';
import assert from 'node:assert/strict';
import {cubicEaseOut,interpolateIslandBounds,clampIslandBounds,createIslandTransition} from '../src/main/IslandWindowTransition.js';
import {normalizeDropTarget,dropPinPayload,dropAskPrompt} from '../src/renderer/dropActions.js';
import {MARIA_FEATURES,FEATURE_STATUS,filterFeatures} from '../src/renderer/featureCatalog.js';

test('floating island interpolates symmetrically and always lands at exact target',()=>{
 const start={x:100,y:0,width:292,height:54},end={x:40,y:0,width:1000,height:560};
 assert.deepEqual(interpolateIslandBounds(start,end,0),start);
 assert.deepEqual(interpolateIslandBounds(start,end,1),end);
 const half=interpolateIslandBounds(start,end,.5);
 assert.ok(half.width>646&&half.width<1000);
 assert.ok(cubicEaseOut(.5)>.5);
 assert.deepEqual(clampIslandBounds({x:-20,y:35,width:1000,height:560},{x:0,y:0,width:750,height:500}),{x:0,y:0,width:750,height:500});
});
test('native island morph is interruptible with no orphaned timer',async()=>{
 let clock=0,serial=0;const queue=new Map(),output=[];
 const transition=createIslandTransition({
  apply:out=>output.push(out),now:()=>clock,schedule:fn=>{const id=++serial;queue.set(id,fn);return id;},
  cancel:id=>queue.delete(id),duration:240,steps:12
 });
 const a={x:0,y:0,width:292,height:54},b={x:10,y:0,width:900,height:226},c={x:5,y:0,width:1000,height:560};
 const first=transition.morph(a,b);
 assert.equal(transition.active,true);
 const next=transition.morph(output.at(-1),c);
 assert.equal(await first,null);
 while(queue.size){const [id,fn]=queue.entries().next().value;queue.delete(id);clock+=25;fn();}
 assert.deepEqual(await next,c);
 assert.deepEqual(output.at(-1),c);
 assert.equal(transition.active,false);
 assert.equal(queue.size,0);
 transition.stop();
});
test('native animation respects reduce motion and instant mode',async()=>{
 const output=[];
 const transition=createIslandTransition({apply:out=>output.push(out),isReduced:()=>true});
 const a={x:0,y:0,width:292,height:54},b={x:40,y:0,width:900,height:226};
 assert.deepEqual(await transition.morph(a,b),b);
 assert.equal(output.length,1);
});
test('user native files and web links are accepted, script and loopback URLs rejected',()=>{
 const file=normalizeDropTarget({path:'C:\\Work\\Invoices\\April.xlsx',name:'April.xlsx'});
 assert.deepEqual(file,{kind:'file',target:'C:\\Work\\Invoices\\April.xlsx',label:'April.xlsx'});
 const web=normalizeDropTarget({url:'https://example.org/guide',name:''});
 assert.equal(web.kind,'url');assert.equal(web.label,'example.org');
 assert.equal(normalizeDropTarget({url:'javascript:alert(1)'}),null);
 assert.equal(normalizeDropTarget({url:'file:///c:/secrets'}),null);
 assert.equal(normalizeDropTarget({url:'http://localhost:9222/json'}),null);
 assert.equal(normalizeDropTarget({url:''}),null);
 assert.equal(normalizeDropTarget({url:'https://example.org\nhttps://other.test'}).target,'https://example.org');
});
test('file drop pin and chat actions are truthful and non-destructive',()=>{
 const item=normalizeDropTarget({path:'C:\\Work\\Invoices\\April.xlsx',name:'April.xlsx'});
 assert.deepEqual(dropPinPayload(item),{type:'file',title:'April.xlsx',body:item.target,pinned:true,tags:['MARIA Drop']});
 assert.match(dropAskPrompt(item),/اگر به محتوایش دسترسی نداری/);
 assert.ok(dropAskPrompt(item).includes(item.target));
 assert.equal(dropPinPayload(normalizeDropTarget({url:'https://openai.com'})).type,'url');
});
test('new features have honest statuses and actionable destinations only for present workflows',()=>{
 assert.ok(MARIA_FEATURES.length>=10);
 assert.ok(MARIA_FEATURES.every(x=>Object.hasOwn(FEATURE_STATUS,x.status)));
 assert.ok(MARIA_FEATURES.every(x=>x.status!=='planned'||!x.page&&!x.action));
 assert.ok(filterFeatures('شخصیت').some(x=>x.id==='companion'));
 assert.ok(filterFeatures('','planned').every(x=>x.status==='planned'));
 assert.ok(MARIA_FEATURES.some(x=>x.id==='chat'&&x.action==='chat'));
});
