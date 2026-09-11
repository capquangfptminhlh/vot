const q=(s,c=document)=>c.querySelector(s);
const qa=(s,c=document)=>[...c.querySelectorAll(s)];
const reduceMotion=window.matchMedia('(prefers-reduced-motion: reduce)').matches;
const finePointer=window.matchMedia('(hover:hover) and (pointer:fine)').matches;

// Complete shared shell on pages that intentionally keep HTML minimal.
if(!q('.footer')){
  const footer=document.createElement('footer');
  footer.className='footer';
  footer.innerHTML='<div class="container footer-grid"><div><div class="logo"><span class="logo-mark"></span><span>ChoVot Pickleball</span></div><p style="color:#9fb4a7;max-width:330px">Marketplace chuyên vợt pickleball với xác thực hai phía và giao dịch minh bạch.</p></div><div><h4>Marketplace</h4><a href="mua-vot.html">Mua vợt</a><a href="ban-vot.html">Bán vợt</a><a href="dinh-gia.html">Định giá</a></div><div><h4>An toàn</h4><a href="xac-thuc.html">Xác thực</a><a href="don-hang.html">Theo dõi đơn</a></div><div><h4>Khám phá</h4><a href="nguoi-ban.html">Người bán uy tín</a><a href="index.html">Về ChoVot</a></div></div>';
  document.body.insertBefore(footer,q('script[src="assets/app.js"]')||null);
}
if(!q('.mobile-bottom')){
  const bottom=document.createElement('nav');
  bottom.className='mobile-bottom';
  bottom.innerHTML='<a href="index.html"><b>⌂</b>Trang chủ</a><a href="mua-vot.html"><b>⌕</b>Mua vợt</a><a class="sell" href="ban-vot.html"><b>＋</b>Đăng bán</a><a href="don-hang.html"><b>☷</b>Đơn hàng</a><a href="xac-thuc.html"><b>◉</b>Tôi</a>';
  document.body.appendChild(bottom);
}

// Global motion chrome shared by every page.
const progress=document.createElement('div');
progress.className='scroll-progress';
document.body.appendChild(progress);
const veil=document.createElement('div');
veil.className='page-veil';
document.body.appendChild(veil);
requestAnimationFrame(()=>document.body.classList.add('is-ready'));

// Pointer-reactive ambient light, desktop only.
if(finePointer&&!reduceMotion){
  window.addEventListener('pointermove',e=>{
    document.documentElement.style.setProperty('--mx',`${e.clientX}px`);
    document.documentElement.style.setProperty('--my',`${e.clientY}px`);
  },{passive:true});
}

// Header behavior + reading progress.
let lastY=window.scrollY;
const header=q('.header');
const onScroll=()=>{
  const y=window.scrollY;
  const max=Math.max(1,document.documentElement.scrollHeight-window.innerHeight);
  progress.style.transform=`scaleX(${Math.min(1,y/max)})`;
  header?.classList.toggle('scrolled',y>12);
  if(y>120&&y>lastY+8) header?.classList.add('header-hidden');
  if(y<lastY-8||y<80) header?.classList.remove('header-hidden');
  lastY=y;
};
window.addEventListener('scroll',onScroll,{passive:true});
onScroll();

// Mobile navigation.
const mobileToggle=q('.mobile-toggle');
const navlinks=q('.navlinks');
mobileToggle?.addEventListener('click',e=>{
  e.stopPropagation();
  navlinks?.classList.toggle('mobile-open');
  mobileToggle.textContent=navlinks?.classList.contains('mobile-open')?'×':'☰';
});
document.addEventListener('click',e=>{
  if(navlinks?.classList.contains('mobile-open')&&!navlinks.contains(e.target)&&e.target!==mobileToggle){
    navlinks.classList.remove('mobile-open');
    if(mobileToggle) mobileToggle.textContent='☰';
  }
});

// Mark current bottom-navigation item.
const current=(location.pathname.split('/').pop()||'index.html').toLowerCase();
qa('.mobile-bottom a').forEach(a=>{
  const href=(a.getAttribute('href')||'').split('?')[0].split('#')[0].toLowerCase();
  if(href===current||(current===''&&href==='index.html')) a.classList.add('active');
});

// Scroll reveal with a small stagger. Content remains immediately visible for reduced motion.
const revealTargets=qa('.section-head,.product-card,.trust-item,.step,.category,.panel,.verify-card,.info,.timeline-item,.sample-banner,.sidebar,.toolbar,.gallery,.notice,.stat,.upload');
if(reduceMotion){
  revealTargets.forEach(el=>el.classList.add('is-visible'));
}else{
  revealTargets.forEach((el,i)=>{
    el.classList.add('reveal-ready');
    el.style.setProperty('--reveal-delay',`${(i%6)*55}ms`);
  });
  const observer=new IntersectionObserver(entries=>{
    entries.forEach(entry=>{
      if(entry.isIntersecting){
        entry.target.classList.add('is-visible');
        observer.unobserve(entry.target);
      }
    });
  },{threshold:.12,rootMargin:'0px 0px -5% 0px'});
  revealTargets.forEach(el=>observer.observe(el));
}

// Hero parallax; subtle enough to preserve readability.
const hero=q('.hero');
const heroVisual=q('.hero-visual');
if(hero&&heroVisual&&finePointer&&!reduceMotion){
  hero.addEventListener('pointermove',e=>{
    const r=hero.getBoundingClientRect();
    const x=(e.clientX-r.left)/r.width-.5;
    const y=(e.clientY-r.top)/r.height-.5;
    heroVisual.style.transform=`perspective(1100px) rotateY(${x*4}deg) rotateX(${-y*3}deg) translate3d(${x*8}px,${y*6}px,0)`;
  });
  hero.addEventListener('pointerleave',()=>heroVisual.style.transform='');
}

// Premium card tilt for desktop pointer devices.
if(finePointer&&!reduceMotion){
  qa('.product-card,.category,.verify-card').forEach(card=>{
    card.addEventListener('pointermove',e=>{
      const r=card.getBoundingClientRect();
      const x=(e.clientX-r.left)/r.width-.5;
      const y=(e.clientY-r.top)/r.height-.5;
      card.style.transform=`perspective(850px) rotateX(${-y*3.2}deg) rotateY(${x*3.6}deg) translateY(-5px)`;
    });
    card.addEventListener('pointerleave',()=>card.style.transform='');
  });
}

// Button ripple micro-interaction.
qa('.btn').forEach(btn=>btn.addEventListener('pointerdown',e=>{
  if(reduceMotion) return;
  const r=btn.getBoundingClientRect();
  const size=Math.max(r.width,r.height);
  const ripple=document.createElement('span');
  ripple.className='ripple';
  ripple.style.width=ripple.style.height=`${size}px`;
  ripple.style.left=`${e.clientX-r.left-size/2}px`;
  ripple.style.top=`${e.clientY-r.top-size/2}px`;
  btn.appendChild(ripple);
  setTimeout(()=>ripple.remove(),700);
}));

// Smooth internal page transitions while preserving keyboard/modifier behavior.
if(!reduceMotion){
  qa('a[href]').forEach(a=>a.addEventListener('click',e=>{
    if(e.defaultPrevented||e.button!==0||e.metaKey||e.ctrlKey||e.shiftKey||e.altKey||a.target==='_blank'||a.hasAttribute('download')) return;
    const raw=a.getAttribute('href');
    if(!raw||raw.startsWith('#')||raw.startsWith('mailto:')||raw.startsWith('tel:')||raw.startsWith('javascript:')) return;
    const url=new URL(a.href,location.href);
    if(url.origin!==location.origin) return;
    if(url.pathname===location.pathname&&url.search===location.search&&url.hash) return;
    e.preventDefault();
    document.body.classList.add('page-leaving');
    setTimeout(()=>location.href=url.href,360);
  }));
}

// Search and marketplace filtering.
qa('[data-search]').forEach(form=>form.addEventListener('submit',e=>{
  e.preventDefault();
  const v=q('input',form)?.value.trim();
  if(v) location.href='mua-vot.html?q='+encodeURIComponent(v);
}));
qa('[data-filter]').forEach(btn=>btn.addEventListener('click',()=>{
  qa('[data-filter]').forEach(x=>x.classList.remove('btn-primary'));
  btn.classList.add('btn-primary');
  const type=btn.dataset.filter;
  qa('.product-card').forEach((card,i)=>{
    const visible=type==='all'||!type||card.dataset.type===type;
    card.style.display=visible?'block':'none';
    if(visible&&!reduceMotion){
      card.animate([{opacity:0,transform:'translateY(12px) scale(.98)'},{opacity:1,transform:'none'}],{duration:360,delay:i*35,easing:'cubic-bezier(.2,.8,.2,1)',fill:'both'});
    }
  });
}));

// Price range helper when present.
const price=q('#priceValue');
if(price){
  const updatePrice=()=>{const label=q('#priceLabel');if(label)label.textContent=Number(price.value).toLocaleString('vi-VN')+' đ'};
  price.addEventListener('input',updatePrice);updatePrice();
}

// Verification demo states.
qa('[data-step-next]').forEach(b=>b.addEventListener('click',()=>{
  const cur=b.closest('.verify-card');
  cur?.classList.add('done');
  b.textContent='Đã hoàn tất ✓';
  b.disabled=true;
}));

// Lightweight animated counters for trust metrics.
if(!reduceMotion){
  qa('.stat b').forEach(el=>{
    const raw=el.textContent.trim();
    const n=parseInt(raw.replace(/[^0-9]/g,''),10);
    if(!Number.isFinite(n)||n>999) return;
    const suffix=raw.replace(/[0-9.,]/g,'');
    const counterObserver=new IntersectionObserver(entries=>{
      if(!entries[0].isIntersecting)return;
      counterObserver.disconnect();
      const start=performance.now();
      const tick=t=>{
        const p=Math.min(1,(t-start)/850);
        const eased=1-Math.pow(1-p,3);
        el.textContent=Math.round(n*eased)+suffix;
        if(p<1)requestAnimationFrame(tick);
      };
      requestAnimationFrame(tick);
    },{threshold:.7});
    counterObserver.observe(el);
  });
}
