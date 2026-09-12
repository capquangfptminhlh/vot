import { backendConfig, friendlyError } from "../core/backend.js";
import { listBrands } from "../services/catalog-service.js";
import { createSavedSearch } from "../services/growth-service.js";
import { listActiveListings } from "../services/listing-service.js";

const grid=document.getElementById("market-grid");
const count=document.getElementById("market-count");
const liveStatus=document.querySelector("[data-market-status]");
const brandQuick=document.getElementById("brandQuick");
const sortEl=document.querySelector(".market-layout .section-head select");
const sidebar=document.querySelector(".sidebar");
const toolbar=document.querySelector(".toolbar");
const searchInput=document.querySelector("[data-search] input");
let activeQuick="all";
let lastListings=[];
let brands=[];

function money(value){return new Intl.NumberFormat("vi-VN").format(Number(value||0))+" đ";}
function escapeHtml(value){return String(value??"").replaceAll("&","&amp;").replaceAll("<","&lt;").replaceAll(">","&gt;").replaceAll('"',"&quot;").replaceAll("'","&#039;");}
function slugForBrand(name){return brands.find(x=>x.name===name)?.slug||String(name||"").toLowerCase().replace(/[^a-z0-9]+/g,"-").replace(/^-|-$/g,"");}
function selectedChecks(){return [...(sidebar?.querySelectorAll("input:checked")||[])].map(x=>String(x.value||""));}
function sortValue(){const v=sortEl?.value||"Mới nhất";return v==="Giá thấp"?"price_asc":v==="Giá cao"?"price_desc":"newest";}
function queryFilters(){const params=new URLSearchParams(location.search);const brandName=brandQuick?.value||params.get("brand_name")||"";return{query:params.get("q")||searchInput?.value?.trim()||"",brand:brandName?slugForBrand(brandName):"",condition:activeQuick==="new"?"Mới 100":"",maxPrice:activeQuick==="under3"?3000000:null,sort:sortValue(),limit:60};}
function clientMatch(item){const checks=selectedChecks();const brand=item.paddle_models?.brands?.name||item.custom_brand||"";const thickness=item.paddle_models?.thickness_mm?`${item.paddle_models.thickness_mm}mm`:"";const play=item.paddle_models?.play_style||"";const verified=Boolean(item.seller_id);if(activeQuick==="used"&&/^mới 100/i.test(item.condition||""))return false;if(activeQuick==="control"&&!/control/i.test(play))return false;if(activeQuick==="power"&&!/power/i.test(play))return false;for(const value of checks){if(value==="Người bán xác thực"&&!verified)return false;if(/mm$/i.test(value)&&thickness!==value)return false;if(value==="Mới 100"&&!/mới 100/i.test(item.condition||""))return false;if(value==="Like new"&&!/like new/i.test(item.condition||""))return false;if(value==="95-97"&&!/95-97/.test(item.condition||""))return false;if(value==="90-94"&&!/90-94/.test(item.condition||""))return false;if(value==="80-89"&&!/80-89/.test(item.condition||""))return false;}return true;}

function render(listings){
  if(!grid)return;
  const visible=listings.filter(clientMatch);
  grid.innerHTML=visible.map(item=>{
    const brand=item.paddle_models?.brands?.name||item.custom_brand||"Vợt";
    const model=item.paddle_models?.name||item.custom_model||"";
    const thickness=item.paddle_models?.thickness_mm?`${item.paddle_models.thickness_mm}mm`:"";
    const play=item.paddle_models?.play_style||"";
    const image=item.listing_images?.[0]?.storage_path||"";
    return `<a class="product-card" href="san-pham.html?id=${encodeURIComponent(item.id)}" data-brand="${escapeHtml(brand)}" data-condition="${escapeHtml(item.condition||"")}" data-thickness="${escapeHtml(thickness)}" data-playstyle="${escapeHtml(play)}"><div class="badges"><span class="badge verified">${item.status==="reserved"?"Đã giữ chỗ":"Người bán xác thực"}</span></div><div class="product-media">${image?`<img src="${escapeHtml(image)}" alt="${escapeHtml(item.title)}" loading="lazy" style="width:100%;height:100%;object-fit:cover">`:`<div class="mini-paddle"><span>${escapeHtml(brand)}</span></div>`}</div><div class="product-body"><p class="product-title">${escapeHtml(item.title)}</p><span class="product-meta">${escapeHtml([item.condition,thickness,play,item.province].filter(Boolean).join(" • "))}</span><div class="price">${money(item.price_vnd)}</div><div class="seller-mini">${escapeHtml([brand,model].filter(Boolean).join(" "))}</div></div></a>`;
  }).join("")||'<div class="panel"><b>Chưa có tin phù hợp</b><p>Thử bỏ bớt bộ lọc hoặc lưu tìm kiếm để quay lại sau.</p></div>';
  if(count)count.textContent=`${visible.length} vợt phù hợp`;
}

function previewFilter(){
  if(!grid)return;
  const q=(new URLSearchParams(location.search).get("q")||searchInput?.value||"").toLowerCase().trim();
  const brand=brandQuick?.value||"";
  let shown=0;
  [...grid.querySelectorAll(".product-card")].forEach(card=>{
    const text=card.textContent.toLowerCase(),price=Number((card.querySelector(".price")?.textContent||"").replace(/\D/g,""))||0;
    const cBrand=card.dataset.brand||"";let ok=!q||text.includes(q);if(brand)ok=ok&&cBrand===brand;if(activeQuick==="new")ok=ok&&/mới 100/i.test(text);if(activeQuick==="used")ok=ok&&!/mới 100/i.test(text);if(activeQuick==="control")ok=ok&&/control/i.test(text);if(activeQuick==="power")ok=ok&&/power/i.test(text);if(activeQuick==="under3")ok=ok&&price<=3000000;for(const v of selectedChecks()){if(v==="Người bán xác thực")continue;if(!text.toLowerCase().includes(v.toLowerCase()))ok=false;}card.hidden=!ok;if(ok)shown++;});
  if(count)count.textContent=`${shown} vợt minh họa phù hợp`;
}

async function load(){
  if(!backendConfig().configured){if(liveStatus)liveStatus.textContent="Đang hiển thị tin minh họa vì backend preview chưa được cấu hình.";previewFilter();return;}
  try{lastListings=await listActiveListings(queryFilters());render(lastListings);if(liveStatus)liveStatus.textContent="Dữ liệu và bộ lọc đang chạy trực tiếp trên backend ChoVot.";}catch(error){if(liveStatus)liveStatus.textContent=friendlyError(error);}
}

async function initBrands(){
  try{brands=await listBrands();if(brandQuick){const current=new URLSearchParams(location.search).get("brand_name")||brandQuick.value;brandQuick.innerHTML='<option value="">Tất cả hãng</option>'+brands.map(b=>`<option value="${escapeHtml(b.name)}">${escapeHtml(b.name)}</option>`).join("");if(current)brandQuick.value=current;}}catch(error){if(liveStatus)liveStatus.textContent=`Không tải được catalog hãng: ${friendlyError(error)}`;}
}

function installSaveSearch(){
  const head=document.querySelector(".market-layout .section-head");if(!head||head.querySelector("[data-save-search]"))return;
  const button=document.createElement("button");button.type="button";button.className="btn btn-outline";button.dataset.saveSearch="";button.textContent="☆ Lưu tìm kiếm";head.appendChild(button);
  button.addEventListener("click",async()=>{if(!backendConfig().configured){if(liveStatus)liveStatus.textContent="Cần backend production và đăng nhập để lưu tìm kiếm.";return;}button.disabled=true;try{const f=queryFilters();const checks=selectedChecks();const saved=await createSavedSearch({name:[brandQuick?.value,f.query].filter(Boolean).join(" • ").slice(0,80)||"Tìm kiếm của tôi",query:f.query||undefined,brandSlug:f.brand||undefined,condition:f.condition||checks.find(x=>/Mới|Like|\d{2}-\d{2}/.test(x))||undefined,maxPriceVnd:f.maxPrice??undefined,notifyEnabled:true});button.textContent="✓ Đã lưu";if(liveStatus)liveStatus.textContent=`Đã lưu tìm kiếm “${saved.name||"Tìm kiếm của tôi"}” và bật thông báo.`;}catch(error){if(error?.code==="AUTH_REQUIRED"){location.href=`dang-nhap.html?next=${encodeURIComponent(location.pathname+location.search)}`;return;}if(liveStatus)liveStatus.textContent=friendlyError(error);}finally{button.disabled=false;}});
}

const params=new URLSearchParams(location.search);if(searchInput&&params.get("q"))searchInput.value=params.get("q");
await initBrands();installSaveSearch();
toolbar?.querySelectorAll("[data-filter]").forEach(button=>button.addEventListener("click",async()=>{toolbar.querySelectorAll("[data-filter]").forEach(x=>x.classList.remove("btn-primary"));button.classList.add("btn-primary");activeQuick=button.dataset.filter||"all";await load();}));
brandQuick?.addEventListener("change",load);sortEl?.addEventListener("change",load);sidebar?.querySelectorAll("input").forEach(input=>input.addEventListener("change",()=>backendConfig().configured?render(lastListings):previewFilter()));
load();
