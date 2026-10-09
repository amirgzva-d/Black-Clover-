import test from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs/promises';
import os from 'node:os';
import path from 'node:path';
import JSZip from 'jszip';
import { AccountingWorkbookScanner } from '../src/agent/AccountingWorkbookScanner.js';

async function makeWorkbook(file){
  const zip=new JSZip();
  zip.file('xl/workbook.xml','<?xml version="1.0"?><workbook xmlns="http://schemas.openxmlformats.org/spreadsheetml/2006/main" xmlns:r="http://schemas.openxmlformats.org/officeDocument/2006/relationships"><sheets><sheet name="Invoice" sheetId="1" r:id="rId1"/><sheet name="Carrier A" sheetId="2" r:id="rId2"/></sheets></workbook>');
  zip.file('xl/_rels/workbook.xml.rels','<?xml version="1.0"?><Relationships xmlns="http://schemas.openxmlformats.org/package/2006/relationships"><Relationship Id="rId1" Target="worksheets/sheet1.xml" Type="http://schemas.openxmlformats.org/officeDocument/2006/relationships/worksheet"/><Relationship Id="rId2" Target="worksheets/sheet2.xml" Type="http://schemas.openxmlformats.org/officeDocument/2006/relationships/worksheet"/></Relationships>');
  zip.file('xl/worksheets/sheet1.xml','<?xml version="1.0"?><worksheet xmlns="http://schemas.openxmlformats.org/spreadsheetml/2006/main" xmlns:r="http://schemas.openxmlformats.org/officeDocument/2006/relationships"><sheetData><row r="2"><c r="C2"><v>1000</v></c><c r="H2"><v>21</v></c></row><row r="3"><c r="C3"><v>2000</v></c><c r="H3"><v>22</v></c></row></sheetData><hyperlinks><hyperlink ref="H2" r:id="rIdPhoto21"/></hyperlinks></worksheet>');
  zip.file('xl/worksheets/sheet2.xml','<?xml version="1.0"?><worksheet xmlns="http://schemas.openxmlformats.org/spreadsheetml/2006/main" xmlns:r="http://schemas.openxmlformats.org/officeDocument/2006/relationships"><sheetData><row r="2"><c r="C2"><v>1</v></c><c r="I2"><v>91</v></c></row></sheetData><hyperlinks><hyperlink ref="I2" r:id="rIdUnload91"/></hyperlinks></worksheet>');
  zip.file('xl/worksheets/_rels/sheet1.xml.rels','<?xml version="1.0"?><Relationships xmlns="http://schemas.openxmlformats.org/package/2006/relationships"><Relationship Id="rIdPhoto21" Target="photo21.jpg" TargetMode="External"/></Relationships>');
  zip.file('xl/worksheets/_rels/sheet2.xml.rels','<?xml version="1.0"?><Relationships xmlns="http://schemas.openxmlformats.org/package/2006/relationships"><Relationship Id="rIdUnload91" Target="photo91.jpg" TargetMode="External"/></Relationships>');
  await fs.writeFile(file,await zip.generateAsync({type:'nodebuffer'}));
}

test('accounting scanner counts linked and missing invoice evidence without opening Excel',async()=>{
  const dir=await fs.mkdtemp(path.join(os.tmpdir(),'maria-accounting-'));
  const file=path.join(dir,'Example 112.xlsx');
  await makeWorkbook(file);
  await fs.writeFile(path.join(dir,'photo21.jpg'),'x');
  const scanner=new AccountingWorkbookScanner();
  const result=await scanner.scan({
    path:file,
    type:'invoice',
    profile:{sheets:['Invoice'],startRow:2,anchorColumns:['C'],evidence:[{columns:['H'],mode:'hyperlink_existing',required:1,label:'receipt_photo'}]}
  });
  assert.equal(result.ok,true);
  assert.equal(result.invoiceNumber,'112');
  assert.equal(result.total,2);
  assert.equal(result.registered,1);
  assert.equal(result.missing,1);
  assert.equal(result.missingRows[0],undefined);
  assert.equal(result.sheets[0].missingRows[0].row,3);
  assert.deepEqual(result.sheets[0].missingRows[0].missing,['receipt_photo']);
  await fs.rm(dir,{recursive:true,force:true});
});

test('accounting scanner supports a separate transport sheet profile',async()=>{
  const dir=await fs.mkdtemp(path.join(os.tmpdir(),'maria-transport-'));
  const file=path.join(dir,'باربری.xlsx');
  await makeWorkbook(file);
  await fs.writeFile(path.join(dir,'photo91.jpg'),'x');
  const scanner=new AccountingWorkbookScanner();
  const result=await scanner.scan({
    path:file,
    type:'transport',
    profile:{sheets:['Carrier A'],startRow:2,anchorColumns:['C'],evidence:[{columns:['I'],mode:'hyperlink',required:1,label:'unload_photo'}]}
  });
  assert.equal(result.ok,true);
  assert.equal(result.total,1);
  assert.equal(result.registered,1);
  assert.equal(result.missing,0);
  assert.equal(result.complete,true);
  assert.equal(result.sheets[0].sheet,'Carrier A');
  await fs.rm(dir,{recursive:true,force:true});
});


test('accounting scanner can validate numeric photo IDs against an evidence directory',async()=>{
  const dir=await fs.mkdtemp(path.join(os.tmpdir(),'maria-evidence-'));
  const file=path.join(dir,'Example 200.xlsx'),photos=path.join(dir,'photos');
  await fs.mkdir(photos);
  await makeWorkbook(file);
  await fs.writeFile(path.join(photos,'21.jpg'),'x');
  const scanner=new AccountingWorkbookScanner();
  const result=await scanner.scan({
    path:file,
    type:'invoice',
    profile:{
      sheets:['Invoice'],
      startRow:2,
      anchorColumns:['C'],
      evidenceRoot:photos,
      evidenceExtensions:['jpg'],
      evidence:[{columns:['H'],mode:'numeric_file',required:1,label:'receipt_file'}]
    }
  });
  assert.equal(result.ok,true);
  assert.equal(result.total,2);
  assert.equal(result.registered,1);
  assert.equal(result.missing,1);
  assert.equal(result.evidenceSummary.nextCandidate,22);
  assert.equal(result.sheets[0].missingRows[0].row,3);
  assert.equal(result.sheets[0].missingRows[0].checks[0].cells[0].value,'22');
  assert.equal(result.sheets[0].missingRows[0].checks[0].cells[0].numericFileExists,false);
  await fs.rm(dir,{recursive:true,force:true});
});
