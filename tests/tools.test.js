import test from 'node:test';
import assert from 'node:assert/strict';
import { tools,ollamaTools,runTool } from '../src/agent/tools.js';

test('tool definitions expose valid function schemas',()=>{const defs=ollamaTools();assert.ok(defs.length>=40);assert.equal(defs.length,Object.keys(tools).length);assert.ok(defs.every(x=>x.type==='function'&&x.function.name&&x.function.description&&x.function.parameters?.type==='object'));});
test('system info returns structured result',async()=>{const r=await runTool('get_system_info',{});assert.equal(r.success,true);assert.equal(r.tool_name,'get_system_info');assert.ok(r.data.totalRamGB>0);assert.ok(r.data.home);});
test('time tool is platform independent',async()=>{const r=await runTool('get_time',{});assert.equal(r.success,true);assert.ok(r.data.iso);});
test('unknown tool is rejected',async()=>{await assert.rejects(()=>runTool('__missing__',{}),/Unknown tool/);});
test('destructive or session-interrupting actions require confirmation',()=>{for(const name of ['shutdown_pc','restart_pc','sleep_pc','sign_out','install_app','uninstall_app','close_app','write_text_file','delete_path','take_screenshot'])assert.equal(tools[name].risk,'sensitive',`${name} must be sensitive`);});
test('core desktop capabilities exist',()=>{for(const name of ['get_volume','set_volume','volume_up','volume_down','toggle_mute','get_brightness','set_brightness','media_play_pause','media_next','media_previous','web_search','youtube_search','google_maps_search','find_app','list_installed_apps','launch_app','winget_search','lock_pc','check_windows_update'])assert.ok(tools[name],`missing ${name}`);});
test('file and clipboard capabilities exist',()=>{for(const name of ['list_directory','file_info','read_text_file','create_folder','write_text_file','delete_path','open_folder','open_file','copy_to_clipboard','read_clipboard','take_screenshot'])assert.ok(tools[name],`missing ${name}`);});
test('Windows settings shortcuts exist',()=>{for(const name of ['open_display_settings','open_sound_settings','open_bluetooth_settings','open_network_settings','open_apps_settings','open_storage_settings','open_privacy_settings','open_windows_security'])assert.ok(tools[name],`missing ${name}`);});
test('non-destructive actions do not require confirmation',()=>{for(const name of ['set_volume','set_brightness','media_play_pause','web_search','launch_app','open_folder','create_folder'])assert.notEqual(tools[name].risk,'sensitive');});
