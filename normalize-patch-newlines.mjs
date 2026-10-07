import fs from 'node:fs';
const files=[
'C:\\Users\\cibesabz\\Black-Clover-Live\\src\\main\\main.js',
'C:\\Users\\cibesabz\\Black-Clover-Live\\src\\agent\\ProjectService.js',
'C:\\Users\\cibesabz\\Black-Clover-Live\\src\\agent\\GroundedKnowledge.js'
];
for(const p of files){
 let s=fs.readFileSync(p,'utf8');
 s=s.replaceAll('}\\\\nasync function refreshBrainProviders','}\nasync function refreshBrainProviders');
 s=s.replaceAll(';}\\\\n  async list()', ';}\n  async list()');
 s=s.replaceAll('true;\\\\n  return factual', 'true;\n  return factual');
 fs.writeFileSync(p,s,'utf8');
}
console.log('literal patch markers normalized');