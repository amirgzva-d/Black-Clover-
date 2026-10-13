// Pure dated-ledger invoice logic, decoupled from Electron and ZIP I/O.
const value=(cells,col,row)=>String(cells.get(col+row)?.value??'').trim();
const cell=(cells,col,row)=>cells.get(col+row)||{ref:col+row,value:'',hasHyperlink:false};
const have=x=>Boolean(String(x??'').trim());
const PHOTO_COLS=['G','H','I','J'];
const normalizeDate=value=>{
  const s=String(value??'').trim();
  if(!s)return false;
  if(/^\d+(?:\.0+)?$/.test(s)){const n=Number(s);return Number.isFinite(n)&&n>=20000&&n<=80000;}
  return /^(?:13|14|20)\d\d[\/-](?:0?[1-9]|1[0-2])[\/-](?:0?[1-9]|[12]\d|3[01])$/.test(s);
};
export const hasInvoiceDate=raw=>normalizeDate(raw);
export function invoiceKind(cells,row){
  if(!hasInvoiceDate(value(cells,'B',row)))return null;
  const amount=value(cells,'D',row),candidateWeight=value(cells,'E',row);
  const money=have(amount),hasE=have(candidateWeight);
  // Some customer workbooks use E as an *account balance* in receipt rows,
  // while plate rows use E as actual kilograms. A small, plausible weight
  // (up to one million kg per loading row) indicates a plate. Invoice #77:
  // receipt D=20,000,000,000 / E=145,500,000,000; plate D=25,330 / E=25,330.
  const weightNumber=Number(candidateWeight.replace(/[,،\s]/g,''));
  const isWeight=hasE&&Number.isFinite(weightNumber)&&weightNumber>0&&weightNumber<=1000000;
  if(isWeight)return 'plate';
  if(money)return 'receipt';
  return 'unclassified';
}
export function isAuxiliarySheet(name=''){
  return /^(?:sheet\s*\d+|sheet|برگه\s*\d+|شیت\s*\d+|page\s*\d+)$/iu.test(String(name).trim());
}
export function chooseInvoiceSheets(all,profile={}){
  const requested=Array.isArray(profile.sheets)?profile.sheets.filter(Boolean).map(x=>typeof x==='string'?x:x.name).filter(Boolean):[];
  if((profile.sheetSelectionMode==='manual'||requested.length>0)&&requested.length){
    const wanted=new Set(requested);
    return all.filter(x=>wanted.has(x.name));
  }
  const named=all.filter(s=>!isAuxiliarySheet(s.name));
  return (named.length?named:all).slice(0,2);
}
export function sheetEvidenceColumns(cells,startRow=14,endRow=100000){
  const distributions={receipt:new Map(),plate:new Map()};
  for(let row=startRow;row<=endRow;row++){
    const kind=invoiceKind(cells,row);
    if(kind!=='receipt'&&kind!=='plate')continue;
    for(const col of PHOTO_COLS){
      if(cell(cells,col,row).hasHyperlink)
        distributions[kind].set(col,(distributions[kind].get(col)||0)+1);
    }
    if(kind==='plate'&&cell(cells,'C',row).hasHyperlink)
      distributions.plate.set('C',(distributions.plate.get('C')||0)+1);
  }
  const defaults=['H','I','J'];
  const columns={};
  for(const kind of ['receipt','plate']){
    const observed=[...distributions[kind].entries()].sort((a,b)=>b[1]-a[1]);
    const base=observed.map(([name])=>name);
    // A sheet without any working hyperlinks still needs missing-link checks.
    columns[kind]=base.length?base:defaults;
  }
  return {
    columns,
    evidencePatterns:Object.fromEntries(Object.entries(distributions).map(([kind,m])=>[kind,Object.fromEntries(m)]))
  };
}
function metadata(cell){
  return {
    ref:cell.ref,
    value:String(cell.value??'').trim(),
    hasHyperlink:Boolean(cell.hasHyperlink),
    target:cell.hyperlinkTarget||null,
    resolvedPath:cell.hyperlinkResolvedPath||null,
    targetExists:cell.hyperlinkTargetExists??null
  };
}
const fileIdentifier=m=>String(m.resolvedPath||m.target||m.ref).replace(/\\/g,'/').toLowerCase();
export function evaluateInvoiceRow(cells,row,evidenceColumns){
  const kind=invoiceKind(cells,row);
  if(!kind)return null;
  const fields={
    date:value(cells,'B',row),
    trackingOrPlate:value(cells,'C',row),
    receiptAmount:value(cells,'D',row),
    weight:value(cells,'E',row)
  };
  const issues=[],missing=[];
  function fail(type,label,extra={}){
    issues.push({type,label,...extra});
    if(!missing.includes(label))missing.push(label);
  }
  if(!fields.trackingOrPlate)fail('missing_tracking_or_plate',kind==='plate'?'پلاک (C) خالی است':'شماره پیگیری فیش (C) خالی است',{ref:'C'+row});
  if(kind==='receipt'&&!fields.receiptAmount)fail('missing_receipt_amount','مبلغ فیش (D) خالی است',{ref:'D'+row});
  if(kind==='plate'&&!fields.weight)fail('missing_weight','وزن بارگیری (E) خالی است',{ref:'E'+row});
  if(kind==='unclassified')fail('unclassified_record','باوجود تاریخ، نه مبلغ فیش (D) و نه وزن (E) ثبت شده است',{ref:'B'+row});
  if(kind==='ambiguous')fail('ambiguous_record','در یک ردیف هم مبلغ فیش و هم وزن وجود دارد؛ نوع رکورد را بررسی کن',{ref:'B'+row});
  const selected=kind==='plate'?evidenceColumns.plate:
    kind==='receipt'?evidenceColumns.receipt:
    [...new Set([...evidenceColumns.receipt,...evidenceColumns.plate])];
  const attachments=selected.map(col=>metadata(cell(cells,col,row)));
  const linked=attachments.filter(x=>x.hasHyperlink);
  const present=linked.filter(x=>have(x.value));  // number/text must exist in the visible cell
  const verified=present.filter(x=>x.targetExists===true);
  const unique=new Map();
  for(const item of verified)unique.set(fileIdentifier(item),item);
  const photoRequired=kind==='plate'?2:kind==='receipt'?1:1;
  for(const item of attachments){
    if(item.hasHyperlink&&!have(item.value))
      fail('photo_number_missing','شناسه/عدد عکس در '+item.ref+' وجود ندارد',{ref:item.ref});
    else if(item.hasHyperlink&&item.targetExists===false)
      fail('broken_link','لینک عکس '+item.ref+' باز نمی‌شود یا فایل مقصد پیدا نشد',{ref:item.ref,target:item.target});
    else if(item.hasHyperlink&&item.targetExists!==true)
      fail('unverified_link','مسیر عکس '+item.ref+' هنوز قابل تأیید نیست',{ref:item.ref,target:item.target});
  }
  if(unique.size<photoRequired){
    const countMissing=photoRequired-unique.size;
    fail('photo_count_short',kind==='plate'?
      'برای پلاک دو عکس/مدرک سالم لازم است؛ '+countMissing+' مورد کم است':
      'برای فیش یک عکس/مدرک سالم لازم است',{needed:photoRequired,verified:unique.size});
  }
  // A numeric photo ID without an Excel link is not a valid registered photo.
  // Inspect only the photo fields that have actually been recognized for the
  // relevant record type, never totals/status columns used for accounting.
  for(const item of attachments){
    if(have(item.value)&&!item.hasHyperlink)
      fail('numeric_photo_without_link','عدد/شناسه در '+item.ref+' هست اما لینک عکس ندارد',{ref:item.ref,value:item.value});
  }
  return {
    row,recordType:kind,fields,
    sourceSummary:[fields.date,fields.trackingOrPlate,kind==='plate'?fields.weight:fields.receiptAmount].filter(Boolean).join(' | '),
    anchor:{B:fields.date,C:fields.trackingOrPlate,D:fields.receiptAmount,E:fields.weight},
    photoColumns:selected,
    photoRequired,
    photoLinked:present.length,photoVerified:unique.size,
    photos:attachments,checks:[{label:'عکس مرتبط با ردیف',required:photoRequired,passed:unique.size,ok:unique.size>=photoRequired,cells:attachments}],
    issues,missing
  };
}
export function scanInvoiceSheetRows(cells,{startRow=14,endRow=100000}={}){
  const photo=sheetEvidenceColumns(cells,startRow,endRow);
  const rows=[];
  for(let row=startRow;row<=endRow;row++){
    const record=evaluateInvoiceRow(cells,row,photo.columns);
    if(record)rows.push(record);
  }
  const invalid=rows.filter(x=>x.missing.length);
  return {
    rows,
    total:rows.length,
    receipts:rows.filter(x=>x.recordType==='receipt').length,
    plates:rows.filter(x=>x.recordType==='plate').length,
    unclassified:rows.filter(x=>x.recordType==='unclassified'||x.recordType==='ambiguous').length,
    registered:rows.length-invalid.length,
    missing:invalid.length,
    linkedPhotos:rows.reduce((sum,r)=>sum+r.photoLinked,0),
    verifiedPhotos:rows.reduce((sum,r)=>sum+r.photoVerified,0),
    brokenLinks:rows.reduce((sum,r)=>sum+r.issues.filter(i=>i.type==='broken_link').length,0),
    unverifiedLinks:rows.reduce((sum,r)=>sum+r.issues.filter(i=>i.type==='unverified_link').length,0),
    missingRows:invalid.map(x=>({...x})),
    rowIssues:invalid.flatMap(r=>r.issues.map(i=>({row:r.row,recordType:r.recordType,...i}))),
    detectedPhotoColumns:photo.columns,
    evidencePatterns:photo.evidencePatterns
  };
}
