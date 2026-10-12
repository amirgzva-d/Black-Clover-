import test from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs/promises';
import crypto from 'node:crypto';
import {mediaVirtualKey,sendMediaKey} from '../src/main/MediaKeyControls.js';

const root=new URL('../',import.meta.url);
const read=relative=>fs.readFile(new URL(relative,root),'utf8');

test('mini and preview reference CSS and header are immutable across platforms',async()=>{
 // Frozen UI signatures from the user-approved 2026-10-10 version.
 const originalCssSignature='eb385a98a1e49a69f126178781d690aea27731b59d86a9d29fa7b5bcff168af6';
 const originalHeaderSignature='e218099f17420796e63006257d789bb758fbfe214a43712f3499708714c2a477';
 const css=await read('src/renderer/topIslandV4.css');
 const marker='/* Phase 9: expanded-page usability ONLY.';
 const boundary=css.indexOf(marker);
 assert.ok(boundary>0,'Additional CSS must be append-only');
 const baseline=css.slice(0,boundary).replace(/\r\n/g,'\n').replace(/\n$/,'');
 // One deliberately appended separator newline is excluded from the baseline.
 const hash=s=>crypto.createHash('sha256').update(s).digest('hex');
 // The original baseline ends in one LF, separate from the appended CRLF.
 const normal=css.slice(0,boundary).replace(/\r\n/g,'\n');
 assert.equal(hash(normal.replace(/\n$/,'')),originalCssSignature);
 const ui=await read('src/renderer/topIslandV4.js');
 const start=ui.indexOf('<header class="v4-topbar">');
 const end=ui.indexOf('</header>',start);
 assert.ok(start>=0&&end>start);
 assert.equal(hash(ui.slice(start,end+9).replace(/\r\n/g,'\n')),originalHeaderSignature);
});
test('expanded-page pin is isolated from header and safe from blur/drag auto collapse',async()=>{
 const ui=await read('src/renderer/topIslandV4.js');
 const css=await read('src/renderer/topIslandV4.css');
 assert.match(ui,/workbarPinned=false/);
 assert.match(ui,/protectedPanel\(\)[\s\S]*workbarPinned\|\|draggingIntoIsland/);
 assert.match(ui,/data-workflow-lock/);
 assert.match(ui,/!workbarPinned&&!draggingIntoIsland/);
 assert.match(ui,/if\(draggingIntoIsland\|\|workbarPinned\)return/);
 assert.match(css,/\.v4-expanded \.v4-workflow-lock/);
 assert.match(css,/\.v4-home-quick/);
 assert.match(css,/\.v4-home-media/);
});
test('reminder and Excel dialogs use exact time, native pickers, minimal optional settings',async()=>{
 const ui=await read('src/renderer/topIslandV4.js');
 const forms=await read('src/renderer/workflowFormsV4.js');
 assert.match(ui,/return taskForm\(/);
 assert.match(ui,/return pinForm\(/);
 assert.match(ui,/return reportForm\(/);
 assert.match(forms,/datetime-local/);
 assert.match(forms,/step="60"/);
 assert.match(forms,/data-pick-task-file/);
 assert.match(forms,/name="notifyChat"/);
 assert.match(forms,/data-pick-accounting/);
 assert.doesNotMatch(forms,/<details class="v4-workflow-advanced"/,'Excel only asks for file and workbook type');
});
test('native media key names are mapped correctly and invalid commands are rejected',async()=>{
 assert.equal(mediaVirtualKey('play_pause'),0xB3);
 assert.equal(mediaVirtualKey('previous'),0xB1);
 assert.equal(mediaVirtualKey('next'),0xB0);
 assert.equal(mediaVirtualKey('mute'),0xAD);
 assert.throws(()=>mediaVirtualKey('shutdown'));
 const executions=[];
 await sendMediaKey('mute',{platform:'win32',exec:async(command,args,opts)=>executions.push({command,args,opts})});
 assert.equal(executions[0].command,'powershell.exe');
 assert.match(executions[0].args.join(' '),/keybd_event/);
 await assert.rejects(sendMediaKey('mute',{platform:'linux',exec:()=>{}}));
});
