const assert=require('node:assert/strict');
const Life=require('./life.js');
let state=Life.initial();
assert.equal(Life.objective(state),'走到公園，和散步的阿嬤聊聊');
state.player={...Life.GRANDMA};
let result=Life.interact(state,Life.nearby(state));state=result.life;
assert.equal(state.stage,'basket');
state.player={...Life.BASKET};state=Life.interact(state,Life.nearby(state)).life;
assert.equal(state.stage,'forage');assert.equal(state.basket,true);
for(const branch of Life.BRANCHES){state.player={x:branch.x,z:branch.z};state=Life.interact(state,Life.nearby(state)).life;}
assert.equal(state.stage,'return');assert.equal(state.collected.length,3);
state.player={...Life.GRANDMA};state=Life.interact(state,Life.nearby(state)).life;
assert.equal(state.stage,'tend');
state.player={...Life.HERBS};result=Life.interact(state,Life.nearby(state));state=result.life;
assert.equal(state.stage,'complete');assert.equal(result.event.reward,180);assert.equal(result.event.completed,true);
const replay=Life.interact(state,{kind:'herbs',...Life.HERBS});
assert.equal(replay.event.reward,0);
assert.deepEqual(Life.normalize({stage:'unknown',player:{x:5}}).player,{x:5,z:-.55});
console.log('life quest tests passed');
