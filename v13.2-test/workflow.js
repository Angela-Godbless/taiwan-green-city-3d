/** Construction steps are pure data, with deterministic per-frame advancement. */
(function(root,factory){const api=factory();if(typeof module==='object'&&module.exports)module.exports=api;root.GreenCityWorkflow=api;})(typeof window!=='undefined'?window:globalThis,function(){
 'use strict';
 const SEQUENCES={
 plant:[['挖土準備',1.6],['扶正樹苗',1.35],['澆水固定',1.8],['整理植穴',.7]],
 inspect:[['設置安全區',.7],['樹木風險鑑定',1.65],['記錄評估',.65]],
 remove:[['設置安全警戒',.85],['專業安全移除',1.9],['整理現場',1.0]],
 prune:[['確認修枝位置',.8],['專業修枝',1.55],['整理枝條',.8]],
 water:[['裝備準備',.45],['澆水養護',1.65],['檢查土壤',.45]]
 };
 function begin(job){job.phase='work';job.stage=0;job.timer=SEQUENCES[job.type][0][1];job.total=SEQUENCES[job.type].reduce((s,a)=>s+a[1],0);job.elapsed=0;return label(job)}
 function label(job){if(job.phase==='walking')return '沿人行道前往現場';if(job.phase==='queued')return '等候派工';return SEQUENCES[job.type]?.[job.stage]?.[0]||'施工完成'}
 function progress(job){if(job.phase!=='work')return 0;return Math.max(0,Math.min(1,job.elapsed/job.total))}
 function advance(job,seconds){if(job.phase!=='work')return {done:false,changed:false};const sequence=SEQUENCES[job.type];let remain=Math.max(0,seconds),changed=false;
 while(remain>0&&job.stage<sequence.length){let move=Math.min(remain,job.timer);job.timer-=move;job.elapsed+=move;remain-=move;if(job.timer<=.00001){job.stage++;changed=true;if(job.stage>=sequence.length)return {done:true,changed:true};job.timer=sequence[job.stage][1]}}
 return {done:false,changed};}
 return {begin,label,progress,advance,SEQUENCES};
});
