import { api, backendConfig } from "../core/backend.js";

const FALLBACK_BRANDS = [
  ["joola","JOOLA"],["selkirk","Selkirk"],["paddletek","Paddletek"],["gearbox","Gearbox"],["crbn","CRBN"],["franklin","Franklin"],["six-zero","Six Zero"],["vatic-pro","Vatic Pro"],["volair","Volair"],["proxr","ProXR"],["engage","Engage"],["diadem","Diadem"],["prokennex","ProKennex"],["electrum","Electrum"],["vulcan","Vulcan"],["onix","ONIX"],["head","HEAD"],["wilson","Wilson"],["babolat","Babolat"],["gamma","Gamma"],["adidas","Adidas"],["ronbus","Ronbus"],["bread-and-butter","Bread & Butter"],["honolulu-pickleball-company","Honolulu Pickleball Company"],["spartus","Spartus"],["neonic","Neonic"],["chorus","Chorus"],["proton","Proton"],["pickleball-apes","Pickleball Apes"],["11six24","11SIX24"],["thrive","Thrive"],["hudef","Hudef"],["sypik","Sypik"],["facolos","Facolos"],["kamito","Kamito"],["zocker","Zocker"],["vnp","VNP"],["pkv","PKV"]
].map(([slug,name])=>({slug,name,modelCount:0}));

let previewCatalogPromise = null;
async function previewCatalog(){
  if(!previewCatalogPromise){
    previewCatalogPromise = fetch("data/paddle-catalog.json", { cache: "no-cache" })
      .then(r=>r.ok?r.json():null)
      .catch(()=>null);
  }
  return previewCatalogPromise;
}

function normalizePreviewModel(row, brand){
  return {
    id:null,
    slug:row.slug,
    name:row.name,
    generation:row.generation||null,
    thicknessMm:row.thickness_mm??null,
    surface:row.surface||null,
    core:row.core||null,
    shape:row.shape||null,
    averageWeightOz:row.average_weight_oz??null,
    lengthIn:row.length_in??null,
    widthIn:row.width_in??null,
    gripLengthIn:row.grip_length_in??null,
    gripCircumferenceIn:row.grip_circumference_in??null,
    approval:row.approval||null,
    nfc:row.nfc??null,
    playStyle:row.play_style||null,
    sourceUrl:Array.isArray(row.sources)&&row.sources[0]?row.sources[0]:null,
    verifiedAt:row.verified_at||null,
    verificationStatus:row.verification_status||"unverified",
    brand:{slug:brand.slug,name:brand.name},
  };
}

export async function listBrands(){
  if(backendConfig().configured) return api("/brands?limit=200");
  const local=await previewCatalog();
  if(!local?.brands?.length) return FALLBACK_BRANDS;
  const modelCounts=new Map();
  for(const model of local.models||[]) modelCounts.set(model.brand,(modelCounts.get(model.brand)||0)+1);
  return local.brands.map(name=>{
    const fallback=FALLBACK_BRANDS.find(x=>x.name===name);
    return {slug:fallback?.slug||name.toLowerCase().replace(/[^a-z0-9]+/g,"-").replace(/^-|-$/g,""),name,modelCount:modelCounts.get(name)||0};
  });
}

export async function listBrandModels(brand){
  const slug=String(brand?.slug||brand||"").trim();
  if(!slug) return [];
  if(backendConfig().configured){
    const result=await api(`/brands/${encodeURIComponent(slug)}/models?limit=200`);
    return result?.models||[];
  }
  const local=await previewCatalog();
  const b=FALLBACK_BRANDS.find(x=>x.slug===slug)||{slug,name:String(brand?.name||slug)};
  return (local?.models||[]).filter(x=>x.brand===b.name).map(x=>normalizePreviewModel(x,b));
}

export async function searchModels(query){
  const q=String(query||"").trim();
  if(!q) return [];
  if(backendConfig().configured) return api(`/models/search?q=${encodeURIComponent(q)}&limit=60`);
  const local=await previewCatalog();
  const needle=q.toLowerCase();
  return (local?.models||[]).filter(x=>`${x.brand} ${x.name}`.toLowerCase().includes(needle)).map(x=>{
    const brand=FALLBACK_BRANDS.find(b=>b.name===x.brand)||{slug:x.brand.toLowerCase().replace(/[^a-z0-9]+/g,"-"),name:x.brand};
    return normalizePreviewModel(x,brand);
  });
}
