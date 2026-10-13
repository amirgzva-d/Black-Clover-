/** User-facing feature catalog is intentionally evidence-based:
 * never describe a planned third-party integration as installed and working.
 */
export const MARIA_FEATURES=Object.freeze([
 {id:'top-island',label:'جزیره تعاملی',description:'نمای کوچک، گسترده، وضعیت زنده و عملیات واقعی',status:'active',page:'home'},
 {id:'companion',label:'استودیو شخصیت',description:'واکنش‌های حرکتی، لباس‌های قابل تغییر و حالت‌های ابزارها',status:'active',page:'motion'},
 {id:'chat',label:'گفتگو و مدل‌ها',description:'گفتگو، مدل‌های متصل، تنظیمات پاسخ و پیوست فایل',status:'active',action:'chat'},
 {id:'quick-launch',label:'میان‌برهای هوشمند',description:'فایل، لینک، برنامه، شناسایی آیکون و اجرای واقعی',status:'active',page:'shortcuts'},
 {id:'context-drop',label:'رها کردن فایل',description:'انتخاب اقدام واقعی برای فایل یا آدرس رهاشده',status:'active',page:'shortcuts'},
 {id:'reminders',label:'یادآورها و کارهای زمان‌بندی‌شده',description:'ثبت، اجرا، تعویق و پیگیری وضعیت عملیات',status:'active',page:'tasks'},
 {id:'pins',label:'کتابخانه پین‌ها',description:'نگهداری مسیرها، یادداشت‌ها و لینک‌ها',status:'active',page:'pins'},
 {id:'accounting',label:'نظارت حسابداری',description:'مشاهده گزارش Excel و وضعیت تطبیق مدارک',status:'active',page:'reports'},
 {id:'vrm',label:'شخصیت سه‌بعدی VRM',description:'مدل شخصی‌سازی‌شده با حرکت و لباس؛ بهینه‌سازی در جریان است',status:'improving',action:'avatar'},
 {id:'editor-alerts',label:'رویدادهای خارجی IDE و GitHub',description:'اتصال و اعلان مستقیم پروژه‌های کدنویسی نیازمند پیکربندی و تست جداگانه است',status:'planned'},
 {id:'advanced-voice',label:'واکنش صوتی هماهنگ',description:'هماهنگی همه گفتارها و رویدادهای زنده با میمیک پیشرفته به تست یکپارچه بیشتر نیاز دارد',status:'improving'},
 {id:'mobile-app',label:'همراه موبایل',description:'بسته مستقل موبایل در نسخه فعلی ایجاد نشده است',status:'planned'}
]);
export const FEATURE_STATUS=Object.freeze({
 active:'قابل استفاده',improving:'در حال بهبود',planned:'برنامه‌ریزی‌شده'
});
export function filterFeatures(query='',status='all'){
 const text=String(query||'').trim().toLocaleLowerCase('fa');
 return MARIA_FEATURES.filter(x=>(status==='all'||x.status===status)&&
   (!text||[x.label,x.description,x.id,FEATURE_STATUS[x.status]].some(v=>v.toLocaleLowerCase('fa').includes(text))));
}
