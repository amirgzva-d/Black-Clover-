import fs from 'node:fs';
function update(file,fn){const s=fs.readFileSync(file,'utf8'),out=fn(s);if(s!==out)fs.writeFileSync(file,out);}
update('src/agent/BrainRouter.js',s=>{
 s=s.replace("  async localChat(messages,tools,profile,preferred){","  async localChat(messages,tools,profile,preferred,onDelta=null){");
 s=s.replace("const out=await client.chat(messages,tools);","const out=onDelta&&typeof client.chatStream==='function'?await client.chatStream(messages,tools,onDelta):await client.chat(messages,tools);\n        if(!String(out?.message?.content||'').trim()&&!out?.message?.tool_calls?.length)throw new Error('Model returned no final answer');");
 s=s.replace("modelOverride='auto'}={}){\n    profile=inferProfile","modelOverride='auto',onDelta=null}={}){\n    this.lastFallbackReason='';\n    profile=inferProfile");
 s=s.replace("const out=await cloud.chat(messages,tools);","const out=onDelta&&typeof cloud.chatStream==='function'?await cloud.chatStream(messages,tools,onDelta):await cloud.chat(messages,tools);");
 s=s.replace("const out=await this.online.chat(messages,tools,{profile,provider,model});","const out=onDelta&&typeof this.online.chatStream==='function'?await this.online.chatStream(messages,tools,{profile,provider,model},onDelta):await this.online.chat(messages,tools,{profile,provider,model});");
 s=s.replace("const out=await this.online.chat(messages,tools,{profile,provider:'auto',model:'auto'});","const out=onDelta&&typeof this.online.chatStream==='function'?await this.online.chatStream(messages,tools,{profile,provider:'auto',model:'auto'},onDelta):await this.online.chat(messages,tools,{profile,provider:'auto',model:'auto'});");
 s=s.replace("messages,tools,profile,preferred);\n  }","messages,tools,profile,preferred,onDelta);\n  }");
 const start=s.indexOf('  async chatStream('),end=s.indexOf('  async health(){',start);
 if(start<0||end<0)throw new Error('stream boundaries missing');
 return s.slice(0,start)+"  async chatStream(messages,tools=[],options={},onDelta=()=>{}){\n    return this.chat(messages,tools,{...options,onDelta:tools?.length?null:onDelta});\n  }\n"+s.slice(end);
});
update('src/renderer/main.js',s=>s.replace("        if(response?.text&&voice.enabled)voice.speak(response.text);\n",""));
console.log('Unified streaming and ordinary brain routing; removed duplicate chat speech.');
