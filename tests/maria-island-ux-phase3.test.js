import test from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs/promises';
const read=rel=>fs.readFile(new URL('../'+rel,import.meta.url),'utf8');
test('the reference rectangle has no extra module tiles and icons navigate only on click',async()=>{
 const ui=await read('src/renderer/topIslandV4.js');
 assert.match(ui,/<section class="v4-preview"/);
 assert.doesNotMatch(ui,/data-preview-module=/);
 assert.doesNotMatch(ui,/hoverController\?\.hoverModule/);
 assert.match(ui,/document\.addEventListener\('click'/);
 assert.match(ui,/hoverController\?\.clickModule\(moduleId\(button\)\)/);
});
test('character waves with attached left and right arms while mouse follows pupils',async()=>{
 const [ui,css]=await Promise.all([read('src/renderer/topIslandV4.js'),read('src/renderer/topIslandV4.css')]);
 for(const name of ['v4-arm left','v4-arm right','v4-limb','v4-palm','greetCharacter','--look-x','--head-tilt'])assert.ok(ui.includes(name),name);
 for(const name of ['mariaGreetingLeft','mariaGreetingRight','mariaEyesTogether','prefers-reduced-motion'])assert.ok(css.includes(name),name);
 assert.match(ui,/const icon=e\.target\.closest/);
 assert.doesNotMatch(ui,/pointerover[\s\S]*?hoverModule/);
});
test('new file shortcut uses native picker and image thumbnails without copying targets',async()=>{
 const [ui,main,preload,editor]=await Promise.all([
  read('src/renderer/topIslandV4.js'),read('src/main/main.js'),read('src/main/preload.cjs'),read('src/renderer/shortcutEditorV4.js')
 ]);
 for(const key of ['quickAddShortcut','pickShortcutTarget','editShortcut','shortcutFileIcon','hydrateShortcutIcons','data-shortcut-open'])assert.ok(ui.includes(key),key);
 assert.ok(ui.includes('await window.blackClover.createShortcut'),'Native picker and drop add the detected shortcut immediately.');
 assert.ok(editor.includes('window.blackClover.updateShortcut'),'Advanced editor still supports renaming.');
 for(const key of ['shortcuts:file-icon','getFileIcon','nativeImage.createFromBuffer','shortcuts:pick-target'])assert.ok(main.includes(key),key);
 assert.match(preload,/shortcutFileIcon:id=>ipcRenderer.invoke/);
 assert.doesNotMatch(ui,/await fs\.rename\(/);
});
