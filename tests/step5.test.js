import test from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs/promises';
import os from 'node:os';
import path from 'node:path';
import { selectToolNames } from '../src/agent/SmartToolRouter.js';
import { isPrivateRequest,toolMakesContextPrivate } from '../src/agent/PrivacyClassifier.js';
import { PermissionPolicy } from '../src/agent/PermissionPolicy.js';

test('smart router keeps casual chat tool-free',()=>{assert.deepEqual(selectToolNames('سلام ماریا امروز حالت چطوره؟'),[]);});
test('smart router narrows common intents',()=>{const audio=selectToolNames('صدا رو روی ۳۰ درصد بزار');assert.ok(audio.includes('set_volume'));assert.ok(!audio.includes('delete_path'));const files=selectToolNames('فایل گزارش رو تو دانلودها پیدا کن');assert.ok(files.includes('search_files'));assert.ok(!files.includes('shutdown_pc'));});
test('screen and social tasks expose UI automation and local vision',()=>{const names=selectToolNames('تو واتساپ روی صفحه مخاطب رو پیدا کن و پیام بفرست');for(const n of ['open_social_web','inspect_ui','vision_inspect_screen','set_ui_value'])assert.ok(names.includes(n),`missing ${n}`);});
test('privacy classifier keeps personal computer context local',()=>{assert.equal(isPrivateRequest('محتوای کلیپ بورد من رو بخون'),true);assert.equal(isPrivateRequest('آخرین خبرهای فناوری رو آنلاین تحقیق کن'),false);assert.equal(toolMakesContextPrivate('vision_inspect_screen'),true);assert.equal(toolMakesContextPrivate('read_text_file'),true);});
test('autonomous profile confirms destructive actions but not ordinary control',async()=>{const dir=await fs.mkdtemp(path.join(os.tmpdir(),'bc-policy-'));try{const p=new PermissionPolicy({directory:dir});assert.equal(await p.shouldConfirm('set_volume',{risk:'low'},{percent:20}),false);assert.equal(await p.shouldConfirm('type_text',{risk:'sensitive'},{text:'hello'}),false);assert.equal(await p.shouldConfirm('delete_path',{risk:'sensitive'},{target:'C:/Temp/a.txt'}),true);assert.equal(await p.shouldConfirm('uninstall_app',{risk:'sensitive'},{id:'Example.App'}),true);}finally{await fs.rm(dir,{recursive:true,force:true});}});
test('never-delete rules persist and hard-block protected targets',async()=>{const dir=await fs.mkdtemp(path.join(os.tmpdir(),'bc-protect-'));try{const p=new PermissionPolicy({directory:dir});await p.protect('C:/Important',{note:'test'});await assert.rejects(()=>p.assertAllowed('delete_path',{target:'C:/Important'}),/محافظت/);const second=new PermissionPolicy({directory:dir});const s=await second.status();assert.ok(s.protectedResources.some(x=>x.label==='C:/Important'));}finally{await fs.rm(dir,{recursive:true,force:true});}});
