import test from 'node:test';
import assert from 'node:assert/strict';
import { OnlineBrainClient } from '../src/agent/OnlineBrainClient.js';
import { OnlineBrainPool,onlineBrainPoolFromEnv } from '../src/agent/OnlineBrainPool.js';

test('Groq and Gemini are first-class configurable providers',()=>{
  const before={GROQ_API_KEY:process.env.GROQ_API_KEY,GEMINI_API_KEY:process.env.GEMINI_API_KEY,GROQ_MODEL:process.env.GROQ_MODEL,GEMINI_MODEL:process.env.GEMINI_MODEL};
  try{
    process.env.GROQ_API_KEY='test-groq';
    process.env.GEMINI_API_KEY='test-gemini';
    delete process.env.GROQ_MODEL;
    delete process.env.GEMINI_MODEL;
    const pool=onlineBrainPoolFromEnv(),catalog=pool.catalog();
    const groq=catalog.find(x=>x.provider==='groq'),gemini=catalog.find(x=>x.provider==='gemini');
    assert.equal(groq?.configured,true);
    assert.equal(groq?.model,'openai/gpt-oss-120b');
    assert.equal(gemini?.configured,true);
    assert.equal(gemini?.model,'gemini-3.8-flash');
  }finally{
    for(const [key,value] of Object.entries(before)){if(value===undefined)delete process.env[key];else process.env[key]=value;}
  }
});

test('general routing prefers Groq then fails over to Gemini',async()=>{
  const seen=[];
  const groq={provider:'groq',model:'g',configured:true,chat:async()=>{seen.push('groq');throw new Error('temporary');},health:async()=>false};
  const gemini={provider:'gemini',model:'m',configured:true,chat:async()=>{seen.push('gemini');return {message:{role:'assistant',content:'ok'},provider:'gemini',model:'m'};},health:async()=>true};
  const pool=new OnlineBrainPool({clients:[gemini,groq]});
  const out=await pool.chat([{role:'user',content:'سلام'}],[],{profile:'general'});
  assert.deepEqual(seen,['groq','gemini']);
  assert.equal(out.provider,'gemini');
});

test('research routing prefers Gemini',async()=>{
  const seen=[];
  const groq={provider:'groq',model:'g',configured:true,chat:async()=>{seen.push('groq');return {message:{role:'assistant',content:'g'},provider:'groq',model:'g'};},health:async()=>true};
  const gemini={provider:'gemini',model:'m',configured:true,chat:async()=>{seen.push('gemini');return {message:{role:'assistant',content:'m'},provider:'gemini',model:'m'};},health:async()=>true};
  const pool=new OnlineBrainPool({clients:[groq,gemini]});
  const out=await pool.chat([{role:'user',content:'تحقیق کن'}],[],{profile:'research'});
  assert.deepEqual(seen,['gemini']);
  assert.equal(out.provider,'gemini');
});

test('online client retries transient HTTP failures',async()=>{
  const original=globalThis.fetch;let calls=0;
  globalThis.fetch=async()=>{
    calls++;
    if(calls===1)return new Response('busy',{status:503});
    return new Response(JSON.stringify({choices:[{message:{role:'assistant',content:'ok'}}],usage:{}}),{status:200,headers:{'content-type':'application/json'}});
  };
  try{
    const client=new OnlineBrainClient({provider:'groq',apiKey:'x',baseUrl:'https://example.invalid/v1',model:'m',maxRetries:1,retryBaseMs:1,timeoutMs:1000});
    const out=await client.chat([{role:'user',content:'hi'}]);
    assert.equal(out.message.content,'ok');
    assert.equal(calls,2);
  }finally{globalThis.fetch=original;}
});

test('online client does not retry authentication failures',async()=>{
  const original=globalThis.fetch;let calls=0;
  globalThis.fetch=async()=>{calls++;return new Response('bad key',{status:401});};
  try{
    const client=new OnlineBrainClient({provider:'groq',apiKey:'x',baseUrl:'https://example.invalid/v1',model:'m',maxRetries:2,retryBaseMs:1,timeoutMs:1000});
    await assert.rejects(()=>client.chat([{role:'user',content:'hi'}]),/HTTP 401/);
    assert.equal(calls,1);
  }finally{globalThis.fetch=original;}
});


test('OpenRouter free router is configurable as a third free fallback',()=>{
  const before={OPENROUTER_API_KEY:process.env.OPENROUTER_API_KEY,OPENROUTER_MODEL:process.env.OPENROUTER_MODEL};
  try{
    process.env.OPENROUTER_API_KEY='test-openrouter';
    delete process.env.OPENROUTER_MODEL;
    const pool=onlineBrainPoolFromEnv(),item=pool.catalog().find(x=>x.provider==='openrouter');
    assert.equal(item?.configured,true);
    assert.equal(item?.model,'openrouter/free');
  }finally{
    for(const [key,value] of Object.entries(before)){if(value===undefined)delete process.env[key];else process.env[key]=value;}
  }
});

test('free-only routing excludes paid providers and keeps Groq Gemini OpenRouter',()=>{
  const mk=provider=>({provider,model:provider,configured:true,chat:async()=>({message:{role:'assistant',content:provider},provider,model:provider}),health:async()=>true});
  const pool=new OnlineBrainPool({clients:['openai','anthropic','deepseek','groq','gemini','openrouter'].map(mk),freeOnly:true});
  assert.deepEqual(pool.ordered('general').map(x=>x.provider),['groq','gemini','openrouter']);
  assert.deepEqual(pool.ordered('research').map(x=>x.provider),['gemini','groq','openrouter']);
});
