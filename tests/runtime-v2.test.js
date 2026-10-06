import test from 'node:test';
import assert from 'node:assert/strict';
import { memoryPolicy,redactSecrets } from '../src/agent/memory/MemoryPolicy.js';
import { ToolResolver } from '../src/agent/tools/ToolResolver.js';
import { SkillValidator } from '../src/agent/skills/SkillValidator.js';
import { ResultValidator } from '../src/agent/runtime/ResultValidator.js';
import { tools } from '../src/agent/toolRegistry.js';

test('Runtime V2 memory policy rejects credentials and tokens',()=>{
  assert.equal(memoryPolicy.evaluate('یادت باشه api_key=sk-supersecret123456',{explicit:true}).allowed,false);
  assert.equal(memoryPolicy.evaluate('یادت باشه رمز من abcdef123456 است',{explicit:true}).allowed,false);
  assert.match(redactSecrets('Bearer abcdefghijklmnopqrstuvwxyz123'),/REDACTED/);
  assert.equal(memoryPolicy.evaluate('یادت باشه جواب‌ها رو فارسی بده',{explicit:true}).allowed,true);
});

test('Runtime V2 tool resolver keeps action context small and search-first',()=>{
  const resolver=new ToolResolver({tools,maxTools:28}),names=resolver.resolve('سرچ کن معماری agentic AI جدید');
  assert.ok(names.includes('chrome_search'));
  assert.ok(names.length<=28);
  assert.equal(names[0],'chrome_search');
});

test('Runtime V2 result validator blocks unsupported success claims',async()=>{
  const validator=new ResultValidator({client:null});
  const out=await validator.validate({reply:'انجام شد.',userText:'فایل گزارش رو باز کن',turn:{intent:{action:true},trace:[],private:false}});
  assert.equal(out.verified,false);
  assert.match(out.text,/هنوز|تأیید/);
});

test('Skill V2 requires verified postconditions before learning',()=>{
  const mockTools={a:{risk:'low'},b:{risk:'low'}},validator=new SkillValidator({tools:mockTools});
  const weak=validator.validate('کار تست',[{name:'a',success:true,verification:{ok:true,level:'reported'}},{name:'b',success:true,verification:{ok:true,level:'reported'}}]);
  assert.equal(weak.valid,false);
  const strong=validator.validate('کار تست',[{name:'a',success:true,verification:{ok:true,level:'hard',reason:'exists'}},{name:'b',success:true,verification:{ok:true,level:'observed',reason:'window-found'}}]);
  assert.equal(strong.valid,true);
  assert.ok(strong.confidence>=.8);
});
