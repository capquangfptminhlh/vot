const q=(s,c=document)=>c.querySelector(s);
const qa=(s,c=document)=>[...c.querySelectorAll(s)];
const reduceMotion=window.matchMedia('(prefers-reduced-motion: reduce)').matches;
const finePointer=window.matchMedia('(hover:hover) and (pointer:fine)').matches;
const sleep=ms=>new Promise(r=>setTimeout(r,ms));

// Interaction styles injected globally so every page shares the same motion language.
const motionStyle=document.createElement('style');
motionStyle.textContent=`
  .page-veil{display:grid;place-items:center;color:white}
  .page-veil .transition-mark{opacity:0;transform:translateY(18px) scale(.94);transition:.35s .14s cubic-bezier(.2,.8,.2,1);text-align:center;font-weight:900;letter-spacing:-.3px}
  .page-veil .transition-mark .dot{width:48px;height:48px;border-radius:50%;margin:0 auto 12px;background:#dfff4f;box-shadow:inset 0 0 0 9px #f1ffa2,0 0 45px rgba(223,255,79,.32);animation:transitionPulse .8s ease-in-out infinite alternate}
  body.page-leaving .page-veil .transition-mark{opacity:1;transform:none}
  body.page-entering main,body.page-entering .page-hero,body.page-entering .hero{animation:pageIn .62s cubic-bezier(.2,.8,.2,1) both}
  .btn.is-pressing,.filter.is-pressing{transform:scale(.955)!important;filter:saturate(1.08)}
  .btn.is-loading{pointer-events:none}
  .btn.is-loading .btn-loader{width:14px;height:14px;border:2px solid currentColor;border-right-color:transparent;border-radius:50%;display:inline-block;animation:spin .65s linear infinite}
  .media-switcher{display:flex;gap:10px;justify-content:center;margin-top:14px;flex-wrap:wrap}
  .media-thumb{width:66px;height:66px;border-radius:16px;border:1px solid rgba(11,75,48,.12);background:linear-gradient(145deg,#f7faf8,#edf5ef);display:grid;place-items:center;cursor:pointer;position:relative;overflow:hidden;transition:.3s cubic-bezier(.2,.8,.2,1)}
  .media-thumb:hover{transform:translateY(-3px);box-shadow:0 12px 24px rgba(5,74,44,.10)}
  .media-thumb.active{border-color:#087a4b;box-shadow:0 0 0 3px rgba(8,122,75,.10)}
  .media-thumb:before{content:"";width:23px;height:32px;border-radius:10px;background:#17211c;border:2px solid var(--thumb-accent,#dfff4f);transform:rotate(var(--thumb-rot,-7deg))}
  .gallery.media-changing .mini-paddle{animation:mediaSwapOut .18s ease both}
  .gallery.media-enter .mini-paddle{animation:mediaSwapIn .46s cubic-bezier(.2,.8,.2,1) both}
  .product-card.is-filtering{pointer-events:none}
  .filter-flash{position:fixed;left:50%;bottom:28px;z-index:130;transform:translate(-50%,16px);opacity:0;padding:10px 16px;border-radius:999px;background:#073f2b;color:#fff;font-size:13px;font-weight:800;box-shadow:0 18px 40px rgba(3,53,32,.28);transition:.3s cubic-bezier(.2,.8,.2,1)}
  .filter-flash.show{opacity:1;transform:translate(-50%,0)}
  .mobile-bottom a,.navlinks a,.product-card,.category{tap-highlight-color:transparent;-webkit-tap-highlight-color:transparent}
  .mobile-bottom a.tap-active{transform:translateY(-4px) scale(.96)}
  @keyframes pageIn{from{opacity:0;transform:translateY(16px);filter:blur(5px)}to{opacity:1;transform:none;filter:none}}
  @keyframes transitionPulse{to{transform:scale(1.08);box-shadow:inset 0 0 0 9px #f1ffa2,0 0 70px rgba(223,255,79,.5)}}
  @keyframes spin{to{transform:rotate(360deg)}}
  @keyframes mediaSwapOut{to{opacity:0;transform:rotate(8deg) scale(.82) translateY(10px)}}
  @keyframes mediaSwapIn{from{opacity:0;transform:rotate(-18deg) scale(.78) translateY(-12px)}to{opacity:1;transform:rotate(var(--media-rot,-7deg)) scale(var(--media-scale,1))}}
  @media(prefers-reduced-motion:reduce){.page-veil .transition-mark,.media-thumb,.filter-flash{transition:none!important}.gallery.media-changing .mini-paddle,.gallery.media-enter .mini-paddle,body.page-entering main{animation:none!important}}
`;
document.head.appendChild(motionStyle);

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
veil.innerHTML='<div class="transition-mark"><div class="dot"></div><div>ChoVot Pickleball</div></div>';
document.body.appendChild(veil);
document.body.classList.add('page-entering');
requestAnimationFrame(()=>{
  document.body.classList.add('is-ready');
  setTimeout(()=>document.body.classList.remove('page-entering'),700);
});

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
  if(!reduceMotion) mobileToggle.animate([{transform:'scale(.78) rotate(-12deg)'},{transform:'none'}],{duration:260,easing:'cubic-bezier(.2,.8,.2,1)'});
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
  a.addEventListener('pointerdown',()=>a.classList.add('tap-active'));
  ['pointerup','pointercancel','pointerleave'].forEach(ev=>a.addEventListener(ev,()=>a.classList.remove('tap-active')));
});

// Scroll reveal with a small stagger.
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

// Hero parallax.
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

// Button press + ripple + tactile release.
qa('.btn,.filter,button').forEach(btn=>{
  btn.addEventListener('pointerdown',e=>{
    btn.classList.add('is-pressing');
    if(reduceMotion||!btn.classList.contains('btn')) return;
    const r=btn.getBoundingClientRect();
    const size=Math.max(r.width,r.height)*1.15;
    const ripple=document.createElement('span');
    ripple.className='ripple';
    ripple.style.width=ripple.style.height=`${size}px`;
    ripple.style.left=`${e.clientX-r.left-size/2}px`;
    ripple.style.top=`${e.clientY-r.top-size/2}px`;
    btn.appendChild(ripple);
    setTimeout(()=>ripple.remove(),700);
  });
  ['pointerup','pointercancel','pointerleave'].forEach(ev=>btn.addEventListener(ev,()=>btn.classList.remove('is-pressing')));
});

// Centralized page navigation so every action gets the same premium transition.
let navigating=false;
const navigateWithMotion=async(url,trigger=null)=>{
  if(navigating) return;
  navigating=true;
  if(trigger?.classList?.contains('btn')){
    trigger.classList.add('is-loading');
    const loader=document.createElement('span');
    loader.className='btn-loader';
    trigger.appendChild(loader);
  }
  if(reduceMotion){ location.href=url; return; }
  document.body.classList.add('page-leaving');
  await sleep(420);
  location.href=url;
};

qa('a[href]').forEach(a=>a.addEventListener('click',e=>{
  if(e.defaultPrevented||e.button!==0||e.metaKey||e.ctrlKey||e.shiftKey||e.altKey||a.target==='_blank'||a.hasAttribute('download')) return;
  const raw=a.getAttribute('href');
  if(!raw||raw.startsWith('#')||raw.startsWith('mailto:')||raw.startsWith('tel:')||raw.startsWith('javascript:')) return;
  const url=new URL(a.href,location.href);
  if(url.origin!==location.origin) return;
  if(url.pathname===location.pathname&&url.search===location.search&&url.hash) return;
  e.preventDefault();
  navigateWithMotion(url.href,a);
}));

// Search with submit animation before navigation.
qa('[data-search]').forEach(form=>form.addEventListener('submit',e=>{
  e.preventDefault();
  const input=q('input',form);
  const v=input?.value.trim();
  if(!v){
    input?.animate([{transform:'translateX(0)'},{transform:'translateX(-5px)'},{transform:'translateX(5px)'},{transform:'translateX(0)'}],{duration:260});
    input?.focus();
    return;
  }
  const btn=q('button,.btn',form);
  navigateWithMotion('mua-vot.html?q='+encodeURIComponent(v),btn);
}));

// Marketplace filtering with crossfade/morph and result feedback.
const filterFlash=document.createElement('div');
filterFlash.className='filter-flash';
document.body.appendChild(filterFlash);
let flashTimer;
const showFlash=text=>{
  clearTimeout(flashTimer);filterFlash.textContent=text;filterFlash.classList.add('show');
  flashTimer=setTimeout(()=>filterFlash.classList.remove('show'),1100);
};
qa('[data-filter]').forEach(btn=>btn.addEventListener('click',async()=>{
  qa('[data-filter]').forEach(x=>x.classList.remove('btn-primary'));
  btn.classList.add('btn-primary');
  const type=btn.dataset.filter;
  const cards=qa('.product-card');
  const apply=()=>{
    let count=0;
    cards.forEach((card,i)=>{
      const visible=type==='all'||!type||card.dataset.type===type;
      card.style.display=visible?'block':'none';
      if(visible){count++;if(!reduceMotion)card.animate([{opacity:0,transform:'translateY(14px) scale(.965)',filter:'blur(4px)'},{opacity:1,transform:'none',filter:'none'}],{duration:420,delay:i*32,easing:'cubic-bezier(.2,.8,.2,1)',fill:'both'});}
    });
    showFlash(`${count} sản phẩm phù hợp`);
  };
  if(document.startViewTransition&&!reduceMotion){document.startViewTransition(apply);}else apply();
}));

// Product detail: inject visual thumbnails and animate media changes.
const gallery=q('.gallery');
const galleryPaddle=gallery?.querySelector('.mini-paddle');
if(gallery&&galleryPaddle){
  const variants=[
    {label:'APEX',accent:'#dfff4f',rot:'-7deg',bg:'radial-gradient(circle at 50% 42%,#fff,#eef5f0 70%)'},
    {label:'APEX',accent:'#7bc7ff',rot:'7deg',bg:'radial-gradient(circle at 55% 35%,#f9fdff,#eaf4fb 70%)'},
    {label:'16MM',accent:'#ff9ac7',rot:'-2deg',bg:'radial-gradient(circle at 45% 38%,#fff9fc,#f8ecf2 72%)'},
    {label:'SERIAL',accent:'#ffcc62',rot:'12deg',bg:'radial-gradient(circle at 54% 40%,#fffdf7,#f7f1df 70%)'}
  ];
  const switcher=document.createElement('div');
  switcher.className='media-switcher';
  variants.forEach((v,i)=>{
    const b=document.createElement('button');
    b.type='button';b.className='media-thumb'+(i===0?' active':'');b.setAttribute('aria-label',`Xem góc ${i+1}`);
    b.style.setProperty('--thumb-accent',v.accent);b.style.setProperty('--thumb-rot',v.rot);
    b.addEventListener('click',async()=>{
      if(b.classList.contains('active'))return;
      qa('.media-thumb',switcher).forEach(x=>x.classList.remove('active'));b.classList.add('active');
      if(reduceMotion){galleryPaddle.style.borderColor=v.accent;galleryPaddle.style.transform=`rotate(${v.rot})`;galleryPaddle.querySelector('span').textContent=v.label;gallery.style.background=v.bg;return;}
      gallery.classList.remove('media-enter');gallery.classList.add('media-changing');
      await sleep(170);
      galleryPaddle.style.borderColor=v.accent;galleryPaddle.style.setProperty('--media-rot',v.rot);galleryPaddle.querySelector('span').textContent=v.label;gallery.style.background=v.bg;
      gallery.classList.remove('media-changing');void gallery.offsetWidth;gallery.classList.add('media-enter');
      setTimeout(()=>gallery.classList.remove('media-enter'),520);
    });
    switcher.appendChild(b);
  });
  gallery.parentNode.insertBefore(switcher,gallery.nextSibling);
}

// Price range helper when present.
const price=q('#priceValue');
if(price){
  const updatePrice=()=>{const label=q('#priceLabel');if(label)label.textContent=Number(price.value).toLocaleString('vi-VN')+' đ'};
  price.addEventListener('input',()=>{updatePrice();q('#priceLabel')?.animate([{transform:'scale(1.08)'},{transform:'none'}],{duration:180});});updatePrice();
}

// Verification demo states with completion burst.
qa('[data-step-next]').forEach(b=>b.addEventListener('click',()=>{
  const cur=b.closest('.verify-card');
  cur?.classList.add('done');
  b.textContent='Đã hoàn tất ✓';
  b.disabled=true;
  if(!reduceMotion&&cur){
    cur.animate([{transform:'scale(.98)'},{transform:'scale(1.025)'},{transform:'none'}],{duration:430,easing:'cubic-bezier(.2,.8,.2,1)'});
    const icon=q('.trust-icon',cur);icon?.animate([{transform:'rotate(-8deg) scale(.8)'},{transform:'rotate(6deg) scale(1.18)'},{transform:'none'}],{duration:520,easing:'cubic-bezier(.2,.8,.2,1)'});
  }
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
