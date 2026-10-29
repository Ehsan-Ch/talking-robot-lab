// Inject platform dependencies so speech lifecycle can be tested without a microphone.
export class Speaker {
  constructor({synth,Utterance,onState=()=>{}}) {Object.assign(this,{synth,Utterance,onState});this.generation=0;}
  get supported(){return Boolean(this.synth && this.Utterance);}
  stop(){this.generation++;this.synth?.cancel();this.onState('silent');}
  say(text,{voice,rate=1}={}) {
    this.stop(); if(!this.supported) return;
    const generation=this.generation,u=new this.Utterance(text);u.rate=rate;if(voice)u.voice=voice;
    u.onstart=()=>{if(generation===this.generation)this.onState('speaking');};
    u.onend=()=>{if(generation===this.generation)this.onState('silent');};
    u.onerror=()=>{if(generation===this.generation)this.onState('unavailable');};
    try {this.synth.speak(u);} catch {if(generation===this.generation)this.onState('unavailable');}
  }
}
export class Listener {
  constructor({Recognition,onState=()=>{},onTranscript=()=>{}}) {Object.assign(this,{Recognition,onState,onTranscript});this.active=null;}
  get supported(){return Boolean(this.Recognition);}
  start() {
    if(!this.supported || this.active) return false;
    const r=new this.Recognition();this.active=r;r.lang='en-US';r.interimResults=false;r.continuous=false;
    r.onresult=e=>{if(this.active===r)this.onTranscript(e.results[0][0].transcript);};
    r.onerror=e=>{if(this.active===r){this.active=null;this.onState(`error:${e.error}`);}};
    r.onend=()=>{if(this.active===r){this.active=null;this.onState('idle');}};
    this.onState('listening');
    try {r.start();} catch {this.active=null;this.onState('error:start-failed');return false;}
    return true;
  }
  stop(){const r=this.active;if(!r)return;this.active=null;r.abort();this.onState('idle');}
}
