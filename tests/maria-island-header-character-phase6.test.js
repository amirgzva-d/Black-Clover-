import test from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs/promises';
const read=rel=>fs.readFile(new URL('../'+rel,import.meta.url),'utf8');

test('reference rectangle has real clickable module navigation in its TOP header',async()=>{
 const [ui,css]=await Promise.all([read('src/renderer/topIslandV4.js'),read('src/renderer/topIslandV4.css')]);
 assert.match(ui,/<header class="v4-topbar">/);
 const header=ui.slice(ui.indexOf('<header class="v4-topbar">'),ui.indexOf('</header>',ui.indexOf('<header class="v4-topbar">')));
 assert.match(header,/<nav class="v4-section-tools"/);
 assert.match(header,/data-page="\$\{x\.id\}"/);
 assert.match(header,/\['shortcuts','pins','tasks','reports'\]/);
 assert.match(header,/v4-section-button/);
 assert.ok(header.indexOf('v4-section-tools')<header.indexOf('v4-center'),'Navigation must precede the companion in header');
 assert.match(css,/\.v4-section-tools\s*\{/);
 assert.match(css,/\.maria-island-v4\[data-mode=preview\] \.v4-section-tools/);
 assert.match(css,/\.maria-island-v4\[data-mode=peek\] \.v4-section-tools\{display:none!important\}/);
 assert.match(ui,/hoverController\?\.clickModule\(moduleId\(button\)\)/);
});
test('white companion in preview has two independently moving eyes and two detached hands',async()=>{
 const [ui,css]=await Promise.all([read('src/renderer/topIslandV4.js'),read('src/renderer/topIslandV4.css')]);
 for(const fragment of ['v4-arm left','v4-arm right','v4-palm','eye left','eye right','data-character','--look-x','--head-x'])assert.ok(ui.includes(fragment),fragment);
 assert.match(css,/\[data-mode=preview\] \.v4-character \.mouth\{display:none!important\}/);
 assert.match(css,/\[data-mode=preview\] \.v4-character \.v4-limb\{display:none!important\}/);
 assert.match(css,/\[data-mode=preview\] \.v4-arm\.left/);
 assert.match(css,/\[data-mode=preview\] \.v4-arm\.right/);
 assert.match(css,/@media\(prefers-reduced-motion:reduce\)/);
});
test('mini is still the default and topbar click keeps actual module navigation',async()=>{
 const [ui,main]=await Promise.all([read('src/renderer/topIslandV4.js'),read('src/main/main.js')]);
 assert.match(ui,/setMode\('peek'\)/);
 assert.match(ui,/class="v4-section-button"/);
 assert.match(ui,/\.map\(x=>/);
 assert.match(main,/mode==='peek'\?\{width:Math\.min\(292,maxW\),height:54\}/);
});
