import test from 'node:test';
import assert from 'node:assert/strict';
import { tools,ollamaTools,runTool } from '../src/agent/tools.js';

test('tool definitions expose function schemas',()=>{const defs=ollamaTools();assert.ok(defs.length>=5);assert.ok(defs.every(x=>x.type==='function'&&x.function.name));});
test('system info returns structured result',async()=>{const r=await runTool('get_system_info',{});assert.equal(r.success,true);assert.equal(r.tool_name,'get_system_info');assert.ok(r.data.totalRamGB>0);});
test('unknown tool is rejected',async()=>{await assert.rejects(()=>runTool('__missing__',{}),/Unknown tool/);});
test('sensitive tools are marked sensitive',()=>{assert.equal(tools.shutdown_pc.risk,'sensitive');assert.equal(tools.restart_pc.risk,'sensitive');});
