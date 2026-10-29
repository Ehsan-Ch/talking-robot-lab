import {Robot,ROOM,DIRECTIONS} from './core.mjs';
import {Speaker,Listener} from './speech.mjs';
const $=s=>document.querySelector(s), robot=new Robot();
const speaker=new Speaker({synth:window.speechSynthesis,Utterance:window.SpeechSynthesisUtterance,onState:state=>{
  $('#voice-state').textContent=state==='speaking'?'Speaking':state==='unavailable'?'Voice unavailable':$('#speak').checked?'Voice on':'Voice off';
  $('#room').classList.toggle('speaking',state==='speaking');
}});
const listener=new Listener({Recognition:window.SpeechRecognition||window.webkitSpeechRecognition,onState:state=>{
  $('#mic').textContent=state==='listening'?'■ Cancel listening':'● Use microphone';
  const messages={'error:not-allowed':'Microphone permission was denied. You can still type commands.','error:no-speech':'No speech detected. Try again or type a command.','error:network':'Speech service is unavailable. Please type a command.'};
  if(state==='listening')$('#mic-status').textContent='Listening… Your browser may send audio to its speech service.';
  else if(state.startsWith('error:'))$('#mic-status').textContent=messages[state]||'Voice input could not start. You can still type commands.';
  else if(!$('#mic-status').textContent.startsWith('Transcript'))$('#mic-status').textContent='Microphone stopped. You can type a command or try again.';
},onTranscript:text=>{$('#command').value=text.slice(0,200);$('#mic-status').textContent='Transcript ready. Review it, then press Send. No command has been executed.';$('#command').focus();}});
function message(text,who='milo',audible=true) {
  const div=document.createElement('div');div.className=`bubble ${who}`;
  const label=document.createElement('small');label.textContent=who==='user'?'YOU':'MILO';
  const p=document.createElement('p');p.textContent=text;div.append(label,p);$('#conversation').append(div);$('#conversation').scrollTop=$('#conversation').scrollHeight;
  if(audible && who==='milo' && $('#speak').checked)speaker.say(text,{voice:window.speechSynthesis?.getVoices().find(v=>v.voiceURI===$('#voice').value),rate:Number($('#rate').value)});
}
function submit(text){listener.stop();if($('#mic-status').textContent.startsWith('Transcript'))$('#mic-status').textContent='Command sent. Type another command or use the microphone again.';message(text,'user');const result=robot.command(text);message(result.reply);render();}
function render(){
  const size=60, {x,y,heading}=robot.pose;
  let svg='<title>Milo at column '+(x+1)+', row '+(y+1)+', facing '+DIRECTIONS[heading]+'</title><defs><pattern id="grid" width="60" height="60" patternUnits="userSpaceOnUse"><path d="M 60 0 L 0 0 0 60" fill="none" stroke="#d6dfce" stroke-width="1"/></pattern></defs><rect width="600" height="480" fill="url(#grid)"/>';
  for(const wall of ROOM.walls){const [a,b]=wall.split(',').map(Number);svg+=`<rect x="${a*size+5}" y="${b*size+5}" width="50" height="50" rx="9" fill="#acb9a8"/><path d="M${a*size+18} ${b*size+21}h24" stroke="#c9d3c4" stroke-width="3"/>`;}
  for(const [name,[a,b]] of Object.entries(ROOM.stations)){svg+=`<rect x="${a*size+3}" y="${b*size+3}" width="54" height="54" rx="12" fill="#d6e3d0" stroke="#8ea688" stroke-dasharray="3 3"/><text x="${a*size+30}" y="${b*size+70}" text-anchor="middle" font-family="system-ui" font-size="11" fill="#49634b">${name.toUpperCase()}</text>`;}
  if(robot.route.length){svg+=`<polyline points="${[[x,y],...robot.route].map(([a,b])=>`${a*size+30},${b*size+30}`).join(' ')}" fill="none" stroke="#d88b4d" stroke-width="3" stroke-dasharray="5 6"/>`;for(const [a,b]of robot.route)svg+=`<circle cx="${a*size+30}" cy="${b*size+30}" r="4" fill="#d88b4d"/>`;}
  svg+=`<g transform="translate(${x*size+30},${y*size+30})"><ellipse cy="23" rx="22" ry="5" fill="#233d321c"/><g transform="rotate(${heading*90})"><path d="M0 -30l-5 7h10z" fill="#d85232"/></g><rect class="robot-body" x="-23" y="-22" width="46" height="44" rx="15"/><rect class="robot-face" x="-17" y="-14" width="34" height="25" rx="9"/><circle class="robot-eye" cx="-7" cy="-5" r="3.5"/><circle class="robot-eye" cx="7" cy="-5" r="3.5"/><path class="robot-mouth" d="M-5 3q5 5 10 0" fill="none" stroke="#f8eac6" stroke-width="2"/><path d="M-7 16h14" stroke="#f09c6b" stroke-width="3" stroke-linecap="round"/></g>`;
  $('#room').innerHTML=svg;
  $('#room').setAttribute('aria-label',`Milo at column ${x+1}, row ${y+1}, facing ${DIRECTIONS[heading]}. ${robot.route.length} steps remaining.`);
  $('#position').textContent=`${x+1} / ${y+1}`;$('#heading').textContent=DIRECTIONS[heading];$('#steps').textContent=robot.route.length;
  $('#motion-state').textContent=robot.moving?'Moving':'Ready';$('#motion-state').classList.toggle('active',robot.moving);
  $('#events').replaceChildren(...robot.audit.slice(-5).reverse().map(e=>{const li=document.createElement('li'),code=document.createElement('code'),span=document.createElement('span');code.textContent=e.event;span.textContent=e.detail;li.append(code,span);return li;}));
}
$('#command-form').addEventListener('submit',e=>{e.preventDefault();const text=$('#command').value.trim();if(text){submit(text);$('#command').value='';}});
document.querySelectorAll('[data-command]').forEach(b=>b.addEventListener('click',()=>submit(b.dataset.command)));
$('#stop').addEventListener('click',()=>{speaker.stop();submit('stop');});
$('#mic').addEventListener('click',()=>{if(listener.active)listener.stop();else{speaker.stop();listener.start();}});
$('#speak').addEventListener('change',()=>{speaker.stop();if($('#speak').checked)message('Voice is on. I am ready to talk.');});
$('#rate').addEventListener('input',()=>$('#rate-value').textContent=Number($('#rate').value).toFixed(1)+'×');
function voices(){const selected=$('#voice').value;$('#voice').replaceChildren(new Option('System default',''),...(window.speechSynthesis?.getVoices()||[]).map(v=>new Option(`${v.name} (${v.lang})`,v.voiceURI)));$('#voice').value=selected;}
if(speaker.supported){voices();window.speechSynthesis.addEventListener('voiceschanged',voices);}else{$('#speak').disabled=true;$('#voice-state').textContent='Text only';}
if(!listener.supported){$('#mic').disabled=true;$('#mic-status').textContent='Speech recognition is not supported in this browser. All typed commands still work.';}
$('#export').addEventListener('click',()=>{const url=URL.createObjectURL(new Blob([JSON.stringify(robot.export(),null,2)],{type:'application/json'}));const a=document.createElement('a');a.href=url;a.download='milo-session.json';a.click();setTimeout(()=>URL.revokeObjectURL(url),1000);});
setInterval(()=>{if(robot.moving){const reply=robot.tick();if(reply)message(reply);render();}},650);
document.addEventListener('visibilitychange',()=>{if(document.hidden){listener.stop();speaker.stop();if(robot.moving){robot.command('stop');message('Movement paused because this tab was hidden. Give me a new command to continue.','milo',false);render();}}});
window.addEventListener('pagehide',()=>{listener.stop();speaker.stop();});
message('Hello, I’m Milo. Try “go to the desk” and watch me find a way around the wall. You can type, or enable voice when you’re ready.');render();
