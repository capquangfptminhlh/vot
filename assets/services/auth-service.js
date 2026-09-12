import { getSupabase } from "../core/backend.js";

export async function getSession() {
  const supabase = await getSupabase();
  const { data, error } = await supabase.auth.getSession();
  if (error) throw error;
  return data.session;
}

export async function sendEmailOtp(email) {
  const supabase = await getSupabase();
  const clean = String(email || "").trim().toLowerCase();
  if (!clean) throw new Error("Vui lòng nhập email.");
  const { error } = await supabase.auth.signInWithOtp({
    email: clean,
    options: {
      emailRedirectTo: `${window.location.origin}${window.location.pathname.replace(/[^/]+$/, "tai-khoan.html")}`,
      shouldCreateUser: true,
    },
  });
  if (error) throw error;
  return true;
}

export async function sendPhoneOtp(phone) {
  const supabase = await getSupabase();
  const clean = String(phone || "").replace(/\s+/g, "");
  if (!/^\+?[1-9]\d{7,14}$/.test(clean)) throw new Error("Số điện thoại phải ở định dạng quốc tế, ví dụ +84901234567.");
  const { error } = await supabase.auth.signInWithOtp({ phone: clean });
  if (error) throw error;
  return clean;
}

export async function verifyPhoneOtp(phone, token) {
  const supabase = await getSupabase();
  const { data, error } = await supabase.auth.verifyOtp({
    phone: String(phone || "").replace(/\s+/g, ""),
    token: String(token || "").trim(),
    type: "sms",
  });
  if (error) throw error;
  return data.session;
}

export async function signOut() {
  const supabase = await getSupabase();
  const { error } = await supabase.auth.signOut({ scope: "local" });
  if (error) throw error;
}
