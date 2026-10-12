import test from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs/promises';
import path from 'node:path';
import os from 'node:os';
import JSZip from 'jszip';
import { AccountingWorkbookScanner } from '../src/agent/AccountingWorkbookScanner.js';
import { AccountingReportStore } from '../src/agent/AccountingReportStore.js';
import {accountingInvoiceProfile,INVOICE_TEMPLATE_ID} from '../src/agent/AccountingWorkbookProfiles.js';
import {chooseInvoiceSheets,hasInvoiceDate,scanInvoiceSheetRows} from '../src/agent/AccountingInvoiceSchema.js';

const tmp=async run=>{
 const dir=await fs.mkdtemp(path.join(os.tmpdir(),'maria-ledger-v2-'));
 try{return await run(dir);}finally{await fs.rm(dir,{recursive:true,force:true});}
};
const sheetXml=(rows,links)=>{
 const data=rows.map(r=>{
  const cells=Object.entries(r.columns).sort(([a],[b])=>a.localeCompare(b)).map(([key,val])=>
    val==null?`<c r="${key+r.row}" s="1"/>`:`<c r="${key+r.row}"><v>${val}</v></c>`).join('');
  return `<row r="${r.row}">${cells}</row>`;
 }).join('');
 const hyperlinks=links.map((x,i)=>`<hyperlink ref="${x.cell}" r:id="rId${i+1}"/>`).join('');
 return `<?xml version="1.0"?><worksheet xmlns:r="http://schemas.openxmlformats.org/officeDocument/2006/relationships"><sheetData>${data}</sheetData><hyperlinks>${hyperlinks}</hyperlinks></worksheet>`;
};
async function createWorkbook(dir){
 const names=['فاکتور الف 77','Sheet1','فاکتور ب 30','Sheet2'];
 const zip=new JSZip();
 zip.file('xl/workbook.xml',`<?xml version="1.0"?><workbook xmlns:r="http://schemas.openxmlformats.org/officeDocument/2006/relationships"><sheets>${names.map((n,i)=>`<sheet name="${n}" sheetId="${i+1}" r:id="rId${i+1}"/>`).join('')}</sheets></workbook>`);
 zip.file('xl/_rels/workbook.xml.rels',`<?xml version="1.0"?><Relationships>${names.map((n,i)=>`<Relationship Id="rId${i+1}" Target="worksheets/sheet${i+1}.xml"/>`).join('')}</Relationships>`);
 const written=new Set();
 for(let i=1;i<=4;i++){
  const isHelper=i%2===0;
  const isFirst=i<=2;
  const rows=[{row:13,columns:{B:46240,C:99,D:3000}}];
  const links=[];
  for(let j=0;j<21;j++){
   const row=14+j;
   const plate=j===2||j===5;
   const entry={row,columns:{B:46240+j,C:j+800}};
   if(plate){
     entry.columns.D=j===2?24000+j:null; // real workbooks may repeat weight in D
     entry.columns.E=24000+j;
   }else entry.columns.D=100000+j;
   const p=(column,photo,exists=true)=>{
     entry.columns[column]=photo;
     links.push({cell:column+row,target:'photos/'+photo+'.jpg'});
     if(exists)written.add(photo);
   };
   if(!isHelper){
     if(isFirst){
       if(plate){
         // First style: a photo on C and a second in H.
         links.push({cell:'C'+row,target:'photos/c'+row+'.jpg'});written.add('c'+row);
         if(j!==5)p('H',2000+row);
         else entry.columns.H=2000+row; // numeric but missing hyperlink
       }else if(j!==7)p('H',1000+row);
       else entry.columns.H=1000+row;
     }else{
       if(plate){
         p('G',3000+row);
         p('H',4000+row);
         p('I',5000+row);
       }else{
         p('G',6000+row,j!==9); // one actual target file is missing
         entry.columns.H=26; // accounting status; NOT a photo column in receipt
       }
     }
   }
   rows.push(entry);
  }
  zip.file('xl/worksheets/sheet'+i+'.xml',sheetXml(rows,links));
  zip.file('xl/worksheets/_rels/sheet'+i+'.xml.rels',`<?xml version="1.0"?><Relationships>${links.map((l,k)=>`<Relationship Id="rId${k+1}" Target="${l.target}" TargetMode="External"/>`).join('')}</Relationships>`);
 }
 await fs.mkdir(path.join(dir,'photos'));
 for(const name of written)await fs.writeFile(path.join(dir,'photos',name+'.jpg'),'fake-valid-image');
 const filepath=path.join(dir,'فاکتور حسابداری 77.xlsx');
 await fs.writeFile(filepath,await zip.generateAsync({type:'nodebuffer'}));
 return filepath;
}
test('B dates count records even when C or photo blank; row 13 ignored',()=>{
 assert.equal(hasInvoiceDate('46240'),true);
 assert.equal(hasInvoiceDate('1405/07/18'),true);
 assert.equal(hasInvoiceDate(''),false);
 assert.equal(hasInvoiceDate('17'),false);
});
test('automatic names choose exactly two invoice sheets, excluding generic duplicate Sheet1/Sheet2',()=>{
 const input=['فاکتور الف 77','Sheet1','فاکتور ب 30','Sheet2'].map(name=>({name}));
 assert.deepEqual(chooseInvoiceSheets(input,accountingInvoiceProfile()).map(x=>x.name),['فاکتور الف 77','فاکتور ب 30']);
 assert.deepEqual(chooseInvoiceSheets(input,accountingInvoiceProfile({
   sheets:['Sheet1','فاکتور ب 30','Sheet2'],sheetSelectionMode:'manual'
 })).map(x=>x.name),['Sheet1','فاکتور ب 30','Sheet2']);
});
test('synthetic four-sheet invoice: 21 dated entries per invoice, two selected, evidence auto detected G vs H and C',()=>tmp(async dir=>{
 const file=await createWorkbook(dir);
 const scanner=new AccountingWorkbookScanner();
 const report=await scanner.scan({type:'invoice',path:file,profile:accountingInvoiceProfile()});
 assert.equal(report.ok,true,JSON.stringify(report.error));
 assert.deepEqual(report.selectedSheets,['فاکتور الف 77','فاکتور ب 30']);
 assert.equal(report.availableSheets.length,4);
 assert.deepEqual(report.availableSheets.map(x=>x.dateRows),[21,21,21,21]);
 assert.equal(report.total,42);
 assert.equal(report.receipts,38);
 assert.equal(report.plates,4);
 const [first,second]=report.sheets;
 assert.equal(first.total,21);assert.equal(second.total,21);
 assert.deepEqual(first.detectedPhotoColumns.receipt,['H']);
 assert.deepEqual(new Set(first.detectedPhotoColumns.plate),new Set(['H','C']));
 assert.deepEqual(second.detectedPhotoColumns.receipt,['G']);
 assert.deepEqual(second.detectedPhotoColumns.plate,['G','H','I']);
 assert.equal(first.missing,2,'one receipt H number without link and one plate missing second picture');
 assert.equal(second.missing,1,'one broken receipt G link');
 assert.equal(report.registered,39);
 assert.equal(report.missing,3);
 assert.equal(report.brokenLinks,1);
 const missingReceipt=first.missingRows.find(x=>x.row===21);
 assert.ok(missingReceipt.issues.some(x=>x.type==='numeric_photo_without_link'));
 const plate=first.missingRows.find(x=>x.row===19);
 assert.equal(plate.recordType,'plate');
 assert.ok(plate.issues.some(x=>x.type==='photo_count_short'));
 assert.equal(first.rows.find(x=>x.row===16).photoVerified,2);
 assert.equal(second.rows.find(x=>x.row===16).photoVerified,3);
 assert.equal(first.rows.find(x=>x.row===19).recordType,'plate','self-closing D must not eat the E weight cell');
 const safeReceipt=second.rows.find(x=>x.row===14);
 assert.equal(safeReceipt.recordType,'receipt');
 assert.equal(safeReceipt.missing.length,0,'numeric H=26 is a status flag, not fake missing photo');
}));
test('manual sheet selection can include auxiliaries and change counts after rescanning',()=>tmp(async dir=>{
 const file=await createWorkbook(dir);
 const scanner=new AccountingWorkbookScanner();
 const report=await scanner.scan({type:'invoice',path:file,profile:accountingInvoiceProfile({
  sheets:['فاکتور الف 77','Sheet1','فاکتور ب 30'],sheetSelectionMode:'manual'
 })});
 assert.deepEqual(report.selectedSheets,['فاکتور الف 77','Sheet1','فاکتور ب 30']);
 assert.equal(report.total,63);
 assert.equal(report.availableSheets.length,4);
}));
test('old invoice monitor gets safe v2 migration with original sheet choice preserved and backup',()=>tmp(async directory=>{
 const store=new AccountingReportStore({directory});
 await store.load();
 store.state.monitors.push(store.normalizeMonitor({
  id:'legacy1',name:'قدیمی',path:path.join(directory,'old.xlsx'),type:'invoice',
  profile:{preset:'maria-invoice-c14-d14-h14-v1',startRow:14,anchorColumns:['C','D'],
   evidenceRoot:directory,sheets:['Sheet1'],evidence:[{columns:['H'],mode:'hyperlink_existing'}]}
 }));
 await store.save();
 const result=await store.applyFixedInvoiceTemplateToExisting();
 assert.equal(result.updated,1);
 const [updated]=await store.listMonitors();
 assert.equal(updated.profile.preset,INVOICE_TEMPLATE_ID);
 assert.equal(updated.profile.sheetSelectionMode,'manual');
 assert.deepEqual(updated.profile.sheets,['Sheet1']);
 assert.equal(updated.profile.evidenceRoot,directory);
 const prior=JSON.parse(await fs.readFile(result.backup,'utf8'));
 assert.equal(prior.monitors[0].profile.preset,'maria-invoice-c14-d14-h14-v1');
 assert.equal((await store.applyFixedInvoiceTemplateToExisting()).updated,0);
}));
