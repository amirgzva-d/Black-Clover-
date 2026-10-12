import test from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs/promises';
const read=rel=>fs.readFile(new URL('../'+rel,import.meta.url),'utf8');

test('four module actions share right toolbar alongside Settings and Sound',async()=>{
  const [ui,css]=await Promise.all([read('src/renderer/topIslandV4.js'),read('src/renderer/topIslandV4.css')]);
  const start=ui.indexOf('<header class="v4-topbar">');
  const header=ui.slice(start,ui.indexOf('</header>',start));
  assert.ok(start>0);
  const right=header.slice(header.indexOf('<nav class="v4-right-tools"'),header.indexOf('</nav>',header.indexOf('<nav class="v4-right-tools"')));
  assert.match(right,/PAGES\.filter\(x=>\['shortcuts','pins','tasks','reports'\]\.includes\(x\.id\)\)/);
  assert.match(right,/class="v4-right-module"/);
  assert.match(right,/data-page="\$\{x\.id\}"/);
  assert.match(right,/data-settings/);
  assert.match(right,/data-panel-sound/);
  assert.ok(right.indexOf('v4-right-module')<right.indexOf('data-settings'),'Modules appear directly before settings');
  assert.doesNotMatch(header,/v4-section-tools|v4-section-button/,'No centered selector bar or extra button labels');
  assert.doesNotMatch(right,/<span>\$\{esc\(x\.id/, 'Icons are label-free visually');
  assert.match(css,/\.maria-island-v4\[data-mode=preview\] \.v4-right-tools/);
  assert.match(css,/width:36px!important/);
  assert.match(css,/stroke-width:1\.7!important/);
  assert.match(css,/\.maria-island-v4\[data-mode=peek\] \.v4-right-tools\{display:none!important\}/);
});
test('functional buttons keep recognizable consistent outline icons',async()=>{
  const ui=await read('src/renderer/topIslandV4.js');
  assert.match(ui,/launch:'<svg[^']*<rect x="3\.5"/);
  assert.match(ui,/report:'<svg[^']*<rect x="5"/);
  assert.match(ui,/pin:'<svg/);
  assert.match(ui,/clock:'<svg/);
  assert.match(ui,/classList\.toggle\('active',active\)/);
  assert.match(ui,/aria-current','page'/);
});
test('reference companion keeps independent hands/eyes without unwanted mouth',async()=>{
  const [ui,css]=await Promise.all([read('src/renderer/topIslandV4.js'),read('src/renderer/topIslandV4.css')]);
  for(const fragment of ['v4-arm left','v4-arm right','v4-palm','eye left','eye right','data-character','--look-x','--head-x'])assert.ok(ui.includes(fragment),fragment);
  assert.match(css,/\[data-mode=preview\] \.v4-character \.mouth\{display:none!important\}/);
  assert.match(css,/\[data-mode=preview\] \.v4-character \.v4-limb\{display:none!important\}/);
});
test('mini default remains click-only with independently navigable modules',async()=>{
  const [ui,main]=await Promise.all([read('src/renderer/topIslandV4.js'),read('src/main/main.js')]);
  assert.match(ui,/setMode\('peek'\)/);
  assert.match(ui,/hoverController\?\.clickModule\(moduleId\(button\)\)/);
  assert.match(main,/mode==='peek'\?\{width:Math\.min\(292,maxW\),height:54\}/);
});
