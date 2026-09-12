import { backendConfig, friendlyError } from "../core/backend.js";
import { sendEmailOtp, sendPhoneOtp, verifyPhoneOtp } from "../services/auth-service.js";

const status = document.querySelector("[data-auth-status]");
const emailForm = document.querySelector("[data-email-login]");
const phoneForm = document.querySelector("[data-phone-login]");
const verifyForm = document.querySelector("[data-phone-verify]");
let pendingPhone = "";

function setStatus(message, type = "") {
  if (!status) return;
  status.textContent = message;
  status.dataset.type = type;
}

if (!backendConfig().configured) setStatus("Backend production chưa được nối cho bản preview này.", "warning");

emailForm?.addEventListener("submit", async (event) => {
  event.preventDefault();
  try {
    setStatus("Đang gửi link đăng nhập...");
    await sendEmailOtp(emailForm.email.value);
    setStatus("Đã gửi link đăng nhập. Kiểm tra email của bạn.", "success");
  } catch (error) {
    setStatus(friendlyError(error), "error");
  }
});

phoneForm?.addEventListener("submit", async (event) => {
  event.preventDefault();
  try {
    setStatus("Đang gửi OTP...");
    pendingPhone = await sendPhoneOtp(phoneForm.phone.value);
    verifyForm.hidden = false;
    setStatus("Đã gửi OTP tới số điện thoại.", "success");
  } catch (error) {
    setStatus(friendlyError(error), "error");
  }
});

verifyForm?.addEventListener("submit", async (event) => {
  event.preventDefault();
  try {
    setStatus("Đang xác minh OTP...");
    await verifyPhoneOtp(pendingPhone || phoneForm?.phone.value, verifyForm.token.value);
    const next = new URLSearchParams(location.search).get("next");
    window.location.href = next && !next.includes("://") && !next.startsWith("//") ? next : "tai-khoan.html";
  } catch (error) {
    setStatus(friendlyError(error), "error");
  }
});
