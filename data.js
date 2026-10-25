/* Game constants: a separate, editable source of species, locations and city progression. */
(function(root){'use strict';
const SPE={
crape:{name:'九芎',icon:'🌸',size:2,cost:185,shade:7,eco:8,color:'#65b76f',desc:'臺灣原生中小型喬木；留意冠幅、適度維護。',areas:['school','walk','park','hospital','buffer','river']},
du:{name:'杜英',icon:'🌳',size:2,cost:210,shade:9,eco:8,color:'#398b6c',desc:'臺灣原生樹種；可用於多類綠地，仍要保留樹冠與根部空間。',areas:['school','walk','park','hospital','buffer','river']},
ash:{name:'光蠟樹',icon:'🍃',size:3,cost:250,shade:13,eco:9,color:'#75ba68',desc:'偏大型遮蔭樹；優先放在寬敞綠地，避免狹窄植穴。',areas:['park','buffer','river']},
liquid:{name:'楓香',icon:'🍁',size:3,cost:260,shade:13,eco:9,color:'#6ab37e',desc:'有季節性落葉；適合寬敞空間，步道與排水設施需定期清理。',areas:['park','buffer','river']},
pong:{name:'水黃皮',icon:'🌿',size:2,cost:205,shade:8,eco:9,color:'#4cae83',desc:'林試所資料列為部分濱海區植栽選項；仍應看現地排水與空間。',areas:['park','buffer','river']},
ban:{name:'茄苳',icon:'🌲',size:3,cost:280,shade:16,eco:10,color:'#337e61',desc:'大型樹種，板根與側根成長空間要求高；不適合窄人行道。',areas:['park','buffer','river']},
shrub:{name:'臺灣海桐（低矮綠籬）',icon:'🌱',size:1,cost:120,shade:2,eco:5,color:'#7bbd69',desc:'此處僅示範低矮綠帶的概念，應修剪維持低矮，不等於可直接種在電線下。',areas:['power','buffer','park','hospital','river']}
};
// 空地、樹穴、既有樹與受管制設施；尺寸/距離為遊戲抽象配置，不是施工規格。
const LOTS=[
{id:0,name:'學校操場旁',x:-5.2,z:-3.15,area:'school',width:2.8,chapter:0,detail:'學童常走的區域，需遮蔭、保留通行及活動空間。'},
{id:1,name:'學校大門前',x:-7.0,z:-1.6,area:'blocked',width:0,chapter:0,detail:'重要出入口與人流動線，禁止在此設喬木。'},
{id:2,name:'社區寬人行道',x:-2.2,z:-1.9,area:'walk',width:3.2,chapter:0,detail:'人行道較寬，有規劃樹穴及根部生長空間。'},
{id:3,name:'狹窄人行道',x:-.95,z:-4.25,area:'blocked',width:1.5,chapter:0,detail:'僅 1.5 公尺，示範地圖不允許在此增加樹穴，優先保障無障礙通行。'},
{id:4,name:'公園中央草地',x:-4.0,z:2.0,area:'park',width:5.5,chapter:0,detail:'寬敞開放草地，可規劃大型樹冠和連續土壤。'},
{id:5,name:'公園旁休憩區',x:-7.8,z:1.6,area:'park',width:4.5,chapter:0,detail:'可增加遮蔭和生態棲地，需保留遊憩動線。'},
{id:6,name:'醫院復健花園',x:4.5,z:-3.2,area:'hospital',width:3.0,chapter:1,detail:'病人散步空間，需要安全、舒適且可維護的樹木。'},
{id:7,name:'醫院救護車入口',x:7.5,z:-1.6,area:'blocked',width:0,chapter:1,detail:'救護車緊急通道，不能種樹阻擋。'},
{id:8,name:'工廠邊界綠帶',x:4.9,z:3.5,area:'buffer',width:5.0,chapter:1,detail:'廠區緩衝綠帶，可規劃隔離綠帶及多層次植栽，但不代替污染防治設施。'},
{id:9,name:'工廠消防通道',x:7.5,z:1.7,area:'blocked',width:0,chapter:1,detail:'消防及貨運動線不可阻擋。'},
{id:10,name:'電力走廊綠帶',x:-5.4,z:4.0,area:'power',width:2.7,chapter:2,detail:'架空電線及設備附近，遊戲僅容許規劃低矮植栽；須經電力單位確認。'},
{id:11,name:'變電站維修入口',x:-7.6,z:4.4,area:'blocked',width:0,chapter:2,detail:'維修通道與設施淨空範圍禁止植栽。'},
{id:12,name:'河岸原生綠地',x:1.7,z:6.3,area:'river',width:5.0,chapter:2,detail:'保留排水與防洪設施安全，建立多樣化濱水綠地。'},
{id:13,name:'河岸步道後側',x:4.0,z:5.8,area:'river',width:3.6,chapter:2,detail:'有足夠距離的緩衝地帶，可選適合水文的樹種。'},
{id:14,name:'十字路口轉角',x:1.9,z:1.25,area:'blocked',width:0,chapter:2,detail:'路口視距與行人穿越安全優先，不要擋住視線。'},
{id:15,name:'社區巷口綠地',x:-1.8,z:5.0,area:'walk',width:2.7,chapter:2,detail:'小型綠帶可栽種中小型樹，保留排水與管線空間。'},
{id:16,name:'公園既有老樹',x:-2.2,z:3.65,area:'park',width:6,chapter:0,detail:'既有成熟樹，葉片與結構需專業判斷；不可只因老樹就移除。',initial:'suspect',species:'ban'},
{id:17,name:'廠區傾斜危木',x:8.4,z:3.45,area:'buffer',width:4.8,chapter:1,detail:'主幹明顯裂傷且傾斜，先由樹藝師做現場風險鑑定。',initial:'suspect',diagnosis:'danger',species:'ash'}
];

const ZONE_TEMPLATE=Array.from({length:12},(_,i)=>({id:i,col:i%3,row:Math.floor(i/3),x:10.8+(i%3)*2.55,z:-4.5+Math.floor(i/3)*3.0,kind:i===3?'road':'empty'}));
const BUILD={road:{name:'道路',icon:'🛣️',cost:85},park:{name:'公園',icon:'🌳',cost:175},home:{name:'住宅',icon:'🏠',cost:255}};

const CHAPTERS=[
{name:'第一章｜生活圈綠蔭',desc:'校園、社區人行道與公園的適地適樹',goals:[['school','校園有一處安全綠化'],['walk','寬人行道有適當植栽'],['park','公園至少有一棵新植樹']]},
{name:'第二章｜城市機能',desc:'醫院舒適動線及工業邊界綠帶',goals:[['hospital','改善醫院休憩區'],['buffer','工廠緩衝綠帶完成'],['safety','確認危木後由專業人員處置']]},
{name:'第三章｜水電與生態',desc:'電力設施留淨空、河岸綠地增生態',goals:[['power','電力區完成安全的低矮綠帶'],['river','河岸至少一處成功植栽']]}
];

root.GreenCityData={SPE,LOTS,ZONE_TEMPLATE,BUILD,CHAPTERS};
})(typeof window!=='undefined'?window:globalThis);
