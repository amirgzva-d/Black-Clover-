import test from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs/promises';
import os from 'node:os';
import path from 'node:path';
import JSZip from 'jszip';
import {AccountingWorkbookScanner} from '../src/agent/AccountingWorkbookScanner.js';
import {AccountingReportStore} from '../src/agent/AccountingReportStore.js';
import {accountingInvoiceProfile,INVOICE_TEMPLATE_ID} from '../src/agent/AccountingWorkbookProfiles.js';

async function inTemp(fn){
 const dir=await fs.mkdtemp(path.join(os.tmpdir(),'maria-accounting-fixed-'));
 try{return await fn(dir);}finally{await fs.rm(dir,{recursive:true,force:true});}
}
async function makeInvoice(file){
 const zip=new JSZip();
 zip.file('xl/workbook.xml','<?xml version="1.0"?><workbook xmlns:r="http://schemas.openxmlformats.org/officeDocument/2006/relationships"><sheets><sheet name="Accounting" sheetId="1" r:id="rId1"/></sheets></workbook>');
 zip.file('xl/_rels/workbook.xml.rels','<?xml version="1.0"?><Relationships><Relationship Id="rId1" Target="worksheets/sheet1.xml"/></Relationships>');
 zip.file('xl/worksheets/sheet1.xml',`<?xml version="1.0"?><worksheet xmlns:r="http://schemas.openxmlformats.org/officeDocument/2006/relationships">
 <sheetData>
  <row r="13"><c r="C13" t="inlineStr"><is><t>ignored-plate</t></is></c><c r="D13"><v>100</v></c></row>
  <row r="14"><c r="C14" t="inlineStr"><is><t>12-الف-345</t></is></c><c r="D14"><v>125000</v></c><c r="H14"><v>14</v></c></row>
  <row r="15"><c r="C15" t="inlineStr"><is><t>22-ب-678</t></is></c><c r="D15"><v>200000</v></c><c r="H15"><v>15</v></c></row>
  <row r="16"><c r="C16" t="inlineStr"><is><t>23-ج-123</t></is></c><c r="H16"><v>16</v></c></row>
  <row r="17"><c r="D17"><v>50000</v></c><c r="H17"><v>17</v></c></row>
 </sheetData>
 <hyperlinks><hyperlink ref="H14" r:id="photo14"/><hyperlink ref="H16" r:id="photo16"/><hyperlink ref="H17" r:id="photo17"/></hyperlinks>
 </worksheet>`);
 zip.file('xl/worksheets/_rels/sheet1.xml.rels','<?xml version="1.0"?><Relationships><Relationship Id="photo14" Target="14.jpg" TargetMode="External"/><Relationship Id="photo16" Target="16.jpg" TargetMode="External"/><Relationship Id="photo17" Target="17.jpg" TargetMode="External"/></Relationships>');
 await fs.writeFile(file,await zip.generateAsync({type:'nodebuffer'}));
}
test('accounting template is exactly C14 plate D14 receipt price H14 linked photo',()=>{
 const p=accountingInvoiceProfile();
 assert.equal(p.startRow,14);
 assert.deepEqual(p.anchorColumns,['C','D']);
 assert.deepEqual(p.evidence.map(x=>[x.columns[0],x.mode,x.label]),[
  ['C','value','پلاک'],['D','value','مبلغ فیش'],['H','hyperlink_existing','عکس / لینک مدرک']
 ]);
});
test('scanner extracts real invoice rows and detects missing H link, missing C/D, ignores rows 1..13',()=>inTemp(async dir=>{
 const workbook=path.join(dir,'فاکتور 112.xlsx');
 await makeInvoice(workbook);
 for(const name of ['14.jpg','16.jpg','17.jpg'])await fs.writeFile(path.join(dir,name),'fake-image');
 const scanner=new AccountingWorkbookScanner();
 const result=await scanner.scan({path:workbook,type:'invoice',profile:accountingInvoiceProfile()});
 assert.equal(result.ok,true);
 assert.equal(result.total,4);
 assert.equal(result.registered,1);
 assert.equal(result.missing,3);
 assert.equal(result.brokenLinks,1);
 assert.deepEqual(result.sheets[0].missingRows.map(x=>x.row),[15,16,17]);
 assert.ok(result.sheets[0].missingRows.find(x=>x.row===15).missing.includes('عکس / لینک مدرک'));
 assert.ok(result.sheets[0].missingRows.find(x=>x.row===16).missing.includes('مبلغ فیش'));
 assert.ok(result.sheets[0].missingRows.find(x=>x.row===17).missing.includes('پلاک'));
 const r15=result.sheets[0].missingRows[0];
 assert.equal(r15.fields.plate,'22-ب-678');
 assert.equal(r15.fields.receiptAmount,'200000');
 assert.equal(r15.fields.photoCell,'H15');
 assert.equal(r15.fields.photoLinked,false);
 assert.equal(result.invoiceNumber,'112');
}));
test('add file only requires path and accounting/transport, duplicates are reused and invoice always appears first',()=>inTemp(async directory=>{
 const store=new AccountingReportStore({directory});
 const one=await store.createMonitor({path:path.join(directory,'Invoice 01.xlsx'),type:'invoice'});
 assert.equal(one.profile.preset,INVOICE_TEMPLATE_ID);
 assert.equal(one.profile.startRow,14);
 assert.equal(one.archiveWhenComplete,false);
 const same=await store.createMonitor({path:one.path,type:'invoice'});
 assert.equal(same.id,one.id);
 const transport=await store.createMonitor({path:path.join(directory,'Transport 01.xlsx'),type:'transport',pinned:true});
 assert.equal(transport.profile.preset,'maria-transport-awaiting-example-v1');
 assert.deepEqual((await store.dashboard()).map(x=>x.monitor.type),['invoice','transport']);
 await assert.rejects(store.createMonitor({path:one.path,type:'transport'}),/نوع دیگری/);
 await assert.rejects(store.createMonitor({path:path.join(directory,'Old.xls'),type:'invoice'}),/xlsx/);
}));
test('older invoice settings upgrade with reversible backup without deleting source data',()=>inTemp(async directory=>{
 const store=new AccountingReportStore({directory});
 await store.load();
 const legacy=store.normalizeMonitor({id:'old-account',path:path.join(directory,'old.xlsx'),type:'invoice',
  profile:{startRow:2,anchorColumns:['B'],sheets:['Sheet1'],evidenceRoot:directory,evidence:[{columns:['G'],label:'old'}]}
 });
 store.state.monitors.push(legacy);
 await store.save();
 const result=await store.applyFixedInvoiceTemplateToExisting();
 assert.equal(result.updated,1);
 const updated=(await store.listMonitors())[0];
 assert.equal(updated.profile.startRow,14);
 assert.deepEqual(updated.profile.anchorColumns,['C','D']);
 assert.equal(updated.profile.evidenceRoot,directory);
 assert.deepEqual(updated.profile.sheets,['Sheet1']);
 const previous=JSON.parse(await fs.readFile(result.backup,'utf8'));
 assert.equal(previous.monitors[0].profile.startRow,2);
 assert.equal((await store.applyFixedInvoiceTemplateToExisting()).updated,0);
}));
