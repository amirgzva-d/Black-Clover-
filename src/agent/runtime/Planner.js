import { actionIntent } from '../ActionIntent.js';
import { shouldGroundKnowledge } from '../GroundedKnowledge.js';

const hardQuestion=/(تحلیل|تخصصی|حرفه.?ای|معماری|طراحی سیستم|مقایسه عمیق|اثبات|استدلال|چند مرحله|ریشه.?یابی|debug|دیباگ|complex|advanced)/i;
const researchWords=/(تحقیق|منبع|جدیدترین|آخرین|امروز|فعلی|research|latest|current|source)/i;
const codingWords=/(کد|کدنویسی|برنامه.?نویسی|repository|repo|git|npm|build|test|refactor|باگ|bug|code)/i;

export class Planner{
  constructor({resolver,defaultTools=[]}={}){this.resolver=resolver;this.defaultTools=defaultTools;}
  plan(text,{hints=[]}={}){
    const intent=actionIntent(text),routeNames=this.resolver?.resolve(text,hints,this.defaultTools)||[];
    let profile='chat';
    if(codingWords.test(text))profile='coding';
    else if(researchWords.test(text)||shouldGroundKnowledge(text))profile='research';
    else if(hardQuestion.test(text)||String(text||'').length>420||intent.multiStep)profile='complex';
    else if(intent.action)profile='general';
    return {intent,routeNames,profile,groundKnowledge:!intent.action&&shouldGroundKnowledge(text),requiresTools:intent.action||routeNames.length>0};
  }
}
