const q=(s,c=document)=>c.querySelector(s),qa=(s,c=document)=>[...c.querySelectorAll(s)];
const reduceMotion=matchMedia('(prefers-reduced-motion: reduce)').matches;
const finePointer=matchMedia('(hover:hover) and (pointer:fine)').matches;
const sleep=ms=>new Promise(r=>setTimeout(r,ms));

const motionStyle=document.createElement('style');
motionStyle.textContent=`.page-veil{display:grid;place-items:center;color:white}.page-veil .transition-mark{opacity:0;transform:translateY(18px) scale(.94);transition:.35s .12s cubic-bezier(.2,.8,.2,1);text-align:center;font-weight:900}.page-veil .transition-mark .dot{width:48px;height:48px;border-radius:50%;margin:0 auto 12px;background:#dfff4f;box-shadow:inset 0 0 0 9px #f1ffa2,0 0 45px rgba(223,255,79,.32);animation:transitionPulse .8s ease-in-out infinite alternate}body.page-leaving .page-veil .transition-mark{opacity:1;transform:none}body.page-entering main,body.page-entering .page-hero,body.page-entering .hero{animation:pageIn .6s cubic-bezier(.2,.8,.2,1) both}.btn.is-pressing,.filter.is-pressing{transform:scale(.955)!important}.btn-loader{width:14px;height:14px;border:2px solid currentColor;border-right-color:transparent;border-radius:50%;display:inline-block;animation:spin .65s linear infinite}.media-switcher{display:flex;gap:10px;justify-content:center;margin-top:14px;flex-wrap:wrap}.media-thumb{width:66px;height:66px;border-radius:16px;border:1px solid rgba(11,75,48,.12);background:#f2f7f3;display:grid;place-items:center;cursor:pointer;transition:.3s}.media-thumb.active{border-color:#087a4b;box-shadow:0 0 0 3px rgba(8,122,75,.1)}.media-thumb:before{content:"";width:23px;height:32px;border-radius:10px;background:#17211c;border:2px solid var(--thumb-accent,#dfff4f);transform:rotate(var(--thumb-rot,-7deg))}@keyframes pageIn{from{opacity:0;transform:translateY(16px);filter:blur(5px)}to{opacity:1;transform:none;filter:none}}@keyframes transitionPulse{to{transform:scale(1.08)}}@keyframes spin{to{transform:rotate(360deg)}}`;
document.head.appendChild(motionStyle);

if(!q('.footer')){
  const f=document.createElement('footer');
  f.className='footer';
  f.innerHTML='<div class="container footer-grid"><div><div class="logo"><span class="logo-mark"></span><span>ChoVot Pickleball</span></div><p style="color:#9fb4a7;max-width:330px">Chợ đăng tin vợt pickleball với người bán được xác thực và thông tin cây vợt rõ ràng.</p></div><div><h4>Chợ vợt</h4><a href="mua-vot.html">Tìm vợt</a><a href="ban-vot.html">Đăng bán</a><a href="dinh-gia.html">Định giá</a></div><div><h4>An toàn</h4><a href="xac-thuc.html">Xác thực người bán</a><a href="an-toan-giao-dich.html">An toàn giao dịch</a><a href="quy-che-hoat-dong.html">Quy chế hoạt động</a></div><div><h4>Pháp lý</h4><a href="dieu-khoan.html">Điều khoản</a><a href="chinh-sach-rieng-tu.html">Chính sách riêng tư</a></div></div>';
  document.body.insertBefore(f,q('script[src="assets/app.js"]')||null);
}

if(!q('.mobile-bottom')){
  const n=document.createElement('nav');
  n.className='mobile-bottom';
  n.innerHTML='<a href="index.html"><b>⌂</b>Trang chủ</a><a href="mua-vot.html"><b>⌕</b>Tìm vợt</a><a class="sell" href="ban-vot.html"><b>＋</b>Đăng bán</a><a href="tin-nhan.html"><b>✉</b>Tin nhắn</a><a href="xac-thuc.html"><b>◉</b>Tôi</a>';
  document.body.appendChild(n);
}

const progress=document.createElement('div');progress.className='scroll-progress';document.body.appendChild(progress);
const veil=document.createElement('div');veil.className='page-veil';veil.innerHTML='<div class="transition-mark"><div class="dot"></div><div>ChoVot Pickleball</div></div>';document.body.appendChild(veil);
document.body.classList.add('page-entering');setTimeout(()=>document.body.classList.remove('page-entering'),700);

let lastY=scrollY;const header=q('.header');
addEventListener('scroll',()=>{const y=scrollY,max=Math.max(1,document.documentElement.scrollHeight-innerHeight);progress.style.transform=`scaleX(${Math.min(1,y/max)})`;header?.classList.toggle('scrolled',y>12);if(y>120&&y>lastY+8)header?.classList.add('header-hidden');if(y<lastY-8||y<80)header?.classList.remove('header-hidden');lastY=y},{passive:true});
if(finePointer&&!reduceMotion)addEventListener('pointermove',e=>{document.documentElement.style.setProperty('--mx',e.clientX+'px');document.documentElement.style.setProperty('--my',e.clientY+'px')},{passive:true});

const mt=q('.mobile-toggle'),nav=q('.navlinks');
if(mt&&!mt.getAttribute('aria-label'))mt.setAttribute('aria-label','Mở menu');
mt?.addEventListener('click',e=>{e.stopPropagation();nav?.classList.toggle('mobile-open');mt.textContent=nav?.classList.contains('mobile-open')?'×':'☰'});
document.addEventListener('click',e=>{if(nav?.classList.contains('mobile-open')&&!nav.contains(e.target)&&e.target!==mt){nav.classList.remove('mobile-open');mt.textContent='☰'}});

const current=(location.pathname.split('/').pop()||'index.html').toLowerCase();
qa('.mobile-bottom a').forEach(a=>{if((a.getAttribute('href')||'').toLowerCase()===current)a.classList.add('active')});

const reveals=qa('.section-head,.product-card,.trust-item,.step,.category,.panel,.verify-card,.info,.timeline-item,.sample-banner,.sidebar,.toolbar,.gallery,.notice,.stat,.upload');
if(reduceMotion)reveals.forEach(x=>x.classList.add('is-visible'));else{reveals.forEach((x,i)=>{x.classList.add('reveal-ready');x.style.setProperty('--reveal-delay',`${(i%6)*55}ms`)});const io=new IntersectionObserver(es=>es.forEach(e=>{if(e.isIntersecting){e.target.classList.add('is-visible');io.unobserve(e.target)}}),{threshold:.1});reveals.forEach(x=>io.observe(x))}

if(finePointer&&!reduceMotion){
  const hero=q('.hero'),vis=q('.hero-visual');
  hero?.addEventListener('pointermove',e=>{const r=hero.getBoundingClientRect(),x=(e.clientX-r.left)/r.width-.5,y=(e.clientY-r.top)/r.height-.5;vis.style.transform=`perspective(1100px) rotateY(${x*4}deg) rotateX(${-y*3}deg) translate3d(${x*8}px,${y*6}px,0)`});
  hero?.addEventListener('pointerleave',()=>vis.style.transform='');
}

qa('.btn,.filter,button').forEach(b=>{b.addEventListener('pointerdown',()=>b.classList.add('is-pressing'));['pointerup','pointercancel','pointerleave'].forEach(ev=>b.addEventListener(ev,()=>b.classList.remove('is-pressing')))});

let navigating=false;
const go=async(url,t)=>{if(navigating)return;navigating=true;if(t?.classList?.contains('btn')){t.classList.add('is-loading');t.insertAdjacentHTML('beforeend','<span class="btn-loader"></span>')}if(!reduceMotion){document.body.classList.add('page-leaving');await sleep(300)}location.href=url};
qa('a[href]').forEach(a=>a.addEventListener('click',e=>{if(e.defaultPrevented||e.button!==0||e.metaKey||e.ctrlKey||e.shiftKey||e.altKey||a.target==='_blank')return;const raw=a.getAttribute('href');if(!raw||raw.startsWith('#')||raw.startsWith('mailto:')||raw.startsWith('tel:'))return;const u=new URL(a.href,location.href);if(u.origin!==location.origin)return;e.preventDefault();go(u.href,a)}));
qa('[data-search]').forEach(f=>f.addEventListener('submit',e=>{e.preventDefault();const v=q('input',f)?.value.trim();if(!v){q('input',f)?.focus();return}go('mua-vot.html?q='+encodeURIComponent(v),q('button',f))}));

const gallery=q('.gallery'),paddle=gallery?.querySelector('.mini-paddle');
if(gallery&&paddle){const vars=[['#dfff4f','-7deg','JOOLA'],['#7bc7ff','7deg','SIDE'],['#ff9ac7','-2deg','16MM'],['#ffcc62','12deg','SERIAL']],sw=document.createElement('div');sw.className='media-switcher';vars.forEach((v,i)=>{const b=document.createElement('button');b.className='media-thumb'+(i?'':' active');b.type='button';b.setAttribute('aria-label',`Xem ảnh ${i+1}`);b.style.setProperty('--thumb-accent',v[0]);b.style.setProperty('--thumb-rot',v[1]);b.onclick=()=>{qa('.media-thumb',sw).forEach(x=>x.classList.remove('active'));b.classList.add('active');paddle.style.borderColor=v[0];q('span',paddle).textContent=v[2]};sw.appendChild(b)});gallery.parentNode.insertBefore(sw,gallery.nextSibling)}

const range=q('#priceValue');range?.addEventListener('input',()=>{const l=q('#priceLabel');if(l)l.textContent=Number(range.value).toLocaleString('vi-VN')+' đ'});

const featureScript=document.createElement('script');featureScript.src='assets/features.js?v=6';featureScript.defer=false;document.body.appendChild(featureScript);
