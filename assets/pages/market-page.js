import { backendConfig, friendlyError } from "../core/backend.js";
import { listActiveListings } from "../services/listing-service.js";

const grid = document.getElementById("market-grid");
const count = document.getElementById("market-count");
const liveStatus = document.querySelector("[data-market-status]");

function money(value) {
  return new Intl.NumberFormat("vi-VN").format(Number(value || 0)) + " đ";
}

function escapeHtml(value) {
  return String(value ?? "")
    .replaceAll("&", "&amp;")
    .replaceAll("<", "&lt;")
    .replaceAll(">", "&gt;")
    .replaceAll('"', "&quot;")
    .replaceAll("'", "&#039;");
}

function render(listings) {
  if (!grid) return;
  grid.innerHTML = listings.map((item) => {
    const brand = item.paddle_models?.brands?.name || item.custom_brand || "Vợt";
    const model = item.paddle_models?.name || item.custom_model || "";
    const thickness = item.paddle_models?.thickness_mm ? `${item.paddle_models.thickness_mm}mm` : "";
    return `<a class="product-card" href="san-pham.html?id=${encodeURIComponent(item.id)}"><div class="badges"><span class="badge verified">${item.status === "reserved" ? "Đã giữ chỗ" : "Tin đang hoạt động"}</span></div><div class="product-media"><div class="mini-paddle"><span>${escapeHtml(brand)}</span></div></div><div class="product-body"><p class="product-title">${escapeHtml(item.title)}</p><span class="product-meta">${escapeHtml([item.condition, thickness, item.province].filter(Boolean).join(" • "))}</span><div class="price">${money(item.price_vnd)}</div><div class="seller-mini">${escapeHtml(brand)} ${escapeHtml(model)}</div></div></a>`;
  }).join("");
  if (count) count.textContent = `${listings.length} vợt phù hợp`;
}

async function load() {
  if (!backendConfig().configured) {
    if (liveStatus) liveStatus.textContent = "Đang hiển thị tin minh họa vì backend preview chưa được cấu hình.";
    return;
  }
  try {
    const params = new URLSearchParams(location.search);
    const listings = await listActiveListings({ query: params.get("q") || "" });
    render(listings);
    if (liveStatus) liveStatus.textContent = "Dữ liệu đang lấy trực tiếp từ backend ChoVot.";
  } catch (error) {
    if (liveStatus) liveStatus.textContent = friendlyError(error);
  }
}

load();
