export const ROOM = Object.freeze({
  width: 10, height: 8,
  walls: Object.freeze(['4,2', '4,3', '4,4', '4,5', '7,5', '8,5']),
  stations: Object.freeze({ dock: Object.freeze([1,5]), desk: Object.freeze([7,2]), plant: Object.freeze([8,6]) })
});
const VECTORS = [[0,-1],[1,0],[0,1],[-1,0]];
export const DIRECTIONS = ['north','east','south','west'];
const key = ([x,y]) => `${x},${y}`;
export const passable = (p, room=ROOM) => Number.isInteger(p[0]) && Number.isInteger(p[1]) && p[0]>=0 && p[1]>=0 && p[0]<room.width && p[1]<room.height && !room.walls.includes(key(p));

export function parseCommand(input) {
  if (typeof input !== 'string' || input.length > 200) return {type:'invalid'};
  const text = input.trim().toLowerCase().replace(/[.!?]+$/,'').replace(/\s+/g,' ').replace(/^please /,'');
  if (/^(hello|hi|hey|hello milo)$/.test(text)) return {type:'hello'};
  if (/^(help|what can you do)$/.test(text)) return {type:'help'};
  if (/^(status|where are you)$/.test(text)) return {type:'status'};
  if (/^(what is your name|what's your name|who are you)$/.test(text)) return {type:'name'};
  if (/^(stop|cancel)$/.test(text)) return {type:'stop'};
  let m = text.match(/^(?:turn )?(left|right)$/);
  if (m) return {type:'turn', delta:m[1]==='right'?1:-1};
  m = text.match(/^(?:go|move|walk)(?: to)? (?:the )?(dock|desk|plant)$/);
  if (m) return {type:'navigate', station:m[1]};
  m = text.match(/^(?:move |go )?(forward|backward|back)(?: (\d{1,2}|one|two|three|four|five)(?: (?:cell|cells|step|steps))?)?$/);
  if (m) {
    const words = {one:1,two:2,three:3,four:4,five:5};
    const steps = m[2] ? words[m[2]] ?? Number(m[2]) : 1;
    if (steps>=1 && steps<=5) return {type:'move', sign:m[1]==='forward'?1:-1, steps};
  }
  return {type:'invalid'};
}

export function findPath(start, goal, room=ROOM) {
  if (!passable(start,room) || !passable(goal,room)) return null;
  const queue = [[...start]], prev = new Map([[key(start),null]]);
  for (let i=0;i<queue.length;i++) {
    const p=queue[i];
    if (key(p)===key(goal)) {
      const path=[]; let cursor=key(p);
      while(prev.get(cursor)!==null) { path.unshift(cursor.split(',').map(Number)); cursor=prev.get(cursor); }
      return path;
    }
    for (const [dx,dy] of VECTORS) {
      const next=[p[0]+dx,p[1]+dy], k=key(next);
      if(passable(next,room) && !prev.has(k)) {prev.set(k,key(p));queue.push(next);}
    }
  }
  return null;
}

export class Robot {
  constructor({clock=()=>new Date().toISOString()}={}) {
    this.clock=clock; this.pose={x:1,y:5,heading:1}; this.route=[]; this.audit=[]; this.sequence=0; this.target=null;
    this.record('session','Simulation initialized');
  }
  record(event,detail,extra={}) {
    const entry={id:++this.sequence,time:this.clock(),event,detail,pose:{...this.pose},...extra};
    this.audit.push(entry); return entry;
  }
  get moving(){ return this.route.length>0; }
  status(){return `I am at column ${this.pose.x+1}, row ${this.pose.y+1}, facing ${DIRECTIONS[this.pose.heading]}. ${this.moving?`${this.route.length} steps remain.`:'I am ready.'}`;}
  command(text) {
    const c=parseCommand(text);
    this.record('command',String(text).slice(0,200),{intent:c.type});
    let reply, accepted=true;
    if(c.type==='stop') {this.route=[];this.target=null;reply='Stopped. My route is cleared.';this.record('stopped',reply);}
    else if(c.type==='hello') reply='Hello! I am Milo. Give me a destination and I will show you my route.';
    else if(c.type==='name') reply='I am Milo, a talking robot simulation.';
    else if(c.type==='help') reply='Try: go to the desk, move forward two steps, turn left, status, or stop. I understand one command at a time.';
    else if(c.type==='status') reply=this.status();
    else if(c.type==='invalid') {accepted=false;reply='I did not understand that command. Try “go to the desk” or “help”.';}
    else if(this.moving) {accepted=false;reply='I am still moving. Say “stop” before giving me a new movement command.';}
    else if(c.type==='turn') {this.pose.heading=(this.pose.heading+c.delta+4)%4;reply=`Now facing ${DIRECTIONS[this.pose.heading]}.`;this.record('turned',reply);}
    else {
      let route;
      if(c.type==='navigate') route=findPath([this.pose.x,this.pose.y],ROOM.stations[c.station]);
      else {
        const [dx,dy]=VECTORS[this.pose.heading];
        route=Array.from({length:c.steps},(_,i)=>[this.pose.x+dx*(i+1)*c.sign,this.pose.y+dy*(i+1)*c.sign]);
        if(!route.every(p=>passable(p))) route=null;
      }
      if(route===null) {accepted=false;reply='That route is blocked by an obstacle or the room boundary. I have not moved.';}
      else if(!route.length) reply='I am already there.';
      else {this.route=route;this.target=c.type==='navigate'?c.station:null;this.keepHeading=c.type==='move';reply=`Route ready: ${route.length} steps${this.target?` to the ${this.target}`:''}. Say “stop” to cancel.`;this.record('planned',reply,{path:route.map(p=>[...p])});}
    }
    this.record(accepted?'reply':'rejected',reply);
    return {accepted,reply,intent:c.type};
  }
  tick() {
    if(!this.moving) return null;
    const [x,y]=this.route.shift();
    if(!this.keepHeading) this.pose.heading=VECTORS.findIndex(([dx,dy])=>dx===x-this.pose.x && dy===y-this.pose.y);
    this.pose.x=x;this.pose.y=y;this.record('step','Moved one grid cell');
    if(!this.moving) {const reply=this.target?`Arrived at the ${this.target}.`:'Movement complete.';this.record('arrived',reply);this.target=null;return reply;}
    return null;
  }
  export(){return {schemaVersion:1,project:'Milo — Talking Robot Lab',mode:'simulation',coordinateSystem:'zero-based x/y; heading 0=north,1=east,2=south,3=west',room:ROOM,pose:{...this.pose},remainingRoute:this.route.map(p=>[...p]),events:this.audit.map(e=>JSON.parse(JSON.stringify(e)))};}
}
