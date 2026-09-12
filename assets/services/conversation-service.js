import { getSupabase, requireUser } from "../core/backend.js";

function assertUuid(value) {
  const id = String(value || "").trim();
  if (!/^[0-9a-f]{8}-[0-9a-f]{4}-[1-5][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i.test(id)) {
    throw new Error("Mã dữ liệu không hợp lệ.");
  }
  return id;
}

export async function startConversation(listingId) {
  await requireUser();
  const supabase = await getSupabase();
  const { data, error } = await supabase.rpc("start_listing_conversation", { target_listing: assertUuid(listingId) });
  if (error) throw error;
  return data;
}

export async function listConversations() {
  await requireUser();
  const supabase = await getSupabase();
  const { data, error } = await supabase
    .from("conversations")
    .select("id,listing_id,buyer_id,seller_id,updated_at,listings(id,title,status,price_vnd)")
    .order("updated_at", { ascending: false })
    .limit(100);
  if (error) throw error;
  return data || [];
}

export async function getConversation(conversationId) {
  await requireUser();
  const supabase = await getSupabase();
  const { data, error } = await supabase
    .from("conversations")
    .select("id,listing_id,buyer_id,seller_id,updated_at,listings(id,title,status,price_vnd)")
    .eq("id", assertUuid(conversationId))
    .single();
  if (error) throw error;
  return data;
}

export async function getMessages(conversationId, limit = 100) {
  await requireUser();
  const supabase = await getSupabase();
  const { data, error } = await supabase
    .from("messages")
    .select("id,conversation_id,sender_id,body,created_at,read_at")
    .eq("conversation_id", assertUuid(conversationId))
    .order("created_at", { ascending: true })
    .limit(Math.min(Math.max(Number(limit) || 100, 1), 200));
  if (error) throw error;
  return data || [];
}

export async function sendMessage(conversationId, body) {
  const user = await requireUser();
  const text = String(body || "").trim();
  if (!text || text.length > 3000) throw new Error("Tin nhắn phải có từ 1 đến 3000 ký tự.");
  const supabase = await getSupabase();
  const { data, error } = await supabase
    .from("messages")
    .insert({ conversation_id: assertUuid(conversationId), sender_id: user.id, body: text })
    .select("id,conversation_id,sender_id,body,created_at,read_at")
    .single();
  if (error) throw error;
  return data;
}

export async function subscribeMessages(conversationId, onMessage) {
  const supabase = await getSupabase();
  const id = assertUuid(conversationId);
  const channel = supabase
    .channel(`conversation:${id}`)
    .on("postgres_changes", { event: "INSERT", schema: "public", table: "messages", filter: `conversation_id=eq.${id}` }, (payload) => onMessage?.(payload.new))
    .subscribe();
  return () => { supabase.removeChannel(channel); };
}
