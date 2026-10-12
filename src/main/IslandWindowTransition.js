/** Native-window morph planner. Pure interpolation + cancellable frame driver.
 * Coordinates are in DIP, so Windows DPI scaling is handled by Electron.
 * No rendering timer survives an interrupted transition.
 */
export function cubicEaseOut(t){const v=Math.max(0,Math.min(1,Number(t)||0));return 1-Math.pow(1-v,3);}
export function interpolateIslandBounds(from,to,ratio){
 const t=cubicEaseOut(ratio),result={};
 for(const key of ['x','y','width','height'])result[key]=Math.round(from[key]+(to[key]-from[key])*t);
 return result;
}
export function clampIslandBounds(bounds,area){
 const b={...bounds},a={...area};
 b.width=Math.max(1,Math.min(Math.round(b.width),Math.round(a.width)));
 b.height=Math.max(1,Math.min(Math.round(b.height),Math.round(a.height)));
 b.x=Math.round(Math.min(Math.max(b.x,a.x),a.x+a.width-b.width));
 b.y=Math.round(Math.min(Math.max(b.y,a.y),a.y+a.height-b.height));
 return b;
}
export function createIslandTransition({apply,now=()=>Date.now(),
 schedule=(fn,ms)=>setTimeout(fn,ms),cancel=id=>clearTimeout(id),isReduced=()=>false,
 duration=270,steps=13}={}){
 if(typeof apply!=='function')throw new TypeError('apply must be a function');
 let generation=0,handle=null,active=false,finish=null;
 const stop=()=>{generation++;if(handle!=null)cancel(handle);handle=null;active=false;if(finish){finish(null);finish=null;}};
 const morph=(start,target,{instant=false}={})=>{
  stop();const mine=generation;
  if(instant||isReduced()||duration<=0||['x','y','width','height'].every(k=>start[k]===target[k])){
   apply({...target});return Promise.resolve({...target});
  }
  const begin=now();active=true;
  return new Promise(resolve=>{
   finish=resolve;
   const step=()=>{
    if(mine!==generation){resolve(null);return;}
    const ratio=Math.min(1,(now()-begin)/duration);
    const out=interpolateIslandBounds(start,target,ratio);
    apply(out);
    if(ratio>=1){active=false;handle=null;finish=null;apply({...target});resolve({...target});return;}
    handle=schedule(step,Math.max(12,Math.round(duration/steps)));
   };
   step();
  });
 };
 return {morph,stop,get active(){return active;}};
}
