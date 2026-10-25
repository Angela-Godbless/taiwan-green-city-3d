(()=>{'use strict';
const $=s=>document.querySelector(s),TAU=Math.PI*2,clamp=(v,a,b)=>Math.min(b,Math.max(a,v));
const Navi=window.GreenCityNavigation,Workflow=window.GreenCityWorkflow;
if(!Navi||!Workflow)throw Error('缺少道路尋路與施工流程程式，請確認已載入 src/navigation.js 和 src/workflow.js');
let viewMode='city', evening=false, viewTime=0;
const {SPE,LOTS,ZONE_TEMPLATE,BUILD,CHAPTERS}=window.GreenCityData;
function zoneNear(a,b){return Math.abs(a.row-b.row)+Math.abs(a.col-b.col)===1}
function touchingRoad(z){return z.col===0&&z.row===1||st.zones.some(o=>o.kind==='road'&&zoneNear(o,z))}
function plannedLot(z){return st.lots.find(l=>l.zone===z.id)}
function buildZone(kind){let z=st.zones.find(z=>z.id===st.zoneSelected);if(!z||st.phase!=='play')return;
 if(z.kind!=='empty'){message('這塊建地已有設施，如需重新規劃請先拆除。');return}
 if(!BUILD[kind])return;
 if(kind==='home'&&!touchingRoad(z)){message('住宅必須鄰接道路才可興建，先規劃連通道路！');return}
 if(st.money<BUILD[kind].cost){message('預算不足；可以先推進一天，領取綠化補助。');return}
 st.money-=BUILD[kind].cost;z.kind=kind;
 if(kind==='park'){st.lots.push({id:100+z.id,zone:z.id,name:'新市鎮第 '+(z.id+1)+' 街廓公園',x:z.x,z:z.z,area:'park',width:4.6,chapter:0,detail:'居民活動的綠地，應保留步行動線與樹木的生長空間。',status:'empty',species:null,age:0,health:100,busy:false,inspected:false});}
 log('🏗️ 新市鎮第 '+(z.id+1)+' 建地：興建'+BUILD[kind].name+'（-$'+BUILD[kind].cost+'）');message('🏗️ '+BUILD[kind].name+'落成！'+(kind==='park'?'接著可以進行樹種選擇與派工。':''));updateUI()}
function clearZone(){let z=st.zones.find(z=>z.id===st.zoneSelected);if(!z||z.kind==='empty'||z.id===3)return;
 let l=plannedLot(z);if(l&&['growing','suspect','danger','healthy','dry'].includes(l.status)){message('這座公園有活樹，不可為了重新建造就直接剷除；請保留綠地。');return}
 if(l&&l.busy){message('工人施工中，不能拆除。');return}
 if(st.money<65){message('拆除工程需要 $65，預算不足。');return}
 st.money-=65;if(l){st.lots=st.lots.filter(a=>a.id!==l.id);if(st.selected===l.id)st.selected=null;}log('🧹 重新整理第 '+(z.id+1)+' 建地（-$65）');z.kind='empty';updateUI()}
function renderZone(){let z=st.zones.find(z=>z.id===st.zoneSelected);if(!z)return;let el=$('#selected'),b=BUILD[z.kind],has=touchingRoad(z);
 let info=`<h3>🏗️ 新市鎮｜第 ${z.id+1} 號建地</h3><div class="sub">由你決定這塊地要成為道路、居民住宅或公園。不是所有土地都應種樹。</div>`;
 if(z.kind==='empty'){el.innerHTML=info+`<div class="notice" style="margin-top:9px">${has?'✅ 鄰近已通車道路，可規劃住宅。':'💡 目前尚無鄰接道路；可先鋪路或建公園。'}</div><div class="planRow" style="margin-top:10px">${Object.entries(BUILD).map(([k,b])=>`<button class="btn ${k==='park'?'primary':''}" data-build="${k}" ${st.money<b.cost||(k==='home'&&!has)?'disabled':''}>${b.icon} ${b.name}<br>$${b.cost}</button>`).join('')}</div><div class="speciesInfo">道路提供居民通行；住宅會增加稅收；公園建好後可再選擇適合樹種。三者都重要。</div>`;return}
 let count=st.zones.filter(x=>x.kind==='park').length;el.innerHTML=info+`<div class="notice" style="margin-top:9px">${b.icon} 已興建：${b.name}。${z.kind==='home'?'居民可在連通道路上通行，下一天會產生模擬稅收。':z.kind==='road'?'道路提供相鄰街廓的公共通行功能。':'規劃樹木時須保留步道及樹根空間。'}</div><div class="actions">${z.kind==='park'?'<button class="btn primary" data-park="'+z.id+'">🌳 選擇樹種、派工</button>':''}<button class="btn" data-clear="yes" ${z.id===3?'disabled':''}>↻ 改建此街廓 $65</button></div><div class="speciesInfo">目前已規劃 ${count} 座公園；太少會缺遮蔭，太多則會增加維護費用。</div>`}
function selectZone(id){st.zoneSelected=id;st.selected=null;updateUI();if(innerWidth<780)$('#chapterName').scrollIntoView({behavior:'smooth',block:'start'})}

let glReady=false,softLast=0;let st,cam={az:.76,el:.71,dist:32},toastTimer=null;
function message(s){$('#toast').textContent=s;$('#toast').classList.add('on');clearTimeout(toastTimer);toastTimer=setTimeout(()=>$('#toast').classList.remove('on'),3000)}
function log(s){st.log.unshift(`第 ${st.day} 天｜${s}`);st.log=st.log.slice(0,7);$('#log').innerHTML=st.log.map(x=>`<div>${x}</div>`).join('')}

// Resident commissions respond to measurable work, not a pre-scripted questionnaire.
const REQUESTS=[
 {id:'school',avatar:'👩‍🏫',from:'學校老師',title:'放學路上的樹蔭',desc:'在校園內安全種下一棵適合的樹，讓孩子有涼爽的休息處。',reward:220,ready:()=>st.lots.some(l=>l.area==='school'&&l.status==='growing'),target:0,progress:()=>`${st.lots.filter(l=>l.area==='school'&&l.status==='growing').length}/1 校園新樹`},
 {id:'park',avatar:'👵',from:'散步的阿嬤',title:'公園想有兩棵樹',desc:'在公園裡種兩棵新樹，讓散步空間不再只有水泥。',reward:260,ready:()=>st.lots.filter(l=>l.area==='park'&&l.status==='growing').length>=2,target:4,progress:()=>`${st.lots.filter(l=>l.area==='park'&&l.status==='growing').length}/2 公園新樹`},
 {id:'community',avatar:'👨‍👩‍👧',from:'新市鎮住戶',title:'有住宅也要有綠地',desc:'興建一棟住宅、一座公園，並在新公園種下一棵樹。',reward:320,ready:()=>st.zones.some(z=>z.kind==='home')&&st.lots.some(l=>l.zone!==undefined&&l.status==='growing'),targetZone:1,progress:()=>`住宅 ${st.zones.filter(z=>z.kind==='home').length}/1 · 新公園樹 ${st.lots.filter(l=>l.zone!==undefined&&l.status==='growing').length}/1`},
 {id:'cool',avatar:'🧑‍⚕️',from:'醫院護理師',title:'為病人打造綠蔭',desc:'在醫院復健花園種植安全、好維護的遮蔭樹。',reward:240,chapter:1,ready:()=>st.lots.some(l=>l.area==='hospital'&&l.status==='growing'),target:6,progress:()=>st.lots.some(l=>l.area==='hospital'&&l.status==='growing')?'已完成植栽':'醫院花園等待綠化'},
 {id:'habitat',avatar:'📷',from:'生態觀察員',title:'讓蝴蝶願意留下',desc:'維持多樣化的綠地，讓遊戲中的蝴蝶棲地條件達標。',reward:260,ready:()=>wildlifeReport().butterfly.ready,target:4,progress:()=>wildlifeReport().butterfly.hint},
 {id:'safety',avatar:'🧑‍🚒',from:'防災隊長',title:'危木先檢查後處理',desc:'先由專業人員鑑定，再安全移除已確認的危木。',reward:290,chapter:1,ready:()=>st.removed>0,target:17,progress:()=>`${st.removed}/1 專業處理完成`},
 {id:'river',avatar:'🛶',from:'河岸居民',title:'恢復河岸的綠色帶',desc:'在河岸規劃兩棵合適的樹木，保留防洪動線。',reward:350,chapter:2,ready:()=>st.lots.filter(l=>l.area==='river'&&l.status==='growing').length>=2,target:12,progress:()=>`${st.lots.filter(l=>l.area==='river'&&l.status==='growing').length}/2 河岸新樹`},
 {id:'squirrel',avatar:'🐿️',from:'自然教育志工',title:'樹冠連續的家',desc:'培養足夠的成熟樹與公園綠地，創造赤腹松鼠的潛在棲地。',reward:400,ready:()=>wildlifeReport().squirrel.ready,target:4,progress:()=>wildlifeReport().squirrel.hint}
];
function wildlifeReport(){
 const trees=st.lots.filter(l=>l.species&&['growing','healthy'].includes(l.status)&&l.species!=='shrub');
 const mature=trees.filter(l=>l.age>=3),parks=trees.filter(l=>['park','river','buffer'].includes(l.area));
 const kinds=new Set(trees.map(l=>l.species)).size;
 const joined=parks.filter(a=>parks.some(b=>a!==b&&Math.hypot(a.x-b.x,a.z-b.z)<4.6)).length;
 return {
  bird:{ready:trees.length>=2&&mature.length>=1,hint:`一般樹 ${trees.length}/2 · 成熟樹 ${mature.length}/1`,name:'鳥類',emoji:'🐦'},
  butterfly:{ready:trees.length>=3&&kinds>=3&&parks.length>=2,hint:`新樹及保留樹 ${trees.length}/3 · 樹種 ${kinds}/3 · 綠地樹 ${parks.length}/2`,name:'蝴蝶',emoji:'🦋'},
  squirrel:{ready:mature.length>=4&&joined>=2&&st.zones.filter(z=>z.kind==='park').length>=1,hint:`成熟樹 ${mature.length}/4 · 相鄰綠地樹 ${joined}/2 · 新公園 ${st.zones.filter(z=>z.kind==='park').length}/1`,name:'赤腹松鼠',emoji:'🐿️'}
 };
}
function satisfaction(){let parks=st.zones.filter(z=>z.kind==='park').length,homes=st.zones.filter(z=>z.kind==='home').length,trees=st.lots.filter(l=>l.status==='growing').length;return clamp(Math.round(22+valueShade()*.39+trees*2+parks*5+Math.min(homes,4)*2+st.claimed.length*4-Math.max(0,homes-parks*3)*3),0,100)}
function renderCommunity(){
 const w=wildlifeReport();$('#happy').textContent=satisfaction()+' / 100';$('#faunaCount').textContent=Object.values(w).filter(a=>a.ready).length+' / 3';
 $('#wildlife').innerHTML=Object.values(w).map(a=>`<div class="animal ${a.ready?'':'off'}"><strong>${a.emoji}</strong><b>${a.name}${a.ready?' ✓':''}</b><small>${a.ready?'棲地條件達標':a.hint}</small></div>`).join('');
 $('#claimedCount').textContent=`完成 ${st.claimed.length} / ${REQUESTS.length} 件`;
 let available=REQUESTS.filter(q=>!st.claimed.includes(q.id)&&(!q.chapter||st.chapter>=q.chapter));
 $('#requests').innerHTML=available.slice(0,3).map(q=>{let ready=q.ready();return `<article class="request ${ready?'complete':''}"><div class="avatar">${q.avatar}</div><div><b>${q.title}</b><p>${q.from}：「${q.desc}」</p></div><div class="requestActions"><small>${ready?'✅ 可以領獎':q.progress()} · 獎勵 $${q.reward}</small><div><button type="button" class="btn" data-goto="${q.id}">定位</button> <button type="button" class="btn ${ready?'primary':''}" data-claim="${q.id}" ${ready?'':'disabled'}>領取</button></div></div></article>`}).join('') || '<div class="requestBanner">🎉 所有已解鎖的委託都完成！繼續探索城市、提升棲地品質。</div>';
}
function claimRequest(id){let q=REQUESTS.find(x=>x.id===id);if(!q||st.claimed.includes(id)||(!q.chapter||st.chapter>=q.chapter)===false||!q.ready())return;st.claimed.push(id);st.money+=q.reward;log(`💌 完成居民委託「${q.title}」，獲得專案獎勵 +$${q.reward}`);message('🎉 居民感謝你！委託獎勵 +$'+q.reward);updateUI()}
function gotoRequest(id){let q=REQUESTS.find(x=>x.id===id);if(!q)return;if(q.targetZone!==undefined)selectZone(q.targetZone);else if(q.target!==undefined)selectLot(q.target,true);else {st.zoneSelected=null;st.selected=null;updateUI();message('🌿 多種幾種樹並培養成熟綠地，會吸引更多動物。')}}
function saveGame(){if(st.jobs.length){message('請等工作人員完成派工後再存檔。');return}try{let copy={...st,phase:'play'};localStorage.setItem('taiwan-green-city-v7',JSON.stringify(copy));message('💾 已將城市儲存在這個瀏覽器中。');$('#load').disabled=false}catch(err){message('瀏覽器不允許儲存，請改用 GitHub Pages 網址遊玩。')}}
function loadGame(){try{let raw=localStorage.getItem('taiwan-green-city-v7');if(!raw){message('目前沒有找到存檔。');return}const saved=JSON.parse(raw);if(!Array.isArray(saved.lots)||!Array.isArray(saved.zones)||!Array.isArray(saved.claimed)){message('存檔格式不正確。');return}st=saved;st.phase='play';st.jobs=[];st.lots.forEach(l=>l.busy=false);for(let k of ['garden','arbor']){st.workers[k].job=null;st.workers[k].targ=null;st.workers[k].route=null;st.workers[k].pathIndex=0;st.workers[k].working=false}$('#scrim').classList.add('hidden');$('#win').classList.remove('open');log('📂 已還原城市存檔。');message('讀檔成功！');updateUI()}catch(err){message('存檔無法讀取，請重新建立城市。')}}

function newGame(){st={chapter:0,day:1,money:2200,weather:0,selected:null,zoneSelected:null,zones:ZONE_TEMPLATE.map(x=>({...x})),species:'crape',lots:LOTS.map(l=>({...l,status:l.initial||'empty',species:l.species||null,age:l.initial?7:0,health:100,busy:false,inspected:false})),workers:{garden:{x:-2.8,z:1.5,job:null,targ:null,route:null,pathIndex:0,working:false},arbor:{x:-3.4,z:1.5,job:null,targ:null,route:null,pathIndex:0,working:false}},jobs:[],log:[],removed:0,phase:'intro',squirrel:false,claimed:[]};$('#scrim').classList.remove('hidden');$('#win').classList.remove('open');cam={az:.78,el:.72,dist:innerWidth<780?35:30};log('市府綠化專案成立。先規劃學校、道路與公園。');updateUI()}
function stageReady(){return CHAPTERS[st.chapter].goals.every(([area])=>area==='safety'?st.removed>0:st.lots.some(l=>l.area===area&&l.status==='growing'&&l.species))}
function valueShade(){let val=17;for(let l of st.lots){if(l.species&&['growing','suspect','healthy','dry'].includes(l.status))val+=SPE[l.species].shade*(l.age>=3?1: .48); }return clamp(Math.round(val),0,100)}
function valueEco(){let variety=new Set(st.lots.filter(l=>l.species&&l.status!=='removed').map(l=>l.species));let planted=st.lots.filter(l=>l.status==='growing').length;return clamp(18+variety.size*11+planted*4,0,100)}
function badge(l){return ['suspect','danger'].includes(l.status)?'⚠️':l.status==='healthy'?'🌳':l.status==='dry'?'🍂':l.status==='growing'?(l.age>=3?'🌳':'🌱'):l.area==='blocked'?'⛔':l.area==='power'?'⚡':'▫️'}
function selectedLot(){return st.lots.find(l=>l.id===st.selected)}
function assessment(l,k){if(l.status!=='empty')return {ok:false,reason:'此地已有植栽或既有樹木，先管理現有樹木。'};
if(l.chapter>st.chapter)return {ok:false,reason:'尚未解鎖這個區域，先完成本章任務。'};
if(l.area==='blocked')return {ok:false,reason:'禁植：'+l.detail};
let s=SPE[k];if(!s)return {ok:false,reason:'請先選擇樹種。'};
if(l.area==='power'&&k!=='shrub')return {ok:false,reason:'此區有架空電線與設備，不安排喬木；先選低矮綠帶，仍須經電力單位確認。'};
if(!s.areas.includes(l.area))return {ok:false,reason:'不建議：'+s.name+'不適合這種場域；請改選較符合用途的樹種。'};
if(l.area==='walk'&&l.width<2.0)return {ok:false,reason:'人行道過窄，應保留通行空間。'};
if(s.size===3&&l.width<4)return {ok:false,reason:s.name+'成熟後樹冠和根部需要較大空間；此處請選中小型樹。'};
if(l.area==='school'&&s.size>2)return {ok:false,reason:'學校活動區宜優先檢查樹種風險與成熟樹冠尺寸。'};
if(l.area==='power'&&s.size>1)return {ok:false,reason:'架空電力設施周邊僅示範低矮植物。'};
if(st.lots.some(o=>o.id!==l.id&&o.species&&o.status!=='removed'&&o.status!=='empty'&&Math.hypot(o.x-l.x,o.z-l.z)<(s.size===3?2.9:1.9)))return {ok:false,reason:'與既有樹木間距太近，成長後樹冠與根系可能互相擠壓。'};
return {ok:true,reason:'✅ 規劃可行：'+s.name+'與此處的空間、用途大致符合，派工後可進行模擬種植。'};}
function updateUI(){let ch=CHAPTERS[st.chapter];let pressure=Math.round((heatAt(-5,-3)+heatAt(-3,2)+heatAt(5,3)+heatAt(12,0))/4);let district=$('#districtMeter');if(district)district.innerHTML=`<span><b>🌡️ 城市熱環境觀測</b><small>樹木遮蔭、道路硬鋪面與土地使用的簡化指標</small></span><strong>${pressure} <small style="display:inline;font-size:10px">熱壓力</small></strong>`;$('#chapter').textContent=(st.chapter+1)+' / 3';$('#money').textContent='$'+st.money.toLocaleString();$('#shade').textContent=valueShade()+' / 100';$('#eco').textContent=valueEco()+' / 100';$('#planted').textContent=st.lots.filter(l=>l.status==='growing').length;$('#day').textContent='第 '+st.day+' 天';$('#weather').textContent=['☀️ 炎熱','🌦️ 午後雷陣雨','⛅ 多雲','🌬️ 強風'][st.weather%4];$('#chapterName').textContent=ch.name;$('#chapterDesc').textContent=ch.desc;$('#plotCount').textContent=st.lots.length+' 處候選地點';
$('#zones').innerHTML=st.zones.map(z=>`<button class="zoneBtn ${z.id===st.zoneSelected?'active':''}" data-zone="${z.id}"><b>${z.kind==='empty'?'▫️':BUILD[z.kind].icon}</b>${z.id+1} 號・${z.kind==='empty'?'空地':BUILD[z.kind].name}</button>`).join('');
let parks=st.zones.filter(z=>z.kind==='park').length,homes=st.zones.filter(z=>z.kind==='home').length,roads=st.zones.filter(z=>z.kind==='road').length,parkTrees=st.lots.filter(l=>l.zone!==undefined&&l.status==='growing').length;
$('#planCount').textContent=st.zones.filter(z=>z.kind!=='empty').length+' / 12 街廓';
$('#planGoals').innerHTML=`🏘️ <b>自由建設挑戰：</b> 公園 ${parks}/2 ・住宅 ${homes}/2 ・道路 ${roads}/3 ・公園新樹 ${parkTrees}/2<br>${parks>=2&&homes>=2&&roads>=3&&parkTrees>=2?'✅ 綠色社區挑戰已完成！':'把城市綠化和生活機能一起規劃，建地不是種得越滿越好。'}`;
$('#plots').innerHTML=st.lots.map(l=>`<button type="button" data-lot="${l.id}" class="plot ${l.id===st.selected?'sel':''} ${l.chapter>st.chapter?'lock':''}"><span class="ico">${badge(l)}</span><span style="min-width:0"><b>${l.name}</b><small>${l.chapter>st.chapter?'🔒 尚未解鎖':l.busy?'👷 工作進行中':l.status==='growing'?'🌿 '+SPE[l.species].name:l.status==='suspect'?'既有老樹待檢查':l.status==='danger'?'已確認危木待移除':l.area==='blocked'?'不宜種植':'可進行規劃'}</small></span></button>`).join('');
$('#missions').innerHTML=ch.goals.map(([area,txt])=>{let ok=area==='safety'?st.removed>0:st.lots.some(l=>l.area===area&&l.status==='growing');return `<div class="mission ${ok?'done':''}"><span>${ok?'✅':'○'}</span><span>${txt}</span><small>${ok?'已完成':'待執行'}</small></div>`}).join('');
$('#nextChapter').disabled=!stageReady()||st.jobs.length>0;$('#nextChapter').textContent=stageReady()?(st.chapter===2?'🏆 完成城市驗收':'🏙️ 解鎖下一章 →'):'🔒 完成任務解鎖';$('#nextDay').disabled=st.jobs.length>0;
for(let [key,id] of [['garden','gardener'],['arbor','arborist']])$('#'+id).textContent=st.workers[key].job?Workflow.label(st.workers[key].job):'待命';
renderSelected();renderCommunity()}
function renderSelected(){let l=selectedLot(),el=$('#selected');if(st.zoneSelected!==null){renderZone();return}if(!l){el.innerHTML='<div class="notice">👋 <b>居民的第一個願望：</b>「夏天走到學校真的好熱！可以幫我們規劃樹蔭嗎？」<br>點選城市地圖上的發光圓圈，或下方地點清單；也可以先在新市鎮自由規劃區興建住宅、公園及道路。</div>';return}
let locked=l.chapter>st.chapter;let intro=`<h3>${badge(l)} ${l.name}</h3><div class="sub">${l.detail}</div>`;
if(l.area==='blocked'){el.innerHTML=intro+`<div class="notice error" style="margin-top:10px">⛔ 此地不適合種植。理由：${l.detail}</div><div class="speciesInfo">守護城市也包括「保留必要的無障礙通道、救護車動線、消防空間與路口視距」。</div>`;return}
if(locked){el.innerHTML=intro+'<div class="notice warn" style="margin-top:10px">🔒 此區尚未解鎖。完成目前章節的樹木規劃即可開放。</div>';return}
if(l.status==='suspect'){el.innerHTML=intro+`<div class="notice warn" style="margin-top:10px">🌲 既有大樹不能只因為老了就砍掉。請先派樹藝師檢查樹木健康與安全。</div><div class="actions"><button class="btn primary" data-action="inspect" ${l.busy||st.money<95?'disabled':''}>🔍 派遣樹藝師檢查 $95</button><button class="btn" data-action="remove" ${l.busy?'disabled':''}>🪓 移除危木（需檢查）</button></div>`;return}
if(l.status==='danger'){el.innerHTML=intro+`<div class="notice error" style="margin-top:10px">⚠️ 專業鑑定確認高風險，需由合格人員完成安全移除，再規劃補植。</div><div class="actions"><button class="btn primary" data-action="remove" ${l.busy||st.money<230?'disabled':''}>🪵 安全移除危木 $230</button></div>`;return}
if(l.status==='healthy'&&l.inspected){el.innerHTML=intro+'<div class="notice" style="margin-top:10px">✅ 樹藝師評估這棵老樹可保留。保護成熟樹比砍掉重種更有價值。</div>';return}
if(l.status==='dry'){el.innerHTML=intro+`<div class="notice warn" style="margin-top:10px">☀️ 植栽可能缺水，優先照護，不能直接砍掉。</div><div class="actions"><button class="btn primary" data-action="water" ${l.busy||st.money<45?'disabled':''}>💧 派園丁澆水 $45</button></div>`;return}
if(l.status==='growing'){el.innerHTML=intro+`<div class="notice" style="margin-top:10px">🌳 已種植：${SPE[l.species].name}，成長第 ${l.age} 天。成熟後需要持續巡檢及維護。</div><div class="actions"><button class="btn" data-action="water" ${l.busy||st.money<45?'disabled':''}>💧 澆水 $45</button><button class="btn" data-action="prune" ${l.busy||st.money<80?'disabled':''}>✂️ 專業修枝 $80</button></div>`;return}
let options=Object.entries(SPE).map(([key,s])=>`<option value="${key}" ${key===st.species?'selected':''}>${s.icon} ${s.name}（$${s.cost}）</option>`).join('');let a=assessment(l,st.species),s=SPE[st.species];el.innerHTML=intro+`<label class="field">🌱 你想種什麼樹？<select id="speciesSelect">${options}</select></label><div class="speciesInfo"><b>${s.name}</b>｜${s.desc}</div><div class="notice ${a.ok?'':'warn'}" style="margin-top:8px">${a.reason}</div><div class="actions"><button class="btn primary" data-action="plant" ${!a.ok||l.busy||st.money<s.cost?'disabled':''}>🧑‍🌾 派工種植 $${s.cost}</button><button class="btn" data-action="suggest">💡 建議樹種</button></div>`}
function selectLot(id,scroll=false){st.zoneSelected=null;st.selected=id;updateUI();if(scroll&&innerWidth<780)$('#chapterName').scrollIntoView({behavior:'smooth',block:'start'})}
function suggestion(l){let good=Object.keys(SPE).filter(k=>assessment(l,k).ok);if(good.length){st.species=good[0];updateUI();message('建議先評估：'+SPE[good[0]].name+'。實地仍需確認條件。')}else message('此地現階段不適合再植樹，可能需要留白或改善基地。')}
function schedule(type){if(st.phase!=='play')return;let l=selectedLot();if(!l||l.busy)return;let crew=type==='plant'||type==='water'?'garden':'arbor',cost=type==='plant'?SPE[st.species].cost:type==='inspect'?95:type==='remove'?230:type==='prune'?80:45;
if(type==='plant'){let a=assessment(l,st.species);if(!a.ok){message(a.reason);return}}
if(type==='remove'&&l.status!=='danger'){message('必須先完成專業風險評估，不能隨意砍除健康樹木。');return}
if(type==='inspect'&&l.status!=='suspect'){message('這個地點不需要執行此項檢查。');return}
if(type==='water'&&!['dry','growing'].includes(l.status)){message('此地目前不需要澆水。');return}
if(type==='prune'&&l.status!=='growing'){message('此地沒有需要修枝的植栽。');return}
if(st.money<cost){message('預算不足，請先管理現有綠地或進入下一天領取補助。');return}
st.money-=cost;l.busy=true;let job={lot:l.id,type,crew,species:type==='plant'?st.species:l.species,phase:'queued',timer:0};st.jobs.push(job);log(`派出${crew==='garden'?'園丁':'樹藝師'}到${l.name}：${type==='plant'?'種植 '+SPE[job.species].name:type==='inspect'?'專業檢查':type==='water'?'澆水':type==='remove'?'移除確認危木':'修枝'}（-$${cost}）`);pump();updateUI()}
function pump(){for(let key of ['garden','arbor']){let w=st.workers[key];if(w.job)continue;
 const job=st.jobs.find(j=>j.crew===key&&j.phase==='queued');if(!job)continue;
 const l=st.lots.find(l=>l.id===job.lot);job.phase='walking';w.job=job;
 w.targ=[l.x+.65,l.z+.75];w.route=Navi.route([w.x,w.z],w.targ);w.pathIndex=1;
 log('🚶 '+(key==='garden'?'園丁小葉':'樹藝師阿森')+'沿城市步道前往「'+l.name+'」');
}}
function finish(job){let l=st.lots.find(l=>l.id===job.lot),type=job.type;if(type==='plant'){l.species=job.species;l.status='growing';l.age=0;log('🌱 '+SPE[job.species].name+'種植完成，請記得後續維護。')}if(type==='inspect'){l.inspected=true;l.status=l.diagnosis==='danger'?'danger':'healthy';log(l.status==='danger'?'⚠️ 專業評估：樹幹裂傷且有立即風險，需由專業團隊安全處置。':'🩺 專業評估：這棵老樹目前可保留，暫無移除必要。')}if(type==='remove'){l.status='empty';l.species=null;st.removed++;log('🪵 確認危木由專業人員移除，可重新規劃綠化。')}if(type==='water'){if(l.status==='dry')l.status='growing';l.health=Math.min(100,l.health+35);log('💧 已完成澆水照護。')}if(type==='prune'){log('✂️ 完成專業修枝。提醒：不應不當截頂。')}
l.busy=false;let w=st.workers[job.crew];w.job=null;w.targ=null;w.route=null;w.pathIndex=0;w.working=false;st.jobs=st.jobs.filter(j=>j!==job);pump();message('✅ '+l.name+'：工程完成！');updateUI()}
function advanceWorkers(dt){for(const key of ['garden','arbor']){const w=st.workers[key],j=w.job;if(!j)continue;
 if(j.phase==='walking'){
  let remaining=Math.min(dt*5.3,.36); // step along path; never teleport through buildings
  while(remaining>0&&w.pathIndex<(w.route||[]).length){const point=w.route[w.pathIndex],dx=point[0]-w.x,dz=point[1]-w.z,d=Math.hypot(dx,dz);
   if(d<.04){w.pathIndex++;continue}const step=Math.min(remaining,d);w.x+=dx/d*step;w.z+=dz/d*step;w.facing=Math.atan2(dx,dz);remaining-=step;
   if(step>=d-.001)w.pathIndex++;
  }
  if(w.pathIndex>=(w.route||[]).length){w.x=w.targ[0];w.z=w.targ[1];w.working=true;const text=Workflow.begin(j);log('🧰 '+(key==='garden'?'園丁':'樹藝師')+'抵達現場：'+text);updateUI()}
 }else if(j.phase==='work'){let before=j.stage;const progress=Workflow.advance(j,dt);
  if(progress.done){finish(j)}else if(progress.changed&&j.stage!==before){log('🔧 '+st.lots.find(l=>l.id===j.lot).name+'：'+Workflow.label(j));updateUI()}
 }
}}
function newDay(){if(st.jobs.length){message('工作人員尚未完成任務。');return}st.day++;st.weather=(st.weather+1)%4;let homes=st.zones.filter(z=>z.kind==='home').length,parks=st.zones.filter(z=>z.kind==='park').length,roads=st.zones.filter(z=>z.kind==='road').length;
let subsidy=195+homes*95-parks*20-roads*8;st.money+=subsidy;let evt='';for(let l of st.lots){if(l.status==='growing'){l.age++;if(st.day%6===0&&l.id%4===0){l.status='dry';evt=l.name+'需要補水';}}}log(`獲得綠化維護補助 +$${subsidy}。${evt?'注意：'+evt:'樹苗又長大了一些。'}`);message('⏩ 進入第 '+st.day+' 天。'+(evt||'樹苗持續成長中'));updateUI()}
function advanceChapter(){if(!stageReady()||st.jobs.length)return;if(st.chapter===2){st.phase='win';$('#win').classList.add('open');$('#winInfo').innerHTML=`<span class="pill">🏆 CITY GARDEN AWARD</span><h2>南島綠城規劃完成！</h2><p>你分別為校園、人行道、醫院、工廠邊界、電力走廊與河岸找到合適的綠化策略，並保護既有老樹。</p><div class="notice">🌳 成功植栽：${st.lots.filter(l=>l.status==='growing').length} 處｜🌡️ 遮蔭 ${valueShade()}｜🦋 生態 ${valueEco()}</div><button class="btn primary" id="again" style="width:100%;margin-top:14px;padding:13px">再玩一次 ↻</button>`;return}st.chapter++;st.money+=380;log('解鎖 '+CHAPTERS[st.chapter].name+'，獲得專案補助 $380。');message('新章節開放！'+CHAPTERS[st.chapter].name);updateUI()}
const canvas=$('#gameCanvas');const gl=canvas.getContext('webgl',{alpha:true,antialias:true,powerPreference:'high-performance',preserveDrawingBuffer:true})||canvas.getContext('experimental-webgl');
const ctx2d=gl?null:canvas.getContext('2d',{alpha:true}); // Automatically fall back to a 3D software renderer when WebGL is blocked.
let program,pBuf,cBuf,uMVP,uEvening,attrP,attrC,mvp=null,vcount=0;function makeShader(type,s){let v=gl.createShader(type);gl.shaderSource(v,s);gl.compileShader(v);if(!gl.getShaderParameter(v,gl.COMPILE_STATUS))throw Error(gl.getShaderInfoLog(v));return v}
if(gl){try{program=gl.createProgram();gl.attachShader(program,makeShader(gl.VERTEX_SHADER,'attribute vec3 aPosition;attribute vec3 aColor;uniform mat4 uMVP;varying vec3 vColor;void main(){gl_Position=uMVP*vec4(aPosition,1.0);vColor=aColor;}'));gl.attachShader(program,makeShader(gl.FRAGMENT_SHADER,'precision mediump float;varying vec3 vColor;uniform float uEvening;void main(){vec3 c=vColor*mix(1.0,.52,uEvening)+vec3(.012,.033,.065)*uEvening;gl_FragColor=vec4(c,1.0);}'));gl.linkProgram(program);if(!gl.getProgramParameter(program,gl.LINK_STATUS))throw Error(gl.getProgramInfoLog(program));gl.useProgram(program);pBuf=gl.createBuffer();cBuf=gl.createBuffer();attrP=gl.getAttribLocation(program,'aPosition');attrC=gl.getAttribLocation(program,'aColor');uMVP=gl.getUniformLocation(program,'uMVP');uEvening=gl.getUniformLocation(program,'uEvening');gl.enable(gl.DEPTH_TEST);gl.depthFunc(gl.LEQUAL);gl.disable(gl.CULL_FACE);gl.clearColor(0,0,0,0);glReady=true;}catch(e){console.error(e)}}
const cols={grass:'#9ecf91',turf:'#aadd9e',soil:'#d5b18b',ground:'#91bf89',edge:'#688e76',road:'#b9c9b9',walk:'#e9d7b2',river:'#70bfc2',water:'#8ad6cf',wood:'#91654d',leaf:'#5dba78',leaf2:'#389e72',bright:'#8ccf83',pine:'#2f986e',rock:'#849b87',pink:'#eaa4ba',stone:'#bcbeb3',gold:'#f5c46f'};
function rgb(c){if(Array.isArray(c))return c;let s=c[0]==='#'?c.slice(1):c;return [parseInt(s.slice(0,2),16)/255,parseInt(s.slice(2,4),16)/255,parseInt(s.slice(4,6),16)/255]};
let ps=[],cs=[];const light=[.48,.87,.36];function triangle(a,b,c,col,variation=1){let ux=b[0]-a[0],uy=b[1]-a[1],uz=b[2]-a[2],vx=c[0]-a[0],vy=c[1]-a[1],vz=c[2]-a[2],nx=uy*vz-uz*vy,ny=uz*vx-ux*vz,nz=ux*vy-uy*vx,l=Math.hypot(nx,ny,nz)||1;let shade=clamp(Math.abs((nx*light[0]+ny*light[1]+nz*light[2])/l)*.36+.7,.38,1.07)*variation;let co=rgb(col);ps.push(...a,...b,...c);for(let i=0;i<3;i++)cs.push(...co.map(q=>clamp(q*shade,0,1)))}
function quad(a,b,c,d,col){triangle(a,b,c,col);triangle(a,c,d,col)}
function box(x,y,z,w,h,d,col){let x1=x-w/2,x2=x+w/2,y1=y,y2=y+h,z1=z-d/2,z2=z+d/2;
let p=[[x1,y1,z1],[x2,y1,z1],[x2,y1,z2],[x1,y1,z2],[x1,y2,z1],[x2,y2,z1],[x2,y2,z2],[x1,y2,z2]];
quad(p[0],p[1],p[2],p[3],col);quad(p[4],p[7],p[6],p[5],col);quad(p[0],p[4],p[5],p[1],col);quad(p[1],p[5],p[6],p[2],col);quad(p[2],p[6],p[7],p[3],col);quad(p[3],p[7],p[4],p[0],col)}
function cyl(x,y,z,r,h,col,sides=7,r2=r){const lower=[],upper=[];for(let i=0;i<sides;i++){let t=i*TAU/sides;lower.push([x+Math.cos(t)*r,y,z+Math.sin(t)*r]);upper.push([x+Math.cos(t)*r2,y+h,z+Math.sin(t)*r2])}for(let i=0;i<sides;i++){let j=(i+1)%sides;quad(lower[i],lower[j],upper[j],upper[i],col);triangle([x,y,z],lower[j],lower[i],col);triangle([x,y+h,z],upper[i],upper[j],col)}}
function sphere(x,y,z,r,col,lat=4,lon=7,sx=1,sy=1,sz=1){for(let i=0;i<lat;i++){let a=-Math.PI/2+i*Math.PI/lat,b=-Math.PI/2+(i+1)*Math.PI/lat;for(let j=0;j<lon;j++){let t=j*TAU/lon,u=(j+1)*TAU/lon;let p=(v,q)=>[x+r*Math.cos(v)*Math.cos(q)*sx,y+r*Math.sin(v)*sy,z+r*Math.cos(v)*Math.sin(q)*sz];let v0=p(a,t),v1=p(a,u),v2=p(b,u),v3=p(b,t);if(i===0)triangle(v0,v2,v3,col);else if(i===lat-1)triangle(v0,v1,v2,col);else quad(v0,v1,v2,v3,col)}}}
function slopeRoof(x,y,z,w,h,d,col){let A=[x-w/2,y,z-d/2],B=[x+w/2,y,z-d/2],C=[x+w/2,y,z+d/2],D=[x-w/2,y,z+d/2],L=[x,y+h,z-d/2],R=[x,y+h,z+d/2];quad(A,D,R,L,col);quad(L,R,C,B,col);triangle(A,L,B,col);triangle(D,C,R,col)}
function ring(x,y,z,r,c){const n=19;for(let i=0;i<n;i++){let t=i*TAU/n,t2=(i+1)*TAU/n;let p=(r,t)=>[x+Math.cos(t)*r,y,z+Math.sin(t)*r];quad(p(r,t),p(r+.085,t),p(r+.085,t2),p(r,t2),c)}}
function pathSegment(x,z,w,d,c){box(x,.027,z,w,.045,d,c)}

function slopeRoof(x,y,z,w,h,d,col){let A=[x-w/2,y,z-d/2],B=[x+w/2,y,z-d/2],C=[x+w/2,y,z+d/2],D=[x-w/2,y,z+d/2],L=[x,y+h,z-d/2],R=[x,y+h,z+d/2];quad(A,D,R,L,col);quad(L,R,C,B,col);triangle(A,L,B,col);triangle(D,C,R,col)}
function twig(x,y,z,x2,y2,z2,r,color){let len=Math.hypot(x2-x,y2-y,z2-z);if(len<.02)return;
// light polygonal trunk sections; foliage is main silhouette
let dx=x2-x,dz=z2-z;for(let k=0;k<5;k++){let a=k*TAU/5,b=(k+1)*TAU/5;let p=[x+Math.cos(a)*r,y,z+Math.sin(a)*r],q=[x+Math.cos(b)*r,y,z+Math.sin(b)*r];let v=[x2+Math.cos(b)*r*.45,y2,z2+Math.sin(b)*r*.45],u=[x2+Math.cos(a)*r*.45,y2,z2+Math.sin(a)*r*.45];quad(p,q,v,u,color)} }
function leafGroup(x,y,z,r,c,seed){let c2=seed%3===0?'#9dcc7f':seed%3===1?'#80c796':'#5da878';sphere(x,y,z,r,c,3,7,1.1,.82,1);sphere(x-r*.31,y+r*.23,z-r*.18,r*.48,c2,3,6,.9,.8,1);}
function canopy(x,z,key,age,seed){let data=SPE[key]||SPE.crape;
let scale=(age<=0?.23:age<=1?.52:age===2?.71:age===3?.85:1);
let big=data.size===3?1.14:data.size===1?.49:.88,sz=scale*big;
let trunk='#89674c',bark='#a17b5d',col=data.color;
if(key==='shrub'){for(let i=0;i<4;i++){let t=i*TAU/4+seed;leafGroup(x+Math.cos(t)*.25*sz,.43*scale,z+Math.sin(t)*.3*sz,.46*sz,col,seed+i)}return;}
let H=2.7*sz+(.32*scale),radius=(key==='ban'?1.17:key==='liquid'?1.05:.9)*sz;
// root flare and lawn soil mound
sphere(x,.12,z,.43*sz,'#789d60',3,7,1,.28,1);cyl(x,.13,z,.16*sz,H*.62,bark,8,.115*sz);
for(let i=0;i<3;i++){let a=i*TAU/3+seed*.3;twig(x,.27,z,x+Math.cos(a)*.3*sz,.08,z+Math.sin(a)*.32*sz,.055*sz,trunk)}
if(key==='liquid'){
  // sweetgum: angular crown and ochre seasonal leaf tones
  for(let i=0;i<7;i++){let a=i*TAU/7+seed*.09,rr=(i%2?.47:.73)*radius,yy=H*.79+(i%3-1)*.13*sz;
   twig(x,H*.46,z,x+Math.cos(a)*rr,yy,z+Math.sin(a)*rr,.07*sz,trunk);
   leafGroup(x+Math.cos(a)*rr,yy,z+Math.sin(a)*rr,.45*sz,i%4===0?'#caab61':col,i+seed)}
  leafGroup(x,H*.98,z,.62*sz,'#78b882',seed);
}else if(key==='ban'){
  // broad old-growth canopy: the larger shade trees look wider and denser
  for(let i=0;i<9;i++){let a=i*TAU/9+seed*.24,rr=(i%2===0?.95:.67)*radius,yy=H*.75+(i%3)*.11*sz;
   twig(x,H*.42,z,x+Math.cos(a)*rr*.8,yy,z+Math.sin(a)*rr*.8,.07*sz,trunk);
   leafGroup(x+Math.cos(a)*rr,yy,z+Math.sin(a)*rr,.48*sz,i%3===0?'#3c8f62':col,i+seed)}
  leafGroup(x,H*1.04,z,.74*sz,'#4a9971',seed);
}else if(key==='ash'){
  // open airy, light-green ash canopy with small grouped leaf tufts
  for(let i=0;i<8;i++){let a=i*TAU/8+seed,rr=(.51+(i%3)*.10)*radius;twig(x,H*.38,z,x+Math.cos(a)*rr,H*.83,z+Math.sin(a)*rr,.045*sz,trunk);leafGroup(x+Math.cos(a)*rr,H*.82+(i%2)*.16*sz,z+Math.sin(a)*rr,.32*sz,i%3?'#85bf72':'#9ed38c',seed+i)}
  leafGroup(x,H*1.1,z,.43*sz,'#86c975',seed);
}else if(key==='pong'){
  // water pong: spreading umbrella shape with feathery clusters
  for(let i=0;i<7;i++){let a=i*TAU/7+seed*.11,rr=radius*(.74+i%2*.13);twig(x,H*.48,z,x+Math.cos(a)*rr,H*.80,z+Math.sin(a)*rr,.065*sz,trunk);leafGroup(x+Math.cos(a)*rr,H*.81,z+Math.sin(a)*rr,.35*sz,'#47a97e',seed+i)}
  leafGroup(x,H*.98,z,.52*sz,'#65b78c',seed);
}else if(key==='du'){
  // Du Ying: denser, tiered evergreen foliage
  for(let i=0;i<7;i++){let a=i*TAU/7+seed*.21,rr=.52*radius;leafGroup(x+Math.cos(a)*rr,H*.7+(i%2)*.16*sz,z+Math.sin(a)*rr,.44*sz,i%3===0?'#4d9e76':col,seed+i)}
  leafGroup(x,H*1.07,z,.51*sz,'#4a9e81',seed);
}else{
  // crape myrtle: multiple trunks, light oval canopy and spring flowers
  for(let i=0;i<6;i++){let a=i*TAU/6+seed*.37,rr=.63*radius;twig(x,H*.46,z,x+Math.cos(a)*rr,H*.83,z+Math.sin(a)*rr,.055*sz,trunk);leafGroup(x+Math.cos(a)*rr,H*.85,z+Math.sin(a)*rr,.39*sz,col,seed+i);
   if(i%2===0)sphere(x+Math.cos(a)*rr,H*.98,z+Math.sin(a)*rr,.15*sz,'#e7acb5',3,6)}
  leafGroup(x,H*1.06,z,.45*sz,'#7cc184',seed);
}}
function lowBuilding(x,z,w,d,h,col,roof,name){box(x,.02,z,w,h,d,col);box(x,h+.02,z,w+.18,.2,d+.18,roof);for(let xx=-w/2+.6;xx<w/2-.1;xx+=.9)for(let yy=.8;yy<h-.2;yy+=1.15)box(x+xx,yy,z+d/2+.036,.48,.55,.06,'#8bbed0');box(x,.02,z+d/2+.05,.63,1,.055,'#8e9885')}
function campus(){lowBuilding(-6.65,-5.45,3.8,2.15,2.45,'#edcfad','#b88a69');box(-6.7,2.7,-5.55,2.2,.12,1.7,'#b7ccb9');for(let x of [-8.2,-5.9])box(x,2.65,-4.4,.7,.23,.08,'#f7e2bd');box(-8.15,.04,-3.7,.08,.12,2,'#fff5c6')}
function hospital(){lowBuilding(6.35,-5.33,3.1,2.3,3.5,'#e6ece7','#7abbb3');box(6.3,3.58,-5.31,.87,.14,.14,'#ed847c');box(6.3,3.58,-5.31,.14,.14,.87,'#ed847c')}
function factory(){lowBuilding(6.5,5.1,3,2.35,2.6,'#cbd8cd','#8caaa4');for(let x of [5.65,7.13])cyl(x,2.6,4.95,.35,1.45,'#98aba7',8);box(6.45,0,3.92,1.05,1.8,.08,'#8ca59e');}
function powerPlant(){box(-6.3,.05,5.55,3.2,1.25,2.4,'#bdd2c8');box(-6.3,1.3,5.55,3.4,.16,2.55,'#709b9e');for(let xx of [-7.25,-5.35]){cyl(xx,1.45,5.55,.22,.45,'#6b9999',7);cyl(xx,1.92,5.55,.09,.43,'#e2c38d',7)}for(let z of [2.1,4.4]){cyl(-8.4,.0,z,.07,4,'#758f90',6);box(-8.4,4,z,2,.11,.12,'#718588');for(let x of [-9.1,-8.4,-7.7])sphere(x,4,z,.1,'#e2daba',3,6)} }
function houses(){lowBuilding(-1.1,-5.95,1.75,1.55,1.9,'#f5e0c5','#d3a178');lowBuilding(1.3,-5.85,1.7,1.7,1.7,'#e9d8cb','#ba9f91');lowBuilding(1.3,4.1,1.7,1.5,1.8,'#f0e5cc','#bc8c81')}
function shadow(x,z,r=.34){sphere(x,.015,z,r,'#5d7864',3,7,1,.08,1)}
function helmet(x,y,z,c){sphere(x,y,z,.29,c,3,7,1,.48,1);box(x,y-.06,z+.02,.38,.05,.33,'#e6efe1');box(x,y-.02,z-.18,.16,.04,.07,'#d8ddd1')}
function vestBody(x,z,shirt,vest){box(x,.08,z,.17,.58,.17,'#516879');box(x,.67,z,.47,.52,.34,shirt);box(x,.67,z,.40,.48,.28,vest);box(x,.67,z,.08,.5,.06,'#f5e47d');box(x,.67,z-.10,.06,.48,.28,'#f5e47d');box(x,.46,z,.12,.22,.12,'#33424d');box(x,.88,z,.40,.08,.34,'#324853')}
function boots(x,z){box(x-.12,.07,z,.12,.16,.2,'#403a35');box(x+.12,.07,z,.12,.16,.2,'#403a35');box(x-.12,.28,z,.11,.34,.11,'#526474');box(x+.12,.28,z,.11,.34,.11,'#526474');box(x-.12,.16,z+.07,.16,.05,.18,'#463d36');box(x+.12,.16,z-.07,.16,.05,.18,'#463d36')}
function arms(x,z,shirt,walk=0){box(x-.28,.72+walk,z,.10,.42,.10,shirt);box(x+.28,.72-walk,z,.10,.42,.10,shirt);sphere(x-.28,.50+walk,z,.08,'#f1c59f',3,6);sphere(x+.28,.50-walk,z,.08,'#f1c59f',3,6)}
function person(x,z,shirt,helmetColor=null,mode='idle'){let walk=mode==='walk'?Math.sin(viewTime*10)*.11:0;shadow(x,z,.30);boots(x,z);if(helmetColor){vestBody(x,z,shirt,shirt==='#eab278'?'#ef914d':'#6fa8a5')}else{box(x,.67,z,.43,.51,.34,shirt)}arms(x,z,shirt,walk);sphere(x,1.10,z,.22,'#f0c29b',3,6);if(helmetColor)helmet(x,1.34,z,helmetColor);else sphere(x,1.31,z,.25,'#847866',3,6,1,.45,1);box(x,1.0,z,.14,.09,.15,'#8b6c5b')}
function trafficCone(x,z){box(x,.05,z,.22,.06,.22,'#6b746d');cyl(x,.11,z,.12,.26,'#ef8b4d',5,.03);box(x,.20,z,.17,.03,.17,'#fff0d8')}
function saplingPot(x,z){box(x,.08,z,.26,.16,.26,'#875e3c');cyl(x,.18,z,.04,.42,'#80684a',6);sphere(x,.67,z,.20,'#66b778',3,7)}
function toolShovel(x,y,z,beat){box(x,y+.38,z,.06,.78,.06,'#9d805d');box(x,y+.74,z,.12,.05,.08,'#ccb28f');box(x,y+.02,z,.18,.20,.05,'#b5bdba');sphere(x,y+.17,z+.03,.08,'#a78f73',3,5)}
function toolWateringCan(x,y,z,beat){box(x,y+.28,z,.36,.25,.26,'#6fa8b2');cyl(x+.16,y+.30,z,.04,.13,'#bfcac5',6);box(x-.02,y+.38,z,.10,.08,.30,'#8ebbc1');for(let i=0;i<5;i++)sphere(x+.24+i*.12,y+.26-i*.055+beat*.10,z+.12,.05,'#5fc2ea',3,5)}
function toolClipboard(x,y,z,beat){box(x,y+.38,z,.28,.36,.05,'#ecd9ac');box(x,y+.55,z,.11,.04,.06,'#869087');box(x,y+.27,z,.18,.02,.05,'#c8b17b')}
function toolShears(x,y,z,beat){box(x,y+.40,z,.07,.58,.05,'#afbab7');box(x+.15,y+.60+beat*.06,z,.28,.08,.05,'#a7b8b2');box(x+.14,y+.71+beat*.08,z,.08,.22,.05,'#9babaa');sphere(x-.03,y+.18,z,.06,'#4b4f51',3,5);sphere(x+.08,y+.18,z,.06,'#4b4f51',3,5)}
function toolChainsaw(x,y,z,beat){box(x,y+.33,z,.30,.22,.18,'#e5b36b');box(x+.17,y+.40,z,.12,.12,.12,'#bfd4d6');box(x-.02,y+.55,z,.18,.07,.12,'#637875');box(x+.40,y+.33,z,.34,.06,.05,'#c8d2cf')}
function worker(key,time){let w=st.workers[key],x=w.x,z=w.z,shirt=key==='garden'?'#eab278':'#79aaa9',helmetColor=key==='garden'?'#f2d16a':'#dce8d2';let mode=(w.job&&w.job.phase==='walking')?'walk':'idle';person(x,z,shirt,helmetColor,mode);if(!w.job)return;let a=w.job.type,stage=w.job.stage||0,beat=(Math.sin(time*11)+1)/2;if(w.job.phase==='walking'){if(key==='garden')saplingPot(x+.42,z+.10);else trafficCone(x+.38,z+.06)}if(!w.working)return;
if(a==='plant'&&stage===0){trafficCone(x+.68,z+.34);trafficCone(x+.18,z+.58);saplingPot(x+.56,z+.44);toolShovel(x+.34,.05,z+.15,beat);sphere(x+.30,.11,z+.48,.28,'#aa835b',3,7,1,.38,1);for(let i=0;i<4;i++)sphere(x+.43+i*.08,.16+beat*.08,z+.43,.045,'#b6976c',3,5)}
else if(a==='plant'&&stage===1){trafficCone(x+.68,z+.34);saplingPot(x+.55,z+.41);cyl(x+.46,.14,z+.39,.05,.47,'#87694b',6);sphere(x+.46,.69+beat*.06,z+.39,.21,'#67b778',3,7);toolShovel(x+.24,.03,z+.09,beat)}
else if(a==='plant'&&stage===2){trafficCone(x+.66,z+.34);saplingPot(x+.56,z+.43);toolWateringCan(x+.30,.10,z+.12,beat)}
else if(a==='plant'&&stage===3){trafficCone(x+.66,z+.34);sphere(x+.35,.20,z+.39,.33,'#b89669',3,7,1,.26,1);box(x+.18,.10,z+.52,.34,.06,.18,'#7f6a50')}
else if(a==='water'){toolWateringCan(x+.29,.10,z+.12,beat);trafficCone(x+.66,z+.30)}
else if(a==='inspect'){trafficCone(x+.62,z+.22);toolClipboard(x+.34,.28,z+.04,beat);box(x+.52,.20,z+.22,.08,.34,.08,'#7d694f');sphere(x+.52,.59,z+.22,.18,'#76b481',3,6)}
else if(a==='prune'){trafficCone(x+.66,z+.32);toolShears(x+.28,.34,z+.05,beat);box(x+.54,.18,z+.30,.08,.44,.08,'#7f6a4c');sphere(x+.54,.68,z+.30,.19,'#71b37d',3,6)}
else if(a==='remove'){trafficCone(x+.70,z+.32);trafficCone(x+.34,z+.58);toolChainsaw(x+.30,.27,z+.02,beat);box(x+.52,.10,z+.24,.24,.18,.24,'#7f6b4f');box(x+.74,.10,z+.26,.20,.16,.20,'#8d7456')}
}
function siteCircle(l,time){let r=.58+(Math.sin(time*2+l.id)*.05);ring(l.x,.13,l.z,r,l.status==='growing'?'#b1d893':l.area==='blocked'?'#c5aaa4':l.chapter>st.chapter?'#9ca9a3':'#e2d99a');if(st.selected===l.id){ring(l.x,.17,l.z,.85,'#ffe194');ring(l.x,.19,l.z,1.0,'#4baf7d')}}
function mapBase(){box(3.5,-.84,0,27.3,.86,16.7,'#779879');box(3.5,-.23,0,27,.55,16.5,'#90b981');box(3.5,.02,0,26.9,.08,16.35,'#aed49a');for(let x=-9;x<17;x+=2)for(let z=-7;z<8;z+=2){if(Math.sin(x*32+z*7)>.2)box(x,.085,z,1.9,.012,1.9,'#b5d89e')}
// Street network and planted corridors
box(3.5,.10,0,27,.065,1.5,'#bbc0b8');box(0,.10,0,1.5,.066,16.2,'#bdc2b5');for(let i=-8;i<17;i+=2)box(i,.17,0,.77,.013,.07,'#f8f5e3');for(let i=-6;i<7;i+=2)box(0,.17,i,.07,.013,.6,'#fff6e3');box(3.5,.11,7.15,26.8,.07,1.1,'#8acdd0');box(3.5,.13,6.3,26.8,.06,.55,'#e8d7ae');
// open green zones
box(-4.3,.09,2.1,8.0,.03,4.1,'#9ed09c');box(5.65,.11,-2.95,6.8,.04,1.3,'#c4deb2');box(5.75,.13,3.25,6.1,.04,1.2,'#b1cf91');box(-6.4,.115,3.15,5.7,.03,1,'#bbcbb0');
// boundary bricks and selected park furniture
for(let i=0;i<5;i++){box(-6.5+i*.7,.14,2.9,.13,.5,.13,'#d3b28a');sphere(-6.6+i*.8,.77,2.9,.16,'#cbe9a5',3,6)}
}

function civicDetails(now){
  // Marked pedestrian crossings on the public path network, including access near the school and clinic.
  for(const crossingX of [-5,3.5,10])for(let stripe=0;stripe<9;stripe++){
    box(crossingX,.198,-1.27+stripe*.31,.43,.015,.14,'#fbf4de');
  }
  // sidewalks with curbs, zebra crossing, stop lines and a protected cycle lane
  box(3.5,.182,-1.18,26.7,.045,.13,'#eee1c7');box(3.5,.182,1.18,26.7,.045,.13,'#efe0bd');
  for(let i=-8;i<=9;i++)box(i*1.4,.185,-.58,.75,.018,.06,'#e9e7d1');
  for(let i=-4;i<=4;i++)box(.06,.190,i*.17,.54,.014,.092,'#fff4dc');
  for(let i=0;i<10;i++){let z=-.80+i*.17;box(-1.01,.19,z,.43,.017,.08,'#fff6e2')}
  box(3.5,.182,-1.57,26.5,.026,.36,'#b9d0af');for(let i=-8;i<17;i+=2.2)box(i,.195,-1.57,.85,.012,.052,'#e5eee4');
  // street lights and benches: regular rhythms make the street feel inhabited
  for(let i=0;i<8;i++){
    let x=-8.1+i*3.32,z=1.45;
    cyl(x,.18,z,.055,1.2,'#6f8882',6);cyl(x,1.35,z,.15,.16,evening?'#ffdc89':'#d3e3cb',6,.20);
    box(x+.56,.16,2.1,.64,.12,.16,'#b28763');box(x+.34,.18,2.1,.09,.41,.13,'#927457');box(x+.78,.18,2.1,.09,.41,.13,'#927457');
  }
  // school fence and walkway; community bollards
  for(let i=0;i<8;i++){let x=-8.8+i*.63;box(x,.13,-2.62,.06,.57,.06,'#dbc49b')}
  box(-6.5,.73,-2.62,4.9,.07,.07,'#c0ab86');
  // flower beds at hospital, park and riverside, with deterministic positions
  for(let i=0;i<18;i++){
    let a=i*2.399,rr=.23+.07*(i%5),x=4.45+Math.cos(a)*rr*2.1,z=-2.10+Math.sin(a)*rr*1.25;
    sphere(x,.23,z,.11,i%3?'#d4a4a9':'#e2d68e',3,5);sphere(x,.19,z,.16,'#6aab6c',3,5,1,.56,1);
  }
  for(let i=0;i<12;i++){let x=1.1+i*1.1,z=7.70;box(x,.16,z,.84,.035,.07,'#7cb7b6')}
  // small roadside signpost & bus shelter, just outside crossing sightlines
  box(2.5,.18,-2.32,1.4,.10,.65,'#d1c19f');for(let x of [1.95,3.04])cyl(x,.18,-2.4,.06,1.55,'#728e86',6);
  box(2.5,1.67,-2.4,1.53,.17,.77,'#6fa3a4');box(2.5,.50,-2.66,1.04,.12,.16,'#b78f6a');
  cyl(2.95,1.8,-2.4,.035,.45,'#699593',6);box(2.95,2.20,-2.4,.36,.37,.08,'#e1d59c');
  // parked car and small service truck: no external models
  box(4.15,.22,-.38,1.05,.34,.63,'#d3aa83');box(4.22,.55,-.39,.58,.35,.55,'#e6d2b8');
  for(let dx of [-.30,.32])for(let dz of [-.36,.36])cyl(4.15+dx,.19,-.38+dz,.12,.13,'#4c6a63',6);
}
function shadeInfluence(x,z){let v=0;for(let l of st.lots){if(!l.species||!['growing','healthy','suspect','dry'].includes(l.status))continue;
 let d=Math.hypot(l.x-x,l.z-z);let mature=l.age>=3?1:.6;
 v+=Math.max(0,(4.6-d)/4.6)*mature*(SPE[l.species].size===3?22:SPE[l.species].size===1?5:14)}return v;}
function heatAt(x,z){let pressure=52;
 if(Math.abs(z)<2.3||Math.abs(x)<1.5)pressure+=19;
 if(x>10.2)pressure+=st.zones.some(a=>a.kind==='park'&&Math.hypot(a.x-x,a.z-z)<2)?-10:5;
 if(x>4.3&&z>2.4)pressure+=13;
 if(x>4.1&&z< -2.2)pressure+=7;
 pressure-=shadeInfluence(x,z);
 return clamp(Math.round(pressure),5,95);}
function heatLayer(){for(let x=-8.5;x<16.5;x+=1.75)for(let z=-7;z<7.4;z+=1.7){let v=heatAt(x,z),c=v>=65?'#d98978':v>=46?'#dcc184':'#8bc5a8';
 // shades physically inhabit the ground; no large opaque screen UI
 box(x,.156,z,1.50,.013,1.44,c);
 }}
function streetGardens(now){
  // Native-plant inspired texture details, maintained as clusters rather than tree overplanting.
  for(let i=0;i<35;i++){let x=-8.5+(i*19%70)*.23,z=i%2?3.7:5.55;
   let near=st.lots.some(l=>Math.hypot(l.x-x,l.z-z)<.7);if(!near)sphere(x,.19,z,.14,i%4===0?'#b4cf75':i%3===0?'#78ba77':'#89b884',3,5,1,.6,.85)
  }
  for(let i=0;i<14;i++){let x=-9+i*1.81,z=-7.2;sphere(x,.23,z,.28,i%2===0?'#6fb18c':'#88ba80',3,6,1,.6,1)}
  // vegetated perimeter / urban habitat (decorative, no planting slots obstructed)
  for(let i=0;i<10;i++){let x=-8.85+i*2.55,z=7.73;sphere(x,.32,z,.33,i%3===0?'#4ba18b':'#6aae72',3,7,1,.8,1.15)}
}

function perspective(fovy,aspect,near,far){let f=1/Math.tan(fovy/2);return [f/aspect,0,0,0,0,f,0,0,0,0,(far+near)/(near-far),-1,0,0,2*far*near/(near-far),0]}
function lookAt(eye,center,up){let z=eye.map((v,i)=>v-center[i]),l=Math.hypot(...z);z=z.map(v=>v/l);let cross=(a,b)=>[a[1]*b[2]-a[2]*b[1],a[2]*b[0]-a[0]*b[2],a[0]*b[1]-a[1]*b[0]];let x=cross(up,z);l=Math.hypot(...x);x=x.map(v=>v/l);let y=cross(z,x);return [x[0],y[0],z[0],0,x[1],y[1],z[1],0,x[2],y[2],z[2],0,-x.reduce((s,v,i)=>s+v*eye[i],0),-y.reduce((s,v,i)=>s+v*eye[i],0),-z.reduce((s,v,i)=>s+v*eye[i],0),1]}
function multiply(a,b){let o=new Array(16);for(let c=0;c<4;c++)for(let r=0;r<4;r++)o[c*4+r]=a[0*4+r]*b[c*4+0]+a[1*4+r]*b[c*4+1]+a[2*4+r]*b[c*4+2]+a[3*4+r]*b[c*4+3];return o}
let vpWidth=800,vpHeight=600;function resize(){const rect=canvas.getBoundingClientRect();vpWidth=rect.width;vpHeight=rect.height;const dpr=Math.min(devicePixelRatio||1,1.65);let w=Math.round(rect.width*dpr),h=Math.round(rect.height*dpr);if(canvas.width!==w||canvas.height!==h){canvas.width=w;canvas.height=h;if(gl)gl.viewport(0,0,w,h)}}
function project(p){let x=p[0],y=p[1],z=p[2];let a=mvp,cx=a[0]*x+a[4]*y+a[8]*z+a[12],cy=a[1]*x+a[5]*y+a[9]*z+a[13],cw=a[3]*x+a[7]*y+a[11]*z+a[15];return {x:(cx/cw*.5+.5)*vpWidth,y:(-.5*cy/cw+.5)*vpHeight,visible:cw>0}}
function buildMVP(){const eye=[3+Math.sin(cam.az)*Math.cos(cam.el)*cam.dist,Math.sin(cam.el)*cam.dist+1,Math.cos(cam.az)*Math.cos(cam.el)*cam.dist];mvp=multiply(perspective(Math.PI/3.35,vpWidth/vpHeight,.1,140),lookAt(eye,[3,-1.15,0],[0,1,0]))}
// Camera-space painter rasterizer ensures a self-contained, functional 3D experience even on WebGL-restricted devices.
let lastSoftFrame=0;
function softRender(){
 const ctx=ctx2d; if(!ctx)return;
 ctx.clearRect(0,0,canvas.width,canvas.height);
 const kx=canvas.width/vpWidth,ky=canvas.height/vpHeight;
 const eye=[3+Math.sin(cam.az)*Math.cos(cam.el)*cam.dist,Math.sin(cam.el)*cam.dist+1,Math.cos(cam.az)*Math.cos(cam.el)*cam.dist];
 const faces=[];
 for(let i=0;i<ps.length;i+=9){
   const a=project([ps[i],ps[i+1],ps[i+2]]),b=project([ps[i+3],ps[i+4],ps[i+5]]),c=project([ps[i+6],ps[i+7],ps[i+8]]);
   if(!a.visible||!b.visible||!c.visible)continue;
   if(Math.max(a.x,b.x,c.x)<-30||Math.min(a.x,b.x,c.x)>vpWidth+30||Math.max(a.y,b.y,c.y)<-30||Math.min(a.y,b.y,c.y)>vpHeight+30)continue;
   const mx=(ps[i]+ps[i+3]+ps[i+6])/3,my=(ps[i+1]+ps[i+4]+ps[i+7])/3,mz=(ps[i+2]+ps[i+5]+ps[i+8])/3;
   const depth=(mx-eye[0])**2+(my-eye[1])**2+(mz-eye[2])**2;
   let r=Math.round(cs[i]*255/5)*5,g=Math.round(cs[i+1]*255/5)*5,bl=Math.round(cs[i+2]*255/5)*5;
   faces.push({depth,coords:[a.x*kx,a.y*ky,b.x*kx,b.y*ky,c.x*kx,c.y*ky],color:`rgb(${r},${g},${bl})`});
 }
 faces.sort((a,b)=>b.depth-a.depth);
 for(let t of faces){ctx.beginPath();ctx.moveTo(t.coords[0],t.coords[1]);ctx.lineTo(t.coords[2],t.coords[3]);ctx.lineTo(t.coords[4],t.coords[5]);ctx.closePath();ctx.fillStyle=t.color;ctx.fill()}
 if(evening){ctx.fillStyle="rgba(19,38,68,.39)";ctx.fillRect(0,0,canvas.width,canvas.height)}
}



function zoneModels(now){
box(13.35,.09,.15,7.95,.028,11.8,'#b9d79f');
for(let z of st.zones){
 let sel=z.id===st.zoneSelected;
 box(z.x,.17,z.z,2.28,.025,2.60,z.kind==='park'?'#8bc99a':z.kind==='road'?'#b8c2be':z.kind==='home'?'#d8cba5':'#d6deb5');
 if(z.kind==='road'){box(z.x,.21,z.z,2.3,.03,1.28,'#adb9b2');for(let j=-1;j<=1;j++)box(z.x+j*.6,.25,z.z,.31,.012,.055,'#fff1d0')}
 if(z.kind==='home'){box(z.x,.2,z.z,1.48,1.4,1.35,'#f6e0c8');slopeRoof(z.x,1.62,z.z,1.8,.72,1.6,'#cf8f83');box(z.x,.7,z.z+.71,.45,.53,.03,'#9dc9db');box(z.x-.5,.8,z.z+.71,.26,.36,.03,'#9ecfe0');}
 if(z.kind==='park'){for(let dx of [-.7,.7]){box(z.x+dx,.19,z.z-.83,.5,.10,.19,'#b89873')}box(z.x,.18,z.z,.32,.02,2.5,'#e7d6b3')}
 if(z.kind==='empty'){box(z.x,.18,z.z,1.93,.014,2.18,'#e3e7c4');for(let dx of [-.75,.75]){box(z.x+dx,.22,z.z-.87,.13,.04,.13,'#b6c69e')}}
 if(sel){ring(z.x,.235,z.z,1.06,'#ffdf76');ring(z.x,.238,z.z,1.2,'#4caa7c')}
 }
}


function drawWildlife(now){
 let habitat=wildlifeReport(),grounds=st.lots.filter(l=>l.species&&['healthy','growing'].includes(l.status)&&l.species!=='shrub');
 if(habitat.bird.ready){for(let i=0;i<2;i++){let l=grounds[i%grounds.length];let t=now*(.9+i*.16)+i*2;let x=l.x+.8*Math.cos(t),z=l.z+.8*Math.sin(t),y=2.1+Math.sin(now*2+i)*.23; sphere(x,y,z,.12,'#e2c5a2',3,5);sphere(x+.14,y+.04,z,.06,'#f1d49a',3,5);let wing=Math.sin(now*13+i)*.22;triangle([x,y,z],[x-.24,y+wing,z+.21],[x-.08,y-.08,z+.02],'#cfa577');triangle([x,y,z],[x-.24,y-wing,z-.21],[x-.08,y-.08,z-.02],'#b99073')}}
 if(habitat.butterfly.ready){for(let i=0;i<3;i++){let l=grounds[(i*2)%grounds.length],t=now*1.2+i*2.4,x=l.x+Math.cos(t)*.55,y=1.1+Math.sin(t*2)*.25,z=l.z+Math.sin(t)*.4;let wing=Math.sin(now*15+i)*.20,co=['#f2b5a6','#ffd777','#c8b0f2'][i];sphere(x,y,z,.05,'#6d6854',3,5);triangle([x,y,z],[x-.18,y+.15+wing,z-.1],[x+.12,y+.18+wing,z-.18],co);triangle([x,y,z],[x-.18,y+.15-wing,z+.1],[x+.12,y+.18-wing,z+.18],co)}}
 if(habitat.squirrel.ready){let l=grounds.find(l=>l.age>=3)||grounds[0],x=l.x+.54*Math.sin(now*.75),z=l.z+.65,y=.5; sphere(x,y,z,.23,'#a36a46',3,6,1,.8,1);sphere(x+.25,y+.18,z,.15,'#c48c62',3,6);sphere(x-.3,y+.27,z,.22,'#94593d',3,6);sphere(x-.36,y+.50,z,.18,'#a97652',3,6);sphere(x+.3,y+.34,z-.08,.07,'#80583e',3,6)}
}

function drawNavigationTrail(now){for(const key of ['garden','arbor']){const w=st.workers[key];if(!w.job||w.job.phase!=='walking'||!w.route)continue;
 let from=[w.x,w.z],count=0;for(let i=w.pathIndex;i<w.route.length;i++){const to=w.route[i],dist=Math.hypot(to[0]-from[0],to[1]-from[1]);
 const steps=Math.floor(dist/.52);for(let k=0;k<=steps&&count<65;k++){const t=steps?k/steps:1,x=from[0]+(to[0]-from[0])*t,z=from[1]+(to[1]-from[1])*t;
 sphere(x,.20,z,.072,key==='garden'?'#f8d986':'#a3ecdf',3,6,1,.3,1);count++}
 from=to;if(count>=65)break}
 }}
function buildWorld(now){ps=[];cs=[];mapBase();if(viewMode==='heat')heatLayer();streetGardens(now);campus();hospital();factory();powerPlant();houses();civicDetails(now);zoneModels(now);drawNavigationTrail(now);
for(let l of st.lots){if(['growing','suspect','danger','healthy','dry'].includes(l.status)){let first=ps.length;canopy(l.x,l.z,l.species||'ban',l.age,l.id);let cut=st.jobs.find(j=>j.lot===l.id&&j.type==='remove'&&j.phase==='work');if(cut){let progress=cut.stage>=2?1:cut.stage===1?clamp(1-cut.timer/1.9,0,1):0;let angle=progress*1.45,co=Math.cos(angle),si=Math.sin(angle);for(let i=first;i<ps.length;i+=3){let dx=ps[i]-l.x,dy=ps[i+1];ps[i]=l.x+dx*co+dy*si;ps[i+1]=Math.max(.01,dy*co-dx*si)}}}else if(l.area==='park'||l.area==='buffer'||l.area==='river'||l.area==='power'){box(l.x,.14,l.z,.82,.015,.82,'#9abb85')}let putting=st.jobs.find(j=>j.lot===l.id&&j.type==='plant'&&j.phase==='work');if(putting){let progress=Workflow.progress(putting);
// First dig soil, then lower sapling, water, and finally place mulch.
if(putting.stage>=1)canopy(l.x,l.z,putting.species,0,l.id);
if(putting.stage===0||putting.stage===1){sphere(l.x,.12,l.z,.48,'#ad8a61',3,8,1,.21,1)}
if(putting.stage>=2){for(let i=0;i<5;i++){let a=i*TAU/5;sphere(l.x+Math.cos(a)*.29,.11,l.z+Math.sin(a)*.29,.11,'#9a754e',3,5)}}}siteCircle(l,now)}
for(let i=0;i<3;i++){person(-3.6+i*1.75+Math.sin(now*.45+i)*.3,-.9,'#e1b07e')}
for(let i=0;i<st.zones.filter(z=>z.kind==='home').length;i++){let z=st.zones.filter(z=>z.kind==='home')[i];person(z.x+.65*Math.sin(now*.36+i*1.3),z.z+1.2,'#bba3c8')}
worker('garden',now);worker('arbor',now);drawWildlife(now);
// Riverside greenery and conditional native-urban-wildlife shapes.
for(let i=0;i<9;i++){let x=-8.8+i*2.04;let z=7.72;sphere(x,.26,z,.22,i%2?'#70b673':'#81c080',3,6)}
}
const mapLabels={school:[-6.65,3.9,-5.45],hospital:[6.35,4.6,-5.33],factory:[6.5,4.6,5.1],park:[-4.3,.7,2.2],new:[13.5,1.15,.3]};let lastTags=0;function updateMapLabels(ts){if(ts-lastTags<130)return;lastTags=ts;for(let el of document.querySelectorAll(".mapTag")){let at=mapLabels[el.dataset.p],p=project(at);el.style.left=p.x+"px";el.style.top=p.y+"px";el.style.display=p.visible&&p.x>25&&p.x<vpWidth-25&&p.y>20&&p.y<vpHeight-25?"block":"none"}}
let prev=performance.now();function frame(ts){let dt=Math.min((ts-prev)/1000,.15);prev=ts;resize();buildMVP();updateMapLabels(ts);advanceWorkers(dt);for(const [k,id,statusId] of [['garden','pGarden','gardener'],['arbor','pArbor','arborist']]){
 const w=st.workers[k],j=w.job,bar=$('#'+id),status=$('#'+statusId);
 if(bar)bar.style.width=(!j?0:j.phase==='queued'?5:j.phase==='walking'?Math.round(5+30*(w.pathIndex/Math.max(1,(w.route||[]).length))):Math.round(35+65*Workflow.progress(j)))+'%';
 if(j&&status&&status.textContent!==Workflow.label(j))status.textContent=Workflow.label(j);
 }if(glReady){buildWorld(ts/1000);gl.clear(gl.COLOR_BUFFER_BIT|gl.DEPTH_BUFFER_BIT);gl.useProgram(program);gl.uniformMatrix4fv(uMVP,false,new Float32Array(mvp));gl.uniform1f(uEvening,evening?1:0);gl.bindBuffer(gl.ARRAY_BUFFER,pBuf);gl.bufferData(gl.ARRAY_BUFFER,new Float32Array(ps),gl.DYNAMIC_DRAW);gl.vertexAttribPointer(attrP,3,gl.FLOAT,false,0,0);gl.enableVertexAttribArray(attrP);gl.bindBuffer(gl.ARRAY_BUFFER,cBuf);gl.bufferData(gl.ARRAY_BUFFER,new Float32Array(cs),gl.DYNAMIC_DRAW);gl.vertexAttribPointer(attrC,3,gl.FLOAT,false,0,0);gl.enableVertexAttribArray(attrC);gl.drawArrays(gl.TRIANGLES,0,ps.length/3)}else if(ctx2d&&ts-softLast>145){softLast=ts;buildWorld(ts/1000);softRender()}requestAnimationFrame(frame)}
let pointers=new Map(),initial=null,pinch=0;
canvas.addEventListener('pointerdown',e=>{canvas.setPointerCapture(e.pointerId);pointers.set(e.pointerId,{x:e.clientX,y:e.clientY});initial={x:e.clientX,y:e.clientY,moved:false};pinch=0});
canvas.addEventListener('pointermove',e=>{if(!pointers.has(e.pointerId))return;let v=pointers.get(e.pointerId),dx=e.clientX-v.x,dy=e.clientY-v.y;pointers.set(e.pointerId,{x:e.clientX,y:e.clientY});if(pointers.size>1){let p=[...pointers.values()],dist=Math.hypot(p[0].x-p[1].x,p[0].y-p[1].y);if(pinch)cam.dist=clamp(cam.dist*pinch/dist,18,60);pinch=dist;if(initial)initial.moved=true;return}if(!initial)return;if(Math.hypot(e.clientX-initial.x,e.clientY-initial.y)>7)initial.moved=true;if(initial.moved){cam.az-=dx*.008;cam.el=clamp(cam.el+dy*.006,.26,1.25)}});
function release(e){let old=initial;pointers.delete(e.pointerId);if(!pointers.size){initial=null;pinch=0}if(!old||old.moved||st.phase!=='play')return;let box=canvas.getBoundingClientRect(),x=e.clientX-box.left,y=e.clientY-box.top,near=null,best=52;for(let l of st.lots){let p=project([l.x,.5,l.z]);let d=Math.hypot(x-p.x,y-p.y);if(d<best){best=d;near=l}}let zone=null,zoneBest=47;for(let z of st.zones){let p=project([z.x,.4,z.z]);let d=Math.hypot(x-p.x,y-p.y);if(d<zoneBest){zone=z;zoneBest=d}}if(zone&&(!near||zoneBest<best))selectZone(zone.id);else if(near)selectLot(near.id,true)}
canvas.addEventListener('pointerup',release);canvas.addEventListener('pointercancel',release);canvas.addEventListener('wheel',e=>{e.preventDefault();cam.dist=clamp(cam.dist+(e.deltaY>0?2:-2),18,60)},{passive:false});
$('#zones').addEventListener('click',e=>{let b=e.target.closest('[data-zone]');if(b)selectZone(+b.dataset.zone)});
$('#plots').addEventListener('click',e=>{let b=e.target.closest('[data-lot]');if(b)selectLot(+b.dataset.lot,false)});
$('#selected').addEventListener('change',e=>{if(e.target.id==='speciesSelect'){st.species=e.target.value;updateUI()}});
$('#selected').addEventListener('click',e=>{let build=e.target.closest('[data-build]');if(build){buildZone(build.dataset.build);return}let clear=e.target.closest('[data-clear]');if(clear){clearZone();return}let p=e.target.closest('[data-park]');if(p){let l=plannedLot(st.zones[+p.dataset.park]);if(l)selectLot(l.id,false);return}let b=e.target.closest('[data-action]');if(!b)return;if(b.dataset.action==='suggest'){suggestion(selectedLot());return}schedule(b.dataset.action)});
$('#demo').onclick=()=>{if(st.phase==='win'){message('先重新開一座城市才能進行示範。');return;}
if(st.phase==='intro'){st.phase='play';$('#scrim').classList.add('hidden');}
st.species='crape';selectLot(0,false);let l=st.lots.find(q=>q.id===0);
if(l.status==='empty'&&!l.busy){schedule('plant');message('🧑‍🌾 示範任務開始：園丁走步道、挖土、種九芎、澆水。');}
else message('校園已安排種樹，請挑選其他地點繼續規劃。');};
$('#introDemo').onclick=()=>$('#demo').click();
$('#start').onclick=()=>{st.phase='play';$('#scrim').classList.add('hidden');message('🌿 請先選學校操場旁，選擇九芎，再派園丁種樹。')};$('#guide').onclick=()=>$('#scrim').classList.remove('hidden');$('#restart').onclick=()=>{if(confirm('確定清除目前城市進度，重新開始嗎？'))newGame()};$('#nextDay').onclick=newDay;$('#nextChapter').onclick=advanceChapter;$('#zin').onclick=()=>cam.dist=clamp(cam.dist-3,18,60);$('#zout').onclick=()=>cam.dist=clamp(cam.dist+3,18,60);$('#zreset').onclick=()=>cam={az:.76,el:.71,dist:innerWidth<780?35:30};$('#win').onclick=e=>{if(e.target.closest('#again'))newGame()};
$('#requests').addEventListener('click',e=>{const claim=e.target.closest('[data-claim]'),go=e.target.closest('[data-goto]');if(claim)claimRequest(claim.dataset.claim);else if(go)gotoRequest(go.dataset.goto)});
function setView(mode){viewMode=mode;$('#beautyView').classList.toggle('active',mode==='city');$('#heatView').classList.toggle('active',mode==='heat');$('#heatLegend').hidden=mode!=='heat';message(mode==='heat'?'🌡️ 熱環境圖：橘紅代表相對較熱，種植適合的樹有機會降低熱壓力。':'🌿 已切回城市實景模式。')}
$('#beautyView').onclick=()=>setView('city');$('#heatView').onclick=()=>setView('heat');
$('#nightView').onclick=()=>{evening=!evening;$('#scene').classList.toggle('night',evening);$('#nightView').classList.toggle('active',evening);$('#nightView').textContent=evening?'☀️ 日景':'🌙 夜景';message(evening?'🌙 已切換夜景預覽（不影響遊戲天數）。':'☀️ 已回到日景。')};
// V8 fullscreen controls. iPhone Safari may reject the Fullscreen API for arbitrary
// elements, so the same button keeps a CSS immersive layout as a safe fallback.
const gameArea=$('#gameArea'),fullscreenBtn=$('#fullscreenToggle');
let isImmersive=false;
function setImmersive(enable){
 isImmersive=enable;
 gameArea.classList.toggle('is-immersive',enable);
 document.body.classList.toggle('game-expanded',enable);
 fullscreenBtn.textContent=enable?'⤢ 縮小畫面':'⛶ 全螢幕';
 fullscreenBtn.setAttribute('aria-pressed',String(enable));
 fullscreenBtn.setAttribute('aria-label',enable?'退出全螢幕':'放大全螢幕');
 fullscreenBtn.title=enable?'回到一般網頁畫面':'放大全螢幕';
 resize();
}
fullscreenBtn.addEventListener('click',()=>{
 if(isImmersive){
  if(document.fullscreenElement&&document.exitFullscreen){
   try{const exitResult=document.exitFullscreen();if(exitResult&&exitResult.catch)exitResult.catch(()=>setImmersive(false))}
   catch(e){setImmersive(false)}
  }else setImmersive(false);
  return;
 }
 setImmersive(true);
 if(gameArea.requestFullscreen){
  try{const result=gameArea.requestFullscreen({navigationUI:'hide'});
   if(result&&result.catch)result.catch(()=>{/* Maintain fullscreen-like CSS mode */});
  }catch(e){/* CSS immersive fallback */}
 }
});
document.addEventListener('fullscreenchange',()=>{
 if(document.fullscreenElement===gameArea){if(!isImmersive)setImmersive(true)}
 else if(isImmersive)setImmersive(false);
});
document.addEventListener('keydown',e=>{
 if(e.key==='Escape'&&isImmersive&&!document.fullscreenElement)setImmersive(false);
});
window.addEventListener('resize',resize);
$('#save').onclick=saveGame;$('#load').onclick=loadGame;try{$('#load').disabled=!localStorage.getItem('taiwan-green-city-v7')}catch(e){$('#load').disabled=true}

newGame();const bootWarning=$('#bootWarning');if(bootWarning)bootWarning.remove();requestAnimationFrame(frame);
})();