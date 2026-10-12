"use strict";
// MARIA Motion Lab prototype. Strictly standalone: no IPC, no external network,
// no credential access, no production app writes. Data is in-memory.
const $=selector=>document.querySelector(selector);
const $$=selector=>[...document.querySelectorAll(selector)];
const escapeHTML=value=>String(value??"").replace(/[&<>"']/g,c=>({"&":"&amp;","<":"&lt;",">":"&gt;",'"':"&quot;","'":"&#39;"}[c]));
const icons={
 home:'<path d="M3 11.5 12 4l9 7.5v8.5H15v-6H9v6H3z"/>',
 chat:'<path d="M5 5h14v11H9l-4 4z"/>',
 shortcuts:'<rect x="3" y="3" width="7" height="7" rx="1.5"/><rect x="14" y="3" width="7" height="7" rx="1.5"/><rect x="3" y="14" width="7" height="7" rx="1.5"/><rect x="14" y="14" width="7" height="7" rx="1.5"/>',
 pins:'<path d="M8 3h8l-1 6 4 4v2h-6v5l-1 2-1-2v-5H5v-2l4-4z"/>',
 reminders:'<circle cx="12" cy="12" r="9"/><path d="M12 7v6l4 2"/>',
 reports:'<rect x="5" y="3" width="14" height="18" rx="2"/><path d="M8.5 9h7M8.5 13h7M8.5 17h5"/>',
 projects:'<rect x="3" y="5" width="18" height="15" rx="2"/><path d="M3 9h18M3 14h18M8 5v15"/>',
 wardrobe:'<path d="M12 3c-1.5 0-3 1-3 3 0 2 3 2 3 4L4 15v5h16v-5l-8-5"/>',
 settings:'<circle cx="12" cy="12" r="3"/><path d="M12 2v3m0 14v3M2 12h3m14 0h3M5 5l2 2m10 10 2 2M19 5l-2 2M7 17l-2 2"/>',
 plus:'<path d="M12 5v14M5 12h14"/>',
 done:'<path d="m4 12 5 5L20 6"/>',
 info:'<circle cx="12" cy="12" r="9"/><path d="M12 11v6M12 7h.01"/>'
};
const icon=name=>'<svg viewBox="0 0 24 24" aria-hidden="true">'+(icons[name]||icons.info)+'</svg>';
const modules=[
 {id:"home",name:"خانه",type:"نمای وضعیت",icon:"home",hint:"وضعیت کارها و عملیات اخیر"},
 {id:"chat",name:"گفت‌وگو",type:"Tool actions",icon:"chat",hint:"پیوست، منابع پاسخ و تایید ابزار"},
 {id:"shortcuts",name:"میانبرها",type:"Drag / Drop",icon:"shortcuts",hint:"انتخاب فایل/برنامه و مسیر اصلی"},
 {id:"pins",name:"پین‌ها",type:"Bookmarks",icon:"pins",hint:"یادداشت‌ها، لینک‌ها و فایل‌های مهم"},
 {id:"reminders",name:"یادآورها",type:"Timeline",icon:"reminders",hint:"زمان‌بندی و تاریخچهٔ اجرای کار"},
 {id:"reports",name:"گزارش‌ها",type:"Evidence",icon:"reports",hint:"منبع داده و وضعیت مدارک"},
 {id:"projects",name:"پروژه‌ها",type:"Workflows",icon:"projects",hint:"مراحل، پیشرفت و تایید کارها"},
 {id:"wardrobe",name:"استودیوی کاراکتر",type:"VRM / VRMA",icon:"wardrobe",hint:"پوشش، نور، حالت و حرکت"},
 {id:"settings",name:"تنظیمات",type:"Permissions",icon:"settings",hint:"وضعیت اتصال و کنترل دسترسی"}
];
const emotionModes={
 idle:{label:"Idle",hint:"آماده و آرام",tone:"166,145,255",status:"آماده",blush:.08,badge:"#6650bd"},
 greeting:{label:"Greeting",hint:"خوشامد کوتاه",tone:"211,168,116",status:"سلام",blush:.21,badge:"#c79256",smile:true},
 listening:{label:"Listening",hint:"در حال شنیدن",tone:"102,197,252",status:"گوش می‌دهد",blush:.10,badge:"#539ad2"},
 thinking:{label:"Thinking",hint:"پردازش اطلاعات",tone:"163,109,255",status:"در حال فکر",blush:.18,badge:"#8a5ade"},
 working:{label:"Working",hint:"انجام یک عملیات",tone:"89,176,255",status:"در حال انجام",blush:.06,badge:"#4a8fd2"},
 uploading:{label:"Uploading",hint:"انتقال در حال انجام",tone:"87,226,201",status:"در حال انتقال",blush:.07,badge:"#3fae99"},
 approval:{label:"Approval",hint:"منتظر تایید",tone:"247,184,88",status:"نیاز به تایید",blush:.10,badge:"#d59b43"},
 success:{label:"Success",hint:"کار با موفقیت بررسی شد",tone:"95,214,169",status:"موفق",blush:.24,badge:"#41a887",smile:true},
 error:{label:"Error",hint:"عملیات ناموفق",tone:"246,103,141",status:"خطا",blush:.30,badge:"#d15c84"},
 question:{label:"Question",hint:"نیاز به اطلاعات بیشتر",tone:"105,197,231",status:"سؤال",blush:.09,badge:"#5d9ec0"},
 sleeping:{label:"Sleeping",hint:"کاهش فعالیت",tone:"132,139,173",status:"استراحت",blush:0,badge:"#5c627f"}
};
let currentModule="home";
let currentEmotion="idle";
let open=false;
let exponent=2.7,gaze=5,power=1,reduceMotion=window.matchMedia("(prefers-reduced-motion: reduce)").matches,animationEnabled=true,colorEnabled=true;
const demoItems=Object.fromEntries(modules.map(m=>[m.id,[]]));
let pointerX=0,pointerY=0,desiredX=0,desiredY=0;
let currentX=0,currentY=0,lastBlink=0,blinkDelay=4700;
let rafId=0,dialogResult=null;
let lastEvent=0;
function note(label){
 const list=$("#eventTrail");const event=document.createElement("div");event.className="event";
 const time=document.createElement("time");time.textContent=new Date().toLocaleTimeString("fa-IR",{hour:"2-digit",minute:"2-digit",second:"2-digit"});
 const name=document.createElement("span");name.textContent=label;event.append(time,name);
 list.prepend(event);while(list.childElementCount>6)list.lastElementChild.remove();
}
function info(message){$("#liveMessage").textContent=message;note(message)}
function superellipse(cx,cy,rx,ry,n){
 const steps=128;let out="";
 for(let i=0;i<=steps;i++){
  const t=Math.PI*2*i/steps,c=Math.cos(t),s=Math.sin(t),e=2/n;
  const x=cx+rx*Math.sign(c)*Math.pow(Math.abs(c),e);
  const y=cy+ry*Math.sign(s)*Math.pow(Math.abs(s),e);
  out+=(i===0?"M":"L")+x.toFixed(2)+" "+y.toFixed(2)+" ";
 }
 return out+"Z";
}
function applyGeometry(){
 $("#bodyPath").setAttribute("d",superellipse(160,144,103,80,exponent));
 $("#innerContour").setAttribute("d",superellipse(160,145,100,76,exponent));
 $("#shapeValue").textContent="n = "+exponent.toFixed(1);
 $("#shapeBadge").textContent="n="+exponent.toFixed(1);
 $("#outputN").textContent=exponent.toFixed(1);
}
function setEmotion(id,{quiet=false}={}){
 if(!emotionModes[id])return;
 currentEmotion=id;
 const s=emotionModes[id];
 $("#avatarScene").dataset.emotion=id;
 $("#emotionLabel").textContent=s.label;
 $("#emotionHint").textContent=s.hint;
 $("#notchStatus").textContent=s.status;
 $("#blushLeft").setAttribute("opacity",String(s.blush||0));
 $("#blushRight").setAttribute("opacity",String(s.blush||0));
 $("#mouth").setAttribute("opacity",s.smile?"1":"0");
 $("#headBadge rect").setAttribute("fill",s.badge);
 const tone=(colorEnabled?s.tone:emotionModes.idle.tone);
 document.documentElement.style.setProperty("--rgb",tone);
 document.documentElement.style.setProperty("--accent","rgb("+tone+")");
 $$(".emotion-btn").forEach(btn=>{
  const active=btn.dataset.emotion===id;
  btn.classList.toggle("active",active);
  btn.setAttribute("aria-pressed",String(active));
 });
 if(!quiet)info("تغییر وضعیت نمونه: "+s.label+" — "+s.hint);
}
function makeNavigation(){
 $("#sections").innerHTML=modules.map(m=>'<button class="section-btn" type="button" data-module="'+m.id+'" aria-label="'+escapeHTML(m.name)+'">'+icon(m.icon)+'<span>'+escapeHTML(m.name)+'</span><small>'+escapeHTML(m.type)+'</small></button>').join("");
 $("#stageQuickActions").innerHTML=modules.filter(m=>["shortcuts","pins","reminders","reports"].includes(m.id)).map(m=>'<button type="button" class="icon-button" data-module="'+m.id+'" aria-label="'+escapeHTML(m.name)+'" title="'+escapeHTML(m.name)+'">'+icon(m.icon)+'</button>').join("");
 $("#notchActions").innerHTML=modules.filter(m=>["chat","shortcuts","settings"].includes(m.id)).map(m=>'<button type="button" class="icon-button" data-module="'+m.id+'" title="'+escapeHTML(m.name)+'" aria-label="'+escapeHTML(m.name)+'">'+icon(m.icon)+'</button>').join("");
 $("#emotionButtons").innerHTML=Object.keys(emotionModes).map(id=>'<button type="button" class="emotion-btn" data-emotion="'+id+'" aria-pressed="false">'+emotionModes[id].label+'</button>').join("");
}
function rowHTML(m,text,description){
 return '<div class="row"><div class="row-icon">'+icon(m.icon)+'</div><div class="row-copy"><b>'+escapeHTML(text)+'</b><small>'+escapeHTML(description)+'</small></div><button class="row-action" type="button" data-info="'+m.id+'">جزئیات</button></div>';
}
function renderModule(){
 const m=modules.find(m=>m.id===currentModule);
 $("#moduleTitle").textContent=m.name;
 $("#moduleSubtitle").textContent=m.hint+" • داده‌های نمونه و غیرواقعی";
 $$(".section-btn").forEach(btn=>{
  const selected=btn.dataset.module===currentModule;
  btn.classList.toggle("active",selected);btn.setAttribute("aria-current",selected?"page":"false");
 });
 const items=demoItems[currentModule];
 const stats=[
  {title:"نوع قابلیت",value:m.type,hint:"ماژول انتخاب‌شده"},
  {title:"آیتم‌های آزمایشی",value:items.length.toLocaleString("fa-IR"),hint:"فقط در همین صفحه"},
  {title:"محیط اجرا",value:"DEMO",hint:"بدون ارتباط با برنامهٔ اصلی"}
 ];
 let html='<div class="info-grid">'+stats.map(x=>'<div class="stat"><small>'+escapeHTML(x.title)+'</small><strong>'+escapeHTML(x.value)+'</strong><span>'+escapeHTML(x.hint)+'</span></div>').join("")+'</div>';
 if(currentModule==="shortcuts"){
  html+='<div id="dropTarget" class="drop-target" role="note">فایل را از Explorer اینجا رها کن تا فقط نام و فرمت آن در نمونه نمایش داده شود؛ هیچ فایلی جابه‌جا یا اجرا نمی‌شود.</div>';
 }
 if(currentModule==="wardrobe"){
  html+='<div class="row"><div class="row-icon">'+icon("wardrobe")+'</div><div class="row-copy"><b>پیش‌نمایش پوشش و حالات</b><small>از منوی سمت راست کلاه و حالت را تغییر بده. بارگذاری VRM در این نمونه فعال نیست.</small></div></div>';
 }
 html+='<div class="list">';
 if(items.length===0){
  html+='<div class="empty">هنوز آیتمی اضافه نشده است. با «+ افزودن» یک نمونه بساز یا فضای کاری دیگری انتخاب کن.</div>';
 }else{
  html+=items.map(item=>rowHTML(m,item.title,item.description||"بدون توضیح")).join("");
 }
 html+='</div>';
 $("#moduleBody").innerHTML=html;
 const target=$("#dropTarget");
 if(target){
  for(const name of ["dragover","dragenter"])target.addEventListener(name,e=>{e.preventDefault();target.classList.add("hovered");});
  target.addEventListener("dragleave",()=>target.classList.remove("hovered"));
  target.addEventListener("drop",e=>{
   e.preventDefault();target.classList.remove("hovered");
   const files=[...e.dataTransfer.files];
   if(!files.length){info("فایلی در رویداد Drop شناسایی نشد");return;}
   for(const file of files.slice(0,10)){
    const suffix=file.name.includes(".")?file.name.slice(file.name.lastIndexOf(".")).toUpperCase():"بدون پسوند";
    demoItems.shortcuts.push({title:file.name,description:"فرمت: "+suffix+" · حجم: "+Intl.NumberFormat("fa-IR").format(file.size)+" بایت · فقط نمونه"});
   }
   renderModule();info(files.length+" فایل صرفاً در لیست نمایشی شناسایی شد");
  });
 }
}
function navigate(id){
 if(!modules.some(x=>x.id===id))return;
 currentModule=id;renderModule();info("ماژول نمونه: "+modules.find(x=>x.id===id).name);
}
function toggleNotch(){
 open=!open;
 $("#notchToggle").setAttribute("aria-expanded",String(open));
 $("#notch").classList.toggle("is-open",open);
 $("#avatarScene").style.opacity=open?"1":".22";
 $("#avatarScene").style.transform=open?"scale(1)":"scale(.95)";
 $("#notchToggle").textContent=open?"M":"M";
 info(open?"پنل نمایشی باز شد":"بازگشت پنل نمونه به حالت کوچک");
}
function openEditor(){
 const m=modules.find(x=>x.id===currentModule);
 $("#editorTitle").textContent="افزودن در "+m.name;
 $("#editorHelp").textContent="فقط برای ارزیابی UI/UX؛ این فرم هیچ داده‌ای در MARIA اصلی ذخیره نمی‌کند.";
 $("#draftTitle").value="";$("#draftDescription").value="";
 $("#editor").showModal();$("#draftTitle").focus();
}
function saveDemoItem(e){
 e.preventDefault();
 const title=$("#draftTitle").value.trim();
 if(!title)return;
 demoItems[currentModule].push({title,description:$("#draftDescription").value.trim()});
 $("#editor").close();renderModule();info("آیتم آزمایشی «"+title+"» ایجاد شد");
}
function pointerMove(e){
 const r=$("#avatar").getBoundingClientRect();
 desiredX=Math.max(-1,Math.min(1,(e.clientX-(r.left+r.width/2))/(r.width/2)));
 desiredY=Math.max(-1,Math.min(1,(e.clientY-(r.top+r.height/2))/(r.height/2)));
}
function updateAvatar(){
 const damping=Math.min(1,power*.16);
 currentX+=(desiredX-currentX)*damping;currentY+=(desiredY-currentY)*damping;
 const tilt=(currentX*3.5*power),gazeX=(currentX*gaze*power),gazeY=(currentY*gaze*.5*power);
 $("#headPose").style.transform=reduceMotion?"":("translate("+(currentX*4*power).toFixed(2)+"px,"+(currentY*2.4*power).toFixed(2)+"px) rotate("+tilt.toFixed(2)+"deg)");
 $("#eyeGroup").style.transform=reduceMotion?"":("translate("+gazeX.toFixed(2)+"px,"+gazeY.toFixed(2)+"px)");
 $("#leftHand").style.transform=reduceMotion?"":("translate("+(currentX*3).toFixed(2)+"px,"+(currentY*2).toFixed(2)+"px)");
 $("#rightHand").style.transform=reduceMotion?"":("translate("+(-currentX*3).toFixed(2)+"px,"+(-currentY*1.4).toFixed(2)+"px)");
 rafId=requestAnimationFrame(updateAvatar);
}
let blinkTimer;
function scheduleBlink(){
 clearTimeout(blinkTimer);
 if(!animationEnabled||reduceMotion||document.hidden)return;
 blinkTimer=setTimeout(()=>{
  $("#avatarScene").classList.add("blinking");
  setTimeout(()=>$("#avatarScene").classList.remove("blinking"),180);
  scheduleBlink();
 },3500+Math.random()*3200);
}
function setReduced(value){
 reduceMotion=Boolean(value);
 document.body.classList.toggle("motion-reduced",reduceMotion);
 $("#motionToggle").textContent="کاهش حرکت: "+(reduceMotion?"روشن":"خاموش");
 $("#motionToggle").setAttribute("aria-pressed",String(reduceMotion));
 if(reduceMotion){desiredX=desiredY=currentX=currentY=0;}
 scheduleBlink();
 info(reduceMotion?"حرکت تزئینی کاهش یافت":"حرکت استاندارد فعال شد");
}
function exportPreset(){
 const payload={
  type:"maria-motion-lab-preset",version:1,
  specification:{reference:"Mochi-inspired, independently authored superellipse",superellipseExponent:exponent,gazePixels:gaze,motionPower:power,defaultState:"idle",reducedMotion:reduceMotion,blink:animationEnabled,tint:colorEnabled,costume:$("#costumePicker").value},
  module:currentModule,emotions:Object.keys(emotionModes),
  notice:"Prototype UI state only. No credentials or personal data.",
 };
 const url=URL.createObjectURL(new Blob([JSON.stringify(payload,null,2)],{type:"application/json"}));
 const a=document.createElement("a");a.href=url;a.download="maria-motion-design-preset.json";a.click();
 setTimeout(()=>URL.revokeObjectURL(url),3000);
 info("فایل تنظیمات طراحی آمادهٔ دریافت شد");
}
function bind(){
 document.addEventListener("click",e=>{
  const module=e.target.closest("[data-module]");
  if(module){navigate(module.dataset.module);return;}
  const emotion=e.target.closest("[data-emotion]");
  if(emotion){setEmotion(emotion.dataset.emotion);return;}
  const infoBtn=e.target.closest("[data-info]");
  if(infoBtn){info("جزئیات دادهٔ آزمایشی؛ عملیات واقعی غیرفعال است");}
 });
 $("#moduleAdd").addEventListener("click",openEditor);
 $("#editorForm").addEventListener("submit",saveDemoItem);
 $("#cancelEditor").addEventListener("click",()=>$("#editor").close());
 $("#notchToggle").addEventListener("click",toggleNotch);
 $("#notch").addEventListener("dblclick",e=>{if(!e.target.closest("button"))toggleNotch();});
 $("#avatarScene").addEventListener("pointermove",pointerMove,{passive:true});
 $("#avatarScene").addEventListener("pointerleave",()=>{desiredX=desiredY=0;});
 $("#shapeN").addEventListener("input",e=>{exponent=+e.target.value;applyGeometry();});
 $("#gazePower").addEventListener("input",e=>{gaze=+e.target.value;$("#outputGaze").textContent=gaze+"px";});
 $("#motionPower").addEventListener("input",e=>{power=+e.target.value;$("#outputPower").textContent=power.toFixed(2)+"×";document.documentElement.style.setProperty("--magnitude",String(1/Math.max(.35,power)));});
 $("#costumePicker").addEventListener("change",e=>{$("#avatarScene").dataset.costume=e.target.value;info("تغییر پوشش نمونه: "+e.target.options[e.target.selectedIndex].text);});
 $("#blinkControl").addEventListener("change",e=>{animationEnabled=e.target.checked;scheduleBlink();});
 $("#colorControl").addEventListener("change",e=>{colorEnabled=e.target.checked;setEmotion(currentEmotion,{quiet:true});});
 $("#motionToggle").addEventListener("click",()=>setReduced(!reduceMotion));
 $("#exportPreset").addEventListener("click",exportPreset);
 document.addEventListener("visibilitychange",()=>{if(document.hidden){clearTimeout(blinkTimer);}else{scheduleBlink();}});
 document.addEventListener("keydown",e=>{if(e.key==="Escape"&&open&&!$("#editor").open)toggleNotch();});
}
function init(){
 makeNavigation();bind();applyGeometry();navigate("home");
 setEmotion("idle",{quiet:true});
 $("#notchToggle").setAttribute("aria-expanded","false");
 $("#avatarScene").style.opacity=".22";
 $("#avatarScene").style.transform="scale(.95)";
 $("#outputGaze").textContent=gaze+"px";
 $("#outputPower").textContent=power.toFixed(2)+"×";
 if(reduceMotion)setReduced(true);else scheduleBlink();
 rafId=requestAnimationFrame(updateAvatar);
 note("آزمایشگاه مستقل راه‌اندازی شد");
}
init();
