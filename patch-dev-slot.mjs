import fs from 'node:fs';
const p='C:\\Users\\cibesabz\\Black-Clover-Live\\src\\main\\main.js';
let s=fs.readFileSync(p,'utf8');
const old=`if(isDev){
  app.setPath('userData',path.join(app.getPath('appData'),'BlackCloverLiveDev'));
  app.setPath('cache',path.join(app.getPath('temp'),'BlackCloverLiveDevCache'));
  app.commandLine.appendSwitch('remote-debugging-port','9223');
}`;
const neu=`if(isDev){
  const slot=String(process.env.BLACK_CLOVER_DEV_SLOT||'').replace(/[^a-z0-9_-]/gi,'').slice(0,24);
  const suffix=slot?'-'+slot:'';
  app.setPath('userData',path.join(app.getPath('appData'),'BlackCloverLiveDev'+suffix));
  app.setPath('cache',path.join(app.getPath('temp'),'BlackCloverLiveDevCache'+suffix));
  app.commandLine.appendSwitch('remote-debugging-port',String(process.env.BLACK_CLOVER_DEBUG_PORT||'9223'));
}`;
if(!s.includes(old))throw new Error('dev block not found');
s=s.replace(old,neu);
fs.writeFileSync(p,s,'utf8');
console.log('dev slot support added');