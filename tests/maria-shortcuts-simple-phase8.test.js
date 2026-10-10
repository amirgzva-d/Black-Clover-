import test from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs/promises';
import os from 'node:os';
import path from 'node:path';
import {QuickShortcutStore} from '../src/agent/QuickShortcutStore.js';
import {resolveShortcutTarget} from '../src/agent/ShortcutTargetResolver.js';
const source=relative=>fs.readFile(new URL('../'+relative,import.meta.url),'utf8');

test('Shortcuts has exactly two primary creation pathways: + picker and native drag-drop',async()=>{
  const [ui,css]=await Promise.all([source('src/renderer/topIslandV4.js'),source('src/renderer/topIslandV4.css')]);
  assert.match(ui,/if\(page==='shortcuts'\)return openShortcutQuickMenu\(\)/);
  assert.match(ui,/data-quick-pick="file"/);
  assert.match(ui,/data-quick-pick="folder"/);
  assert.match(ui,/name="quick-target"/);
  assert.match(ui,/window\.blackClover\.pickShortcutTarget\(button\.dataset\.quickPick\)/);
  assert.match(ui,/await quickAddShortcut\(chosen\)/);
  assert.match(ui,/data-shortcut-drop-area/);
  assert.match(ui,/getDroppedFilePath\(f\)/);
  assert.match(ui,/for\(const target of targets\)/);
  assert.match(ui,/const result=await quickAddShortcut\(target\)/);
  assert.match(ui,/root\.addEventListener\('drop'/);
  assert.doesNotMatch(ui,/quickAddShortcut\(location\|\|url\)/);
  assert.match(css,/\.v4-shortcut-pick-actions/);
  assert.match(css,/\.v4-shortcut-drop-hint/);
});
test('added shortcut card displays real icon/thumbnail, label, extension and original path',async()=>{
  const [ui,main,css,preload]=await Promise.all([
    source('src/renderer/topIslandV4.js'),source('src/main/main.js'),
    source('src/renderer/topIslandV4.css'),source('src/main/preload.cjs')
  ]);
  assert.match(ui,/data-shortcut-preview="\$\{isImage\?'image':'icon'\}"/);
  assert.match(ui,/data-shortcut-icon="\$\{esc\(x\.id\)\}"/);
  assert.match(ui,/class="v4-shortcut-info"/);
  assert.match(ui,/class="v4-shortcut-path"/);
  assert.match(ui,/data-shortcut-open/);
  assert.match(ui,/hydrateShortcutIcons/);
  assert.match(main,/app\.getFileIcon\(target,\{size:'large'\}\)/);
  assert.match(main,/nativeImage\.createFromBuffer/);
  assert.match(preload,/shortcutFileIcon:id=>ipcRenderer\.invoke/);
  assert.match(css,/\[data-shortcut-preview="image"\] \.v4-app-icon img\{object-fit:cover/);
});
test('secondary features stay hidden in three-dot menu without cluttering cards',async()=>{
  const [ui,main,preload]=await Promise.all([
    source('src/renderer/topIslandV4.js'),source('src/main/main.js'),source('src/main/preload.cjs')
  ]);
  assert.match(ui,/function openShortcutOptions\(id\)/);
  for(const action of ['open','copy','reveal','favorite','edit','remove'])assert.ok(ui.includes('data-shortcut-action="'+action+'"'),action);
  assert.match(ui,/window\.blackClover\.copyShortcutTarget/);
  assert.match(ui,/window\.blackClover\.revealShortcut/);
  assert.match(ui,/window\.blackClover\.updateShortcut\(item\.id,\{pinned:!item\.pinned\}\)/);
  assert.match(main,/shortcuts:copy-target/);
  assert.match(main,/shortcuts:reveal/);
  assert.match(preload,/copyShortcutTarget:id/);
  assert.match(preload,/revealShortcut:id/);
  assert.match(ui,/confirm\('فقط میان‌بر حذف شود؟/);
});
test('real folder, document, program, media and URL targets stay unchanged',async()=>{
  const folder=await fs.mkdtemp(path.join(os.tmpdir(),'maria-shortcuts-simple-'));
  try{
    const originals=[
      ['report.xlsx','file'],
      ['photo.png','file'],
      ['video.mp4','media'],
      ['program.exe','app']
    ];
    const store=new QuickShortcutStore({directory:path.join(folder,'data')});
    for(const [basename,expected] of originals){
      const target=path.join(folder,basename);
      await fs.writeFile(target,'ORIGINAL_'+basename);
      const resolved=await resolveShortcutTarget(target);
      assert.equal(resolved.kind,expected);
      const item=await store.create({...resolved,target});
      assert.equal(item.target,target);
    }
    const folderResult=await resolveShortcutTarget(folder);
    assert.equal(folderResult.kind,'folder');
    const website=await resolveShortcutTarget('https://example.org/demo');
    assert.equal(website.kind,'url');
    const site=await store.create(website);
    await store.update(site.id,{pinned:true});
    assert.equal((await store.list())[0].id,site.id,'pinned item is sorted to the front');
    for(const item of await store.list())await store.remove(item.id);
    for(const [basename] of originals)assert.equal(
      await fs.readFile(path.join(folder,basename),'utf8'),'ORIGINAL_'+basename,
      'removing a shortcut must not delete/copy/move the original file'
    );
  }finally{await fs.rm(folder,{recursive:true,force:true});}
});
