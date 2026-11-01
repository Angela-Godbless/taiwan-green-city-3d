const vm=require('node:vm');
const fs=require('node:fs');
const assert=require('node:assert/strict');
const elements=new Map(),events={};
const noop=()=>{};
const context2d=new Proxy({},{get:()=>noop,set:()=>true});
function element(selector){
  if(!elements.has(selector))elements.set(selector,{
    open:false,classList:{add:noop,remove:noop},style:{},dataset:{},
    getContext:()=>context2d,addEventListener:noop,showModal(){this.open=true},close(){this.open=false},
    getBoundingClientRect:()=>({left:26,top:700}),setPointerCapture:noop
  });
  return elements.get(selector);
}
let saved={},animationFrame;
const sandbox={
  document:{querySelector:element,addEventListener:noop,createElement:()=>({click:noop})},
  innerWidth:390,innerHeight:844,devicePixelRatio:1,performance:{now:()=>0},Image:class{complete=false},
  localStorage:{getItem:key=>saved[key],setItem:(key,value)=>saved[key]=value},
  addEventListener:(key,value)=>events[key]=value,requestAnimationFrame:callback=>animationFrame=callback,
  setTimeout:()=>0,clearTimeout:noop,console,window:{},Blob,URL,Date,Math
};
vm.createContext(sandbox);
vm.runInContext(fs.readFileSync(__dirname+'/game.js','utf8'),sandbox);
const run=source=>vm.runInContext(source,sandbox);
let tick=0;
function frames(count){for(let i=0;i<count;i++)animationFrame(tick+=1000/60);}

run("restore({schema:13,block:'grandma',player:{x:600,y:740},watered:{},chats:0,minutes:900})");
assert.equal(run('state.rests'),0,'old saves gain a safe rest counter');
assert.equal(run('state.memories.length'),0,'old saves gain a safe memory list');

run("state.scene='inside';state.quest='completed';state.player={x:255,y:430}");frames(1);run('interact()');
assert.equal(run('activity.kind'),'sofa','sofa starts a seated state');frames(1);
assert.equal(element('#act').textContent,'起身','seated action changes to stand up');
frames(260);assert.equal(run('state.rests'),1,'rest is recorded after staying seated');
assert.equal(run("state.memories.includes('阿嬤家的老沙發')"),true,'sofa memory is preserved');
run('interact()');assert.equal(run('activity'),null,'stand-up exits seated state');
assert.equal(run('blocked(state.player.x,state.player.y,state.scene)'),false,'sofa stand-up position is walkable');

run('state.player={x:520,y:545}');frames(1);run('interact()');
assert.equal(run('activity.kind'),'tea','tea starts a seated tea moment');assert.equal(run('state.teaShared'),true);
run('interact()');assert.equal(run('blocked(state.player.x,state.player.y,state.scene)'),false,'tea stand-up position is walkable');

run("state.scene='outside';state.player={x:1040,y:760}");frames(1);run('interact()');
assert.equal(run('activity.kind'),'bench','river bench can be sat on');frames(260);
assert.equal(run("state.memories.includes('河邊的午後風')"),true,'bench memory is preserved');
run('interact()');assert.equal(run('blocked(state.player.x,state.player.y,state.scene)'),false,'bench stand-up position is walkable');

run('save();restore(JSON.parse(localStorage.getItem(KEY)))');
assert.equal(run('state.memories.length'),3,'life progress survives save round trip');
assert.equal(run('state.rests'),2,'rest count survives save round trip');
console.log('PASS: V13.1 save migration, sofa/tea/bench sitting, stand-up safety, quiet memories');
