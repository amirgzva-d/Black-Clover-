import test from 'node:test';
import assert from 'node:assert/strict';
import { IslandHoverController } from '../src/renderer/islandHoverController.js';

function clock(){
  let now=0,next=0;const jobs=new Map();
  return {
    schedule(fn,delay){const id=++next;jobs.set(id,{when:now+delay,fn});return id;},
    unschedule(id){jobs.delete(id);},
    tick(ms){
      const until=now+ms;
      for(;;){
        const due=[...jobs.entries()].filter(([,j])=>j.when<=until).sort((a,b)=>a[1].when-b[1].when)[0];
        if(!due)break;
        now=due[1].when;jobs.delete(due[0]);due[1].fn();
      }
      now=until;
    },
    count(){return jobs.size;}
  };
}
function fixture({collapseDelay=2800}={}){
  const timer=clock();
  let mode='peek',pinned=false,protectedUi=false,page='home';
  const updates=[];
  const machine=new IslandHoverController({
    getMode:()=>mode,getPinned:()=>pinned,
    setPinned:x=>{pinned=x;updates.push(['pin',x]);},
    setMode:x=>{mode=x;updates.push(['mode',x]);},
    selectModule:(id)=>{page=id;mode='expanded';updates.push(['page',id]);},
    isProtected:()=>protectedUi,getCollapseDelay:()=>collapseDelay,
    schedule:timer.schedule,unschedule:timer.unschedule
  });
  return {machine,timer,updates,get mode(){return mode;},get pinned(){return pinned;},
    get page(){return page;},set protected(x){protectedUi=x;},set mode(x){mode=x;}};
}
test('hovering on the small island opens only rectangular preview',()=>{
  const x=fixture();x.machine.enter();x.timer.tick(119);assert.equal(x.mode,'peek');
  x.timer.tick(1);assert.equal(x.mode,'preview');
  assert.ok(!x.updates.some(([type])=>type==='page'));
  x.machine.leave();x.timer.tick(2799);assert.equal(x.mode,'preview');
  x.timer.tick(1);assert.equal(x.mode,'peek');
});
test('hovering a module opens its page without requiring click',()=>{
  const x=fixture();x.machine.enter();x.timer.tick(120);
  x.machine.hoverModule('shortcuts');x.timer.tick(84);assert.equal(x.mode,'preview');
  x.timer.tick(1);assert.equal(x.mode,'expanded');assert.equal(x.page,'shortcuts');assert.equal(x.pinned,false);
  x.machine.leave();x.timer.tick(180);assert.equal(x.mode,'preview');
  x.timer.tick(2800);assert.equal(x.mode,'peek');
});
test('clicking the small bar fixes the preview; clicking again releases it',()=>{
  const x=fixture();x.machine.togglePin();assert.equal(x.mode,'preview');assert.equal(x.pinned,true);
  x.machine.leave();x.timer.tick(30000);assert.equal(x.mode,'preview');
  x.machine.togglePin();assert.equal(x.pinned,false);x.timer.tick(2800);assert.equal(x.mode,'peek');
});
test('clicking a module fixes the expanded page',()=>{
  const x=fixture();x.machine.clickModule('pins');assert.equal(x.mode,'expanded');
  assert.equal(x.page,'pins');assert.equal(x.pinned,true);
  x.machine.leave();x.timer.tick(60000);assert.equal(x.mode,'expanded');
});
test('rapid pointer re-entry cancels unpinned closure',()=>{
  const x=fixture();x.machine.enter();x.timer.tick(120);x.machine.leave();
  x.timer.tick(2300);x.machine.enter();x.timer.tick(3000);
  assert.equal(x.mode,'preview');
});
test('dialogs and keyboard input postpone auto collapse',()=>{
  const x=fixture();x.machine.enter();x.timer.tick(120);
  x.protected=true;x.machine.leave();x.timer.tick(2800);
  assert.equal(x.mode,'preview');
  x.protected=false;x.timer.tick(700);
  assert.equal(x.mode,'peek');
});
test('disabled close delay does not hide an unpinned preview',()=>{
  const x=fixture({collapseDelay:0});x.machine.enter();x.timer.tick(120);x.machine.leave();
  x.timer.tick(100000);assert.equal(x.mode,'preview');
});
test('pending icon hover is cancelled on mouse exit',()=>{
  const x=fixture();x.machine.enter();x.timer.tick(120);
  x.machine.hoverModule('tasks');x.timer.tick(30);x.machine.leave();x.timer.tick(6000);
  assert.notEqual(x.page,'tasks');
  assert.equal(x.mode,'peek');
});
