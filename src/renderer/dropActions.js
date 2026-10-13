/** Classifies user-dropped paths and links without opening or moving anything.
 * A native Electron getPathForFile result remains the source of truth for files.
 */
export function normalizeDropTarget({path='',url='',name=''}={}){
  const native=String(path||'').trim();
  const candidate=String(url||'').split(/[\r\n]/).map(s=>s.trim()).find(Boolean)||'';
  const website=/^https?:\/\/[a-z0-9][^\s]*$/i.test(candidate)?candidate:'';
  const target=native||website;
  if(!target||target.length>32000)return null;
  // Never interpret a dropped script protocol as a URL or shell instruction.
  if(!native&&(!website||/^https?:\/\/(?:localhost|127\.0\.0\.1)(?:[:/]|$)/i.test(website)))return null;
  const kind=native?'file':'url';
  const label=String(name||'').trim().slice(0,160)||(
    kind==='url'?(()=>{try{return new URL(target).hostname;}catch{return 'لینک';}})():
    target.split(/[\\/]/).filter(Boolean).at(-1)||'فایل'
  );
  return {target,kind,label};
}
export function dropPinPayload(item){
 if(!item?.target)throw new Error('Missing drop target');
 return {type:item.kind==='url'?'url':'file',title:item.label,body:item.target,pinned:true,tags:['MARIA Drop']};
}
export function dropAskPrompt(item){
 if(!item?.target)throw new Error('Missing drop target');
 return 'لطفاً این '+(item.kind==='url'?'لینک':'فایل یا مسیر محلی')+' را بررسی کن و برای انجام کار منتظر دستور بعدی من بمان. اگر به محتوایش دسترسی نداری، صریح بگو. آدرس: '+item.target;
}
