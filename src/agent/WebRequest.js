const normalize = value => String(value || '').normalize('NFKC').replace(/ي/g,'ی').replace(/ك/g,'ک').replace(/\u200c/g,' ').replace(/\s+/g,' ').trim();
export const SITE_DOMAINS = Object.freeze({
  github:'github.com', 'گیت هاب':'github.com', گیتهاب:'github.com',
  wikipedia:'wikipedia.org', 'ویکی پدیا':'wikipedia.org', ویکیپدیا:'wikipedia.org',
  youtube:'youtube.com', یوتیوب:'youtube.com', instagram:'instagram.com', اینستاگرام:'instagram.com',
  digikala:'digikala.com', 'دیجی کالا':'digikala.com', دیجیکالا:'digikala.com',
  stackoverflow:'stackoverflow.com', microsoft:'microsoft.com', مایکروسافت:'microsoft.com',
  openai:'openai.com', 'اوپن ای آی':'openai.com', 'اوپن ای':'openai.com', اوپنای:'openai.com',
  'فولاد مهاجر':'mohajer-steel.com','مهاجر استیل':'mohajer-steel.com','mohajer steel':'mohajer-steel.com','mohajer-steel':'mohajer-steel.com'
});
export function siteDomain(site) {
  const value=normalize(site).toLowerCase();
  if(SITE_DOMAINS[value])return SITE_DOMAINS[value];
  try {const url=new URL(value.includes('://')?value:'https://'+value);return /^(?:[a-z0-9-]+\.)+[a-z]{2,}$/i.test(url.hostname)?url.hostname.replace(/^www\./,''):'';}catch{return '';}
}
const searchVerb=/(?:سرچ(?:ش)?|جستجو|جستوجو|جست و جو|تحقیق)(?:\s*کن)?|بگرد(?:\s+دنبال)?|پیدا(?:ش)?\s*کن|گوگلش\s*کن/i;
const otherAction=/(?:و\s+بعد|بعدش|سپس|[؛;،,])\s*(?:(?:صدا|نور|روشنایی|نوت پد|تلگرام|واتساپ|روبیکا|فایل|پوشه).*?(?:کن|ببند|بفرست)|(?:نصب|حذف|خاموش|ارسال|بفرست|ذخیره|کپی))/i;
export function parseWebRequest(input) {
  const text=normalize(input);if(!text||otherAction.test(text))return null;
  const website=/سایت|وب ?سایت|website/i.test(text);
  if(!searchVerb.test(text)&&!(website&&/(?:باز(?:ش)? کن|بیار(?:ش)?|بیاور|برو)/i.test(text)))return null;
  if(/(?:فایل|پوشه|فولدر).*(?:سیستم|کامپیوتر|دسکتاپ|درایو|به نام)|(?:از|روی|توی|داخل)\s+(?:دسکتاپ|درایو|کامپیوتر)/i.test(text))return null;
  const engine=/یوتیوب|youtube/i.test(text)?'youtube':/گوگل|google|کروم|chrome/i.test(text)?'google':'';
  const directNamedSite=text.match(/(?:سایت|وب ?سایت|website)\s+(?:رسمی\s+)?(.+?)(?=\s+(?:رو|را)?\s*(?:(?:در|تو|توی)\s+(?:گوگل|google|کروم|chrome)|(?:خود\s+)?سایت(?:ش)?|باز(?:ش)?\s*کن|بیار(?:ش)?|برو)(?:\s|$))/i);
  if(directNamedSite&&(/(?:خود\s+سایت|سایت(?:ش|شو))/i.test(text)||/(?:سایت|وب ?سایت|website).{1,120}?(?:باز(?:ش)?\s*کن|برو)(?:\s|$)/i.test(text))){
    const identifier=directNamedSite[1].replace(/\s+(?:رو|را)$/i,'').trim();
    if(identifier)return {mode:'website',query:identifier,site:identifier,domain:siteDomain(identifier),engine};
  }
  let query=text
    .replace(/^(?:(?:لطفاً?|حتماً?|برام|برای من|می شه|میشه|برو|فقط)\s+)+/i,'')
    .replace(/^(?:(?:تو|توی|در|از)\s+)?(?:گوگل|google|کروم|chrome|یوتیوب|youtube)\s*/i,'')
    .replace(/^(?:سرچ(?:ش)?|جستجو|جستوجو|جست و جو|تحقیق)(?:\s*کن)?\s*/i,'')
    .replace(/^بگرد\s+(?:دنبال\s+)?|^پیدا(?:ش)?\s*کن\s+|^گوگلش\s*کن\s+/i,'')
    .replace(/\s+(?:تو|توی|در|از)\s+(?:گوگل|google|کروم|chrome|یوتیوب|youtube)(?=\s+(?:سرچ|جستجو|بگرد)|$)/i,' ')
    .replace(/\s+(?:رو|را)?\s*(?:سرچ(?:ش)?|جستجو|جستوجو|جست و جو|تحقیق)(?:\s*کن)?(?:\s+(?:و\s+)?(?:بیار(?:ش)?|بیاور(?:ش)?|باز(?:ش)? کن|نشون(?:م)? بده|نشان بده|توضیح بده|خلاصه کن|بهم بگو|نتیجه(?:ش)? رو بیار))*[.!؟?]*$/i,'')
    .replace(/\s+(?:رو|را)?\s*(?:پیدا(?:ش)? کن|بگرد|گوگلش کن|باز(?:ش)? کن|بیار(?:ش)?)[.!؟?]*$/i,'')
    .replace(/\s+(?:و\s+)?(?:برام\s+)?(?:بیار(?:ش)?|بیاور(?:ش)?|نشون(?:م)? بده|نشان بده|توضیح بده|خلاصه کن)[.!؟?]*$/i,'')
    .replace(/^(?:درباره|راجع به|در مورد|دنبال)\s+/i,'')
    .replace(/\s+(?:رو|را|کن)$/i,'').trim();
  if(!query)return null;
  const inSite=query.match(/^(?:تو|توی|در|از)\s+(?:سایت\s+)?(\S+(?:\s+کالا)?)\s+(.+)$/i);
  if(inSite){const domain=siteDomain(inSite[1]);if(domain)return {mode:'research',query:inSite[2].replace(/\s+(?:رو|را)$/i,'').trim(),domain,engine};}
  const site=query.match(/^(?:سایت|وب ?سایت|website)\s+(?:رسمی\s+)?(.+)$/i);
  if(site){const identifier=site[1].replace(/\s+(?:رو|را)$/i,'').trim();return {mode:'website',query:identifier,site:identifier,domain:siteDomain(identifier),engine};}
  if(engine==='youtube'||/کروم|chrome/i.test(text)&&!/(?:تحقیق|توضیح بده|خلاصه کن|بررسی)/i.test(text)||/(?:فقط\s+)?(?:صفحه|لیست)\s+نتایج|فقط.*(?:گوگل|google|کروم|chrome)/i.test(text))return {mode:'browser',query:query.replace(/^فقط\s+/,'').trim(),engine:engine||'google'};
  return {mode:'research',query,engine};
}
