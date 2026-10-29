import test from 'node:test';
import assert from 'node:assert/strict';
import {Speaker,Listener} from '../speech.mjs';
test('missing speech APIs do not break typed mode',()=>{
  const s=new Speaker({});assert.equal(s.supported,false);s.say('hello');s.stop();
  const l=new Listener({});assert.equal(l.start(),false);l.stop();
});
test('new speech cancels previous audio and ignores stale callbacks',()=>{
  const states=[],spoken=[];let cancels=0;
  const s=new Speaker({synth:{cancel(){cancels++;},speak(u){spoken.push(u);}},Utterance:class{constructor(text){this.text=text;}},onState:x=>states.push(x)});
  s.say('first');spoken[0].onstart();s.say('second',{rate:1.2});spoken[1].onstart();spoken[0].onend();
  assert.equal(states.at(-1),'speaking');assert.equal(cancels,2);assert.equal(spoken[1].rate,1.2);
  spoken[1].onerror();assert.equal(states.at(-1),'unavailable');s.stop();spoken[1].onstart();assert.equal(states.at(-1),'silent');
});
test('transcript is returned for review and repeated starts are refused',()=>{
  let instance,transcript;const states=[];
  class Recognition{constructor(){instance=this;}start(){}abort(){}}
  const l=new Listener({Recognition,onState:s=>states.push(s),onTranscript:t=>transcript=t});
  assert.equal(l.start(),true);assert.equal(l.start(),false);assert.equal(instance.lang,'en-US');
  instance.onresult({results:[[{transcript:'go to desk'}]]});assert.equal(transcript,'go to desk');instance.onend();assert.equal(states.at(-1),'idle');assert.equal(l.active,null);
});
test('cancel discards late transcript and stale end from older session',()=>{
  const instances=[],results=[];class Recognition{constructor(){instances.push(this);}start(){}abort(){}}
  const l=new Listener({Recognition,onTranscript:t=>results.push(t)});l.start();l.stop();l.start();
  instances[0].onresult({results:[[{transcript:'forward'}]]});instances[0].onend();assert.equal(results.length,0);assert.equal(l.active,instances[1]);
});
test('permission failure remains visible after recognition ends',()=>{
  let instance;const states=[];class Recognition{constructor(){instance=this;}start(){}abort(){}}
  const l=new Listener({Recognition,onState:s=>states.push(s)});l.start();instance.onerror({error:'not-allowed'});instance.onend();
  assert.equal(states.at(-1),'error:not-allowed');assert.equal(l.active,null);
});
test('synchronous recognition start failure clears active state',()=>{
  const states=[];class Recognition{start(){throw Error('denied');}}
  const l=new Listener({Recognition,onState:s=>states.push(s)});assert.equal(l.start(),false);assert.equal(l.active,null);assert.equal(states.at(-1),'error:start-failed');
});
test('synchronous speech output failure does not interrupt application',()=>{
  const states=[];const s=new Speaker({synth:{cancel(){},speak(){throw Error('unavailable');}},Utterance:class{},onState:x=>states.push(x)});
  assert.doesNotThrow(()=>s.say('hello'));assert.equal(states.at(-1),'unavailable');
});
