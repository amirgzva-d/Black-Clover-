import test from 'node:test';
import assert from 'node:assert/strict';
import {tools,runTool} from '../src/agent/toolRegistry.js';
import {selectToolNames} from '../src/agent/SmartToolRouter.js';
import {compactToolSelection} from '../src/agent/ToolSelectionPolicy.js';

const required=['windows_signin_status','windows_signin_options_open','windows_pin_change_handoff','windows_hello_face_setup_handoff','face_identity_backend_status','wake_capabilities_inspect','wake_on_lan_send','explorer_view_set','explorer_extensions_show','explorer_hidden_items_show','google_image_search','telegram_folder_prepare','recipient_set_preview','screen_share_prepare'];

test('post-freeze extension tools are registered with explicit risk and schema',()=>{
  for(const name of required){assert.ok(tools[name],name);assert.ok(tools[name].risk,name+' risk');assert.equal(tools[name].schema?.type,'object',name+' schema');}
});

test('semantic routing surfaces extension tools for user language',()=>{
  const cases=[
    ['پین ویندوز رو عوض کن','windows_pin_change_handoff'],
    ['ببین تشخیص چهره خودم آماده هست یا نه','face_identity_backend_status'],
    ['Wake on LAN سیستم رو بررسی کن','wake_capabilities_inspect'],
    ['نمای فایل‌ها رو Details کن','explorer_view_set'],
    ['عکس گربه رو تو Google Images سرچ کن','google_image_search'],
    ['پوشه کاری تلگرام رو باز کن','telegram_folder_prepare'],
    ['صفحه رو Share کن','screen_share_prepare']
  ];
  for(const [text,wanted] of cases){const names=selectToolNames(text);assert.ok(names.includes(wanted),text+' -> '+wanted);const compact=compactToolSelection(text,names,{action:true,max:32});assert.ok(compact.includes(wanted),text+' compact -> '+wanted);}
});

test('recipient set preview deduplicates and never sends',async()=>{
  const out=await runTool('recipient_set_preview',{recipients:['Ali','ali','گروه A','گروه A'],exclude:['Nobody']});
  assert.equal(out.success,true);assert.equal(out.data.count,2);assert.equal(out.data.requiresConfirmationBeforeBulkSend,true);
});

test('screen share prepare is a non-committing safe handoff',async()=>{
  const out=await runTool('screen_share_prepare',{service:'meet',source:'window',target:'Excel'});
  assert.equal(out.success,true);assert.match(out.message,/prepared/i);assert.match(out.data.next,/explicit share commit/i);
});