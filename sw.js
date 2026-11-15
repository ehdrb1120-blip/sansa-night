// 산사 밤마실 서비스 워커: 홈 화면 앱으로 설치되게 하고, 화면 틀은 미리 담아 둔다.
// 소리 파일(mix/)은 크고 부분 요청을 쓰므로 손대지 않고 그대로 인터넷에서 받는다.
const V='sansa-v1',SHELL=['./','index.html','map-data.js','manifest.webmanifest','icons/icon-192.png','icons/icon-512.png','icons/apple-touch-icon.png'];
self.addEventListener('install',e=>{e.waitUntil(caches.open(V).then(c=>c.addAll(SHELL)).then(()=>self.skipWaiting()))});
self.addEventListener('activate',e=>{e.waitUntil(caches.keys().then(ks=>Promise.all(ks.filter(k=>k!==V).map(k=>caches.delete(k)))).then(()=>self.clients.claim()))});
self.addEventListener('fetch',e=>{const r=e.request,u=new URL(r.url);
  if(r.method!=='GET'||u.origin!==location.origin||u.pathname.includes('/mix/')||u.pathname.includes('/sound/'))return;
  if(r.mode==='navigate'||u.pathname.endsWith('.html')||u.pathname.endsWith('.js')){ // 새 버전을 먼저, 안 되면 담아 둔 것
    e.respondWith(fetch(r).then(res=>{const c=res.clone();caches.open(V).then(x=>x.put(r,c));return res}).catch(()=>caches.match(r).then(m=>m||caches.match('index.html'))));return}
  if(u.pathname.includes('/photos/')||u.pathname.includes('/icons/')){ // 사진은 한 번 받으면 담아 두고 쓴다
    e.respondWith(caches.match(r).then(m=>m||fetch(r).then(res=>{if(res.ok){const c=res.clone();caches.open(V).then(x=>x.put(r,c))}return res})))}});
