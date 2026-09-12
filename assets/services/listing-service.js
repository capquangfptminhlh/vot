import { getSupabase, requireUser } from "../core/backend.js";

const LISTING_SELECT = `
  id,title,description,condition,condition_percent,price_vnd,province,district,
  invoice_available,nfc_available,status,published_at,created_at,
  seller_id,paddle_model_id,custom_brand,custom_model,
  paddle_models(id,name,slug,thickness_mm,play_style,brands(id,name,slug)),
  listing_images(id,storage_path,sort_order,moderation_state)
`;

function assertUuid(value) {
  const id = String(value || "").trim();
  if (!/^[0-9a-f]{8}-[0-9a-f]{4}-[1-5][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i.test(id)) {
    throw new Error("Mã tin không hợp lệ.");
  }
  return id;
}

export async function listActiveListings({ query = "", limit = 30 } = {}) {
  const supabase = await getSupabase();
  let request = supabase
    .from("listings")
    .select(LISTING_SELECT)
    .in("status", ["active", "reserved"])
    .order("published_at", { ascending: false })
    .limit(Math.min(Math.max(Number(limit) || 30, 1), 60));
  const q = String(query || "").trim().replace(/[%_]/g, "");
  if (q) request = request.ilike("title", `%${q}%`);
  const { data, error } = await request;
  if (error) throw error;
  return data || [];
}

export async function getListing(listingId) {
  const supabase = await getSupabase();
  const id = assertUuid(listingId);
  const { data, error } = await supabase
    .from("listings")
    .select(LISTING_SELECT)
    .eq("id", id)
    .in("status", ["active", "reserved", "sold"])
    .single();
  if (error) throw error;
  return data;
}

export async function getSellerTrust(userId) {
  const supabase = await getSupabase();
  const { data, error } = await supabase.rpc("get_public_seller_trust", { target_user: assertUuid(userId) });
  if (error) throw error;
  return data?.[0] || null;
}

export async function publicListingImageUrl(storagePath) {
  const supabase = await getSupabase();
  const { data } = supabase.storage.from("listing-public").getPublicUrl(String(storagePath || ""));
  return data?.publicUrl || "";
}

export async function createDraft(payload) {
  const user = await requireUser();
  const supabase = await getSupabase();
  const row = {
    seller_id: user.id,
    paddle_model_id: payload.paddle_model_id || null,
    custom_brand: payload.custom_brand || null,
    custom_model: payload.custom_model || null,
    title: String(payload.title || "").trim(),
    description: String(payload.description || "").trim(),
    condition: String(payload.condition || "").trim(),
    condition_percent: payload.condition_percent || null,
    price_vnd: Number(payload.price_vnd),
    province: payload.province || null,
    district: payload.district || null,
    serial_number: payload.serial_number || null,
    invoice_available: payload.invoice_available ?? null,
    nfc_available: payload.nfc_available ?? null,
  };
  if (row.title.length < 8) throw new Error("Tên tin cần ít nhất 8 ký tự.");
  if (!row.condition) throw new Error("Vui lòng chọn tình trạng.");
  if (!Number.isInteger(row.price_vnd) || row.price_vnd < 10000) throw new Error("Giá bán không hợp lệ.");
  if (!row.paddle_model_id && (!row.custom_brand || !row.custom_model)) throw new Error("Vui lòng chọn model chuẩn hoặc nhập hãng và model.");
  const { data, error } = await supabase.from("listings").insert(row).select("id,status,created_at").single();
  if (error) throw error;
  return data;
}

export async function uploadPrivateListingImages(listingId, files) {
  const user = await requireUser();
  const supabase = await getSupabase();
  const id = assertUuid(listingId);
  const selected = Array.from(files || []).slice(0, 8);
  if (selected.length < 2) throw new Error("Cần ít nhất 2 ảnh thật của cây vợt.");
  const rows = [];
  for (let i = 0; i < selected.length; i += 1) {
    const file = selected[i];
    if (!/^image\/(jpeg|png|webp)$/.test(file.type)) throw new Error("Chỉ chấp nhận JPG, PNG hoặc WebP.");
    if (file.size > 12 * 1024 * 1024) throw new Error("Mỗi ảnh tối đa 12 MB.");
    const safeName = `${crypto.randomUUID()}-${String(file.name).replace(/[^a-zA-Z0-9._-]/g, "-")}`;
    const path = `${user.id}/${id}/${safeName}`;
    const { error: uploadError } = await supabase.storage.from("listing-private").upload(path, file, {
      cacheControl: "3600", upsert: false, contentType: file.type,
    });
    if (uploadError) throw uploadError;
    rows.push({ listing_id: id, storage_path: path, sort_order: i });
  }
  const { error } = await supabase.from("listing_images").insert(rows);
  if (error) throw error;
  return rows;
}

export async function submitForReview(listingId) {
  const supabase = await getSupabase();
  const { data, error } = await supabase.rpc("submit_listing_for_review", { target_listing: assertUuid(listingId) });
  if (error) throw error;
  return data;
}

export async function markListingSold(listingId) {
  const supabase = await getSupabase();
  const { data, error } = await supabase.rpc("mark_listing_sold", { target_listing: assertUuid(listingId) });
  if (error) throw error;
  return data;
}
