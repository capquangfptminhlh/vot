import { api, clearAccessToken, requireUser, setAccessToken } from "../core/backend.js";

function email(value) {
  const clean = String(value || "").trim().toLowerCase();
  if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(clean)) throw new Error("Email không hợp lệ.");
  return clean;
}
function phone(value) {
  const clean = String(value || "").replace(/[\s()-]/g, "");
  if (!/^\+[1-9]\d{7,14}$/.test(clean)) throw new Error("Số điện thoại phải ở định dạng quốc tế, ví dụ +84901234567.");
  return clean;
}
export async function getSession() { try { return { user: await requireUser() }; } catch (error) { if (error?.code === "AUTH_REQUIRED") return null; throw error; } }
export async function sendEmailOtp(value) { const target = email(value); await api("/auth/otp/request", { method:"POST", auth:false, body:{ channel:"EMAIL", target } }); return target; }
export async function verifyEmailOtp(value, code) { const target=email(value); const data=await api("/auth/otp/verify",{method:"POST",auth:false,body:{channel:"EMAIL",target,code:String(code||"").trim()}}); setAccessToken(data.accessToken); return requireUser(); }
export async function sendPhoneOtp(value) { const target=phone(value); await api("/auth/otp/request",{method:"POST",auth:false,body:{channel:"PHONE",target}}); return target; }
export async function verifyPhoneOtp(value, code) { const target=phone(value); const data=await api("/auth/otp/verify",{method:"POST",auth:false,body:{channel:"PHONE",target,code:String(code||"").trim()}}); setAccessToken(data.accessToken); return requireUser(); }
export async function signOut() { try { await api("/auth/logout",{method:"POST",auth:false}); } finally { clearAccessToken(); } }
