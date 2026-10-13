import test from 'node:test';
import assert from 'node:assert/strict';
import {FILM_1030_DURATION,FILM_1030_SHOTS,FILM_1030_SCENES,frameForFilm1030,
  createFilm1030Timeline} from '../src/renderer/companionFilm1030.js';
import {COMPANION_STATES,CompanionStateMachine,mapCompanionEvent} from '../src/renderer/companionMotion.js';

test('1030 reference is a 12.1-second, time-ordered original motion storyboard',()=>{
 assert.equal(FILM_1030_DURATION,12100);
 assert.equal(FILM_1030_SHOTS[0].at,0);
 assert.ok(FILM_1030_SHOTS.length>=11);
 assert.ok(FILM_1030_SHOTS.every((s,i)=>i===0||s.at>FILM_1030_SHOTS[i-1].at));
 for(const s of FILM_1030_SHOTS)assert.ok(COMPANION_STATES[s.state],s.state);
});
test('shot markers match the user reference: greeting, blush, working, warning, mint, heart, recovery',()=>{
 assert.equal(frameForFilm1030(0).state,'idle');
 assert.equal(frameForFilm1030(900).state,'greeting');
 assert.equal(frameForFilm1030(2600).state,'shy');
 assert.equal(frameForFilm1030(3150).state,'thinking');
 assert.equal(frameForFilm1030(4900).state,'working');
 assert.equal(frameForFilm1030(5900).state,'approval');
 assert.equal(frameForFilm1030(7800).state,'success');
 assert.equal(frameForFilm1030(9400).state,'affection');
 assert.equal(frameForFilm1030(10800).state,'idle');
 assert.equal(frameForFilm1030(12000).state,'idle');
 assert.equal(FILM_1030_SCENES.affection,'affection');
});
test('preview scheduler is replayable, interruptible, and never leaves orphaned handlers',()=>{
 let nextId=0;const callbacks=new Map(),seen=[];let ends=0;
 const p=createFilm1030Timeline({
  onFrame:s=>seen.push(s),onEnd:()=>ends++,
  schedule:(fn,ms)=>{const id=++nextId;callbacks.set(id,{fn,ms});return id;},
  cancel:id=>callbacks.delete(id)
 });
 p.play();
 assert.equal(p.running,true);
 assert.equal(p.queued,FILM_1030_SHOTS.length+1);
 const before=callbacks.size;p.play();assert.equal(callbacks.size,before);
 for(const [id,entry] of [...callbacks].sort((a,b)=>a[1].ms-b[1].ms)){callbacks.delete(id);entry.fn();}
 assert.equal(ends,1);
 assert.equal(p.running,false);
 assert.ok(seen.some(s=>s.scene==='affection'));
 p.play();p.stop();
 assert.equal(callbacks.size,0);
 assert.equal(p.queued,0);
 assert.equal(seen.at(-1).state,'idle');
});
test('the video preview does not create a backend verified-success event',()=>{
 const m=new CompanionStateMachine();
 assert.equal(mapCompanionEvent({type:'tool',tool:'editor'}).state,'working');
 assert.equal(mapCompanionEvent({type:'success',verified:false}).state,'working');
 assert.equal(mapCompanionEvent({type:'success',verified:true}).state,'success');
 assert.equal(m.dispatch({type:'ui-state',mode:'working'}),true);
 assert.equal(m.state,'working');
 // Showing an affection shot in a separate preview cannot change live state.
 frameForFilm1030(9500);
 assert.equal(m.state,'working');
 m.destroy();
});
