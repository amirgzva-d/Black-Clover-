export class RecoveryEngine {
  decide({errorClass='',attempt=0,maxAttempts=2,verification=null}={}) {
    if(verification?.ok===false&&verification?.verified===false&&attempt<maxAttempts) {
      return {action:'replan',reason:verification.reason||'postcondition-failed'};
    }
    if(['timeout','transient'].includes(errorClass)&&attempt<maxAttempts) {
      return {action:'retry',reason:errorClass};
    }
    if(errorClass==='not_found'&&attempt<maxAttempts) {
      return {action:'resolve-again',reason:'target-not-found'};
    }
    if(errorClass==='permission')return {action:'stop',reason:'permission-or-confirmation'};
    if(errorClass==='invalid_input'&&attempt<maxAttempts)return {action:'replan',reason:'invalid-tool-input'};
    return {action:'stop',reason:errorClass||'unrecoverable'};
  }
}
