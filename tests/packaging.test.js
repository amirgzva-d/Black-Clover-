import test from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs';

test('packaged Electron build uses relative Vite asset paths',()=>{
  const config=fs.readFileSync(new URL('../vite.config.js',import.meta.url),'utf8');
  assert.match(config,/base:\s*['"]\.\/['"]/,'Vite base must stay relative for file:// Electron builds');
});

test('package keeps the production renderer build in installer files',()=>{
  const pkg=JSON.parse(fs.readFileSync(new URL('../package.json',import.meta.url),'utf8'));
  assert.ok(pkg.build?.files?.includes('dist/**/*'));
});
