(()=>{
  const placeholder=['090','000','0000'].join('');
  const scrub=()=>{
    document.querySelectorAll('a[href^="tel:"]').forEach(a=>{
      const normalized=(a.getAttribute('href')||'').replace(/[\s.-]/g,'');
      if(normalized==='tel:'||normalized===`tel:${placeholder}`){
        a.href='tin-nhan.html';
        a.textContent='💬 Liên hệ người bán';
      }
    });
    document.querySelectorAll('.mobile-toggle').forEach(b=>{if(!b.getAttribute('aria-label'))b.setAttribute('aria-label','Mở menu')});
    if(location.pathname.endsWith('san-pham.html')&&!document.querySelector('.report-listing-link')){
      const bar=document.querySelector('.sticky-buy');
      if(bar){
        const note=document.createElement('p');
        note.className='report-listing-link';
        note.style.cssText='margin:10px 0 0;font-size:12px;text-align:center';
        note.innerHTML='<a class="link" href="an-toan-giao-dich.html#bao-cao">⚑ Báo cáo tin đáng ngờ</a>';
        bar.insertAdjacentElement('afterend',note);
      }
    }
    if(!document.querySelector('link[rel="manifest"]')){
      const l=document.createElement('link');l.rel='manifest';l.href='manifest.webmanifest';document.head.appendChild(l);
    }
    if(!document.querySelector('meta[name="theme-color"]')){
      const m=document.createElement('meta');m.name='theme-color';m.content='#087a4b';document.head.appendChild(m);
    }
  };
  scrub();
  const observer=new MutationObserver(scrub);
  observer.observe(document.documentElement,{subtree:true,childList:true,attributes:true,attributeFilter:['href']});
  setTimeout(()=>observer.disconnect(),5000);
})();
