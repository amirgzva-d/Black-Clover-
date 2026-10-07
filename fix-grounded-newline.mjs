import fs from 'node:fs';
const p='C:\\Users\\cibesabz\\Black-Clover-Live\\src\\agent\\GroundedKnowledge.js';
let s=fs.readFileSync(p,'utf8');
s=s.replace("if(explicitResearch.test(value))return true;\\\\n  return factual.test(value)&&currentish.test(value);","if(explicitResearch.test(value))return true;\n  return factual.test(value)&&currentish.test(value);");
s=s.replace("if(explicitResearch.test(value))return true;\\n  return factual.test(value)&&currentish.test(value);","if(explicitResearch.test(value))return true;\n  return factual.test(value)&&currentish.test(value);");
fs.writeFileSync(p,s,'utf8');
console.log('grounded newline fixed');