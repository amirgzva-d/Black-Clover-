import test from 'node:test';
import assert from 'node:assert/strict';
import {MessengerDeliveryVerification} from '../src/agent/MessengerDeliveryVerification.js';
const snapshot=(recipient='رضا',messages=[],handle=100)=>({window:'WhatsApp — Google Chrome',handle,elements:[{name:recipient,parentName:'Conversation Header',controlType:'ControlType.Text',offscreen:false},...messages]});
const message=(text,receipt='Sent')=>({name:text+' '+receipt,controlType:'ControlType.Text',parentName:'Messages',offscreen:false});
test('new sent content in the same destination conversation can be verified',async()=>{
  let current=snapshot();const verifier=new MessengerDeliveryVerification({inspect:async()=>({success:true,data:current})});
  const {checkpoint}=await verifier.prepare({service:'whatsapp',recipient:'رضا',content:'سلام'});
  current=snapshot('رضا',[message('سلام')]);assert.equal((await verifier.verify(checkpoint)).verified,true);
});
test('existing content and message drafts cannot be mistaken for a new send',async()=>{
  let current=snapshot('رضا',[message('سلام')]);const verifier=new MessengerDeliveryVerification({inspect:async()=>({success:true,data:current})});
  const {checkpoint}=await verifier.prepare({service:'whatsapp',recipient:'رضا',content:'سلام'});
  assert.equal((await verifier.verify(checkpoint)).verified,false);
  current=snapshot('رضا',[message('سلام'),{...message('سلام'),'controlType':'ControlType.Edit'}]);
  assert.equal((await verifier.verify(checkpoint)).verified,false);
});
test('wrong recipients and switched windows fail verification without sending anything',async()=>{
  let current=snapshot('علی');const verifier=new MessengerDeliveryVerification({inspect:async()=>({success:true,data:current})});
  await assert.rejects(()=>verifier.prepare({service:'whatsapp',recipient:'رضا',content:'سلام'}),/تأیید نشد/);
  current=snapshot('رضا');const {checkpoint}=await verifier.prepare({service:'whatsapp',recipient:'رضا',content:'سلام'});
  current=snapshot('رضا',[message('سلام')],200);assert.equal((await verifier.verify(checkpoint)).verified,false);
});
test('receipt words in the user content do not count as delivery evidence',async()=>{
  let current=snapshot();const verifier=new MessengerDeliveryVerification({inspect:async()=>({success:true,data:current})});
  const {checkpoint}=await verifier.prepare({service:'whatsapp',recipient:'رضا',content:'ارسال شد'});
  current=snapshot('رضا',[message('ارسال شد','')]);assert.equal((await verifier.verify(checkpoint)).verified,false);
});
