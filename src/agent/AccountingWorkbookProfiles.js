// The accounting user-defined invariant: a dated ledger row is a record;
// D means receipt, E means plate/load. Evidence placement varies by sheet.
export const INVOICE_TEMPLATE_ID='maria-invoice-dated-b14-d-e-dynamic-evidence-v2';
export const INVOICE_START_ROW=14;

export function accountingInvoiceProfile({
  evidenceRoot='',
  sheets=[],
  sheetSelectionMode='auto',
  hyperlinkBasePath=''
}={}){
  const selected=Array.isArray(sheets)?sheets.map(String).filter(Boolean):[];
  return {
    preset:INVOICE_TEMPLATE_ID,
    startRow:INVOICE_START_ROW,
    dataStartRow:INVOICE_START_ROW,
    dateColumn:'B',
    trackingOrPlateColumn:'C',
    receiptAmountColumn:'D',
    plateWeightColumn:'E',
    // Primary alternatives are H/I/J. G is detected, not blindly assumed,
    // when genuine hyperlink relationships show that G is the photo column.
    photoColumns:['H','I','J'],
    autoDetectEvidenceColumns:true,
    checkPlateCellLink:true,
    receiptPhotosRequired:1,
    platePhotosRequired:2,
    anchorColumns:['B'],
    sheetSelectionMode:sheetSelectionMode==='manual'&&selected.length?'manual':'auto',
    sheets:selected,
    watchedSheets:[],
    evidence:[],
    rules:[],
    evidenceRoot:String(evidenceRoot||''),
    hyperlinkBasePath:String(hyperlinkBasePath||''),
    requireVerifiedAttachment:true,
    archiveWhenComplete:false
  };
}
export function transportPendingProfile(){
  return {
    preset:'maria-transport-awaiting-example-v1',
    startRow:14,dataStartRow:14,anchorColumns:['C'],
    evidence:[],transportCountMode:'photo_count',sheets:[]
  };
}
export function profileForWorkbookType(type){
  return type==='transport'?transportPendingProfile():accountingInvoiceProfile();
}
export const supportedAccountingExtension=p=>/\.(xlsx|xlsm)$/i.test(String(p||''));
