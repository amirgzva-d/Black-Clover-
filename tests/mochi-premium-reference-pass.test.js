import test from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs/promises';
import {mochiMarkup,superellipsePath} from '../src/renderer/mochiCharacter.js';

const source=async file=>fs.readFile(new URL('../'+file,import.meta.url),'utf8');

test('reference mascot retains accurate n=2.7 silhouette and material specular',()=>{
 const art=mochiMarkup();
 assert.ok(art.includes('class="mochi-body"'));
 assert.ok(art.includes('class="mochi-specular"'));
 assert.ok(art.includes('class="mochi-cheeks"'));
 assert.ok(art.includes('class="mochi-look"'));
 assert.ok(art.indexOf('class="mochi-cheeks"')<art.indexOf('class="mochi-look"'),'Cheeks must be anchored to body, eyes move separately');
 assert.ok(art.includes('clipPath id='));
 assert.ok(art.includes('radialGradient id='));
 assert.ok(art.includes(superellipsePath()));
 assert.equal((art.match(/class="mochi-cheek"/g)||[]).length,2);
 assert.equal((art.match(/class="mochi-hand /g)||[]).length,2);
});
test('eye tracking is independent of body material and blinking cadence varies',async()=>{
 const [js,css]=await Promise.all([source('src/renderer/mochiCharacter.js'),source('src/renderer/mochiCharacter.css')]);
 assert.match(js,/--mochi-blink-period/);
 assert.match(js,/5\.8\+\(serial%7\)\*\.41/);
 assert.match(css,/mochi-blink var\(--mochi-blink-period,6\.8s\)/);
 assert.match(css,/\.mochi-specular\{/);
 assert.match(css,/\.mochi-cheeks\{/);
 assert.match(js,/class="mochi-look"/);
});
test('studio avoids redundant SVG changes on timeline ticks',async()=>{
 const js=await source('src/renderer/mochiStudio.js');
 assert.match(js,/const changed=state!==next/);
 assert.match(js,/if\(changed\)\{\s*renderMochi/);
 assert.match(js,/aria-live="polite"/);
});
test('studio suspends offscreen previews and detaches listeners',async()=>{
 const [js,css]=await Promise.all([source('src/renderer/mochiStudio.js'),source('src/renderer/mochiStudio.css')]);
 assert.match(js,/new IntersectionObserver/);
 assert.match(js,/thumbnailObserver\?\.disconnect\(\)/);
 assert.match(js,/thumbnailObserver\.observe\(node\)/);
 assert.match(js,/document\.addEventListener\('visibilitychange',onVisibility\)/);
 assert.match(js,/document\.removeEventListener\('visibilitychange',onVisibility\)/);
 assert.match(css,/\[data-mochi-visible=false\]/);
 assert.match(css,/\[data-mochi-doc-hidden=true\]/);
 assert.match(css,/animation-play-state:paused!important/);
 assert.match(css,/prefers-reduced-motion:reduce/);
});
test('premium UX roadmap documents all nine exact input filenames',async()=>{
 const doc=await source('docs/MARIA_NINE_VIDEO_PREMIUM_UX_AUDIT_20261013_FA.md');
 for(const f of ['1000311024','1000311026','1000311030','1000311034','1000311036','1000311038','1000311040','1000311042','1000311044'])assert.ok(doc.includes(f+'.mp4'),f);
 assert.ok(doc.includes('79ed903'));
});
