import test from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs/promises';
import path from 'node:path';
import os from 'node:os';
import {AccountingReportStore} from '../src/agent/AccountingReportStore.js';

const temp=async task=>{
  const dir=await fs.mkdtemp(path.join(os.tmpdir(),'maria-unlink-'));
  try{return await task(dir);}finally{await fs.rm(dir,{force:true,recursive:true});}
};
test('removing linked Excel only deletes the MARIA monitor and cached result; original Excel remains intact',()=>temp(async dir=>{
  const file=path.join(dir,'invoice 77.xlsx');
  const bytes=Buffer.from('synthetic-original-workbook-do-not-touch');
  await fs.writeFile(file,bytes);
  const store=new AccountingReportStore({directory:path.join(dir,'app-data')});
  const added=await store.createMonitor({path:file,type:'invoice'});
  await store.setResult(added.id,{total:42,registered:25,missing:17,selectedSheets:['main1','main2']});
  assert.equal((await store.dashboard()).length,1);
  assert.equal(await store.removeMonitor(added.id),true);
  assert.deepEqual(await store.dashboard(),[]);
  assert.equal(await store.getResult(added.id),null);
  assert.deepEqual(await fs.readFile(file),bytes);
  assert.equal(await store.removeMonitor(added.id),false);
  const readded=await store.createMonitor({path:file,type:'invoice'});
  assert.ok(readded.id);
  assert.equal((await store.dashboard()).length,1);
  assert.deepEqual(await fs.readFile(file),bytes);
}));
test('unlinked report cannot be reopened from the monitor registry',()=>temp(async dir=>{
  const file=path.join(dir,'invoice 88.xlsx');await fs.writeFile(file,'keep this file');
  const store=new AccountingReportStore({directory:path.join(dir,'data')});
  const created=await store.createMonitor({path:file,type:'invoice'});
  await store.removeMonitor(created.id);
  const monitors=await store.listMonitors();
  assert.equal(monitors.some(x=>x.id===created.id),false);
  assert.equal(await fs.readFile(file,'utf8'),'keep this file');
}));
test('reports expose safe unlink, searchable cards, modal dismissal, and close on every expanded page',async()=>{
  const js=await fs.readFile(new URL('../src/renderer/topIslandV4.js',import.meta.url),'utf8');
  const css=await fs.readFile(new URL('../src/renderer/topIslandV4.css',import.meta.url),'utf8');
  const bridge=await fs.readFile(new URL('../src/main/preload.cjs',import.meta.url),'utf8');
  const ipc=await fs.readFile(new URL('../src/main/main.js',import.meta.url),'utf8');
  assert.match(js,/data-monitor-remove/);
  assert.match(js,/confirmRemoveAccounting/);
  assert.match(js,/removeAccountingMonitor\(monitor\.id\)/);
  assert.match(js,/data-report-search/);
  assert.match(js,/applyReportSearch/);
  assert.match(js,/data-panel-close/);
  assert.match(js,/hoverController\?\.collapseNow\(\)/);
  assert.match(js,/data-modal-close/);
  assert.match(css,/\.v4-expanded-close/);
  assert.match(bridge,/removeAccountingMonitor:id=>ipcRenderer\.invoke\('accounting:remove-monitor',id\)/);
  assert.match(ipc,/accounting:remove-monitor/);
  assert.match(ipc,/accountingReports\.removeMonitor/);
  assert.doesNotMatch(ipc,/accounting:remove-monitor[^\n]+(?:unlinkSync|rmSync|fs\.rm|fs\.unlink|shell\.trashItem)/);
});

test('full Chat settings close and first-open pending request are wired end-to-end',async()=>{
  const main=await fs.readFile(new URL('../src/main/main.js',import.meta.url),'utf8');
  const preload=await fs.readFile(new URL('../src/main/preload.cjs',import.meta.url),'utf8');
  const chat=await fs.readFile(new URL('../src/renderer/chatSurfaceV2.js',import.meta.url),'utf8');
  const css=await fs.readFile(new URL('../src/renderer/chatSurfaceV2.css',import.meta.url),'utf8');
  assert.match(main,/assistant:take-pending-settings/);
  assert.match(main,/pendingChatSettings=request/);
  assert.match(preload,/takePendingSettings:/);
  assert.match(chat,/takePendingSettings\?\.\(\)\.then/);
  assert.match(chat,/#setupClose/);
  assert.match(chat,/#setup'\)\.hidden=true/);
  assert.match(css,/\.settings-overlay\[hidden\]\{display:none\}/);
});
