import fs from 'node:fs';
const p='C:\\Users\\cibesabz\\Black-Clover-Live\\src\\agent\\OnlineBrainPool.js';
let s=fs.readFileSync(p,'utf8');
if(!s.includes("github:{label:'GitHub Models")){
  s=s.replace(
    "export const BRAIN_PROVIDER_PRESETS=Object.freeze({",
    "export const BRAIN_PROVIDER_PRESETS=Object.freeze({\n  github:{label:'GitHub Models • Free Tier',baseUrl:'https://models.github.ai/inference',model:'openai/gpt-4o-mini',note:'GitHub Models؛ سهمیه رایگان محدود برای حساب GitHub'},"
  );
}
s=s.replace(
  "const keyMap={openai:'OPENAI_API_KEY'",
  "const keyMap={github:'GITHUB_MODELS_TOKEN',openai:'OPENAI_API_KEY'"
);
s=s.replace(
  "const baseMap={openai:'OPENAI_BASE_URL'",
  "const baseMap={github:'GITHUB_MODELS_BASE_URL',openai:'OPENAI_BASE_URL'"
);
s=s.replace(
  "const modelMap={openai:'OPENAI_MODEL'",
  "const modelMap={github:'GITHUB_MODELS_MODEL',openai:'OPENAI_MODEL'"
);
s=s.replace(
  "if(profile==='coding')return ({anthropic:0,openai:1,deepseek:2,qwen:3,openrouter:4,gemini:5,groq:6,mistral:7}[c.provider]??9);",
  "if(profile==='coding')return ({github:0,anthropic:1,openai:2,deepseek:3,qwen:4,openrouter:5,gemini:6,groq:7,mistral:8}[c.provider]??9);"
);
s=s.replace(
  "if(profile==='research')return ({openai:0,qwen:1,gemini:2,anthropic:3,deepseek:4,openrouter:5,groq:6,mistral:7}[c.provider]??9);",
  "if(profile==='research')return ({github:0,openai:1,qwen:2,gemini:3,anthropic:4,deepseek:5,openrouter:6,groq:7,mistral:8}[c.provider]??9);"
);
s=s.replace(
  "return ({openrouter:0,qwen:1,gemini:2,deepseek:3,openai:4,anthropic:5,groq:6,mistral:7}[c.provider]??9);",
  "return ({github:0,openrouter:1,qwen:2,gemini:3,deepseek:4,openai:5,anthropic:6,groq:7,mistral:8}[c.provider]??9);"
);
fs.writeFileSync(p,s,'utf8');
console.log('GitHub Models provider added');
