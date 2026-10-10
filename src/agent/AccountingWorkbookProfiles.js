// Uniform invoice workbook schema. User-verified headings/layout at 2026-10-10:
// From row 14: C=plate, D=receipt amount, H=linked photo.
export const INVOICE_TEMPLATE_ID='maria-invoice-c14-d14-h14-v1';
export const INVOICE_START_ROW=14;

export function accountingInvoiceProfile({
  evidenceRoot='',
  sheets=[],
}={}){
  return {
    preset:INVOICE_TEMPLATE_ID,
    startRow:INVOICE_START_ROW,
    dataStartRow:INVOICE_START_ROW,
    anchorColumns:['C','D'],
    // C and D are presence checks. H must point to an existing image/file.
    // The expected file path is resolved relative to the workbook unless a
    // verified evidence root is set. No workbook or evidence files are moved.
    evidence:[
      {columns:['C'],required:1,mode:'value',label:'پلاک'},
      {columns:['D'],required:1,mode:'value',label:'مبلغ فیش'},
      {columns:['H'],required:1,mode:'hyperlink_existing',label:'عکس / لینک مدرک'}
    ],
    sheets:Array.isArray(sheets)?sheets:[],
    evidenceRoot:String(evidenceRoot||''),
    requireVerifiedAttachment:false,
    archiveWhenComplete:false,
  };
}

// The user has not provided the transport workbook layout yet.
// Do not impose invoice column labels or claim transport photos are verified.
export function transportPendingProfile(){
  return {
    preset:'maria-transport-awaiting-example-v1',
    startRow:14,
    dataStartRow:14,
    anchorColumns:['C'],
    evidence:[],
    transportCountMode:'photo_count',
    sheets:[]
  };
}
export function profileForWorkbookType(type){
  return type==='transport'?transportPendingProfile():accountingInvoiceProfile();
}
export const supportedAccountingExtension=p=>/\.(xlsx|xlsm)$/i.test(String(p||''));
