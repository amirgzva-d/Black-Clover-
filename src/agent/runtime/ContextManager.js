import { isPrivateRequest } from '../PrivacyClassifier.js';
import { actionIntent } from '../ActionIntent.js';
import { shouldGroundKnowledge } from '../GroundedKnowledge.js';
import { canonicalizeCommand } from '../SemanticCanonicalizer.js';
import { RunContext } from './RunContext.js';

const coding=/\b(code|coding|javascript|typescript|python|react|node|npm|git|api|sql|bug|debug|refactor|function|class)\b|کد|کدنویس|برنامه.?نویسی|باگ|دیباگ|ری.?فکتور|پروژه/i;
const research=/(تحقیق|منبع|منابع|آخرین|جدیدترین|امروز|فعلی|بررسی کن|از وب|از اینترنت|سرچ کن|جستجو کن|research|latest|current|sources?)/i;
const complex=/(تحلیل عمیق|تحلیل کامل|استدلال|اثبات|مقایسه دقیق|معماری|طراحی سیستم|قدم به قدم|مرحله به مرحله|مزایا و معایب|ریسک|trade.?off|deep analysis|reasoning|architecture)/i;
const persian=/[\u0600-\u06FF]/;

export function inferTextProfile(text='',mode='chat') {
  const value=String(text||'');
  if(coding.test(value))return 'coding';
  if(mode==='research'||research.test(value))return 'research';
  const clauses=(value.match(/[؟?!\n]|(?:\sو\s)/g)||[]).length;
  if(complex.test(value)||value.length>420||clauses>=5)return 'complex';
  return mode==='action'?'general':'chat';
}

export class ContextManager {
  build({text='',history=[],hints=[],options={}}={}) {
    const input=String(text||'').trim();
    const canonical=canonicalizeCommand(input);
    const intent=actionIntent(canonical);
    const privateContext=isPrivateRequest(input,hints);
    const grounded=!privateContext&&shouldGroundKnowledge(input);
    const mode=intent.action?'action':grounded||research.test(input)?'research':'chat';
    const requestedProfile=String(options?.profile||'auto').toLowerCase();
    const profile=requestedProfile&&requestedProfile!=='auto'&&requestedProfile!=='general'
      ?requestedProfile
      :inferTextProfile(input,mode);
    const allowPrivateCloud=options?.allowPrivateCloud===true;
    const allowOnline=privateContext?allowPrivateCloud:options?.allowOnline!==false;

    return new RunContext({
      goal:input,
      input,
      mode,
      profile,
      privateContext,
      allowOnline,
      options,
      history
    });
  }

  publicHistory(history=[]) {
    return (Array.isArray(history)?history:[]).filter(message=>!message?._private||message.role==='system');
  }

  isPersian(text='') {
    return persian.test(String(text||''));
  }
}
