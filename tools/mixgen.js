// 절마다 '밤소리' 한 벌을 미리 섞어 파일로 만든다 (화면이 꺼져도 이어지게 하려고, 실시간 합성 대신 완성된 파일을 튼다)
// 사용: node mixgen.js <index.html> <raw폴더> <출력폴더> [gain] [minutes]
const fs=require('fs'),path=require('path');
const [, , HTML, RAW, OUT, GAINs, MINs]=process.argv;const GAIN=+GAINs||1,MIN=+MINs||20;
const html=fs.readFileSync(HTML,'utf8');
const grab=(start,end)=>{const i=html.indexOf(start),j=html.indexOf(end,i);return html.slice(i,j+end.length)};
const T=eval(grab('const T=[','\n];').replace('const T=',''));
const TOUR=eval('('+grab('const TOUR={','\n};').replace('const TOUR=','').replace(/;$/,'')+')');
const SR=24000,cache={};
const load=n=>cache[n]||(cache[n]=new Float32Array(fs.readFileSync(path.join(RAW,n+'.f32')).buffer.slice(0)));
const BASE={moktak:30,bell:35},NATURE=['wave','stream','rain','wind','bug'],TEMPLE=['moktak','bell','chime','yebul'];
function effMix(t){const m=Object.assign({},BASE,t.mix,{bug:0}),st=TOUR[t.id]&&TOUR[t.id][0];if(st)Object.assign(m,st[3]);
  const top=l=>l.reduce((b,k)=>(m[k]||0)>(m[b]||0)?k:b,l[0]),keep=[top(NATURE),top(TEMPLE)];for(const k in m)if(!keep.includes(k))m[k]=0;return m}
const FAR={wave:[800,.05,.17],stream:[1000,.05,.16],rain:[1300,.05,.17],wind:[900,.05,.18],bug:[2200,.03,.1],moktak:[2600,.04,.13],bell:[2200,.05,.15],chime:[4200,.03,.1],yebul:[2600,.04,.13]};
const gainOf=(k,v)=>v>0?FAR[k][1]+(FAR[k][2]-FAR[k][1])*Math.min(100,v)/100:0;
const ACC={bell:{i:.3,h:[6,7.5],o:4,gap:[12,24],clips:['bell1','bell2','bell3']},moktak:{i:.3,h:[8,9.5],o:2,gap:[12,24],clips:['moktak1']},
  chime:{i:3,h:[8,12],o:5,gap:[18,36]},yebul:{i:4,h:[12,16],o:6,gap:[18,36]},nature:{i:7,h:[14,20],o:9,gap:[18,36]}};
// 절마다 다른 바탕: under=바람 아래 아주 멀리 계속 깔리는 그 절의 물소리(계곡·바다·비), wind=바람 세기 배율, lp=바람 먹먹함(낮을수록 깊은 산), bird=밤새
const PLACE={tongdosa:{under:'stream',wind:.9,lp:0,bird:1},unmunsa:{under:'rain',wind:.8,lp:-60,bird:1},naksansa:{under:'wave',wind:.9,lp:60,bird:0},
  buseoksa:{wind:1.15,lp:-80,bird:1},bulguksa:{wind:1,lp:0,bird:1},sangwonsa:{under:'stream',wind:.85,lp:-40,bird:1},hoeamsa:{wind:1.1,lp:40,bird:1},
  bunhwangsa:{under:'rain',wind:.85,lp:20,bird:0},bongjeongam:{wind:1.3,lp:-120,bird:1},jeongamsa:{under:'stream',wind:.9,lp:-60,bird:1},
  beopheungsa:{wind:1.05,lp:-100,bird:1},boriam:{under:'wave',wind:1,lp:0,bird:1},bomunsa:{under:'wave',wind:.85,lp:40,bird:0},
  hyangiram:{under:'wave',wind:.8,lp:80,bird:0},gatbawi:{wind:1.25,lp:-60,bird:1}};
const UNDER={stream:[650,.030],wave:[520,.042],rain:[900,.030]}; // [먹먹함 Hz, 세기]
function lpCoef(fc,Q){const w=2*Math.PI*fc/SR,a=Math.sin(w)/(2*Q),c=Math.cos(w),a0=1+a;return [(1-c)/2/a0,(1-c)/a0,(1-c)/2/a0,-2*c/a0,(1-a)/a0]}
function seedRng(str){let h=1779033703^str.length;for(const ch of str)h=Math.imul(h^ch.charCodeAt(0),3432918353),h=h<<13|h>>>19;
  return ()=>{h=Math.imul(h^h>>>16,2246822507);h=Math.imul(h^h>>>13,3266489909);h^=h>>>16;return (h>>>0)/4294967296}}
function render(t){
  const PL=PLACE[t.id]||{wind:1,lp:0},R=seedRng(t.id),rnd=(a,b)=>a+R()*(b-a),D=MIN*60,X=6,N=Math.round((D+X)*SR),out=new Float32Array(N),m=effMix(t);
  // 바람 바탕: 녹음을 끊김 없이 돌리고, 1.4~2.4초마다 세기를 바꾸며(가끔만 살짝 셈) 먹먹함도 함께 바꾼다
  const ws=load('wind'),XL=2*SR,L=ws.length-XL,loop=new Float32Array(L);
  for(let i=0;i<L;i++)loop[i]=i<XL?ws[i]*Math.sin(i/XL*Math.PI/2)+ws[L+i]*Math.cos(i/XL*Math.PI/2):ws[i];
  const pts=[[0,0],[1.5,.034]];let bt=1.5,bv=.034,up=false;
  while(bt<D+X+5){const d=rnd(1.4,2.4);let v;if(!up&&R()<.13){v=rnd(.054,.066);up=true}else{up=false;do{v=rnd(.026,.043)}while(Math.abs(v-bv)<.004)}bt+=d;bv=v;pts.push([bt,v])}
  let pi=0,z1=0,z2=0,cf=lpCoef(760,.5),off=Math.floor(R()*L);
  for(let n=0;n<N;n++){const tt=n/SR;while(pts[pi+1][0]<tt)pi++;const [t0,v0]=pts[pi],[t1,v1]=pts[pi+1],v=v0+(v1-v0)*(tt-t0)/(t1-t0);
    if(!(n&63))cf=lpCoef(Math.max(300,(tt<1.5?760:560+v*6000)+PL.lp),.5);const x=loop[(n+off)%L],y=cf[0]*x+z1;z1=cf[1]*x-cf[3]*y+z2;z2=cf[2]*x-cf[4]*y;out[n]+=y*v*PL.wind}
  // 이따금 들리는 소리: 한 번에 하나씩, 종·목탁은 두 배로 자주
  const p=[];for(const k of NATURE)if(k!=='wind'&&m[k]>0)p.push(k);for(const k of TEMPLE)if(m[k]>0)p.push(k);for(const k of ['bell','moktak'])if(!p.includes(k))p.push(k);
  const bag=[];p.forEach(k=>{bag.push(k);if(k==='bell'||k==='moktak')bag.push(k)});
  let at=9.15,last='',ev=0;const busy=[];
  while(at<D-40){let k=bag[R()*bag.length|0];if(k===last){const o=bag.filter(x=>x!==k);if(o.length)k=o[R()*o.length|0]}last=k;
    const c=ACC[k]||ACC.nature,file=c.clips?c.clips[R()*c.clips.length|0]:k,src=load(file),pk=gainOf(k,m[k]||40)*.8,hold=rnd(c.h[0],c.h[1]),total=c.i+hold+c.o;
    const len=Math.round(total*SR),s0=c.clips?0:Math.floor(R()*Math.max(1,src.length-len)),b=lpCoef(FAR[k][0],.5);let y1=0,y2=0;
    for(let j=0;j<len;j++){const tt=j/SR,e=tt<c.i?tt/c.i:tt<c.i+hold?1:Math.max(0,1-(tt-c.i-hold)/c.o),x=src[(s0+j)%src.length]||0;
      const y=b[0]*x+y1;y1=b[1]*x-b[3]*y+y2;y2=b[2]*x-b[4]*y;const n=Math.round(at*SR)+j;if(n<N)out[n]+=y*e*pk}
    if(k==='bell'||k==='moktak')busy.push([at,at+total]);ev++;at+=total+rnd(c.gap[0],c.gap[1])+.15}
  // 그 절의 물소리를 바람 아래 아주 멀리, 쉬지 않고 깔아 둔다. 세기는 20~40초에 걸쳐 천천히만 오르내린다
  if(PL.under){const us=load(PL.under),[uf,ul]=UNDER[PL.under],b=lpCoef(uf,.5);let y1=0,y2=0,o=Math.floor(R()*us.length),seg=[[0,0],[3,ul]];let ut=3;
    while(ut<D+X+40){ut+=rnd(20,40);seg.push([ut,ul*rnd(.7,1.15)])}let si=0;
    for(let n=0;n<N;n++){const tt=n/SR;while(seg[si+1][0]<tt)si++;const [a0,g0]=seg[si],[a1,g1]=seg[si+1],g=g0+(g1-g0)*(tt-a0)/(a1-a0);
      const x=us[(o+n)%us.length],y=b[0]*x+y1;y1=b[1]*x-b[3]*y+y2;y2=b[2]*x-b[4]*y;out[n]+=y*g}}
  // 산속 절의 밤새: 6~7초마다 작게 한 번씩. 몇 분 울다가 잠깐 쉬고, 목탁·범종이 울릴 때는 비킨다
  let birds=0;if(PL.bird){const clips=['owl1','owl2','owl3','owl4','owl5'];let bt2=rnd(4,8),stopAt=bt2+rnd(120,260);
    while(bt2<D-10){if(bt2>stopAt){bt2+=rnd(30,70);stopAt=bt2+rnd(120,260);continue}
      if(!busy.some(([a,b])=>bt2>a-1&&bt2<b+1)){const src=load(clips[R()*clips.length|0]),g=.032*rnd(.75,1.1),s0=Math.round(bt2*SR),bb=lpCoef(2400,.5);let y1=0,y2=0;
        for(let j=0;j<src.length;j++){const x=src[j],y=bb[0]*x+y1;y1=bb[1]*x-bb[3]*y+y2;y2=bb[2]*x-bb[4]*y;if(s0+j<N)out[s0+j]+=y*g}birds++}
      bt2+=rnd(6,7)}}
  // 끝과 처음을 6초 겹쳐 이어, 반복 재생할 때 이음매가 들리지 않게
  const DS=D*SR,XS=X*SR,fin=new Float32Array(DS);
  for(let n=0;n<DS;n++)fin[n]=n<XS?out[n]*Math.sin(n/XS*Math.PI/2)+out[DS+n]*Math.cos(n/XS*Math.PI/2):out[n];
  let pk=0,ss=0;for(let n=0;n<DS;n++){fin[n]*=GAIN;const a=Math.abs(fin[n]);if(a>pk)pk=a;ss+=fin[n]*fin[n]}
  for(let n=0;n<DS;n++){const a=fin[n];if(Math.abs(a)>.9)fin[n]=Math.sign(a)*(.9+.09*Math.tanh((Math.abs(a)-.9)/.09))}
  return {fin,pk,rms:Math.sqrt(ss/DS),ev,pool:p.join(',')+(PL.under?' +'+PL.under:'')+(birds?' 새'+birds:'')}}
fs.mkdirSync(OUT,{recursive:true});
for(const t of T){const r=render(t);fs.writeFileSync(path.join(OUT,t.id+'.f32'),Buffer.from(r.fin.buffer));
  console.log(t.id.padEnd(12),'peak',(20*Math.log10(r.pk)).toFixed(1),'dB rms',(20*Math.log10(r.rms)).toFixed(1),'dB events',r.ev,r.pool)}
