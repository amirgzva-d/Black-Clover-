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
      while(true){
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
  const history=[];
  const machine=new IslandHoverController({
    getMode:()=>mode,getPinned:()=>pinned,
    setMode:x=>{mode=x;history.push(['mode',x]);},
    setPinned:x=>{pinned=x;history.push(['pin',x]);},
    selectModule:x=>{page=x;mode='expanded';history.push(['page',x]);},
    isProtected:()=>protectedUi,getCollapseDelay:()=>delay,
    schedule:timers.schedule,unschedule:timers.unschedule
  });
  return {timers,machine,history,get mode(){return mode},get pinned(){return pinned},get page(){return page},
    set protected(value){protectedUi=value}};
}
test('default mini waits for 180ms real hover before reference rectangle',()=>{
  const x=fixture();assert.equal(x.mode,'peek');x.machine.enter();
  x.timers.tick(179);assert.equal(x.mode,'peek');
  x.timers.tick(1);assert.equal(x.mode,'preview');assert.equal(x.page,'home');
});
test('no interaction for 5 seconds returns preview to mini even while mouse is stationary',()=>{
  const x=fixture();x.machine.enter();x.timers.tick(180);x.timers.tick(4999);
  assert.equal(x.mode,'preview');x.timers.tick(1);assert.equal(x.mode,'peek');
  x.machine.enter();x.timers.tick(1000);assert.equal(x.mode,'peek','no synthetic re-open while cursor stays');
  x.machine.leave();x.machine.enter();x.timers.tick(180);assert.equal(x.mode,'preview');
});
test('user interaction resets the five-second timer',()=>{
  const x=fixture();x.machine.enter();x.timers.tick(180);x.timers.tick(4000);
  x.machine.activity();x.timers.tick(4999);assert.equal(x.mode,'preview');
  x.timers.tick(1);assert.equal(x.mode,'peek');
});
test('hover over an icon does not navigate; click reveals module details',()=>{
  const x=fixture();x.machine.enter();x.timers.tick(180);
  x.timers.tick(200);assert.equal(x.page,'home');
  x.machine.clickModule('shortcuts');
  assert.equal(x.mode,'expanded');assert.equal(x.page,'shortcuts');assert.equal(x.pinned,true);
});
test('clicking a rectangle keeps it open, but 5 seconds of no use returns mini',()=>{
  const x=fixture();x.machine.enter();x.timers.tick(180);x.machine.pinPreview();
  assert.equal(x.pinned,true);x.machine.leave();
  x.timers.tick(4999);assert.equal(x.mode,'preview');
  x.timers.tick(1);assert.equal(x.mode,'peek');assert.equal(x.pinned,false);
});
test('clicking the avatar in preview immediately closes the panel',()=>{
  const x=fixture();x.machine.enter();x.timers.tick(180);x.machine.pinPreview();
  x.machine.clickCharacter();assert.equal(x.mode,'peek');assert.equal(x.pinned,false);
  x.machine.enter();x.timers.tick(1000);assert.equal(x.mode,'peek');
  x.machine.leave();x.machine.enter();x.timers.tick(180);assert.equal(x.mode,'preview');
});
test('clicking avatar in expanded details returns to mini without hiding its saved data',()=>{
  const x=fixture();x.machine.clickModule('pins');assert.equal(x.page,'pins');
  x.machine.clickCharacter();assert.equal(x.mode,'peek');assert.equal(x.pinned,false);
  assert.equal(x.page,'pins');
});
test('click on a mini avatar can explicitly open and pin the rectangle',()=>{
  const x=fixture();x.machine.clickCharacter();assert.equal(x.mode,'preview');
  assert.equal(x.pinned,true);x.timers.tick(5000);assert.equal(x.mode,'peek');
});
test('clicking a module while pinned refreshes timeout for the opened information',()=>{
  const x=fixture();x.machine.clickModule('tasks');x.timers.tick(4800);
  x.machine.activity();x.timers.tick(4999);assert.equal(x.mode,'expanded');
  x.timers.tick(1);assert.equal(x.mode,'peek');assert.equal(x.pinned,false);
});
test('focus or open dialogs protect work against inactivity collapse',()=>{
  const x=fixture();x.machine.enter();x.timers.tick(180);x.protected=true;
  x.timers.tick(5000);assert.equal(x.mode,'preview');
  x.protected=false;x.timers.tick(700);assert.equal(x.mode,'peek');
});
test('leaving during opening prevents the preview from opening',()=>{
  const x=fixture();x.machine.enter();x.timers.tick(60);x.machine.leave();
  x.timers.tick(20000);assert.equal(x.mode,'peek');
});
test('leaving and re-entering does not dismiss an actively used panel',()=>{
  const x=fixture();x.machine.enter();x.timers.tick(180);x.machine.leave();
  x.timers.tick(3000);x.machine.enter();x.machine.activity();
  x.timers.tick(3000);assert.equal(x.mode,'preview');
});
test('disabled collapse option is still supported',()=>{
  const x=fixture({delay:0});x.machine.enter();x.timers.tick(180);
  x.machine.leave();x.timers.tick(60000);assert.equal(x.mode,'preview');
});
