const rules=[
  ['angry',/(عصبانی|حرص|لعنت|اعصاب|کلافه|مزخرف|اه+|لعنتی)/i],
  ['sad',/(ناراحت|غمگین|متاسف|متأسف|شرمنده|افسوس|بد شد|نشد|نتونستم|نمی.?تونم)/i],
  ['surprised',/(جدی|واقعاً|واقعا|وای|عه|عجب|باورم نمی|چی\?|چه جالب)/i],
  ['shy',/(خجالت|خجالتی|تعریف نکن|لطف داری|مرسی.*تعریف|ای بابا)/i],
  ['happy',/(عالی|خوبه|خوب شد|انجام شد|موفق|آفرین|خوشحال|مرسی|دمت گرم|هه|خخ|😂|😄|😁|✨)/i]
];
export function detectEmotion(text=''){
  const value=String(text);
  for(const [emotion,re] of rules)if(re.test(value))return emotion;
  return 'neutral';
}
export function emotionDuration(emotion){return emotion==='neutral'?1200:emotion==='surprised'?2200:3600;}
