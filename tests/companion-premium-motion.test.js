import test from 'node:test';
import assert from 'node:assert/strict';
import {COMPANION_STATES,COMPANION_OUTFITS,superellipsePolygon,
  normalizeCompanionState,mapCompanionEvent,verifiedCompletion,CompanionStateMachine}
from '../src/renderer/companionMotion.js';

test('Lamé superellipse uses smooth, bounded geometry and preserves symmetry',()=>{
 const shape=superellipsePolygon(2.7,96);
 assert.ok(shape.startsWith('polygon('));
 const values=[...shape.matchAll(/([\d.]+)% ([\d.]+)%/g)].map(m=>[Number(m[1]),Number(m[2])]);
 assert.equal(values.length,96);
 assert.deepEqual(values[0],[100,50]);
 assert.equal(values[24][0],50);
 assert.ok(values.every(x=>x.every(v=>v>=0&&v<=100)));
 assert.ok(Math.abs(values[12][0]+values[60][0]-100)<.002);
 assert.notEqual(superellipsePolygon(2,96),shape);
});
test('all film reaction names and eight outfit choices are represented',()=>{
 for(const name of ['idle','greeting','working','thinking','uploading','dizzy','question',
   'error','success','dancing','approval','offline','listening','speaking','searching']){
   assert.ok(COMPANION_STATES[name],name);
 }
 assert.equal(Object.keys(COMPANION_OUTFITS).length,8);
 assert.equal(normalizeCompanionState('executing'),'working');
 assert.equal(normalizeCompanionState('dance'),'dancing');
 assert.equal(normalizeCompanionState('invalid'),'idle');
});
test('verified outcome is essential before successful completion is claimed',()=>{
 assert.equal(verifiedCompletion({type:'success'}),false);
 assert.equal(verifiedCompletion({type:'success',ok:true}),false);
 assert.equal(verifiedCompletion({result:{verified:true}}),true);
 assert.equal(mapCompanionEvent({type:'task-finished',ok:true}).state,'working');
 assert.equal(mapCompanionEvent({type:'task-finished',result:{verified:true}}).state,'success');
});
test('agent and voice events map to real UI states rather than fake celebration',()=>{
 assert.equal(mapCompanionEvent({type:'thinking'}).state,'thinking');
 assert.equal(mapCompanionEvent({type:'tool',tool:'uploadFile'}).state,'uploading');
 assert.equal(mapCompanionEvent({type:'tool',tool:'web_search'}).state,'searching');
 assert.equal(mapCompanionEvent({type:'tool',tool:'browser'}).state,'working');
 assert.equal(mapCompanionEvent({type:'approval'}).state,'approval');
 assert.equal(mapCompanionEvent({type:'ui-state',mode:'offline'}).state,'offline');
 assert.equal(mapCompanionEvent({type:'voice-speaking'}).state,'speaking');
 assert.equal(mapCompanionEvent({type:'avatar-visibility-changed'}),null);
 assert.equal(mapCompanionEvent({type:'data-changed'}),null);
});
test('priority, expiry and teardown protect real work from hover reactions',()=>{
 let time=100,ticket=0;
 const tasks=new Map(),changes=[];
 const schedule=(fn)=>{const n=++ticket;tasks.set(n,fn);return n;};
 const cancel=id=>tasks.delete(id);
 const m=new CompanionStateMachine({now:()=>time,schedule,cancel,onChange:(state)=>changes.push(state)});
 assert.equal(m.dispatch({type:'thinking'}),true);
 assert.equal(m.set('greeting',{origin:'preview'}),false);
 assert.equal(m.dispatch({type:'ui-state',mode:'idle'}),true);
 assert.equal(m.set('greeting',{origin:'preview'}),true);
 assert.equal(m.state,'greeting');
 const expiring=[...tasks.values()][0];time=2100;expiring();
 assert.equal(m.state,'idle');
 assert.equal(m.preview('success'),true);
 assert.equal(m.state,'success');
 m.destroy();
 assert.equal(tasks.size,0);
 assert.equal(m.set('thinking'),false);
 assert.ok(changes.includes('idle'));
});
test('greeting cannot replace a blocking approval and error preserves warning',()=>{
 const m=new CompanionStateMachine();
 assert.equal(m.dispatch({type:'approval'}),true);
 assert.equal(m.set('greeting',{origin:'preview'}),false);
 assert.equal(m.state,'approval');
 assert.equal(m.dispatch({type:'error',message:'failed'}),true);
 assert.equal(m.state,'error');
 m.destroy();
});
