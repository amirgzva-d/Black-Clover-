import fs from 'node:fs';
const f='src/main/main.js';let x=fs.readFileSync(f,'utf8');
const a='function hideChat(){hideAnimated(chatWin);}';
if(!x.includes(a))throw Error('hideChat not found');
x=x.replace(a,'function hideChat(){hideAnimated(chatWin);if(!quitting){const w=showAvatar();w.showInactive();w.moveTop();}}');
fs.writeFileSync(f,x);console.log('avatar surface restored when chat closes');