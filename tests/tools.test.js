import test from 'node:test';
import assert from 'node:assert/strict';
import { tools,ollamaTools,runTool } from '../src/agent/tools.js';

test('tool definitions expose function schemas',()=>{const defs=ollamaTools();assert.ok(defs.length>=15);assert.ok(defs.every(x=>x.type==='function'&&x.function.name&&x.function.parameters));});
test('system info returns structured result',async()=>{const r=await runTool('get_system_info',{});assert.equal(r.success,true);assert.equal(r.tool_name,'get_system_info');assert.ok(r.data.totalRamGB>0);});
test('unknown tool is rejected',async()=>{await assert.rejects(()=>runTool('__missing__',{}),/Unknown tool/);});
test('power tools that interrupt the session require confirmation',()=>{assert.equal(tools.shutdown_pc.risk,'sensitive');assert.equal(tools.restart_pc.risk,'sensitive');assert.equal(tools.sleep_pc.risk,'sensitive');});
test('MVP exposes volume brightness media and web tools',()=>{for(const name of ['get_volume','set_volume','get_brightness','set_brightness','media_play_pause','media_next','media_previous','web_search','youtube_search','launch_app','lock_pc'])assert.ok(tools[name],`missing ${name}`);});
test('non-destructive MVP actions are not marked sensitive',()=>{for(const name of ['set_volume','set_brightness','media_play_pause','web_search','launch_app'])assert.notEqual(tools[name].risk,'sensitive');});
