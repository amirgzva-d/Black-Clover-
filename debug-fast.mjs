import {matchFastCommand} from './src/agent/FastCommandRouter.js';
import {normalizePersianCommand} from './src/agent/language.js';
for(const q of ['پایتخت ژاپن کجاست؟','صدا رو زیاد کن','فایل گزارش من کجاست؟']) console.log(q, normalizePersianCommand(q), matchFastCommand(normalizePersianCommand(q)));
