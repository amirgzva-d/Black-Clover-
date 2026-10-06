const SECRET_LABEL=/(password|passcode|passwd|api.?key|secret|token|bearer|authorization|رمز|پسورد|توکن|کلیدs*api|کدs*دسترسی)/i;
const PRIVATE_KEY=/-----BEGIN [A-Z ]*PRIVATE KEY-----/i;
const JWT=/\beyJ[a-zA-Z0-9_-]{8,}\.[a-zA-Z0-9_-]{8,}\.[a-zA-Z0-9_-]{8,}\b/;
const BEARER=/\bBearer\s+[A-Za-z0-9._~+/=-]{12,}/i;
const LONG_SECRET=/\b(?:sk-|pk-|ghp_|github_pat_|AIza|xox[baprs]-)[A-Za-z0-9_\-]{10,}\b/;
const ASSIGNMENT=/(?:api.?key|token|secret|password|پسورد|رمز|توکن|کلید)\s*[:=]\s*[^\s,;]{6,}/i;

export function redactSecrets(text=''){
  return String(text)
    .replace(PRIVATE_KEY,'[REDACTED_PRIVATE_KEY]')
    .replace(JWT,'[REDACTED_TOKEN]')
    .replace(BEARER,'Bearer [REDACTED]')
    .replace(LONG_SECRET,'[REDACTED_SECRET]')
    .replace(ASSIGNMENT,m=>m.replace(/([:=]\s*).+$/,'$1[REDACTED]'));
}

export class MemoryPolicy{
  evaluate(text,{explicit=false,privateContext=false}={}){
    const raw=String(text||'').trim();
    if(!raw)return {allowed:false,reason:'empty',text:''};
    if(raw.length>2400)return {allowed:false,reason:'too-long',text:''};
    if(PRIVATE_KEY.test(raw)||JWT.test(raw)||BEARER.test(raw)||LONG_SECRET.test(raw)||ASSIGNMENT.test(raw))
      return {allowed:false,reason:'secret-or-token',text:''};
    if(SECRET_LABEL.test(raw)&&/(یادت|remember|ذخیره|save|نگه|حفظ)/i.test(raw))
      return {allowed:false,reason:'credential-memory-blocked',text:''};
    const sanitized=redactSecrets(raw);
    if(!explicit)return {allowed:false,reason:'not-explicit-memory',text:sanitized};
    return {allowed:true,reason:privateContext?'explicit-local-private':'explicit-safe',text:sanitized};
  }
}
export const memoryPolicy=new MemoryPolicy();
