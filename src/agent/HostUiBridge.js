let hostEmitter=()=>{};
export function setHostUiEmitter(fn){hostEmitter=typeof fn==='function'?fn:()=>{};}
export function emitHostUi(event){hostEmitter(event);return event;}
