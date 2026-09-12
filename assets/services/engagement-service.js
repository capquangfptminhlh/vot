import { getSupabase, requireUser } from "../core/backend.js";

function uuid(value) {
  const id = String(value || "").trim();
  if (!/^[0-9a-f]{8}-[0-9a-f]{4}-[1-5][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i.test(id)) throw new Error("Mã tin không hợp lệ.");
  return id;
}

export async function favoriteState(listingId) {
  const user = await requireUser();
  const supabase = await getSupabase();
  const { data, error } = await supabase.from("favorites")
    .select("listing_id")
    .eq("user_id", user.id)
    .eq("listing_id", uuid(listingId))
    .maybeSingle();
  if (error) throw error;
  return Boolean(data);
}

export async function toggleFavorite(listingId) {
  const user = await requireUser();
  const supabase = await getSupabase();
  const id = uuid(listingId);
  const active = await favoriteState(id);
  if (active) {
    const { error } = await supabase.from("favorites").delete().eq("user_id", user.id).eq("listing_id", id);
    if (error) throw error;
    return false;
  }
  const { error } = await supabase.from("favorites").insert({ user_id: user.id, listing_id: id });
  if (error) throw error;
  return true;
}

export async function reportListing(listingId, reason, detail = "") {
  await requireUser();
  const allowed = new Set(["fake","scam","wrong_condition","wrong_product","prohibited","spam","other"]);
  const cleanReason = String(reason || "").trim().toLowerCase();
  if (!allowed.has(cleanReason)) throw new Error("Lý do báo cáo không hợp lệ.");
  const supabase = await getSupabase();
  const { data, error } = await supabase.rpc("report_listing", {
    target_listing: uuid(listingId),
    report_reason: cleanReason,
    report_detail: String(detail || "").trim() || null,
  });
  if (error) throw error;
  return data;
}
