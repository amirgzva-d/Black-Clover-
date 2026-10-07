export function classifyToolError(error='') {
  const text=String(error?.message||error||'').toLowerCase();
  if(/timeout|timed out|abort/.test(text))return 'timeout';
  if(/not found|enoent|could not be discovered|missing/.test(text))return 'not_found';
  if(/permission|denied|blocked|protected|confirm/.test(text))return 'permission';
  if(/network|fetch|internet|dns|http 429|http 5\d\d/.test(text))return 'transient';
  if(/invalid|schema|argument|parse/.test(text))return 'invalid_input';
  return 'tool_error';
}

export function toolResult({name,args={},raw=null,error=null,durationMs=0,attempt=0,status='done'}={}) {
  const rawSuccess=raw?.success!==false;
  const success=!error&&rawSuccess&&status==='done';
  return {
    tool:name,
    args,
    success,
    status,
    data:raw?.data??null,
    message:raw?.message||'',
    error:error?String(error?.message||error):rawSuccess?'':String(raw?.error||raw?.message||'Tool failed'),
    errorClass:error||!rawSuccess?classifyToolError(error||raw?.error||raw?.message):null,
    durationMs,
    attempt,
    raw
  };
}
