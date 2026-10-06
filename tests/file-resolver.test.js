import test from 'node:test';
import assert from 'node:assert/strict';
import { rankFileCandidates,bestFileCandidate } from '../src/agent/files/FileResolver.js';

const rows=[
  {name:'گزارش فروش قدیمی.xlsx',path:'C:\\Archive\\گزارش فروش قدیمی.xlsx',type:'file',extension:'.xlsx',modified:'2025-01-01T00:00:00Z'},
  {name:'گزارش فروش.xlsx',path:'D:\\Company\\Sales\\گزارش فروش.xlsx',type:'file',extension:'.xlsx',modified:'2026-10-01T00:00:00Z'},
  {name:'گزارش فروش.xlsx',path:'C:\\Users\\x\\AppData\\Local\\Temp\\گزارش فروش.xlsx',type:'file',extension:'.xlsx',modified:'2026-10-06T00:00:00Z'}
];

test('file resolver prefers exact useful path over partial or temp matches',()=>{
  const ranked=rankFileCandidates(rows,{query:'گزارش فروش.xlsx',extensions:['xlsx'],pathHint:'Company'});
  assert.equal(ranked[0].path,'D:\\Company\\Sales\\گزارش فروش.xlsx');
  assert.ok(ranked[0]._matchScore>ranked[1]._matchScore);
});

test('file resolver reports ambiguity for similarly strong weak matches',()=>{
  const r=bestFileCandidate([
    {name:'final report.txt',path:'C:\\A\\final report.txt',type:'file',extension:'.txt'},
    {name:'final report copy.txt',path:'D:\\B\\final report copy.txt',type:'file',extension:'.txt'}
  ],{query:'final report'});
  assert.ok(r.best);
});
