import { backendConfig, friendlyError, getSupabase } from "../core/backend.js";
import { sendPhoneOtp, verifyPhoneOtp } from "../services/auth-service.js";

const cfg = window.__CHOVOT_CONFIG__ || {};
const statusEl = document.querySelector("[data-verify-status]");
const phoneState = document.querySelector("[data-phone-state]");
const identityState = document.querySelector("[data-identity-state]");
const bankState = document.querySelector("[data-bank-state]");
const phoneForm = document.querySelector("[data-verify-phone]");
const otpForm = document.querySelector("[data-verify-phone-otp]");
const kycButton = document.querySelector("[data-start-kyc]");
const bankButton = document.querySelector("[data-start-bank]");
let pendingPhone = "";

function setStatus(message, type="") { if (statusEl) { statusEl.textContent = message; statusEl.dataset.type = type; } }
function setState(el, ok, pendingText="Chưa xác thực") { if (el) { el.textContent = ok ? "Đã xác thực" : pendingText; el.className = `status ${ok ? "verified" : "partial"}`; } }

async function loadState() {
  if (!backendConfig().configured) {
    setStatus("Bản preview chưa nối Supabase production. Không gửi dữ liệu xác thực thật ở đây.", "warning");
    return;
  }
  const supabase = await getSupabase();
  const { data: authData, error: authError } = await supabase.auth.getUser();
  if (authError) throw authError;
  if (!authData.user) {
    location.replace(`dang-nhap.html?next=${encodeURIComponent("xac-thuc.html")}`);
    return;
  }
  const { data, error } = await supabase.from("seller_verifications")
    .select("phone_verified,identity_verified,bank_name_verified,status,reviewed_at")
    .eq("user_id", authData.user.id).single();
  if (error) throw error;
  setState(phoneState, data.phone_verified);
  setState(identityState, data.identity_verified, cfg.kycProvider === "disabled" ? "Chưa cấu hình nhà cung cấp" : "Chưa xác thực");
  setState(bankState, data.bank_name_verified, cfg.kycProvider === "disabled" ? "Chưa cấu hình nhà cung cấp" : "Chưa đối chiếu");
  setStatus(data.status === "verified" ? "Seller verification đã hoàn tất." : "Hoàn tất các bước bắt buộc trước khi gửi tin duyệt.", data.status === "verified" ? "success" : "");
}

phoneForm?.addEventListener("submit", async (event) => {
  event.preventDefault();
  try {
    pendingPhone = await sendPhoneOtp(event.currentTarget.phone.value);
    otpForm.hidden = false;
    setStatus("OTP đã được gửi. Nhập mã để xác nhận số điện thoại.", "success");
  } catch (error) { setStatus(friendlyError(error), "error"); }
});

otpForm?.addEventListener("submit", async (event) => {
  event.preventDefault();
  try {
    await verifyPhoneOtp(pendingPhone || phoneForm.phone.value, event.currentTarget.token.value);
    setStatus("Đã xác thực số điện thoại. Đang đồng bộ trạng thái...", "success");
    await loadState();
  } catch (error) { setStatus(friendlyError(error), "error"); }
});

function unavailable(kind) {
  setStatus(`${kind} chỉ được mở khi nhà cung cấp production và webhook xác minh chữ ký đã cấu hình.`, "warning");
}
kycButton?.addEventListener("click", () => unavailable("eKYC danh tính"));
bankButton?.addEventListener("click", () => unavailable("Đối chiếu tài khoản ngân hàng"));

loadState().catch(error => setStatus(friendlyError(error), "error"));
