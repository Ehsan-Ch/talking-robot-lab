import test from 'node:test';
import assert from 'node:assert/strict';
import {Robot,ROOM,parseCommand,findPath,passable} from '../core.mjs';
test('recognizes supported phrasing and normalization',()=>{
  assert.deepEqual(parseCommand(' Please GO to the DESK! '),{type:'navigate',station:'desk'});
  assert.deepEqual(parseCommand('move forward two steps'),{type:'move',sign:1,steps:2});
  assert.deepEqual(parseCommand('back 3 cells'),{type:'move',sign:-1,steps:3});
  assert.deepEqual(parseCommand('turn left'),{type:'turn',delta:-1});
  assert.equal(parseCommand('what can you do?').type,'help');
});
test('rejects compound, negated, malformed, excessive and arbitrary input',()=>{
  for(const s of ['do not move forward','go to the desk then stop','forward 0','forward 6','forward 1.5','forward -2','forward Infinity','<img onerror=alert(1)>','walk through the wall','a'.repeat(201),null,{},'']) assert.equal(parseCommand(s).type,'invalid',String(s));
});
test('destination path is shortest and detours around central wall',()=>{
  const path=findPath([1,5],[7,2]);assert.equal(path.length,11);assert.deepEqual(path.at(-1),[7,2]);
  let p=[1,5];for(const q of path){assert.ok(passable(q));assert.equal(Math.abs(q[0]-p[0])+Math.abs(q[1]-p[1]),1);p=q;}
});
test('handles invalid, same-cell and unreachable goals',()=>{
  assert.deepEqual(findPath([1,5],[1,5]),[]);assert.equal(findPath([1,5],[4,3]),null);
  assert.equal(findPath([0,0],[2,0],{width:3,height:1,walls:['1,0']}),null);
  assert.equal(findPath([-1,0],[0,0]),null);
});
test('rejects blocked relative movement atomically',()=>{
  const r=new Robot();const before={...r.pose};assert.equal(r.command('forward 5').accepted,false);
  assert.deepEqual(r.pose,before);assert.equal(r.route.length,0);assert.equal(r.tick(),null);
});
test('backward movement preserves heading; boundary move is rejected',()=>{
  const r=new Robot();r.command('back 1');r.tick();assert.deepEqual(r.pose,{x:0,y:5,heading:1});
  assert.equal(r.command('back 1').accepted,false);assert.deepEqual(r.pose,{x:0,y:5,heading:1});
});
test('busy movement refuses replacement but still answers status',()=>{
  const r=new Robot();r.command('go to desk');const planned=JSON.stringify(r.route);
  assert.equal(r.command('go to plant').accepted,false);assert.equal(r.command('turn left').accepted,false);
  assert.match(r.command('status').reply,/11 steps remain/);assert.equal(JSON.stringify(r.route),planned);
});
test('stop clears route and no later tick moves robot',()=>{
  const r=new Robot();r.command('go to desk');r.tick();r.command('stop');const p={...r.pose};
  for(let i=0;i<20;i++)assert.equal(r.tick(),null);assert.deepEqual(r.pose,p);assert.equal(r.target,null);
});
test('arrival has correct pose and exactly one arrival event',()=>{
  const r=new Robot();r.command('go to desk');while(r.moving)r.tick();r.tick();
  assert.deepEqual([r.pose.x,r.pose.y],ROOM.stations.desk);assert.equal(r.audit.filter(e=>e.event==='arrived').length,1);
  assert.equal(r.command('go to desk').reply,'I am already there.');
});
test('turns wrap both directions',()=>{
  const r=new Robot();for(let i=0;i<5;i++)r.command('left');assert.equal(r.pose.heading,0);
  r.command('left');assert.equal(r.pose.heading,3);r.command('right');assert.equal(r.pose.heading,0);
});
test('audit is ordered, timestamped and exported without mutable aliases',()=>{
  const r=new Robot({clock:()=> '2026-10-29T12:00:00.000Z'});r.command('go to desk');r.tick();
  const out=r.export();assert.equal(out.mode,'simulation');assert.equal(out.events[0].time,'2026-10-29T12:00:00.000Z');
  assert.deepEqual(out.events.map(e=>e.id),Array.from({length:out.events.length},(_,i)=>i+1));
  out.pose.x=999;out.events[0].pose.x=999;out.remainingRoute[0][0]=999;out.events.find(e=>e.path).path[0][0]=999;
  assert.notEqual(r.pose.x,999);assert.notEqual(r.audit[0].pose.x,999);assert.notEqual(r.route[0][0],999);assert.notEqual(r.audit.find(e=>e.path).path[0][0],999);
});
test('all free start/goal pairs yield legal paths and correct endpoints',()=>{
  const cells=[];for(let x=0;x<ROOM.width;x++)for(let y=0;y<ROOM.height;y++)if(passable([x,y]))cells.push([x,y]);
  for(const from of cells)for(const to of cells){const route=findPath(from,to);assert.ok(route);let prev=from;for(const p of route){assert.ok(passable(p));assert.equal(Math.abs(p[0]-prev[0])+Math.abs(p[1]-prev[1]),1);prev=p;}assert.deepEqual(prev,to);}
});
