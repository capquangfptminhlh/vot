import { getSupabase, requireUser } from "../core/backend.js";

function uuid(value) {
  const id = String(value || "").trim();
  if (!/^[0-9a-f]{8}-[0-9a-f]{4}-[1-5][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i.test(id)) throw new Error("Mã tin không hợp lệ.");
  return id;
}

export async function getStaffRole() {
  const user = await requireUser();
  const supabase = await getSupabase();
  const { data, error } = await supabase.from("user_roles").select("role").eq("user_id", user.id).single();
  if (error) throw error;
  if (!data || !["moderator", "admin"].includes(data.role)) throw new Error("Bạn không có quyền moderation.");
  return data.role;
}

export async function getDashboardCounts() {
  await getStaffRole();
  const supabase = await getSupabase();
  const { data, error } = await supabase.rpc("get_staff_dashboard_counts");
  if (error) throw error;
  return data?.[0] || { pending_review: 0, open_reports: 0, suspended_sellers: 0 };
}

export async function getModerationQueue(limit = 50) {
  await getStaffRole();
  const supabase = await getSupabase();
  const { data, error } = await supabase.rpc("get_moderation_queue", { queue_limit: Math.min(Math.max(Number(limit) || 50, 1), 100) });
  if (error) throw error;
  return data || [];
}

export async function getModerationEvidence(listingId) {
  await getStaffRole();
  const supabase = await getSupabase();
  const { data, error } = await supabase.rpc("get_listing_moderation_evidence", { target_listing: uuid(listingId) });
  if (error) throw error;
  return data || [];
}

export async function moderateListing(listingId, decision, reason = "") {
  await getStaffRole();
  if (!["approve", "reject", "needs_review"].includes(decision)) throw new Error("Quyết định moderation không hợp lệ.");
  const supabase = await getSupabase();
  const { data, error } = await supabase.rpc("moderate_listing", {
    target_listing: uuid(listingId),
    decision,
    moderation_reason: String(reason || "").trim() || null,
  });
  if (error) throw error;
  return data;
}
