import test from 'node:test';
import assert from 'node:assert/strict';
import { resolveChromeProfilesFromState } from '../src/agent/browser/ChromeProfileResolver.js';
import { matchFastCommand } from '../src/agent/FastCommandRouter.js';

const state={profile:{info_cache:{
  'Profile 7':{name:'Amir Mohamed',user_name:'amir@example.test'},
  'Profile 12':{name:'شرکت',user_name:'company@example.test'},
  'Default':{name:'Guest-like'}
}}};

test('Chrome resolver maps personal and business accounts by display name',()=>{
  const r=resolveChromeProfilesFromState(state);
  assert.equal(r.personal.directory,'Profile 7');
  assert.equal(r.business.directory,'Profile 12');
  assert.equal(r.personal.matchedBy,'display-name');
  assert.equal(r.business.matchedBy,'display-name');
});

test('generic Persian search deterministically routes to personal Chrome Google search',()=>{
  const r=matchFastCommand('سرچ کن معماری هوش مصنوعی عامل محور');
  assert.equal(r?.name,'chrome_search');
  assert.match(r?.args?.query||'',/معماری/);
});

test('explicit Google search also routes to chrome_search',()=>{
  const r=matchFastCommand('تو گوگل قیمت آهن رو سرچ کن');
  assert.equal(r?.name,'chrome_search');
});
