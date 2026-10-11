export const VERSION='2.1.0';
export const clamp=(v,a,b)=>Math.max(a,Math.min(b,v));
export const WEAPONS=[
 {name:'RIFT RIFLE',label:'アサルト',mag:32,delay:.09,damage:22,range:160,reload:1.2,spread:.008,color:'#66ecff'},
 {name:'BREACH',label:'ショットガン',mag:8,delay:.5,damage:15,range:42,reload:1.5,spread:.085,pellets:8,color:'#d39cff'},
 {name:'HAVOC',label:'ロケット',mag:3,delay:.8,damage:110,range:180,reload:1.9,spread:0,rocket:true,color:'#ffba58'},
 {name:'LONGSHOT',label:'スナイパー',mag:5,delay:.8,damage:85,range:220,reload:1.6,spread:.001,color:'#ff7997'},
 {name:'SWARM',label:'サブマシンガン',mag:45,delay:.055,damage:13,range:85,reload:1.05,spread:.022,color:'#b5ff73'},
 {name:'NOVA',label:'エネルギー銃',mag:18,delay:.22,damage:38,range:140,reload:1.3,spread:.004,color:'#ffe869'}
];
export const GADGETS=['grenade','shockwave','haste','pad','grapple'];
export const ITEMS={shield:{label:'シールド',color:'#5ce5ff'},medkit:{label:'メディキット',color:'#80ff9b'},mats:{label:'建築資材',color:'#ffd497'},grenade:{label:'グレネード',color:'#ffbc62'},shockwave:{label:'ショックウェーブ',color:'#cc86ff'},haste:{label:'スピードブースト',color:'#e1ff66'},pad:{label:'ジャンプパッド',color:'#78ffc2'},grapple:{label:'グラップラー',color:'#ff8ba6'}};
export const SPEED=14,SPRINT=23,GRAVITY=20,MAX_PLAYERS=12;
export function direction(yaw,pitch=0){return[-Math.sin(yaw)*Math.cos(pitch),Math.sin(pitch),-Math.cos(yaw)*Math.cos(pitch)];}
export function rayBox(origin,d,o){let lo=0,hi=999;for(let i=0;i<3;i++){let mid=[o.x,o.y,o.z][i],half=[o.sx,o.sy,o.sz][i]/2;if(Math.abs(d[i])<1e-7){if(origin[i]<mid-half||origin[i]>mid+half)return Infinity;continue;}let a=(mid-half-origin[i])/d[i],b=(mid+half-origin[i])/d[i];if(a>b)[a,b]=[b,a];lo=Math.max(lo,a);hi=Math.min(hi,b);if(lo>hi)return Infinity;}return lo;}
export function generateWorld(){let seed=731092;const random=()=>{seed=(seed*1664525+1013904223)>>>0;return seed/4294967296;},rnd=(a,b)=>a+random()*(b-a);let props=[],solid=[],loot=[];
 const add=(x,y,z,sx,sy,sz,c,shape='box',collision=false,r=0)=>{let o={x,y,z,sx,sy,sz,c,shape,r};props.push(o);if(collision)solid.push(o);return o;};
 // Curated island: bright grass, sandy coast, plaza, houses, towers, and forest.
 add(0,-1.8,0,500,2,500,[.08,.54,.78]);add(0,-.45,0,198,.7,198,[.89,.8,.49]);
 for(let x=-90;x<90;x+=15)for(let z=-90;z<90;z+=15)add(x+7.5,-.2,z+7.5,15,.4,15,[rnd(.27,.34),rnd(.64,.73),rnd(.2,.29)]);
 add(0,.025,0,22,.05,170,[.62,.65,.58]);add(0,.03,0,170,.06,14,[.62,.65,.58]);
 for(let z=-78;z<85;z+=12)add(0,.08,z,.2,.08,4,[.95,.89,.64]);
 const house=(x,z,c,roof)=>{
 add(x-5,2.5,z,1,5,10,c,'box',true);add(x+5,2.5,z,1,5,10,c,'box',true);add(x,2.5,z-5,9,5,1,c,'box',true);add(x-3.3,2.5,z+5,2.4,5,1,c,'box',true);add(x+3.3,2.5,z+5,2.4,5,1,c,'box',true);add(x,4.3,z+5,4.2,1.4,1,c,'box',true);add(x,5.2,z,12,.4,12,[.94,.92,.84],'box',true);add(x,7,z,13,3.5,13,roof,'roof');add(x,1.8,z-4.42,2.7,2.1,.06,[.18,.61,.83]);
 for(let side of [-1,1]){add(x+side*5.53,2.8,z, .08,2.4,3,[.94,.91,.76]);add(x+side*5.6,2.8,z,.09,1.9,2.5,[.15,.55,.76]);add(x+side*5.66,2.8,z,.1,.08,2.6,[.94,.91,.76]);}
 add(x,0.2,z+7,6,.4,3,[.94,.89,.7]);add(x+2.5,7.5,z-2,1.1,3.5,1.1,[.82,.66,.49],'box',true);loot.push({id:'L'+loot.length,x,z:z+2,type:'shield',active:true,respawn:0});
 };
 const villages=[[-38,-34,[.93,.63,.37],[.51,.24,.42]],[36,-36,[.4,.74,.88],[.15,.32,.59]],[-38,36,[.8,.44,.66],[.34,.23,.46]],[40,36,[.93,.84,.47],[.55,.26,.16]]];for(let [x,z,c,r] of villages){house(x,z,c,r);house(x+15,z-16,c.map(v=>v*.91),r);add(x+10,1,z+12,4,2,3,[.65,.45,.28],'box',true);}
 // Sci-fi tower at the central plaza, open approaches.
 add(0,.15,-8,23,.3,23,[.84,.86,.76]);for(let [x,z]of [[-8,-16],[8,-16],[-8,0],[8,0]]){add(x,5,z,2.2,10,2.2,[.87,.87,.76],'box',true);add(x,10.4,z,3.3,.8,3.3,[.19,.3,.41]);}add(0,10,-8,20,1,20,[.21,.31,.45],'box',true);add(0,12,-8,4,3,4,[.31,.86,.96],'crystal');add(0,14.5,-8,2.4,2.4,2.4,[.54,.97,1],'crystal');
 for(let i=0;i<95;i++){let x=rnd(-86,86),z=rnd(-86,86);if(Math.abs(x)<15||Math.abs(z)<10||solid.some(o=>Math.abs(x-o.x)<o.sx/2+7&&Math.abs(z-o.z)<o.sz/2+7))continue;let h=rnd(4.5,7);add(x,h/2,z,.65,h,.65,[.47,.27,.12],'cylinder',true);add(x,h,z,rnd(6,9),rnd(5,7),rnd(6,9),[rnd(.18,.25),rnd(.55,.69),.17],'sphere');add(x-2,h+1,z+1,4,4,4,[.36,.74,.2],'sphere');}
 for(let i=0;i<28;i++){let x=rnd(-83,83),z=rnd(-83,83);if(Math.abs(x)<15||Math.abs(z)<10||solid.some(o=>Math.abs(x-o.x)<o.sx/2+3&&Math.abs(z-o.z)<o.sz/2+3))continue;add(x,1,z,rnd(2,4),2,rnd(2,4),[.47,.57,.61],'sphere',true);}
 for(let i=0;i<22;i++){let a=i/22*6.283,r=rnd(145,185),h=rnd(30,65);add(Math.sin(a)*r,h/2-6,Math.cos(a)*r,50,h,50,[.26,.55,.46],'mountain');}
 for(let i=0;i<28;i++){let x=rnd(-75,75),z=rnd(-75,75);if(solid.some(o=>Math.abs(x-o.x)<o.sx/2+2&&Math.abs(z-o.z)<o.sz/2+2)){i--;continue;}let types=Object.keys(ITEMS);loot.push({id:'L'+loot.length,x,z,type:i<6?'weapon'+i:types[i%types.length],active:true,respawn:0});}
 for(let z=-60;z<=60;z+=30){add(-11,2.6,z,.25,5.2,.25,[.18,.27,.3],'cylinder',true);add(-10.2,5.3,z,1.8,.15,.5,[.96,.89,.62]);}
 return{props,solid,loot};
}
export const WORLD=generateWorld();
export function collisionBoxes(obstacles){let out=[];for(let o of obstacles){out.push(o);if(o.kind==='ramp'&&!o.dead){out.push({...o,y:o.y+.95,sy:.6,sx:o.sx*.7,sz:o.sz*.7,source:o});out.push({...o,y:o.y+1.55,sy:.6,sx:o.sx*.4,sz:o.sz*.4,source:o});}}return out;}
export function collides(p,x,z,obstacles=WORLD.solid){return collisionBoxes(obstacles).some(o=>!o.dead&&p.y-1.7<o.y+o.sy/2-.05&&p.y+.1>o.y-o.sy/2&&Math.abs(x-o.x)<o.sx/2+.4&&Math.abs(z-o.z)<o.sz/2+.4);}
export function movePlayer(p,input,dt,obstacles=WORLD.solid){if(p.dead)return;let f=clamp(input.f||0,-1,1),s=clamp(input.s||0,-1,1),len=Math.max(1,Math.hypot(f,s)),speed=(input.sprint?SPRINT:SPEED)*(p.haste>0?1.5:1),d=direction(input.yaw||0),right=[Math.cos(input.yaw||0),0,-Math.sin(input.yaw||0)],dx=(d[0]*f+right[0]*s)/len*speed*dt,dz=(d[2]*f+right[2]*s)/len*speed*dt;
 if(!collides(p,p.x+dx,p.z,obstacles))p.x=clamp(p.x+dx,-94,94);if(!collides(p,p.x,p.z+dz,obstacles))p.z=clamp(p.z+dz,-94,94);
 let feet=p.y-1.7;p.vy=(p.vy||0)-GRAVITY*dt;p.y+=p.vy*dt;p.grounded=false;if(p.vy<0)for(let o of collisionBoxes(obstacles)){let top=o.y+o.sy/2;if(!o.dead&&feet>=top-.07&&p.y-1.7<=top&&Math.abs(p.x-o.x)<o.sx/2+.2&&Math.abs(p.z-o.z)<o.sz/2+.2){p.y=top+1.7;p.vy=0;p.grounded=true;}}if(p.y<=1.7){p.y=1.7;p.vy=0;p.grounded=true;}
 p.yaw=input.yaw||0;p.pitch=clamp(input.pitch||0,-1.4,1.4);
}
