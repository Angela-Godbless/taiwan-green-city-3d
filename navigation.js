/** Public-path navigation for the fictional town. Educational approximation, not a GIS or accessibility survey. */
(function(root,factory){const api=factory();if(typeof module==='object'&&module.exports)module.exports=api;root.GreenCityNavigation=api;})(typeof window!=='undefined'?window:globalThis,function(){
 'use strict';
 const STEP=.5;
 const H=[{z:-1.5,min:-9,max:16},{z:1.5,min:-9,max:16},{z:3,min:-8,max:-2},{z:6,min:-9,max:16},
 {z:-4.5,min:10,max:16},{z:4.5,min:10,max:16}];
 const V=[{x:-8,min:-1.5,max:3},{x:-5,min:-1.5,max:3},{x:-1,min:-7,max:6},
 {x:0,min:-7,max:7},{x:3.5,min:-6,max:6},{x:7.5,min:-6,max:6},
 {x:10,min:-6,max:6},{x:12.5,min:-4.5,max:4.5},{x:15,min:-4.5,max:4.5}];
 const nodes=new Map(),id=(x,z)=>`${Math.round(x*2)},${Math.round(z*2)}`;
 function add(x,z){let key=id(x,z);if(!nodes.has(key))nodes.set(key,{x,z,key,adj:new Set()});return nodes.get(key)}
 function link(a,b){a.adj.add(b.key);b.adj.add(a.key)}
 for(const h of H){let prev=null;for(let x=h.min;x<=h.max+.001;x+=STEP){let n=add(x,h.z);if(prev)link(prev,n);prev=n}}
 for(const v of V){let prev=null;for(let z=v.min;z<=v.max+.001;z+=STEP){let n=add(v.x,z);if(prev)link(prev,n);prev=n}}
 const all=[...nodes.values()];
 function nearest(p){let best=null,cost=Infinity;for(const n of all){let c=Math.hypot(n.x-p[0],n.z-p[1]);if(c<cost){cost=c;best=n}}return best}
 function distance(a,b){return Math.hypot(a.x-b.x,a.z-b.z)}
 function aStar(start,end){const g=new Map([[start.key,0]]),parent=new Map(),open=new Set([start.key]),closed=new Set();
 while(open.size){let current=null,best=Infinity;for(const k of open){const n=nodes.get(k),score=(g.get(k)||0)+Math.abs(n.x-end.x)+Math.abs(n.z-end.z);if(score<best){best=score;current=n}}
 if(current.key===end.key){let path=[current];while(parent.has(current.key)){current=nodes.get(parent.get(current.key));path.push(current)}return path.reverse()}
 open.delete(current.key);closed.add(current.key);for(const key of current.adj){if(closed.has(key))continue;let nxt=nodes.get(key),newScore=g.get(current.key)+distance(current,nxt);if(newScore<(g.get(key)??Infinity)){g.set(key,newScore);parent.set(key,current.key);open.add(key)}}}
 return []}
 function smooth(points){const result=[];for(const pt of points){let p=[pt[0],pt[1]],len=result.length;if(len>1){let a=result[len-2],b=result[len-1],v1=[b[0]-a[0],b[1]-a[1]],v2=[p[0]-b[0],p[1]-b[1]];if(Math.abs(v1[0]*v2[1]-v1[1]*v2[0])<.0001&&v1[0]*v2[0]+v1[1]*v2[1]>0){result[len-1]=p;continue}}result.push(p)}return result}
 function route(start,goal){const a=nearest(start),b=nearest(goal);if(!a||!b)return [goal.slice()];const path=aStar(a,b);if(!path.length)return [goal.slice()];let points=[start.slice(),...path.map(n=>[n.x,n.z]),goal.slice()];return smooth(points).filter((v,i,arr)=>i===0||Math.hypot(v[0]-arr[i-1][0],v[1]-arr[i-1][1])>.01)}
 return {route,nearest,findPath:aStar,graphSize:nodes.size};
});
