import test from 'node:test';
import assert from 'node:assert/strict';
import {IslandHoverController} from '../src/renderer/islandHoverController.js';

function clock(){
  let now=0,next=0;const tasks=new Map();
  return {
    schedule(fn,ms){const id=++next;tasks.set(id,{at:now+ms,fn});return id;},
    unschedule(id){tasks.delete(id);},
    tick(ms){
      const end=now+ms;
      for(;;){
        const due=[...tasks.entries()].filter(([,t])=>t.at<=end).sort((a,b)=>a[1].at-b[1].at)[0];
        if(!due)break;
        now=due[1].at;tasks.delete(due[0]);due[1].fn();
      }
      now=end;
    }
  };
}
function fixture({delay=5000}={}){
  const timers=clock();let mode='peek',pinned=false,protectedUi=false,page='home';
  const machine=new IslandHoverController({
    getMode:()=>mode,getPinned:()=>pinned,
    setMode:x=>{mode=x;},setPinned:x=>{pinned=x;},
    selectModule:x=>{page=x;mode='expanded';},
    isProtected:()=>protectedUi,getCollapseDelay:()=>delay,
    schedule:timers.schedule,unschedule:timers.unschedule
  });
  return {timers,machine,get mode(){return mode},get pinned(){return pinned},get page(){return page},
    set protected(value){protectedUi=value}};
}
test('mini character follows mouse but pointer hold never opens its panel',()=>{
  const x=fixture();
  x.machine.enter();x.timers.tick(12000);x.machine.activity();x.timers.tick(5000);
  assert.equal(x.mode,'peek');assert.equal(x.page,'home');
});
test('clicking mini character shows pinned reference rectangle',()=>{
  const x=fixture();x.machine.enter();x.machine.clickCharacter();
  assert.equal(x.mode,'preview');assert.equal(x.pinned,true);
});
test('click on blank mini/preview shows or pins the panel',()=>{
  const x=fixture();x.machine.enter();x.machine.pinPreview();assert.equal(x.mode,'preview');
  x.machine.togglePin();assert.equal(x.pinned,false);
  x.machine.pinPreview();assert.equal(x.pinned,true);
});
test('hover on module only greets; deliberate click opens actual module',()=>{
  const x=fixture();x.machine.enter();x.timers.tick(5000);
  assert.equal(x.mode,'peek');x.machine.pinPreview();x.timers.tick(500);
  assert.equal(x.page,'home');x.machine.clickModule('shortcuts');
  assert.equal(x.mode,'expanded');assert.equal(x.page,'shortcuts');
});
test('five seconds of inactivity collapses pinned panel and opened module',()=>{
  const x=fixture();x.machine.pinPreview();x.machine.leave();
  x.timers.tick(4999);assert.equal(x.mode,'preview');
  x.timers.tick(1);assert.equal(x.mode,'peek');assert.equal(x.pinned,false);
  x.machine.clickModule('pins');x.timers.tick(5000);assert.equal(x.mode,'peek');
});
test('mouse movement during open panel resets idle timer',()=>{
  const x=fixture();x.machine.pinPreview();x.timers.tick(4700);
  x.machine.activity();x.timers.tick(4999);assert.equal(x.mode,'preview');
  x.timers.tick(1);assert.equal(x.mode,'peek');
});
test('character closes expanded details without deleting selected page',()=>{
  const x=fixture();x.machine.clickModule('tasks');x.machine.clickCharacter();
  assert.equal(x.mode,'peek');assert.equal(x.page,'tasks');assert.equal(x.pinned,false);
});
test('after closing by character, hover alone does not reopen',()=>{
  const x=fixture();x.machine.clickCharacter();x.machine.clickCharacter();
  x.machine.enter();x.timers.tick(30000);assert.equal(x.mode,'peek');
  x.machine.leave();x.machine.enter();x.timers.tick(700);assert.equal(x.mode,'peek');
});
test('open modal or keyboard focus protects existing data against idle collapse',()=>{
  const x=fixture();x.machine.pinPreview();x.protected=true;
  x.timers.tick(5000);assert.equal(x.mode,'preview');
  x.protected=false;x.timers.tick(700);assert.equal(x.mode,'peek');
});
test('leaving mini without click never shows rectangle',()=>{
  const x=fixture();x.machine.enter();x.machine.leave();x.timers.tick(60000);
  assert.equal(x.mode,'peek');
});
test('no auto-close option remains available',()=>{
  const x=fixture({delay:0});x.machine.pinPreview();x.timers.tick(60000);
  assert.equal(x.mode,'preview');
});
test('escape or outside click can collapse expanded immediately',()=>{
  const x=fixture();x.machine.clickModule('settings');
  x.machine.collapseNow();assert.equal(x.mode,'peek');assert.equal(x.pinned,false);
});
