import { backendConfig, friendlyError } from "../core/backend.js";
import { listBrands, listBrandModels } from "../services/catalog-service.js";
import { createDraft, uploadPrivateListingImages, submitForReview } from "../services/listing-service.js";

const form=document.querySelector("[data-sell-form]");
const status=document.querySelector("[data-sell-status]");
const imageInput=document.getElementById("listingImages");
const cfg=backendConfig();
const brandEl=document.getElementById("brand");
const modelEl=document.getElementById("model");

const CONDITIONS=["Mới 100% - chưa đánh","Like new 98-99%","Rất đẹp 95-97%","Đẹp 90-94%","Đã sử dụng 80-89%","Dưới 80% / trầy nhiều","Có nứt / lỗi cần mô tả"];
const THICKNESS=["10mm","12mm","13mm","14mm","15mm","16mm","18mm","20mm","Khác"];
const SHAPES=["Elongated","Hybrid","Standard / Widebody","Racket","Khác"];
const SURFACES=["Raw Carbon Fiber","T700 Carbon","Textured Carbon Fiber","Carbon Fiber","Fiberglass","Kevlar / Aramid","Titanium / PET","Composite","Graphite","Khác"];
const CORES=["Polypropylene Honeycomb","PP core + EVA foam wall","Foam Core","Nomex","Polymer / Composite","Khác"];
const PLAYSTYLE=["Control","All-court","Power","Spin","Beginner / dễ chơi","Khác"];

let brands=[];
let currentModels=[];
let selectedModel=null;

function value(id){return document.getElementById(id)?.value?.trim()||"";}
function setStatus(message,type=""){if(status){status.textContent=message;status.dataset.type=type;}}
function fillSelect(id,items,placeholder){const el=document.getElementById(id);if(!el)return;el.innerHTML=`<option value="">${placeholder}</option>`+items.map(x=>`<option value="${escapeAttr(x)}">${escapeHtml(x)}</option>`).join("");}
function escapeHtml(v){return String(v??"").replaceAll("&","&amp;").replaceAll("<","&lt;").replaceAll(">","&gt;").replaceAll('"',"&quot;").replaceAll("'","&#039;");}
function escapeAttr(v){return escapeHtml(v);}
function ensureOption(el,value){if(!el||!value)return;if(![...el.options].some(o=>o.value===value)){const option=document.createElement("option");option.value=value;option.textContent=value;el.appendChild(option);}el.value=value;}
function selectedBrand(){const option=brandEl?.selectedOptions?.[0];return option?{name:option.value,slug:option.dataset.slug||""}:null;}
function normalizeShape(shape){if(!shape)return"";if(/wide/i.test(shape))return"Standard / Widebody";return shape;}
function modelIsVerified(model){return Boolean(model?.verifiedAt&&model?.sourceUrl&&model?.verificationStatus!=="unverified");}

function installModelDatalist(){
  let list=document.getElementById("paddleModelOptions");
  if(!list){list=document.createElement("datalist");list.id="paddleModelOptions";modelEl?.after(list);modelEl?.setAttribute("list",list.id);}
  list.innerHTML=currentModels.map(model=>`<option value="${escapeAttr(model.name)}">${escapeHtml([model.generation,model.thicknessMm?`${model.thicknessMm}mm`:""].filter(Boolean).join(" • "))}</option>`).join("");
}

function renderModelTrust(model){
  let note=document.querySelector("[data-model-catalog-status]");
  if(!note&&modelEl){note=document.createElement("small");note.dataset.modelCatalogStatus="";note.style.display="block";note.style.marginTop="6px";modelEl.after(note);}
  if(!note)return;
  if(!model){note.textContent=currentModels.length?"Chọn đúng model gợi ý để tự điền thông số đã xác minh. Không thấy model? Bạn vẫn có thể nhập tay.":"Chưa có model chuẩn hóa cho hãng này; bạn có thể nhập model thủ công.";return;}
  if(modelIsVerified(model)){
    note.innerHTML=`✓ Model có nguồn dữ liệu • <a href="${escapeAttr(model.sourceUrl)}" target="_blank" rel="noopener noreferrer">xem nguồn</a>`;
  }else note.textContent="Model này chưa đủ nguồn để ChoVot tự xác nhận thông số. Bạn có thể nhập tay và mô tả rõ.";
}

function applyVerifiedSpecs(model){
  if(!modelIsVerified(model))return;
  if(model.thicknessMm)ensureOption(document.getElementById("thickness"),`${Number(model.thicknessMm)}mm`);
  if(model.shape)ensureOption(document.getElementById("shape"),normalizeShape(model.shape));
  if(model.surface)ensureOption(document.getElementById("surface"),model.surface);
  if(model.core)ensureOption(document.getElementById("core"),model.core);
  if(model.playStyle)ensureOption(document.getElementById("playstyle"),model.playStyle);
  if(model.averageWeightOz!=null)document.getElementById("weight").value=`${Number(model.averageWeightOz)} oz`;
  if(model.gripLengthIn!=null)document.getElementById("gripLength").value=`${Number(model.gripLengthIn)} inch`;
  if(model.gripCircumferenceIn!=null)document.getElementById("gripCircumference").value=`${Number(model.gripCircumferenceIn)} inch`;
}

async function loadModels(){
  selectedModel=null;
  currentModels=[];
  installModelDatalist();
  const brand=selectedBrand();
  if(!brand?.slug||brand.name==="Hãng khác"){renderModelTrust(null);return;}
  try{
    currentModels=await listBrandModels(brand);
    installModelDatalist();
    renderModelTrust(null);
  }catch(error){
    renderModelTrust(null);
    setStatus(`Không tải được catalog model: ${friendlyError(error)}. Bạn vẫn có thể nhập tay.`,"warning");
  }
}

function syncModelSelection(){
  const needle=value("model").toLocaleLowerCase("vi");
  selectedModel=currentModels.find(x=>String(x.name||"").toLocaleLowerCase("vi")===needle)||null;
  renderModelTrust(selectedModel);
  if(selectedModel)applyVerifiedSpecs(selectedModel);
}

async function initCatalog(){
  fillSelect("condition",CONDITIONS,"Chọn tình trạng");
  fillSelect("thickness",THICKNESS,"Chọn độ dày");
  fillSelect("shape",SHAPES,"Chọn kiểu dáng");
  fillSelect("surface",SURFACES,"Chọn mặt vợt");
  fillSelect("core",CORES,"Chọn lõi");
  fillSelect("playstyle",PLAYSTYLE,"Chọn lối chơi");
  try{
    brands=await listBrands();
    if(brandEl){brandEl.innerHTML='<option value="">Chọn thương hiệu</option>'+brands.map(b=>`<option value="${escapeAttr(b.name)}" data-slug="${escapeAttr(b.slug)}">${escapeHtml(b.name)}</option>`).join("")+'<option value="Hãng khác">Hãng khác</option>';}
  }catch(error){
    if(brandEl)brandEl.innerHTML='<option value="">Không tải được danh sách hãng</option><option value="Hãng khác">Hãng khác</option>';
    setStatus(`Catalog tạm thời không tải được: ${friendlyError(error)}`,"warning");
  }
}

function payloadFromForm(){
  const invoiceValue=value("invoice");
  const useCatalog=Boolean(selectedModel?.id&&modelIsVerified(selectedModel));
  return{
    paddle_model_id:useCatalog?selectedModel.id:null,
    custom_brand:useCatalog?null:value("brand"),
    custom_model:useCatalog?null:value("model"),
    title:value("name"),
    description:value("description"),
    condition:value("condition"),
    price_vnd:Number(value("price")),
    province:value("location"),
    serial_number:value("serial")||null,
    invoice_available:invoiceValue==="Có"?true:invoiceValue?false:null,
    nfc_available:selectedModel?.nfc??(value("serial")?true:null),
  };
}

if(!cfg.configured)setStatus("Bản preview chưa nối ChoVot API production. Catalog dùng dữ liệu fallback; form sẽ không gửi dữ liệu thật.","warning");

brandEl?.addEventListener("change",async()=>{modelEl.value="";await loadModels();});
modelEl?.addEventListener("input",syncModelSelection);
modelEl?.addEventListener("change",syncModelSelection);

await initCatalog();

form?.addEventListener("submit",async event=>{
  event.preventDefault();
  const submitter=event.submitter;if(submitter)submitter.disabled=true;
  try{
    syncModelSelection();
    if(!value("brand")||!value("model")||!value("name")||!value("condition")||!value("price"))throw new Error("Vui lòng nhập đủ tên tin, hãng, model, tình trạng và giá.");
    setStatus("Đang lưu bản nháp...");
    const draft=await createDraft(payloadFromForm());
    setStatus("Đã lưu nháp. Đang tải ảnh vào vùng riêng tư...");
    await uploadPrivateListingImages(draft.id,imageInput?.files);
    setStatus("Ảnh đã tải. Đang gửi tin vào hàng đợi kiểm duyệt...");
    await submitForReview(draft.id);
    setStatus("Tin đã gửi duyệt. Chỉ khi KYC và moderation đạt yêu cầu tin mới được công khai.","success");
    form.reset();selectedModel=null;currentModels=[];installModelDatalist();renderModelTrust(null);
  }catch(error){
    if(error?.code==="AUTH_REQUIRED"){
      setStatus("Bạn cần đăng nhập trước khi lưu tin.","warning");
      setTimeout(()=>{location.href=`dang-nhap.html?next=${encodeURIComponent("ban-vot.html")}`;},400);
    }else setStatus(friendlyError(error),"error");
  }finally{if(submitter)submitter.disabled=false;}
});
