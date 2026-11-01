/** First living-city quest: pure state transitions shared by the game and tests. */
(function(root,factory){const api=factory();if(typeof module==='object'&&module.exports)module.exports=api;root.GreenCityLife=api;})(typeof window!=='undefined'?window:globalThis,function(){
 'use strict';
 const BUILD_VERSION='13.2-test.20261101.1';
 const GRANDMA={x:-5.35,z:2.55};
 const BASKET={x:-6.55,z:2.92};
 const HERBS={x:-4.55,z:3.28};
 const BRANCHES=[{id:'a',x:-7.35,z:2.35},{id:'b',x:-4.05,z:1.15},{id:'c',x:-2.75,z:3.12}];
 const STAGES=['meet','basket','forage','return','tend','complete'];
 function initial(){return {stage:'meet',player:{x:-2.9,z:-.55},basket:false,collected:[],friendship:0,rewarded:false};}
 function normalize(value){const base=initial(),life=value&&typeof value==='object'?value:{};return {...base,...life,player:{...base.player,...life.player},collected:Array.isArray(life.collected)?life.collected.filter(id=>BRANCHES.some(b=>b.id===id)):[] ,stage:STAGES.includes(life.stage)?life.stage:'meet'};}
 function distance(a,b){return Math.hypot(a.x-b.x,a.z-b.z);}
 function objective(life){life=normalize(life);switch(life.stage){
  case 'meet':return '走到公園，和散步的阿嬤聊聊';
  case 'basket':return '到長椅旁拿阿嬤的竹籃';
  case 'forage':return `在公園撿拾被風吹落的枯枝 ${life.collected.length}/3`;
  case 'return':return '把裝好的竹籃帶回給阿嬤';
  case 'tend':return '到香草盆旁鬆土、覆蓋枯枝';
  default:return '阿嬤的公園日常已完成';
 }}
 function nearby(life,radius=1.05){life=normalize(life);const p=life.player,candidates=[];
  if(life.stage==='meet'||life.stage==='return'||life.stage==='complete')candidates.push({kind:'grandma',...GRANDMA});
  if(life.stage==='basket')candidates.push({kind:'basket',...BASKET});
  if(life.stage==='forage')for(const b of BRANCHES)if(!life.collected.includes(b.id))candidates.push({kind:'branch',...b});
  if(life.stage==='tend')candidates.push({kind:'herbs',...HERBS});
  let best=null,bestDistance=Infinity;for(const item of candidates){const d=distance(p,item);if(d<bestDistance){best=item;bestDistance=d}}
  return best&&bestDistance<=radius?{...best,distance:bestDistance}:null;
 }
 function actionLabel(target){return !target?'四處走走':target.kind==='grandma'?'和阿嬤說話':target.kind==='basket'?'拿起竹籃':target.kind==='branch'?'撿拾枯枝':'整理香草盆';}
 function interact(value,target){const life=normalize(value),event={changed:false,completed:false,reward:0,text:''};if(!target)return {life,event};
  if(target.kind==='grandma'&&life.stage==='meet'){life.stage='basket';event.changed=true;event.text='「風颱尾，公園落了不少枯枝。陪阿嬤一起整理，好無？」先去長椅旁拿竹籃。';}
  else if(target.kind==='basket'&&life.stage==='basket'){life.basket=true;life.stage='forage';event.changed=true;event.text='你拿起阿嬤用了好多年的竹籃。沿著公園步道找三根枯枝吧。';}
  else if(target.kind==='branch'&&life.stage==='forage'&&!life.collected.includes(target.id)){life.collected.push(target.id);event.changed=true;event.text=`撿到枯枝（${life.collected.length}/3）。它們可以當香草盆的天然覆蓋物。`;if(life.collected.length===BRANCHES.length){life.stage='return';event.text='竹籃裝好了！回去找阿嬤，聽聽這些枯枝能做什麼。';}}
  else if(target.kind==='grandma'&&life.stage==='return'){life.stage='tend';event.changed=true;event.text='「枯枝毋免丟，剪細鋪在土面，較袂乾。」去香草盆幫忙鬆土覆蓋吧。';}
  else if(target.kind==='herbs'&&life.stage==='tend'){life.stage='complete';life.friendship=Math.max(life.friendship,1);if(!life.rewarded){life.rewarded=true;event.reward=180;}event.changed=true;event.completed=true;event.text='你把枯枝剪細、鬆土並鋪在九層塔旁。阿嬤送你一包自留種子和 $180 生活基金。';}
  else if(target.kind==='grandma'&&life.stage==='complete'){event.text='「有閒就來坐。下擺，阿嬤教你煮青草茶。」';}
  return {life,event};
 }
 return {BUILD_VERSION,GRANDMA,BASKET,HERBS,BRANCHES,initial,normalize,distance,objective,nearby,actionLabel,interact};
});
