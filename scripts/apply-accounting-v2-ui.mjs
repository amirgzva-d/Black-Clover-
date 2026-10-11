// Surgical expanded-page-only UI patch; preserves top bar/character markup.
import fs from 'node:fs';
const filename='src/renderer/topIslandV4.js';
const raw=fs.readFileSync(filename,'utf8');
let source=raw.replace(/\r\n/g,'\n');const crlf=raw.includes('\r\n');
function one(before,after){
  const count=source.split(before).length-1;
  if(count!==1)throw Error('Unique anchor expected but found '+count+': '+before.slice(0,90));
  source=source.replace(before,after);
}
one("    <nav><button data-detail-config>تعریف سلول‌ها</button>",
    "    <nav><button data-detail-config>تنظیم شیت‌ها (${Number(r?.availableSheets?.length||0)})</button>");
one("  $('[data-detail-config]',host).onclick=()=>editAccountingRules(m);",
    "  $('[data-detail-config]',host).onclick=()=>editAccountingSheets(m,r);");
one("    <div class=\"v4-evidence-stats\"><span>فایل مدرک",
    "    <div class=\"v4-sheet-selection-summary\">شیت‌های انتخاب‌شده: ${esc((r?.selectedSheets||m.profile?.sheets||[]).join('، ')||'هنوز بررسی نشده')} • فیش: ${Number(r?.receipts||0)} • پلاک: ${Number(r?.plates||0)}</div>\n    <div class=\"v4-evidence-stats\"><span>فایل مدرک");
one("  $('[data-detail-config]',host).onclick=()=>editAccountingSheets(m,r);",
    "  $('[data-detail-config]',host).onclick=()=>editAccountingSheets(m,r);");
one("  const issues=Number(r?.brokenLinks||0)+Number(r?.duplicateIdCount||0)+Number(r?.idMismatches||0);",
    "  const issues=Number(r?.brokenLinks||0)+Number(r?.unverifiedLinks||0)+Number(r?.missing||0)+Number(r?.duplicateIdCount||0)+Number(r?.idMismatches||0);");
one("const issues=rows.reduce((n,x)=>n+Number(x.result?.brokenLinks||0)+Number(x.result?.duplicateIdCount||0)+Number(x.result?.idMismatches||0),0);",
    "const issues=rows.reduce((n,x)=>n+Number(x.result?.brokenLinks||0)+Number(x.result?.unverifiedLinks||0)+Number(x.result?.missing||0)+Number(x.result?.duplicateIdCount||0)+Number(x.result?.idMismatches||0),0);");
one("<p>حسابداری: پلاک C، مبلغ فیش D، تصویر H از ردیف ۱۴؛ باربری در انتهای فهرست.</p>",
    "<p>حسابداری: تاریخ B؛ پیگیری/پلاک C؛ مبلغ D یا وزن E؛ عکس از ستون‌های شناسایی‌شده (G/H/I/J و گاهی C).</p>");
const begin=source.indexOf('function editAccountingRules(m){'),end=source.indexOf('function bindPageActions(){',begin);
if(begin<0||end<0)throw Error('Settings block not found');
const settings=`function editAccountingSheets(m,r){
  const listed=Array.isArray(r?.availableSheets)?r.availableSheets:[];
  const selected=new Set(r?.selectedSheets||m.profile?.sheets||[]);
  const manual=m.profile?.sheetSelectionMode==='manual'&&m.profile?.sheets?.length;
  const modal=openModal({
    title:'شیت‌های این فایل',kicker:'EXCEL • SHEET SELECTION',submit:'ذخیره و بررسی',
    body:\`<div class="v4-rule-note">
      <b>\${listed.length} شیت در فایل</b>
      <span>در حالت پیش‌فرض دو شیت فاکتوردار انتخاب می‌شوند؛ Sheet1/Sheet2 تکراری را دوباره نمی‌شماریم.</span>
    </div>
    <label class="v4-workflow-check"><input name="selectionMode" type="radio" value="auto" \${!manual?'checked':''}>انتخاب خودکار ۲ شیت فاکتور</label>
    <label class="v4-workflow-check"><input name="selectionMode" type="radio" value="manual" \${manual?'checked':''}>انتخاب دستی شیت‌ها</label>
    <section class="v4-sheet-settings-list">
      \${listed.map(s=>\`<label class="v4-sheet-option">
        <input type="checkbox" name="sheetName" value="\${esc(s.name)}" \${selected.has(s.name)?'checked':''}>
        <span><b>\${esc(s.name)}</b><small>\${Number(s.dateRows||0)} ردیف دارای تاریخ از ردیف ۱۴</small></span>
      </label>\`).join('')||'<p>نام شیت‌ها هنوز قابل خواندن نیست؛ ابتدا روی بررسی فایل بزن.</p>'}
    </section>
    <small class="v4-workflow-hint">برای افزودن شیت بیشتر یا حذف شیت کمکی، حالت دستی را انتخاب کن. هیچ تغییری در فایل Excel ایجاد نمی‌شود.</small>\`,
    onSubmit:async form=>{
      const mode=String(form.get('selectionMode')||'auto');
      const sheetNames=mode==='manual'?form.getAll('sheetName').map(String).filter(Boolean):[];
      if(mode==='manual'&&!sheetNames.length)throw Error('دست‌کم یک شیت باید انتخاب شود.');
      await window.blackClover.updateAccountingMonitor(m.id,{
        profile:{...m.profile,sheets:sheetNames,sheetSelectionMode:mode}
      });
      await window.blackClover.rebuildAccountingWatchers();
      await window.blackClover.refreshAccountingReports({force:true});
      await renderReports();
    }
  });
  modal.querySelectorAll('[name=sheetName]').forEach(el=>el.addEventListener('change',()=>{
    const manualRadio=modal.querySelector('[name=selectionMode][value=manual]');
    if(manualRadio)manualRadio.checked=true;
  }));
  return modal;
}
`;
source=source.slice(0,begin)+settings+'\n'+source.slice(end);
fs.writeFileSync(filename,crlf?source.replace(/\n/g,'\r\n'):source);
console.log('UPDATED_REPORT_SHEET_SELECTOR');
