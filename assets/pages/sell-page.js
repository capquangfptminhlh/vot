import { backendConfig, friendlyError } from "../core/backend.js";
import { createDraft, uploadPrivateListingImages, submitForReview } from "../services/listing-service.js";

const form = document.querySelector("[data-sell-form]");
const status = document.querySelector("[data-sell-status]");
const imageInput = document.getElementById("listingImages");
const cfg = backendConfig();

function value(id) {
  return document.getElementById(id)?.value?.trim() || "";
}

function setStatus(message, type = "") {
  if (!status) return;
  status.textContent = message;
  status.dataset.type = type;
}

function payloadFromForm() {
  const invoiceValue = value("invoice");
  return {
    custom_brand: value("brand"),
    custom_model: value("model"),
    title: value("name"),
    description: value("description"),
    condition: value("condition"),
    price_vnd: Number(value("price")),
    province: value("location"),
    serial_number: value("serial") || null,
    invoice_available: invoiceValue === "Có" ? true : invoiceValue ? false : null,
    nfc_available: value("serial") ? true : null,
  };
}

if (!cfg.configured) {
  setStatus("Bản preview chưa nối Supabase production. Form sẽ không gửi dữ liệu thật.", "warning");
}

form?.addEventListener("submit", async (event) => {
  event.preventDefault();
  const submitter = event.submitter;
  if (submitter) submitter.disabled = true;
  try {
    setStatus("Đang lưu bản nháp...");
    const draft = await createDraft(payloadFromForm());
    setStatus("Đã lưu nháp. Đang tải ảnh riêng tư...");
    await uploadPrivateListingImages(draft.id, imageInput?.files);
    setStatus("Ảnh đã tải. Đang gửi tin vào hàng đợi kiểm duyệt...");
    await submitForReview(draft.id);
    setStatus("Tin đã gửi duyệt. Chỉ khi KYC và moderation đạt yêu cầu tin mới được công khai.", "success");
    form.reset();
  } catch (error) {
    if (error?.code === "AUTH_REQUIRED") {
      setStatus("Bạn cần đăng nhập trước khi lưu tin.", "warning");
      setTimeout(() => {
        window.location.href = `dang-nhap.html?next=${encodeURIComponent("ban-vot.html")}`;
      }, 600);
    } else {
      setStatus(friendlyError(error), "error");
    }
  } finally {
    if (submitter) submitter.disabled = false;
  }
});
