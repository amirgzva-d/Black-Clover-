import test from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs/promises';
import os from 'node:os';
import path from 'node:path';
import JSZip from 'jszip';
import { tools } from '../src/agent/toolRegistry.js';
import { selectToolNames } from '../src/agent/SmartToolRouter.js';
import { toolMakesContextPrivate } from '../src/agent/PrivacyClassifier.js';

test('document and storage capability pack is registered',()=>{
  for(const name of ['global_find_files','open_named_file','excel_read_range','excel_set_cells','excel_append_rows','excel_add_image','excel_collect_images','messenger_open','messenger_stage_files','copy_files_to_clipboard']) assert.ok(tools[name],`missing ${name}`);
});

test('Persian Excel workflow routes storage spreadsheet and messenger tools',()=>{
  const names=selectToolNames('فایل اکسل فروش مهر رو تو کل سیستم پیدا کن عکس‌های داخلش رو در تلگرام بفرست');
  assert.ok(names.includes('global_find_files'));
  assert.ok(names.includes('excel_collect_images'));
  assert.ok(names.includes('messenger_stage_files'));
  assert.ok(names.includes('inspect_ui'));
});

test('local workbook and messenger context stays private',()=>{
  for(const name of ['global_find_files','excel_read_range','excel_set_cells','excel_collect_images','messenger_stage_files']) assert.equal(toolMakesContextPrivate(name),true,name);
});

test('Excel image collector extracts embedded OOXML media without Office',async()=>{
  const dir=await fs.mkdtemp(path.join(os.tmpdir(),'bc-xlsx-')),file=path.join(dir,'sample.xlsx'),out=path.join(dir,'out');
  const zip=new JSZip();
  zip.file('[Content_Types].xml','<?xml version="1.0"?><Types xmlns="http://schemas.openxmlformats.org/package/2006/content-types"></Types>');
  zip.file('xl/media/image1.png',Buffer.from([137,80,78,71,13,10,26,10]));
  await fs.writeFile(file,await zip.generateAsync({type:'nodebuffer'}));
  const r=await tools.excel_collect_images.run({file,output_directory:out});
  assert.equal(r.success,true);
  assert.equal(r.data.count,1);
  assert.equal(path.basename(r.data.images[0].path),'image1.png');
  await fs.rm(dir,{recursive:true,force:true});
});
