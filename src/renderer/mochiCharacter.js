/** Shared vector character. Geometry and accessories are original, resolution independent artwork. */
export const MOCHI_EXPRESSIONS = Object.freeze([
  ['idle','آماده'],['working','در حال کار'],['thinking','فکر کردن'],['searching','جستجو'],['approval','تأیید'],['question','سؤال'],
  ['error','خطا'],['success','انجام شد'],['ratelimit','کمی صبر کن'],['sleeping','خواب'],['dizzy','سرگیجه'],['greeting','سلام'],
  ['affection','محبت'],['surprised','تعجب'],['proud','افتخار'],['wink','چشمک'],['yawn','خمیازه'],['annoyed','دلخوری'],
  ['uploading','بارگذاری'],['dancing','رقص'],['slap','واکنش به لمس'],['shy','خجالت'],['happy','خوشحالی'],['listening','شنیدن'],['speaking','صحبت']
]);
export const MOCHI_OUTFITS = Object.freeze({
 classic:{label:'بدون تجهیزات',en:'Classic',slot:'all'},
 beanie:{label:'کلاه بافتنی',en:'Beanie',slot:'head'},santa:{label:'کلاه زمستانی',en:'Santa hat',slot:'head'},
 party:{label:'کلاه جشن',en:'Party hat',slot:'head'},crown:{label:'تاج طلایی',en:'Crown',slot:'head'},wizard:{label:'کلاه جادوگر',en:'Witch hat',slot:'head'},
 sunglasses:{label:'عینک آفتابی',en:'Sunglasses',slot:'face'},glasses:{label:'عینک گرد',en:'Glasses',slot:'face'},scarf:{label:'شال گردن',en:'Scarf',slot:'neck'},
 pumpkin:{label:'کدو',en:'Pumpkin',slot:'body'},bow:{label:'پاپیون',en:'Bow',slot:'head'},headphones:{label:'هدفون',en:'Headphones',slot:'face'},
 studio:{label:'هدبند',en:'Headband',slot:'head'},night:{label:'کلاه شب',en:'Night cap',slot:'head'}
});
export const MOCHI_PREF_KEY='maria:mochi:appearance:v1';
export function normalizeEquipment(value){
 const result={head:'',face:'',neck:'',body:''};
 if(typeof value==='string'){const item=MOCHI_OUTFITS[value];if(item&&item.slot!=='all')result[item.slot]=value;}
 else if(value&&typeof value==='object')for(const slot of Object.keys(result)){const key=value[slot];if(MOCHI_OUTFITS[key]?.slot===slot)result[slot]=key;}
 return result;
}
export function equipItem(equipment,key){
 const next=normalizeEquipment(equipment),item=MOCHI_OUTFITS[key];if(!item)return next;
 if(key==='classic')return normalizeEquipment(null);
 next[item.slot]=next[item.slot]===key?'':key;return next;
}
export function readAppearance(storage=globalThis.localStorage){try{const v=JSON.parse(storage?.getItem(MOCHI_PREF_KEY)||'null');if(v)return {equipment:normalizeEquipment(v.equipment),motion:['full','subtle','none'].includes(v.motion)?v.motion:'full'};}catch{}
 return null;
}
export function saveAppearance(value,storage=globalThis.localStorage){
 const next={equipment:normalizeEquipment(value.equipment),motion:['full','subtle','none'].includes(value.motion)?value.motion:'full'};
 storage?.setItem(MOCHI_PREF_KEY,JSON.stringify(next));
 if(typeof window!=='undefined')window.dispatchEvent(new CustomEvent('maria:appearance',{detail:next}));return next;
}
export function superellipsePath(n=2.7,rx=70,ry=54,cx=120,cy=126){
 n=Number.isFinite(n)?Math.max(2,Math.min(6,n)):2.7;
 return Array.from({length:128},(_,i)=>{const a=2*Math.PI*i/128,c=Math.cos(a),s=Math.sin(a);return (i?'L':'M')+(cx+rx*Math.sign(c)*Math.abs(c)**(2/n)).toFixed(3)+' '+(cy+ry*Math.sign(s)*Math.abs(s)**(2/n)).toFixed(3);}).join(' ')+' Z';
}
let serial=0;
const star=(x,y,s=1)=>`<path transform="translate(${x} ${y}) scale(${s})" d="M0-8 2-2 8 0 2 2 0 8-2 2-8 0-2-2Z"/>`;
function equipmentSVG(id){return `
 <g class="mochi-gear mochi-gear-beanie"><path d="M51 90Q65 45 120 47Q177 47 189 90Z" fill="url(#${id}-blue)"/><path d="M50 88Q120 102 190 88L189 98Q120 112 51 98Z" fill="#296ac9"/><path d="M62 87Q120 97 179 86" stroke="#8bb7ff" stroke-width="2" fill="none"/><circle cx="120" cy="44" r="10" fill="#f8f8fc"/></g>
 <g class="mochi-gear mochi-gear-santa"><path d="M54 87Q53 22 124 29Q172 28 183 68L169 75Q155 45 148 56Q134 78 150 90Z" fill="url(#${id}-red)"/><path d="M52 85Q120 100 184 85L184 99Q120 116 52 99Z" fill="#faf6f3"/><path d="M55 90Q119 105 181 91" fill="none" stroke="#e2d9d5" stroke-width="4" stroke-dasharray="2 7"/><circle cx="182" cy="74" r="12" fill="#fff"/></g>
 <g class="mochi-gear mochi-gear-party"><path d="M119 23 153 91Q126 102 98 91Z" fill="url(#${id}-pink)"/><path d="M105 75h4m8-34h4m10 27h4m-17 13h4m-6-24h4m14 29h4" stroke="#ffe6b8" stroke-width="4" stroke-linecap="round"/><circle cx="119" cy="23" r="5" fill="#fff0bb"/></g>
 <g class="mochi-gear mochi-gear-crown"><path d="m57 94-6-38 30 22 16-37 24 37 26-36 16 36 27-21-7 37Q121 107 57 94Z" fill="url(#${id}-gold)"/><path d="M61 90Q120 100 178 90" fill="none" stroke="#fff2b6" stroke-width="4"/><path d="m116 89 5-8 5 8-5 7Z" fill="#779ce9"/><circle cx="51" cy="57" r="3" fill="#fff3b2"/><circle cx="97" cy="42" r="3" fill="#fff3b2"/><circle cx="147" cy="43" r="3" fill="#fff3b2"/><circle cx="190" cy="57" r="3" fill="#fff3b2"/></g>
 <g class="mochi-gear mochi-gear-wizard"><ellipse cx="120" cy="91" rx="88" ry="16" fill="#391479"/><ellipse cx="120" cy="87" rx="87" ry="14" fill="url(#${id}-violet)"/><path d="M67 86Q101 34 136 14L159 18 143 29Q140 52 173 86Q128 106 67 86Z" fill="url(#${id}-violet)"/><path d="M77 77Q124 92 165 78L170 87Q122 103 71 86Z" fill="#d49b39"/><rect x="117" y="82" width="13" height="10" rx="2" fill="#f3cb5a"/><rect x="121" y="84" width="6" height="6" rx="1" fill="#593183"/></g>
 <g class="mochi-gear mochi-gear-bow" fill="url(#${id}-pink)"><path d="M158 72 141 58Q134 69 141 80Z M158 72 174 57Q182 71 175 82Z"/><circle cx="158" cy="72" r="5"/></g>
 <g class="mochi-gear mochi-gear-studio"><path d="M53 85Q120 64 188 86L187 99Q120 78 53 99Z" fill="url(#${id}-violet)"/></g>
 <g class="mochi-gear mochi-gear-night"><path d="M58 89Q61 35 139 36L181 66 161 76Q124 61 120 93Z" fill="url(#${id}-blue)"/><path d="M57 87Q105 79 154 91" stroke="#c2d7ef" stroke-width="8" fill="none"/><circle cx="181" cy="69" r="9" fill="#e5edf6"/></g>
 <g class="mochi-gear mochi-gear-headphones" fill="#252633" stroke="#59576b" stroke-width="5"><path d="M53 132V105Q53 61 120 61Q187 61 187 105V132" fill="none" stroke-width="9"/><rect x="44" y="115" width="18" height="37" rx="9"/><rect x="178" y="115" width="18" height="37" rx="9"/></g>
 <g class="mochi-gear mochi-gear-sunglasses" stroke="#15151b" stroke-width="5"><path d="M67 125 90 129M150 129l23-4M110 129q10-7 20 0" fill="none"/><rect x="78" y="118" width="32" height="23" rx="11" fill="#252630"/><rect x="130" y="118" width="32" height="23" rx="11" fill="#252630"/><path d="m85 123 14 10m38-10 14 10" stroke="#62616c" stroke-width="3"/></g>
 <g class="mochi-gear mochi-gear-glasses" fill="none" stroke="#ad874c" stroke-width="4"><circle cx="94" cy="132" r="15"/><circle cx="146" cy="132" r="15"/><path d="M109 130q11-8 22 0m-52 0-14-5m96 5 14-5"/><path d="m85 122 5-3m48 3 5-3" stroke="#fff1bc" stroke-width="2"/></g>
 <g class="mochi-gear mochi-gear-scarf"><path d="M61 164Q120 183 179 164L176 178Q120 198 64 179Z" fill="url(#${id}-red)"/><path d="M79 179 78 207 96 212 99 181" fill="#df4554"/><path d="M79 185h19m-19 11h17M64 171q57 18 114-1" stroke="#fff2df" stroke-width="4"/><path d="M79 207v6m5-4v6m6-4v6m5-3v5" stroke="#fbc5ba" stroke-width="2"/></g>`;}
export function mochiMarkup(){
 const id='maria-mochi-'+(++serial);
 return `<span class="mochi-scene" aria-hidden="true"><svg class="mochi-svg" viewBox="0 0 240 230" focusable="false">
 <defs>
 <radialGradient id="${id}-body" cx="68%" cy="23%" r="83%"><stop stop-color="#fff"/><stop offset=".44" stop-color="#eeedf0"/><stop offset=".84" stop-color="#d6d5d9"/><stop offset="1" stop-color="#aeadb5"/></radialGradient>
 <linearGradient id="${id}-tint" x1=".3" y1="0" x2=".55" y2="1"><stop stop-color="var(--mochi-color)" stop-opacity="0"/><stop offset="1" stop-color="var(--mochi-color)" stop-opacity=".75"/></linearGradient>
 <radialGradient id="${id}-aura"><stop stop-color="var(--mochi-color)" stop-opacity=".23"/><stop offset="1" stop-color="var(--mochi-color)" stop-opacity="0"/></radialGradient>
 <radialGradient id="${id}-shadow"><stop stop-color="#000" stop-opacity=".55"/><stop offset="1" stop-color="#000" stop-opacity="0"/></radialGradient>
 <radialGradient id="${id}-blush"><stop stop-color="#f68da9" stop-opacity=".8"/><stop offset="1" stop-color="#f68da9" stop-opacity="0"/></radialGradient>
 <linearGradient id="${id}-violet" x2=".9" y2="1"><stop stop-color="#a154f6"/><stop offset=".55" stop-color="#7024c4"/><stop offset="1" stop-color="#351070"/></linearGradient>
 <linearGradient id="${id}-gold" x2=".7" y2="1"><stop stop-color="#fff5b2"/><stop offset=".55" stop-color="#e9bd44"/><stop offset="1" stop-color="#a87312"/></linearGradient>
 <linearGradient id="${id}-blue" x2=".6" y2="1"><stop stop-color="#79b6fa"/><stop offset="1" stop-color="#2f65cc"/></linearGradient>
 <linearGradient id="${id}-red" x2=".8" y2="1"><stop stop-color="#ff777a"/><stop offset=".5" stop-color="#e44856"/><stop offset="1" stop-color="#a31e37"/></linearGradient>
 <linearGradient id="${id}-pink" x2=".8" y2="1"><stop stop-color="#ff9dca"/><stop offset="1" stop-color="#d8378f"/></linearGradient>
 <radialGradient id="${id}-pumpkin" cx="65%" cy="20%" r="90%"><stop stop-color="#ffc756"/><stop offset=".6" stop-color="#fb8526"/><stop offset="1" stop-color="#c34e0a"/></radialGradient>
 </defs>
 <ellipse class="mochi-aura" cx="120" cy="132" rx="118" ry="100" fill="url(#${id}-aura)"/>
 <ellipse class="mochi-floor" cx="120" cy="201" rx="62" ry="10" fill="url(#${id}-shadow)"/>
 <ellipse class="mochi-orbit" cx="120" cy="123" rx="97" ry="79" fill="none" stroke="var(--mochi-color)" stroke-width=".6"/>
 <g class="mochi-float"><g class="mochi-tilt">
 <g class="mochi-hand mochi-hand-left"><ellipse cx="40" cy="150" rx="12" ry="11" fill="url(#${id}-body)"/></g>
 <g class="mochi-hand mochi-hand-right"><ellipse cx="201" cy="108" rx="12" ry="11" fill="url(#${id}-body)"/></g>
 <path class="mochi-body" d="${superellipsePath()}" fill="url(#${id}-body)"/>
 <path class="mochi-tint" d="${superellipsePath()}" fill="url(#${id}-tint)"/>
 <g class="mochi-pumpkin"><path d="${superellipsePath(2.7,70,54)}" fill="url(#${id}-pumpkin)"/><path d="M86 81Q62 124 86 172M155 81Q178 125 155 172M109 77Q99 123 109 178M131 77Q143 123 131 178" stroke="#b65b15" stroke-opacity=".3" stroke-width="2" fill="none"/><path d="M118 73q-4-15 8-19l4 4q-7 6-5 16" fill="#64943f"/></g>
 <path class="mochi-upload-slot" d="M64 76H176Q180 76 178 82L174 88H66L62 82Q60 76 64 76Z" fill="#14151b"/>
 <g class="mochi-look"><ellipse class="mochi-cheek" cx="79" cy="147" rx="17" ry="9" fill="url(#${id}-blush)"/><ellipse class="mochi-cheek" cx="161" cy="147" rx="17" ry="9" fill="url(#${id}-blush)"/>
 <g class="mochi-eyes mochi-eyes-dots" fill="#181619"><ellipse cx="94" cy="133" rx="5.5" ry="7"/><ellipse cx="146" cy="133" rx="5.5" ry="7"/></g>
 <g class="mochi-eyes mochi-eyes-smile" fill="none" stroke="#201c20" stroke-width="5" stroke-linecap="round"><path d="M83 135q11-19 22 0M135 135q11-19 22 0"/></g>
 <g class="mochi-eyes mochi-eyes-flat" fill="none" stroke="#201c20" stroke-width="5" stroke-linecap="round"><path d="M88 133h12m40 0h12"/></g>
 <g class="mochi-eyes mochi-eyes-sleep" fill="none" stroke="#201c20" stroke-width="4" stroke-linecap="round"><path d="M86 132q8 12 16 0m36 0q8 12 16 0"/></g>
 <g class="mochi-eyes mochi-eyes-wink" fill="#181619" stroke="#201c20" stroke-width="4" stroke-linecap="round"><ellipse cx="94" cy="133" rx="5" ry="7" stroke="none"/><path d="M136 135q10-16 20 0" fill="none"/></g>
 <g class="mochi-eyes mochi-eyes-heart" fill="#f1428b"><path d="M94 145C68 132 82 114 94 126C106 114 120 132 94 145ZM146 145C120 132 134 114 146 126C158 114 172 132 146 145Z"/></g>
 <g class="mochi-eyes mochi-eyes-dizzy" fill="none" stroke="#322335" stroke-width="2.5" stroke-linecap="round"><path d="M94 135c-9 0-9-12 0-12s12 18 0 18-17-26 0-26 19 31 3 33M146 135c-9 0-9-12 0-12s12 18 0 18-17-26 0-26 19 31 3 33"/></g>
 <g class="mochi-eyes mochi-eyes-angry" fill="none" stroke="#201c20" stroke-width="4" stroke-linecap="round"><path d="m84 131 18 4m36 0 18-4"/></g>
 <ellipse class="mochi-yawn" cx="120" cy="153" rx="6" ry="8" fill="#3d2c39"/>
 </g>
 ${equipmentSVG(id)}
 <g class="mochi-badge"><rect class="mochi-badge-pill" x="48" y="66" width="45" height="24" rx="12" fill="var(--mochi-color)" stroke="#14151d" stroke-width="4"/><g class="mochi-badge-dots" fill="#fff"><circle cx="59" cy="78" r="3.5"/><circle cx="70.5" cy="78" r="3.5"/><circle cx="82" cy="78" r="3.5"/></g><circle class="mochi-badge-orb" cx="62" cy="78" r="11" fill="var(--mochi-color)" stroke="#14151d" stroke-width="4"/><text class="mochi-badge-label" x="62" y="82.5" text-anchor="middle" fill="#13151a" font-family="Arial" font-size="15" font-weight="700">!</text></g>
 </g></g>
 <g class="mochi-sparks" fill="#ddfff2">${Array.from({length:7},(_,i)=>`<g style="--i:${i}">${star(80+i*12,60-(i%3)*12,.4+(i%2)*.2)}</g>`).join('')}</g>
 <g class="mochi-hearts" fill="#ef4c92">${Array.from({length:5},(_,i)=>`<path style="--i:${i}" transform="translate(${93+i*12} ${59-i%3*13}) scale(.45)" d="M0 10C-30-6-13-25 0-12C13-25 30-6 0 10Z"/>`).join('')}</g>
 <g class="mochi-file"><path d="M109 26h18l8 9v28h-26Z" fill="#f8f5f9"/><path d="M127 26v10h8" fill="#9aa4b8"/><path d="M114 49h15" stroke="#e882b1" stroke-width="4"/></g>
 </svg></span>`;
}
export function mountMochi(view,{state='idle',equipment='classic',motion='full',track=true}={}){
 if(!view)return null;
 view.classList.add('mochi-ready');
 if(!view.querySelector(':scope > .mochi-scene'))view.insertAdjacentHTML('beforeend',mochiMarkup());
 view.dataset.mochiMotion=motion;
 renderMochi(view,state);applyMochiEquipment(view,equipment);
 if(track&&!view._mochiCleanup){
  let frame=0,last;
  const move=e=>{last=e;if(frame)return;frame=requestAnimationFrame(()=>{frame=0;const r=view.getBoundingClientRect();if(!r.width)return;const x=Math.max(-1,Math.min(1,(last.clientX-r.x-r.width/2)/(r.width/2))),y=Math.max(-1,Math.min(1,(last.clientY-r.y-r.height/2)/(r.height/2)));view.style.setProperty('--mochi-look-x',x*7+'px');view.style.setProperty('--mochi-look-y',y*4+'px');view.style.setProperty('--mochi-tilt',x*4+'deg');});};
  const leave=()=>{view.style.setProperty('--mochi-look-x','0px');view.style.setProperty('--mochi-look-y','0px');view.style.setProperty('--mochi-tilt','0deg');};
  view.addEventListener('pointermove',move);view.addEventListener('pointerleave',leave);
  view._mochiCleanup=()=>{cancelAnimationFrame(frame);view.removeEventListener('pointermove',move);view.removeEventListener('pointerleave',leave);delete view._mochiCleanup;};
 }
 return view;
}
export function applyMochiEquipment(view,equipment){
 if(!view)return;const next=normalizeEquipment(equipment);for(const [slot,key]of Object.entries(next))view.dataset['mochi'+slot[0].toUpperCase()+slot.slice(1)]=key;
}
export function renderMochi(view,state='idle',scene=null){
 if(!view)return;view.dataset.mochiState=scene==='wink'?'wink':state;
 const color={working:'#57aeef',searching:'#ae76ed',thinking:'#a576ee',approval:'#efb642',question:'#52d4d9',error:'#e86086',success:'#62dca7',proud:'#63dfb4',affection:'#66d8b2',shy:'#cb9ce7',dizzy:'#e694c7',ratelimit:'#e8a65f',uploading:'#68d6ba',listening:'#55d9df',speaking:'#ad9eef'}[state]||'#e2e1e8';
 view.style.setProperty('--mochi-color',color);
 const label=view.querySelector('.mochi-badge-label');if(label)label.textContent=state==='question'?'?':'!';
 const body=view.querySelector('.mochi-body'),tint=view.querySelector('.mochi-tint');
 const shape=state==='uploading'?superellipsePath(4.5,59,63,120,125):superellipsePath();
 body?.setAttribute('d',shape);tint?.setAttribute('d',shape);
}
export function destroyMochi(view){view?._mochiCleanup?.();}
