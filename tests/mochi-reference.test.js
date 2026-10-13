import test from 'node:test';
import assert from 'node:assert/strict';
import {superellipsePath,normalizeEquipment,equipItem,readAppearance,saveAppearance,MOCHI_OUTFITS} from '../src/renderer/mochiCharacter.js';
import {MOCHI_SEQUENCES,sequenceFrame,createMochiSequence} from '../src/renderer/mochiSequences.js';
import {COMPANION_STATES,mapCompanionEvent,CompanionStateMachine} from '../src/renderer/companionMotion.js';
test('head geometry matches 1.14R/0.88R reference and stays symmetric',()=>{
 const values=[...superellipsePath().matchAll(/[ML]([\d.]+) ([\d.]+)/g)].map(m=>[+m[1],+m[2]]);
 assert.equal(values.length,128);assert.deepEqual(values[0],[190,126]);assert.deepEqual(values[32],[120,180]);
 assert.ok(Math.abs(140/108-1.14/.88)<.005);
 for(let i=0;i<64;i++)assert.ok(Math.abs(values[i][0]+values[i+64][0]-240)<.003);
 assert.notEqual(superellipsePath(4.5),superellipsePath(2.7));
});
test('equipment combines separate slots and never overwrites unrelated accessories',()=>{
 let e=equipItem('classic','wizard');e=equipItem(e,'glasses');e=equipItem(e,'scarf');
 assert.deepEqual(e,{head:'wizard',face:'glasses',neck:'scarf',body:''});
 e=equipItem(e,'santa');assert.equal(e.head,'santa');assert.equal(e.face,'glasses');
 e=equipItem(e,'santa');assert.equal(e.head,'');
 assert.deepEqual(equipItem(e,'classic'),normalizeEquipment(null));
 assert.deepEqual(normalizeEquipment({head:'glasses',face:'wizard',neck:'scarf',body:'unknown'}),{head:'',face:'',neck:'scarf',body:''});
});
test('appearance survives reload and corrupt persisted data has a safe default',()=>{
 let value=null;const storage={getItem:()=>value,setItem:(_,v)=>value=v};
 assert.equal(readAppearance(storage),null);
 const saved=saveAppearance({equipment:{head:'beanie',neck:'scarf'},motion:'subtle'},storage);
 assert.deepEqual(readAppearance(storage),saved);
 value='broken';assert.equal(readAppearance(storage),null);
});
test('all nine recordings have ordered complete preview timelines with valid cues',()=>{
 assert.equal(MOCHI_SEQUENCES.length,9);assert.equal(new Set(MOCHI_SEQUENCES.map(s=>s.id)).size,9);
 for(const seq of MOCHI_SEQUENCES){assert.equal(seq.shots[0].at,0);assert.ok(seq.shots.at(-1).at<seq.duration);
  seq.shots.forEach((s,i)=>{assert.ok(COMPANION_STATES[s.state],s.state);if(s.equipment)assert.ok(MOCHI_OUTFITS[s.equipment]);if(i)assert.ok(s.at>seq.shots[i-1].at);});
 }
 const anim=MOCHI_SEQUENCES.find(s=>s.id==='1000311262');assert.equal(sequenceFrame(anim,6800).state,'uploading');assert.equal(sequenceFrame(anim,9800).state,'slap');
});
test('preview cancels cleanly, can replay and does not control a running real task',()=>{
 let clock=0,id=0;const pending=new Map(),seen=[];let ended=0;
 const live=new CompanionStateMachine();live.dispatch({type:'tool',tool:'file.open'});
 const seq=MOCHI_SEQUENCES[0],player=createMochiSequence({now:()=>clock,schedule:fn=>{pending.set(++id,fn);return id;},cancel:key=>pending.delete(key),onFrame:s=>seen.push(s.state),onEnd:()=>ended++});
 player.play(seq);assert.equal(pending.size,1);player.play(seq);assert.equal(pending.size,1);
 clock=8500;let [key,fn]=pending.entries().next().value;pending.delete(key);fn();assert.equal(seen.at(-1),'affection');assert.equal(live.state,'working');
 player.stop();assert.equal(pending.size,0);assert.equal(player.running,false);
 player.play(seq);clock+=seq.duration;[key,fn]=pending.entries().next().value;pending.delete(key);fn();assert.equal(ended,1);assert.equal(pending.size,0);live.destroy();
});
test('rate limiting and questions are mapped; unverified results do not become success',()=>{
 assert.equal(mapCompanionEvent({type:'error',status:429}).state,'ratelimit');
 assert.equal(mapCompanionEvent({type:'clarification'}).state,'question');
 assert.equal(mapCompanionEvent({type:'task-finished',ok:true}).state,'working');
 assert.equal(mapCompanionEvent({type:'task-finished',verification:{ok:true}}).state,'success');
});
